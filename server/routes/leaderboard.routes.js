import express from 'express';
import {
  getLeaderboard,
  getUserRank,
  getContestStats,
  generateCertificate,
  getUserDetailedStats,
  getAdminLeaderboard
} from '../controllers/leaderboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOrOrganiser, contestOwner } from '../middlewares/admin.middleware.js';

const router = express.Router();

router.get('/:contestId', getLeaderboard);
router.get('/:contestId/rank', protect, getUserRank);
router.get('/:contestId/stats', getContestStats);
router.get('/:contestId/user/:userId/details', protect, getUserDetailedStats);
router.post('/:contestId/certificate', protect, generateCertificate);

// Admin/Organiser leaderboard with full user details (email, phone)
router.get('/:contestId/admin', protect, adminOrOrganiser, contestOwner, getAdminLeaderboard);

export default router;
