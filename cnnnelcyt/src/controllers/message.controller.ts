import { Request, Response } from 'express';
import { query } from '../db';
import { getIO } from '../socket';

export const sendMessage = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { chat_id, content, media_url, media_type, reply_to, client_id, forwarded } = req.body;

  try {
    const result = await query(
      `INSERT INTO messages (chat_id, sender_id, content, media_url, media_type, reply_to, client_id, forwarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [chat_id, userId, content, media_url, media_type, reply_to || null, client_id || null, !!forwarded]
    );
    const msg = result.rows[0];

    // Attach sender profile so UI renders name/avatar immediately
    const profileResult = await query(
      'SELECT name, avatar_url FROM profiles WHERE id = $1',
      [userId]
    );
    msg.sender = profileResult.rows[0] || null;
    
    // Attach reply info if this is a reply
    if (msg.reply_to) {
      const replyResult = await query(
        `SELECT m.content, p.name as "senderName", m.sender_id
         FROM messages m
         JOIN profiles p ON m.sender_id = p.id
         WHERE m.id = $1`,
        [msg.reply_to]
      );
      if (replyResult.rows.length > 0) {
        msg.reply = replyResult.rows[0];
      }
    }

    // Server-side broadcast — ensures delivery even if client socket emit fails
    const io = getIO();
    if (io) {
      // Broadcast to all in the room
      io.to(`chat:${chat_id}`).emit('new_message', { ...msg, status: 'sent' });
    }

    res.status(201).json(msg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMessages = async (req: any, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { limit = 100, offset = 0 } = req.query;
  try {
    // Subquery to get the latest N messages, then sort them chronologically for the UI
    const result = await query(
      `SELECT * FROM (
        SELECT m.*,
                json_build_object('name', p.name, 'avatar_url', p.avatar_url) as sender,
                CASE WHEN m.reply_to IS NOT NULL THEN 
                  json_build_object(
                    'id', rm.id,
                    'content', rm.content,
                    'sender_id', rm.sender_id,
                    'senderName', rp.name
                  )
                ELSE NULL END as reply
        FROM messages m
        JOIN profiles p ON m.sender_id = p.id
        LEFT JOIN messages rm ON m.reply_to = rm.id
        LEFT JOIN profiles rp ON rm.sender_id = rp.id
        WHERE m.chat_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      ) sub
      ORDER BY created_at ASC`,
      [chatId, limit, offset]
    );
    // Mark messages as seen & broadcast to sender via socket (server-side, reliable)
    query(
      `UPDATE messages SET status = 'seen'
       WHERE chat_id = $1 AND sender_id != $2 AND status != 'seen'
       RETURNING sender_id`,
      [chatId, userId]
    ).then((updateResult) => {
      // Only emit if something was actually updated
      if (updateResult.rows.length > 0) {
        const io = getIO();
        if (io) {
          // Broadcast seen receipt to everyone in the chat room
          io.to(`chat:${chatId}`).emit('chat_read', {
            chatId,
            readerId: userId,
            status: 'seen'
          });
        }
      }
    }).catch(() => {});
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteMessage = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: 'Not authorized or message not found' });
      return;
    }
    res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark all undelivered messages in chats the user is a member of as delivered.
// Called once on /chat mount. The frontend only needs a 200 response.
export const markAllDelivered = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  try {
    // Update DB and return which chats were affected so we can emit per-chat
    const result = await query(
      `UPDATE messages
       SET status = 'delivered'
       WHERE status = 'sent'
         AND chat_id IN (
           SELECT chat_id FROM chat_members WHERE user_id = $1
         )
         AND sender_id != $1
       RETURNING chat_id`,
      [userId]
    );

    // Emit chat_read 'delivered' to each affected chat room so senders see double-tick in real-time
    if (result.rows.length > 0) {
      const io = getIO();
      if (io) {
        // Deduplicate chat IDs
        const chatIds = [...new Set(result.rows.map((r: any) => r.chat_id))];
        chatIds.forEach((chatId: any) => {
          io.to(`chat:${chatId}`).emit('chat_read', {
            chatId,
            readerId: userId,
            status: 'delivered'
          });
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[markAllDelivered]', error);
    // Non-critical — don't crash the client if the column doesn't exist yet
    res.status(200).json({ success: true });
  }
};
