import cron from 'node-cron';
import ContestProgress from '../models/ContestProgress.js';
import Contest from '../models/Contest.js';
import Result from '../models/Result.js';

// Auto-submit expired contests every minute
export const startContestScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            await autoSubmitExpiredContests();
        } catch (error) {
            console.error('Contest scheduler error:', error);
        }
    });

    console.log('📅 Contest auto-submit scheduler started (runs every minute)');
};

// Find and auto-submit all expired IN_PROGRESS contests
const autoSubmitExpiredContests = async () => {
    try {
        // Get all IN_PROGRESS contest progress records
        const inProgressRecords = await ContestProgress.find({
            status: 'IN_PROGRESS'
        }).populate('contestId');

        const now = Date.now();
        let autoSubmittedCount = 0;

        for (const progress of inProgressRecords) {
            const contest = progress.contestId;

            if (!contest) {
                console.log(`Skipping progress ${progress._id} - contest not found`);
                continue;
            }

            const startedAt = new Date(progress.startedAt).getTime();
            const durationMs = contest.duration * 60 * 1000;
            const expiresAt = startedAt + durationMs;

            // Check if contest has expired (with 30 second grace period)
            if (now > expiresAt + 30000) {
                console.log(`Auto-submitting expired contest for user ${progress.userId}`);

                await autoSubmitSingleContest(progress, contest);
                autoSubmittedCount++;
            }
        }

        if (autoSubmittedCount > 0) {
            console.log(`✅ Auto-submitted ${autoSubmittedCount} expired contest(s)`);
        }
    } catch (error) {
        console.error('autoSubmitExpiredContests error:', error);
    }
};

// Auto-submit a single expired contest
const autoSubmitSingleContest = async (progress, contest) => {
    try {
        const MCQ = (await import('../models/MCQ.js')).default;
        const Submission = (await import('../models/Submission.js')).default;

        const now = new Date();
        const totalTimeSpent = Math.floor((now - progress.startedAt) / 1000);

        // Update progress status
        progress.status = 'SUBMITTED';
        progress.submittedAt = now;
        progress.totalTimeSpent = Math.min(totalTimeSpent, contest.duration * 60); // Cap at duration
        progress.terminationReason = 'TIMEOUT';

        await progress.save();

        // Calculate MCQ Score from saved answers
        let mcqScore = 0;
        const mcqAnswerDetails = [];

        if (progress.mcqProgress?.answers && progress.mcqProgress.answers.length > 0) {
            for (const answer of progress.mcqProgress.answers) {
                const mcq = await MCQ.findById(answer.mcqId);
                if (mcq) {
                    const correctAnswers = mcq.options
                        .map((opt, idx) => opt.isCorrect ? idx : -1)
                        .filter(idx => idx !== -1);

                    const userAnswers = answer.selectedOptions || [];
                    const isCorrect = userAnswers.length === correctAnswers.length &&
                        userAnswers.every(ans => correctAnswers.includes(ans));

                    const marksAwarded = isCorrect ? (mcq.marks || 1) : -(mcq.negativeMarks || 0);
                    mcqScore += marksAwarded;

                    mcqAnswerDetails.push({
                        questionId: mcq._id,
                        selectedOptions: userAnswers,
                        isCorrect,
                        marksAwarded
                    });
                }
            }
        }

        // Calculate Coding Score from submissions
        let codingScore = 0;
        const codingSubmissions = [];

        const submissions = await Submission.find({
            userId: progress.userId,
            contestId: contest._id
        });

        // Get best submission per problem
        const problemBestScores = {};
        for (const sub of submissions) {
            const pid = sub.problemId.toString();
            if (!problemBestScores[pid] || sub.score > problemBestScores[pid].score) {
                problemBestScores[pid] = sub;
            }
        }

        for (const [problemId, bestSub] of Object.entries(problemBestScores)) {
            codingScore += bestSub.score;
            codingSubmissions.push({
                problemId: bestSub.problemId,
                bestSubmission: bestSub._id,
                bestScore: bestSub.score,
                attempts: submissions.filter(s => s.problemId.toString() === problemId).length
            });
        }

        const totalScore = mcqScore + codingScore;

        // Update or create Result
        await Result.findOneAndUpdate(
            { userId: progress.userId, contestId: contest._id },
            {
                mcqScore,
                mcqAnswers: mcqAnswerDetails,
                codingScore,
                codingSubmissions,
                totalScore,
                timeTaken: Math.min(totalTimeSpent, contest.duration * 60),
                status: 'SUBMITTED',
                submittedAt: now
            },
            { upsert: true, new: true }
        );

        console.log(`  → User ${progress.userId}: MCQ=${mcqScore}, Coding=${codingScore}, Total=${totalScore}`);
    } catch (error) {
        console.error(`Failed to auto-submit for user ${progress.userId}:`, error);
    }
};

export default { startContestScheduler };
