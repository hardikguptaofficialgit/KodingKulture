import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/admin.middleware.js';
import { upload, fileUpload, isCloudinaryConfigured, deleteImage } from '../config/cloudinary.js';

const router = express.Router();

// @desc    Upload image for questions
// @route   POST /api/upload/image
// @access  Private/Admin
router.post('/image', protect, adminOnly, (req, res) => {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Image upload is not configured. Please set up Cloudinary credentials.'
        });
    }

    // Use multer upload
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading image'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image file'
            });
        }

        res.status(200).json({
            success: true,
            imageUrl: req.file.path,
            publicId: req.file.filename
        });
    });
});

// @desc    Upload file for announcements
// @route   POST /api/upload/file
// @access  Private (Organiser or Admin)
router.post('/file', protect, (req, res) => {
    // Check if user is organiser or admin
    if (req.user.role !== 'ORGANISER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Only organisers can upload files'
        });
    }

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'File upload is not configured. Please set up Cloudinary credentials.'
        });
    }

    // Use multer file upload
    fileUpload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading file'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        res.status(200).json({
            success: true,
            url: req.file.path,
            publicId: req.file.filename
        });
    });
});

// @desc    Delete image
// @route   DELETE /api/upload/image/:publicId
// @access  Private/Admin
router.delete('/image/:publicId', protect, adminOnly, async (req, res) => {
    try {
        const { publicId } = req.params;

        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: 'Public ID is required'
            });
        }

        await deleteImage(publicId);

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image'
        });
    }
});

// @desc    Check if upload is configured
// @route   GET /api/upload/status
// @access  Private/Admin
router.get('/status', protect, adminOnly, (req, res) => {
    res.json({
        success: true,
        configured: isCloudinaryConfigured()
    });
});

export default router;
