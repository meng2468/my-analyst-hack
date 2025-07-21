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
from pipecat.processors.transcript_processor import TranscriptProcessor
from broadcast import broadcaster
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
from openai import OpenAI
import sheets
import enrichment
import matplotlib.pyplot as plt
import base64
import io
load_dotenv(override=True)

client = OpenAI()

chat_histories = {}

def add_to_chat_history(session_id, role, content):
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    chat_histories[session_id].append({"role": role, "content": content})
    print("chat_history", chat_histories[session_id],flush=True)

def get_chat_history(session_id):
    """Return chat history list for a session_id."""
    return chat_histories.get(session_id, [])

async def summarize_chat_history(session_id: str, report_url: str):
    """
    Summarize the chat history for the given session_id using a new LLM instance.
    The summary includes key insights and highlights.
    Returns a string summary.
    """
    chat_history = get_chat_history(session_id)
    if not chat_history:
        return "Hey, I generated your report is ready. Best, your favorite AI Data Agent"
    
    summarization_prompt = (
        "You will receive a transcript of a conversation between a user and an AI assistant engaged in data analysis. "
        f"Your output should be a E-Mail-Body with greetings and conclusion by greetings your Voice2Insights data chatbot and the main key, concise and valuable insights. It must be a business report keep it professional with key insights like you are a data analyst."
    )
    
    messages = [
        {"role": "system", "content": summarization_prompt},
    ]
    transcript = ""
    for msg in chat_history:
        transcript += f"{msg['role'].capitalize()}: {msg['content']}\n"
    messages.append({"role": "user", "content": f"Here is the conversation transcript:\n\n{transcript}\n\nPlease provide the summary."})
        
    try:
        response =  client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages
        )
        summary = response.choices[0].message.content.strip()

    except Exception as e:
        summary = f"Error generating summary: {e}"

    return summary

def get_df_column_info(session_id):
    try:
        df = pd.read_csv(f"data/{session_id}.csv")
    except Exception:
        try:
            df = pd.read_csv(f"{session_id}.csv")
        except Exception:
            df = pd.read_csv("airline.csv")
    col_info = ", ".join(f"{c} ({str(dt)})" for c, dt in zip(df.columns, df.dtypes))
    return f"The dataset columns are: {col_info}. The dataset is airline customer satisfaction"

###################### TOOLS ######################
def enrich_dataset(session_id):
    async def _enrich_dataset(params: FunctionCallParams, classification_prompt:str,
                              output_col_name: str,
                              document_title: str,
                              possible_values: list[str]):
        df = pd.read_csv(f"data/{session_id}.csv")
        future = enrichment.run_enrichment_in_background(
            pd_df=df,
            prompt=classification_prompt,
            col_name=output_col_name,
            possible_values=possible_values,
            title=document_title,
            session_id=session_id
        )
        await params.result_callback({"result": "Enrichment initiated, and deferred to background task"})
    return _enrich_dataset

# Create a function factory that captures the session_id
def create_execute_dataframe_code(session_id):
    async def execute_dataframe_code(params: FunctionCallParams, code: str,
                                     anaylsis_title: str = "", upload_to_google_docs: bool=False):
        print(f"execute_dataframe_code, session_id: {session_id} with {upload_to_google_docs}, code {code}", flush=True)
        
        # Load session-specific dataframe
        try:
            df = pd.read_csv(f"data/{session_id}.csv")
            print(f"Loaded dataset from data/{session_id}.csv", flush=True)
        except Exception as e:
            print(f"no data found for session id {session_id} in data folder. error {e}", flush=True)
            try:
                df = pd.read_csv(f"{session_id}.csv")
                print(f"Loaded dataset from {session_id}.csv", flush=True)
            except Exception as e2:
                print(f"no data found for session id {session_id} in current directory. error {e2}", flush=True)
                df = pd.read_csv("airline.csv")
                print("Using default airline dataset", flush=True)

        safe_locals = {"df": df, "pd": pd}
        output = io.StringIO()
        result_to_upload = None

        try:
            compiled = compile(code, "<string>", "eval")
            value = eval(compiled, {}, safe_locals)
            result = str(value)
            if upload_to_google_docs and isinstance(value, pd.DataFrame):
                result_to_upload = value

        except SyntaxError:
            before_vars = set(safe_locals.keys())
            with contextlib.redirect_stdout(output):
                exec(code, {}, safe_locals)
            result = output.getvalue() or "Code executed, but did not return or print anything."
            after_vars = set(safe_locals.keys())
            if upload_to_google_docs:
                # Find new or modified variables that are DataFrames
                new_vars = after_vars - before_vars
                df_candidates = [safe_locals[k] for k in new_vars if isinstance(safe_locals[k], pd.DataFrame)]
                if not df_candidates:
                    # Also include DataFrames whose id changed
                    df_candidates = [
                        safe_locals[k] for k in after_vars
                        if isinstance(safe_locals[k], pd.DataFrame) and 
                        (k not in before_vars or id(safe_locals[k]) != id(safe_locals.get(k)))
                    ]
                if df_candidates:
                    # Pick the last one created/modified
                    result_to_upload = df_candidates[-1]

        image_path = 'analysis.png'
        try:
            if os.path.exists(image_path):
                with open(image_path, 'rb') as f:
                    image_base64 = base64.b64encode(f.read()).decode('utf-8')
                os.remove(image_path)
                await broadcaster.push(f"image: {image_base64}")
        except:
            pass
            
        if upload_to_google_docs and result_to_upload is not None:
            try:
                sheets.create_and_upload_df(result_to_upload, anaylsis_title)
                result += "\n\nDataFrame uploaded to Google Sheets."
            except Exception as upload_err:
                print("upload_error", upload_err, flush=True)
                result += f"\n\nFailed to upload to Google Sheets: {upload_err}"

        print("code", code, flush=True)
        print("result", result, flush=True)
        await broadcaster.push(f"code: {code}")
        await broadcaster.push(f"data: {result}")
        await params.result_callback({"result": result})
        add_to_chat_history(session_id, "assistant", result)

    return execute_dataframe_code
