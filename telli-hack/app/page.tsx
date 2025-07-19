"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import VoiceUI from "./_components/VoiceUI";

// Function to generate a unique session ID
function generateSessionId(): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${randomPart}`;
}

// Function to get or create session ID
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering - return a placeholder
    return 'loading...';
  }
  
  let sessionId = localStorage.getItem('session_id');
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('session_id', sessionId);
    console.log('New session created:', sessionId);
  }
  
  return sessionId;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('loading...');

  useEffect(() => {
    // Set session ID on client-side
    setSessionId(getOrCreateSessionId());
  }, []);

  return (
    <div className="flex flex-col items-start justify-start px-8 py-4 h-screen w-full max-w-4xl mx-auto">
      <div>
        <p>{sessionId}</p>
      </div>
      <VoiceUI />
    </div>
  );
}
