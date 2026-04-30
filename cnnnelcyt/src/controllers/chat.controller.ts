import { Request, Response } from 'express';
import { query } from '../db';

export const getPublicChats = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT 
        c.id, c.name, c.description, c.avatar_url, c.is_group, c.is_public, c.cover_url, c.created_at,
        (SELECT json_agg(json_build_object(
          'user_id', cm2.user_id,
          'status', cm2.status,
          'avatar_url', p2.avatar_url
        )) FROM chat_members cm2
           JOIN profiles p2 ON cm2.user_id = p2.id
           WHERE cm2.chat_id = c.id) as chat_members,
        (SELECT cm3.status FROM chat_members cm3 WHERE cm3.chat_id = c.id AND cm3.user_id = $1 LIMIT 1) as "myStatus"
       FROM chats c
       WHERE c.is_public = true AND c.is_group = true
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getChatById = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.avatar_url, 
        c.is_group,
        c.created_at,
        (SELECT json_agg(json_build_object(
          'id', p.id, 
          'name', p.name, 
          'avatar_url', p.avatar_url,
          'role', p.role,
          'status', p.status,
          'last_seen', p.last_seen
        )) FROM chat_members cm2 
           JOIN profiles p ON cm2.user_id = p.id 
           WHERE cm2.chat_id = c.id) as members
       FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE c.id = $1 AND cm.user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Chat not found or access denied' });
      return;
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchChat = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, description, avatar_url, cover_url, is_public } = req.body;
  try {
    // Only members can update (admin check is loose for now)
    const memberCheck = await query(
      'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      res.status(403).json({ error: 'Not a member of this chat' });
      return;
    }
    await query(
      `UPDATE chats SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        avatar_url = COALESCE($3, avatar_url),
        cover_url = COALESCE($4, cover_url),
        is_public = COALESCE($5, is_public)
       WHERE id = $6`,
      [name ?? null, description ?? null, avatar_url ?? null, cover_url ?? null, is_public ?? null, id]
    );
    const updated = await query('SELECT * FROM chats WHERE id = $1', [id]);
    res.status(200).json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addMember = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { userId, status = 'joined' } = req.body;
  try {
    await query(
      `INSERT INTO chat_members (chat_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', NOW())
       ON CONFLICT (chat_id, user_id) DO UPDATE SET role = 'member'`,
      [id, userId]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createChat = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { name, description, avatar_url, is_group, memberIds } = req.body;
  
  try {
    // If it's a DM, check if one already exists between the two users
    if (is_group === false && memberIds && memberIds.length === 1) {
      const otherUserId = memberIds[0];
      const existingDM = await query(
        `SELECT c.id FROM chats c
         JOIN chat_members cm1 ON c.id = cm1.chat_id
         JOIN chat_members cm2 ON c.id = cm2.chat_id
         WHERE c.is_group = false 
         AND cm1.user_id = $1 AND cm2.user_id = $2`,
        [userId, otherUserId]
      );
      if (existingDM.rows.length > 0) {
        res.status(200).json({ id: existingDM.rows[0].id, name, is_group });
        return;
      }
    }

    // Start transaction
    await query('BEGIN');
    
    const chatResult = await query(
      'INSERT INTO chats (name, description, avatar_url, is_group) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, description, avatar_url, is_group]
    );
    const chatId = chatResult.rows[0].id;

    // Add creator as admin
    await query('INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)', [chatId, userId, 'admin']);

    // Add other members
    if (memberIds && Array.isArray(memberIds)) {
      for (const id of memberIds) {
        if (id !== userId) {
          await query('INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)', [chatId, id, 'member']);
        }
      }
    }

    await query('COMMIT');
    res.status(201).json({ id: chatId, name, is_group });
  } catch (error) {
    await query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getChats = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  try {
    // This query fetches chats the user is a member of, 
    // along with the last message and other member profiles (for DMs)
    const result = await query(
      `SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.avatar_url, 
        c.is_group,
        c.created_at,
        (SELECT json_build_object(
          'content', m.content, 
          'created_at', m.created_at,
          'sender_id', m.sender_id
        ) FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT json_agg(json_build_object(
          'id', p.id, 
          'name', p.name, 
          'avatar_url', p.avatar_url,
          'role', p.role,
          'status', p.status,
          'last_seen', p.last_seen
        )) FROM chat_members cm2 
           JOIN profiles p ON cm2.user_id = p.id 
           WHERE cm2.chat_id = c.id) as members,
        (SELECT COUNT(*) FROM messages m2
           WHERE m2.chat_id = c.id
           AND m2.sender_id != $1
           AND m2.status != 'seen') as unread_count
       FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getChatMembers = async (req: any, res: Response): Promise<void> => {
  const chatId = req.params.id;
  try {
    const result = await query(
      `SELECT p.id, p.name, p.avatar_url, p.bio, p.job_role, p.college_name,
              p.status, p.last_seen, cm.role, cm.joined_at 
       FROM chat_members cm
       JOIN profiles p ON cm.user_id = p.id
       WHERE cm.chat_id = $1
       ORDER BY cm.joined_at ASC`,
      [chatId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const removeMember = async (req: any, res: Response): Promise<void> => {
  const { id, userId } = req.params;
  const currentUserId = req.user.id;
  
  try {
    // Only allow users to remove themselves, or admins to remove others (admin check not implemented yet)
    if (userId !== currentUserId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [id, userId]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateMemberStatus = async (req: any, res: Response): Promise<void> => {
  const { id, userId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user.id;

  try {
    if (userId !== currentUserId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await query('UPDATE chat_members SET status = $1 WHERE chat_id = $2 AND user_id = $3', [status, id, userId]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
