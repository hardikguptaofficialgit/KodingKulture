import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import ContestCard from '../../components/contest/ContestCard';
import Loader from '../../components/common/Loader';
import {
    Users, Copy, ArrowLeft, Plus, UserPlus,
    Crown, Shield, User, LogOut, Trash2, Link2,
    Megaphone, Pin, Edit2, Paperclip, X, FileText, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const RoomDetail = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('contests');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    // Use string comparison for reliable matching
    const userId = user?._id?.toString() || user?._id;
    const ownerId = room?.owner?._id?.toString() || room?.owner?._id;
    const isAdmin = user?.role === 'ADMIN';
    const isOwner = ownerId === userId;
    const isCoOrganiser = room?.coOrganisers?.some(co => (co._id?.toString() || co._id) === userId);
    const isOrganiser = isOwner || isCoOrganiser || isAdmin; // Admin can act as organiser
    const canRemoveMembers = isOwner || isAdmin; // Only owner and admin can remove members

    useEffect(() => {
        fetchRoomDetails();
    }, [roomId]);

    const fetchRoomDetails = async () => {
        try {
            const { data } = await api.get(`/rooms/${roomId}`);
            setRoom(data.room);
            setContests(data.contests || []);
        } catch (error) {
            toast.error('Failed to fetch room details');
            navigate('/rooms');
        } finally {
            setLoading(false);
        }
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/rooms/join/${room.shortCode}`;
        navigator.clipboard.writeText(link);
        toast.success('Join link copied to clipboard!');
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.shortCode);
        toast.success('Room code copied!');
    };

    const handleInviteCoOrganiser = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviting(true);
        try {
            await api.post(`/rooms/${roomId}/invite`, { email: inviteEmail });
            toast.success('Co-organiser invited successfully!');
            setInviteEmail('');
            setShowInviteModal(false);
            fetchRoomDetails();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to invite');
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (memberId, memberRole) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;

        try {
            await api.delete(`/rooms/${roomId}/members/${memberId}`);
            toast.success('Member removed');
            fetchRoomDetails();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleLeaveRoom = async () => {
        if (!window.confirm('Are you sure you want to leave this room?')) return;

        try {
            await api.post(`/rooms/${roomId}/leave`);
            toast.success('Left the room');
            navigate('/rooms');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to leave room');
        }
    };

    const handleDeleteRoom = async () => {
        if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;

        try {
            await api.delete(`/rooms/${roomId}`);
            toast.success('Room deleted successfully');
            navigate('/rooms');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete room');
        }
    };

    if (loading) {
        return <Loader fullScreen />;
    }

    if (!room) {
        return null;
    }

    const allMembers = [
        { ...room.owner, role: 'Owner' },
        ...(room.coOrganisers || []).map(co => ({ ...co, role: 'Co-Organiser' })),
        ...(room.participants || []).map(p => ({ ...p, role: 'Participant' }))
    ];

    return (
        <div className="min-h-screen bg-dark-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <Link
                    to="/rooms"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to My Rooms
                </Link>

                {/* Room Header */}
                <div className="card mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-4 rounded-xl">
                                <Users className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{room.name}</h1>
                                {room.description && (
                                    <p className="text-gray-400 mt-1">{room.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Room Code */}
                            <button
                                onClick={copyRoomCode}
                                className="flex items-center gap-2 bg-dark-800 px-4 py-2 rounded-lg hover:bg-dark-700"
                            >
                                <span className="text-sm text-gray-400">Code:</span>
                                <span className="font-mono text-primary-400">{room.shortCode}</span>
                                <Copy className="w-4 h-4 text-gray-500" />
                            </button>

                            {/* Copy Link */}
                            <button
                                onClick={copyRoomLink}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <Link2 className="w-4 h-4" />
                                Copy Link
                            </button>

                            {/* Create Contest (for organisers) */}
                            {isOrganiser && (
                                <Link
                                    to={`/admin/contest/create?roomId=${roomId}`}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Contest
                                </Link>
                            )}

                            {/* Invite (for owner) */}
                            {isOwner && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Invite
                                </button>
                            )}

                            {/* Leave Room (for non-owners who aren't admins) */}
                            {!isOwner && !isAdmin && (
                                <button
                                    onClick={handleLeaveRoom}
                                    className="btn-secondary text-red-400 hover:text-red-300 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Leave
                                </button>
                            )}

                            {/* Delete Room (for owner and admin) */}
                            {(isOwner || isAdmin) && (
                                <button
                                    onClick={handleDeleteRoom}
                                    className="btn-secondary text-red-400 hover:text-red-300 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Room
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('contests')}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'contests'
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        Contests ({contests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'announcements'
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        Announcements
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'members'
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        Members ({allMembers.length})
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'contests' ? (
                    <div>
                        {contests.length === 0 ? (
                            <div className="card text-center py-12">
                                <p className="text-gray-400 mb-4">No contests in this room yet</p>
                                {isOrganiser && (
                                    <Link
                                        to={`/admin/create-contest?roomId=${roomId}`}
                                        className="btn-primary inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create First Contest
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {contests.map((contest) => (
                                    <ContestCard key={contest._id} contest={contest} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'announcements' ? (
                    <AnnouncementsTab roomId={roomId} isOrganiser={isOrganiser} user={user} />
                ) : (
                    <div className="card">
                        <div className="space-y-4">
                            {allMembers.map((member) => (
                                <div
                                    key={member._id}
                                    className="flex items-center justify-between p-4 bg-dark-800 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${member.role === 'Owner'
                                            ? 'bg-yellow-500/20'
                                            : member.role === 'Co-Organiser'
                                                ? 'bg-blue-500/20'
                                                : 'bg-gray-500/20'
                                            }`}>
                                            {member.role === 'Owner' ? (
                                                <Crown className="w-5 h-5 text-yellow-400" />
                                            ) : member.role === 'Co-Organiser' ? (
                                                <Shield className="w-5 h-5 text-blue-400" />
                                            ) : (
                                                <User className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">{member.name}</div>
                                            <div className="text-gray-500 text-sm">{member.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'Owner'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : member.role === 'Co-Organiser'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {member.role}
                                        </span>
                                        {canRemoveMembers && member._id !== user?._id && member.role !== 'Owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member._id, member.role)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h2 className="text-xl font-bold text-white mb-4">Invite Co-Organiser</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Enter the email of an organiser to invite them as a co-organiser
                        </p>

                        <form onSubmit={handleInviteCoOrganiser}>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="organiser@example.com"
                                className="input-field w-full mb-6"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        setInviteEmail('');
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {inviting ? 'Inviting...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Announcements Tab Component
const AnnouncementsTab = ({ roomId, isOrganiser, user }) => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, [roomId]);

    const fetchAnnouncements = async () => {
        try {
            const { data } = await api.get(`/rooms/${roomId}/announcements`);
            setAnnouncements(data.announcements || []);
        } catch (error) {
            toast.error('Failed to fetch announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const uploadedFiles = [];

        for (const file of files) {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);

            try {
                const { data } = await api.post('/upload/file', formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedFiles.push({
                    fileName: file.name,
                    fileUrl: data.url,
                    fileType: file.type,
                    publicId: data.publicId
                });
            } catch (error) {
                toast.error(`Failed to upload ${file.name}`);
            }
        }

        setAttachments(prev => [...prev, ...uploadedFiles]);
        setUploading(false);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setFormData({ title: '', content: '' });
        setAttachments([]);
        setEditingAnnouncement(null);
        setShowCreateModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error('Title and content are required');
            return;
        }

        setSubmitting(true);
        try {
            if (editingAnnouncement) {
                await api.put(`/rooms/${roomId}/announcements/${editingAnnouncement._id}`, {
                    ...formData,
                    attachments
                });
                toast.success('Announcement updated');
            } else {
                await api.post(`/rooms/${roomId}/announcements`, {
                    ...formData,
                    attachments
                });
                toast.success('Announcement created');
            }
            resetForm();
            fetchAnnouncements();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save announcement');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (announcement) => {
        setEditingAnnouncement(announcement);
        setFormData({ title: announcement.title, content: announcement.content });
        setAttachments(announcement.attachments || []);
        setShowCreateModal(true);
    };

    const handleDelete = async (announcementId) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;

        try {
            await api.delete(`/rooms/${roomId}/announcements/${announcementId}`);
            toast.success('Announcement deleted');
            fetchAnnouncements();
        } catch (error) {
            toast.error('Failed to delete announcement');
        }
    };

    const handleTogglePin = async (announcement) => {
        try {
            await api.put(`/rooms/${roomId}/announcements/${announcement._id}/pin`);
            toast.success(announcement.isPinned ? 'Unpinned' : 'Pinned');
            fetchAnnouncements();
        } catch (error) {
            toast.error('Failed to toggle pin');
        }
    };

    if (loading) {
        return (
            <div className="card text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Create Button */}
            {isOrganiser && (
                <div className="mb-6">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Announcement
                    </button>
                </div>
            )}

            {/* Announcements List */}
            {announcements.length === 0 ? (
                <div className="card text-center py-12">
                    <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No announcements yet</p>
                    {isOrganiser && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create First Announcement
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((announcement) => (
                        <div
                            key={announcement._id}
                            className={`card ${announcement.isPinned ? 'border-2 border-primary-500/50' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {announcement.isPinned && (
                                            <Pin className="w-4 h-4 text-primary-400" />
                                        )}
                                        <h3 className="text-lg font-semibold text-white">
                                            {announcement.title}
                                        </h3>
                                    </div>
                                    <p className="text-gray-300 whitespace-pre-wrap mb-4">
                                        {announcement.content}
                                    </p>

                                    {/* Attachments */}
                                    {announcement.attachments?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {announcement.attachments.map((file, idx) => (
                                                <a
                                                    key={idx}
                                                    href={file.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg hover:bg-dark-600 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4 text-primary-400" />
                                                    <span className="text-sm text-gray-300">{file.fileName}</span>
                                                    <Download className="w-4 h-4 text-gray-500" />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-sm text-gray-500">
                                        Posted by {announcement.createdBy?.name} •{' '}
                                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                {isOrganiser && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTogglePin(announcement)}
                                            className={`p-2 rounded-lg transition-colors ${announcement.isPinned
                                                ? 'bg-primary-500/20 text-primary-400'
                                                : 'bg-dark-700 text-gray-400 hover:text-white'
                                                }`}
                                            title={announcement.isPinned ? 'Unpin' : 'Pin'}
                                        >
                                            <Pin className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(announcement)}
                                            className="p-2 bg-dark-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(announcement._id)}
                                            className="p-2 bg-dark-700 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Announcement title"
                                    className="input-field w-full"
                                    autoFocus
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm mb-2">Content</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="Write your announcement..."
                                    rows={6}
                                    className="input-field w-full resize-none"
                                />
                            </div>

                            {/* Attachments */}
                            <div className="mb-6">
                                <label className="block text-gray-300 text-sm mb-2">Attachments</label>

                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {attachments.map((file, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg"
                                            >
                                                <FileText className="w-4 h-4 text-primary-400" />
                                                <span className="text-sm text-gray-300">{file.fileName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(idx)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <label className="flex items-center gap-2 px-4 py-3 bg-dark-700 border border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                                    <Paperclip className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-400">
                                        {uploading ? 'Uploading...' : 'Add files'}
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {submitting
                                        ? 'Saving...'
                                        : editingAnnouncement
                                            ? 'Update'
                                            : 'Post Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomDetail;