#######################################################

# --- SYSTEM PROMPT: tell LLM how & when to use it ---
SYSTEM_PROMPT = """
You are an expert data analyst. That assists business stakeholders in analyzing their data and making decisions.
The user's dataset is loaded dynamically based on their session and is available as the variable `df` (a pandas DataFrame). 
When the user requests analysis, statistics, summary, or inspection, call `execute_dataframe_code` with the appropriate Python code to analyze or manipulate `df`. 
Always provide Python code as a string in the tool call argument named 'code', describing errors when something went wrong and act accordingly to fix them.
Your output is directly transferred to text-to-speech, so make a natural, concise and to the point summary to the user question that's easy to understand just by listening to it.
You can also upload intermediate results to google sheets, if the user chooses to, where a new file is created. For this, your code needs to output a pd df that is passed to google sheets and also updating flag upload_to_google_docs.
If helpful, you can export ONE image as analysis.png, which you save in py code under current directory and is then streamed automatically to user. You should add matplotlib rendering per default to most code for a good UX with using import matplotlib.pyplot as plt. You do NOT say that you exported or vized it.
YOU RESPOND DIRECTLY TO USER QUESTION WITH concise insights in text that is direct and to the point.
DO NOT FOCUS TOO MUCH ON THE CHART, MAKE THE CODE OUTPUT VALUABLE DATA IN PRINT TO USE THAT DATA, the user cant see the data.
Explain findings in plain language that non-technical audiences can understand.
Start with the key insight or recommendation, then provide supporting evidence.
The user can also ask to enrich (e.g. classify the dataset). For this use enrich_dataset tool. It needs classification_prompt, the instruction on what to look for and possible_values as list of str which are the possible classifcation values, e.g. to defer stance detection code execution. This will automatically generates a google sheet and live updates, which are streamed to the user.
"""


INTRO_MESSAGE = (
    "Hello! I am your data analyst"
)
transcript = TranscriptProcessor()
from pipecat.processors.frame_processor import Frame, FrameDirection
from pipecat.frames.frames import TranscriptionFrame, TextFrame
from pipecat.processors.frame_processor import FrameProcessor
class SendMessageFrame(FrameProcessor):
    def __init__(self):
        super().__init__()

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        try:
            await super().process_frame(frame, direction)
            if isinstance(frame, TranscriptionFrame):
                await broadcaster.push(f"user: {frame.text}")
            elif isinstance(frame, TextFrame):
                await broadcaster.push(f"assistant: {frame.text}")
            await self.push_frame(frame, direction)
        except Exception as e:
            print(f"error {e}")

user_send = SendMessageFrame()
robot_send = SendMessageFrame()
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
    execute_enrich_dataset = enrich_dataset(session_id)
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        system_instruction=SYSTEM_PROMPT,
        tools=ToolsSchema(standard_tools=[execute_dataframe_code_func, execute_enrich_dataset]),
    )
    llm.register_direct_function(execute_dataframe_code_func)
    llm.register_direct_function(execute_enrich_dataset)

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

    column_info_msg = get_df_column_info(session_id)
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT} {column_info_msg}"},
        {"role": "system", "content": "In the beginning just ask user what he wants to do with the dataset and NOT add any examples"},
    ]
    context = OpenAILLMContext(messages, tools=ToolsSchema(standard_tools=[execute_dataframe_code_func, execute_enrich_dataset]))
    context_aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline([
        pipecat_transport.input(),
        sst,
        user_send,
        context_aggregator.user(),
        llm,
        robot_send,
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

    token_task = None

    # On client connection, send a greeting and store it in the chat history.
    @pipecat_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        nonlocal token_task
        print('CLIENT DETAILS:', client, flush=True)
        logger.info(f"Pipecat Client connected. Session ID: {session_id}")
        token_task = id(task)
        add_to_chat_history(session_id, "assistant", INTRO_MESSAGE)
        # Send context frame
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    # Example event handler for when the STT service returns a recognized user message.
    @pipecat_transport.event_handler("on_stt_result")
    async def on_stt_result(transport, stt_result):
        # Assuming stt_result contains a 'text' key with the recognized message.
        user_message = stt_result.get("text")
        if user_message:
            add_to_chat_history(session_id, "user", user_message)
            logger.info(f"User ({session_id}) said: {user_message}")

    # Example event handler for when an assistant reply is generated.
    @pipecat_transport.event_handler("on_assistant_reply")
    async def on_assistant_reply(transport, assistant_reply):
        # Assuming assistant_reply is plain text.
        add_to_chat_history(session_id, "assistant", assistant_reply)
        logger.info(f"Assistant reply (session {session_id}): {assistant_reply}")

    @pipecat_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Pipecat Client disconnected")
        await task.cancel()


    #@transcript.event_handler("on_transcript_update")
    #async def handle_update(processor, frame):
     #   if not frame.messages:
     #       return
     #   latest = frame.messages[-1]
     #   # Now process `latest`, e.g.:
     #   line = f"{latest.role}: {latest.content}"
     #   print(line)
        
            
    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)