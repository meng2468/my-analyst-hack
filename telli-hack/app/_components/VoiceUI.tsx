"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function VoiceUI() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [messageCounter, setMessageCounter] = useState(0);
  const [autoListen, setAutoListen] = useState(false); // New state for auto-listen mode
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setIsSupported(false);
        setError('Speech recognition is not supported in this browser');
        return;
      }

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          addMessage(finalTranscript, true);
          processVoiceCommand(finalTranscript);
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Load available voices from backend
  useEffect(() => {
    const loadVoices = async () => {
      setIsLoadingVoices(true);
      try {
        const response = await fetch('http://localhost:8000/voices');
        if (response.ok) {
          const data = await response.json();
          setAvailableVoices(data.voices || []);
        }
      } catch (error) {
        console.log('Could not load voices from backend, using default');
      } finally {
        setIsLoadingVoices(false);
      }
    };

    loadVoices();
  }, []);

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: `msg_${messageCounter}_${Date.now()}`,
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setMessageCounter(prev => prev + 1);
  };

  const speak = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Pause speech recognition while speaking (only in auto-listen mode)
      if (autoListen && recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      
      // Use ElevenLabs backend
      const response = await fetch('http://localhost:8000/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Resume speech recognition after speaking ends (only in auto-listen mode)
          if (autoListen && recognitionRef.current && !isListening) {
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 500); // Small delay to prevent immediate restart
          }
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Resume speech recognition after error (only in auto-listen mode)
          if (autoListen && recognitionRef.current && !isListening) {
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 500);
          }
          console.error('Error playing ElevenLabs audio');
        };
        
        await audio.play();
      } else {
        console.error('ElevenLabs TTS request failed:', response.status);
        setIsSpeaking(false);
        // Resume speech recognition after error (only in auto-listen mode)
        if (autoListen && recognitionRef.current && !isListening) {
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error with ElevenLabs TTS:', error);
      setIsSpeaking(false);
      // Resume speech recognition after error (only in auto-listen mode)
      if (autoListen && recognitionRef.current && !isListening) {
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 500);
      }
    }
  };



  const processVoiceCommand = async (command: string) => {
    try {
      // Send user message to backend
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: command,
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add AI response to messages
        addMessage(data.text, false);
        
        // Convert hex audio data back to binary and play
        const audioData = new Uint8Array(data.audio_data.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
        const audioBlob = new Blob([audioData], { type: data.audio_format });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Resume speech recognition after speaking ends (only in auto-listen mode)
          if (autoListen && recognitionRef.current && !isListening) {
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 500);
          }
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Resume speech recognition after error (only in auto-listen mode)
          if (autoListen && recognitionRef.current && !isListening) {
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 500);
          }
        };
        
        setIsSpeaking(true);
        await audio.play();
        
      } else {
        // Fallback to simple responses if backend fails
        const fallbackResponse = getFallbackResponse(command);
        addMessage(fallbackResponse, false);
        speak(fallbackResponse);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      // Fallback to simple responses if network fails
      const fallbackResponse = getFallbackResponse(command);
      addMessage(fallbackResponse, false);
      speak(fallbackResponse);
    }
  };

  const getFallbackResponse = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      return 'Hello! How can I help you today?';
    } else if (lowerCommand.includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}`;
    } else if (lowerCommand.includes('date')) {
      return `Today is ${new Date().toLocaleDateString()}`;
    } else if (lowerCommand.includes('weather')) {
      return 'I\'m sorry, I don\'t have access to weather information yet.';
    } else if (lowerCommand.includes('joke')) {
      return 'Why don\'t scientists trust atoms? Because they make up everything!';
    } else if (lowerCommand.includes('thank you') || lowerCommand.includes('thanks')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    } else if (lowerCommand.includes('goodbye') || lowerCommand.includes('bye')) {
      return 'Goodbye! Have a great day!';
    } else {
      return `I heard you say: "${command}". I'm still learning, but I'm here to help!`;
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const toggleAutoListen = () => {
    setAutoListen(!autoListen);
    // If turning off auto-listen and currently listening, stop recognition
    if (autoListen && isListening) {
      recognitionRef.current?.stop();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setTranscript('');
  };

  const testElevenLabs = async () => {
    const testText = "Hello! This is a test message to verify that ElevenLabs text-to-speech is working correctly.";
    try {
      setIsSpeaking(true);
      
      const response = await fetch('http://localhost:8000/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          console.error('Error playing test audio');
        };
        
        await audio.play();
        console.log('Test audio played successfully');
      } else {
        console.error('Test TTS request failed:', response.status);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Error with test TTS:', error);
      setIsSpeaking(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Browser Not Supported</h2>
        <p className="text-red-600">{error}</p>
        <p className="text-red-600 mt-2">
          Please use a modern browser like Chrome, Firefox, or Safari that supports the Web Speech API.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div>
        {/* Manual Control Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Voice Control</h3>
          
          {/* Manual Listen Button */}
          <div className="mb-4">
            <button 
              onClick={toggleListening}
              disabled={isSpeaking}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              } ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? '🛑 Stop Listening' : '🎤 Start Listening'}
            </button>
          </div>

          {/* Test ElevenLabs Button */}
          <div className="mb-4">
            <button 
              onClick={testElevenLabs}
              disabled={isSpeaking}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                'bg-green-500 text-white hover:bg-green-600'
              } ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              🔊 Test ElevenLabs TTS
            </button>
            <p className="text-xs text-gray-600 mt-1">
              Sends a test message to verify ElevenLabs integration
            </p>
          </div>

          {/* Auto-Listen Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoListen}
                onChange={toggleAutoListen}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoListen ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoListen ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                Auto-listen mode
              </span>
            </label>
            <div className="text-xs text-gray-500">
              {autoListen 
                ? 'Automatically pauses recognition while AI speaks' 
                : 'Manual control only - you control when to listen'
              }
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex justify-center gap-4 mb-4 text-sm">
          <div className={`flex items-center gap-2 ${isListening ? 'text-green-600' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isListening ? 'Listening' : 'Not listening'}
          </div>
          <div className={`flex items-center gap-2 ${isSpeaking ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isSpeaking ? 'Speaking' : 'Not speaking'}
          </div>
          <div className={`flex items-center gap-2 ${autoListen ? 'text-purple-600' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${autoListen ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
            {autoListen ? 'Auto-listen ON' : 'Manual mode'}
          </div>
          {isSpeaking && autoListen && (
            <div className="text-orange-600 text-xs">
              (Recognition paused)
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Live Transcript */}
        {transcript && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Live Transcript:</h3>
            <p className="text-blue-700">{transcript}</p>
          </div>
        )}

        {/* Conversation History */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Conversation History</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`p-3 rounded-lg ${
                message.isUser 
                  ? 'bg-blue-100 border-l-4 border-blue-500 ml-4' 
                  : 'bg-gray-100 border-l-4 border-gray-500 mr-4'
              }`}>
                <div className="flex justify-between items-start">
                  <p className="text-sm">{message.text}</p>
                  <span className="text-xs text-gray-500 ml-2">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start listening to begin a conversation!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}