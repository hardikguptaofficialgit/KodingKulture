import User from '../models/User.js';
import Contest from '../models/Contest.js';
import { sendMail } from '../services/emailService.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin only
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '' } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users'
        });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Admin only
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['USER', 'ORGANISER'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Can only assign USER or ORGANISER.'
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Can't change admin's role
        if (user.role === 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Cannot change admin role'
            });
        }

        const oldRole = user.role;
        user.role = role;
        await user.save();

        // Send email notification
        try {
            if (role === 'ORGANISER' && oldRole !== 'ORGANISER') {
                await sendMail({
                    to: user.email,
                    subject: 'You are now an Organiser on FAKT CHECK!',
                    html: `
            <h2>Congratulations, ${user.name}!</h2>
            <p>You have been granted <strong>Organiser</strong> privileges on FAKT CHECK.</p>
            <p>You can now:</p>
            <ul>
              <li>Create and manage your own contests</li>
              <li>View leaderboards for your contests</li>
              <li>Access participant data for your contests</li>
            </ul>
            <p>Note: Your contests will require admin approval before they go live.</p>
            <p>Best regards,<br>FAKT CHECK Team</p>
          `
                });
            }
        } catch (emailErr) {
            console.error('Failed to send role notification email:', emailErr);
        }

        res.status(200).json({
            success: true,
            message: `User role updated to ${role}`,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user role'
        });
    }
};

// @desc    Get pending contests for verification
// @route   GET /api/admin/contests/pending
// @access  Admin only
export const getPendingContests = async (req, res) => {
    try {
        const contests = await Contest.find({ verificationStatus: 'PENDING' })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            contests
        });
    } catch (error) {
        console.error('Get pending contests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching pending contests'
        });
    }
};

// @desc    Verify contest (approve/reject)
// @route   PUT /api/admin/contests/:id/verify
// @access  Admin only
export const verifyContest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be APPROVED or REJECTED.'
            });
        }

        const contest = await Contest.findById(id).populate('createdBy', 'name email');

        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        contest.verificationStatus = status;
        if (status === 'REJECTED' && rejectionReason) {
            contest.rejectionReason = rejectionReason;
        }

        await contest.save();

        // Send email notification to organiser
        try {
            const subject = status === 'APPROVED'
                ? `Your contest "${contest.title}" has been approved!`
                : `Your contest "${contest.title}" requires changes`;

            const html = status === 'APPROVED'
                ? `
          <h2>Contest Approved!</h2>
          <p>Hi ${contest.createdBy.name},</p>
          <p>Your contest <strong>"${contest.title}"</strong> has been approved and is now visible to participants.</p>
          <p>Best regards,<br>FAKT CHECK Team</p>
        `
                : `
          <h2>Contest Requires Changes</h2>
          <p>Hi ${contest.createdBy.name},</p>
          <p>Your contest <strong>"${contest.title}"</strong> has been reviewed and requires some changes.</p>
          <p><strong>Reason:</strong> ${rejectionReason || 'No specific reason provided.'}</p>
          <p>Please update your contest and resubmit for approval.</p>
          <p>Best regards,<br>FAKT CHECK Team</p>
        `;

            await sendMail({
                to: contest.createdBy.email,
                subject,
                html
            });
        } catch (emailErr) {
            console.error('Failed to send contest verification email:', emailErr);
        }

        res.status(200).json({
            success: true,
            message: `Contest ${status.toLowerCase()}`,
            contest
        });
    } catch (error) {
        console.error('Verify contest error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error verifying contest'
        });
    }
};
