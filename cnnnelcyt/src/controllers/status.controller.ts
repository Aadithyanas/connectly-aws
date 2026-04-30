import { Request, Response } from 'express';
import { query } from '../db';

export const createStatus = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { content, media_url, media_type, privacy_type, expires_at } = req.body;
  try {
    const result = await query(
      'INSERT INTO statuses (user_id, content, media_url, media_type, privacy_type, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, content, media_url, media_type, privacy_type, expires_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStatusFeed = async (req: any, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT s.*, p.name as author_name, p.avatar_url as author_avatar,
              (SELECT COUNT(*) FROM status_views sv WHERE sv.status_id = s.id AND sv.viewer_id != s.user_id) as impressions_count
       FROM statuses s
       JOIN profiles p ON s.user_id = p.id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[getStatusFeed]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const viewStatus = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    // Don't record view if viewer is the author
    const statusOwnership = await query('SELECT user_id FROM statuses WHERE id = $1', [id]);
    if (statusOwnership.rows.length > 0 && statusOwnership.rows[0].user_id === userId) {
      res.status(200).json({ success: true, message: 'Owner view not recorded' });
      return;
    }

    await query(
      'INSERT INTO status_views (status_id, viewer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, userId]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteStatus = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM statuses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: 'Not authorized or status not found' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStatusViewers = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    // Only the owner can see viewers
    const ownership = await query('SELECT user_id FROM statuses WHERE id = $1', [id]);
    if (ownership.rows.length === 0) {
      res.status(404).json({ error: 'Status not found' });
      return;
    }
    if (ownership.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    const result = await query(
      `SELECT sv.viewed_at, p.id, p.name, p.avatar_url
       FROM status_views sv
       JOIN profiles p ON sv.viewer_id = p.id
       JOIN statuses s ON s.id = sv.status_id
       WHERE sv.status_id = $1 AND sv.viewer_id != s.user_id
       ORDER BY sv.viewed_at DESC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
