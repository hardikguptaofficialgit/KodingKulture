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
  const { isAdmin, isAdminOrOrganiser } = useAuth();
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
      const response = await api.get('/contests/admin');
      setContests(response.data.contests);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    } finally {
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
      `End contest "${contestTitle}" now? This will submit all active participants with their current progress.`
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
      <div className="page-shell flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-dark-700 border-t-primary-500"></div>
      </div>
    );
  }

  const statCards = [
    { icon: Trophy, label: 'Total contests', value: stats.totalContests },
    { icon: Calendar, label: 'Live contests', value: stats.liveContests },
    { icon: Clock, label: 'Upcoming contests', value: stats.upcomingContests },
    { icon: Users, label: 'Participants', value: stats.totalParticipants },
  ];

  return (
    <div className="page-shell">
      <div className="section-shell space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">{isAdmin ? 'Admin dashboard' : 'Organiser dashboard'}</h1>
            <p className="page-subtitle">Manage contests, question banks, participants, and reviews from one place.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <button onClick={() => navigate('/admin/users')} className="btn-secondary">
                  <UserCheck className="h-4 w-4" />
                  Users
                </button>
                <button onClick={() => navigate('/admin/verify-contests')} className="btn-secondary">
                  <Clock className="h-4 w-4" />
                  Approvals
                </button>
              </>
            )}
            <button onClick={() => navigate('/admin/contest/create')} className="btn-primary">
              <Plus className="h-4 w-4" />
              Create contest
            </button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="card">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl    ">
                <Icon className="h-5 w-5 text-primary-500" />
              </div>
              <div className="text-sm text-dark-300">{label}</div>
              <div className="mt-1 text-2xl font-bold text-dark-50">{value}</div>
            </div>
          ))}
        </section>

        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Contest</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Participants</th>
                <th>Access</th>
                <th>Sections</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => (
                <tr key={contest._id}>
                  <td>
                    <div className="space-y-1">
                      <div className="font-semibold text-dark-50">{contest.title}</div>
                      <div className="text-xs text-dark-400">{contest.createdBy?.name || 'Admin'}</div>
                      <div className="max-w-xs text-xs text-dark-300">{contest.description}</div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <span className={contest.status === 'LIVE' ? 'badge-primary' : 'badge-neutral'}>{contest.status}</span>
                      {contest.verificationStatus && <span className="badge-neutral">{contest.verificationStatus}</span>}
                    </div>
                  </td>
                  <td className="text-dark-300">
                    <div>{new Date(contest.startTime).toLocaleDateString()}</div>
                    <div className="text-xs text-dark-400">{new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="mt-2">{new Date(contest.endTime).toLocaleDateString()}</div>
                    <div className="text-xs text-dark-400">{new Date(contest.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-dark-50">{contest.participants?.length || 0}</div>
                    {contest.maxParticipants && <div className="text-xs text-dark-400">max {contest.maxParticipants}</div>}
                  </td>
                  <td>
                    {contest.roomId ? (
                      <Link to={`/rooms/${contest.roomId._id}`} className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400">
                        <DoorOpen className="h-4 w-4" />
                        {contest.roomId.name || 'Room'}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-dark-300">
                        <Globe className="h-4 w-4 text-primary-500" />
                        Public
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {contest.sections?.mcq?.enabled && <span className="badge-neutral">MCQ</span>}
                      {contest.sections?.coding?.enabled && <span className="badge-neutral">Coding</span>}
                      {contest.sections?.forms?.enabled && <span className="badge-neutral">Forms</span>}
                    </div>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`/contest/${contest._id}`)} className="btn-icon" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => navigate(`/leaderboard/${contest._id}`)} className="btn-icon" title="Leaderboard">
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      {getContestStatus(contest) === 'LIVE' && (
                        <button onClick={() => handleEndContest(contest._id, contest.title)} className="btn-icon" title="End contest">
                          <StopCircle className="h-4 w-4" />
                        </button>
                      )}
                      {contest.sections?.mcq?.enabled && (
                        <button onClick={() => navigate(`/admin/contest/mcq/${contest._id}`)} className="btn-icon" title="Manage MCQs">
                          <FileQuestion className="h-4 w-4" />
                        </button>
                      )}
                      {contest.sections?.coding?.enabled && (
                        <button onClick={() => navigate(`/admin/contest/coding/${contest._id}`)} className="btn-icon" title="Manage coding">
                          <Code className="h-4 w-4" />
                        </button>
                      )}
                      {contest.sections?.forms?.enabled && (
                        <>
                          <button onClick={() => navigate(`/admin/contest/forms/${contest._id}`)} className="btn-icon" title="Manage forms">
                            <ClipboardList className="h-4 w-4" />
                          </button>
                          {(getContestStatus(contest) === 'LIVE' || getContestStatus(contest) === 'ENDED') && (
                            <button onClick={() => navigate(`/admin/contest/evaluate/${contest._id}`)} className="btn-icon" title="Evaluate forms">
                              <CheckSquare className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => navigate(`/admin/contest/edit/${contest._id}`)} className="btn-icon" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteContest(contest._id)} className="btn-icon" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <button onClick={() => navigate('/admin/contest/create')} className="card-hover text-left">
            <Trophy className="mb-4 h-6 w-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Create contest</h2>
            <p className="mt-2 text-sm text-dark-300">Build a new round with coding, MCQ, and forms sections.</p>
          </button>
          <button onClick={() => navigate('/admin/mcq-library')} className="card-hover text-left">
            <FileQuestion className="mb-4 h-6 w-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">MCQ library</h2>
            <p className="mt-2 text-sm text-dark-300">Maintain reusable question banks in the same theme.</p>
          </button>
          <button onClick={() => navigate('/admin/coding-library')} className="card-hover text-left">
            <Code className="mb-4 h-6 w-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Coding library</h2>
            <p className="mt-2 text-sm text-dark-300">Manage reusable programming problems and test cases.</p>
          </button>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
