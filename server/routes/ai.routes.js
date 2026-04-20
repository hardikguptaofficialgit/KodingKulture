import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOrOrganiser } from '../middlewares/admin.middleware.js';
import {
  generateMcqDraft,
  improveMcqDraft,
  generateCodingDraft,
  improveCodingDraft
} from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/mcq/generate', protect, adminOrOrganiser, generateMcqDraft);
router.post('/mcq/improve', protect, adminOrOrganiser, improveMcqDraft);
router.post('/coding/generate', protect, adminOrOrganiser, generateCodingDraft);
router.post('/coding/improve', protect, adminOrOrganiser, improveCodingDraft);

export default router;
