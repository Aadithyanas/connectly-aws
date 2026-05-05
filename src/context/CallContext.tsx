'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { socketService } from '@/utils/socket';
const socket = socketService.getSocket();
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface CallContextType {
  isRinging: boolean;
  isCalling: boolean;
  activeCall: any | null;
  initiateCall: (to: string, type: 'audio' | 'video', isGroup?: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const [isRinging, setIsRinging] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming call requests
    socket.on('call:request', (data: any) => {
      setActiveCall(data);
      setIsRinging(true);
      // Play ringtone logic here
    });

    // Listen for direct incoming calls
    socket.on('call:incoming', (data: any) => {
      setActiveCall(data);
      setIsRinging(true);
    });

    // Listen for request response
    socket.on('call:request-result', (data: { accepted: boolean }) => {
      if (data.accepted) {
        toast.success('Call request accepted!');
        startSignaling();
      } else {
        toast.error('Call request rejected.');
        setIsCalling(false);
        setActiveCall(null);
      }
    });

    // Listen for signaling
    socket.on('call:signal', async (data: any) => {
      if (!peerConnection.current) return;
      // Handle WebRTC signaling here...
    });

    socket.on('call:end', () => {
      handleEndCall();
    });

    return () => {
      socket.off('call:request');
      socket.off('call:incoming');
      socket.off('call:request-result');
      socket.off('call:signal');
      socket.off('call:end');
    };
  }, []);

  const initiateCall = (to: string, type: 'audio' | 'video', isGroup = false) => {
    setIsCalling(true);
    socket.emit('call:initiate', {
      to,
      type,
      isGroup,
      callerInfo: { 
        name: user?.user_metadata?.full_name || user?.email || 'Someone', 
        role: user?.user_metadata?.role || 'student' 
      }
    });
  };

  const acceptCall = () => {
    setIsRinging(false);
    socket.emit('call:request-response', { to: activeCall.from, accepted: true });
    startSignaling();
  };

  const rejectCall = () => {
    setIsRinging(false);
    socket.emit('call:request-response', { to: activeCall.from, accepted: false });
    setActiveCall(null);
  };

  const startSignaling = () => {
    // WebRTC initialization logic...
  };

  const handleEndCall = () => {
    setIsRinging(false);
    setIsCalling(false);
    setActiveCall(null);
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  const endCall = () => {
    if (activeCall) {
      socket.emit('call:end', { to: activeCall.from });
    }
    handleEndCall();
  };

  return (
    <CallContext.Provider value={{ isRinging, isCalling, activeCall, initiateCall, acceptCall, rejectCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
