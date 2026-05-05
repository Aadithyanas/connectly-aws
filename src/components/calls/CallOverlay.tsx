'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, User } from 'lucide-react';
import { useCall } from '@/context/CallContext';

export const CallOverlay = () => {
  const { 
    isRinging, isCalling, activeCall, 
    acceptCall, rejectCall, endCall,
    localStream, remoteStream 
  } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to both video AND audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      // Always attach to audio element for reliable audio playback
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  // Toggle mute — actually disable audio tracks
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // toggle: if currently muted, enable
      });
    }
    setIsMuted(!isMuted);
  }, [localStream, isMuted]);

  // Toggle video — actually disable video tracks
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff; // toggle: if currently off, enable
      });
    }
    setIsVideoOff(!isVideoOff);
  }, [localStream, isVideoOff]);

  // Call Timer
  useEffect(() => {
    let interval: any;
    if (activeCall && !isRinging && !isCalling) {
      interval = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
    } else {
      setCallTime(0);
    }
    return () => clearInterval(interval);
  }, [activeCall, isRinging, isCalling]);

  // Reset mute/video state when call ends
  useEffect(() => {
    if (!activeCall) {
      setIsMuted(false);
      setIsVideoOff(false);
      setIsMinimized(false);
    }
  }, [activeCall]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRinging && !isCalling && !activeCall) return null;

  const isActive = activeCall && !isRinging && !isCalling;
  const isVideo = activeCall?.type === 'video';

  return (
    <AnimatePresence>
      {/* Hidden audio element — always plays remote audio regardless of video state */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          width: isMinimized ? 280 : (isVideo && isActive ? 600 : 320),
          height: isMinimized ? 80 : (isVideo && isActive ? 450 : 400)
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-6 right-6 z-[9999] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500"
      >
        {isMinimized ? (
          <div className="flex-1 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#bc9dff] flex items-center justify-center">
                <User className="w-5 h-5 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-bold truncate w-24">
                  {activeCall?.caller?.name || 'User'}
                </span>
                <span className="text-[#bc9dff] text-[10px] font-bold uppercase tracking-widest">
                  {formatTime(callTime)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(false)} className="p-2 text-white/60 hover:text-white">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={endCall} className="p-2 bg-red-500 rounded-full text-white">
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header / Stream Area */}
            <div className="flex-1 relative bg-black overflow-hidden group">
              {isActive && isVideo ? (
                <div className="w-full h-full relative">
                  {/* Remote Video (Full) */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Local Video (PIP) */}
                  {!isVideoOff && (
                    <div className="absolute top-4 right-4 w-32 aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-xl">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#1a1a1a] to-black">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#bc9dff] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                      {activeCall?.caller?.avatar ? (
                         <img src={activeCall.caller.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        <User className="w-12 h-12 text-white" />
                      )}
                    </div>
                    {(isRinging || isCalling) && (
                      <div className="absolute -inset-4 border-2 border-[#bc9dff]/30 rounded-full animate-ping" />
                    )}
                    {isActive && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#22c55e] text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg">
                        Connected
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">
                    {activeCall?.caller?.name || 'User'}
                  </h3>
                  
                  <p className="text-xs text-[#bc9dff] font-medium tracking-widest uppercase">
                    {isRinging ? 'Incoming Call' : isCalling ? 'Calling...' : formatTime(callTime)}
                  </p>
                </div>
              )}

              {/* Minimize Button */}
              {isActive && (
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="bg-[#121212]/95 backdrop-blur-md p-6 flex items-center justify-around border-t border-white/5">
              {isRinging ? (
                <>
                  <button
                    onClick={rejectCall}
                    className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all transform hover:scale-110"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all transform hover:scale-110"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>

                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                </>
              )}
            </div>
            {/* Hidden audio element for remote audio track */}
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
