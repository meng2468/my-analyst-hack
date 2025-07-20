'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  userStream?: MediaStream | null;
  className?: string;
}

export default function AudioVisualizer({ audioElement, userStream, className = '' }: AudioVisualizerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const userSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [userIsActive, setUserIsActive] = useState(false);
  const [botAmplitude, setBotAmplitude] = useState(0);
  const [userAmplitude, setUserAmplitude] = useState(0);
  const [botFrequencies, setBotFrequencies] = useState<number[]>([]);
  const [userFrequencies, setUserFrequencies] = useState<number[]>([]);

  useEffect(() => {
    if (!audioElement) return;

    const setupAudioContext = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Setup analyser for incoming audio (model)
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;

        // Setup analyser for user audio
        userAnalyserRef.current = audioContextRef.current.createAnalyser();
        userAnalyserRef.current.fftSize = 256;
        userAnalyserRef.current.smoothingTimeConstant = 0.8;

        // Connect audio element to analyser (incoming audio)
        if (audioElement.srcObject instanceof MediaStream) {
          sourceRef.current = audioContextRef.current.createMediaStreamSource(audioElement.srcObject);
          sourceRef.current.connect(analyserRef.current);
          setIsActive(true);
        }

        // Connect user stream to analyser (outgoing audio)
        if (userStream) {
          console.log('Setting up user stream for visualization:', userStream);
          userSourceRef.current = audioContextRef.current.createMediaStreamSource(userStream);
          userSourceRef.current.connect(userAnalyserRef.current);
          setUserIsActive(true);
        } else {
          console.log('No user stream provided to visualizer');
        }
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    };

    const updateAmplitudes = () => {
      // Update bot amplitude and frequencies
      if (analyserRef.current && isActive) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setBotAmplitude(average / 255);
        
        // Extract frequency data for equalizer bars
        const frequencies = [];
        const barCount = 8;
        const samplesPerBar = Math.floor(bufferLength / barCount);
        
        for (let i = 0; i < barCount; i++) {
          const startIndex = i * samplesPerBar;
          const endIndex = Math.min(startIndex + samplesPerBar, bufferLength);
          const barData = dataArray.slice(startIndex, endIndex);
          const barAverage = barData.reduce((sum, value) => sum + value, 0) / barData.length;
          frequencies.push(barAverage / 255);
        }
        setBotFrequencies(frequencies);
      }

      // Update user amplitude and frequencies
      if (userAnalyserRef.current && userIsActive) {
        const bufferLength = userAnalyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        userAnalyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setUserAmplitude(average / 255);
        
        // Extract frequency data for equalizer bars
        const frequencies = [];
        const barCount = 8;
        const samplesPerBar = Math.floor(bufferLength / barCount);
        
        for (let i = 0; i < barCount; i++) {
          const startIndex = i * samplesPerBar;
          const endIndex = Math.min(startIndex + samplesPerBar, bufferLength);
          const barData = dataArray.slice(startIndex, endIndex);
          const barAverage = barData.reduce((sum, value) => sum + value, 0) / barData.length;
          frequencies.push(barAverage / 255);
        }
        setUserFrequencies(frequencies);
      }

      requestAnimationFrame(updateAmplitudes);
    };

    setupAudioContext().then(() => {
      if (isActive || userIsActive) {
        updateAmplitudes();
      }
    });

    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (userSourceRef.current) {
        userSourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioElement, userStream, isActive, userIsActive]);

  // Update when audio stream changes
  useEffect(() => {
    if (audioElement?.srcObject instanceof MediaStream && audioContextRef.current && analyserRef.current) {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      sourceRef.current = audioContextRef.current.createMediaStreamSource(audioElement.srcObject);
      sourceRef.current.connect(analyserRef.current);
      setIsActive(true);
    }
  }, [audioElement?.srcObject]);

  // Update when user stream changes
  useEffect(() => {
    console.log('User stream changed:', userStream);
    if (userStream && audioContextRef.current && userAnalyserRef.current) {
      if (userSourceRef.current) {
        userSourceRef.current.disconnect();
      }
      userSourceRef.current = audioContextRef.current.createMediaStreamSource(userStream);
      userSourceRef.current.connect(userAnalyserRef.current);
      setUserIsActive(true);
      console.log('User stream connected to visualizer');
    }
  }, [userStream]);

  // Debug info
  console.log('Visualizer state:', { isActive, userIsActive, botAmplitude, userAmplitude, hasUserStream: !!userStream });

  return (
    <div className={`overflow-hidden flex flex-col items-center gap-4 ${className} `}>
      
      {/* Dynamic Equalizer Bars */}
      <div className="flex items-end gap-1 h-48">
        {[...Array(8)].map((_, i) => {
          const botFreq = botFrequencies[i] || 0;
          const userFreq = userFrequencies[i] || 0;
          const totalFreq = botFreq + userFreq;
          const isBotDominant = botFreq > userFreq;
          
          return (
            <motion.div
              key={i}
              className="w-6 rounded-t-lg"
              style={{
                background: isBotDominant 
                  ? `linear-gradient(to top, #FFFFFF, #FFFFFF)` 
                  : `linear-gradient(to top, #13FFAA, #13FFAA)`
              }}
              animate={{
                height: `${Math.max(4, totalFreq * 200)}px`,
                scaleY: [1, 1.1, 1],
              }}
              transition={{
                height: { duration: 0.1, ease: "easeOut" },
                scaleY: { duration: 0.2, ease: "easeInOut" }
              }}
              whileHover={{
                scaleY: 1.2,
                transition: { duration: 0.1 }
              }}
            />
          );
        })}
      </div>
    </div>
  );
} 