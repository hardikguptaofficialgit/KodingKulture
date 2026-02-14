import Result from '../models/Result.js';
import Contest from '../models/Contest.js';
import ContestProgress from '../models/ContestProgress.js';
import User from '../models/User.js';
import MCQ from '../models/MCQ.js';
import CodingProblem from '../models/CodingProblem.js';
import FormSubmission from '../models/FormSubmission.js';

// @desc    Generate certificate for user
// @route   POST /api/leaderboard/:contestId/certificate
// @access  Private
export const generateCertificate = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user._id;

    const result = await Result.findOne({ contestId, userId })
      .populate('contestId', 'title')
      .populate('userId', 'name email');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    if (result.status !== 'SUBMITTED' && result.status !== 'EVALUATED') {
      return res.status(400).json({
        success: false,
        message: 'Contest not completed yet'
      });
    }

    // Simple certificate data (can be extended with PDF generation using pdfkit)
    const certificateData = {
      certificateId: `CERT-${contestId.slice(-6)}-${userId.toString().slice(-6)}`,
      userName: result.userId.name,
      contestTitle: result.contestId.title,
      rank: result.rank,
      score: result.totalScore,
      issueDate: new Date().toLocaleDateString(),
      certificateUrl: `${process.env.CLIENT_URL}/certificate/${result._id}`
    };

    // Update result with certificate info
    result.certificateGenerated = true;
    result.certificateUrl = certificateData.certificateUrl;
    await result.save();

    res.status(200).json({
      success: true,
      certificate: certificateData
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating certificate'
    });
  }
};

// @desc    Get leaderboard for a contest
// @route   GET /api/leaderboard/:contestId
// @access  Public
export const getLeaderboard = async (req, res) => {
  try {
    const { contestId } = req.params;

    // Get contest to check if forms are enabled
    const contest = await Contest.findById(contestId).lean();
    const formsEnabled = contest?.sections?.forms?.enabled;

    const results = await Result.find({
      contestId,
      status: { $in: ['SUBMITTED', 'EVALUATED'] }
    })
      .populate('userId', 'name email college avatar')
      .sort({ totalScore: -1, timeTaken: 1 })
      .lean();

    // Get forms scores if forms are enabled
    let formScoresMap = {};
    if (formsEnabled) {
      const formSubmissions = await FormSubmission.aggregate([
        { $match: { contestId: contest._id } },
        {
          $group: {
            _id: '$userId',
            totalFormsScore: { $sum: '$totalScore' },
            isFullyEvaluated: { $min: { $cond: ['$isFullyEvaluated', 1, 0] } }
          }
        }
      ]);

      formSubmissions.forEach(sub => {
        formScoresMap[sub._id.toString()] = {
          formsScore: sub.totalFormsScore,
          isFormsEvaluated: sub.isFullyEvaluated === 1
        };
      });
    }

    // Assign ranks with tie-breaker and add forms scores
    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
      const userId = results[i].userId._id.toString();

      // Add forms scores to result
      if (formsEnabled && formScoresMap[userId]) {
        results[i].formsScore = formScoresMap[userId].formsScore;
        results[i].isFormsEvaluated = formScoresMap[userId].isFormsEvaluated;
      } else {
        results[i].formsScore = 0;
        results[i].isFormsEvaluated = !formsEnabled;
      }

      if (i > 0) {
        const prev = results[i - 1];
        const curr = results[i];

        if (curr.totalScore === prev.totalScore && curr.timeTaken === prev.timeTaken) {
          results[i].rank = results[i - 1].rank;
        } else {
          currentRank = i + 1;
          results[i].rank = currentRank;
        }
      } else {
        results[i].rank = currentRank;
      }

      // Update rank in database
      await Result.findByIdAndUpdate(results[i]._id, { rank: results[i].rank });
    }

    res.status(200).json({
      success: true,
      count: results.length,
      formsEnabled,
      leaderboard: results
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leaderboard'
    });
  }
};

