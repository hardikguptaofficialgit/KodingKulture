import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/authService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ContestTimerContext = createContext();

export const useContestTimer = () => {
    const context = useContext(ContestTimerContext);
    if (!context) {
        throw new Error('useContestTimer must be used within ContestTimerProvider');
    }
    return context;
};

export const ContestTimerProvider = ({ children, contestId }) => {
    const [remainingTime, setRemainingTime] = useState(null);
    const [startedAt, setStartedAt] = useState(null);
    const [isStarted, setIsStarted] = useState(false);
    const [progress, setProgress] = useState(null);
    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Format time as HH:MM:SS
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined) return '00:00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Fetch progress from server
    const fetchProgress = useCallback(async () => {
        try {
            const response = await api.get(`/contests/${contestId}/progress`);
            if (response.data.started) {
                setIsStarted(true);
                setProgress(response.data.progress);
                setRemainingTime(response.data.remainingTime);
                setStartedAt(new Date(response.data.progress.startedAt));
                setContest(response.data.contest);

                // Save to localStorage
                localStorage.setItem(`contest_${contestId}_startedAt`, response.data.progress.startedAt);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch progress:', error);
            setLoading(false);
        }
    }, [contestId]);

    // Start contest
    const startContest = async () => {
        try {
            const response = await api.post(`/contests/${contestId}/start`);
            setIsStarted(true);
            setProgress(response.data.progress);
            setRemainingTime(response.data.remainingTime);
            setStartedAt(new Date(response.data.progress.startedAt));

            localStorage.setItem(`contest_${contestId}_startedAt`, response.data.progress.startedAt);

            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to start contest');
            throw error;
        }
    };

    // Final submit
    const finalSubmit = async (mcqAnswers = []) => {
        try {
            const response = await api.post(`/contests/${contestId}/submit`, {
                mcqAnswers
            });

            // Clear localStorage
            localStorage.removeItem(`contest_${contestId}_startedAt`);
            localStorage.removeItem(`timer_${contestId}`);

            toast.success('Contest submitted successfully!');
            navigate(`/contest/${contestId}/result`);

            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit contest');
            throw error;
        }
    };

    // Track time for a question
    const trackQuestionTime = async (type, questionId, timeSpent) => {
        try {
            await api.post(`/contests/${contestId}/track-time`, {
                type,
                questionId,
                timeSpent
            });
        } catch (error) {
            console.error('Failed to track time:', error);
        }
    };

    // Timer countdown effect
    const hasAutoSubmittedRef = useRef(false);
    useEffect(() => {
        if (!isStarted || remainingTime === null) return;

        const timer = setInterval(() => {
            setRemainingTime(prev => {
                if (prev <= 1) {
                    if (!hasAutoSubmittedRef.current) {
                        hasAutoSubmittedRef.current = true;
                        // Time's up - auto submit with MCQ answers from localStorage
                        toast.error('Time is up! Auto-submitting...');

                        // Read MCQ answers from localStorage
                        const mcqAnswers = JSON.parse(localStorage.getItem(`mcq_answers_${contestId}`) || '{}');
                        const formattedAnswers = Object.entries(mcqAnswers).map(([mcqId, selectedOptions]) => ({
                            mcqId,
                            selectedOptions
                        }));

                        finalSubmit(formattedAnswers);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStarted, contestId]);

    // Warn user when trying to leave/close browser during active contest
    useEffect(() => {
        if (!isStarted) return;

        const handleBeforeUnload = (e) => {
            const message = 'You have an active contest! Leaving this page may result in your answers being submitted. Are you sure you want to leave?';
            e.preventDefault();
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isStarted]);

    // Fetch progress on mount
    useEffect(() => {
        if (contestId) {
            fetchProgress();
        }
    }, [contestId, fetchProgress]);

    const value = {
        remainingTime,
        formattedTime: formatTime(remainingTime),
        isStarted,
        progress,
        contest,
        loading,
        startContest,
        finalSubmit,
        trackQuestionTime,
        fetchProgress
    };

    return (
        <ContestTimerContext.Provider value={value}>
            {children}
        </ContestTimerContext.Provider>
    );
};

export default ContestTimerContext;
