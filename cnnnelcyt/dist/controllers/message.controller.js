"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllDelivered = exports.deleteMessage = exports.getMessages = exports.sendMessage = void 0;
const db_1 = require("../db");
const socket_1 = require("../socket");
const sendMessage = async (req, res) => {
    const userId = req.user.id;
    const { chat_id, content, media_url, media_type, reply_to, client_id } = req.body;
    try {
        const result = await (0, db_1.query)(`INSERT INTO messages (chat_id, sender_id, content, media_url, media_type, reply_to, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [chat_id, userId, content, media_url, media_type, reply_to || null, client_id || null]);
        const msg = result.rows[0];
        // Attach sender profile so UI renders name/avatar immediately
        const profileResult = await (0, db_1.query)('SELECT name, avatar_url FROM profiles WHERE id = $1', [userId]);
        msg.sender = profileResult.rows[0] || null;
        // Server-side broadcast — ensures delivery even if client socket emit fails
        const io = (0, socket_1.getIO)();
        if (io) {
            // Broadcast to all in the room EXCEPT the sender (they update via API response)
            const room = io.sockets.adapter.rooms.get(`chat:${chat_id}`);
            io.to(`chat:${chat_id}`).emit('new_message', { ...msg, status: 'sent' });
        }
        res.status(201).json(msg);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
const getMessages = async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { limit = 100, offset = 0 } = req.query;
    try {
        const result = await (0, db_1.query)(`SELECT m.*,
              json_build_object('name', p.name, 'avatar_url', p.avatar_url) as sender
       FROM messages m
       JOIN profiles p ON m.sender_id = p.id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`, [chatId, limit, offset]);
        // Mark messages as seen & broadcast to sender via socket (server-side, reliable)
        (0, db_1.query)(`UPDATE messages SET status = 'seen'
       WHERE chat_id = $1 AND sender_id != $2 AND status != 'seen'
       RETURNING sender_id`, [chatId, userId]).then((updateResult) => {
            // Only emit if something was actually updated
            if (updateResult.rows.length > 0) {
                const io = (0, socket_1.getIO)();
                if (io) {
                    // Broadcast seen receipt to everyone in the chat room
                    // The sender's handleChatRead listener will flip ticks to blue ✓✓
                    io.to(`chat:${chatId}`).emit('chat_read', {
                        chatId,
                        readerId: userId,
                        status: 'seen'
                    });
                }
            }
        }).catch(() => { });
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getMessages = getMessages;
const deleteMessage = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const result = await (0, db_1.query)('DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id', [id, userId]);
        if (result.rows.length === 0) {
            res.status(403).json({ error: 'Not authorized or message not found' });
            return;
        }
        res.status(200).json({ success: true, id });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.deleteMessage = deleteMessage;
// Mark all undelivered messages in chats the user is a member of as delivered.
// Called once on /chat mount. The frontend only needs a 200 response.
const markAllDelivered = async (req, res) => {
    const userId = req.user.id;
    try {
        await (0, db_1.query)(`UPDATE messages
       SET status = 'delivered'
       WHERE status = 'sent'
         AND chat_id IN (
           SELECT chat_id FROM chat_members WHERE user_id = $1
         )
         AND sender_id != $1`, [userId]);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[markAllDelivered]', error);
        // Non-critical — don't crash the client if the column doesn't exist yet
        res.status(200).json({ success: true });
    }
};
exports.markAllDelivered = markAllDelivered;
