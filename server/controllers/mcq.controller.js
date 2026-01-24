import MCQ from '../models/MCQ.js';
import ContestMCQ from '../models/ContestMCQ.js';
import Result from '../models/Result.js';
import Contest from '../models/Contest.js';

// ============ LIBRARY ENDPOINTS ============

// @desc    Get all library MCQs
// @route   GET /api/mcq/library
// @access  Private/Admin or Organiser
export const getLibraryMCQs = async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;

    let filter = { isLibrary: true };

    // Admin sees all library questions
    // Organiser sees: public questions (from admin) + their own private questions
    if (req.user.role === 'ORGANISER') {
      filter = {
        isLibrary: true,
        $or: [
          { isPublic: true },  // Admin's public questions
          { createdBy: req.user._id }  // Their own questions
        ]
      };
    }

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      const searchFilter = {
        $or: [
          { question: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      };
      filter = { ...filter, ...searchFilter };
    }

    const mcqs = await MCQ.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mcqs.length,
      mcqs
    });
  } catch (error) {
    console.error('Get library MCQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching library MCQs'
    });
  }
};

// @desc    Create library MCQ
// @route   POST /api/mcq/library
// @access  Private/Admin or Organiser
export const createLibraryMCQ = async (req, res) => {
  try {
    const mcqData = {
      ...req.body,
      isLibrary: true,
      contestId: null,
      createdBy: req.user._id,
      // Organiser questions are always private, Admin can set isPublic
      isPublic: req.user.role === 'ADMIN' ? (req.body.isPublic !== false) : false
    };

    const mcq = await MCQ.create(mcqData);

    res.status(201).json({
      success: true,
      message: req.user.role === 'ADMIN'
        ? 'Library MCQ created successfully'
        : 'Personal library MCQ created (private)',
      mcq
    });
  } catch (error) {
    console.error('Create library MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating library MCQ'
    });
  }
};

// @desc    Update library MCQ
// @route   PUT /api/mcq/library/:id
// @access  Private/Admin
export const updateLibraryMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.findOneAndUpdate(
      { _id: req.params.id, isLibrary: true },
      req.body,
      { new: true, runValidators: true }
    );

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'Library MCQ not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Library MCQ updated successfully',
      mcq
    });
  } catch (error) {
    console.error('Update library MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating library MCQ'
    });
  }
};

// @desc    Delete library MCQ
// @route   DELETE /api/mcq/library/:id
// @access  Private/Admin
export const deleteLibraryMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.findOneAndDelete({ _id: req.params.id, isLibrary: true });

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'Library MCQ not found'
      });
    }

    // Also remove from all contests
    await ContestMCQ.deleteMany({ mcqId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Library MCQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete library MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting library MCQ'
    });
  }
};

// @desc    Add library MCQs to contest
// @route   POST /api/mcq/contest/:contestId/add-from-library
// @access  Private/Admin
export const addLibraryMCQsToContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { mcqIds } = req.body; // Array of library MCQ IDs

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Get current max order
    const lastMCQ = await ContestMCQ.findOne({ contestId }).sort({ order: -1 });
    let currentOrder = lastMCQ ? lastMCQ.order + 1 : 1;

    const addedMCQs = [];
    for (const mcqId of mcqIds) {
      const mcq = await MCQ.findOne({ _id: mcqId, isLibrary: true });
      if (!mcq) continue;

      // Check if already added
      const existing = await ContestMCQ.findOne({ contestId, mcqId });
      if (existing) continue;

      const contestMCQ = await ContestMCQ.create({
        contestId,
        mcqId,
        marks: mcq.marks,
        order: currentOrder++
      });

      addedMCQs.push(contestMCQ);
    }

    // Update contest total marks
    const totalMarks = addedMCQs.reduce((sum, cm) => sum + cm.marks, 0);
    contest.sections.mcq.totalMarks += totalMarks;
    await contest.save();

    res.status(200).json({
      success: true,
      message: `${addedMCQs.length} MCQs added to contest`,
      addedMCQs
    });
  } catch (error) {
    console.error('Add library MCQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding MCQs to contest'
    });
  }
};

