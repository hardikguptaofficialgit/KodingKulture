import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/authService';
import { Trophy, ChevronRight, Calendar, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const LeaderboardList = () => {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const response = await api.get('/contests');
      const now = new Date();
      const relevantContests = (response.data.contests || []).filter((contest) => {
        const endTime = new Date(contest.endTime);
        return endTime <= now || contest.status === 'COMPLETED';
      });
      setContests(relevantContests);
    } catch (error) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-dark-700 border-t-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="section-shell max-w-4xl">
        <div className="page-header">
          <h1 className="page-title">Leaderboards</h1>
          <p className="page-subtitle">Select a completed contest to inspect rankings and scores.</p>
        </div>

        <div className="space-y-3">
          {contests.length === 0 ? (
            <div className="card py-12 text-center">
              <Trophy className="mx-auto mb-4 h-10 w-10 text-soft-ui" />
              <p className="text-muted-ui">No completed contests yet.</p>
            </div>
          ) : (
            contests.map((contest) => (
              <button
                key={contest._id}
                onClick={() => navigate(`/leaderboard/${contest._id}`)}
                className="card-hover flex w-full items-center justify-between gap-4 text-left"
              >
                <div>
                  <h2 className="text-lg font-semibold text-strong">{contest.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-ui">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary-500" />
                      {new Date(contest.endTime).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary-500" />
                      {contest.participants?.length || 0} participants
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-soft-ui" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardList;
