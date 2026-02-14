import express from 'express';
import {
  submitCode,
  getSubmissionsByProblem,
  getSubmissionById,
  testRunCode,
  checkAllTestCases,
  getCodingProgress,
  getCodingReview,
  getPendingSubmissions
} from '../controllers/submission.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOrOrganiser } from '../middlewares/admin.middleware.js';

const router = express.Router();

// Submission routes (rate limiting removed)
router.post('/', protect, submitCode);
router.post('/test', protect, testRunCode);
router.post('/check-all', protect, checkAllTestCases);
router.get('/problem/:problemId', protect, getSubmissionsByProblem);
// Aggregated contest-level endpoints (must be before /:id to avoid conflict)
router.get('/contest/:contestId/progress', protect, getCodingProgress);
router.get('/contest/:contestId/review', protect, getCodingReview);
router.get('/contest/:contestId/pending', protect, adminOrOrganiser, getPendingSubmissions);
router.get('/:id', protect, getSubmissionById);

export default router;
