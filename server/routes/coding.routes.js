import express from 'express';
import {
  getCodingProblemsByContest,
  getCodingProblemById,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
  getLibraryProblems,
  createLibraryProblem,
  updateLibraryProblem,
  deleteLibraryProblem,
  addLibraryProblemsToContest,
  removeProblemFromContest,
  getProblemMetrics
} from '../controllers/coding.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOnly, adminOrOrganiser } from '../middlewares/admin.middleware.js';

const router = express.Router();

// Library routes - Read+Create for Admin/Organiser, Update/Delete for Admin only
router.get('/library', protect, adminOrOrganiser, getLibraryProblems);
router.post('/library', protect, adminOrOrganiser, createLibraryProblem);
router.put('/library/:id', protect, adminOnly, updateLibraryProblem);
router.delete('/library/:id', protect, adminOnly, deleteLibraryProblem);

// Contest-library linking routes - Admin or Organiser
router.post('/contest/:contestId/add-from-library', protect, adminOrOrganiser, addLibraryProblemsToContest);
router.delete('/contest/:contestId/problem/:problemId', protect, adminOrOrganiser, removeProblemFromContest);

// Contest routes
router.get('/contest/:contestId', protect, getCodingProblemsByContest);

// Problem CRUD routes - Admin or Organiser
router.get('/:id', protect, getCodingProblemById);
router.post('/', protect, adminOrOrganiser, createCodingProblem);
router.put('/:id', protect, adminOrOrganiser, updateCodingProblem);
router.delete('/:id', protect, adminOrOrganiser, deleteCodingProblem);
router.get('/:id/metrics', protect, adminOrOrganiser, getProblemMetrics);

export default router;
