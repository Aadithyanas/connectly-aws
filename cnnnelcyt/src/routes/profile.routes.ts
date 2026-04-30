import { Router } from 'express';
import { getProfile, updateProfile, searchProfiles, updateStatus, getUserXP } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Static routes BEFORE wildcard /:id
router.get('/search', authenticateToken, searchProfiles);
router.post('/status', authenticateToken, updateStatus);
router.put('/update', authenticateToken, updateProfile);  // legacy alias

// Per-profile routes (static sub-routes before /:id)
router.get('/:id/xp', authenticateToken, getUserXP);     // useUserRank
router.get('/:id', authenticateToken, getProfile);
router.put('/:id', authenticateToken, updateProfile);

export default router;
