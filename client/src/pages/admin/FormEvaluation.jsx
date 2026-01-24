import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    User,
    FileText,
    ChevronDown,
    ChevronUp,
    Send
} from 'lucide-react';

const FormEvaluation = () => {
    const { contestId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [contest, setContest] = useState(null);
    const [forms, setForms] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [evaluating, setEvaluating] = useState(false);
    const [evaluations, setEvaluations] = useState({});

    useEffect(() => {
        fetchData();
    }, [contestId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [contestRes, formsRes, submissionsRes] = await Promise.all([
                api.get(`/contests/${contestId}`),
                api.get(`/forms/contest/${contestId}`),
                api.get(`/form-submissions/contest/${contestId}`)
            ]);
            setContest(contestRes.data.contest);
            setForms(formsRes.data.forms);
            setSubmissions(submissionsRes.data.submissions);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const openSubmission = async (submission) => {
        try {
            const response = await api.get(`/form-submissions/${submission._id}`);
            setSelectedSubmission(response.data.submission);

            // Initialize evaluations with current values
            const initialEvals = {};
            response.data.submission.responses.forEach(resp => {
                if (!resp.isAutoScored) {
                    initialEvals[resp.fieldId] = {
                        manualScore: resp.manualScore || 0,
                        feedback: resp.feedback || ''
                    };
                }
            });
            setEvaluations(initialEvals);
        } catch (error) {
            toast.error('Failed to load submission');
        }
    };

    const handleScoreChange = (fieldId, score, maxMarks) => {
        setEvaluations(prev => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                manualScore: Math.min(Math.max(0, score), maxMarks)
            }
        }));
    };

    const handleFeedbackChange = (fieldId, feedback) => {
        setEvaluations(prev => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                feedback
            }
        }));
    };

    const submitEvaluation = async () => {
        try {
            setEvaluating(true);
            const evalArray = Object.entries(evaluations).map(([fieldId, data]) => ({
                fieldId,
                manualScore: data.manualScore,
                feedback: data.feedback
            }));

            await api.put(`/form-submissions/${selectedSubmission._id}/evaluate`, {
                evaluations: evalArray
            });

            toast.success('Evaluation submitted successfully');
            setSelectedSubmission(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to submit evaluation');
        } finally {
            setEvaluating(false);
        }
    };

    const getFieldLabel = (fieldId, formId) => {
        const form = forms.find(f => f._id === formId._id || f._id === formId);
        if (!form) return 'Unknown Field';
        const field = form.fields?.find(f => f.fieldId === fieldId);
        return field?.label || 'Unknown Field';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-dark-700 rounded-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Form Evaluations</h1>
                        <p className="text-gray-400">{contest?.title}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="card flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary-500" />
                        <div>
                            <div className="text-2xl font-bold text-white">{submissions.length}</div>
                            <div className="text-sm text-gray-400">Total Submissions</div>
                        </div>
                    </div>
                    <div className="card flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {submissions.filter(s => s.isFullyEvaluated).length}
                            </div>
                            <div className="text-sm text-gray-400">Evaluated</div>
                        </div>
                    </div>
                    <div className="card flex items-center gap-3">
                        <Clock className="w-8 h-8 text-yellow-500" />
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {submissions.filter(s => !s.isFullyEvaluated).length}
                            </div>
                            <div className="text-sm text-gray-400">Pending</div>
                        </div>
                    </div>
                </div>

                {/* Submissions List */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Submissions</h2>

                    {submissions.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No submissions yet</p>
                    ) : (
                        <div className="space-y-2">
                            {submissions.map((submission) => (
                                <div
                                    key={submission._id}
                                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${selectedSubmission?._id === submission._id
                                        ? 'bg-primary-500/20 border border-primary-500'
                                        : 'bg-dark-700 hover:bg-dark-600'
                                        }`}
                                    onClick={() => openSubmission(submission)}
                                >
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <div className="text-white font-medium">{submission.userId?.name}</div>
                                            <div className="text-sm text-gray-400">{submission.userId?.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-white font-semibold">
                                                {submission.totalScore} / {submission.maxPossibleScore}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Auto: {submission.totalAutoScore} | Manual: {submission.totalManualScore}
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${submission.isFullyEvaluated
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {submission.isFullyEvaluated ? 'Evaluated' : 'Pending'}
                                        </div>
                                        {selectedSubmission?._id === submission._id ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Evaluation Panel - Enhanced Side-by-Side View */}
                {selectedSubmission && (
                    <div className="card mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">
                                Evaluate: {selectedSubmission.userId?.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-4 h-4" /> Auto-scored
                                </span>
                                <span className="flex items-center gap-1 text-yellow-400">
                                    <Clock className="w-4 h-4" /> Manual evaluation
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedSubmission.responses.map((response) => {
                                const form = forms.find(f => f._id === selectedSubmission.formId._id || f._id === selectedSubmission.formId);
                                const field = form?.fields?.find(f => f.fieldId === response.fieldId);
                                const isAuto = response.isAutoScored;

                                return (
                                    <div
                                        key={response.fieldId}
                                        className={`p-5 rounded-lg border-l-4 ${isAuto
                                            ? 'bg-green-500/5 border-green-500'
                                            : 'bg-yellow-500/5 border-yellow-400'
                                            }`}
                                    >
                                        {/* Side-by-side: Question | Answer */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {/* Left: Question Details */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isAuto ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {field?.type || 'TEXT'}
                                                    </span>
                                                    <span className="text-sm text-gray-500">Max: {response.maxMarks} marks</span>
                                                </div>
                                                <h4 className="font-semibold text-white text-lg mb-2">
                                                    {field?.label || 'Unknown Field'}
                                                </h4>
                                                {field?.placeholder && (
                                                    <p className="text-gray-500 text-sm italic">Hint: {field.placeholder}</p>
                                                )}
                                                {(field?.type === 'RADIO' || field?.type === 'CHECKBOX') && field?.options?.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-gray-400 text-sm mb-1">Options:</p>
                                                        <ul className="text-gray-500 text-sm pl-4 list-disc">
                                                            {field.options.map((opt, i) => (
                                                                <li key={i} className={field.correctAnswers?.includes(opt) ? 'text-green-400' : ''}>
                                                                    {opt} {field.correctAnswers?.includes(opt) && '✓'}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Participant Answer + Scoring */}
                                            <div className="bg-dark-800 rounded-lg p-4">
                                                <p className="text-gray-400 text-sm mb-2">Participant's Answer:</p>
                                                <div className="mb-4 p-3 bg-dark-900 rounded text-gray-200 min-h-[60px]">
                                                    {Array.isArray(response.value)
                                                        ? response.value.join(', ')
                                                        : field?.type === 'URL' && response.value ? (
                                                            <a
                                                                href={response.value.startsWith('http') ? response.value : `https://${response.value}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary-400 underline hover:text-primary-300 break-all"
                                                            >
                                                                {response.value}
                                                            </a>
                                                        ) : response.value || <em className="text-gray-500">No response</em>}
                                                </div>

                                                {/* Scoring Section */}
                                                <div className="border-t border-dark-700 pt-4">
                                                    {isAuto ? (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-400">Auto Score:</span>
                                                            <span className="text-green-400 font-bold text-lg">
                                                                {response.autoScore} / {response.maxMarks}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-gray-400">Score:</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={response.maxMarks}
                                                                    value={evaluations[response.fieldId]?.manualScore || 0}
                                                                    onChange={(e) => handleScoreChange(
                                                                        response.fieldId,
                                                                        parseInt(e.target.value) || 0,
                                                                        response.maxMarks
                                                                    )}
                                                                    className="w-24 input-field py-2 text-center text-lg font-bold"
                                                                />
                                                                <span className="text-gray-400">/ {response.maxMarks}</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={evaluations[response.fieldId]?.feedback || ''}
                                                                onChange={(e) => handleFeedbackChange(response.fieldId, e.target.value)}
                                                                placeholder="Add feedback for participant..."
                                                                className="w-full input-field py-2 text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-700">
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitEvaluation}
                                disabled={evaluating}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                {evaluating ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormEvaluation;
