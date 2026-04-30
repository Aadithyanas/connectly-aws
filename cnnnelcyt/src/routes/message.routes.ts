import { Router } from 'express';
import { sendMessage, getMessages, deleteMessage, markAllDelivered } from '../controllers/message.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/mark-delivered', authenticateToken, markAllDelivered);
router.post('/send', authenticateToken, sendMessage);
router.get('/chat/:chatId', authenticateToken, getMessages);
router.delete('/:id', authenticateToken, deleteMessage);

export default router;
