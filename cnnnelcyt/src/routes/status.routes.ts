import { Router } from 'express';
import { createStatus, getStatusFeed, viewStatus, deleteStatus, getStatusViewers } from '../controllers/status.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, createStatus);
router.get('/feed', authenticateToken, getStatusFeed);
// Specific sub-routes before the /:id wildcard
router.get('/:id/viewers', authenticateToken, getStatusViewers);
router.post('/:id/view', authenticateToken, viewStatus);
router.delete('/:id', authenticateToken, deleteStatus);

export default router;
