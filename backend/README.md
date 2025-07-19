# Voice Agent Backend

A FastAPI backend that provides AI-powered voice conversation capabilities using OpenAI and ElevenLabs APIs.

## Features

- 🤖 **AI Chat Integration** - Process user messages with OpenAI GPT
- 🎤 **Text-to-Speech Streaming** - Real-time audio streaming from text
- 🎵 **Multiple Voice Options** - Access to all ElevenLabs voices
- 📊 **Usage Statistics** - Monitor your API usage
- 🔧 **RESTful API** - Clean, documented endpoints
- 🌐 **CORS Support** - Ready for frontend integration

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cp env.example .env
```

Edit the `.env` file and add your API keys:

```env
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Get API Keys

#### ElevenLabs API Key
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to your profile settings
3. Copy your API key
4. Paste it in the `.env` file

#### OpenAI API Key
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Go to API Keys section
3. Create a new API key
4. Paste it in the `.env` file

### 4. Run the Server

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will start at `http://localhost:8000`

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check with API status

### AI Chat
- `POST /chat` - Process user message and return AI response with audio

### Text-to-Speech
- `POST /tts/stream` - Stream audio response
- `POST /tts` - Get complete audio file

### Voice Management
- `GET /voices` - List available voices
- `GET /usage` - Get API usage statistics

## API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Example Usage

### Chat with AI

```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  }'
```

Response:
```json
{
  "text": "Hello! I'm doing well, thank you for asking. How can I help you today?",
  "audio_data": "ffd8ffe000104a46494600010101006000600000ffdb004300...",
  "audio_format": "audio/mpeg"
}
```

### Stream Audio

```bash
curl -X POST "http://localhost:8000/tts/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of the text-to-speech streaming!",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  }' \
  --output speech.mp3
```

### Get Available Voices

```bash
curl "http://localhost:8000/voices"
```

### Check Usage

```bash
curl "http://localhost:8000/usage"
```

## Frontend Integration

The backend is configured with CORS to work with the Next.js frontend running on `http://localhost:3000`.

### Example Frontend Call

#### Chat with AI
```javascript
const response = await fetch('http://localhost:8000/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello, how are you?',
    voice_id: '21m00Tcm4TlvDq8ikWAM'
  })
});

const data = await response.json();

// Display text response
console.log(data.text);

// Play audio response
const audioData = new Uint8Array(data.audio_data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
const audioBlob = new Blob([audioData], { type: data.audio_format });
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

#### Direct TTS
```javascript
const response = await fetch('http://localhost:8000/tts/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello from the frontend!',
    voice_id: '21m00Tcm4TlvDq8ikWAM'
  })
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

## Voice Settings

You can customize voice settings by passing a `voice_settings` object:

```json
{
  "text": "Hello world!",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` - Bad request (invalid input)
- `500` - Server error (API issues, missing configuration)

## Development

### Running with Auto-reload

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing

Test the endpoints using the interactive documentation at `http://localhost:8000/docs`

## Troubleshooting

1. **API Key Issues**: Make sure your ElevenLabs API key is valid and has sufficient credits
2. **CORS Errors**: The backend is configured for `localhost:3000` - adjust if needed
3. **Audio Issues**: Check that your browser supports the audio format being returned 