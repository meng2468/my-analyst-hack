import argparse
import asyncio
import sys
from contextlib import asynccontextmanager
from typing import Dict

from pydantic import BaseModel
import uvicorn
from bot import run_bot, summarize_chat_history
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import os
import aiofiles
import report
import mail


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os

from fastapi import Request
from fastapi.responses import StreamingResponse
from broadcast import broadcaster,enrichment_broadcaster

class SummarizeRequest(BaseModel):
    session_id: str
    email: str

from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection

# Load environment variables
load_dotenv(override=True)

DATA_FOLDER = "data"
os.makedirs(DATA_FOLDER, exist_ok=True)

REPORTS_FOLDER = "reports"
os.makedirs(REPORTS_FOLDER, exist_ok=True)

pcs_map: Dict[str, SmallWebRTCConnection] = {}

ice_servers = [
    IceServer(urls="stun:stun.l.google.com:19302"),
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("App startup...")
    yield
    logger.info("App shutdown... Cleaning up WebRTC connections.")
    coros = [pc.disconnect() for pc in pcs_map.values()]
    await asyncio.gather(*coros)
    pcs_map.clear()


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow requests from Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/enrichment-events")
async def enrichment_events(request: Request, session_id: str = None):
    queue = enrichment_broadcaster.add_listener(session_id)
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                msg = await queue.get()
                yield f"data: {msg}\n\n"
        finally:
            enrichment_broadcaster.remove_listener(queue)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/transcript-events")
async def transcript_events(request: Request):
    """SSE stream for transcript updates."""
    queue = broadcaster.add_listener()

    # Generator for StreamingResponse
    async def event_generator():
        try:
            while True:
                # End stream if client disconnects
                if await request.is_disconnected():
                    break
                message = await queue.get()
                yield f"data: {message}\n\n"
        finally:
            broadcaster.remove_listener(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/upload-csv")
async def upload_csv(session_id: str, file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    # Save using session_id instead of original filename
    file_location = os.path.join(DATA_FOLDER, f"{session_id}.csv")
    
    try:
        async with aiofiles.open(file_location, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file.")

    return {"success": True, "filename": f"{session_id}.csv"}

app.mount("/reports", StaticFiles(directory="reports"), name="reports")

@app.post("/api/report")
async def report_url(request: SummarizeRequest):
    pdf_name = f"{request.session_id}.pdf"
    pdf_path = f"{REPORTS_FOLDER}/{pdf_name}"
    report_url = f"http://localhost:7860/reports/{pdf_name}"
    summary = await summarize_chat_history(request.session_id, report_url)
    print("summary", summary, flush=True)
    report.generate_pdf_report(f"data/{request.session_id}.csv", pdf_path, summary)
    
    mail.send_mail(
        request.email, 
        summary
    )

    return {"summary": summary, "report_url": report_url}


@app.get("/api/test")
async def test():
    return {"status": "ok"}


@app.post("/api/offer")
async def offer(request: dict, background_tasks: BackgroundTasks):
    pc_id = request.get("pc_id")
    session_id = request.get("session_id")

    if pc_id and pc_id in pcs_map:
        pipecat_connection = pcs_map[pc_id]
        logger.info(f"Reusing existing connection for pc_id: {pc_id}")
        await pipecat_connection.renegotiate(sdp=request["sdp"], type=request["type"])
    else:
        pipecat_connection = SmallWebRTCConnection(ice_servers)
        await pipecat_connection.initialize(sdp=request["sdp"], type=request["type"])
        
        # Store session_id with the connection
        pipecat_connection.session_id = session_id

        @pipecat_connection.event_handler("closed")
        async def handle_disconnected(webrtc_connection: SmallWebRTCConnection):
            logger.info(f"Discarding peer connection for pc_id: {webrtc_connection.pc_id}")
            pcs_map.pop(webrtc_connection.pc_id, None)

        background_tasks.add_task(run_bot, pipecat_connection, session_id)

    answer = pipecat_connection.get_answer()
    pcs_map[answer["pc_id"]] = pipecat_connection
    return answer


@app.get("/")
async def serve_index():
    return FileResponse("index.html")
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebRTC demo")
    parser.add_argument("--host", default="localhost", help="Host for HTTP server (default: localhost)")
    parser.add_argument("--port", type=int, default=7860, help="Port for HTTP server (default: 7860)")
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()

    logger.remove(0)
    logger.add(sys.stderr, level="TRACE" if args.verbose else "DEBUG")

    uvicorn.run(app, host=args.host, port=args.port)
