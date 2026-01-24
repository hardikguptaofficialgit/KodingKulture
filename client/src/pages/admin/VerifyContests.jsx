import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Calendar, Users, FileQuestion, Code, ClipboardList } from 'lucide-react';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import './VerifyContests.css';

const VerifyContests = () => {
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedContest, setSelectedContest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [contestDetails, setContestDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const fetchPendingContests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/contests/pending');
            setContests(response.data.contests);
        } catch (error) {
            toast.error('Failed to fetch pending contests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingContests();
    }, []);

    const handleViewDetails = async (contest) => {
        setSelectedContest(contest._id);
        setDetailsLoading(true);
        setShowDetailsModal(true);

        try {
            // Fetch MCQs, Coding problems, and Forms for this contest
            const [mcqRes, codingRes, formsRes] = await Promise.all([
                api.get(`/mcq/contest/${contest._id}`),
                api.get(`/coding/contest/${contest._id}`),
                api.get(`/forms/contest/${contest._id}`).catch(() => ({ data: { forms: [] } }))
            ]);

            setContestDetails({
                contest,
                mcqs: mcqRes.data.mcqs || [],
                codingProblems: codingRes.data.problems || [],
                forms: formsRes.data.forms || []
            });
        } catch (error) {
            toast.error('Failed to load contest details');
            setShowDetailsModal(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleApprove = async (contestId) => {
        try {
            await api.put(`/admin/contests/${contestId}/verify`, { status: 'APPROVED' });
            toast.success('Contest approved!');
            setShowDetailsModal(false);
            fetchPendingContests();
        } catch (error) {
            toast.error('Failed to approve contest');
        }
    };

    const handleReject = async () => {
        if (!selectedContest) return;

        try {
            await api.put(`/admin/contests/${selectedContest}/verify`, {
                status: 'REJECTED',
                rejectionReason
            });
            toast.success('Contest rejected');
            setShowRejectModal(false);
            setShowDetailsModal(false);
            setRejectionReason('');
            setSelectedContest(null);
            fetchPendingContests();
        } catch (error) {
            toast.error('Failed to reject contest');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="verify-contests">
            <div className="page-header">
                <h1><Clock size={28} /> Pending Contest Approvals</h1>
                <p>Review and approve contests submitted by organisers</p>
            </div>

            {loading ? (
                <div className="loading">Loading pending contests...</div>
            ) : contests.length === 0 ? (
                <div className="no-contests">
                    <CheckCircle size={48} />
                    <h3>All caught up!</h3>
                    <p>No contests pending approval</p>
                </div>
            ) : (
                <div className="contests-grid">
                    {contests.map((contest) => (
                        <div key={contest._id} className="contest-card">
                            <div className="contest-header">
                                <h3>{contest.title}</h3>
                                <span className="pending-badge">Pending</span>
                            </div>

                            <p className="description">{contest.description}</p>

                            <div className="contest-meta">
                                <div className="meta-item">
                                    <Calendar size={16} />
                                    <span>{formatDate(contest.startTime)}</span>
                                </div>
                                <div className="meta-item">
                                    <Clock size={16} />
                                    <span>{contest.duration} mins</span>
                                </div>
                                <div className="meta-item">
                                    <Users size={16} />
                                    <span>By: {contest.createdBy?.name}</span>
                                </div>
                            </div>

                            <div className="sections-info">
                                {contest.sections?.mcq?.enabled && (
                                    <span className="section-badge">MCQ</span>
                                )}
                                {contest.sections?.coding?.enabled && (
                                    <span className="section-badge">Coding</span>
                                )}
                            </div>

                            <div className="action-buttons">
                                <button
                                    className="view-btn"
                                    onClick={() => handleViewDetails(contest)}
                                >
                                    <Eye size={18} /> View Details
                                </button>
                                <button
                                    className="approve-btn"
                                    onClick={() => handleApprove(contest._id)}
                                >
                                    <CheckCircle size={18} /> Approve
                                </button>
                                <button
                                    className="reject-btn"
                                    onClick={() => {
                                        setSelectedContest(contest._id);
                                        setShowRejectModal(true);
                                    }}
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && (
                <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="modal details-modal" onClick={(e) => e.stopPropagation()}>
                        {detailsLoading ? (
                            <div className="loading">Loading contest details...</div>
                        ) : contestDetails && (
                            <>
                                <h2>{contestDetails.contest.title}</h2>
                                <p className="organiser-info">By: {contestDetails.contest.createdBy?.name}</p>

                                <div className="questions-summary">
                                    <div className="summary-card">
                                        <FileQuestion size={24} />
                                        <div>
                                            <h4>MCQ Questions</h4>
                                            <p>{contestDetails.mcqs.length} questions</p>
                                        </div>
                                    </div>
                                    <div className="summary-card">
                                        <Code size={24} />
                                        <div>
                                            <h4>Coding Problems</h4>
                                            <p>{contestDetails.codingProblems.length} problems</p>
                                        </div>
                                    </div>
                                    <div className="summary-card">
                                        <ClipboardList size={24} />
                                        <div>
                                            <h4>Forms</h4>
                                            <p>{contestDetails.forms?.length || 0} forms</p>
                                        </div>
                                    </div>
                                </div>

                                {contestDetails.mcqs.length > 0 && (
                                    <div className="questions-section">
                                        <h4>MCQ Questions Preview</h4>
                                        <ul className="questions-list">
                                            {contestDetails.mcqs.map((mcq, idx) => (
                                                <li key={mcq._id}>
                                                    <span className="q-num">Q{idx + 1}.</span> {mcq.question}
                                                    <span className="q-meta">{mcq.marks} marks</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {contestDetails.codingProblems.length > 0 && (
                                    <div className="questions-section">
                                        <h4>Coding Problems Preview</h4>
                                        <ul className="questions-list">
                                            {contestDetails.codingProblems.map((prob, idx) => (
                                                <li key={prob._id}>
                                                    <span className="q-num">P{idx + 1}.</span> {prob.title}
                                                    <span className="q-meta">{prob.score} pts | {prob.difficulty}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {contestDetails.forms?.length > 0 && (
                                    <div className="questions-section">
                                        <h4>Forms Preview</h4>
                                        <ul className="questions-list">
                                            {contestDetails.forms.map((form, idx) => (
                                                <li key={form._id}>
                                                    <span className="q-num">F{idx + 1}.</span> {form.title}
                                                    <span className="q-meta">{form.fields?.length || 0} fields | {form.totalMarks || 0} marks</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {contestDetails.mcqs.length === 0 && contestDetails.codingProblems.length === 0 && (contestDetails.forms?.length || 0) === 0 && (
                                    <div className="no-questions-warning">
                                        ⚠️ No questions or forms added yet! Consider rejecting until content is added.
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button className="cancel-btn" onClick={() => setShowDetailsModal(false)}>
                                        Close
                                    </button>
                                    <button className="reject-btn" onClick={() => {
                                        setShowRejectModal(true);
                                    }}>
                                        <XCircle size={18} /> Reject
                                    </button>
                                    <button className="approve-btn" onClick={() => handleApprove(selectedContest)}>
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Reject Contest</h3>
                        <p>Please provide a reason for rejection:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                        />
                        <div className="modal-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowRejectModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-reject-btn"
                                onClick={handleReject}
                            >
                                Reject Contest
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifyContests;
