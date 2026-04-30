import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET /api/challenges/solutions — get all challenges solved by the current user
router.get('/solutions', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT challenge_id, language, solved_at FROM challenge_solutions WHERE user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[challenges/solutions]', error);
    res.status(200).json([]); // Graceful fallback
  }
});

// POST /api/challenges/solutions — record a solved challenge
router.post('/solutions', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const { challenge_id, language, code, points } = req.body;
  console.log('[Challenges] POST /solutions received:', { userId, challenge_id, language, points });

  if (!challenge_id) {
    res.status(400).json({ error: 'challenge_id is required' });
    return;
  }

  try {
    await query(
      `INSERT INTO challenge_solutions (user_id, challenge_id, language, code, points)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, challenge_id) DO NOTHING`,
      [userId, challenge_id, language || null, code || null, points || 10]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[challenges/solutions POST]', error);
    res.status(200).json({ success: true }); // Graceful fallback
  }
});

export default router;
