'use client';

import { useState, useRef, useEffect } from 'react';

export default function Page() {
  const [status, setStatus] = useState('Disconnected');
  const [connected, setConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcIdRef = useRef<string | null>(null);

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
  };

  const handleButtonClick = async () => {
    if (!connected) {
      await connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">WebRTC Voice Agent</h1>
        <p className="text-xl mb-6 text-gray-600">{status}</p>
        <button
          onClick={handleButtonClick}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}