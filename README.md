# Voice Agent with ElevenLabs Integration

A full-stack voice agent application that combines real-time speech recognition with high-quality text-to-speech using ElevenLabs API. The application features a modern React frontend with Web Speech API and a FastAPI backend for premium voice synthesis.

## 🎯 Features

### Frontend (Next.js + React)
- 🎤 **Real-time Speech Recognition** - Uses Web Speech API for instant transcription
- 🎵 **High-Quality TTS** - ElevenLabs integration for premium voice synthesis
- 🔄 **Fallback System** - Automatic fallback to browser TTS if backend unavailable
- 🎨 **Modern UI** - Beautiful, responsive interface with real-time feedback
- 🎛️ **Voice Selection** - Choose from multiple ElevenLabs voices
- 💬 **Conversation History** - Chat-like interface with timestamps
- 📱 **Mobile Responsive** - Works on desktop and mobile devices

### Backend (FastAPI)
- 🚀 **Streaming Audio** - Real-time audio streaming from text
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
│ • Speech Rec.   │                      │ • ElevenLabs    │
│ • Voice UI      │                      │ • TTS Streaming │
│ • Fallback TTS  │                      │ • Voice Mgmt    │
└─────────────────┘                      └─────────────────┘
         │                                        │
         │                                        │
         ▼                                        ▼
┌─────────────────┐                      ┌─────────────────┐
│  Web Speech API │                      │  ElevenLabs API │
│                 │                      │                 │
│ • Speech Rec.   │                      │ • Text-to-Speech│
│ • Browser TTS   │                      │ • Voice Models  │
└─────────────────┘                      └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **ElevenLabs API Key** (free account at [elevenlabs.io](https://elevenlabs.io))

### 1. Clone and Setup

```bash
git clone <repository-url>
cd thore-hackathon
```

### 2. Configure ElevenLabs API

```bash
cd backend
cp env.example .env
```

Edit `.env` and add your ElevenLabs API key:
```env
ELEVENLABS_API_KEY=your_actual_api_key_here
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
3. **Get Response**: The agent will transcribe your speech and respond with high-quality audio
4. **Choose Voice**: Select different voices from the dropdown menu
5. **View History**: See your conversation history in the chat interface

### Voice Commands
- "Hello" or "Hi" - Get a greeting
- "What time is it?" - Get current time
- "What's the date?" - Get current date
- "Tell me a joke" - Hear a joke
- "Thank you" - Get a response
- "Goodbye" - End conversation

## 🔧 API Endpoints

### Health & Status
- `GET /` - Root endpoint
- `GET /health` - Health check with ElevenLabs status

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
3. Try the voice commands listed above

## 📁 Project Structure

```
thore-hackathon/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── test_api.py         # API testing script
│   ├── env.example         # Environment variables template
│   └── README.md           # Backend documentation
├── telli-hack/             # Next.js frontend
│   ├── app/
│   │   ├── _components/
│   │   │   └── VoiceUI.tsx # Main voice interface
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
ELEVENLABS_API_KEY=your_api_key_here
HOST=0.0.0.0
PORT=8000
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

2. **"ElevenLabs API key not configured"**
   - Check your `.env` file in the backend directory
   - Verify your API key is valid

3. **"CORS errors"**
   - Backend is configured for `localhost:3000`
   - Check that both servers are running

4. **"Audio not playing"**
   - Check browser audio permissions
   - Try refreshing the page

5. **"Backend connection failed"**
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