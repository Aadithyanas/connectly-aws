import { Router } from 'express';
import {
  createPost,
  getFeed,
  checkNewPosts,
  getComments,
  likePost,
  commentPost,
  updatePost,
  deletePost,
  getUserPosts,
} from '../controllers/post.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Static routes BEFORE /:id wildcard
router.get('/feed', authenticateToken, getFeed);
router.get('/check-new', authenticateToken, checkNewPosts);
router.get('/user/:userId', authenticateToken, getUserPosts);   // InfoSidebar grid
router.post('/create', authenticateToken, createPost);          // usePosts.createPost
router.post('/', authenticateToken, createPost);                // alias

// Per-post routes
router.get('/:id/comments', authenticateToken, getComments);
router.post('/:id/like', authenticateToken, likePost);
router.post('/:id/comment', authenticateToken, commentPost);
router.patch('/:id', authenticateToken, updatePost);
router.delete('/:id', authenticateToken, deletePost);

export default router;