// @desc    Remove MCQ from contest
// @route   DELETE /api/mcq/contest/:contestId/mcq/:mcqId
// @access  Private/Admin
export const removeMCQFromContest = async (req, res) => {
  try {
    const { contestId, mcqId } = req.params;

    const contestMCQ = await ContestMCQ.findOneAndDelete({ contestId, mcqId });

    if (!contestMCQ) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found in contest'
      });
    }

    // Update contest total marks
    const contest = await Contest.findById(contestId);
    if (contest) {
      contest.sections.mcq.totalMarks -= contestMCQ.marks;
      await contest.save();
    }

    res.status(200).json({
      success: true,
      message: 'MCQ removed from contest'
    });
  } catch (error) {
    console.error('Remove MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing MCQ'
    });
  }
};

// ============ CONTEST ENDPOINTS ============

// @desc    Get MCQs for a contest (includes library MCQs linked via ContestMCQ)
// @route   GET /api/mcq/contest/:contestId
// @access  Private
export const getMCQsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Check access: Admin, Organiser (creator), or registered participant
    const isCreator = contest.createdBy?.toString() === req.user._id.toString();
    const isParticipant = contest.participants?.includes(req.user._id);
    const isAdminOrCreator = req.user.role === 'ADMIN' || (req.user.role === 'ORGANISER' && isCreator);

    if (!isAdminOrCreator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not registered for this contest'
      });
    }

    // Get contest-specific MCQs
    const directMCQs = await MCQ.find({ contestId })
      .sort({ order: 1 })
      .select(req.user.role === 'ADMIN' ? '' : '-correctAnswers -explanation');

    // Get library MCQs linked to this contest
    const contestMCQLinks = await ContestMCQ.find({ contestId })
      .populate({
        path: 'mcqId',
        select: req.user.role === 'ADMIN' ? '' : '-correctAnswers -explanation'
      })
      .sort({ order: 1 });

    // Combine and format
    const libraryMCQs = contestMCQLinks
      .filter(link => link.mcqId !== null)
      .map(link => ({
        ...link.mcqId.toObject(),
        _id: link.mcqId._id,
        marks: link.marks || link.mcqId.marks,
        order: link.order,
        contestMCQId: link._id
      }));

    // Contest info already fetched above

    const allMCQs = [...directMCQs, ...libraryMCQs].sort((a, b) => a.order - b.order);

    res.status(200).json({
      success: true,
      count: allMCQs.length,
      mcqs: allMCQs,
      contest
    });
  } catch (error) {
    console.error('Get MCQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching MCQs'
    });
  }
};

// @desc    Submit MCQ answers (with metrics tracking)
// @route   POST /api/mcq/submit
// @access  Private
export const submitMCQAnswers = async (req, res) => {
  try {
    const { contestId, answers } = req.body;

    let totalScore = 0;
    const mcqAnswers = [];

    for (const answer of answers) {
      const mcq = await MCQ.findById(answer.questionId);

      if (!mcq) continue;

      const isCorrect = JSON.stringify(answer.selectedOptions.sort()) ===
        JSON.stringify(mcq.correctAnswers.sort());

      let marksAwarded = 0;
      if (isCorrect) {
        marksAwarded = mcq.marks;
      } else if (answer.selectedOptions.length > 0) {
        marksAwarded = -mcq.negativeMarks;
      }

      totalScore += marksAwarded;

      mcqAnswers.push({
        questionId: answer.questionId,
        selectedOptions: answer.selectedOptions,
        isCorrect,
        marksAwarded,
        timeTaken: answer.timeTaken || 0
      });

      // Update global metrics on the MCQ
      await MCQ.findByIdAndUpdate(answer.questionId, {
        $inc: {
          'metrics.attempted': 1,
          'metrics.correct': isCorrect ? 1 : 0,
          'metrics.wrong': isCorrect ? 0 : 1
        }
      });

      // Update contest-specific metrics if linked from library
      if (mcq.isLibrary) {
        await ContestMCQ.findOneAndUpdate(
          { contestId, mcqId: answer.questionId },
          {
            $inc: {
              'contestMetrics.attempted': 1,
              'contestMetrics.correct': isCorrect ? 1 : 0,
              'contestMetrics.wrong': isCorrect ? 0 : 1
            }
          }
        );
      }
    }

    // Update result
    const result = await Result.findOneAndUpdate(
      { userId: req.user._id, contestId },
      {
        mcqScore: totalScore,
        mcqAnswers
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'MCQ answers submitted successfully',
      score: totalScore,
      result
    });
  } catch (error) {
    console.error('Submit MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting MCQ answers'
    });
  }
};

