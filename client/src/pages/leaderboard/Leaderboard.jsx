import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import leaderboardService from '../../services/leaderboardService';
import api from '../../services/authService';
import Loader from '../../components/common/Loader';
import {
  Trophy, Medal, Award, TrendingUp, ChevronDown, ChevronUp,
  ArrowLeft, FileText, Code, Timer, Clock, Shield, Users, ClipboardList, Download,
  CheckCircle, XCircle, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';


const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

const Leaderboard = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrOrganiser = user?.role === 'ADMIN' || user?.role === 'ORGANISER';

  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    fetchStats();
  }, [contestId]);

  const [formsEnabled, setFormsEnabled] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const data = await leaderboardService.getLeaderboard(contestId);
      setLeaderboard(data.leaderboard);
      setFormsEnabled(data.formsEnabled || false);
    } catch (error) {
      toast.error('Failed to fetch leaderboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await leaderboardService.getContestStats(contestId);
      setStats(data.stats);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUserDetails = async (userId) => {
    if (!isAdminOrOrganiser) return;

    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserDetails(null);
      return;
    }

    setExpandedUser(userId);
    setLoadingDetails(true);

    try {
      const response = await api.get(`/leaderboard/${contestId}/user/${userId}/details`);
      setUserDetails(response.data.userDetails);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>;
    }
  };

  // Export leaderboard to CSV
  const exportToCSV = () => {
    if (!leaderboard || leaderboard.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Build CSV headers
    let headers = ['Rank', 'Name', 'Email', 'College', 'MCQ Score', 'Coding Score'];
    if (formsEnabled) {
      headers.push('Forms Score');
    }
    headers.push('Total Score', 'Time Taken', 'Status');

    // Build CSV rows
    const rows = leaderboard.map((entry, index) => {
      const row = [
        index + 1,
        entry.userId?.name || 'Unknown',
        entry.userId?.email || '',
        entry.userId?.college || '',
        entry.mcqScore || 0,
        entry.codingScore || 0
      ];
      if (formsEnabled) {
        row.push(entry.formsScore || 0);
      }
      row.push(
        entry.totalScore || 0,
        formatTime(entry.totalTimeTaken),
        entry.status || 'N/A'
      );
      return row;
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaderboard_${contestId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Leaderboard exported successfully!');
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="min-h-screen bg-dark-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            {/* Admin/Organiser: View Participants & Violations Button */}
            {isAdminOrOrganiser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors border border-green-500/30"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <Link
                  to={`/admin/contest/${contestId}/participants`}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors border border-purple-500/30"
                >
                  <Users className="w-4 h-4" />
                  Participants
                </Link>
                <Link
                  to={`/admin/contest/${contestId}/violations`}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                >
                  <Shield className="w-4 h-4" />
                  Violations
                </Link>
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-primary-500" />
            Leaderboard
          </h1>
          {stats && <p className="text-gray-400">{stats.contestTitle}</p>}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-500 mb-2">{stats.totalParticipants}</div>
              <div className="text-gray-400">Total Participants</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">{stats.submitted}</div>
              <div className="text-gray-400">Submitted</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">{stats.averageScore?.toFixed(1) || 0}</div>
              <div className="text-gray-400">Average Score</div>
            </div>
          </div>
        )}

        {/* Admin Hint */}
        {isAdminOrOrganiser && (
          <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg text-sm text-primary-400">
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Click on any participant row to view detailed time breakdown per question and section
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="card overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800 border-b border-dark-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Participant</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">MCQ Score</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Coding Score</th>
                    {formsEnabled && <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Forms Score</th>}
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Total Score</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Time Taken</th>
                    {isAdminOrOrganiser && <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Details</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {leaderboard.map((entry, index) => (
                    <React.Fragment key={entry._id}>
                      <tr
                        className={`hover:bg-dark-800 transition-colors ${entry.rank <= 3 ? 'bg-primary-500/5' : ''
                          } ${isAdminOrOrganiser ? 'cursor-pointer' : ''}`}
                        onClick={() => isAdminOrOrganiser && fetchUserDetails(entry.userId?._id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {entry.userId?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{entry.userId?.name}</div>
                              {isAdminOrOrganiser && <div className="text-sm text-gray-500">{entry.userId?.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-blue-400 font-semibold">{entry.mcqScore || 0}</td>
                        <td className="px-6 py-4 text-center text-green-400 font-semibold">{entry.codingScore || 0}</td>
                        {formsEnabled && (
                          <td className="px-6 py-4 text-center">
                            {entry.isFormsEvaluated ? (
                              <span className="text-cyan-400 font-semibold">{entry.formsScore || 0}</span>
                            ) : (
                              <span className="text-yellow-400 text-sm">Pending</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-primary-500 text-lg">{entry.totalScore}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-400">
                          {formatTime(entry.timeTaken)}
                        </td>
                        {isAdminOrOrganiser && (
                          <td className="px-6 py-4 text-center">
                            {expandedUser === entry.userId?._id ? (
                              <ChevronUp className="w-5 h-5 text-primary-400 mx-auto" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400 mx-auto" />
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Expanded Details Row (Admin Only) */}
                      {isAdminOrOrganiser && expandedUser === entry.userId?._id && (
                        <tr key={`${entry._id}-details`}>
                          <td colSpan={5 + (formsEnabled ? 1 : 0) + (isAdminOrOrganiser ? 1 : 0)} className="bg-dark-800/80 p-6">
                            {loadingDetails ? (
                              <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                              </div>
                            ) : userDetails ? (
                              <div className="space-y-6">
                                {/* View Answers Button */}
                                <div className="flex justify-end">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/contest/${contestId}/user/${entry.userId?._id}/answers`);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Full Answers
                                  </button>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-5 gap-4">
                                  <div className="bg-dark-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                                      <FileText className="w-5 h-5" />
                                      <span className="font-semibold">MCQ Section</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{formatTime(userDetails.mcqSectionTime)}</p>
                                  </div>
                                  <div className="bg-dark-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-green-400 mb-2">
                                      <Code className="w-5 h-5" />
                                      <span className="font-semibold">Coding Section</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{formatTime(userDetails.codingSectionTime)}</p>
                                  </div>
                                  <div className="bg-dark-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                      <ClipboardList className="w-5 h-5" />
                                      <span className="font-semibold">Forms Section</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{formatTime(userDetails.formsSectionTime)}</p>
                                  </div>
                                  <div className="bg-dark-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-primary-400 mb-2">
                                      <Timer className="w-5 h-5" />
                                      <span className="font-semibold">Total Time</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{formatTime(userDetails.totalTimeSpent)}</p>
                                  </div>
                                  <div className="bg-dark-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                                      <Trophy className="w-5 h-5" />
                                      <span className="font-semibold">Final Score</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{userDetails.totalScore}</p>
                                  </div>
                                </div>

                                {/* Category Time Breakdown */}
                                <div className="grid grid-cols-2 gap-6">
                                  {/* MCQ Categories */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      MCQ Time by Category
                                    </h4>
                                    <div className="space-y-2">
                                      {Object.entries(userDetails.mcqCategoryTime || {}).map(([cat, time]) => (
                                        <div key={cat} className="flex justify-between items-center bg-dark-700/30 p-2 rounded">
                                          <span className="text-gray-300">{cat}</span>
                                          <span className="text-blue-400 font-mono">{formatTime(time)}</span>
                                        </div>
                                      ))}
                                      {Object.keys(userDetails.mcqCategoryTime || {}).length === 0 && (
                                        <p className="text-gray-500 text-sm">No category data</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Coding Categories */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                      <Code className="w-4 h-4" />
                                      Coding Time by Category
                                    </h4>
                                    <div className="space-y-2">
                                      {Object.entries(userDetails.codingCategoryTime || {}).map(([cat, time]) => (
                                        <div key={cat} className="flex justify-between items-center bg-dark-700/30 p-2 rounded">
                                          <span className="text-gray-300">{cat}</span>
                                          <span className="text-green-400 font-mono">{formatTime(time)}</span>
                                        </div>
                                      ))}
                                      {Object.keys(userDetails.codingCategoryTime || {}).length === 0 && (
                                        <p className="text-gray-500 text-sm">No category data</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Per Question/Problem Details */}
                                <div className="grid grid-cols-3 gap-6">
                                  {/* MCQ Questions */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3">MCQ Question Times</h4>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {(userDetails.mcqTimeDetails || []).map((q, i) => (
                                        <div key={i} className="flex justify-between items-center bg-dark-700/20 p-2 rounded text-sm">
                                          <span className="text-gray-400 truncate max-w-[200px]" title={q.questionText}>
                                            Q{i + 1}: {q.questionText}
                                          </span>
                                          <span className="text-blue-400 font-mono">{formatTime(q.timeSpent)}</span>
                                        </div>
                                      ))}
                                      {(userDetails.mcqTimeDetails || []).length === 0 && (
                                        <p className="text-gray-500 text-sm">No question data</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Coding Problems */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Coding Problem Times</h4>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {(userDetails.codingTimeDetails || []).map((p, i) => (
                                        <div key={i} className="flex justify-between items-center bg-dark-700/20 p-2 rounded text-sm">
                                          <span className="text-gray-400 truncate max-w-[200px]" title={p.title}>
                                            P{i + 1}: {p.title}
                                          </span>
                                          <span className="text-green-400 font-mono">{formatTime(p.timeSpent)}</span>
                                        </div>
                                      ))}
                                      {(userDetails.codingTimeDetails || []).length === 0 && (
                                        <p className="text-gray-500 text-sm">No problem data</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Forms */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Form Times</h4>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {(userDetails.formsTimeDetails || []).map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-dark-700/20 p-2 rounded text-sm">
                                          <span className="text-gray-400 truncate max-w-[200px]" title={f.title}>
                                            F{i + 1}: {f.title}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-cyan-400 font-mono">{formatTime(f.timeSpent)}</span>
                                            {f.isEvaluated ? (
                                              <span className="text-green-400 text-xs">{f.score}/{f.maxScore}</span>
                                            ) : (
                                              <span className="text-yellow-400 text-xs">Pending</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {(userDetails.formsTimeDetails || []).length === 0 && (
                                        <p className="text-gray-500 text-sm">No form data</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* MCQ Answer Details */}
                                {userDetails.mcqAnswerDetails && userDetails.mcqAnswerDetails.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      MCQ Answer Details
                                      <span className="text-xs text-gray-500">
                                        ({userDetails.mcqAnswerDetails.filter(q => q.isCorrect).length}/{userDetails.mcqAnswerDetails.length} correct)
                                      </span>
                                    </h4>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                      {userDetails.mcqAnswerDetails.map((q, i) => (
                                        <div key={i} className={`bg-dark-700/30 p-3 rounded-lg border-l-3 ${q.isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                                          }`}>
                                          <div className="flex items-start justify-between mb-2">
                                            <span className="text-gray-300 text-sm flex-1">
                                              <span className="text-gray-500 font-mono mr-2">Q{i + 1}</span>
                                              {q.questionText}
                                            </span>
                                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                              {q.isCorrect ? (
                                                <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                                                  <CheckCircle className="w-4 h-4" /> +{q.marksAwarded}
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                                                  <XCircle className="w-4 h-4" /> {q.marksAwarded}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-1">
                                            {q.options.map((opt, j) => (
                                              <div
                                                key={j}
                                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${opt.isCorrect && opt.wasSelected
                                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                  : opt.isCorrect
                                                    ? 'bg-green-500/10 text-green-400/70 border border-green-500/20'
                                                    : opt.wasSelected
                                                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                      : 'bg-dark-600/30 text-gray-500'
                                                  }`}
                                              >
                                                {opt.isCorrect && <CheckCircle className="w-3 h-3" />}
                                                {opt.wasSelected && !opt.isCorrect && <XCircle className="w-3 h-3" />}
                                                {opt.text}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Coding Submission Details */}
                                {userDetails.codingAnswerDetails && userDetails.codingAnswerDetails.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                      <Code className="w-4 h-4" />
                                      Coding Submission Details
                                      <span className="text-xs text-gray-500">
                                        ({userDetails.codingAnswerDetails.filter(p => p.solved).length}/{userDetails.codingAnswerDetails.length} solved)
                                      </span>
                                    </h4>
                                    <div className="space-y-3">
                                      {userDetails.codingAnswerDetails.map((p, i) => (
                                        <div key={i} className={`bg-dark-700/30 p-3 rounded-lg border-l-3 ${p.solved ? 'border-l-green-500' : 'border-l-yellow-500'
                                          }`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-500 font-mono text-sm">P{i + 1}</span>
                                              <span className="text-gray-200 font-medium text-sm">{p.title}</span>
                                              <span className="text-xs px-1.5 py-0.5 rounded bg-dark-600 text-gray-400">{p.category}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <span className={`text-sm font-bold ${p.bestScore >= p.maxScore ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {p.bestScore}/{p.maxScore}
                                              </span>
                                              <span className="text-xs text-gray-500">{p.totalAttempts} attempt{p.totalAttempts !== 1 ? 's' : ''}</span>
                                            </div>
                                          </div>
                                          {p.submissions && p.submissions.length > 0 && (
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                              {p.submissions.map((sub, j) => (
                                                <div key={j} className="flex items-center justify-between bg-dark-600/30 px-2 py-1 rounded text-xs">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 font-mono">#{j + 1}</span>
                                                    <span className={`px-1.5 py-0.5 rounded font-medium ${sub.verdict === 'ACCEPTED'
                                                      ? 'bg-green-500/20 text-green-400'
                                                      : sub.verdict === 'WRONG_ANSWER'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : sub.verdict === 'TIME_LIMIT_EXCEEDED'
                                                          ? 'bg-yellow-500/20 text-yellow-400'
                                                          : 'bg-orange-500/20 text-orange-400'
                                                      }`}>
                                                      {sub.verdict?.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-gray-500">{sub.language}</span>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-gray-400">
                                                      {sub.testcasesPassed}/{sub.totalTestcases} passed
                                                    </span>
                                                    <span className="text-gray-400 font-mono">
                                                      {sub.score} pts
                                                    </span>
                                                    <span className="text-gray-500">
                                                      {new Date(sub.submittedAt).toLocaleTimeString()}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center">Failed to load details</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-sm text-gray-400">
          <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-yellow-500" /> Gold</span>
          <span className="flex items-center gap-1"><Medal className="w-4 h-4 text-gray-400" /> Silver</span>
          <span className="flex items-center gap-1"><Award className="w-4 h-4 text-orange-600" /> Bronze</span>
        </div>
      </div>
    </div >
  );
};

export default Leaderboard;
