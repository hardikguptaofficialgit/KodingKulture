import express from 'express';
import {
    getAllUsers,
    updateUserRole,
    getPendingContests,
    verifyContest
} from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/admin.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);

// Contest verification
router.get('/contests/pending', getPendingContests);
router.put('/contests/:id/verify', verifyContest);

export default router;
