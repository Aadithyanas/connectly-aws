import { Router } from 'express';
import { sendMessage, getMessages, deleteMessage, markAllDelivered, markDeliveredWebhook } from '../controllers/message.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Webhook from Service Worker (unauthenticated)
router.post('/webhook/delivered', markDeliveredWebhook);

router.post('/mark-delivered', authenticateToken, markAllDelivered);
router.post('/send', authenticateToken, sendMessage);
router.get('/chat/:chatId', authenticateToken, getMessages);
router.delete('/:id', authenticateToken, deleteMessage);

export default router;
