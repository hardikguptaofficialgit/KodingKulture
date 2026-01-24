import express from 'express';
import {
    createForm,
    getFormsByContest,
    getFormById,
    updateForm,
    deleteForm
} from '../controllers/form.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOrOrganiser } from '../middlewares/admin.middleware.js';

const router = express.Router();

// Create form - Admin or Organiser
router.post('/', protect, adminOrOrganiser, createForm);

// Get forms for a contest - Any authenticated user (participants see sanitized)
router.get('/contest/:contestId', protect, getFormsByContest);

// Get single form - Admin or Organiser
router.get('/:id', protect, adminOrOrganiser, getFormById);

// Update form - Admin or Organiser
router.put('/:id', protect, adminOrOrganiser, updateForm);

// Delete form - Admin or Organiser
router.delete('/:id', protect, adminOrOrganiser, deleteForm);

export default router;
