import { Server, Socket } from 'socket.io';
import { sendPushNotification } from '../utils/push';

export const setupCallHandlers = (io: Server, socket: Socket) => {
  
  // 1. INITIATE A CALL (With Permission Check)
  socket.on('call:initiate', async (data: { 
    to: string, 
    type: 'audio' | 'video',
    isGroup: boolean,
    callerInfo: { name: string, avatar?: string, role: string }
  }) => {
    const { to, callerInfo, isGroup } = data;
    console.log(`[Call] Initiate request from ${socket.id} to user ${to} (isGroup: ${isGroup})`);

    // RULE: Group calls are ALWAYS direct (No request needed)
    if (isGroup) {
      console.log(`[Call] Sending group-incoming to chat:${to}`);
      socket.to(`chat:${to}`).emit('call:group-incoming', {
        roomId: to,
        caller: callerInfo,
        type: data.type
      });
      return;
    }

    // Emit to the target user's presence room
    console.log(`[Call] Sending call:request to presence:${to}`);
    socket.to(`presence:${to}`).emit('call:request', {
      from: socket.id, 
      caller: callerInfo,
      type: data.type
    });

    // Send Web Push Notification for incoming call (wakes up phone/service worker)
    sendPushNotification(to, {
      title: 'Incoming Call',
      body: `${callerInfo.name} is video calling you`,
      type: 'call',
      caller: callerInfo,
      url: '/calls'
    }).catch(err => console.error('[Call] Push error:', err));
  });

  // 2. RESPOND TO REQUEST (Accept/Reject)
  socket.on('call:request-response', (data: { to: string, accepted: boolean }) => {
    console.log(`[Call] Request response from ${socket.id} to ${data.to}: ${data.accepted ? 'ACCEPTED' : 'REJECTED'}`);
    socket.to(data.to).emit('call:request-result', {
      accepted: data.accepted,
      from: socket.id
    });
  });

  // 3. WEBRTC SIGNALING (The actual data transfer)
  socket.on('call:signal', (data: { to: string, signal: any }) => {
    // console.log(`[Call] Signaling from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit('call:signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // 4. HANG UP / DISCONNECT
  socket.on('call:end', (data: { to: string }) => {
    console.log(`[Call] End from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit('call:end');
  });

  socket.on('disconnect', () => {
    // Notify anyone in an active call with this user
    socket.broadcast.emit('call:user-disconnected', socket.id);
  });
};
