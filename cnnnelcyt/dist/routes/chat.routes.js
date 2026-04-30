"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/create', auth_1.authenticateToken, chat_controller_1.createChat);
router.get('/', auth_1.authenticateToken, chat_controller_1.getChats);
router.get('/public', auth_1.authenticateToken, chat_controller_1.getPublicChats); // BEFORE /:id
router.get('/:id', auth_1.authenticateToken, chat_controller_1.getChatById);
router.get('/:id/members', auth_1.authenticateToken, chat_controller_1.getChatMembers);
router.patch('/:id', auth_1.authenticateToken, chat_controller_1.patchChat);
router.post('/:id/members', auth_1.authenticateToken, chat_controller_1.addMember);
router.put('/:id/members/:userId', auth_1.authenticateToken, chat_controller_1.updateMemberStatus);
router.delete('/:id/members/:userId', auth_1.authenticateToken, chat_controller_1.removeMember);
exports.default = router;
