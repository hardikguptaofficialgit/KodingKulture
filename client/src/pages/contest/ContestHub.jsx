import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContestTimer } from '../../context/ContestTimerContext';
import { Clock, FileText, Code, Send, ArrowLeft, CheckCircle, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/authService';
import codingService from '../../services/codingService';
import mcqService from '../../services/mcqService';

const ContestHub = () => {
    const { contestId } = useParams();
    const navigate = useNavigate();
    const {
        formattedTime,
        remainingTime,
        isStarted,
        progress,
        contest,
        loading,
        startContest,
        finalSubmit
    } = useContestTimer();

    const [mcqProgress, setMcqProgress] = useState({ answered: 0, total: 0 });
    const [codingProgress, setCodingProgress] = useState({ submitted: 0, total: 0 });
    const [submitting, setSubmitting] = useState(false);

    // Fetch actual progress on every visit/mount
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                // MCQ progress from localStorage
                const mcqAnswers = JSON.parse(localStorage.getItem(`mcq_answers_${contestId}`) || '{}');

                // Get total MCQ count from server
                const mcqData = await mcqService.getMCQsByContest(contestId);
                setMcqProgress({
                    answered: Object.keys(mcqAnswers).length,
                    total: mcqData.mcqs?.length || 0
                });

                // Coding progress - single aggregated API call instead of N+1
                const progressData = await codingService.getCodingProgress(contestId);
                setCodingProgress({
                    submitted: progressData.accepted || 0,
                    total: progressData.total || 0
                });
            } catch (error) {
                console.error('Error fetching progress:', error);
            }
        };

        if (contestId && isStarted) {
            fetchProgress();
        }
    }, [contestId, isStarted]);

    const handleFinalSubmit = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to submit the contest? You cannot make changes after submission.'
        );

        if (!confirmed) return;

        setSubmitting(true);
        try {
            // Get MCQ answers from localStorage
            const mcqAnswers = JSON.parse(localStorage.getItem(`mcq_answers_${contestId}`) || '{}');
            const formattedAnswers = Object.entries(mcqAnswers).map(([mcqId, selectedOptions]) => ({
                mcqId,
                selectedOptions
            }));

            await finalSubmit(formattedAnswers);

            // Clear all localStorage for this contest
            Object.keys(localStorage).forEach(key => {
                if (key.includes(contestId)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    // Check if contest has ended
    if (contest?.status === 'ENDED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="text-center card max-w-md">
                    <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Contest Has Ended</h2>
                    <p className="text-gray-400 mb-6">This contest has already ended.</p>
                    <div className="space-y-3">
                        <Link to={`/leaderboard/${contestId}`} className="btn-primary block">
                            View Leaderboard
                        </Link>
                        <Link to="/contests" className="btn-secondary block">
                            Browse Other Contests
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!isStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Contest not started</h2>
                    <p className="text-gray-400 mb-6">Please start the contest from the contest details page.</p>
                    <Link to={`/contest/${contestId}`} className="btn-primary">
                        Go to Contest
                    </Link>
                </div>
            </div>
        );
    }

    // Check if contest is already submitted
    if (progress?.status === 'SUBMITTED' || progress?.status === 'TIMED_OUT') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="text-center card max-w-md">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Contest Already Submitted</h2>
                    <p className="text-gray-400 mb-6">
                        You have already submitted this contest. You cannot enter again.
                    </p>
                    <div className="space-y-3">
                        <Link to={`/leaderboard/${contestId}`} className="btn-primary block">
                            View Leaderboard
                        </Link>
                        <Link to={`/contest/${contestId}/review`} className="btn-secondary block">
                            Review Your Answers
                        </Link>
                        <Link to="/contests" className="btn-outline block">
                            Browse Other Contests
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isTimeLow = remainingTime < 300; // Less than 5 minutes

    const handleLeaveContest = async () => {
        const confirmed = window.confirm(
            'Warning: You have an active contest!\n\nLeaving this page will AUTO-SUBMIT your contest with current progress.\n\nAre you sure you want to leave and submit?'
        );
        if (confirmed) {
            // Auto-submit the contest
            try {
                const mcqAnswers = JSON.parse(localStorage.getItem(`mcq_answers_${contestId}`) || '{}');
                const formattedAnswers = Object.entries(mcqAnswers).map(([mcqId, selectedOptions]) => ({
                    mcqId,
                    selectedOptions
                }));
                await finalSubmit(formattedAnswers);
            } catch (error) {
                console.error('Auto-submit error:', error);
                // Navigate even if submit fails
                navigate(`/contest/${contestId}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
            {/* Fixed Timer Header */}
            <div className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLeaveContest}
                                className="text-gray-400 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold">{contest?.title || 'Contest'}</h1>
                        </div>

                        <div className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-2xl font-bold ${isTimeLow ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-dark-700 text-white'
                            }`}>
                            <Clock className="w-6 h-6" />
                            <span>{formattedTime}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-2">Contest Hub</h2>
                    <p className="text-gray-400">Choose a section to continue</p>
                </div>

                {/* Section Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* MCQ Section */}
                    {contest?.sections?.mcq?.enabled && (
                        <div className="card hover:border-primary-500 transition-all cursor-pointer group"
                            onClick={() => navigate(`/contest/${contestId}/mcq`)}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-primary-500/20 rounded-lg">
                                    <FileText className="w-8 h-8 text-primary-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">MCQ Section</h3>
                                    <p className="text-gray-400 text-sm">Multiple Choice Questions</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Progress</span>
                                    <span className="text-primary-400">{mcqProgress.answered} answered</span>
                                </div>
                                <div className="w-full bg-dark-700 rounded-full h-2">
                                    <div
                                        className="bg-primary-500 h-2 rounded-full transition-all"
                                        style={{ width: `${mcqProgress.total > 0 ? (mcqProgress.answered / mcqProgress.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">{contest.sections.mcq.totalMarks} points</span>
                                <span className="text-primary-500 group-hover:translate-x-2 transition-transform">
                                    Continue →
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Coding Section */}
                    {contest?.sections?.coding?.enabled && (
                        <div className="card hover:border-primary-500 transition-all cursor-pointer group"
                            onClick={() => navigate(`/contest/${contestId}/coding`)}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <Code className="w-8 h-8 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Coding Section</h3>
                                    <p className="text-gray-400 text-sm">Programming Problems</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Progress</span>
                                    <span className="text-green-400">{codingProgress.submitted} submitted</span>
                                </div>
                                <div className="w-full bg-dark-700 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{ width: `${codingProgress.total > 0 ? (codingProgress.submitted / codingProgress.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">{contest.sections.coding.totalMarks} points</span>
                                <span className="text-green-500 group-hover:translate-x-2 transition-transform">
                                    Continue →
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Forms Section */}
                    {contest?.sections?.forms?.enabled && (
                        <div className="card hover:border-primary-500 transition-all cursor-pointer group"
                            onClick={() => navigate(`/contest/${contestId}/forms`)}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-cyan-500/20 rounded-lg">
                                    <ClipboardList className="w-8 h-8 text-cyan-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Forms Section</h3>
                                    <p className="text-gray-400 text-sm">Custom Assessment Forms</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-400 text-sm">
                                    Fill out assessment forms for this contest
                                </p>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">{contest.sections.forms.totalMarks} points</span>
                                <span className="text-cyan-500 group-hover:translate-x-2 transition-transform">
                                    Continue →
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Final Submit Button */}
                <div className="text-center">
                    <button
                        onClick={handleFinalSubmit}
                        disabled={submitting}
                        className="btn-primary text-xl px-12 py-4 flex items-center gap-3 mx-auto"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-6 h-6" />
                                Final Submit
                            </>
                        )}
                    </button>
                    <p className="text-gray-500 mt-3 text-sm">
                        This will submit all your answers. You cannot make changes after submission.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ContestHub;
