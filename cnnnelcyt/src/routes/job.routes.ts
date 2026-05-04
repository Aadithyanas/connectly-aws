import { Router } from 'express';
import { getJobs, createJob, updateJob, deleteJob } from '../controllers/job.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getJobs);
router.post('/', authenticateToken, createJob);
router.patch('/:id', authenticateToken, updateJob);
router.delete('/:id', authenticateToken, deleteJob);

export default router;
