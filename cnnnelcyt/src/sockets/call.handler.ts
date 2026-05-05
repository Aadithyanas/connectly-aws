import { Server, Socket } from 'socket.io';
import { sendPushNotification } from '../utils/push';
import { query } from '../db';
import { getIO } from '../socket';

// Track active call pairs: socketId -> partnerSocketId
const activeCallPairs = new Map<string, string>();

// Track pending calls: userId -> call data (so we can re-emit when user reconnects)
const pendingCalls = new Map<string, {
  from: string,
  caller: { id?: string, name: string, avatar?: string, role: string },
  type: 'audio' | 'video',
  timestamp: number,
  isGroup: boolean
}>();

// Helper to record missed calls in the database and broadcast to chat
async function recordMissedCall(userId: string, call: any) {
  if (!call.caller?.id) return; // Need DB id of the caller

  let chatId = userId;
  if (!call.isGroup) {
    try {
      // Find the 1:1 chat between caller and callee
      const res = await query(`
        SELECT c1.chat_id 
        FROM chat_members c1 
        JOIN chat_members c2 ON c1.chat_id = c2.chat_id 
        JOIN chats c ON c.id = c1.chat_id
        WHERE c1.user_id = $1 AND c2.user_id = $2 AND c.is_group = false
        LIMIT 1
      `, [call.caller.id, userId]);
      if (res.rows.length) {
        chatId = res.rows[0].chat_id;
      } else {
        return; // Chat not found
      }
    } catch (e) {
      console.error('[Call] Error finding chat for missed call:', e);
      return;
    }
  }

  const content = call.type === 'video' ? '📹 Missed video call' : '📞 Missed audio call';

  try {
    const msgRes = await query(
      `INSERT INTO messages (chat_id, sender_id, content, media_type) VALUES ($1, $2, $3, 'system') RETURNING *`,
      [chatId, call.caller.id, content]
    );
    const msg = msgRes.rows[0];

    msg.sender = { name: call.caller.name, avatar_url: call.caller.avatar };

    const io = getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit('new_message', { ...msg, status: 'sent' });
    }
  } catch (e) {
    console.error('[Call] Error recording missed call:', e);
  }
}

// Clean up expired pending calls (older than 45 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [userId, call] of pendingCalls.entries()) {
    if (now - call.timestamp > 45000) {
      console.log(`[Call] Pending call timed out for user ${userId}, recording missed call`);
      recordMissedCall(userId, call);
      pendingCalls.delete(userId);
    }
  }
}, 10000);

export const setupCallHandlers = (io: Server, socket: Socket) => {
  
  // When a user joins presence, check if there's a pending call for them
  // This handles the case where the user opened the app from a push notification
  socket.on('join_presence', (userId: string) => {
    const pending = pendingCalls.get(userId);
    if (pending && (Date.now() - pending.timestamp < 45000)) {
      console.log(`[Call] Re-emitting pending call to reconnected user ${userId}`);
      socket.emit('call:request', {
        from: pending.from,
        caller: pending.caller,
        type: pending.type
      });
      // Don't delete — let it stay until answered/rejected/expired
    }
  });

  // 1. INITIATE A CALL (With Permission Check)
  socket.on('call:initiate', async (data: { 
    to: string, 
    type: 'audio' | 'video',
    isGroup: boolean,
    callerInfo: { id?: string, name: string, avatar?: string, role: string }
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
          'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id != $2',
          [to, callerInfo.id]
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

    // Store as pending call (so we can re-emit if user opens app from notification)
    pendingCalls.set(to, {
      from: socket.id,
      caller: callerInfo,
      type: data.type,
      timestamp: Date.now(),
      isGroup
    });

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
    
    // Clear pending call for this user, because they responded!
    for (const [userId, call] of pendingCalls.entries()) {
      if (call.from === data.to) {
        pendingCalls.delete(userId); // They answered or rejected, NOT a missed call.
        break;
      }
    }

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

    // If caller explicitly hung up before callee answered (still in pendingCalls)
    // -> Treat as missed call.
    for (const [userId, call] of pendingCalls.entries()) {
      if (call.from === socket.id || call.from === data.to) {
        console.log(`[Call] Caller hung up, recording missed call for ${userId}`);
        recordMissedCall(userId, call);
        pendingCalls.delete(userId);
      }
    }
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

    // Clear any pending calls FROM this caller (they hung up/disconnected)
    for (const [userId, call] of pendingCalls.entries()) {
      if (call.from === socket.id) {
        console.log(`[Call] Disconnected caller, recording missed call for ${userId}`);
        recordMissedCall(userId, call);
        pendingCalls.delete(userId);
      }
    }
  });
};
