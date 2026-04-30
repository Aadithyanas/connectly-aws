"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_1 = require("./socket");
dotenv_1.default.config();
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const status_routes_1 = __importDefault(require("./routes/status.routes"));
const connection_routes_1 = __importDefault(require("./routes/connection.routes"));
const push_subscriptions_routes_1 = __importDefault(require("./routes/push-subscriptions.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const challenges_routes_1 = __importDefault(require("./routes/challenges.routes"));
// Enable CORS
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express_1.default.json());
// Register Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/profiles', profile_routes_1.default);
app.use('/api/chats', chat_routes_1.default);
app.use('/api/messages', message_routes_1.default);
app.use('/api/posts', post_routes_1.default);
app.use('/api/statuses', status_routes_1.default);
app.use('/api/connections', connection_routes_1.default);
app.use('/api/push-subscriptions', push_subscriptions_routes_1.default);
app.use('/api/reports', reports_routes_1.default);
app.use('/api/challenges', challenges_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Connectly backend is running' });
});
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
// Register the io instance so controllers can broadcast events
(0, socket_1.setIO)(io);
// Socket.io connection logic (replacing Supabase Realtime)
io.on('connection', (socket) => {
    console.log('[Socket] User connected:', socket.id);
    // Presence
    socket.on('join_presence', (userId) => {
        socket.join(`presence:${userId}`);
        socket.broadcast.emit('presence_update', { userId, status: 'online' });
    });
    socket.on('leave_presence', (userId) => {
        socket.broadcast.emit('presence_update', { userId, status: 'offline' });
    });
    // Chat rooms
    socket.on('join_chat', (chatId) => {
        socket.join(`chat:${chatId}`);
    });
    socket.on('leave_chat', (chatId) => {
        socket.leave(`chat:${chatId}`);
    });
    // Messages — broadcast to the chat room (excluding sender)
    socket.on('send_message', (data) => {
        // Support both 'chatId' and 'chat_id' field names from clients
        const roomId = data.chat_id || data.chatId;
        if (roomId) {
            socket.to(`chat:${roomId}`).emit('new_message', data);
        }
    });
    // Read receipts
    socket.on('chat_read', (payload) => {
        const roomId = payload.chatId || payload.chat_id;
        if (roomId) {
            socket.to(`chat:${roomId}`).emit('chat_read', payload);
        }
    });
    // Notifications
    socket.on('join_notifications', (userId) => {
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
