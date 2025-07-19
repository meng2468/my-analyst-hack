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

load_dotenv(override=True)

df = pd.read_csv("airline.csv")

# Create a function factory that captures the session_id
def create_execute_dataframe_code(session_id):
    async def execute_dataframe_code(params: FunctionCallParams, code: str):
        print(f"Using session_id: {session_id}", flush=True)
        
        # Load session-specific dataframe
        try:
            # Try to load from data folder first (for uploaded files)
            df = pd.read_csv(f"data/{session_id}.csv")
            print(f"Loaded dataset from data/{session_id}.csv", flush=True)
        except Exception as e:
            print(f"no data found for session id {session_id} in data folder. error {e}", flush=True)
            try:
                # Fallback to current directory
                df = pd.read_csv(f"{session_id}.csv")
                print(f"Loaded dataset from {session_id}.csv", flush=True)
            except Exception as e2:
                print(f"no data found for session id {session_id} in current directory. error {e2}", flush=True)
                # Final fallback to default dataset
                df = pd.read_csv("airline.csv")
                print("Using default airline dataset", flush=True)

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
    
    return execute_dataframe_code


# --- SYSTEM PROMPT: tell LLM how & when to use it ---
SYSTEM_PROMPT = (
    "You are a helpful assistant for data analysis. "
    "The user's dataset is loaded dynamically based on their session and is available as the variable `df` (a pandas DataFrame). "
    "When the user requests analysis, statistics, summary, or inspection, call `execute_dataframe_code` "
    "with the appropriate Python code to analyze or manipulate `df`. "
    "Always provide Python code as a string in the tool call argument named 'code'. Also describe errors when something went wrong. "
    "Your output is directly transferred to text-to-speech, so make a natural, concise and to the point summary to the user question that's easy to understand just by listening to it."
)


INTRO_MESSAGE = (
    "Hello! I am your data analyst"
)

async def run_bot(webrtc_connection, session_id=None):
    pipecat_transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            audio_out_10ms_chunks=2,
        ),
    )

    # Create the execute_dataframe_code function with the session_id
    execute_dataframe_code_func = create_execute_dataframe_code(session_id)

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        system_instruction=SYSTEM_PROMPT,
        tools=ToolsSchema(standard_tools=[execute_dataframe_code_func]),
    )
    llm.register_direct_function(execute_dataframe_code_func)


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
    context = OpenAILLMContext(messages, tools=ToolsSchema(standard_tools=[execute_dataframe_code_func]))
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

    # Store tokens at function scope so they can be accessed by event handlers
    token_task = None

    @pipecat_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        nonlocal token_task
        print('CLIENT DETAILS', client, flush=True)
        
        # Use the session_id passed to run_bot function
        logger.info(f"Pipecat Client connected. Session ID: {session_id}")

        # Set task context var
        token_task = id(task)

        try:
            await task.queue_frames([context_aggregator.user().get_context_frame()])
        finally:
            pass # No need to reset anything


    @pipecat_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Pipecat Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)