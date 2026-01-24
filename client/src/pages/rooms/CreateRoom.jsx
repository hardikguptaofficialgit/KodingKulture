import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/authService';
import { ArrowLeft, Users, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateRoom = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Room name is required');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/rooms', formData);
            toast.success('Room created successfully!');
            navigate(`/rooms/${data.room._id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 py-8">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <Link
                    to="/rooms"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to My Rooms
                </Link>

                {/* Form Card */}
                <div className="card">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-4 rounded-xl">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Create a New Room</h1>
                            <p className="text-gray-400">Set up a private space for your contests</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Room Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Room Name *
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., DSA Practice Group"
                                    className="input-field w-full pl-10"
                                    maxLength={100}
                                    required
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description (optional)
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Briefly describe the purpose of this room..."
                                    className="input-field w-full pl-10 min-h-[100px] resize-none"
                                    maxLength={500}
                                    rows={4}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.description.length}/500 characters
                            </p>
                        </div>

                        {/* Info Box */}
                        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                            <h4 className="text-primary-400 font-medium mb-2">What happens next?</h4>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• A unique room code will be generated</li>
                                <li>• Share the code or link with participants</li>
                                <li>• Create contests that are visible only to room members</li>
                                <li>• Room contests are auto-approved (no admin verification needed)</li>
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 pt-4">
                            <Link to="/rooms" className="btn-secondary flex-1 text-center">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary flex-1 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Room'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateRoom;
