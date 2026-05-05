'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const [isRinging, setIsRinging] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [socket, setSocket] = useState<any>(null);
  
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { user } = useAuth();

  // Safe Socket Initialization (SSR Safe)
  useEffect(() => {
    const s = socketService.getSocket();
    setSocket(s);

    s.on('call:request', (data: any) => {
      setActiveCall(data);
      setIsRinging(true);
    });

    s.on('call:group-incoming', (data: any) => {
      setActiveCall(data);
      setIsRinging(true);
    });

    s.on('call:request-result', (data: { accepted: boolean }) => {
      if (data.accepted) {
        toast.success('Call request accepted!');
        startSignaling();
      } else {
        toast.error('Call request rejected.');
        setIsCalling(false);
        setActiveCall(null);
      }
    });

    s.on('call:end', () => {
      handleEndCall();
    });

    return () => {
      s.off('call:request');
      s.off('call:group-incoming');
      s.off('call:request-result');
      s.off('call:end');
    };
  }, []);

  const initiateCall = (to: string, type: 'audio' | 'video', isGroup = false, targetName = 'User') => {
    if (!socket) return;
    
    setIsCalling(true);
    // Set active call info for the CALLER so UI shows the correct name
    setActiveCall({
      caller: { name: targetName },
      type
    });

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
    if (!socket || !activeCall) return;
    setIsRinging(false);
    socket.emit('call:request-response', { to: activeCall.from, accepted: true });
    startSignaling();
  };

  const rejectCall = () => {
    if (!socket || !activeCall) return;
    setIsRinging(false);
    socket.emit('call:request-response', { to: activeCall.from, accepted: false });
    setActiveCall(null);
  };

  const startSignaling = () => {
    // Signaling logic...
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
      peerConnection.current = null;
    }
  };

  const endCall = () => {
    if (socket && activeCall) {
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
