import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../services/authService';
import toast from 'react-hot-toast';

const AcceptInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const [roomId, setRoomId] = useState(null);

    useEffect(() => {
        const acceptInvite = async () => {
            try {
                const response = await api.post(`/rooms/accept-invite/${token}`);
                setStatus('success');
                setMessage(response.data.message);
                setRoomId(response.data.roomId);
                toast.success(response.data.message);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to accept invitation');
                toast.error(error.response?.data?.message || 'Failed to accept invitation');
            }
        };

        if (token) {
            acceptInvite();
        }
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 px-4">
            <div className="card max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 animate-spin text-primary-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Processing Invitation</h2>
                        <p className="text-gray-400">Please wait while we process your invitation...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Invitation Accepted!</h2>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <div className="space-y-3">
                            {roomId && (
                                <button
                                    onClick={() => navigate(`/rooms/${roomId}`)}
                                    className="btn-primary block w-full"
                                >
                                    Go to Room
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="btn-secondary block w-full"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Invitation Failed</h2>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="btn-primary block w-full"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="btn-secondary block w-full"
                            >
                                Go Home
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AcceptInvite;
