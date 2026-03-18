import { useState, useEffect } from 'react';
import contestService from '../../services/contestService';
import ContestCard from '../../components/contest/ContestCard';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const ContestList = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchContests();
  }, [filter]);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'ALL' ? '' : filter;
      const data = await contestService.getAllContests(statusFilter);
      setContests(data.contests);
    } catch (error) {
      toast.error('Failed to fetch contests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterButtons = [
    { label: 'All', value: 'ALL' },
    { label: 'Live', value: 'LIVE' },
    { label: 'Upcoming', value: 'UPCOMING' },
    { label: 'Ended', value: 'ENDED' }
  ];

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="page-shell">
      <div className="section-shell">
        <div className="page-header">
          <h1 className="page-title">Contests</h1>
          <p className="page-subtitle">Browse current, upcoming, and completed rounds in one compact view.</p>
        </div>

        <div className="card mb-6 flex flex-wrap gap-3">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={filter === btn.value ? 'btn-primary' : 'btn-secondary'}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {contests.length === 0 ? (
          <div className="card py-12 text-center text-dark-300">
            No contests found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contests.map((contest) => (
              <ContestCard key={contest._id} contest={contest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestList;
