import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import {
    ArrowLeft, FileText, Code, CheckCircle, XCircle, Trophy,
    Clock, ChevronDown, ChevronRight, Copy, Check, Terminal, MinusCircle
} from 'lucide-react';

const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

const UserAnswerReview = () => {
    const { contestId, userId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [userDetails, setUserDetails] = useState(null);
    const [contest, setContest] = useState(null);
    const [activeTab, setActiveTab] = useState('mcq');
    const [expandedSubmissions, setExpandedSubmissions] = useState({});
    const [sourceCodeCache, setSourceCodeCache] = useState({});
    const [loadingCode, setLoadingCode] = useState({});
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchData();
    }, [contestId, userId]);

    const fetchData = async () => {
        try {
            const [detailsRes, contestRes] = await Promise.all([
                api.get(`/leaderboard/${contestId}/user/${userId}/details`),
                api.get(`/contests/${contestId}`).catch(() => ({ data: { contest: null } }))
            ]);
            setUserDetails(detailsRes.data.userDetails);
            setContest(contestRes.data.contest);
        } catch (error) {
            console.error('Error fetching review data:', error);
            toast.error('Failed to load answer review data');
        } finally {
            setLoading(false);
        }
    };

    const toggleSubmission = async (submissionId) => {
        if (!submissionId) return;

        setExpandedSubmissions(prev => ({
            ...prev,
            [submissionId]: !prev[submissionId]
        }));

        // Fetch source code if not cached
        if (!sourceCodeCache[submissionId] && !loadingCode[submissionId]) {
            setLoadingCode(prev => ({ ...prev, [submissionId]: true }));
            try {
                const res = await api.get(`/submissions/${submissionId}`);
                setSourceCodeCache(prev => ({
                    ...prev,
                    [submissionId]: res.data.submission
                }));
            } catch (error) {
                console.error('Error fetching submission:', error);
                toast.error('Failed to load source code');
            } finally {
                setLoadingCode(prev => ({ ...prev, [submissionId]: false }));
            }
        }
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getVerdictColor = (verdict) => {
        switch (verdict) {
            case 'ACCEPTED': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'WRONG_ANSWER': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'TIME_LIMIT_EXCEEDED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'RUNTIME_ERROR': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'COMPILATION_ERROR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!userDetails) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 text-lg">Failed to load user details</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-primary-400 hover:text-primary-300">
                        ← Go back
                    </button>
                </div>
            </div>
        );
    }

    const mcqAnswers = userDetails.mcqAnswerDetails || [];
    const mcqCorrect = mcqAnswers.filter(q => q.isCorrect).length;
    const mcqUnanswered = mcqAnswers.filter(q => q.unanswered).length;
    const mcqTotal = mcqAnswers.length;
    const codingProblems = userDetails.codingAnswerDetails || [];
    const codingSolved = codingProblems.filter(p => p.solved).length;
    const codingUnanswered = codingProblems.filter(p => p.unanswered).length;
    const codingTotal = codingProblems.length;

    return (
        <div className="min-h-screen bg-dark-900">
            {/* Header */}
            <div className="bg-dark-800 border-b border-dark-700">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Leaderboard
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {userDetails.user?.name || 'Unknown User'}
                            </h1>
                            <p className="text-gray-400 mt-1">
                                {userDetails.user?.email} • {contest?.title || 'Contest'}
                            </p>
                        </div>

                        {/* Score Summary */}
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">MCQ Score</p>
                                <p className="text-xl font-bold text-blue-400">{userDetails.mcqScore}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Coding Score</p>
                                <p className="text-xl font-bold text-green-400">{userDetails.codingScore}</p>
                            </div>
                            <div className="text-center border-l border-dark-600 pl-6">
                                <p className="text-xs text-gray-500 uppercase">Total</p>
                                <p className="text-xl font-bold text-primary-400">{userDetails.totalScore}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Time</p>
                                <p className="text-xl font-bold text-gray-300">{formatTime(userDetails.totalTimeSpent)}</p>
                            </div>
                            {userDetails.rank && (
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase">Rank</p>
                                    <p className="text-xl font-bold text-yellow-400">#{userDetails.rank}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-6">
                        <button
                            onClick={() => setActiveTab('mcq')}
                            className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'mcq'
                                ? 'bg-dark-900 text-blue-400 border-t-2 border-blue-400'
                                : 'text-gray-400 hover:text-gray-300 hover:bg-dark-700/50'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            MCQ Answers
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'mcq' ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-600 text-gray-500'
                                }`}>
                                {mcqCorrect}/{mcqTotal}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('coding')}
                            className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'coding'
                                ? 'bg-dark-900 text-green-400 border-t-2 border-green-400'
                                : 'text-gray-400 hover:text-gray-300 hover:bg-dark-700/50'
                                }`}
                        >
                            <Code className="w-4 h-4" />
                            Coding Submissions
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'coding' ? 'bg-green-500/20 text-green-400' : 'bg-dark-600 text-gray-500'
                                }`}>
                                {codingSolved}/{codingTotal}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* MCQ Tab */}
                {activeTab === 'mcq' && (
                    <div className="space-y-4">
                        {(userDetails.mcqAnswerDetails || []).length === 0 ? (
                            <div className="bg-dark-800 rounded-xl p-12 text-center">
                                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No MCQ answers recorded</p>
                            </div>
                        ) : (
                            userDetails.mcqAnswerDetails.map((q, i) => (
                                <div
                                    key={i}
                                    className={`bg-dark-800 rounded-xl border overflow-hidden ${q.unanswered ? 'border-amber-500/20' : q.isCorrect ? 'border-green-500/20' : 'border-red-500/20'
                                        }`}
                                >
                                    {/* Question Header */}
                                    <div className={`px-6 py-4 border-b ${q.unanswered ? 'border-amber-500/10 bg-amber-500/5' : q.isCorrect ? 'border-green-500/10 bg-green-500/5' : 'border-red-500/10 bg-red-500/5'
                                        }`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                                <span className="text-gray-500 font-mono text-sm mt-0.5 shrink-0">
                                                    Q{i + 1}
                                                </span>
                                                <p className="text-gray-200">{q.questionText}</p>
                                            </div>
                                            <div className="flex items-center gap-3 ml-4 shrink-0">
                                                <span className={`text-xs px-2 py-1 rounded ${q.unanswered
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : q.isCorrect
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {q.category}
                                                </span>
                                                {q.unanswered ? (
                                                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                                        <MinusCircle className="w-5 h-5" />
                                                        Unanswered
                                                    </span>
                                                ) : q.isCorrect ? (
                                                    <span className="flex items-center gap-1 text-green-400 font-semibold">
                                                        <CheckCircle className="w-5 h-5" />
                                                        +{q.marksAwarded}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-red-400 font-semibold">
                                                        <XCircle className="w-5 h-5" />
                                                        {q.marksAwarded}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt, j) => (
                                            <div
                                                key={j}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${opt.isCorrect && opt.wasSelected
                                                    ? 'bg-green-500/15 border-green-500/40 text-green-300'
                                                    : opt.isCorrect
                                                        ? 'bg-green-500/5 border-green-500/20 text-green-400/80'
                                                        : opt.wasSelected
                                                            ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                                            : 'bg-dark-700/30 border-dark-600/50 text-gray-400'
                                                    }`}
                                            >
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${opt.isCorrect
                                                    ? 'bg-green-500/30 text-green-400'
                                                    : opt.wasSelected
                                                        ? 'bg-red-500/30 text-red-400'
                                                        : 'bg-dark-600 text-gray-500'
                                                    }`}>
                                                    {String.fromCharCode(65 + j)}
                                                </span>
                                                <span className="flex-1">{opt.text}</span>
                                                {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                                                {opt.wasSelected && !opt.isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Coding Tab */}
                {activeTab === 'coding' && (
                    <div className="space-y-6">
                        {(userDetails.codingAnswerDetails || []).length === 0 ? (
                            <div className="bg-dark-800 rounded-xl p-12 text-center">
                                <Code className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No coding submissions recorded</p>
                            </div>
                        ) : (
                            userDetails.codingAnswerDetails.map((problem, i) => (
                                <div key={i} className={`bg-dark-800 rounded-xl border overflow-hidden ${problem.unanswered ? 'border-amber-500/20' : 'border-dark-700'}`}>
                                    {/* Problem Header */}
                                    <div className={`px-6 py-4 border-b border-dark-700 ${problem.unanswered ? 'bg-amber-500/5' : problem.solved ? 'bg-green-500/5' : 'bg-dark-750'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500 font-mono text-sm">P{i + 1}</span>
                                                <h3 className="text-lg font-semibold text-white">{problem.title}</h3>
                                                <span className="text-xs px-2 py-1 rounded bg-dark-600 text-gray-400">
                                                    {problem.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {problem.unanswered ? (
                                                    <span className="flex items-center gap-2 text-amber-400 font-semibold">
                                                        <MinusCircle className="w-6 h-6" />
                                                        Not Attempted
                                                    </span>
                                                ) : (
                                                    <>
                                                        <div className="text-right">
                                                            <p className={`text-lg font-bold ${problem.bestScore >= problem.maxScore ? 'text-green-400' : 'text-yellow-400'
                                                                }`}>
                                                                {problem.bestScore}/{problem.maxScore}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {problem.totalAttempts} attempt{problem.totalAttempts !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                        {problem.solved ? (
                                                            <CheckCircle className="w-6 h-6 text-green-400" />
                                                        ) : (
                                                            <XCircle className="w-6 h-6 text-yellow-500" />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submissions List */}
                                    <div className="divide-y divide-dark-700">
                                        {(problem.submissions || []).map((sub, j) => {
                                            const subId = sub.submissionId || `${problem.problemId}-${j}`;
                                            const isExpanded = expandedSubmissions[subId];
                                            const cachedSub = sourceCodeCache[subId];
                                            const isLoadingCode = loadingCode[subId];

                                            return (
                                                <div key={j} className="group">
                                                    {/* Submission Row */}
                                                    <div
                                                        className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-dark-700/30 transition-colors"
                                                        onClick={() => sub.submissionId && toggleSubmission(sub.submissionId)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            {sub.submissionId ? (
                                                                isExpanded ?
                                                                    <ChevronDown className="w-4 h-4 text-gray-500" /> :
                                                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                                            ) : (
                                                                <span className="w-4 h-4" />
                                                            )}
                                                            <span className="text-gray-500 font-mono text-sm">#{j + 1}</span>
                                                            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${getVerdictColor(sub.verdict)}`}>
                                                                {sub.verdict?.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-gray-400 text-sm px-2 py-0.5 bg-dark-600/50 rounded">
                                                                {sub.language}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-6 text-sm">
                                                            <span className="text-gray-400">
                                                                {sub.testcasesPassed}/{sub.totalTestcases} testcases
                                                            </span>
                                                            <span className="text-gray-300 font-mono font-semibold">
                                                                {sub.score} pts
                                                            </span>
                                                            <span className="text-gray-500 text-xs">
                                                                {new Date(sub.submittedAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Source Code */}
                                                    {isExpanded && sub.submissionId && (
                                                        <div className="px-6 pb-4">
                                                            {isLoadingCode ? (
                                                                <div className="flex items-center justify-center py-6">
                                                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                                                                </div>
                                                            ) : cachedSub ? (
                                                                <div className="bg-dark-900 rounded-lg border border-dark-600 overflow-hidden">
                                                                    {/* Code Header */}
                                                                    <div className="flex items-center justify-between px-4 py-2 bg-dark-800 border-b border-dark-600">
                                                                        <div className="flex items-center gap-2">
                                                                            <Terminal className="w-4 h-4 text-gray-500" />
                                                                            <span className="text-xs text-gray-400">
                                                                                {cachedSub.language} • {cachedSub.verdict}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                copyCode(cachedSub.sourceCode, sub.submissionId);
                                                                            }}
                                                                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                                                                        >
                                                                            {copiedId === sub.submissionId ? (
                                                                                <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</>
                                                                            ) : (
                                                                                <><Copy className="w-3.5 h-3.5" /> Copy</>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                    {/* Code Content */}
                                                                    <pre className="p-4 text-sm text-gray-300 overflow-x-auto max-h-96">
                                                                        <code>{cachedSub.sourceCode}</code>
                                                                    </pre>
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-500 text-sm text-center py-4">
                                                                    Failed to load source code
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserAnswerReview;
