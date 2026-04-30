import { Request, Response } from 'express';
import { query } from '../db';

export const followUser = async (req: any, res: Response): Promise<void> => {
  const followerId = req.user.id;
  const { followingId } = req.body;
  try {
    await query(
      'INSERT INTO user_connections (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followingId]
    );
    res.status(200).json({ success: true, following: true });
  } catch (error) {
    console.error('[followUser]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const unfollowUser = async (req: any, res: Response): Promise<void> => {
  const followerId = req.user.id;
  const { followingId } = req.body;
  try {
    await query(
      'DELETE FROM user_connections WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    res.status(200).json({ success: true, following: false });
  } catch (error) {
    console.error('[unfollowUser]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/connections/:userId  — counts + is-following check (used by useConnections hook)
export const getConnections = async (req: any, res: Response): Promise<void> => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;
  try {
    const followers = await query(
      `SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.follower_id = p.id
       WHERE uc.following_id = $1`,
      [userId]
    );
    const following = await query(
      `SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.following_id = p.id
       WHERE uc.follower_id = $1`,
      [userId]
    );
    res.status(200).json({
      followers: followers.rows,
      following: following.rows,
      // Convenience: is the calling user following this profile?
      isFollowing: currentUserId
        ? followers.rows.some((r: any) => r.id === currentUserId)
        : false,
    });
  } catch (error) {
    console.error('[getConnections]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/connections/:userId/followers  — full list for ConnectionsModal
export const getFollowers = async (req: any, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const result = await query(
      `SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.follower_id = p.id
       WHERE uc.following_id = $1
       ORDER BY uc.created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[getFollowers]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/connections/:userId/following  — full list for ConnectionsModal
export const getFollowing = async (req: any, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const result = await query(
      `SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.following_id = p.id
       WHERE uc.follower_id = $1
       ORDER BY uc.created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[getFollowing]', error);
    res.status(500).json({ error: 'Server error' });
  }
};
