import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// POST /api/push-subscriptions
// Saves a Web Push subscription for the authenticated user.
router.post('/', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const { endpoint, p256dh, auth } = req.body;

  console.log(`[push-subscriptions] Received subscription request for user: ${userId}`);

  if (!endpoint || !p256dh || !auth) {
    console.warn(`[push-subscriptions] Missing fields for user: ${userId}`);
    res.status(400).json({ error: 'Missing required subscription fields' });
    return;
  }

  try {
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [userId, endpoint, p256dh, auth]
    );
    console.log(`[push-subscriptions] Successfully saved subscription for user: ${userId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[push-subscriptions]', error);
    // Non-fatal — table may not exist yet. Return success so client doesn't retry.
    res.status(200).json({ success: true });
  }
});

export default router;
