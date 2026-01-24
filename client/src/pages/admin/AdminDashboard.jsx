import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import contestService from '../../services/contestService';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import {
  Plus,
  Trophy,
  Users,
  Calendar,
  Code,
  FileQuestion,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  UserCheck,
  Clock,
  ClipboardList,
  StopCircle,
  CheckSquare,
  Globe,
  DoorOpen
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, isAdmin, isAdminOrOrganiser } = useAuth();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContests: 0,
    liveContests: 0,
    totalParticipants: 0,
    upcomingContests: 0
  });

  useEffect(() => {
    if (!isAdminOrOrganiser) {
      toast.error('Access denied. Admin or Organiser only.');
      navigate('/');
      return;
    }
    fetchContests();
  }, [isAdminOrOrganiser]);

  const fetchContests = async () => {
    try {
      // Use admin endpoint which filters by owner for organisers
      const response = await api.get('/contests/admin');
      setContests(response.data.contests);
      setStats(response.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
      setLoading(false);
    }
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm('Are you sure you want to delete this contest? This action cannot be undone.')) {
      return;
    }

    try {
      await contestService.deleteContest(contestId);
      toast.success('Contest deleted successfully');
      fetchContests();
    } catch (error) {
      console.error('Error deleting contest:', error);
      toast.error(error.response?.data?.message || 'Failed to delete contest');
    }
  };

  const handleEndContest = async (contestId, contestTitle) => {
    const confirmed = window.confirm(
      `⚠️ END CONTEST: "${contestTitle}"\n\n` +
      `This will:\n` +
      `• Set the contest end time to NOW\n` +
      `• Auto-submit all active participants with their current progress\n\n` +
      `This action CANNOT be undone. Are you sure?`
    );

    if (!confirmed) return;

    try {
      const response = await api.post(`/contests/${contestId}/end`);
      toast.success(response.data.message);
      fetchContests();
    } catch (error) {
      console.error('Error ending contest:', error);
      toast.error(error.response?.data?.message || 'Failed to end contest');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'UPCOMING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'ENDED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getContestStatus = (contest) => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    if (now < startTime) return 'UPCOMING';
    if (now >= startTime && now <= endTime) return 'LIVE';
    return 'ENDED';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {isAdmin ? 'Admin Dashboard' : 'Organiser Dashboard'}
            </h1>
            <p className="text-gray-400">Manage contests, MCQs, and coding problems</p>
          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="btn-secondary flex items-center"
                >
                  <UserCheck className="w-5 h-5 mr-2" />
                  Manage Users
                </button>
                <button
                  onClick={() => navigate('/admin/verify-contests')}
                  className="btn-secondary flex items-center"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Pending Approvals
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/admin/contest/create')}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Contest
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Contests</p>
                <p className="text-3xl font-bold">{stats.totalContests}</p>
              </div>
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Live Contests</p>
                <p className="text-3xl font-bold text-green-400">{stats.liveContests}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Upcoming</p>
                <p className="text-3xl font-bold text-blue-400">{stats.upcomingContests}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Participants</p>
                <p className="text-3xl font-bold text-purple-400">{stats.totalParticipants}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Contests Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">All Contests</h2>
          </div>

          {contests.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No contests created yet</p>
              <button
                onClick={() => navigate('/admin/contest/create')}
                className="btn-primary"
              >
                Create Your First Contest
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Contest</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Host</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Start - End</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Duration</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Participants</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Room</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Sections</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map((contest) => (
                    <tr key={contest._id} className="border-b border-dark-700 hover:bg-dark-700/30">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-white">{contest.title}</p>
                          <p className="text-sm text-gray-400 line-clamp-1">{contest.description}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300 text-sm">{contest.createdBy?.name || 'Admin'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`badge border ${getStatusColor(contest.status)}`}>
                            {contest.status}
                          </span>
                          {contest.verificationStatus === 'PENDING' && (
                            <span className="badge border bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                              PENDING
                            </span>
                          )}
                          {contest.verificationStatus === 'REJECTED' && (
                            <span className="badge border bg-red-500/20 text-red-400 border-red-500/50">
                              REJECTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        <div className="text-xs">
                          <div>{new Date(contest.startTime).toLocaleDateString()} {new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="text-gray-500">to</div>
                          <div>{new Date(contest.endTime).toLocaleDateString()} {new Date(contest.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {contest.duration} min
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-semibold">
                            {contest.participants?.length || 0}
                          </span>
                          {contest.maxParticipants && (
                            <span className="text-gray-400">/ {contest.maxParticipants}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {contest.roomId ? (
                          <Link
                            to={`/rooms/${contest.roomId._id}`}
                            className="flex flex-col items-start gap-0.5 hover:opacity-80 transition-opacity"
                          >
                            <span className="flex items-center gap-1 text-primary-400">
                              <DoorOpen className="w-4 h-4" />
                            </span>
                            <span className="text-primary-400 text-xs underline">
                              {contest.roomId.name || 'Room'}
                            </span>
                          </Link>
                        ) : (
                          <span className="flex flex-col items-start gap-0.5">
                            <span className="flex items-center gap-1 text-green-400">
                              <Globe className="w-4 h-4" />
                            </span>
                            <span className="text-green-400 text-xs">Public</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {contest.sections?.mcq?.enabled && (
                            <span className="badge-info text-xs">
                              <FileQuestion className="w-3 h-3 inline mr-1" />
                              MCQ
                            </span>
                          )}
                          {contest.sections?.coding?.enabled && (
                            <span className="badge-success text-xs">
                              <Code className="w-3 h-3 inline mr-1" />
                              Coding
                            </span>
                          )}
                          {contest.sections?.forms?.enabled && (
                            <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-xs">
                              <ClipboardList className="w-3 h-3 inline mr-1" />
                              Forms
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/contest/${contest._id}`)}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </button>

                          <button
                            onClick={() => navigate(`/leaderboard/${contest._id}`)}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                            title="Leaderboard"
                          >
                            <BarChart3 className="w-4 h-4 text-green-400" />
                          </button>

                          {/* End Contest button - only show for LIVE contests */}
                          {getContestStatus(contest) === 'LIVE' && (
                            <button
                              onClick={() => handleEndContest(contest._id, contest.title)}
                              className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                              title="End Contest Now"
                            >
                              <StopCircle className="w-4 h-4 text-red-400" />
                            </button>
                          )}

                          {/* MCQ button - only show if MCQ section is enabled */}
                          {contest.sections?.mcq?.enabled && (
                            <button
                              onClick={() => navigate(`/admin/contest/mcq/${contest._id}`)}
                              className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${!isAdmin && contest.verificationStatus === 'APPROVED' && !contest.roomId ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              title="Manage MCQs"
                              disabled={!isAdmin && contest.verificationStatus === 'APPROVED' && !contest.roomId}
                            >
                              <FileQuestion className="w-4 h-4 text-purple-400" />
                            </button>
                          )}

                          {/* Coding button - only show if Coding section is enabled */}
                          {contest.sections?.coding?.enabled && (
                            <button
                              onClick={() => navigate(`/admin/contest/coding/${contest._id}`)}
                              className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${!isAdmin && contest.verificationStatus === 'APPROVED' && !contest.roomId ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              title="Manage Coding Problems"
                              disabled={!isAdmin && contest.verificationStatus === 'APPROVED' && !contest.roomId}
                            >
                              <Code className="w-4 h-4 text-orange-400" />
                            </button>
                          )}

                          {/* Forms button - only show if Forms section is enabled */}
                          {contest.sections?.forms?.enabled && (
                            <button
                              onClick={() => navigate(`/admin/contest/forms/${contest._id}`)}
                              className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${!isAdmin && contest.verificationStatus === 'APPROVED' && !contest.roomId ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              title="Manage Forms"
                              disabled={!isAdmin && contest.verificationStatus === 'APPROVED' && !contest.roomId}
                            >
                              <ClipboardList className="w-4 h-4 text-cyan-400" />
                            </button>
                          )}

                          {/* Evaluate Forms button - show if Forms enabled and contest has ended or is live */}
                          {contest.sections?.forms?.enabled && (getContestStatus(contest) === 'LIVE' || getContestStatus(contest) === 'ENDED') && (
                            <button
                              onClick={() => navigate(`/admin/contest/evaluate/${contest._id}`)}
                              className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                              title="Evaluate Form Submissions"
                            >
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            </button>
                          )}

                          {/* Edit button - disabled for organisers on approved contests */}
                          <button
                            onClick={() => navigate(`/admin/contest/edit/${contest._id}`)}
                            className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${!isAdmin && contest.verificationStatus === 'APPROVED' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            title={!isAdmin && contest.verificationStatus === 'APPROVED' ? 'Locked - Contest Approved' : 'Edit'}
                            disabled={!isAdmin && contest.verificationStatus === 'APPROVED'}
                          >
                            <Edit className="w-4 h-4 text-yellow-400" />
                          </button>

                          {/* Delete button - disabled for organisers on approved contests */}
                          <button
                            onClick={() => handleDeleteContest(contest._id)}
                            className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${!isAdmin && contest.verificationStatus === 'APPROVED' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            title={!isAdmin && contest.verificationStatus === 'APPROVED' ? 'Locked - Contest Approved' : 'Delete'}
                            disabled={!isAdmin && contest.verificationStatus === 'APPROVED'}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <button
            onClick={() => navigate('/admin/contest/create')}
            className="card hover:border-primary-500 transition-colors text-left"
          >
            <Trophy className="w-8 h-8 text-primary-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">Create Contest</h3>
            <p className="text-gray-400 text-sm">Set up a new coding contest with MCQs and problems</p>
          </button>

          <button
            onClick={() => navigate('/admin/mcq-library')}
            className="card hover:border-purple-500 transition-colors text-left"
          >
            <FileQuestion className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">MCQ Library</h3>
            <p className="text-gray-400 text-sm">Manage reusable MCQ questions with categories</p>
          </button>

          <button
            onClick={() => navigate('/admin/coding-library')}
            className="card hover:border-orange-500 transition-colors text-left"
          >
            <Code className="w-8 h-8 text-orange-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">Coding Library</h3>
            <p className="text-gray-400 text-sm">Manage reusable coding problems with test cases</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
