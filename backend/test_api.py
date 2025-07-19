#!/usr/bin/env python3
"""
Test script for the Voice Agent Backend API
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on localhost:8000")
        return False

def test_voices():
    """Test the voices endpoint"""
    print("\n🎵 Testing voices endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/voices")
        if response.status_code == 200:
            data = response.json()
            voices = data.get("voices", [])
            print(f"✅ Found {len(voices)} voices")
            if voices:
                print("Sample voices:")
                for voice in voices[:3]:
                    print(f"  - {voice['name']} (ID: {voice['voice_id']})")
            return True
        else:
            print(f"❌ Voices request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing voices: {e}")
        return False

def test_usage():
    """Test the usage endpoint"""
    print("\n📊 Testing usage endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/usage")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Usage info retrieved:")
            print(f"  - Characters used: {data.get('character_count', 'N/A')}")
            print(f"  - Character limit: {data.get('character_limit', 'N/A')}")
            print(f"  - Subscription: {data.get('subscription', 'N/A')}")
            return True
        else:
            print(f"❌ Usage request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing usage: {e}")
        return False

def test_tts_stream():
    """Test the TTS streaming endpoint"""
    print("\n🎤 Testing TTS streaming endpoint...")
    
    test_text = "Hello! This is a test of the text-to-speech streaming functionality."
    
    payload = {
        "text": test_text,
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel voice
        "model_id": "eleven_monolingual_v1"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/tts/stream",
            json=payload,
            stream=True
        )
        
        if response.status_code == 200:
            # Save the audio to a file
            audio_filename = "test_speech.mp3"
            with open(audio_filename, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = os.path.getsize(audio_filename)
            print(f"✅ TTS streaming successful!")
            print(f"  - Audio saved to: {audio_filename}")
            print(f"  - File size: {file_size} bytes")
            print(f"  - Content-Type: {response.headers.get('content-type', 'N/A')}")
            return True
        else:
            print(f"❌ TTS streaming failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing TTS streaming: {e}")
        return False

def test_tts_regular():
    """Test the regular TTS endpoint"""
    print("\n🎵 Testing regular TTS endpoint...")
    
    test_text = "This is a test of the regular text-to-speech endpoint."
    
    payload = {
        "text": test_text,
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel voice
        "model_id": "eleven_monolingual_v1"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/tts", json=payload)
        
        if response.status_code == 200:
            # Save the audio to a file
            audio_filename = "test_speech_regular.mp3"
            with open(audio_filename, "wb") as f:
                f.write(response.content)
            
            file_size = os.path.getsize(audio_filename)
            print(f"✅ Regular TTS successful!")
            print(f"  - Audio saved to: {audio_filename}")
            print(f"  - File size: {file_size} bytes")
            print(f"  - Content-Type: {response.headers.get('content-type', 'N/A')}")
            return True
        else:
            print(f"❌ Regular TTS failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing regular TTS: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Voice Agent Backend API Tests")
    print("=" * 50)
    
    # Check if API key is configured
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("⚠️  Warning: ELEVENLABS_API_KEY not found in environment variables")
        print("   Some tests may fail. Please set up your API key first.")
    else:
        print("✅ ElevenLabs API key found")
    
    print()
    
    # Run tests
    tests = [
        test_health,
        test_voices,
        test_usage,
        test_tts_stream,
        test_tts_regular
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    print("\n💡 Next steps:")
    print("   1. Start your frontend: cd ../telli-hack && npm run dev")
    print("   2. Test the voice agent in your browser")
    print("   3. Check the API docs at: http://localhost:8000/docs")

if __name__ == "__main__":
    main() 