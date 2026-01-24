import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Award, User } from 'lucide-react';
import { formatDate } from '../../utils/formatTime';
import { CONTEST_STATUS } from '../../utils/constants';

const ContestCard = ({ contest }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case CONTEST_STATUS.LIVE:
        return <span className="badge-success">🔴 LIVE</span>;
      case CONTEST_STATUS.UPCOMING:
        return <span className="badge-warning">🕒 UPCOMING</span>;
      case CONTEST_STATUS.ENDED:
        return <span className="badge-error">✓ ENDED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="card-hover group">
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4">
        {getStatusBadge(contest.status)}
        <span className="text-sm text-gray-400">
          {contest.duration} mins
        </span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-primary-500 transition-colors">
        {contest.title}
      </h3>

      {/* Host Name */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <User className="w-3 h-3" />
        <span>Hosted by {contest.createdBy?.name || 'Admin'}</span>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {contest.description}
      </p>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4 text-primary-500" />
          <span>{new Date(contest.startTime).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4 text-green-500" />
          <span>{new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4 text-red-400" />
          <span>{new Date(contest.endTime).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4 text-red-400" />
          <span>{new Date(contest.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4 text-primary-500" />
          <span>{contest.participants?.length || 0} participants</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Award className="w-4 h-4 text-primary-500" />
          <span>{(contest.sections?.mcq?.totalMarks || 0) + (contest.sections?.coding?.totalMarks || 0)} pts</span>
        </div>
      </div>

      {/* Action Button */}
      <Link
        to={`/contest/${contest._id}`}
        className="block w-full btn-primary text-center"
      >
        {contest.status === CONTEST_STATUS.LIVE ? 'Enter Contest' : 'View Details'}
      </Link>
    </div>
  );
};

export default ContestCard;
