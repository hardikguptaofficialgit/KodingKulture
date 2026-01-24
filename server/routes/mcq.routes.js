import express from 'express';
import {
  getMCQsByContest,
  submitMCQAnswers,
  createMCQ,
  updateMCQ,
  deleteMCQ,
  getLibraryMCQs,
  createLibraryMCQ,
  updateLibraryMCQ,
  deleteLibraryMCQ,
  addLibraryMCQsToContest,
  removeMCQFromContest,
  getMCQMetrics,
  getContestMCQReview
} from '../controllers/mcq.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOnly, adminOrOrganiser } from '../middlewares/admin.middleware.js';

const router = express.Router();

// Library routes - Read+Create for Admin/Organiser, Update/Delete for Admin only
router.get('/library', protect, adminOrOrganiser, getLibraryMCQs);
router.post('/library', protect, adminOrOrganiser, createLibraryMCQ);
router.put('/library/:id', protect, adminOnly, updateLibraryMCQ);
router.delete('/library/:id', protect, adminOnly, deleteLibraryMCQ);

// Contest-library linking routes - Admin or Organiser
router.post('/contest/:contestId/add-from-library', protect, adminOrOrganiser, addLibraryMCQsToContest);
router.delete('/contest/:contestId/mcq/:mcqId', protect, adminOrOrganiser, removeMCQFromContest);

// Contest MCQ routes
router.get('/contest/:contestId', protect, getMCQsByContest);
router.get('/contest/:contestId/review', protect, getContestMCQReview);
router.post('/submit', protect, submitMCQAnswers);

// MCQ CRUD routes - Admin or Organiser
router.post('/', protect, adminOrOrganiser, createMCQ);
router.put('/:id', protect, adminOrOrganiser, updateMCQ);
router.delete('/:id', protect, adminOrOrganiser, deleteMCQ);
router.get('/:id/metrics', protect, adminOrOrganiser, getMCQMetrics);

export default router;
