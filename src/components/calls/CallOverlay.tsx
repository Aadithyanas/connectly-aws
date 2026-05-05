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
        animate={{
          opacity: 1, scale: 1, y: 0,
          width: isMinimized ? 280 : (isVideo && isActive ? 600 : 340),
          height: isMinimized ? 80 : (isVideo && isActive ? 460 : 420),
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-6 right-6 z-[9999] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Single audio element — always mounted, survives minimize */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        {isMinimized ? (
          /* ── Minimized bar ─────────────────────────────────────────────── */
          <div className="flex-1 flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#bc9dff] flex items-center justify-center">
                <User className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none">{activeCall?.caller?.name || 'User'}</p>
                <p className="text-[#bc9dff] text-[10px] font-bold uppercase tracking-widest mt-0.5">{fmt(callTime)}</p>
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
            {/* ── Stream / Avatar area ──────────────────────────────────── */}
            <div className="flex-1 relative bg-black overflow-hidden group">
              {isActive && isVideo ? (
                <div className="w-full h-full relative">
                  {/* Remote video — full frame */}
                  {hasRemote ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <div className="text-center">
                        <User className="w-16 h-16 text-white/30 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">Connecting video...</p>
                      </div>
                    </div>
                  )}

                  {/* Local video PIP */}
                  {!isVideoOff && (
                    <div className="absolute top-4 right-4 w-32 aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-xl">
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
                    </div>
                  )}
                </div>
              ) : (
                /* Audio call / ringing / calling view */
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#1a1a1a] to-black">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#bc9dff] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                      {activeCall?.caller?.avatar
                        ? <img src={activeCall.caller.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                        : <User className="w-12 h-12 text-white" />}
                    </div>
                    {(isRinging || isCalling) && (
                      <div className="absolute -inset-4 border-2 border-[#bc9dff]/30 rounded-full animate-ping" />
                    )}
                    {isActive && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#22c55e] text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                        Connected
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{activeCall?.caller?.name || 'User'}</h3>
                  <p className="text-xs text-[#bc9dff] font-medium tracking-widest uppercase">
                    {isRinging ? 'Incoming Call' : isCalling ? 'Calling...' : fmt(callTime)}
                  </p>
                </div>
              )}

              {/* Minimize button */}
              {isActive && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Controls ─────────────────────────────────────────────── */}
            <div className="bg-[#121212]/95 backdrop-blur-md px-6 py-5 border-t border-white/5">
              {isRinging ? (
                <div className="flex items-center justify-around">
                  <button onClick={rejectCall} className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110">
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button onClick={acceptCall} className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all transform hover:scale-110">
                    <Phone className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-around">
                  {/* Mute */}
                  <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* End call */}
                  <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all transform hover:scale-110">
                    <PhoneOff className="w-6 h-6" />
                  </button>

                  {/* Video toggle */}
                  <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>

                  {/* Speaker selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeakerMenu(p => !p)}
                      className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"
                      title="Speaker"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {showSpeakerMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute bottom-14 right-0 w-56 bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
                        >
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1">Speaker</p>
                          {speakers.length === 0 ? (
                            <p className="text-white/30 text-xs px-4 pb-3">No output devices found</p>
                          ) : (
                            speakers.map(s => (
                              <button
                                key={s.deviceId}
                                onClick={() => selectSpeaker(s.deviceId)}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${activeSpeakerId === s.deviceId ? 'text-[#bc9dff] bg-[#bc9dff]/10' : 'text-white/70 hover:bg-white/5'}`}
                              >
                                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{s.label || `Speaker ${speakers.indexOf(s) + 1}`}</span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
