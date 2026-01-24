import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary - supports both naming conventions
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Check if Cloudinary is configured
export const isCloudinaryConfigured = () => {
    return !!(
        (process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME) &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

// Configure Cloudinary storage for multer (images)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'koding-kulture/questions',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }]
    }
});

// Configure Cloudinary storage for files (announcements)
const fileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine resource type based on file type
        const isImage = file.mimetype.startsWith('image/');
        const isPdf = file.mimetype === 'application/pdf';

        return {
            folder: 'koding-kulture/announcements',
            resource_type: isImage ? 'image' : 'raw',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'],
            public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`
        };
    }
});

// Create multer upload middleware for images
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Create multer upload middleware for files
export const fileUpload = multer({
    storage: fileStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size for announcements
    }
});

// Upload image and return URL
export const uploadImage = async (file) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary is not configured');
    }

    const result = await cloudinary.uploader.upload(file.path, {
        folder: 'koding-kulture/questions',
        transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }]
    });

    return {
        url: result.secure_url,
        publicId: result.public_id
    };
};

// Delete image/file from Cloudinary
export const deleteImage = async (publicId, resourceType = 'image') => {
    if (!isCloudinaryConfigured() || !publicId) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
    }
};

export default cloudinary;
