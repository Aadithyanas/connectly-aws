"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFollowing = exports.getFollowers = exports.getConnections = exports.unfollowUser = exports.followUser = void 0;
const db_1 = require("../db");
const followUser = async (req, res) => {
    const followerId = req.user.id;
    const { followingId } = req.body;
    try {
        await (0, db_1.query)('INSERT INTO user_connections (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [followerId, followingId]);
        res.status(200).json({ success: true, following: true });
    }
    catch (error) {
        console.error('[followUser]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.followUser = followUser;
const unfollowUser = async (req, res) => {
    const followerId = req.user.id;
    const { followingId } = req.body;
    try {
        await (0, db_1.query)('DELETE FROM user_connections WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
        res.status(200).json({ success: true, following: false });
    }
    catch (error) {
        console.error('[unfollowUser]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.unfollowUser = unfollowUser;
// GET /api/connections/:userId  — counts + is-following check (used by useConnections hook)
const getConnections = async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    try {
        const followers = await (0, db_1.query)(`SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.follower_id = p.id
       WHERE uc.following_id = $1`, [userId]);
        const following = await (0, db_1.query)(`SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.following_id = p.id
       WHERE uc.follower_id = $1`, [userId]);
        res.status(200).json({
            followers: followers.rows,
            following: following.rows,
            // Convenience: is the calling user following this profile?
            isFollowing: currentUserId
                ? followers.rows.some((r) => r.id === currentUserId)
                : false,
        });
    }
    catch (error) {
        console.error('[getConnections]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getConnections = getConnections;
// GET /api/connections/:userId/followers  — full list for ConnectionsModal
const getFollowers = async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await (0, db_1.query)(`SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.follower_id = p.id
       WHERE uc.following_id = $1
       ORDER BY uc.created_at DESC`, [userId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('[getFollowers]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getFollowers = getFollowers;
// GET /api/connections/:userId/following  — full list for ConnectionsModal
const getFollowing = async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await (0, db_1.query)(`SELECT p.id, p.name, p.avatar_url, p.bio, p.role
       FROM user_connections uc
       JOIN profiles p ON uc.following_id = p.id
       WHERE uc.follower_id = $1
       ORDER BY uc.created_at DESC`, [userId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('[getFollowing]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getFollowing = getFollowing;
