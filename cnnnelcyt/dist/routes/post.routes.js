"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Static routes BEFORE /:id wildcard
router.get('/feed', auth_1.authenticateToken, post_controller_1.getFeed);
router.get('/check-new', auth_1.authenticateToken, post_controller_1.checkNewPosts);
router.get('/user/:userId', auth_1.authenticateToken, post_controller_1.getUserPosts); // InfoSidebar grid
router.post('/create', auth_1.authenticateToken, post_controller_1.createPost); // usePosts.createPost
router.post('/', auth_1.authenticateToken, post_controller_1.createPost); // alias
// Per-post routes
router.get('/:id/comments', auth_1.authenticateToken, post_controller_1.getComments);
router.post('/:id/like', auth_1.authenticateToken, post_controller_1.likePost);
router.post('/:id/comment', auth_1.authenticateToken, post_controller_1.commentPost);
router.patch('/:id', auth_1.authenticateToken, post_controller_1.updatePost);
router.delete('/:id', auth_1.authenticateToken, post_controller_1.deletePost);
exports.default = router;
