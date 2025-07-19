# Voice Agent with OpenAI & ElevenLabs Integration

A full-stack voice agent application that combines real-time speech recognition with AI-powered responses using OpenAI and high-quality text-to-speech using ElevenLabs API. The application features a modern React frontend with Web Speech API and a FastAPI backend for intelligent conversation and premium voice synthesis.

## 🎯 Features

### Frontend (Next.js + React)
- 🎤 **Real-time Speech Recognition** - Uses Web Speech API for instant transcription
- 🤖 **AI-Powered Responses** - OpenAI integration for intelligent conversation
- 🎵 **High-Quality TTS** - ElevenLabs integration for premium voice synthesis
- 🔄 **Fallback System** - Automatic fallback to simple responses if backend unavailable
- 🎨 **Modern UI** - Beautiful, responsive interface with real-time feedback
- 🎛️ **Voice Selection** - Choose from multiple ElevenLabs voices
- 💬 **Conversation History** - Chat-like interface with timestamps
- 📱 **Mobile Responsive** - Works on desktop and mobile devices

### Backend (FastAPI)
- 🚀 **AI Chat Processing** - OpenAI GPT-3.5-turbo for intelligent responses
- 🎵 **Streaming Audio** - Real-time audio streaming from text
- 🎵 **Multiple Voices** - Access to all ElevenLabs voices
- 📊 **Usage Monitoring** - Track API usage and limits
- 🔧 **RESTful API** - Clean, documented endpoints
- 🌐 **CORS Support** - Ready for frontend integration
- 📚 **Auto-generated Docs** - Swagger UI and ReDoc

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   Frontend      │ ◄──────────────────► │    Backend      │
│   (Next.js)     │                      │   (FastAPI)     │
│                 │                      │                 │
│ • Speech Rec.   │                      │ • OpenAI Chat   │
│ • Voice UI      │                      │ • ElevenLabs    │
│ • Fallback TTS  │                      │ • TTS Streaming │
└─────────────────┘                      └─────────────────┘
         │                                        │
         │                                        │
         ▼                                        ▼
┌─────────────────┐                      ┌─────────────────┐
│  Web Speech API │                      │  OpenAI API     │
│                 │                      │                 │
│ • Speech Rec.   │                      │ • GPT-3.5-turbo │
│ • Browser TTS   │                      │ • Chat Complet. │
└─────────────────┘                      └─────────────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  ElevenLabs API │
                                       │                 │
                                       │ • Text-to-Speech│
                                       │ • Voice Models  │
                                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **OpenAI API Key** (get one at [platform.openai.com](https://platform.openai.com/api-keys))
- **ElevenLabs API Key** (free account at [elevenlabs.io](https://elevenlabs.io))

### 1. Clone and Setup

```bash
git clone <repository-url>
cd my-analyst-hack
```

### 2. Configure API Keys

```bash
cd backend
cp env.example .env
```

Edit `.env` and add your API keys:
```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### 3. Start the Application

#### Option A: Use the startup script (Recommended)
```bash
./start.sh
```

#### Option B: Manual startup

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Frontend (in new terminal):**
```bash
cd telli-hack
npm install
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🎮 How to Use

1. **Start Listening**: Click the "Start Listening" button
2. **Speak**: Say something clearly into your microphone
3. **Get AI Response**: The agent will transcribe your speech, process it with OpenAI, and respond with high-quality audio
4. **Choose Voice**: Select different voices from the dropdown menu
5. **View History**: See your conversation history in the chat interface

### Example Conversations
- Ask questions: "What's the weather like?", "Tell me a joke", "How do I make coffee?"
- Get information: "What time is it?", "What's today's date?", "Explain quantum physics"
- Have a chat: "Hello", "How are you?", "Tell me about yourself"

## 🔧 API Endpoints

### Health & Status
- `GET /` - Root endpoint
- `GET /health` - Health check with OpenAI and ElevenLabs status

### AI Chat
- `POST /chat` - Process user message with OpenAI and return text + audio

### Text-to-Speech
- `POST /tts/stream` - Stream audio response
- `POST /tts` - Get complete audio file

### Voice Management
- `GET /voices` - List available voices
- `GET /usage` - Get API usage statistics

## 🧪 Testing

### Test the Backend
```bash
cd backend
python test_api.py
```

### Test the Frontend
1. Open http://localhost:3000
2. Allow microphone permissions
3. Try asking questions or having a conversation

## 📁 Project Structure

```
my-analyst-hack/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main FastAPI application with OpenAI integration
│   ├── requirements.txt    # Python dependencies
│   ├── test_api.py         # API testing script
│   ├── env.example         # Environment variables template
│   └── README.md           # Backend documentation
├── telli-hack/             # Next.js frontend
│   ├── app/
│   │   ├── _components/
│   │   │   └── VoiceUI.tsx # Main voice interface with OpenAI chat
│   │   ├── types/
│   │   │   └── speech.d.ts # Web Speech API types
│   │   ├── page.tsx        # Main page
│   │   └── layout.tsx      # App layout
│   ├── package.json        # Node.js dependencies
│   └── tsconfig.json       # TypeScript config
├── start.sh                # Startup script
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### OpenAI Configuration

The backend uses GPT-3.5-turbo with the following settings:
```python
model="gpt-3.5-turbo"
max_tokens=150
temperature=0.7
```

### Voice Settings

You can customize voice parameters:
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

## 🐛 Troubleshooting

### Common Issues

1. **"Speech recognition not supported"**
   - Use Chrome, Firefox, or Safari
   - Ensure HTTPS or localhost

2. **"OpenAI API key not configured"**
   - Check your `.env` file in the backend directory
   - Verify your API key is valid at [platform.openai.com](https://platform.openai.com/api-keys)

3. **"ElevenLabs API key not configured"**
   - Check your `.env` file in the backend directory
   - Verify your API key is valid

4. **"CORS errors"**
   - Backend is configured for `localhost:3000`
   - Check that both servers are running

5. **"Audio not playing"**
   - Check browser audio permissions
   - Try refreshing the page

6. **"Backend connection failed"**
   - Ensure backend is running on port 8000
   - Check firewall settings

### Debug Mode

**Backend:**
```bash
cd backend
uvicorn main:app --reload --log-level debug
```

**Frontend:**
```bash
cd telli-hack
npm run dev
# Check browser console for errors
```

## 🚀 Deployment

### Backend Deployment
- Deploy to platforms like Heroku, Railway, or DigitalOcean
- Set environment variables in your deployment platform
- Ensure CORS origins are updated for production

### Frontend Deployment
- Deploy to Vercel, Netlify, or similar platforms
- Update backend URL in production environment
- Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for AI-powered conversation capabilities
- [ElevenLabs](https://elevenlabs.io) for high-quality text-to-speech
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) for speech recognition
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Next.js](https://nextjs.org/) for the frontend framework

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Review the API documentation at http://localhost:8000/docs
3. Check the browser console for frontend errors
4. Review the backend logs for server errors 