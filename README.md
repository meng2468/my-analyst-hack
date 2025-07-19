# 🎙️ MyAnalyst - Voice-Powered Data Analysis Agent

> **Berlin AI Hackathon - Track 2: Voice Agents powered by telli** 🏆

A revolutionary voice agent that talks you through your dataset analysis using natural language conversations. Upload any CSV file and have an intelligent AI assistant guide you through data exploration, statistics, and insights using voice interaction.

## 🌟 Features

- **🎤 Voice-First Interface**: Natural voice conversations with your data analyst
- **📊 Dynamic Dataset Loading**: Upload any CSV file and analyze it instantly
- **🤖 AI-Powered Analysis**: Leverages OpenAI GPT-4 for intelligent data insights
- **🔊 High-Quality Voice**: ElevenLabs text-to-speech for natural conversation
- **🌐 Real-Time WebRTC**: Seamless voice communication with low latency
- **📱 Modern Web Interface**: Clean, responsive Next.js frontend
- **🔒 Session-Based**: Each conversation maintains its own dataset context

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services   │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (OpenAI/      │
│                 │    │                 │    │   ElevenLabs)   │
│ • File Upload   │    │ • WebRTC        │    │                 │
│ • Voice Chat    │    │ • Session Mgmt  │    │                 │
│ • UI/UX         │    │ • Data Pipeline │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **npm** or **yarn**
- **API Keys**:
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [ElevenLabs API Key](https://elevenlabs.io/speech-synthesis)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-analyst-hack
   ```

2. **Set up environment variables**
   ```bash
   cd backend
   cp env.example .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the application**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

   This will automatically:
   - Install Python dependencies
   - Install Node.js dependencies
   - Start the FastAPI backend (port 8000)
   - Start the Next.js frontend (port 3000)

### Manual Setup (Alternative)

**Backend Setup:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

## 📖 Usage

1. **Open your browser** and navigate to `http://localhost:3000`

2. **Upload your dataset** by clicking the upload area and selecting a CSV file

3. **Start the conversation** by clicking "Connect" and allowing microphone access

4. **Ask questions** about your data naturally:
   - "What's in this dataset?"
   - "Show me the first few rows"
   - "What are the column names?"
   - "Give me some statistics about the data"
   - "Are there any missing values?"
   - "What's the correlation between X and Y?"

5. **Listen to insights** as the AI analyzes your data and provides spoken explanations

## 🛠️ Technical Stack

### Backend
- **FastAPI**: High-performance web framework
- **Pipecat**: Real-time audio processing pipeline
- **WebRTC**: Peer-to-peer voice communication
- **Pandas**: Data manipulation and analysis
- **OpenAI**: LLM for intelligent responses
- **ElevenLabs**: High-quality text-to-speech

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Pipecat Client**: WebRTC transport layer
- **Radix UI**: Accessible component primitives

## 🔧 API Endpoints

- `POST /api/upload-csv`: Upload CSV files with session management
- `POST /api/offer`: WebRTC connection establishment
- `GET /api/test`: Health check endpoint

## 📁 Project Structure

```
my-analyst-hack/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── bot.py              # Voice agent logic
│   ├── requirements.txt    # Python dependencies
│   └── data/               # Uploaded datasets storage
├── frontend/               # Next.js frontend
│   ├── app/                # App Router pages
│   │   ├── _components/    # Reusable components
│   │   └── _views/         # Page views
│   ├── components/         # UI components
│   └── package.json        # Node.js dependencies
├── datasets/               # Sample datasets
└── start.sh               # Automated startup script
```

## 🎯 Key Features Explained

### Voice Agent Capabilities
The AI agent can:
- **Load and analyze** any CSV dataset dynamically
- **Provide statistical summaries** of your data
- **Answer questions** about data structure and content
- **Execute Python code** for custom analysis
- **Handle errors gracefully** with helpful explanations

### Session Management
- Each conversation gets a unique session ID
- Datasets are stored per session
- Multiple users can have separate conversations
- Automatic cleanup of old sessions

### Real-Time Voice Processing
- **Silero VAD**: Voice activity detection
- **Low-latency streaming**: Real-time audio processing
- **WebRTC optimization**: Efficient peer-to-peer communication

## 🤝 Contributing

This project was built for the Berlin AI Hackathon. Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Share your experience

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Berlin AI Hackathon** organizers for the amazing event
- **telli** for providing the voice agent infrastructure
- **Pipecat** team for the real-time audio processing framework
- **OpenAI** and **ElevenLabs** for their powerful AI services

---

**Built with ❤️ at Berlin AI Hackathon 2024**
