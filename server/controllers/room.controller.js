import Room from '../models/Room.js';
import User from '../models/User.js';
import Contest from '../models/Contest.js';
import crypto from 'crypto';
import { sendCoOrganiserInviteEmail } from '../services/emailService.js';

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private (Organiser only)
export const createRoom = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (req.user.role !== 'ORGANISER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only organisers can create rooms'
            });
        }

        const room = await Room.create({
            name,
            description,
            owner: req.user._id
        });

        await room.populate('owner', 'name email');

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create room'
        });
    }
};

// @desc    Get rooms for current user (or all for admin)
// @route   GET /api/rooms
// @access  Private
export const getRooms = async (req, res) => {
    try {
        let query;

        if (req.user.role === 'ADMIN') {
            // Admin sees all rooms
            query = Room.find({ isActive: true });
        } else if (req.user.role === 'ORGANISER') {
            // Organiser sees rooms they own, co-organise, OR joined as participant
            query = Room.find({
                isActive: true,
                $or: [
                    { owner: req.user._id },
                    { coOrganisers: req.user._id },
                    { participants: req.user._id }
                ]
            });
        } else {
            // Participant sees rooms they joined
            query = Room.find({
                isActive: true,
                participants: req.user._id
            });
        }

        const rooms = await query
            .populate('owner', 'name email')
            .populate('coOrganisers', 'name email')
            .sort({ createdAt: -1 });

        // Add member counts
        const roomsWithCounts = rooms.map(room => ({
            ...room.toObject(),
            participantCount: room.participants?.length || 0,
            coOrganiserCount: room.coOrganisers?.length || 0
        }));

        res.status(200).json({
            success: true,
            rooms: roomsWithCounts
        });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rooms'
        });
    }
};

// @desc    Get room by ID with full details
// @route   GET /api/rooms/:id
// @access  Private (Room members or Admin)
export const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('coOrganisers', 'name email')
            .populate('participants', 'name email');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check access
        if (req.user.role !== 'ADMIN' && !room.isMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this room'
            });
        }

        // Get contests in this room
        const contests = await Contest.find({ roomId: room._id })
            .select('title description startTime endTime status sections createdBy')
            .populate('createdBy', 'name email')
            .sort({ startTime: -1 });

        res.status(200).json({
            success: true,
            room,
            contests,
            isOwner: room.owner._id.toString() === req.user._id.toString(),
            isOrganiser: room.isOrganiser(req.user._id),
            isAdmin: req.user.role === 'ADMIN'
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room details'
        });
    }
};

// @desc    Join room via short code
// @route   POST /api/rooms/join
// @access  Private
export const joinRoom = async (req, res) => {
    try {
        const { shortCode } = req.body;

        const room = await Room.findOne({
            shortCode: shortCode.toUpperCase(),
            isActive: true
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found. Check the code and try again.'
            });
        }

        // Check if already a member
        if (room.isMember(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this room'
            });
        }

        // Add user as participant
        room.participants.push(req.user._id);
        await room.save();

        await room.populate('owner', 'name email');

        res.status(200).json({
            success: true,
            message: `Successfully joined ${room.name}`,
            room
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join room'
        });
    }
};

// @desc    Join room via link (auto-join)
// @route   GET /api/rooms/join/:shortCode
// @access  Private
export const joinRoomByLink = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const room = await Room.findOne({
            shortCode: shortCode.toUpperCase(),
            isActive: true
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if already a member
        if (room.isMember(req.user._id)) {
            return res.status(200).json({
                success: true,
                message: 'You are already a member of this room',
                room,
                alreadyMember: true
            });
        }

        // Add user as participant
        room.participants.push(req.user._id);
        await room.save();

        res.status(200).json({
            success: true,
            message: `Successfully joined ${room.name}`,
            room,
            alreadyMember: false
        });
    } catch (error) {
        console.error('Join room by link error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join room'
        });
    }
};

// @desc    Invite co-organiser (sends email, does NOT directly add)
// @route   POST /api/rooms/:id/invite
// @access  Private (Room owner only)
export const inviteCoOrganiser = async (req, res) => {
    try {
        const { email } = req.body;
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Only owner can invite co-organisers
        if (room.owner.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only the room owner can invite co-organisers'
            });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email'
            });
        }

        // Check if user is an organiser
        if (user.role !== 'ORGANISER' && user.role !== 'ADMIN') {
            return res.status(400).json({
                success: false,
                message: 'Only organisers can be invited as co-organisers. This user is a participant.'
            });
        }

        // Check if already a co-organiser
        if (room.isCoOrganiser(user._id)) {
            return res.status(400).json({
                success: false,
                message: 'User is already a co-organiser of this room'
            });
        }

        // Check if already the owner
        if (room.isOwner(user._id)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot invite the room owner as co-organiser'
            });
        }

        // Check for existing pending invite
        const existingInvite = room.pendingInvites.find(
            inv => inv.email === email && inv.expiresAt > new Date()
        );
        if (existingInvite) {
            return res.status(400).json({
                success: false,
                message: 'An invite has already been sent to this user. Please wait for them to accept or for the invite to expire.'
            });
        }

        // Generate invite token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        // Remove all expired invites AND any existing invites for this email (new one will be added)
        room.pendingInvites = room.pendingInvites.filter(
            inv => inv.expiresAt > new Date() && inv.email !== email
        );

        // Add pending invite
        room.pendingInvites.push({
            email,
            token,
            invitedBy: req.user._id,
            expiresAt
        });
        await room.save();

        // Send invite email
        const acceptUrl = `${process.env.CLIENT_URL}/rooms/accept-invite/${token}`;
        await sendCoOrganiserInviteEmail(email, room.name, req.user.name, acceptUrl);

        res.status(200).json({
            success: true,
            message: `Invitation sent to ${user.name} (${email}). They must accept via email to become co-organiser.`
        });
    } catch (error) {
        console.error('Invite co-organiser error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send co-organiser invitation'
        });
    }
};

