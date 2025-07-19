import os
import pandas as pd
import io
import contextlib

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.transcriptions.language import Language
from pipecat.services.openai.stt import OpenAISTTService

from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
import contextvars
from contextlib import AsyncExitStack

session_id_var = contextvars.ContextVar("session_id_var")
current_task_id = contextvars.ContextVar("current_task_id")

load_dotenv(override=True)

df = pd.read_csv("airline.csv")
async def execute_dataframe_code(params: FunctionCallParams, code: str):
    try:
        session_id = session_id_var.get()
    except LookupError:
        result = "Could not determine your session. Please reconnect."
        await params.result_callback({"result": result})
        return

    # Load session-specific dataframe
    try:
        df = pd.read_csv(f"{session_id}.csv")
    except Exception as e:
        print(f"no data found for session id {session_id}. error {e}", flush=True)
        df = pd.read_csv("airline.csv")
        #await params.result_callback({"result": f"no data found for session id {session_id}. error {e}"})

    safe_locals = {"df": df, "pd": pd}
    output = io.StringIO()

    try:
        try:
            compiled = compile(code, "<string>", "eval")
            value = eval(compiled, {}, safe_locals)
            result = str(value)
        except SyntaxError:
            with contextlib.redirect_stdout(output):
                exec(code, {}, safe_locals)
            result = output.getvalue() or "Code executed, but did not return or print anything."
    except Exception as e:
        result = f"Error during execution: {e}"

    print("code", code, flush=True)
    print("result", result, flush=True)
    await params.result_callback({"result": result})


# --- Register the tool directly ---
tools = ToolsSchema(standard_tools=[execute_dataframe_code])

# --- SYSTEM PROMPT: tell LLM how & when to use it ---
SYSTEM_PROMPT = (
    "You are a helpful assistant for data analysis. "
    "The user's airline passenger data is preloaded as the variable `df` (a pandas DataFrame). "
    "Columns and example rows from the dataset are provided below:\n\n"
    "satisfaction,Customer Type,Age,Type of Travel,Class,Flight Distance,Seat comfort,Departure/Arrival time convenient,Food and drink,Gate location,Inflight wifi service,Inflight entertainment,Online support,Ease of Online booking,On-board service,Leg room service,Baggage handling,Checkin service,Cleanliness,Online boarding,Departure Delay in Minutes,Arrival Delay in Minutes\n"
    "satisfied,Loyal Customer,65,Personal Travel,Eco,265,0,0,0,2,2,4,2,3,3,0,3,5,3,2,0,0.0\n"
    "satisfied,Loyal Customer,47,Personal Travel,Business,2464,0,0,0,3,0,2,2,3,4,4,4,2,3,2,310,305.0\n\n"
    "When the user requests analysis, statistics, summary, or inspection, call `execute_dataframe_code` "
    "with the appropriate Python code to analyze or manipulate `df`. "
    "Always provide Python code as a string in the tool call argument named 'code'. Also describe errors when something went wrong"
    "Your output is directly transfered text-to-speach, so make a natural, concisise and to the point summary to the user question thats easy to understand just by listening to it."
)


INTRO_MESSAGE = (
    "Hello! I am your data analyst"
)

async def run_bot(webrtc_connection):
    pipecat_transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            audio_out_10ms_chunks=2,
        ),
    )

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        system_instruction=SYSTEM_PROMPT,
        tools=tools,
    )
    llm.register_direct_function(execute_dataframe_code)


    tts = ElevenLabsTTSService(
        api_key=os.getenv("ELEVENLABS_API_KEY"),
        voice_id=os.getenv("ELEVENLABS_VOICE_ID"),
        model="eleven_flash_v2_5",
    )

    sst = OpenAISTTService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-transcribe",
        language=Language.EN,
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    context = OpenAILLMContext(messages, tools=tools)
    context_aggregator = llm.create_context_aggregator(context)

    # Pipeline: as usual
    pipeline = Pipeline([
        pipecat_transport.input(),
        sst,
        context_aggregator.user(),
        llm,
        tts,
        pipecat_transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @pipecat_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        session_id = getattr(client, "session_id", None)
        if session_id is None and hasattr(client, "info"):
            session_id = client.info.get("session_id")

        logger.info(f"Pipecat Client connected. Session ID: {session_id}")

        # Set both task and session context vars
        token_task = current_task_id.set(id(task))
        token_session = session_id_var.set(session_id)

        try:
            await task.queue_frames([context_aggregator.user().get_context_frame()])
        finally:
            current_task_id.reset(token_task)
            session_id_var.reset(token_session)


    @pipecat_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Pipecat Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)