import { Router } from 'express';
import { register, login, getMe, googleLogin, googleAuthUrl, googleCallback } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/google/url', googleAuthUrl);
router.get('/google/callback', googleCallback);
router.get('/me', authenticateToken, getMe);

export default router;
