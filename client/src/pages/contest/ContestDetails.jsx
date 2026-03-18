import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import contestService from '../../services/contestService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import { Calendar, Clock, Users, Award, FileText, Code2, CheckCircle, Play, ClipboardList } from 'lucide-react';
import { formatDate } from '../../utils/formatTime';
import toast from 'react-hot-toast';
import api from '../../services/authService';

const statusClassMap = {
  LIVE: 'badge-primary',
  UPCOMING: 'badge-neutral',
  ENDED: 'badge-neutral',
};

const ContestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [starting, setStarting] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!contest || contest.status !== 'UPCOMING') {
      setCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const now = new Date().getTime();
      const startTime = new Date(contest.startTime).getTime();
      const diff = startTime - now;

      if (diff <= 0) {
        setCountdown(null);
        fetchContestDetails();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  useEffect(() => {
    fetchContestDetails();
    if (isAuthenticated) {
      fetchUserProgress();
      fetchRegistrationStatus();
    }
  }, [id, isAuthenticated]);

  const fetchContestDetails = async () => {
    try {
      const data = await contestService.getContestById(id);
      setContest(data.contest);
    } catch (error) {
      toast.error('Failed to fetch contest details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const response = await api.get(`/contests/${id}/progress`);
      setUserProgress(response.data.progress);
    } catch {
      setUserProgress(null);
    }
  };

  const fetchRegistrationStatus = async () => {
    try {
      const response = await api.get(`/contests/${id}/registration-status`);
      setRegistrationStatus(response.data);
    } catch {
      setRegistrationStatus(null);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to register');
      navigate('/login');
      return;
    }

    try {
      setRegistering(true);
      await api.post(`/contests/${id}/register`);
      toast.success('Successfully registered for contest');
      await fetchRegistrationStatus();
      await fetchContestDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleStartContest = async () => {
    try {
      setStarting(true);
      await api.post(`/contests/${id}/start`);
      navigate(`/contest/${id}/hub`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start contest');
      setStarting(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  if (!contest) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="card text-center text-dark-300">Contest not found.</div>
      </div>
    );
  }

  const isRegistered = registrationStatus?.isRegistered || false;
  const isLive = contest.status === 'LIVE';
  const isEnded = contest.status === 'ENDED';

  const infoItems = [
    { icon: Calendar, label: 'Start time', value: formatDate(contest.startTime) },
    { icon: Calendar, label: 'End time', value: formatDate(contest.endTime) },
    { icon: Clock, label: 'Duration', value: `${contest.duration} minutes` },
    { icon: Users, label: 'Participants', value: `${contest.participants?.length || 0} registered` },
    {
      icon: Award,
      label: 'Total marks',
      value: `${(contest.sections.mcq?.totalMarks || 0) + (contest.sections.coding?.totalMarks || 0) + (contest.sections.forms?.totalMarks || 0)} points`
    },
  ];

  return (
    <div className="page-shell">
      <div className="section-shell max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={statusClassMap[contest.status] || 'badge-neutral'}>{contest.status}</span>
          <span className="text-sm text-dark-400">Hosted by {contest.createdBy?.name || 'Admin'}</span>
        </div>

        <section className="card space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-dark-50 sm:text-4xl">{contest.title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-dark-300 sm:text-base">{contest.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="surface-muted p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl    ">
                  <Icon className="h-5 w-5 text-primary-500" />
                </div>
                <div className="text-xs uppercase tracking-[0.12em] text-dark-400">{label}</div>
                <div className="mt-1 text-sm font-semibold text-dark-50">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {contest.sections.mcq?.enabled && (
              <div className="surface-muted p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl    ">
                  <FileText className="h-5 w-5 text-primary-500" />
                </div>
                <div className="font-semibold text-dark-50">MCQ section</div>
                <div className="mt-1 text-sm text-dark-300">{contest.sections.mcq.totalMarks} marks</div>
              </div>
            )}
            {contest.sections.coding?.enabled && (
              <div className="surface-muted p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl    ">
                  <Code2 className="h-5 w-5 text-primary-500" />
                </div>
                <div className="font-semibold text-dark-50">Coding section</div>
                <div className="mt-1 text-sm text-dark-300">{contest.sections.coding.totalMarks} marks</div>
              </div>
            )}
            {contest.sections.forms?.enabled && (
              <div className="surface-muted p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl    ">
                  <ClipboardList className="h-5 w-5 text-primary-500" />
                </div>
                <div className="font-semibold text-dark-50">Forms section</div>
                <div className="mt-1 text-sm text-dark-300">{contest.sections.forms.totalMarks} marks</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {!isRegistered && !isEnded && (
              <button onClick={handleRegister} disabled={registering} className="btn-primary w-full sm:w-auto">
                {registering ? 'Registering...' : 'Register for contest'}
              </button>
            )}

            {isRegistered && !isEnded && userProgress?.status !== 'SUBMITTED' && (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary-500">
                  <CheckCircle className="h-4 w-4" />
                  Registered
                </div>

                {contest.status === 'UPCOMING' && countdown && (
                  <div className="surface-muted p-4">
                    <p className="mb-3 text-sm text-dark-300">Contest starts in</p>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        ['Days', countdown.days],
                        ['Hours', String(countdown.hours).padStart(2, '0')],
                        ['Minutes', String(countdown.minutes).padStart(2, '0')],
                        ['Seconds', String(countdown.seconds).padStart(2, '0')],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-dark-700 bg-dark-950 p-3 text-center">
                          <div className="text-xl font-bold text-primary-500">{value}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-dark-400">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isLive && (
                  <button onClick={handleStartContest} disabled={starting} className="btn-primary">
                    <Play className="h-4 w-4" />
                    {starting ? 'Starting...' : 'Start contest'}
                  </button>
                )}
              </div>
            )}

            {isRegistered && userProgress?.status === 'SUBMITTED' && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate(`/leaderboard/${id}`)} className="btn-primary">
                  View leaderboard
                </button>
                <button onClick={() => navigate(`/contest/${id}/review`)} className="btn-secondary">
                  Review answers
                </button>
              </div>
            )}

            {isEnded && !userProgress?.status && (
              <button onClick={() => navigate(`/leaderboard/${id}`)} className="btn-primary">
                View leaderboard
              </button>
            )}
          </div>
        </section>

        {contest.rules && contest.rules.length > 0 && (
          <section className="card">
            <h2 className="mb-4 text-xl font-semibold text-dark-50">Contest rules</h2>
            <ul className="space-y-3 text-sm text-dark-300">
              {contest.rules.map((rule, index) => (
                <li key={index} className="flex gap-3">
                  <span className="text-primary-500">{String(index + 1).padStart(2, '0')}</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default ContestDetails;
