import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    createRoom,
    getRooms,
    getRoomById,
    joinRoom,
    joinRoomByLink,
    inviteCoOrganiser,
    acceptCoOrganiserInvite,
    addMember,
    removeMember,
    leaveRoom,
    deleteRoom,
    updateRoom
} from '../controllers/room.controller.js';
import announcementRoutes from './announcement.routes.js';

const router = express.Router();

// Room CRUD
router.post('/', protect, createRoom);
router.get('/', protect, getRooms);
router.get('/:id', protect, getRoomById);
router.put('/:id', protect, updateRoom);
router.delete('/:id', protect, deleteRoom);

// Join routes
router.post('/join', protect, joinRoom);
router.get('/join/:shortCode', protect, joinRoomByLink);

// Co-organiser invite flow
router.post('/:id/invite', protect, inviteCoOrganiser);
router.post('/accept-invite/:token', protect, acceptCoOrganiserInvite);

// Member management
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.post('/:id/leave', protect, leaveRoom);

// Announcement routes (nested under room)
router.use('/:roomId/announcements', announcementRoutes);

export default router;
