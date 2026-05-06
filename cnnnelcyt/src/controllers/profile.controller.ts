import { Request, Response } from 'express';
import { query } from '../db';

// GET /api/profiles/search?q=...
export const searchProfiles = async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query;
  try {
    const result = await query(
      'SELECT id, name, avatar_url, role FROM profiles WHERE name ILIKE $1 LIMIT 20',
      [`%${q}%`]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[searchProfiles]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/profiles/status  { status: 'online' | 'offline' }
export const updateStatus = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { status } = req.body;
  try {
    await query(
      `UPDATE profiles SET status = $1, last_seen = NOW() WHERE id = $2`,
      [status || 'online', userId]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[updateStatus]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/profiles/:id/xp  – returns aggregate XP (challenge points used as XP proxy)
export const getUserXP = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    // 1. Challenge Points
    const challengeResult = await query(
      `SELECT COUNT(cs.challenge_id) as solved_count, COALESCE(SUM(cs.points), 0) as total_xp
       FROM challenge_solutions cs
       WHERE cs.user_id = $1`,
      [id]
    );
    const challengePoints = parseInt(challengeResult.rows[0]?.total_xp, 10) || 0;
    const solvedCount = parseInt(challengeResult.rows[0]?.solved_count, 10) || 0;

    // 2. Profile Completion Points (10 pts per filled field)
    const profileResult = await query(`SELECT * FROM profiles WHERE id = $1`, [id]);
    let profilePoints = 0;
    if (profileResult.rows.length > 0) {
      const p = profileResult.rows[0];
      const fields = [
        p.bio, p.college_name, p.course, p.job_role, 
        p.experience, p.education, p.skills, p.resume_url, 
        p.linkedin, p.github, p.portfolio
      ];
      
      fields.forEach(field => {
        // For strings or JSON arrays
        if (field && (typeof field === 'string' ? field.trim().length > 0 : true)) {
          // If it's a JSON string array like "[]", don't count it
          if (typeof field === 'string' && (field === '[]' || field === '{}')) return;
          profilePoints += 10;
        }
      });
      // 10 bonus points for having an actual avatar
      if (p.avatar_url && !p.avatar_url.includes('ui-avatars')) {
        profilePoints += 10;
      }
    }

    // 3. Post Creation Points (10 pts per post)
    const postsResult = await query(`SELECT COUNT(*) as count FROM posts WHERE user_id = $1`, [id]);
    const postsCount = parseInt(postsResult.rows[0]?.count, 10) || 0;
    const postPoints = postsCount * 10;

    // 4. Follower Points (5 pts per follower)
    const followersResult = await query(`SELECT COUNT(*) as count FROM user_connections WHERE following_id = $1`, [id]);
    const followersCount = parseInt(followersResult.rows[0]?.count, 10) || 0;
    const followerPoints = followersCount * 5;

    const totalXP = challengePoints + profilePoints + postPoints + followerPoints;

    res.status(200).json({
      xp: totalXP,
      solved: solvedCount,
      breakdown: {
        challenges: challengePoints,
        profile: profilePoints,
        posts: postPoints,
        followers: followerPoints
      }
    });
  } catch (error) {
    console.error('[getUserXP]', error);
    res.status(200).json({ xp: 0, solved: 0 });
  }
};

// GET /api/profiles/:id
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[getProfile]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/profiles/:id  or  PUT /api/profiles/update
export const updateProfile = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const {
    name, bio, avatar_url, status, last_seen,
    linkedin, github, portfolio, instagram,
    college_name, course, job_role, experience_years,
    experience, education, skills, resume_url, certificates,
    availability_status,
  } = req.body;

  try {
    const result = await query(
      `UPDATE profiles
       SET name               = COALESCE($1,  name),
           bio                = COALESCE($2,  bio),
           avatar_url         = COALESCE($3,  avatar_url),
           status             = COALESCE($4,  status),
           last_seen          = COALESCE($5,  last_seen),
           linkedin           = COALESCE($6,  linkedin),
           github             = COALESCE($7,  github),
           portfolio          = COALESCE($8,  portfolio),
           instagram          = COALESCE($9,  instagram),
           college_name       = COALESCE($10, college_name),
           course             = COALESCE($11, course),
           job_role           = COALESCE($12, job_role),
           experience_years   = COALESCE($13, experience_years),
           experience         = COALESCE($14, experience),
           education          = COALESCE($15, education),
           skills             = COALESCE($16, skills),
           resume_url         = COALESCE($17, resume_url),
           certificates       = COALESCE($18, certificates),
           availability_status = COALESCE($19, availability_status)
       WHERE id = $20
       RETURNING *`,
      [
        name !== undefined ? name : null,
        bio !== undefined ? bio : null,
        avatar_url !== undefined ? avatar_url : null,
        status !== undefined ? status : null,
        last_seen !== undefined ? last_seen : null,
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
      ]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[updateProfile]', error);
    res.status(500).json({ error: 'Server error' });
  }
};
