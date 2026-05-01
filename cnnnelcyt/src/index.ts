import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setIO } from './socket';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const server = http.createServer(app);

import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import postRoutes from './routes/post.routes';
import statusRoutes from './routes/status.routes';
import connectionRoutes from './routes/connection.routes';
import pushSubscriptionRoutes from './routes/push-subscriptions.routes';
import reportRoutes from './routes/reports.routes';
import challengeRoutes from './routes/challenges.routes';

// Enable CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://127.0.0.1:3000',
      'https://main.d3af9elhkogzdb.amplifyapp.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.trycloudflare.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/challenges', challengeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Connectly backend is running' });
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Register the io instance so controllers can broadcast events
setIO(io);

// Socket.io connection logic (replacing Supabase Realtime)
io.on('connection', (socket) => {
  console.log('[Socket] User connected:', socket.id);

  // Presence
  socket.on('join_presence', (userId: string) => {
    socket.join(`presence:${userId}`);
    socket.broadcast.emit('presence_update', { userId, status: 'online' });
  });

  socket.on('leave_presence', (userId: string) => {
    socket.broadcast.emit('presence_update', { userId, status: 'offline' });
  });

  // Chat rooms
  socket.on('join_chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on('leave_chat', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
  });

  // Messages — broadcast to the chat room (excluding sender)
  socket.on('send_message', (data: any) => {
    // Support both 'chatId' and 'chat_id' field names from clients
    const roomId = data.chat_id || data.chatId;
    if (roomId) {
      socket.to(`chat:${roomId}`).emit('new_message', data);
    }
  });

  // Read receipts
  socket.on('chat_read', (payload: any) => {
    const roomId = payload.chatId || payload.chat_id;
    if (roomId) {
      socket.to(`chat:${roomId}`).emit('chat_read', payload);
    }
  });

  // Notifications
  socket.on('join_notifications', (userId: string) => {
    socket.join(`notifications:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] User disconnected:', socket.id);
  });
});

const PORT = 4002;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Connectly backend running on port ${PORT}`);
});