// @desc    Create MCQ (Admin) - for direct contest MCQs
// @route   POST /api/mcq
// @access  Private/Admin
export const createMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.create(req.body);

    // Update contest total marks if linked to a contest
    if (mcq.contestId) {
      const contest = await Contest.findById(mcq.contestId);
      if (contest) {
        contest.sections.mcq.totalMarks += mcq.marks;
        await contest.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'MCQ created successfully',
      mcq
    });
  } catch (error) {
    console.error('Create MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating MCQ'
    });
  }
};

// @desc    Update MCQ (Admin)
// @route   PUT /api/mcq/:id
// @access  Private/Admin
export const updateMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'MCQ updated successfully',
      mcq
    });
  } catch (error) {
    console.error('Update MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating MCQ'
    });
  }
};

// @desc    Delete MCQ (Admin)
// @route   DELETE /api/mcq/:id
// @access  Private/Admin
export const deleteMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.findByIdAndDelete(req.params.id);

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'MCQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete MCQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting MCQ'
    });
  }
};

// @desc    Get MCQ metrics
// @route   GET /api/mcq/:id/metrics
// @access  Private/Admin
export const getMCQMetrics = async (req, res) => {
  try {
    const mcq = await MCQ.findById(req.params.id).select('question metrics');

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found'
      });
    }

    const successRate = mcq.metrics.attempted > 0
      ? ((mcq.metrics.correct / mcq.metrics.attempted) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      metrics: {
        ...mcq.metrics.toObject(),
        successRate: `${successRate}%`
      }
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching metrics'
    });
  }
};

// @desc    Get MCQ review for a contest (user's answers with correct answers)
// @route   GET /api/mcq/contest/:contestId/review
// @access  Private
export const getContestMCQReview = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user._id;

    // Get user's MCQ submission
    const ContestProgress = (await import('../models/ContestProgress.js')).default;
    const progress = await ContestProgress.findOne({ contestId, userId });

    if (!progress || progress.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Contest not submitted yet'
      });
    }

    // Get MCQs for this contest (both direct and library-linked)
    const directMCQs = await MCQ.find({ contestId }).sort({ order: 1 }).lean();

    const contestMCQLinks = await ContestMCQ.find({ contestId })
      .populate('mcqId')
      .sort({ order: 1 })
      .lean();

    const libraryMCQs = contestMCQLinks
      .filter(link => link.mcqId !== null)
      .map(link => ({
        ...link.mcqId,
        order: link.order  // Preserve order from ContestMCQ
      }));

    const allMCQs = [...directMCQs, ...libraryMCQs].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Build user answer map
    const userAnswerMap = {};
    (progress.mcqProgress?.answers || []).forEach(ans => {
      userAnswerMap[ans.mcqId?.toString()] = ans.selectedOptions || [];
    });

    // Build review data
    const review = allMCQs.map(mcq => {
      const userAnswer = userAnswerMap[mcq._id.toString()] || [];
      const correctAnswers = mcq.options
        .map((opt, idx) => opt.isCorrect ? idx : -1)
        .filter(idx => idx !== -1);

      // Check if correct
      const isCorrect = userAnswer.length === correctAnswers.length &&
        userAnswer.every(ans => correctAnswers.includes(ans));

      return {
        _id: mcq._id,
        question: mcq.question,
        options: mcq.options.map(opt => ({ text: opt.text })), // Don't expose isCorrect directly
        correctAnswers,
        userAnswer,
        isCorrect,
        marks: mcq.marks,
        negativeMarks: mcq.negativeMarks,
        difficulty: mcq.difficulty,
        category: mcq.category,
        explanation: mcq.explanation
      };
    });

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Get MCQ review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching review'
    });
  }
};
