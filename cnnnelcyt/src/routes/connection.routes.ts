import { Router } from 'express';
import { followUser, unfollowUser, getConnections, getFollowers, getFollowing } from '../controllers/connection.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/follow', authenticateToken, followUser);
router.post('/unfollow', authenticateToken, unfollowUser);
// Specific sub-routes must come before the /:userId wildcard
router.get('/:userId/followers', authenticateToken, getFollowers);
router.get('/:userId/following', authenticateToken, getFollowing);
router.get('/:userId', authenticateToken, getConnections);

export default router;