// @desc    Accept co-organiser invite via token
// @route   POST /api/rooms/accept-invite/:token
// @access  Private (authenticated user)
export const acceptCoOrganiserInvite = async (req, res) => {
    try {
        const { token } = req.params;

        // Find room with this pending invite token
        const room = await Room.findOne({
            'pendingInvites.token': token
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired invitation link'
            });
        }

        // Find the specific invite
        const invite = room.pendingInvites.find(inv => inv.token === token);

        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }

        // Check expiry
        if (invite.expiresAt < new Date()) {
            // Remove expired invite
            room.pendingInvites = room.pendingInvites.filter(inv => inv.token !== token);
            await room.save();
            return res.status(400).json({
                success: false,
                message: 'This invitation has expired. Please ask the room owner to send a new one.'
            });
        }

        // Verify the logged-in user matches the invite email
        if (req.user.email !== invite.email) {
            return res.status(403).json({
                success: false,
                message: 'This invitation was sent to a different email address. Please log in with the correct account.'
            });
        }

        // Check if already a co-organiser (e.g., accepted via another invite)
        if (room.isCoOrganiser(req.user._id)) {
            room.pendingInvites = room.pendingInvites.filter(inv => inv.token !== token);
            await room.save();
            return res.status(200).json({
                success: true,
                message: 'You are already a co-organiser of this room',
                roomId: room._id
            });
        }

        // If user is currently a participant, remove from participants
        room.participants = room.participants.filter(
            p => p.toString() !== req.user._id.toString()
        );

        // Add as co-organiser
        room.coOrganisers.push(req.user._id);

        // Remove the used invite
        room.pendingInvites = room.pendingInvites.filter(inv => inv.token !== token);

        await room.save();

        res.status(200).json({
            success: true,
            message: `You are now a co-organiser of "${room.name}"!`,
            roomId: room._id
        });
    } catch (error) {
        console.error('Accept co-organiser invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept invitation'
        });
    }
};

// @desc    Add member to room (Admin only)
// @route   POST /api/rooms/:id/members
// @access  Private (Admin only)
export const addMember = async (req, res) => {
    try {
        const { email, role } = req.body; // role: 'organiser' or 'participant'

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only admin can add members directly'
            });
        }

        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (room.isMember(user._id)) {
            return res.status(400).json({
                success: false,
                message: 'User is already a member'
            });
        }

        if (role === 'organiser') {
            if (user.role !== 'ORGANISER') {
                return res.status(400).json({
                    success: false,
                    message: 'User must have ORGANISER role to be added as co-organiser'
                });
            }
            room.coOrganisers.push(user._id);
        } else {
            room.participants.push(user._id);
        }

        await room.save();

        res.status(200).json({
            success: true,
            message: `${user.name} added to the room`
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add member'
        });
    }
};

// @desc    Remove member from room
// @route   DELETE /api/rooms/:id/members/:userId
// @access  Private (Owner or Admin)
export const removeMember = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const room = await Room.findById(id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check permissions
        const isOwner = room.owner.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only room owner or admin can remove members'
            });
        }

        // Cannot remove owner
        if (room.owner.toString() === userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove the room owner'
            });
        }

        // Remove from both arrays
        room.coOrganisers = room.coOrganisers.filter(id => id.toString() !== userId);
        room.participants = room.participants.filter(id => id.toString() !== userId);

        await room.save();

        res.status(200).json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member'
        });
    }
};

// @desc    Leave room (for participants)
// @route   POST /api/rooms/:id/leave
// @access  Private
export const leaveRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Owner cannot leave
        if (room.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Room owner cannot leave. Transfer ownership or delete the room.'
            });
        }

        // Remove from participant/co-organiser list
        room.coOrganisers = room.coOrganisers.filter(id => id.toString() !== req.user._id.toString());
        room.participants = room.participants.filter(id => id.toString() !== req.user._id.toString());

        await room.save();

        res.status(200).json({
            success: true,
            message: 'Left the room successfully'
        });
    } catch (error) {
        console.error('Leave room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave room'
        });
    }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Owner or Admin)
export const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        const isOwner = room.owner.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only room owner or admin can delete the room'
            });
        }

        // Soft delete
        room.isActive = false;
        await room.save();

        res.status(200).json({
            success: true,
            message: 'Room deleted successfully'
        });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room'
        });
    }
};

// @desc    Update room details
// @route   PUT /api/rooms/:id
// @access  Private (Owner or Admin)
export const updateRoom = async (req, res) => {
    try {
        const { name, description } = req.body;
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        const isOwner = room.owner.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only room owner or admin can update the room'
            });
        }

        if (name) room.name = name;
        if (description !== undefined) room.description = description;

        await room.save();

        res.status(200).json({
            success: true,
            message: 'Room updated successfully',
            room
        });
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update room'
        });
    }
};
