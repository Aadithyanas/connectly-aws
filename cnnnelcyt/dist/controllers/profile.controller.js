"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.getUserXP = exports.updateStatus = exports.searchProfiles = void 0;
const db_1 = require("../db");
// GET /api/profiles/search?q=...
const searchProfiles = async (req, res) => {
    const { q } = req.query;
    try {
        const result = await (0, db_1.query)('SELECT id, name, avatar_url, role FROM profiles WHERE name ILIKE $1 LIMIT 20', [`%${q}%`]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('[searchProfiles]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.searchProfiles = searchProfiles;
// POST /api/profiles/status  { status: 'online' | 'offline' }
const updateStatus = async (req, res) => {
    const userId = req.user.id;
    const { status } = req.body;
    try {
        await (0, db_1.query)(`UPDATE profiles SET status = $1, last_seen = NOW() WHERE id = $2`, [status || 'online', userId]);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[updateStatus]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateStatus = updateStatus;
// GET /api/profiles/:id/xp  – returns aggregate XP (challenge points used as XP proxy)
const getUserXP = async (req, res) => {
    const { id } = req.params;
    try {
        // Try to join with challenges table for accurate points, 
        // but fallback to just counting solutions if the table is missing
        const result = await (0, db_1.query)(`SELECT 
        COUNT(cs.challenge_id) as solved_count,
        COALESCE(SUM(cs.points), 0) as total_xp
       FROM challenge_solutions cs
       WHERE cs.user_id = $1`, [id]);
        const row = result.rows[0];
        res.status(200).json({
            xp: parseInt(row?.total_xp, 10) || 0,
            solved: parseInt(row?.solved_count, 10) || 0,
        });
    }
    catch (error) {
        console.error('[getUserXP]', error);
        res.status(200).json({ xp: 0, solved: 0 });
    }
};
exports.getUserXP = getUserXP;
// GET /api/profiles/:id
const getProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await (0, db_1.query)('SELECT * FROM profiles WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('[getProfile]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getProfile = getProfile;
// PUT /api/profiles/:id  or  PUT /api/profiles/update
const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { name, bio, avatar_url, status, last_seen, linkedin, github, portfolio, instagram, college_name, course, job_role, experience_years, experience, education, skills, resume_url, certificates, availability_status, } = req.body;
    try {
        // Build update query dynamically or use a direct mapping.
        // For simplicity and security (since we trust the body from our own middleware),
        // we use a direct update with fallback to existing values if field is undefined.
        const result = await (0, db_1.query)(`UPDATE profiles
       SET name               = $1,
           bio                = $2,
           avatar_url         = COALESCE($3,  avatar_url),
           status             = COALESCE($4,  status),
           last_seen          = COALESCE($5,  last_seen),
           linkedin           = $6,
           github             = $7,
           portfolio          = $8,
           instagram          = $9,
           college_name       = $10,
           course             = $11,
           job_role           = $12,
           experience_years   = $13,
           experience         = $14,
           education          = $15,
           skills             = $16,
           resume_url         = $17,
           certificates       = $18,
           availability_status = COALESCE($19, availability_status)
       WHERE id = $20
       RETURNING *`, [
            name !== undefined ? name : null,
            bio !== undefined ? bio : null,
            avatar_url ?? null,
            status ?? null,
            last_seen ?? null,
            linkedin !== undefined ? linkedin : null,
            github !== undefined ? github : null,
            portfolio !== undefined ? portfolio : null,
            instagram !== undefined ? instagram : null,
            college_name !== undefined ? college_name : null,
            course !== undefined ? course : null,
            job_role !== undefined ? job_role : null,
            experience_years !== undefined ? (experience_years === '' ? null : experience_years) : null,
            experience !== undefined ? (Array.isArray(experience) ? JSON.stringify(experience) : experience) : null,
            education !== undefined ? (Array.isArray(education) ? JSON.stringify(education) : education) : null,
            skills !== undefined ? (Array.isArray(skills) ? JSON.stringify(skills) : skills) : null,
            resume_url !== undefined ? resume_url : null,
            certificates !== undefined ? (Array.isArray(certificates) ? JSON.stringify(certificates) : certificates) : null,
            availability_status !== undefined ? availability_status : null,
            userId,
        ]);
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('[updateProfile]', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
