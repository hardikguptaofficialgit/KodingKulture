import User from '../models/User.js';
import Contest from '../models/Contest.js';
import { renderEmailTemplate, sendMail } from '../services/emailService.js';
import { sendToUser } from '../services/sseManager.js';

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

        // Push real-time role update via SSE (instant for online users)
        sendToUser(user._id, 'role-update', {
            role: user.role,
            previousRole: oldRole,
            name: user.name,
            email: user.email
        });

        // Send email notification
        try {
            if (role === 'ORGANISER' && oldRole !== 'ORGANISER') {
                await sendMail({
                    to: user.email,
                    subject: 'You are now an Organiser on FAKT CHECK!',
                    html: renderEmailTemplate({
                        preheader: 'Your organiser access is now active on FAKT CHECK.',
                        eyebrow: 'Role Update',
                        title: 'Your organiser access is ready',
                        intro: `Hello ${user.name}, your account has been upgraded with organiser permissions on FAKT CHECK.`,
                        infoRows: [
                            { label: 'Create', value: 'Set up and manage your own contests' },
                            { label: 'Review', value: 'Access contest leaderboards and participant data' },
                            { label: 'Publish', value: 'Submit contests for admin approval before they go live' }
                        ],
                        ctaLabel: 'Open Dashboard',
                        ctaUrl: `${process.env.CLIENT_URL}/admin/dashboard`,
                        note: 'Your published contests will still require admin approval before participants can access them.',
                    })
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
                ? renderEmailTemplate({
                    preheader: `Your contest ${contest.title} has been approved.`,
                    eyebrow: 'Contest Review',
                    title: 'Your contest has been approved',
                    intro: `Hello ${contest.createdBy.name}, your contest "${contest.title}" has been approved and is now ready for participants.`,
                    infoRows: [
                        { label: 'Contest', value: contest.title },
                        { label: 'Status', value: 'Approved' }
                    ],
                    ctaLabel: 'View Contest',
                    ctaUrl: `${process.env.CLIENT_URL}/contest/${contest._id}`,
                })
                : renderEmailTemplate({
                    preheader: `Your contest ${contest.title} needs updates before approval.`,
                    eyebrow: 'Contest Review',
                    title: 'Your contest needs a few updates',
                    intro: `Hello ${contest.createdBy.name}, we reviewed "${contest.title}" and it needs some changes before it can be approved.`,
                    infoRows: [
                        { label: 'Contest', value: contest.title },
                        { label: 'Status', value: 'Changes requested' }
                    ],
                    note: `Reason: ${rejectionReason || 'No specific reason was provided.'}`,
                    ctaLabel: 'Open Dashboard',
                    ctaUrl: `${process.env.CLIENT_URL}/admin/dashboard`,
                    footer: 'Once you update the contest, you can resubmit it for review from your dashboard.',
                });

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
