import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Minus,
    Trophy,
    FileText,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Bell,
    Clock,
    Loader2
} from 'lucide-react';

const ContestReview = () => {
    const { contestId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('mcq');
    const [mcqReview, setMcqReview] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [result, setResult] = useState(null);
    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);

    // Forms state
    const [formSubmissions, setFormSubmissions] = useState([]);
    const [requestingNotify, setRequestingNotify] = useState(false);

    useEffect(() => {
        fetchReviewData();
    }, [contestId]);

    const fetchReviewData = async () => {
        try {
            const [mcqRes, resultRes, contestRes, formsRes] = await Promise.all([
                api.get(`/mcq/contest/${contestId}/review`).catch(() => ({ data: { review: [] } })),
                api.get(`/leaderboard/${contestId}/rank`).catch(() => ({ data: { result: null } })),
                api.get(`/contests/${contestId}`).catch(() => ({ data: { contest: null } })),
                api.get(`/form-submissions/my/${contestId}`).catch(() => ({ data: { submissions: [] } }))
            ]);

            setMcqReview(mcqRes.data.review || []);
            setResult(resultRes.data.result);
            setContest(contestRes.data.contest);
            setFormSubmissions(formsRes.data.submissions || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching review:', error);
            toast.error('Failed to load review data');
            setLoading(false);
        }
    };

    const handleRequestNotification = async (submissionId) => {
        try {
            setRequestingNotify(true);
            await api.post(`/form-submissions/${submissionId}/request-notification`);
            toast.success('You will be notified via email when your submission is reviewed!');
            // Update local state
            setFormSubmissions(prev => prev.map(sub =>
                sub._id === submissionId ? { ...sub, notifyOnEvaluate: true } : sub
            ));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request notification');
        } finally {
            setRequestingNotify(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const hasMCQ = contest?.sections?.mcq?.enabled && mcqReview.length > 0;
    const hasForms = contest?.sections?.forms?.enabled && formSubmissions.length > 0;

    // MCQ calculations
    const currentMCQ = mcqReview[currentQuestion];
    const userAnswer = currentMCQ?.userAnswer || [];
    const correctAnswers = currentMCQ?.correctAnswers || [];
    const isCorrect = currentMCQ?.isCorrect;
    const isUnanswered = userAnswer.length === 0;

    const correct = mcqReview.filter(m => m.isCorrect).length;
    const wrong = mcqReview.filter(m => !m.isCorrect && m.userAnswer?.length > 0).length;
    const unanswered = mcqReview.filter(m => !m.userAnswer || m.userAnswer.length === 0).length;

    return (
        <div className="min-h-screen bg-dark-950 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>

                    <h1 className="text-3xl font-bold text-white mb-2">Review Your Answers</h1>
                    <p className="text-gray-400">See how you performed in the contest</p>
                </div>

                {/* Section Toggle Tabs */}
                {(hasMCQ || hasForms) && (
                    <div className="flex gap-2 mb-8">
                        {hasMCQ && (
                            <button
                                onClick={() => setActiveTab('mcq')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'mcq'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                                    }`}
                            >
                                <FileText className="w-5 h-5" />
                                MCQ Section
                            </button>
                        )}
                        {hasForms && (
                            <button
                                onClick={() => setActiveTab('forms')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'forms'
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                                    }`}
                            >
                                <ClipboardList className="w-5 h-5" />
                                Forms Section
                            </button>
                        )}
                    </div>
                )}

                {/* MCQ Section Content */}
                {activeTab === 'mcq' && hasMCQ && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <div className="card bg-dark-800/50 text-center p-4">
                                <p className="text-2xl font-bold text-primary-500">{result?.mcqScore || 0}</p>
                                <p className="text-sm text-gray-400">MCQ Score</p>
                            </div>
                            <div className="card bg-green-500/10 text-center p-4">
                                <p className="text-2xl font-bold text-green-500">{correct}</p>
                                <p className="text-sm text-gray-400">Correct</p>
                            </div>
                            <div className="card bg-red-500/10 text-center p-4">
                                <p className="text-2xl font-bold text-red-500">{wrong}</p>
                                <p className="text-sm text-gray-400">Wrong</p>
                            </div>
                            <div className="card bg-gray-500/10 text-center p-4">
                                <p className="text-2xl font-bold text-gray-400">{unanswered}</p>
                                <p className="text-sm text-gray-400">Unanswered</p>
                            </div>
                        </div>

                        {/* Question Review */}
                        <div className="card mb-6">
                            {/* Question Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="badge-primary text-lg">Q{currentQuestion + 1}</span>
                                    <span className="badge-secondary">{currentMCQ.difficulty}</span>
                                    {currentMCQ.category && (
                                        <span className="badge-info">{currentMCQ.category}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {isUnanswered ? (
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Minus className="w-5 h-5" />
                                            Unanswered
                                        </span>
                                    ) : isCorrect ? (
                                        <span className="flex items-center gap-1 text-green-500">
                                            <CheckCircle className="w-5 h-5" />
                                            Correct
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-500">
                                            <XCircle className="w-5 h-5" />
                                            Wrong
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="mb-6">
                                <p className="text-lg text-gray-200 leading-relaxed whitespace-pre-wrap">
                                    {typeof currentMCQ.question === 'object' ? currentMCQ.question.text || JSON.stringify(currentMCQ.question) : currentMCQ.question}
                                </p>
                                {currentMCQ.imageUrl && (
                                    <div className="mt-4">
                                        <img
                                            src={currentMCQ.imageUrl}
                                            alt="Question"
                                            className="max-w-full max-h-80 rounded-lg border border-dark-600"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                {currentMCQ.options.map((option, index) => {
                                    const isUserSelected = userAnswer.includes(index);
                                    const isCorrectAnswer = correctAnswers.includes(index);
                                    const optionLabel = String.fromCharCode(65 + index);

                                    let optionClass = 'border-dark-600 bg-dark-700/50';
                                    let iconElement = null;

                                    if (isCorrectAnswer) {
                                        optionClass = 'border-green-500 bg-green-500/10';
                                        iconElement = <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
                                    } else if (isUserSelected && !isCorrectAnswer) {
                                        optionClass = 'border-red-500 bg-red-500/10';
                                        iconElement = <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border transition-all ${optionClass}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="px-2 py-1 bg-dark-600 rounded text-sm font-semibold">
                                                    {optionLabel}
                                                </span>
                                                <span className="text-gray-200 flex-grow">{typeof option === 'object' ? option.text || JSON.stringify(option) : option}</span>
                                                {iconElement}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-between items-center mt-8 pt-6 border-t border-dark-700">
                                <button
                                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestion === 0}
                                    className="btn-secondary disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-5 h-5 mr-1" />
                                    Previous
                                </button>
                                <span className="text-gray-400">
                                    {currentQuestion + 1} / {mcqReview.length}
                                </span>
                                <button
                                    onClick={() => setCurrentQuestion(prev => Math.min(mcqReview.length - 1, prev + 1))}
                                    disabled={currentQuestion === mcqReview.length - 1}
                                    className="btn-secondary disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="w-5 h-5 ml-1" />
                                </button>
                            </div>
                        </div>

                        {/* Question Grid */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-white mb-4">Question Overview</h3>
                            <div className="grid grid-cols-10 gap-2">
                                {mcqReview.map((mcq, index) => {
                                    const answered = mcq.userAnswer?.length > 0;
                                    const correct = mcq.isCorrect;
                                    const isCurrent = index === currentQuestion;

                                    let bgColor = 'bg-dark-700 text-gray-400';
                                    if (answered) {
                                        bgColor = correct ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500';
                                    }
                                    if (isCurrent) {
                                        bgColor += ' ring-2 ring-primary-500';
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentQuestion(index)}
                                            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${bgColor}`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Forms Section Content */}
                {activeTab === 'forms' && hasForms && (
                    <div className="space-y-6">
                        {formSubmissions.map((submission) => {
                            const isPending = !submission.isFullyEvaluated;
                            const form = submission.formId;

                            return (
                                <div key={submission._id} className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <ClipboardList className="w-6 h-6 text-cyan-500" />
                                            <h3 className="text-xl font-bold text-white">{form?.title || 'Form'}</h3>
                                        </div>
                                        {isPending ? (
                                            <span className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
                                                <Clock className="w-4 h-4" />
                                                Under Evaluation
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                                                <CheckCircle className="w-4 h-4" />
                                                Evaluated
                                            </span>
                                        )}
                                    </div>

                                    {isPending ? (
                                        <div className="bg-dark-700/50 rounded-lg p-6 text-center">
                                            <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                                            <h4 className="text-lg font-semibold text-white mb-2">Awaiting Evaluation</h4>
                                            <p className="text-gray-400 mb-4">
                                                Your form submission is being reviewed by the evaluator.
                                                Results will be available once evaluation is complete.
                                            </p>

                                            {!submission.notifyOnEvaluate ? (
                                                <button
                                                    onClick={() => handleRequestNotification(submission._id)}
                                                    disabled={requestingNotify}
                                                    className="btn-secondary inline-flex items-center gap-2"
                                                >
                                                    {requestingNotify ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Bell className="w-4 h-4" />
                                                    )}
                                                    Notify Me When Reviewed
                                                </button>
                                            ) : (
                                                <span className="text-green-400 flex items-center justify-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    You will be notified via email when reviewed
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Score Summary */}
                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-cyan-400">{submission.totalScore}</p>
                                                    <p className="text-sm text-gray-400">Total Score</p>
                                                </div>
                                                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-green-400">{submission.totalAutoScore}</p>
                                                    <p className="text-sm text-gray-400">Auto Score</p>
                                                </div>
                                                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-primary-400">{submission.totalManualScore}</p>
                                                    <p className="text-sm text-gray-400">Manual Score</p>
                                                </div>
                                            </div>

                                            {/* Individual Responses */}
                                            <div className="space-y-3">
                                                {submission.responses?.map((response, idx) => {
                                                    const field = form?.fields?.find(f => f.fieldId === response.fieldId);
                                                    const score = response.isAutoScored ? response.autoScore : response.manualScore;

                                                    return (
                                                        <div key={response.fieldId} className="p-4 bg-dark-700/30 rounded-lg">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-white font-medium">{field?.label || `Field ${idx + 1}`}</span>
                                                                <span className={`text-sm ${score > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                                    {score || 0} / {response.maxMarks}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-400 text-sm">
                                                                {Array.isArray(response.value) ? response.value.join(', ') : response.value || 'No answer'}
                                                            </p>
                                                            {response.feedback && (
                                                                <p className="text-cyan-400 text-sm mt-2 italic">
                                                                    Feedback: {response.feedback}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* No Data Message */}
                {!hasMCQ && !hasForms && (
                    <div className="card text-center py-12">
                        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">No Review Data</h2>
                        <p className="text-gray-400 mb-6">Review data is not available yet.</p>
                        <Link to={`/leaderboard/${contestId}`} className="btn-primary">
                            View Leaderboard
                        </Link>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex justify-center gap-4">
                    <Link to={`/leaderboard/${contestId}`} className="btn-primary">
                        <Trophy className="w-5 h-5 mr-2" />
                        View Leaderboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ContestReview;
