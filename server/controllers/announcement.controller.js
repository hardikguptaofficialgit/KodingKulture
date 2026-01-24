import Announcement from '../models/Announcement.js';
import Room from '../models/Room.js';
import { deleteImage } from '../config/cloudinary.js';

// @desc    Create announcement
// @route   POST /api/rooms/:roomId/announcements
// @access  Private (Room organisers only)
export const createAnnouncement = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { title, content, attachments } = req.body;

        // Check room exists
        const room = await Room.findById(roomId);
        if (!room || !room.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if user is organiser of the room
        if (!room.isOrganiser(req.user._id) && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only room organisers can create announcements'
            });
        }

        const announcement = await Announcement.create({
            roomId,
            title,
            content,
            attachments: attachments || [],
            createdBy: req.user._id
        });

        await announcement.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            announcement
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create announcement'
        });
    }
};

// @desc    Get announcements for a room
// @route   GET /api/rooms/:roomId/announcements
// @access  Private (Room members)
export const getAnnouncements = async (req, res) => {
    try {
        const { roomId } = req.params;

        // Check room exists
        const room = await Room.findById(roomId);
        if (!room || !room.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if user is member of the room
        if (!room.isMember(req.user._id) && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this room'
            });
        }

        const announcements = await Announcement.find({
            roomId,
            isActive: true
        })
            .populate('createdBy', 'name email')
            .sort({ isPinned: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            announcements
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch announcements'
        });
    }
};

// @desc    Update announcement
// @route   PUT /api/rooms/:roomId/announcements/:announcementId
// @access  Private (Creator or Admin)
export const updateAnnouncement = async (req, res) => {
    try {
        const { roomId, announcementId } = req.params;
        const { title, content, attachments, isPinned } = req.body;

        const announcement = await Announcement.findOne({
            _id: announcementId,
            roomId
        });

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check permissions
        const room = await Room.findById(roomId);
        const canEdit = announcement.createdBy.toString() === req.user._id.toString() ||
            room.isOrganiser(req.user._id) ||
            req.user.role === 'ADMIN';

        if (!canEdit) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this announcement'
            });
        }

        if (title) announcement.title = title;
        if (content) announcement.content = content;
        if (attachments !== undefined) announcement.attachments = attachments;
        if (isPinned !== undefined) announcement.isPinned = isPinned;

        await announcement.save();
        await announcement.populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Announcement updated successfully',
            announcement
        });
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update announcement'
        });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/rooms/:roomId/announcements/:announcementId
// @access  Private (Creator or Admin)
export const deleteAnnouncement = async (req, res) => {
    try {
        const { roomId, announcementId } = req.params;

        const announcement = await Announcement.findOne({
            _id: announcementId,
            roomId
        });

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check permissions
        const room = await Room.findById(roomId);
        const canDelete = announcement.createdBy.toString() === req.user._id.toString() ||
            room.isOrganiser(req.user._id) ||
            req.user.role === 'ADMIN';

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this announcement'
            });
        }

        // Delete attachments from Cloudinary
        for (const attachment of announcement.attachments) {
            if (attachment.publicId) {
                await deleteImage(attachment.publicId);
            }
        }

        // Soft delete
        announcement.isActive = false;
        await announcement.save();

        res.status(200).json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete announcement'
        });
    }
};

// @desc    Toggle pin announcement
// @route   PUT /api/rooms/:roomId/announcements/:announcementId/pin
// @access  Private (Room organisers only)
export const togglePinAnnouncement = async (req, res) => {
    try {
        const { roomId, announcementId } = req.params;

        const room = await Room.findById(roomId);
        if (!room || !room.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Only organisers can pin
        if (!room.isOrganiser(req.user._id) && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only organisers can pin announcements'
            });
        }

        const announcement = await Announcement.findOne({
            _id: announcementId,
            roomId,
            isActive: true
        });

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        announcement.isPinned = !announcement.isPinned;
        await announcement.save();

        res.status(200).json({
            success: true,
            message: announcement.isPinned ? 'Announcement pinned' : 'Announcement unpinned',
            announcement
        });
    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle pin'
        });
    }
};
