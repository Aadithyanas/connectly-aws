'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Maximize2, Minimize2, User, Volume2, ChevronDown
} from 'lucide-react';
import { useCall } from '@/context/CallContext';

export const CallOverlay = () => {
  const {
    isRinging, isCalling, activeCall,
    acceptCall, rejectCall, endCall,
    localStream, remoteStream,
  } = useCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState('default');

  // Store actual DOM nodes so callback refs can re-attach streams on remount
  const localVideoNode = useRef<HTMLVideoElement | null>(null);
  const remoteVideoNode = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Callback refs: re-attach stream every time the element mounts ──────────
  const localVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoNode.current = node;
    if (node && localStream) {
      node.srcObject = localStream;
      node.play().catch(() => {});
    }
  }, [localStream]);

  const remoteVideoRef = useCallback((node: HTMLVideoElement | null) => {
    remoteVideoNode.current = node;
    if (node && remoteStream) {
      node.srcObject = remoteStream;
      node.play().catch(() => {});
    }
  }, [remoteStream]);

  // ── Also re-attach when streams change (element already mounted) ────────────
  useEffect(() => {
    if (localVideoNode.current && localStream) {
      localVideoNode.current.srcObject = localStream;
      localVideoNode.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoNode.current) {
        remoteVideoNode.current.srcObject = remoteStream;
        remoteVideoNode.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  // ── Apply speaker when selection or audio element changes ──────────────────
  useEffect(() => {
    const el = remoteAudioRef.current as any;
    if (el && el.setSinkId && activeSpeakerId) {
      el.setSinkId(activeSpeakerId).catch(() => {});
    }
  }, [activeSpeakerId]);

  // ── Enumerate audio output devices (re-run after permissions are granted) ──
  useEffect(() => {
    const load = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
      } catch (_) {}
    };
    load();
    navigator.mediaDevices.addEventListener('devicechange', load);
    return () => navigator.mediaDevices.removeEventListener('devicechange', load);
  }, [localStream]);

  // ── Ringtone and System Notification for Incoming Calls ─────────────────────
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    
    if (isRinging && activeCall?.isIncoming) {
      // 1. Play ringing sound
      audio = new Audio('/ringtone.mp3'); // We'll assume a generic path or it falls back to silent if missing
      audio.loop = true;
      audio.play().catch(() => console.warn('Autoplay blocked for ringtone'));

      // 2. Show System Notification if backgrounded
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification('Incoming Call', {
          body: `${activeCall?.caller?.name || 'Someone'} is calling you...`,
          icon: activeCall?.caller?.avatar || '/favicon.ico',
          requireInteraction: true,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isRinging, activeCall]);

  const selectSpeaker = async (deviceId: string) => {
    setActiveSpeakerId(deviceId);
    setShowSpeakerMenu(false);
    const el = remoteAudioRef.current as any;
    if (el?.setSinkId) await el.setSinkId(deviceId).catch(() => {});
  };

  // ── Mute toggle ─────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    }
    setIsMuted(p => !p);
  }, [localStream, isMuted]);

  // ── Video toggle ────────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    }
    setIsVideoOff(p => !p);
  }, [localStream, isVideoOff]);

  // ── Call timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeCall && !isRinging && !isCalling) {
      interval = setInterval(() => setCallTime(p => p + 1), 1000);
    } else {
      setCallTime(0);
    }
    return () => clearInterval(interval);
  }, [activeCall, isRinging, isCalling]);

  // ── Reset state when call ends ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall) {
      setIsMuted(false);
      setIsVideoOff(false);
      setIsMinimized(false);
      setShowSpeakerMenu(false);
    }
  }, [activeCall]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!isRinging && !isCalling && !activeCall) return null;

  const isActive = activeCall && !isRinging && !isCalling;
  const isVideo = activeCall?.type === 'video';
  const hasRemote = !!remoteStream;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`fixed z-[9999] bg-[#1a1a1a] overflow-hidden flex flex-col transition-all duration-300 ${
          isMinimized 
            ? 'bottom-6 right-6 w-[280px] h-[80px] rounded-full border border-white/10 shadow-2xl bg-[#1a1a1a]/95 backdrop-blur-xl'
            : 'inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[420px] md:h-[650px] md:rounded-[2rem] md:border md:border-white/10 md:shadow-2xl'
        }`}
      >
        {/* Single audio element — always mounted, survives minimize */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        {isMinimized ? (
          /* ── Minimized bar ─────────────────────────────────────────────── */
          <div className="flex-1 flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#bc9dff] to-[#8b5cf6] flex items-center justify-center">
                {activeCall?.caller?.avatar ? <img src={activeCall.caller.avatar} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none truncate w-24">{activeCall?.caller?.name || 'User'}</p>
                <p className="text-[#bc9dff] text-[10px] font-bold uppercase tracking-widest mt-1">{fmt(callTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(false)} className="p-2 text-white/60 hover:text-white transition-colors">
                <Maximize2 className="w-5 h-5" />
              </button>
              <button onClick={endCall} className="p-2 bg-red-500 rounded-full text-white shadow-lg shadow-red-500/20">
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Top Bar ────────────────────────────────────────────────── */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={() => setIsMinimized(true)} className="p-2 text-white/80 hover:text-white">
                <ChevronDown className="w-7 h-7" />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-white font-semibold flex items-center gap-2">
                  🔒 {activeCall?.caller?.name || 'User'}
                </span>
                <span className="text-white/60 text-xs">
                  {isRinging ? 'Ringing...' : isCalling ? 'Calling...' : fmt(callTime)}
                </span>
              </div>
              <button className="p-2 text-white/80 hover:text-white opacity-0 pointer-events-none">
                <User className="w-6 h-6" /> {/* Placeholder for layout balance */}
              </button>
            </div>

            {/* ── Stream / Avatar area ──────────────────────────────────── */}
            <div className="flex-1 relative bg-[#121212] flex flex-col justify-center items-center">
              {isActive && isVideo ? (
                <div className="w-full h-full relative">
                  {/* Remote video — full frame */}
                  {hasRemote ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <User className="w-8 h-8 text-white/30" />
                        </div>
                        <p className="text-white/40 text-sm">Connecting video...</p>
                      </div>
                    </div>
                  )}

                  {/* Local video PIP (Top Right) */}
                  {!isVideoOff && (
                    <motion.div drag dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }} className="absolute top-20 right-4 w-28 md:w-32 aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Audio call / ringing / calling view */
                <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-[#1a1a1a] to-black">
                  <div className="relative mb-8">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#bc9dff] to-[#8b5cf6] flex items-center justify-center shadow-[0_0_40px_rgba(188,157,255,0.3)] z-10 relative">
                      {activeCall?.caller?.avatar
                        ? <img src={activeCall.caller.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                        : <User className="w-16 h-16 text-white" />}
                    </div>
                    {/* Ringing Ripple Effect */}
                    {(isRinging || isCalling) && (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-[#bc9dff] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />
                        <div className="absolute inset-[-20px] rounded-full border-2 border-[#bc9dff] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30" />
                      </>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{activeCall?.caller?.name || 'User'}</h2>
                  <p className="text-white/50 font-medium">
                    {isRinging ? 'Incoming Call' : isCalling ? 'Calling...' : `Connected • ${fmt(callTime)}`}
                  </p>
                </div>
              )}
            </div>

            {/* ── Controls (Floating over content) ───────────────────────── */}
            <div className="absolute bottom-8 left-0 right-0 px-6 flex flex-col items-center gap-6 z-30">
              <div className="bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 p-4 rounded-[2.5rem] flex items-center justify-center gap-6 shadow-2xl">
                {isRinging ? (
                  <>
                    <button onClick={rejectCall} className="w-16 h-16 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:scale-105 transition-transform">
                      <PhoneOff className="w-7 h-7" />
                    </button>
                    <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-[#22c55e] text-white flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:scale-105 transition-transform animate-bounce">
                      <Phone className="w-7 h-7" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Speaker */}
                    <div className="relative">
                      <button onClick={() => setShowSpeakerMenu(p => !p)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                        {showSpeakerMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-16 -left-1/2 w-48 bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40"
                          >
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1">Audio Output</p>
                            {speakers.length === 0 ? (
                              <p className="text-white/30 text-xs px-4 pb-3">Default Speaker</p>
                            ) : (
                              speakers.map(s => (
                                <button
                                  key={s.deviceId}
                                  onClick={() => selectSpeaker(s.deviceId)}
                                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${activeSpeakerId === s.deviceId ? 'text-[#bc9dff] bg-[#bc9dff]/10' : 'text-white/70 hover:bg-white/5'}`}
                                >
                                  <Volume2 className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{s.label || `Speaker ${speakers.indexOf(s) + 1}`}</span>
                                </button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Video */}
                    <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-white/10 text-white/50' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>

                    {/* Mute */}
                    <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white/10 text-white/50' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* End Call */}
                    <button onClick={endCall} className="w-16 h-16 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:scale-105 transition-transform ml-2">
                      <PhoneOff className="w-7 h-7" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
