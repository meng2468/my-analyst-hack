'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import AudioVisualizer from '@/app/_components/audio-visualizer';
import { LoadingSpinnerWithText } from '@/components/ui/loading-spinner';
import { Mic, MicOff, PhoneOff, Database } from 'lucide-react';
import { motion } from 'motion/react';

export default function ConversationView({ 
  sessionId, 
  step, 
  setStep,
  onStepChange 
}: { 
  sessionId: string, 
  step: number, 
  setStep: (step: number) => void,
  onStepChange?: (newStep: number) => void
}) {
  const [status, setStatus] = useState('Disconnected');
  const [connected, setConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcIdRef = useRef<string | null>(null);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [transcript, setTranscript] = useState<string[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  // Auto-connect when step is 1
  useEffect(() => {
    if (step === 1 && !connected) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [step]);
  useEffect(() => {
    if (status === 'Connected') {
      // Create and store EventSource only once per connection
      sseRef.current = new EventSource('/api/transcript-events');
      sseRef.current.onmessage = (event) => {
        setTranscript((prev) => [...prev, event.data]);
      };
      sseRef.current.onerror = () => {
        // Optional: handle errors
        // setTranscript((prev) => [...prev, "[Transcript connection lost]"]);
      };
    }
    // Cleanup when disconnected or unmounted
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      setTranscript([]);
    };
  }, [status === 'Connected']);

  const waitForIceGatheringComplete = async (pc: RTCPeerConnection, timeoutMs = 2000) => {
    if (pc.iceGatheringState === 'complete') return;
    console.log("Waiting for ICE gathering to complete. Current state:", pc.iceGatheringState);
    return new Promise<void>((resolve) => {
      let timeoutId: NodeJS.Timeout;
      const checkState = () => {
        console.log("icegatheringstatechange:", pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          cleanup();
          resolve();
        }
      };
      const onTimeout = () => {
        console.warn(`ICE gathering timed out after ${timeoutMs} ms.`);
        cleanup();
        resolve();
      };
      const cleanup = () => {
        pc.removeEventListener('icegatheringstatechange', checkState);
        clearTimeout(timeoutId);
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      timeoutId = setTimeout(onTimeout, timeoutMs);
      // Checking the state again to avoid any eventual race condition
      checkState();
    });
  };

  const createSmallWebRTCConnection = async (audioTrack: MediaStreamTrack) => {
    const config = {
      iceServers: [],
    };
    const pc = new RTCPeerConnection(config);
    addPeerConnectionEventListeners(pc);
    
    if (audioRef.current) {
      pc.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
        }
      };
    }
    
    // SmallWebRTCTransport expects to receive both transceivers
    pc.addTransceiver(audioTrack, { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    
    await pc.setLocalDescription(await pc.createOffer());
    await waitForIceGatheringComplete(pc);
    
    const offer = pc.localDescription;
    if (!offer) throw new Error('Failed to create offer');
    
    const requestBody = {
      sdp: offer.sdp,
      type: offer.type,
      session_id: sessionId,
      ...(pcIdRef.current && { pc_id: pcIdRef.current })
    };

    const response = await fetch('/api/offer', {
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    
    const answer = await response.json();
    
    // Store the pc_id for future renegotiations
    if (answer.pc_id) {
      pcIdRef.current = answer.pc_id;
    }
    
    await pc.setRemoteDescription(answer);
    return pc;
  };

  const addPeerConnectionEventListeners = (pc: RTCPeerConnection) => {
    pc.oniceconnectionstatechange = () => {
      console.log("oniceconnectionstatechange", pc?.iceConnectionState);
    };
    
    pc.onconnectionstatechange = () => {
      console.log("onconnectionstatechange", pc?.connectionState);
      const connectionState = pc?.connectionState;
      if (connectionState === 'connected') {
        setStatus('Connected');
        setConnected(true);
      } else if (connectionState === 'disconnected') {
        setStatus('Disconnected');
        setConnected(false);
      }
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate:", event.candidate);
      } else {
        console.log("All ICE candidates have been sent.");
      }
    };
  };

  const connect = async () => {
    try {
      setStatus('Connecting');
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setUserStream(audioStream); // Store user stream for visualization
      peerConnectionRef.current = await createSmallWebRTCConnection(audioStream.getAudioTracks()[0]);
      setStatus('Connected');
      setConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('Connection failed');
      setConnected(false);
    }
  };

  const disconnect = () => {
    if (!peerConnectionRef.current) {
      return;
    }
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
    pcIdRef.current = null; // Clear the pc_id when disconnecting
    setStatus('Disconnected');
    setConnected(false);
    setUserStream(null); // Clear user stream
  };

  const handleButtonClick = async () => {
    if (!connected) {
      await connect();
    } else {
      disconnect();
    }
  };

  const toggleMute = () => {
    if (userStream) {
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabledState = !audioTrack.enabled;
        audioTrack.enabled = newEnabledState;
        setIsMuted(!newEnabledState);
      }
    }
  };

  const handleStartWithAnotherDataset = () => {
    setStep(0);
  };

  // Skeleton component for step 0
  const ConversationSkeleton = () => (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
      {/* Audio Visualizer Skeleton */}
      <div className="w-full h-48 flex items-end gap-1">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-6 bg-gray-200 rounded-sm"
            animate={{
              height: [20, 60, 20],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      {/* Button Skeleton */}
      <div className="w-full space-y-3">
        <motion.div
          className="h-10 bg-gray-200 rounded-md"
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="h-10 bg-gray-200 rounded-md"
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.5,
            ease: "easeInOut"
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center bg-white/15 backdrop-blur-lg border border-white w-full px-12 p-6 rounded-lg relative">
      <div className="h-[730px] w-[240px] flex flex-col space-y-6 items-center justify-center">
        {/* Fixed height container for audio visualizer area */}
        <div className="h-36 flex items-center justify-center">
          {step === 0 ? (
            <ConversationSkeleton />
          ) : status === 'Connecting' ? (
            <div className="flex justify-center">
              <LoadingSpinnerWithText 
                text="Connecting to conversation..." 
                size="lg"
                className="text-center"
              />
            </div>
          ) : status === 'Connected' ? (
            <AudioVisualizer 
              audioElement={audioRef.current}
              userStream={userStream}
              className="w-full h-full"
            />
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">Ready to connect</p>
            </div>
          )}
        </div>
        
        {/* Fixed height container for buttons */}
        <div className="h-32 flex flex-col justify-center items-center space-y-3">
          {step === 0 && (
            <div className="text-center text-gray-500">
              <p>Upload a dataset to start your conversation</p>
            </div>
          )}
          {!connected && step === 1 && (
            <Button
              onClick={handleButtonClick}
              variant="default"
              size="lg"
              className="w-full"
            >
              Connect
            </Button>
          )}
          {connected && step === 1 && (
            <div className="space-y-3">
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                className="w-full cursor-pointer"
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
      
      {/* Floating Generate Summary button */}
      {connected && step === 1 && (
        <div className="absolute bottom-4 w-full flex justify-center">
          <Button
            onClick={() => {
              disconnect();
              setStep(2);
              if (onStepChange) {
                onStepChange(2);
              }
            }}
            variant="default"
            className="w-48 h-12 flex items-center justify-center rounded-full cursor-pointer"
            title="Generate Summary"
          >
            <Database size={20} className="mr-2" />
            Generate Summary
          </Button>
        </div>
      )}
    </div>
  );
}