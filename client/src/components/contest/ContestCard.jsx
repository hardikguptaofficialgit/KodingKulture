import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Award, User } from 'lucide-react';
import { CONTEST_STATUS } from '../../utils/constants';

const statusMap = {
  [CONTEST_STATUS.LIVE]: { label: 'Live', className: 'badge-primary' },
  [CONTEST_STATUS.UPCOMING]: { label: 'Upcoming', className: 'badge-neutral' },
  [CONTEST_STATUS.ENDED]: { label: 'Ended', className: 'badge-neutral' },
};

const ContestCard = ({ contest }) => {
  const status = statusMap[contest.status];

  return (
    <article className="card-hover flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        {status ? <span className={status.className}>{status.label}</span> : <span />}
        <span className="text-sm text-dark-400">{contest.duration} mins</span>
      </div>

      <h3 className="text-xl font-semibold text-dark-50">{contest.title}</h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-dark-400">
        <User className="h-4 w-4" />
        <span>Hosted by {contest.createdBy?.name || 'Admin'}</span>
      </div>

      <p className="mt-4 flex-1 text-sm leading-6 text-dark-300">
        {contest.description}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-dark-300">
        <div className="surface-muted flex items-center gap-2 p-3">
          <Calendar className="h-4 w-4 text-primary-500" />
          <span>{new Date(contest.startTime).toLocaleDateString()}</span>
        </div>
        <div className="surface-muted flex items-center gap-2 p-3">
          <Clock className="h-4 w-4 text-primary-500" />
          <span>{new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="surface-muted flex items-center gap-2 p-3">
          <Users className="h-4 w-4 text-primary-500" />
          <span>{contest.participants?.length || 0} joined</span>
        </div>
        <div className="surface-muted flex items-center gap-2 p-3">
          <Award className="h-4 w-4 text-primary-500" />
          <span>{(contest.sections?.mcq?.totalMarks || 0) + (contest.sections?.coding?.totalMarks || 0)} pts</span>
        </div>
      </div>

      <Link to={`/contest/${contest._id}`} className="btn-primary mt-5 w-full">
        {contest.status === CONTEST_STATUS.LIVE ? 'Enter contest' : 'View details'}
      </Link>
    </article>
  );
};

export default ContestCard;
