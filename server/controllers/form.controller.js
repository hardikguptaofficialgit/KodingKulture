import Form from '../models/Form.js';
import Contest from '../models/Contest.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Create a new form for a contest
// @route   POST /api/forms
// @access  Private/Admin or Organiser
export const createForm = async (req, res) => {
    try {
        const { contestId, title, description, fields } = req.body;

        // Verify contest exists and user has access
        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        // Check ownership for organiser
        if (req.user.role === 'ORGANISER' && contest.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only create forms for your own contests.'
            });
        }

        // Add fieldId to each field if not provided
        const processedFields = (fields || []).map((field, index) => ({
            ...field,
            fieldId: field.fieldId || uuidv4(),
            order: field.order ?? index
        }));

        const form = await Form.create({
            contestId,
            title,
            description,
            fields: processedFields,
            createdBy: req.user._id
        });

        // Enable forms section in contest if not already
        if (!contest.sections.forms.enabled) {
            contest.sections.forms.enabled = true;
        }
        contest.sections.forms.totalMarks = (contest.sections.forms.totalMarks || 0) + form.totalMarks;
        await contest.save();

        res.status(201).json({
            success: true,
            message: 'Form created successfully',
            form
        });
    } catch (error) {
        console.error('Create form error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating form'
        });
    }
};

// @desc    Get all forms for a contest
// @route   GET /api/forms/contest/:contestId
// @access  Private
export const getFormsByContest = async (req, res) => {
    try {
        const { contestId } = req.params;

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        // For participants, check if they're registered
        const isCreator = contest.createdBy?.toString() === req.user._id.toString();
        const isParticipant = contest.participants?.includes(req.user._id);
        const isAdminOrCreator = req.user.role === 'ADMIN' || (req.user.role === 'ORGANISER' && isCreator);

        if (!isAdminOrCreator && !isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not registered for this contest'
            });
        }

        const forms = await Form.find({ contestId, isActive: true }).sort({ createdAt: 1 });

        // For participants, hide correct answers
        const sanitizedForms = isAdminOrCreator ? forms : forms.map(form => {
            const formObj = form.toObject();
            return {
                ...formObj,
                fields: formObj.fields.map(field => {
                    const { correctAnswers, ...rest } = field;
                    return rest;
                })
            };
        });

        res.status(200).json({
            success: true,
            count: sanitizedForms.length,
            forms: sanitizedForms
        });
    } catch (error) {
        console.error('Get forms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching forms'
        });
    }
};

// @desc    Get a single form by ID
// @route   GET /api/forms/:id
// @access  Private/Admin or Organiser
export const getFormById = async (req, res) => {
    try {
        const form = await Form.findById(req.params.id).populate('contestId', 'title createdBy');

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        // Check ownership for organiser
        if (req.user.role === 'ORGANISER' && form.contestId.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            form
        });
    } catch (error) {
        console.error('Get form error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching form'
        });
    }
};

// @desc    Update a form
// @route   PUT /api/forms/:id
// @access  Private/Admin or Organiser
export const updateForm = async (req, res) => {
    try {
        const { title, description, fields } = req.body;

        const form = await Form.findById(req.params.id).populate('contestId', 'createdBy verificationStatus');

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        // Check ownership for organiser
        if (req.user.role === 'ORGANISER') {
            if (form.contestId.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
            // Organisers cannot edit approved contests
            if (form.contestId.verificationStatus === 'APPROVED') {
                return res.status(403).json({
                    success: false,
                    message: 'Contest is approved. Only admin can make changes.'
                });
            }
        }

        const oldTotalMarks = form.totalMarks;

        // Process fields
        if (fields) {
            form.fields = fields.map((field, index) => ({
                ...field,
                fieldId: field.fieldId || uuidv4(),
                order: field.order ?? index
            }));
        }
        if (title) form.title = title;
        if (description !== undefined) form.description = description;

        await form.save();

        // Update contest total marks
        const contest = await Contest.findById(form.contestId._id);
        contest.sections.forms.totalMarks = (contest.sections.forms.totalMarks || 0) - oldTotalMarks + form.totalMarks;
        await contest.save();

        res.status(200).json({
            success: true,
            message: 'Form updated successfully',
            form
        });
    } catch (error) {
        console.error('Update form error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating form'
        });
    }
};

// @desc    Delete a form
// @route   DELETE /api/forms/:id
// @access  Private/Admin or Organiser
export const deleteForm = async (req, res) => {
    try {
        const form = await Form.findById(req.params.id).populate('contestId', 'createdBy verificationStatus');

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        // Check ownership for organiser
        if (req.user.role === 'ORGANISER') {
            if (form.contestId.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
            if (form.contestId.verificationStatus === 'APPROVED') {
                return res.status(403).json({
                    success: false,
                    message: 'Contest is approved. Only admin can make changes.'
                });
            }
        }

        // Update contest total marks
        const contest = await Contest.findById(form.contestId._id);
        contest.sections.forms.totalMarks = Math.max(0, (contest.sections.forms.totalMarks || 0) - form.totalMarks);

        // Check if any forms remain
        const remainingForms = await Form.countDocuments({ contestId: form.contestId._id, _id: { $ne: form._id } });
        if (remainingForms === 0) {
            contest.sections.forms.enabled = false;
        }
        await contest.save();

        await Form.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Form deleted successfully'
        });
    } catch (error) {
        console.error('Delete form error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting form'
        });
    }
};
