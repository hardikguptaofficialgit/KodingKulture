import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import Loader from '../../components/common/Loader';
import { Users, Plus, LogIn, Copy, DoorOpen, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const MyRooms = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joining, setJoining] = useState(false);

    const isOrganiser = user?.role === 'ORGANISER' || user?.role === 'ADMIN';

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
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

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) {
            toast.error('Please enter a room code');
            return;
        }

        setJoining(true);
        try {
            await api.post('/rooms/join', { shortCode: joinCode.trim().toUpperCase() });
            toast.success('Successfully joined room!');
            setShowJoinModal(false);
            setJoinCode('');
            fetchRooms();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to join room');
        } finally {
            setJoining(false);
        }
    };

    const copyRoomCode = (shortCode) => {
        navigator.clipboard.writeText(shortCode);
        toast.success('Room code copied!');
    };

    const getRoleInRoom = (room) => {
        const userId = user?._id?.toString() || user?._id;
        const ownerId = room.owner?._id?.toString() || room.owner?._id;
        if (ownerId === userId) return 'Owner';
        if (room.coOrganisers?.some(co => (co._id?.toString() || co._id) === userId)) return 'Co-Organiser';
        return 'Participant';
    };

    if (loading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="min-h-screen bg-dark-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">My Rooms</h1>
                        <p className="text-gray-400 mt-1">
                            {isOrganiser
                                ? 'Create and manage your private contest rooms'
                                : 'View and join contest rooms'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <LogIn className="w-5 h-5" />
                            Join Room
                        </button>
                        {isOrganiser && (
                            <Link to="/rooms/create" className="btn-primary flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                Create Room
                            </Link>
                        )}
                    </div>
                </div>

                {/* Rooms Grid */}
                {rooms.length === 0 ? (
                    <div className="card text-center py-16">
                        <DoorOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Rooms Yet</h3>
                        <p className="text-gray-400 mb-6">
                            {isOrganiser
                                ? "You haven't created or joined any rooms yet"
                                : "You haven't joined any rooms yet"}
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="btn-secondary"
                            >
                                Join with Code
                            </button>
                            {isOrganiser && (
                                <Link to="/rooms/create" className="btn-primary">
                                    Create Your First Room
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map((room) => (
                            <div
                                key={room._id}
                                className="card hover:border-primary-500/50 transition-all cursor-pointer group"
                                onClick={() => navigate(`/rooms/${room._id}`)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 rounded-xl">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getRoleInRoom(room) === 'Owner'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : getRoleInRoom(room) === 'Co-Organiser'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {getRoleInRoom(room)}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                                    {room.name}
                                </h3>

                                {room.description && (
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                        {room.description}
                                    </p>
                                )}

                                {/* Created by info */}
                                <div className="text-xs text-gray-500 mb-3">
                                    Created by: <span className="text-gray-400">{room.owner?.name || 'Unknown'}</span>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-dark-700">
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <Users className="w-4 h-4" />
                                        <span>{room.participantCount || room.participants?.length || 0} members</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyRoomCode(room.shortCode);
                                        }}
                                        className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                                    >
                                        <span className="font-mono">{room.shortCode}</span>
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="w-5 h-5 text-primary-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Join Room Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h2 className="text-xl font-bold text-white mb-4">Join a Room</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Enter the 6-character room code shared by your organiser
                        </p>

                        <form onSubmit={handleJoinRoom}>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="ABCD12"
                                maxLength={6}
                                className="input-field w-full text-center text-2xl tracking-widest font-mono mb-6"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowJoinModal(false);
                                        setJoinCode('');
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={joining || joinCode.length < 6}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {joining ? 'Joining...' : 'Join Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyRooms;
