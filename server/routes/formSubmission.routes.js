import express from 'express';
import {
    submitForm,
    getSubmissionsByContest,
    getMySubmission,
    evaluateSubmission,
    getSubmissionById,
    requestNotification
} from '../controllers/formSubmission.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOrOrganiser } from '../middlewares/admin.middleware.js';

const router = express.Router();

// Submit form - Participant
router.post('/', protect, submitForm);

// Get own submission - Participant
router.get('/my/:contestId', protect, getMySubmission);

// Request notification when evaluated - Participant
router.post('/:id/request-notification', protect, requestNotification);

// Get all submissions for a contest - Admin or Organiser
router.get('/contest/:contestId', protect, adminOrOrganiser, getSubmissionsByContest);

// Get submission by ID - Admin or Organiser
router.get('/:id', protect, adminOrOrganiser, getSubmissionById);

// Evaluate submission - Admin or Organiser
router.put('/:id/evaluate', protect, adminOrOrganiser, evaluateSubmission);

export default router;
