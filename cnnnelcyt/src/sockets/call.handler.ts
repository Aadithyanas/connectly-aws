import { Server, Socket } from 'socket.io';

export const setupCallHandlers = (io: Server, socket: Socket) => {
  
  // 1. INITIATE A CALL (With Permission Check)
  socket.on('call:initiate', async (data: { 
    to: string, 
    type: 'audio' | 'video',
    isGroup: boolean,
    callerInfo: { name: string, avatar?: string, role: string }
  }) => {
    const { to, callerInfo, isGroup } = data;

    // RULE: Group calls are ALWAYS direct (No request needed)
    if (isGroup) {
      socket.to(to).emit('call:group-incoming', {
        roomId: to,
        caller: callerInfo,
        type: data.type
      });
      return;
    }

    // Check Receiver Role (In a real app, you'd fetch this from DB/Cache)
    // For now, we expect the client to send the target's role for the permission check
    // or we assume the client knows if a request is needed.
    
    // LOGIC:
    // Prof -> Student: Direct
    // Others: Request
    
    // We'll emit an event back to the caller to tell them if they are "Ringing" or "Requesting"
    socket.to(to).emit('call:request', {
      from: socket.id, // Using socket.id for signaling, but usually user ID
      caller: callerInfo,
      type: data.type
    });
  });

  // 2. RESPOND TO REQUEST (Accept/Reject)
  socket.on('call:request-response', (data: { to: string, accepted: boolean }) => {
    socket.to(data.to).emit('call:request-result', {
      accepted: data.accepted,
      from: socket.id
    });
  });

  // 3. WEBRTC SIGNALING (The actual data transfer)
  socket.on('call:signal', (data: { to: string, signal: any }) => {
    socket.to(data.to).emit('call:signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // 4. HANG UP / DISCONNECT
  socket.on('call:end', (data: { to: string }) => {
    socket.to(data.to).emit('call:end');
  });

  socket.on('disconnect', () => {
    // Notify anyone in an active call with this user
    socket.broadcast.emit('call:user-disconnected', socket.id);
  });
};
