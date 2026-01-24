import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import Loader from '../../components/common/Loader';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const JoinRoom = () => {
    const { shortCode } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        if (shortCode && user) {
            joinRoomByLink();
        }
    }, [shortCode, user]);

    const joinRoomByLink = async () => {
        try {
            const { data } = await api.get(`/rooms/join/${shortCode}`);
            setRoomName(data.room.name);
            setStatus('success');
            setMessage(data.message);

            // Redirect to room after 2 seconds
            setTimeout(() => {
                navigate(`/rooms/${data.room._id}`);
            }, 2000);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to join room');
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
                <div className="card max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-white mb-4">Login Required</h2>
                    <p className="text-gray-400 mb-6">
                        You need to be logged in to join a room
                    </p>
                    <Link to="/login" className="btn-primary inline-block">
                        Login
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'loading') {
        return <Loader fullScreen />;
    }

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            <div className="card max-w-md w-full text-center">
                {status === 'success' ? (
                    <>
                        <div className="bg-green-500/20 p-4 rounded-full w-fit mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Successfully Joined!
                        </h2>
                        <p className="text-gray-400 mb-2">
                            You are now a member of <span className="text-primary-400">{roomName}</span>
                        </p>
                        <p className="text-gray-500 text-sm">
                            Redirecting to room...
                        </p>
                    </>
                ) : (
                    <>
                        <div className="bg-red-500/20 p-4 rounded-full w-fit mx-auto mb-6">
                            <XCircle className="w-12 h-12 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Unable to Join
                        </h2>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <Link
                            to="/rooms"
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go to My Rooms
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinRoom;