// @desc    Get user's rank in contest
// @route   GET /api/leaderboard/:contestId/rank
// @access  Private
export const getUserRank = async (req, res) => {
  try {
    const { contestId } = req.params;

    const result = await Result.findOne({
      userId: req.user._id,
      contestId
    }).populate('userId', 'name email');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No result found for this contest'
      });
    }

    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Get rank error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching rank'
    });
  }
};

// @desc    Get contest statistics
// @route   GET /api/leaderboard/:contestId/stats
// @access  Public
export const getContestStats = async (req, res) => {
  try {
    const { contestId } = req.params;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const totalParticipants = contest.participants.length;
    const submitted = await Result.countDocuments({
      contestId,
      status: { $in: ['SUBMITTED', 'EVALUATED'] }
    });

    const avgScore = await Result.aggregate([
      { $match: { contestId: contest._id, status: { $in: ['SUBMITTED', 'EVALUATED'] } } },
      { $group: { _id: null, avgScore: { $avg: '$totalScore' } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalParticipants,
        submitted,
        averageScore: avgScore[0]?.avgScore || 0,
        contestTitle: contest.title
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
};

// @desc    Get detailed user time stats (Admin only)
// @route   GET /api/leaderboard/:contestId/user/:userId/details
// @access  Private (Admin or Organiser)
export const getUserDetailedStats = async (req, res) => {
  try {
    const { contestId, userId } = req.params;

    // Check if requester is admin or organiser
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANISER') {
      return res.status(403).json({
        success: false,
        message: 'Admin or Organiser access required'
      });
    }

    // Get user's contest progress with detailed time tracking
    const progress = await ContestProgress.findOne({ contestId, userId })
      .populate('userId', 'name email')
      .lean();

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this user'
      });
    }

    // Get result for scores
    const result = await Result.findOne({ contestId, userId }).lean();

    // Get MCQ questions for titles
    const mcqIds = progress.mcqProgress?.questionTimes?.map(q => q.questionId) || [];
    const mcqs = await MCQ.find({ _id: { $in: mcqIds } }).select('question category marks').lean();
    const mcqMap = new Map(mcqs.map(m => [m._id.toString(), m]));

    // Get coding problems for titles
    const problemIds = progress.codingProgress?.problemTimes?.map(p => p.problemId) || [];
    const problems = await CodingProblem.find({ _id: { $in: problemIds } }).select('title category score').lean();
    const problemMap = new Map(problems.map(p => [p._id.toString(), p]));

    // Build detailed time breakdown
    const mcqTimeDetails = (progress.mcqProgress?.questionTimes || []).map(qt => {
      const mcq = mcqMap.get(qt.questionId.toString());
      return {
        questionId: qt.questionId,
        questionText: mcq?.question?.substring(0, 50) + '...' || 'Unknown',
        category: mcq?.category || 'Unknown',
        timeSpent: qt.timeSpent,
        marks: mcq?.marks || 0
      };
    });

    const codingTimeDetails = (progress.codingProgress?.problemTimes || []).map(pt => {
      const problem = problemMap.get(pt.problemId.toString());
      return {
        problemId: pt.problemId,
        title: problem?.title || 'Unknown',
        category: problem?.category || 'Unknown',
        timeSpent: pt.timeSpent,
        score: problem?.score || 0
      };
    });

    // Calculate category-wise time
    const mcqCategoryTime = {};
    mcqTimeDetails.forEach(q => {
      const cat = q.category || 'Unknown';
      mcqCategoryTime[cat] = (mcqCategoryTime[cat] || 0) + q.timeSpent;
    });

    const codingCategoryTime = {};
    codingTimeDetails.forEach(p => {
      const cat = p.category || 'Unknown';
      codingCategoryTime[cat] = (codingCategoryTime[cat] || 0) + p.timeSpent;
    });

    // Get forms time from FormSubmission
    const formSubmissions = await FormSubmission.find({ contestId, userId })
      .populate('formId', 'title')
      .lean();

    const formsSectionTime = formSubmissions.reduce((total, sub) => total + (sub.timeTaken || 0), 0);
    const formsTimeDetails = formSubmissions.map(sub => ({
      formId: sub.formId?._id || sub.formId,
      title: sub.formId?.title || 'Unknown Form',
      timeSpent: sub.timeTaken || 0,
      score: sub.totalScore || 0,
      maxScore: sub.maxPossibleScore || 0,
      isEvaluated: sub.isFullyEvaluated
    }));

    // --- MCQ Answer Details (including unanswered) ---
    // MCQs can be linked via direct contestId OR via ContestMCQ junction table
    const ContestMCQ = (await import('../models/ContestMCQ.js')).default;
    const directMcqs = await MCQ.find({ contestId })
      .select('question options marks negativeMarks category')
      .lean();
    const junctionEntries = await ContestMCQ.find({ contestId })
      .populate({ path: 'mcqId', select: 'question options marks negativeMarks category' })
      .sort({ order: 1 })
      .lean();

    // Merge both sources, deduplicate by MCQ _id
    const allMcqMap = new Map();
    for (const m of directMcqs) {
      allMcqMap.set(m._id.toString(), m);
    }
    for (const je of junctionEntries) {
      if (je.mcqId) {
        const mcq = je.mcqId;
        if (!allMcqMap.has(mcq._id.toString())) {
          // Apply junction overrides if set
          allMcqMap.set(mcq._id.toString(), {
            ...mcq,
            marks: je.marks ?? mcq.marks,
            negativeMarks: je.negativeMarks ?? mcq.negativeMarks
          });
        }
      }
    }
    const allContestMcqs = Array.from(allMcqMap.values());

    const answeredMcqMap = new Map();
    if (result?.mcqAnswers) {
      for (const answer of result.mcqAnswers) {
        answeredMcqMap.set(answer.questionId?.toString(), answer);
      }
    }
    const mcqAnswerDetails = allContestMcqs.map(mcq => {
      const answer = answeredMcqMap.get(mcq._id.toString());
      if (answer) {
        return {
          questionId: mcq._id,
          questionText: mcq.question,
          category: mcq.category || 'Unknown',
          options: mcq.options?.map((opt, idx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            wasSelected: (answer.selectedOptions || []).includes(idx)
          })) || [],
          selectedOptions: answer.selectedOptions || [],
          isCorrect: answer.isCorrect,
          marksAwarded: answer.marksAwarded,
          maxMarks: mcq.marks || 1,
          negativeMarks: mcq.negativeMarks || 0,
          unanswered: false
        };
      } else {
        return {
          questionId: mcq._id,
          questionText: mcq.question,
          category: mcq.category || 'Unknown',
          options: mcq.options?.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            wasSelected: false
          })) || [],
          selectedOptions: [],
          isCorrect: false,
          marksAwarded: 0,
          maxMarks: mcq.marks || 1,
          negativeMarks: mcq.negativeMarks || 0,
          unanswered: true
        };
      }
    });

    // --- Coding Submission Details (including unattempted) ---
    // Coding problems can be linked via direct contestId OR via ContestCodingProblem junction table
    const Submission = (await import('../models/Submission.js')).default;
    const ContestCodingProblemModel = (await import('../models/ContestCodingProblem.js')).default;
    const directProblems = await CodingProblem.find({ contestId })
      .select('title category score order')
      .lean();
    const codingJunctionEntries = await ContestCodingProblemModel.find({ contestId })
      .populate({ path: 'problemId', select: 'title category score' })
      .sort({ order: 1 })
      .lean();

    // Merge both sources, deduplicate by problem _id
    const problemMergeMap = new Map();
    for (const p of directProblems) {
      problemMergeMap.set(p._id.toString(), p);
    }
    for (const je of codingJunctionEntries) {
      if (je.problemId) {
        const prob = je.problemId;
        if (!problemMergeMap.has(prob._id.toString())) {
          problemMergeMap.set(prob._id.toString(), {
            ...prob,
            score: je.score ?? prob.score,
            order: je.order ?? 0
          });
        }
      }
    }
    const allContestProblems = Array.from(problemMergeMap.values())
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const attemptedProblemMap = new Map();
    if (result?.codingSubmissions) {
      for (const cs of result.codingSubmissions) {
        attemptedProblemMap.set(cs.problemId?.toString(), cs);
      }
    }
    const codingAnswerDetails = [];
    for (const problem of allContestProblems) {
      const cs = attemptedProblemMap.get(problem._id.toString());

      // Always query submissions directly — they may exist even if result doesn't track them
      const allSubs = await Submission.find({
        userId, contestId, problemId: problem._id
      }).select('verdict score testcasesPassed totalTestcases language submittedAt sourceCode').sort({ submittedAt: 1 }).lean();

      if (allSubs.length > 0) {
        // Has submissions — show them (whether result tracks them or not)
        const bestScore = cs?.score || Math.max(...allSubs.map(s => s.score || 0), 0);
        const solved = cs?.solved || allSubs.some(s => s.verdict === 'ACCEPTED');

        codingAnswerDetails.push({
          problemId: problem._id,
          title: problem.title,
          category: problem.category || 'Unknown',
          maxScore: problem.score || 100,
          bestScore,
          solved,
          totalAttempts: allSubs.length,
          unanswered: false,
          submissions: allSubs.map(sub => ({
            submissionId: sub._id,
            verdict: sub.verdict,
            score: sub.score,
            testcasesPassed: sub.testcasesPassed,
            totalTestcases: sub.totalTestcases,
            language: sub.language,
            submittedAt: sub.submittedAt
          }))
        });
      } else {
        // Truly unanswered — no submissions at all
        codingAnswerDetails.push({
          problemId: problem._id,
          title: problem.title,
          category: problem.category || 'Unknown',
          maxScore: problem.score || 100,
          bestScore: 0,
          solved: false,
          totalAttempts: 0,
          unanswered: true,
          submissions: []
        });
      }
    }

    res.status(200).json({
      success: true,
      userDetails: {
        user: progress.userId,
        contestId,
        startedAt: progress.startedAt,
        submittedAt: progress.submittedAt,
        totalTimeSpent: progress.totalTimeSpent,
        status: progress.status,

        // Section-level summaries
        mcqSectionTime: progress.mcqProgress?.sectionTimeSpent || 0,
        codingSectionTime: progress.codingProgress?.sectionTimeSpent || 0,
        formsSectionTime,

        // Category-wise breakdown
        mcqCategoryTime,
        codingCategoryTime,

        // Per-question/problem/form time details
        mcqTimeDetails,
        codingTimeDetails,
        formsTimeDetails,

        // MCQ answer details (what they answered, correct/wrong per question)
        mcqAnswerDetails,

        // Coding submission details (per problem: attempts, verdicts, scores)
        codingAnswerDetails,

        // Scores
        mcqScore: result?.mcqScore || 0,
        codingScore: result?.codingScore || 0,
        formsScore: formSubmissions.reduce((total, sub) => total + (sub.totalScore || 0), 0),
        totalScore: result?.totalScore || 0,
        rank: result?.rank || null
      }
    });
  } catch (error) {
    console.error('Get user detailed stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user details'
    });
  }
};

// @desc    Get admin leaderboard with full user details (email, phone)
// @route   GET /api/leaderboard/:contestId/admin
// @access  Private (Admin or Contest Owner)
export const getAdminLeaderboard = async (req, res) => {
  try {
    const { contestId } = req.params;

    const results = await Result.find({
      contestId,
      status: { $in: ['SUBMITTED', 'EVALUATED'] }
    })
      .populate('userId', 'name email college phone avatar')
      .sort({ totalScore: -1, timeTaken: 1 })
      .lean();

    // Assign ranks
    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
      if (i > 0) {
        const prev = results[i - 1];
        const curr = results[i];
        if (curr.totalScore === prev.totalScore && curr.timeTaken === prev.timeTaken) {
          results[i].rank = results[i - 1].rank;
        } else {
          currentRank = i + 1;
          results[i].rank = currentRank;
        }
      } else {
        results[i].rank = currentRank;
      }
    }

    res.status(200).json({
      success: true,
      count: results.length,
      leaderboard: results
    });
  } catch (error) {
    console.error('Get admin leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching admin leaderboard'
    });
  }
};
