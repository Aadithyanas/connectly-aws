import { Server, Socket } from 'socket.io';
import { sendPushNotification } from '../utils/push';
import { query } from '../db';

// Track active call pairs: socketId -> partnerSocketId
const activeCallPairs = new Map<string, string>();

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

      // Send push notifications to all group members
      try {
        const membersResult = await query(
          'SELECT user_id FROM chat_members WHERE chat_id = $1',
          [to]
        );
        for (const row of membersResult.rows) {
          sendPushNotification(row.user_id, {
            title: 'Group Call',
            body: `${callerInfo.name} started a group ${data.type} call`,
            type: 'call',
            caller: callerInfo,
            url: '/chat'
          }).catch(err => console.error('[Call] Group push error:', err));
        }
      } catch (err) {
        console.error('[Call] Error sending group push notifications:', err);
      }
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
      body: `${callerInfo.name} is ${data.type === 'video' ? 'video' : ''} calling you`,
      type: 'call',
      caller: callerInfo,
      url: '/chat'
    }).catch(err => console.error('[Call] Push error:', err));
  });

  // 2. RESPOND TO REQUEST (Accept/Reject)
  socket.on('call:request-response', (data: { to: string, accepted: boolean }) => {
    console.log(`[Call] Request response from ${socket.id} to ${data.to}: ${data.accepted ? 'ACCEPTED' : 'REJECTED'}`);
    
    if (data.accepted) {
      // Track the call pair
      activeCallPairs.set(socket.id, data.to);
      activeCallPairs.set(data.to, socket.id);
    }
    
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
    console.log(`[Call] End from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit('call:end');
    
    // Clean up call pair tracking
    activeCallPairs.delete(socket.id);
    activeCallPairs.delete(data.to);
  });

  socket.on('disconnect', () => {
    // Only notify the call partner, not all users
    const partnerId = activeCallPairs.get(socket.id);
    if (partnerId) {
      console.log(`[Call] User ${socket.id} disconnected, notifying partner ${partnerId}`);
      io.to(partnerId).emit('call:user-disconnected', socket.id);
      activeCallPairs.delete(socket.id);
      activeCallPairs.delete(partnerId);
    }
  });
};
