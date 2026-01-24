import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/authService';
import Loader from '../../components/common/Loader';
import { Users, Search, Trash2, UserPlus, Crown, Shield, User, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminRooms = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState('PARTICIPANT');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchAllRooms();
    }, []);

    const fetchAllRooms = async () => {
        try {
            const { data } = await api.get('/rooms');
            setRooms(data.rooms);
        } catch (error) {
            toast.error('Failed to fetch rooms');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (!window.confirm('Are you sure you want to delete this room? This cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/rooms/${roomId}`);
            toast.success('Room deleted');
            setRooms(rooms.filter(r => r._id !== roomId));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete room');
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!addEmail.trim() || !selectedRoom) return;

        setAdding(true);
        try {
            await api.post(`/rooms/${selectedRoom._id}/members`, {
                email: addEmail,
                role: addRole
            });
            toast.success('Member added successfully');
            setShowAddModal(false);
            setAddEmail('');
            setAddRole('PARTICIPANT');
            fetchAllRooms();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveMember = async (roomId, memberId) => {
        if (!window.confirm('Remove this member from the room?')) return;

        try {
            await api.delete(`/rooms/${roomId}/members/${memberId}`);
            toast.success('Member removed');
            fetchAllRooms();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="min-h-screen bg-dark-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">All Rooms</h1>
                        <p className="text-gray-400 mt-1">
                            Manage all rooms across the platform
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by room name, code, or owner..."
                        className="input-field w-full pl-10"
                    />
                </div>

                {/* Rooms Table */}
                {filteredRooms.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-gray-400">
                            {searchTerm ? 'No rooms match your search' : 'No rooms found'}
                        </p>
                    </div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <table className="w-full">
                            <thead className="bg-dark-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Room</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Owner</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Members</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {filteredRooms.map((room) => (
                                    <tr key={room._id} className="hover:bg-dark-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary-500/20 p-2 rounded-lg">
                                                    <Users className="w-5 h-5 text-primary-400" />
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{room.name}</div>
                                                    {room.description && (
                                                        <div className="text-gray-500 text-sm line-clamp-1">
                                                            {room.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-primary-400">{room.shortCode}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {room.owner?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {1 + (room.coOrganisers?.length || 0) + (room.participants?.length || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRoom(room);
                                                        setShowAddModal(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg"
                                                    title="Add Member"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/rooms/${room._id}`)}
                                                    className="p-2 text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg"
                                                    title="View Details"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRoom(room._id)}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                    title="Delete Room"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Member Modal */}
            {showAddModal && selectedRoom && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h2 className="text-xl font-bold text-white mb-2">Add Member</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Add a user to <span className="text-primary-400">{selectedRoom.name}</span>
                        </p>

                        <form onSubmit={handleAddMember}>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={addEmail}
                                        onChange={(e) => setAddEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="input-field w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Role
                                    </label>
                                    <select
                                        value={addRole}
                                        onChange={(e) => setAddRole(e.target.value)}
                                        className="input-field w-full"
                                    >
                                        <option value="PARTICIPANT">Participant</option>
                                        <option value="ORGANISER">Co-Organiser</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setAddEmail('');
                                        setAddRole('PARTICIPANT');
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding || !addEmail.trim()}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {adding ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRooms;
