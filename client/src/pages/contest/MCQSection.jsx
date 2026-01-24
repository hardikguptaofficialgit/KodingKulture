import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useContestTimer } from '../../context/ContestTimerContext';
import mcqService from '../../services/mcqService';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, Circle, ArrowLeft, RotateCcw } from 'lucide-react';

const MCQSection = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formattedTime, remainingTime, progress } = useContestTimer();

  // Block re-entry if contest already submitted
  useEffect(() => {
    if (progress) {
      if (progress.status === 'SUBMITTED' || progress.status === 'TIMED_OUT') {
        toast.error('Contest already submitted. You cannot re-enter.');
        navigate(`/contest/${contestId}/review`, { replace: true });
      }
      if (progress.terminationReason === 'MALPRACTICE') {
        toast.error('Contest terminated due to malpractice.');
        navigate(`/contest/${contestId}/review`, { replace: true });
      }
    }
  }, [progress, contestId, navigate]);

  const [mcqs, setMcqs] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flagged, setFlagged] = useState(new Set());
  const [contestInfo, setContestInfo] = useState(null);

  // Time tracking
  const questionStartTime = useRef(Date.now());
  const sectionStartTime = useRef(Date.now());

  useEffect(() => {
    fetchMCQs();
    // Load saved answers from localStorage
    const savedAnswers = localStorage.getItem(`mcq_answers_${contestId}`);
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, [contestId]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`mcq_answers_${contestId}`, JSON.stringify(answers));
    }
  }, [answers, contestId]);

  // Periodic auto-save to backend every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      if (Object.keys(answers).length > 0) {
        try {
          const formattedAnswers = Object.keys(answers).map(mcqId => ({
            mcqId,
            selectedOptions: answers[mcqId]
          }));

          await api.post(`/contests/${contestId}/save-progress`, {
            mcqAnswers: formattedAnswers
          });
          console.log('MCQ answers auto-saved to backend');
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [answers, contestId]);

  // Emergency save when browser is closing (using sendBeacon for reliability)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(answers).length > 0) {
        const formattedAnswers = Object.keys(answers).map(mcqId => ({
          mcqId,
          selectedOptions: answers[mcqId]
        }));

        const token = localStorage.getItem('token');
        const data = JSON.stringify({
          mcqAnswers: formattedAnswers,
          token // Include token for authentication
        });

        // sendBeacon is more reliable than fetch for unload events
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL}/contests/${contestId}/emergency-save`,
          new Blob([data], { type: 'application/json' })
        );
        console.log('Emergency MCQ save triggered');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [answers, contestId]);

  // Track time when changing questions
  const trackQuestionTime = async (questionId, timeSpent) => {
    try {
      await api.post(`/contests/${contestId}/track-time`, {
        type: 'mcq',
        questionId,
        timeSpent
      });
    } catch (error) {
      console.error('Error tracking time:', error);
    }
  };

  // Handle question navigation with time tracking
  const handleQuestionChange = (newQuestion) => {
    if (mcqs.length === 0) return;

    const currentMCQ = mcqs[currentQuestion];
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

    // Track time for the question we're leaving
    if (currentMCQ && timeSpent > 0) {
      trackQuestionTime(currentMCQ._id, timeSpent);
    }

    // Reset timer for new question
    questionStartTime.current = Date.now();
    setCurrentQuestion(newQuestion);
  };

  // Track section time when leaving MCQ section
  useEffect(() => {
    return () => {
      const sectionTimeSpent = Math.floor((Date.now() - sectionStartTime.current) / 1000);
      api.post(`/contests/${contestId}/track-time`, {
        type: 'mcq-section',
        timeSpent: sectionTimeSpent
      }).catch(err => console.error('Error tracking section time:', err));
    };
  }, [contestId]);

  const fetchMCQs = async () => {
    try {
      const data = await mcqService.getMCQsByContest(contestId);
      setMcqs(data.mcqs);
      setContestInfo(data.contest);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching MCQs:', error);
      toast.error(error.response?.data?.message || 'Failed to load questions');
      setLoading(false);
    }
  };

  const handleOptionSelect = (mcqId, optionIndex) => {
    const mcq = mcqs.find(m => m._id === mcqId);

    if (!mcq || !mcq.options) return;

    // Determine if multiple answers based on options (since correctAnswers might be hidden)
    const correctCount = mcq.options.filter(opt => opt.isCorrect).length;
    const isMultipleAnswer = correctCount > 1;

    if (isMultipleAnswer) {
      // Multiple correct answers - toggle selection
      setAnswers(prev => {
        const current = prev[mcqId] || [];
        if (current.includes(optionIndex)) {
          return { ...prev, [mcqId]: current.filter(i => i !== optionIndex) };
        } else {
          return { ...prev, [mcqId]: [...current, optionIndex] };
        }
      });
    } else {
      // Single correct answer
      setAnswers(prev => ({ ...prev, [mcqId]: [optionIndex] }));
    }
  };

  const resetCurrentAnswer = () => {
    const mcqId = mcqs[currentQuestion]._id;
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[mcqId];
      // Also update localStorage
      localStorage.setItem(`mcq_answers_${contestId}`, JSON.stringify(newAnswers));
      return newAnswers;
    });
    toast.success('Answer cleared');
  };

  // Save answers and navigate back to hub
  const handleSaveAndBackToHub = async () => {
    try {
      if (Object.keys(answers).length > 0) {
        const formattedAnswers = Object.keys(answers).map(mcqId => ({
          mcqId,
          selectedOptions: answers[mcqId]
        }));

        await api.post(`/contests/${contestId}/save-progress`, {
          mcqAnswers: formattedAnswers
        });
        toast.success('Progress saved!');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress, but navigating anyway');
    }

    navigate(`/contest/${contestId}/hub`);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const unanswered = mcqs.filter(mcq => !answers[mcq._id] || answers[mcq._id].length === 0);

    if (unanswered.length > 0 && timeRemaining > 0) {
      const confirm = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirm) return;
    }

    setSubmitting(true);

    try {
      const formattedAnswers = Object.keys(answers).map(mcqId => ({
        mcqId,
        selectedOptions: answers[mcqId]
      }));

      const response = await mcqService.submitMCQAnswers(contestId, formattedAnswers);

      toast.success('MCQ section submitted successfully!');
      navigate(`/contest/${contestId}/result`);
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error(error.response?.data?.message || 'Failed to submit answers');
      setSubmitting(false);
    }
  };

  const toggleFlag = (index) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(index)) {
        newFlagged.delete(index);
      } else {
        newFlagged.add(index);
      }
      return newFlagged;
    });
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (mcqs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Questions Available</h2>
          <button onClick={() => navigate(`/contest/${contestId}`)} className="btn-primary">
            Back to Contest
          </button>
        </div>
      </div>
    );
  }

  const currentMCQ = mcqs[currentQuestion];

  // Check if currentMCQ and its properties exist
  if (!currentMCQ || !currentMCQ.options) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading question...</p>
        </div>
      </div>
    );
  }

  // Determine if multiple answers based on options (since correctAnswers is hidden)
  const isMultipleAnswer = currentMCQ.options.filter(opt => opt.isCorrect).length > 1;
  const selectedOptions = answers[currentMCQ._id] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveAndBackToHub}
                className="text-gray-400 hover:text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Save & Back to Hub
              </button>
              <div>
                <h1 className="text-xl font-bold">{contestInfo?.title || 'MCQ Section'}</h1>
                <p className="text-gray-400 text-sm">Question {currentQuestion + 1} of {mcqs.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${remainingTime < 300 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-dark-700 text-white'
                }`}>
                <Clock className="w-5 h-5" />
                <span>{formattedTime}</span>
              </div>

              <button
                onClick={() => navigate(`/contest/${contestId}/hub`)}
                className="btn-secondary"
              >
                Save & Back to Hub
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <div className="card">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="badge-primary text-lg">Q{currentQuestion + 1}</span>
                  <span className="badge-secondary">{currentMCQ.difficulty}</span>
                  {currentMCQ.category && (
                    <span className="badge-info">{currentMCQ.category}</span>
                  )}
                </div>

                <button
                  onClick={() => toggleFlag(currentQuestion)}
                  className={`p-2 rounded-lg transition-colors ${flagged.has(currentQuestion)
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : 'bg-dark-700 text-gray-400 hover:text-yellow-500'
                    }`}
                >
                  <Flag className="w-5 h-5" fill={flagged.has(currentQuestion) ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Question Text */}
              <div
                className="mb-6 select-none"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
                <p className="text-lg text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {currentMCQ.question}
                </p>

                {/* Question Image (if exists) */}
                {currentMCQ.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={currentMCQ.imageUrl}
                      alt="Question"
                      className="max-w-full max-h-80 rounded-lg border border-dark-600"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable="false"
                    />
                  </div>
                )}

                {isMultipleAnswer && (
                  <p className="text-sm text-primary-400 mt-2">
                    (Multiple answers possible - select all that apply)
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentMCQ.options.map((option, index) => {
                  const isSelected = selectedOptions.includes(index);
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

                  return (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(currentMCQ._id, index)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-500'
                          }`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold text-primary-400 mr-2">{optionLabel}.</span>
                          <span className="text-gray-200">{option.text}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Marks Info + Reset Button */}
              <div className="mt-6 p-4 bg-dark-700/50 rounded-lg flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <span className="text-gray-400">
                    Marks: <span className="text-green-400 font-semibold">+{currentMCQ.marks}</span>
                  </span>
                  {currentMCQ.negativeMarks > 0 && (
                    <span className="text-gray-400">
                      Negative: <span className="text-red-400 font-semibold">-{currentMCQ.negativeMarks}</span>
                    </span>
                  )}
                </div>

                {/* Reset Button */}
                <button
                  onClick={resetCurrentAnswer}
                  disabled={!selectedOptions || selectedOptions.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-white hover:bg-dark-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Clear Answer</span>
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-dark-700">
                <button
                  onClick={() => handleQuestionChange(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Previous
                </button>

                <button
                  onClick={() => handleQuestionChange(Math.min(mcqs.length - 1, currentQuestion + 1))}
                  disabled={currentQuestion === mcqs.length - 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Palette */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h3 className="text-lg font-bold mb-4">Question Palette</h3>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {mcqs.map((mcq, index) => {
                  const isAnswered = answers[mcq._id] && answers[mcq._id].length > 0;
                  const isFlagged = flagged.has(index);
                  const isCurrent = index === currentQuestion;

                  return (
                    <button
                      key={mcq._id}
                      onClick={() => handleQuestionChange(index)}
                      className={`aspect-square rounded-lg text-sm font-semibold transition-all relative ${isCurrent
                        ? 'bg-primary-500 text-white scale-110'
                        : isAnswered
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                        }`}
                    >
                      {index + 1}
                      {isFlagged && (
                        <Flag className="w-3 h-3 absolute top-0.5 right-0.5 text-yellow-500" fill="currentColor" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-500/20 border border-green-500/50"></div>
                  <span className="text-gray-400">Answered ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-dark-700"></div>
                  <span className="text-gray-400">Not Answered ({mcqs.length - Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-dark-700 relative">
                    <Flag className="w-3 h-3 absolute top-0.5 right-0.5 text-yellow-500" fill="currentColor" />
                  </div>
                  <span className="text-gray-400">Flagged ({flagged.size})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQSection;
