import { Request, Response } from 'express';
import { query } from '../db';

// POST /api/posts/create  OR  POST /api/posts/
export const createPost = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { title, content, media_urls, media_types, category } = req.body;
  
  // Debug log for checking incoming data
  console.log('--- NEW POST CREATION ---');
  console.log('User ID:', userId);
  console.log('Title:', title);
  console.log('Content snippet:', content?.substring(0, 50));
  console.log('Media URLs:', media_urls);
  console.log('Media Types:', media_types);

  // Normalize media arrays
  const finalUrls = Array.isArray(media_urls) ? media_urls : (media_urls ? [media_urls] : []);
  const finalTypes = Array.isArray(media_types) ? media_types : (media_types ? [media_types] : []);

  try {
    const result = await query(
      `INSERT INTO posts (user_id, title, content, media_urls, media_types)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, title, content, finalUrls, finalTypes]
    );
    console.log('Post created successfully, ID:', result.rows[0].id);
    res.status(201).json({ post: result.rows[0] });
  } catch (error) {
    console.error('[createPost]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/posts/feed
export const getFeed = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { limit = 20, offset = 0, filterUserId, filterRole } = req.query;
  try {
    const params: any[] = [userId, limit, offset];
    let extraWhere = '';
    if (filterUserId) {
      params.push(filterUserId);
      extraWhere += ` AND p.user_id = $${params.length}`;
    }
    if (filterRole) {
      params.push(filterRole);
      extraWhere += ` AND prof.role = $${params.length}`;
    }

    const result = await query(
      `SELECT
         p.*,
         prof.name as author_name,
         prof.avatar_url as author_avatar,
         prof.role as author_role,
         (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
         (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
         EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked
       FROM posts p
       JOIN profiles prof ON p.user_id = prof.id
       WHERE 1=1 ${extraWhere}
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const formatted = result.rows.map(row => ({
      ...row,
      media_urls: row.media_urls || [],
      media_types: row.media_types || [],
      likes_count: parseInt(row.likes_count, 10) || 0,
      comments_count: parseInt(row.comments_count, 10) || 0,
      user: {
        name: row.author_name,
        avatar_url: row.author_avatar,
        role: row.author_role || 'user',
      }
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('[getFeed]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/posts/check-new?since=<ISO>
export const checkNewPosts = async (req: any, res: Response): Promise<void> => {
  const { since } = req.query;
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM posts WHERE created_at > $1`,
      [since || new Date().toISOString()]
    );
    res.status(200).json({ count: parseInt(result.rows[0].count, 10) || 0 });
  } catch (error) {
    console.error('[checkNewPosts]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/posts/:id/comments
export const getComments = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT c.*, p.name as author_name, p.avatar_url as author_avatar
       FROM post_comments c
       JOIN profiles p ON c.user_id = p.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    const formatted = result.rows.map(row => ({
      ...row,
      user: { name: row.author_name, avatar_url: row.author_avatar }
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('[getComments]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/posts/:id/like  (toggle)
export const likePost = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const existing = await query(
      'SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (existing.rows.length > 0) {
      await query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, userId]);
      res.status(200).json({ liked: false });
    } else {
      await query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [id, userId]);
      res.status(200).json({ liked: true });
    }
  } catch (error) {
    console.error('[likePost]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/posts/:id/comment
export const commentPost = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  const { content, reply_to_id } = req.body;
  try {
    const result = await query(
      'INSERT INTO post_comments (post_id, user_id, content, reply_to_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, content, reply_to_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[commentPost]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/posts/:id
export const updatePost = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  const { content, media_urls, media_types } = req.body;
  try {
    const result = await query(
      `UPDATE posts SET content = COALESCE($1, content), media_urls = COALESCE($2, media_urls), media_types = COALESCE($3, media_types)
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [content, media_urls, media_types, id, userId]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: 'Not authorized or post not found' });
      return;
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[updatePost]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/posts/:id
export const deletePost = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: 'Not authorized or post not found' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[deletePost]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/posts/user/:userId  – grid of posts for a specific user (InfoSidebar)
export const getUserPosts = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { limit = 9 } = req.query;
  try {
    const result = await query(
      `SELECT id, media_urls, media_types, created_at FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    const formatted = result.rows.map(row => ({
      ...row,
      media_urls: row.media_urls || [],
      media_types: row.media_types || [],
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('[getUserPosts]', error);
    res.status(500).json({ error: 'Server error' });
  }
};
