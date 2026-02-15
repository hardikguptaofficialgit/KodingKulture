import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/authService';
import Loader from '../../components/common/Loader';
import {
    Users, UserCheck, UserX, Clock, CheckCircle, XCircle,
    AlertTriangle, ArrowLeft, Calendar, Mail, Building2, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';

const ContestParticipants = () => {
    const { contestId } = useParams();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchParticipants();
    }, [contestId]);

    const fetchParticipants = async () => {
        try {
            const response = await api.get(`/contests/${contestId}/participants`);
            if (response.data.success) {
                setStats(response.data.stats);
                setParticipants(response.data.participants);
            }
        } catch (error) {
            toast.error('Failed to fetch participants');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status, terminationReason) => {
        if (terminationReason === 'MALPRACTICE') {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    MALPRACTICE
                </span>
            );
        }
        switch (status) {
            case 'SUBMITTED':
                return (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        SUBMITTED
                    </span>
                );
            case 'TIMED_OUT':
                return (
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        TIMED OUT
                    </span>
                );
            case 'IN_PROGRESS':
                return (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        IN PROGRESS
                    </span>
                );
            case 'REGISTERED':
                return (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        REGISTERED
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">
                        {status || 'UNKNOWN'}
                    </span>
                );
        }
    };

    const filteredParticipants = participants.filter(p => {
        if (filter === 'ALL') return true;
        if (filter === 'REGISTERED') return p.status === 'REGISTERED';
        if (filter === 'IN_PROGRESS') return p.status === 'IN_PROGRESS';
        if (filter === 'SUBMITTED') return p.status === 'SUBMITTED';
        if (filter === 'TIMED_OUT') return p.status === 'TIMED_OUT';
        if (filter === 'MALPRACTICE') return p.terminationReason === 'MALPRACTICE';
        return true;
    });

    if (loading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="min-h-screen bg-dark-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/admin/dashboard"
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-xl sm:text-3xl font-bold gradient-text flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-500" />
                        Contest Participants
                    </h1>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-purple-400">{stats.totalRegistered}</div>
                            <div className="text-xs text-gray-400">Registered</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400">{stats.totalStarted}</div>
                            <div className="text-xs text-gray-400">Started</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{stats.totalSubmitted}</div>
                            <div className="text-xs text-gray-400">Submitted</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-orange-400">{stats.totalTimedOut}</div>
                            <div className="text-xs text-gray-400">Timed Out</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-red-400">{stats.totalMalpractice}</div>
                            <div className="text-xs text-gray-400">Malpractice</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-gray-400">{stats.notStarted}</div>
                            <div className="text-xs text-gray-400">Not Started</div>
                        </div>
                    </div>
                )}

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['ALL', 'REGISTERED', 'IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT', 'MALPRACTICE'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                                }`}
                        >
                            {f.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Participants Table */}
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-dark-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Registered At</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Started At</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Submitted At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {filteredParticipants.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            No participants found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredParticipants.map((participant, index) => (
                                        <tr key={participant.user.id} className="hover:bg-dark-800/50">
                                            <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <div className="font-medium text-white">{participant.user.name}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {participant.user.email}
                                                    </div>
                                                    {participant.user.college && (
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                            <Building2 className="w-3 h-3" />
                                                            {participant.user.college}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(participant.status, participant.terminationReason)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">
                                                {formatDateTime(participant.registeredAt)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">
                                                {formatDateTime(participant.startedAt)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">
                                                {formatDateTime(participant.submittedAt)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContestParticipants;
