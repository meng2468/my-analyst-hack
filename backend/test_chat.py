#!/usr/bin/env python3
"""
Test script for the chat endpoint
"""

import requests
import json

def test_chat_endpoint():
    """Test the chat endpoint with a simple message"""
    
    url = "http://localhost:8000/chat"
    
    payload = {
        "message": "Hello, how are you?",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "model_id": "eleven_monolingual_v1"
    }
    
    try:
        print("Testing chat endpoint...")
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat endpoint working!")
            print(f"Response text: {data['text']}")
            print(f"Audio data length: {len(data['audio_data'])} characters")
            print(f"Audio format: {data['audio_format']}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_health_endpoint():
    """Test the health endpoint"""
    
    url = "http://localhost:8000/health"
    
    try:
        print("Testing health endpoint...")
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health endpoint working!")
            print(f"Status: {data['status']}")
            print(f"ElevenLabs configured: {data['elevenlabs_configured']}")
            print(f"OpenAI configured: {data['openai_configured']}")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    print("=== Backend Chat Endpoint Test ===\n")
    
    test_health_endpoint()
    print()
    test_chat_endpoint() 