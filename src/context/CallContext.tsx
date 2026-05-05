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
  const { user } = useAuth();

  // Keep activeCallRef in sync with state
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Cleanup helper for peer connection
  const cleanupPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  }, []);

  // Cleanup helper for local stream
  const cleanupLocalStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const handleEndCall = useCallback(() => {
    setIsRinging(false);
    setIsCalling(false);
    setActiveCall(null);
    // Stop all tracks on current local stream
    setLocalStream(prev => {
      if (prev) prev.getTracks().forEach(track => track.stop());
      return null;
    });
    cleanupPeerConnection();
    setRemoteStream(null);
  }, [cleanupPeerConnection]);

  // Create peer connection for WebRTC
  const createPeerConnection = useCallback((targetSocketId: string) => {
    if (peerConnection.current) {
      // Close existing connection before creating a new one
      peerConnection.current.close();
    }

    const socket = socketService.getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', { to: targetSocketId, signal: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('[Call] Remote track received:', event.streams[0]?.id);
      setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Call] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        toast.error('Call connection lost');
        handleEndCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [handleEndCall]);

  // Start signaling - get media and create offer/answer
  const startSignaling = useCallback(async (isCaller: boolean, targetSocketId: string) => {
    const socket = socketService.getSocket();
    try {
      const currentCall = activeCallRef.current;
      const isVideo = currentCall?.type === 'video';
      
      console.log('[Call] Starting signaling, isCaller:', isCaller, 'isVideo:', isVideo);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });
      setLocalStream(stream);

      const pc = createPeerConnection(targetSocketId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', { to: targetSocketId, signal: offer });
        console.log('[Call] Offer sent to', targetSocketId);
      }
    } catch (err) {
      console.error('[Call] Failed to get media devices:', err);
      toast.error('Could not access camera/microphone');
      handleEndCall();
    }
  }, [createPeerConnection, handleEndCall]);

  // Handle incoming WebRTC offer
  const handleOffer = useCallback(async (offer: any, fromSocketId: string) => {
    const socket = socketService.getSocket();
    try {
      const currentCall = activeCallRef.current;
      const isVideo = currentCall?.type === 'video';
      
      console.log('[Call] Handling offer from', fromSocketId);
      
      const pc = createPeerConnection(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:signal', { to: fromSocketId, signal: answer });
      console.log('[Call] Answer sent to', fromSocketId);
    } catch (err) {
      console.error('[Call] Error handling offer:', err);
      toast.error('Failed to establish call');
      handleEndCall();
    }
  }, [createPeerConnection, handleEndCall]);

  // Handle incoming WebRTC answer
  const handleAnswer = useCallback(async (answer: any) => {
    if (peerConnection.current) {
      console.log('[Call] Setting remote description (answer)');
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  // Handle incoming ICE candidate
  const handleCandidate = useCallback(async (candidate: any) => {
    if (peerConnection.current) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('[Call] Error adding ICE candidate:', e);
      }
    }
  }, []);

  // Main socket listener setup
  useEffect(() => {
    if (!user?.id) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Ensure we join presence room - critical for receiving calls
    const joinPresence = () => {
      console.log('[Call] Joining presence room for user:', user.id);
      socket.emit('join_presence', user.id);
    };

    // Join on connect and reconnect
    if (socket.connected) {
      joinPresence();
    }
    socket.on('connect', joinPresence);

    // ---- CALL EVENT HANDLERS ----

    // Incoming call request (1:1)
    const onRequest = (data: any) => {
      console.log('[Call] Incoming call request from:', data.from, data.caller?.name);
      setActiveCall({ ...data, isIncoming: true });
      setIsRinging(true);
    };

    // Incoming group call
    const onGroupIncoming = (data: any) => {
      console.log('[Call] Incoming group call:', data.roomId);
      setActiveCall({ ...data, isIncoming: true });
      setIsRinging(true);
    };

    // Response to our outgoing call request
    const onRequestResult = (data: { accepted: boolean, from: string }) => {
      console.log('[Call] Request result:', data.accepted ? 'ACCEPTED' : 'REJECTED', 'from socket:', data.from);
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

    // WebRTC signaling data (offer/answer/ICE)
    const onSignal = async (data: { from: string, signal: any }) => {
      const { signal } = data;
      console.log('[Call] Signal received, type:', signal.type || (signal.candidate ? 'ice-candidate' : 'unknown'));
      
      if (signal.type === 'offer') {
        await handleOffer(signal, data.from);
      } else if (signal.type === 'answer') {
        await handleAnswer(signal);
      } else if (signal.candidate) {
        await handleCandidate(signal);
      }
    };

    // Call ended by the other party
    const onEnd = () => {
      console.log('[Call] Remote end received');
      handleEndCall();
    };

    // Remote user disconnected
    const onUserDisconnected = (disconnectedSocketId: string) => {
      const currentCall = activeCallRef.current;
      if (currentCall && (currentCall.from === disconnectedSocketId || currentCall.targetSocketId === disconnectedSocketId)) {
        console.log('[Call] Remote user disconnected during call');
        toast.info('The other user disconnected');
        handleEndCall();
      }
    };

    // Register all listeners
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

  // Auto-reject timeout (30 seconds)
  useEffect(() => {
    if (!isCalling) return;
    const timeout = setTimeout(() => {
      toast.error('No answer. Call timed out.');
      setIsCalling(false);
      setActiveCall(null);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [isCalling]);

  // Initiate a call
  const initiateCall = useCallback((to: string, type: 'audio' | 'video', isGroup = false, targetName = 'User') => {
    const socket = socketService.getSocket();
    if (!socket || !user) return;
    
    console.log('[Call] Initiating call to:', to, 'type:', type, 'isGroup:', isGroup);
    
    setIsCalling(true);
    setActiveCall({
      caller: { name: targetName },
      type,
      targetUserId: to
    });

    socket.emit('call:initiate', {
      to,
      type,
      isGroup,
      callerInfo: { 
        name: user?.name || user?.email || 'Someone', 
        role: 'student',
      }
    });
  }, [user]);

  // Accept an incoming call
  const acceptCall = useCallback(() => {
    const socket = socketService.getSocket();
    const currentCall = activeCallRef.current;
    if (!socket || !currentCall) return;
    
    console.log('[Call] Accepting call from:', currentCall.from);
    setIsRinging(false);
    socket.emit('call:request-response', { to: currentCall.from, accepted: true });
    // The caller will send us an offer after receiving our acceptance
    // We wait for the offer in the onSignal handler
  }, []);

  // Reject an incoming call
  const rejectCall = useCallback(() => {
    const socket = socketService.getSocket();
    const currentCall = activeCallRef.current;
    if (!socket || !currentCall) return;
    
    console.log('[Call] Rejecting call from:', currentCall.from);
    setIsRinging(false);
    socket.emit('call:request-response', { to: currentCall.from, accepted: false });
    setActiveCall(null);
  }, []);

  // End an active call
  const endCall = useCallback(() => {
    const socket = socketService.getSocket();
    const currentCall = activeCallRef.current;
    if (socket && currentCall) {
      const target = currentCall.from || currentCall.targetSocketId;
      if (target) {
        socket.emit('call:end', { to: target });
      }
    }
    handleEndCall();
  }, [handleEndCall]);

  return (
    <CallContext.Provider value={{ 
      isRinging, isCalling, activeCall, 
      initiateCall, acceptCall, rejectCall, endCall,
      localStream, remoteStream
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
