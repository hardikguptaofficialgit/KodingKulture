import { useState, useRef } from 'react';
import { Upload, X, Loader, ImageIcon } from 'lucide-react';
import uploadService from '../../services/uploadService';
import toast from 'react-hot-toast';

const ImageUpload = ({ imageUrl, onImageChange, onImageRemove }) => {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please select a valid image file (JPG, PNG, GIF, WEBP)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be smaller than 5MB');
            return;
        }

        try {
            setUploading(true);
            const result = await uploadService.uploadImage(file);

            if (result.success) {
                onImageChange(result.imageUrl, result.publicId);
                toast.success('Image uploaded successfully');
            } else {
                toast.error(result.message || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleRemove = () => {
        onImageRemove();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
                Question Image (Optional)
            </label>

            {imageUrl ? (
                <div className="relative inline-block">
                    <img
                        src={imageUrl}
                        alt="Question"
                        className="max-w-full max-h-64 rounded-lg border border-dark-600"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                        title="Remove image"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragActive
                            ? 'border-primary-500  '
                            : 'border-dark-600 hover:border-dark-500 bg-dark-800'
                        }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleInputChange}
                        className="hidden"
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader className="w-8 h-8 text-primary-500 animate-spin" />
                            <span className="text-sm text-gray-400">Uploading...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-dark-700 rounded-full">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                                <span className="text-primary-400 font-medium">Click to upload</span>
                                <span className="text-gray-400"> or drag and drop</span>
                            </div>
                            <span className="text-xs text-gray-500">JPG, PNG, GIF, WEBP (max 5MB)</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
