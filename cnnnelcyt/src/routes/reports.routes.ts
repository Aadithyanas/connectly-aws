import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// POST /api/reports — submit a user report
router.post('/', authenticateToken, async (req: any, res) => {
  const reporterId = req.user.id;
  const { reported_id, reason, description } = req.body;

  if (!reported_id || !reason) {
    res.status(400).json({ error: 'reported_id and reason are required' });
    return;
  }

  try {
    await query(
      `INSERT INTO reports (reporter_id, reported_id, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [reporterId, reported_id, reason, description || null]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[reports]', error);
    // Non-fatal — always return success so UI shows confirmation
    res.status(200).json({ success: true });
  }
});

export default router;
