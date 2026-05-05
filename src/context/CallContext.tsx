'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '@/utils/socket';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface CallContextType {
  isRinging: boolean;
  isCalling: boolean;
  activeCall: any | null;
  initiateCall: (to: string, type: 'audio' | 'video', isGroup?: boolean, targetName?: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const [isRinging, setIsRinging] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [activeCall, setActiveCall] = useState<any | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<any>(null);

  // ICE candidate queue — hold candidates until remote description is set
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDesc = useRef(false);
  // Timer to allow ICE 'disconnected' to recover before giving up
  const iceRecoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // ─── ICE Config: STUN + TURN for every network topology ───────────────────
  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Open Relay TURN — covers symmetric NAT, mobile networks, corporate WiFi
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };

  // ─── Adaptive media constraints ────────────────────────────────────────────
  const getMediaConstraints = (isVideo: boolean): MediaStreamConstraints => {
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,      // mono = lower latency
      latency: 0,           // request minimum buffer latency
    };
    if (!isVideo) return { audio: audioConstraints, video: false };
    return {
      audio: audioConstraints,
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user',
      },
    };
  };

  // Get media with fallback: try video first, fallback to audio-only
  const getMediaWithFallback = async (isVideo: boolean): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia(getMediaConstraints(isVideo));
    } catch (err: any) {
      if (isVideo && (err.name === 'NotFoundError' || err.name === 'NotReadableError' || err.name === 'OverconstrainedError')) {
        console.warn('[Call] Video device failed, falling back to audio-only');
        return await navigator.mediaDevices.getUserMedia(getMediaConstraints(false));
      }
      throw err;
    }
  };

  const clearIceRecovery = () => {
    if (iceRecoveryTimer.current) {
      clearTimeout(iceRecoveryTimer.current);
      iceRecoveryTimer.current = null;
    }
  };

  // ─── Full cleanup ──────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    clearIceRecovery();
    hasRemoteDesc.current = false;
    iceCandidateQueue.current = [];
    setIsRinging(false);
    setIsCalling(false);
    setActiveCall(null);
    setLocalStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop());
      return null;
    });
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
  }, []);

  // ─── Drain queued ICE candidates after remote description is applied ───────
  const drainQueue = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc) return;
    while (iceCandidateQueue.current.length > 0) {
      const c = iceCandidateQueue.current.shift()!;
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('[Call] Queued ICE add failed:', e); }
    }
  }, []);

  // ─── Create RTCPeerConnection ──────────────────────────────────────────────
  const createPeerConnection = useCallback((targetSocketId: string) => {
    if (peerConnection.current) peerConnection.current.close();
    hasRemoteDesc.current = false;
    iceCandidateQueue.current = [];

    const socket = socketService.getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', { to: targetSocketId, signal: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('[Call] Remote track received');
      if (event.streams?.[0]) setRemoteStream(event.streams[0]);
    };

    // ── Connection state: definitive success/failure ──
    pc.onconnectionstatechange = () => {
      console.log('[Call] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        clearIceRecovery();
      } else if (pc.connectionState === 'failed') {
        clearIceRecovery();
        toast.error('Call connection failed');
        handleEndCall();
      }
    };

    // ── ICE state: handle transient disconnects with recovery ──
    pc.oniceconnectionstatechange = () => {
      console.log('[Call] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearIceRecovery();
      } else if (pc.iceConnectionState === 'disconnected') {
        // Give it 8 s to self-heal (NAT rebind, mobile handoff, etc.)
        clearIceRecovery();
        iceRecoveryTimer.current = setTimeout(() => {
          const state = peerConnection.current?.iceConnectionState;
          if (state === 'disconnected' || state === 'failed') {
            toast.error('Call connection lost');
            handleEndCall();
          }
        }, 8000);
        // Trigger ICE restart immediately
        try { peerConnection.current?.restartIce(); } catch (_) {}
      } else if (pc.iceConnectionState === 'failed') {
        clearIceRecovery();
        toast.error('Call connection failed');
        handleEndCall();
      }
    };

    // ── Re-negotiate only when in stable state (avoids double-offer on track add) ──
    pc.onnegotiationneeded = async () => {
      const currentCall = activeCallRef.current;
      // Only re-negotiate if stable (not during initial offer/answer exchange)
      if (!currentCall?.isIncoming && peerConnection.current === pc && pc.signalingState === 'stable') {
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          if (socket && currentCall?.targetSocketId) {
            socket.emit('call:signal', { to: currentCall.targetSocketId, signal: offer });
          }
        } catch (e) { console.warn('[Call] Re-negotiation failed:', e); }
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [handleEndCall]);

  // ─── Caller: get media → create offer ─────────────────────────────────────
  const startSignaling = useCallback(async (isCaller: boolean, targetSocketId: string) => {
    const socket = socketService.getSocket();
    try {
      const isVideo = activeCallRef.current?.type === 'video';
      console.log('[Call] startSignaling isCaller:', isCaller, 'video:', isVideo);

      const stream = await getMediaWithFallback(isVideo);
      setLocalStream(stream);

      const pc = createPeerConnection(targetSocketId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      if (isCaller) {
        // voiceActivityDetection:false prevents first-syllable cutoff
        const offer = await pc.createOffer({ voiceActivityDetection: false });
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', { to: targetSocketId, signal: offer });
        console.log('[Call] Offer sent to', targetSocketId);
      }
    } catch (err) {
      console.error('[Call] Media error:', err);
      toast.error('Could not access microphone/camera — check browser permissions.');
      handleEndCall();
    }
  }, [createPeerConnection, handleEndCall]);

  // ─── Callee: receive offer → send answer ──────────────────────────────────
  // IMPORTANT: get media FIRST so video tracks exist before creating the answer
  const handleOffer = useCallback(async (offer: any, fromSocketId: string) => {
    const socket = socketService.getSocket();
    try {
      const isVideo = activeCallRef.current?.type === 'video';
      console.log('[Call] Handling offer from', fromSocketId, 'isVideo:', isVideo);

      // 1. Get media BEFORE creating PC — ensures video m-line in answer
      const stream = await getMediaWithFallback(isVideo);
      setLocalStream(stream);

      // 2. Create PC and set remote description
      const pc = createPeerConnection(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      hasRemoteDesc.current = true;
      await drainQueue();

      // 3. Add local tracks (after remote desc to avoid onnegotiationneeded race)
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Create and send answer
      const answer = await pc.createAnswer({ voiceActivityDetection: false });
      await pc.setLocalDescription(answer);
      socket.emit('call:signal', { to: fromSocketId, signal: answer });
      console.log('[Call] Answer sent to', fromSocketId);
    } catch (err) {
      console.error('[Call] handleOffer error:', err);
      toast.error('Failed to establish call');
      handleEndCall();
    }
  }, [createPeerConnection, handleEndCall, drainQueue]);

  // ─── Caller: receive answer ────────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer: any) => {
    if (!peerConnection.current) return;
    console.log('[Call] Setting remote description (answer)');
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    hasRemoteDesc.current = true;
    await drainQueue();
  }, [drainQueue]);

  // ─── ICE candidate — queue if no remote desc yet ──────────────────────────
  const handleCandidate = useCallback(async (candidate: any) => {
    if (!peerConnection.current) return;
    if (!hasRemoteDesc.current) {
      iceCandidateQueue.current.push(candidate);
      return;
    }
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) { console.warn('[Call] ICE add failed:', e); }
  }, []);

  // ─── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    const joinPresence = () => {
      socket.emit('join_presence', user.id);
    };
    if (socket.connected) joinPresence();
    socket.on('connect', joinPresence);

    const onRequest = (data: any) => {
      setActiveCall({ ...data, isIncoming: true });
      setIsRinging(true);
    };
    const onGroupIncoming = (data: any) => {
      setActiveCall({ ...data, isIncoming: true });
      setIsRinging(true);
    };
    const onRequestResult = (data: { accepted: boolean; from: string }) => {
      if (data.accepted) {
        toast.success('Call accepted!');
        setIsCalling(false);
        setActiveCall((prev: any) => ({ ...prev, targetSocketId: data.from }));
        startSignaling(true, data.from);
      } else {
        toast.error('Call rejected');
        setIsCalling(false);
        setActiveCall(null);
      }
    };
    const onSignal = async (data: { from: string; signal: any }) => {
      const { signal } = data;
      if (signal.type === 'offer') {
        await handleOffer(signal, data.from);
      } else if (signal.type === 'answer') {
        await handleAnswer(signal);
      } else if (signal.candidate !== undefined) {
        await handleCandidate(signal);
      }
    };
    const onEnd = () => handleEndCall();
    const onUserDisconnected = (socketId: string) => {
      const c = activeCallRef.current;
      if (c && (c.from === socketId || c.targetSocketId === socketId)) {
        toast.info('The other user disconnected');
        handleEndCall();
      }
    };

    socket.on('call:request', onRequest);
    socket.on('call:group-incoming', onGroupIncoming);
    socket.on('call:request-result', onRequestResult);
    socket.on('call:signal', onSignal);
    socket.on('call:end', onEnd);
    socket.on('call:user-disconnected', onUserDisconnected);

    return () => {
      socket.off('connect', joinPresence);
      socket.off('call:request', onRequest);
      socket.off('call:group-incoming', onGroupIncoming);
      socket.off('call:request-result', onRequestResult);
      socket.off('call:signal', onSignal);
      socket.off('call:end', onEnd);
      socket.off('call:user-disconnected', onUserDisconnected);
    };
  }, [user?.id, startSignaling, handleOffer, handleAnswer, handleCandidate, handleEndCall]);

  // Auto-reject outgoing call after 30 s
  useEffect(() => {
    if (!isCalling) return;
    const t = setTimeout(() => {
      toast.error('No answer. Call timed out.');
      setIsCalling(false);
      setActiveCall(null);
    }, 30000);
    return () => clearTimeout(t);
  }, [isCalling]);

  const initiateCall = useCallback((to: string, type: 'audio' | 'video', isGroup = false, targetName = 'User') => {
    const socket = socketService.getSocket();
    if (!socket || !user) return;
    setIsCalling(true);
    setActiveCall({ caller: { name: targetName }, type, targetUserId: to, isIncoming: false });
    socket.emit('call:initiate', {
      to, type, isGroup,
      callerInfo: { name: user?.name || user?.email || 'Someone', role: 'student' },
    });
  }, [user]);

  const acceptCall = useCallback(() => {
    const socket = socketService.getSocket();
    const c = activeCallRef.current;
    if (!socket || !c) return;
    setIsRinging(false);
    socket.emit('call:request-response', { to: c.from, accepted: true });
  }, []);

  const rejectCall = useCallback(() => {
    const socket = socketService.getSocket();
    const c = activeCallRef.current;
    if (!socket || !c) return;
    setIsRinging(false);
    socket.emit('call:request-response', { to: c.from, accepted: false });
    setActiveCall(null);
  }, []);

  const endCall = useCallback(() => {
    const socket = socketService.getSocket();
    const c = activeCallRef.current;
    if (socket && c) {
      const target = c.from || c.targetSocketId;
      if (target) socket.emit('call:end', { to: target });
    }
    handleEndCall();
  }, [handleEndCall]);

  return (
    <CallContext.Provider value={{
      isRinging, isCalling, activeCall,
      initiateCall, acceptCall, rejectCall, endCall,
      localStream, remoteStream,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
