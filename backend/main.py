from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from elevenlabs import generate, stream, set_api_key
from elevenlabs.api import History
import os
import io
from dotenv import load_dotenv
import logging
import openai
import json
import agent

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Voice Agent Backend",
    description="FastAPI backend for text-to-speech streaming using ElevenLabs",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set API keys
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not ELEVENLABS_API_KEY:
    logger.warning("ELEVENLABS_API_KEY not found in environment variables")
else:
    set_api_key(ELEVENLABS_API_KEY)

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found in environment variables")
else:
    openai.api_key = OPENAI_API_KEY

# Pydantic models
class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: str = "FV5VfeCbFVx94BzoAPwQ"  # Default voice (Rachel)
    model_id: str = "eleven_multilingual_v2"

class VoiceInfo(BaseModel):
    voice_id: str
    name: str
    category: str

class UserMessageRequest(BaseModel):
    message: str
    voice_id: str = "FV5VfeCbFVx94BzoAPwQ"  # Default voice (Rachel)
    model_id: str = "eleven_multilingual_v2"

class ChatResponse(BaseModel):
    text: str
    audio_url: str

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Voice Agent Backend is running!"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "elevenlabs_configured": bool(ELEVENLABS_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY)
    }

agent.start_mcp_sse()
agent.deno_warmup()

# Chat endpoint - process user message and return both text and audio
@app.post("/chat")
async def chat_with_ai(request: UserMessageRequest):
    """
    Process user message with OpenAI and return both text response and audio.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured"
        )
    
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="ElevenLabs API key not configured"
        )
    
    try:
        logger.info(f"Processing chat request: {request.message[:50]}...")
        
        # Get AI response from OpenAI
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        ai_response_text = await agent.perform_analysis("How many entries are there?")
        print(ai_response_text)
        
        # Generate audio for the response
        audio_stream = generate(
            text=ai_response_text,
            voice=request.voice_id,
            model=request.model_id,
            stream=True
        )
        
        # Convert generator to bytes for streaming
        audio_chunks = []
        for chunk in audio_stream:
            audio_chunks.append(chunk)
        
        # Combine all chunks
        audio_data = b''.join(audio_chunks)
        
        # Create a temporary endpoint for the audio
        audio_id = f"audio_{hash(ai_response_text) % 1000000}"
        
        # Store audio data temporarily (in production, you'd use a proper storage solution)
        # For now, we'll return the audio data directly in the response
        
        return {
            "text": ai_response_text,
            "audio_data": audio_data.hex(),  # Convert to hex for JSON serialization
            "audio_format": "audio/mpeg"
        }
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}"
        )

# Text-to-speech streaming endpoint
@app.post("/tts/stream")
async def text_to_speech_stream(request: TextToSpeechRequest):
    """
    Convert text to speech and stream the audio response using ElevenLabs API.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="ElevenLabs API key not configured"
        )
    
    try:
        logger.info(f"Processing TTS request: {request.text[:50]}...")
        ai_response_text = await agent.perform_analysis("How many entries are there?")
        
        # Generate audio using ElevenLabs
        audio_stream = generate(
            text=ai_response_text,
            voice=request.voice_id,
            model=request.model_id,
            stream=True
        )
        
        # Convert generator to bytes for streaming
        audio_chunks = []
        for chunk in audio_stream:
            audio_chunks.append(chunk)
        
        # Combine all chunks
        audio_data = b''.join(audio_chunks)
        
        # Create streaming response
        def generate_audio_stream():
            # Stream the audio data in chunks
            chunk_size = 4096
            for i in range(0, len(audio_data), chunk_size):
                yield audio_data[i:i + chunk_size]
        
        return StreamingResponse(
            generate_audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3",
                "Content-Length": str(len(audio_data))
            }
        )
        
    except Exception as e:
        logger.error(f"Error in TTS streaming: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating speech: {str(e)}"
        )

# Non-streaming TTS endpoint (for comparison)
@app.post("/tts")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert text to speech and return the complete audio file.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="ElevenLabs API key not configured"
        )
    
    try:
        logger.info(f"Processing TTS request: {request.text[:50]}...")
        
        # Generate audio using ElevenLabs
        audio = generate(
            text=request.text,
            voice=request.voice_id,
            model=request.model_id
        )
        
        return StreamingResponse(
            io.BytesIO(audio),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in TTS: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating speech: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 