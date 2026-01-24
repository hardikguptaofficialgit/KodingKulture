import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
    togglePinAnnouncement
} from '../controllers/announcement.controller.js';

const router = express.Router({ mergeParams: true }); // To access :roomId from parent router

// All routes require authentication
router.use(protect);

// Get all announcements for a room
router.get('/', getAnnouncements);

// Create new announcement
router.post('/', createAnnouncement);

// Update announcement
router.put('/:announcementId', updateAnnouncement);

// Delete announcement
router.delete('/:announcementId', deleteAnnouncement);

// Toggle pin
router.put('/:announcementId/pin', togglePinAnnouncement);

export default router;
