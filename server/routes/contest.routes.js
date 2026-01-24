import express from 'express';
import {
  getAllContests,
  getContestById,
  createContest,
  updateContest,
  deleteContest,
  registerForContest,
  getMyContests,
  startContest,
  getContestProgress,
  finalSubmitContest,
  trackTime,
  saveProgress,
  emergencySave,
  logViolation,
  getContestViolations,
  getRegistrationStatus,
  getContestParticipants,
  getAdminContests,
  endContestManually
} from '../controllers/contest.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOnly, adminOrOrganiser, contestOwner } from '../middlewares/admin.middleware.js';

const router = express.Router();

router.get('/', getAllContests);
router.get('/my-contests', protect, getMyContests);
router.get('/admin', protect, adminOrOrganiser, getAdminContests);
router.get('/:id', getContestById);

// Admin OR Organiser can create contests
router.post('/', protect, adminOrOrganiser, createContest);

// Update/Delete - Admin can do any, Organiser only their own
router.put('/:id', protect, adminOrOrganiser, contestOwner, updateContest);
router.delete('/:id', protect, adminOrOrganiser, contestOwner, deleteContest);

// Registration routes
router.post('/:id/register', protect, registerForContest);
router.get('/:id/registration-status', protect, getRegistrationStatus);

// Participants - Admin or Contest Owner
router.get('/:id/participants', protect, adminOrOrganiser, contestOwner, getContestParticipants);

// Contest flow routes
router.post('/:id/start', protect, startContest);
router.get('/:id/progress', protect, getContestProgress);
router.post('/:id/submit', protect, finalSubmitContest);
router.post('/:id/track-time', protect, trackTime);
router.post('/:id/save-progress', protect, saveProgress);
router.post('/:id/emergency-save', emergencySave);

// Proctoring routes - Violations viewable by contest owner
router.post('/:id/violation', protect, logViolation);
router.get('/:id/violations', protect, adminOrOrganiser, contestOwner, getContestViolations);

// End contest manually - Admin or Contest Owner
router.post('/:id/end', protect, adminOrOrganiser, endContestManually);

export default router;
