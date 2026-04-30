import { Router } from 'express';
import { createChat, getChats, getPublicChats, getChatMembers, getChatById, removeMember, updateMemberStatus, patchChat, addMember } from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/create', authenticateToken, createChat);
router.get('/', authenticateToken, getChats);
router.get('/public', authenticateToken, getPublicChats);  // BEFORE /:id
router.get('/:id', authenticateToken, getChatById);
router.get('/:id/members', authenticateToken, getChatMembers);
router.patch('/:id', authenticateToken, patchChat);
router.post('/:id/members', authenticateToken, addMember);
router.put('/:id/members/:userId', authenticateToken, updateMemberStatus);
router.delete('/:id/members/:userId', authenticateToken, removeMember);

export default router;
