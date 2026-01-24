import CodingProblem from '../models/CodingProblem.js';
import ContestCodingProblem from '../models/ContestCodingProblem.js';
import Contest from '../models/Contest.js';

// ============ LIBRARY ENDPOINTS ============

// @desc    Get all library coding problems
// @route   GET /api/coding/library
// @access  Private/Admin or Organiser
export const getLibraryProblems = async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;

    let filter = { isLibrary: true };

    // Admin sees all library problems
    // Organiser sees: public problems (from admin) + their own private problems
    if (req.user.role === 'ORGANISER') {
      filter = {
        isLibrary: true,
        $or: [
          { isPublic: true },  // Admin's public problems
          { createdBy: req.user._id }  // Their own problems
        ]
      };
    }

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      const searchFilter = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      };
      filter = { ...filter, ...searchFilter };
    }

    const problems = await CodingProblem.find(filter)
      .select('-testcases')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error('Get library problems error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching library problems'
    });
  }
};

// @desc    Create library coding problem
// @route   POST /api/coding/library
// @access  Private/Admin or Organiser
export const createLibraryProblem = async (req, res) => {
  try {
    const problemData = {
      ...req.body,
      isLibrary: true,
      contestId: null,
      createdBy: req.user._id,
      // Organiser problems are always private, Admin can set isPublic
      isPublic: req.user.role === 'ADMIN' ? (req.body.isPublic !== false) : false
    };

    const problem = await CodingProblem.create(problemData);

    res.status(201).json({
      success: true,
      message: req.user.role === 'ADMIN'
        ? 'Library problem created successfully'
        : 'Personal library problem created (private)',
      problem
    });
  } catch (error) {
    console.error('Create library problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating library problem'
    });
  }
};

// @desc    Update library coding problem
// @route   PUT /api/coding/library/:id
// @access  Private/Admin
export const updateLibraryProblem = async (req, res) => {
  try {
    const problem = await CodingProblem.findOneAndUpdate(
      { _id: req.params.id, isLibrary: true },
      req.body,
      { new: true, runValidators: true }
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Library problem not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Library problem updated successfully',
      problem
    });
  } catch (error) {
    console.error('Update library problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating library problem'
    });
  }
};

// @desc    Delete library coding problem
// @route   DELETE /api/coding/library/:id
// @access  Private/Admin
export const deleteLibraryProblem = async (req, res) => {
  try {
    const problem = await CodingProblem.findOneAndDelete({ _id: req.params.id, isLibrary: true });

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Library problem not found'
      });
    }

    // Also remove from all contests
    await ContestCodingProblem.deleteMany({ problemId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Library problem deleted successfully'
    });
  } catch (error) {
    console.error('Delete library problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting library problem'
    });
  }
};

// @desc    Add library problems to contest
// @route   POST /api/coding/contest/:contestId/add-from-library
// @access  Private/Admin
export const addLibraryProblemsToContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemIds } = req.body;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const lastProblem = await ContestCodingProblem.findOne({ contestId }).sort({ order: -1 });
    let currentOrder = lastProblem ? lastProblem.order + 1 : 1;

    const addedProblems = [];
    for (const problemId of problemIds) {
      const problem = await CodingProblem.findOne({ _id: problemId, isLibrary: true });
      if (!problem) continue;

      const existing = await ContestCodingProblem.findOne({ contestId, problemId });
      if (existing) continue;

      const contestProblem = await ContestCodingProblem.create({
        contestId,
        problemId,
        score: problem.score,
        order: currentOrder++
      });

      addedProblems.push(contestProblem);
    }

    const totalScore = addedProblems.reduce((sum, cp) => sum + cp.score, 0);
    contest.sections.coding.totalMarks += totalScore;
    await contest.save();

    res.status(200).json({
      success: true,
      message: `${addedProblems.length} problems added to contest`,
      addedProblems
    });
  } catch (error) {
    console.error('Add library problems error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding problems to contest'
    });
  }
};

// @desc    Remove problem from contest
// @route   DELETE /api/coding/contest/:contestId/problem/:problemId
// @access  Private/Admin
export const removeProblemFromContest = async (req, res) => {
  try {
    const { contestId, problemId } = req.params;

    const contestProblem = await ContestCodingProblem.findOneAndDelete({ contestId, problemId });

    if (!contestProblem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found in contest'
      });
    }

    const contest = await Contest.findById(contestId);
    if (contest) {
      contest.sections.coding.totalMarks -= contestProblem.score;
      await contest.save();
    }

    res.status(200).json({
      success: true,
      message: 'Problem removed from contest'
    });
  } catch (error) {
    console.error('Remove problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing problem'
    });
  }
};

// ============ CONTEST ENDPOINTS ============

// @desc    Get coding problems for a contest
// @route   GET /api/coding/contest/:contestId
// @access  Private
export const getCodingProblemsByContest = async (req, res) => {
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

    // Get contest-specific problems
    const directProblems = await CodingProblem.find({ contestId })
      .sort({ order: 1 })
      .select(req.user.role === 'ADMIN' ? '' : '-testcases');

    // Get library problems linked to this contest
    const contestProblemLinks = await ContestCodingProblem.find({ contestId })
      .populate({
        path: 'problemId',
        select: req.user.role === 'ADMIN' ? '' : '-testcases'
      })
      .sort({ order: 1 });

    const libraryProblems = contestProblemLinks
      .filter(link => link.problemId !== null)
      .map(link => ({
        ...link.problemId.toObject(),
        _id: link.problemId._id,
        score: link.score || link.problemId.score,
        order: link.order,
        contestProblemId: link._id
      }));

    const allProblems = [...directProblems, ...libraryProblems].sort((a, b) => a.order - b.order);

    res.status(200).json({
      success: true,
      count: allProblems.length,
      problems: allProblems,
      contest: {
        title: contest.title,
        duration: contest.duration,
        startTime: contest.startTime,
        endTime: contest.endTime
      }
    });
  } catch (error) {
    console.error('Get coding problems error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coding problems'
    });
  }
};

// @desc    Get single coding problem
// @route   GET /api/coding/:id
// @access  Private
export const getCodingProblemById = async (req, res) => {
  try {
    const problem = await CodingProblem.findById(req.params.id)
      .select('-testcases');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    res.status(200).json({
      success: true,
      problem
    });
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching problem'
    });
  }
};

// @desc    Create coding problem (Admin)
// @route   POST /api/coding
// @access  Private/Admin
export const createCodingProblem = async (req, res) => {
  try {
    const problem = await CodingProblem.create(req.body);

    if (problem.contestId) {
      const contest = await Contest.findById(problem.contestId);
      if (contest) {
        contest.sections.coding.totalMarks += problem.score;
        await contest.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Coding problem created successfully',
      problem
    });
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating problem'
    });
  }
};

// @desc    Update coding problem (Admin)
// @route   PUT /api/coding/:id
// @access  Private/Admin
export const updateCodingProblem = async (req, res) => {
  try {
    const problem = await CodingProblem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Problem updated successfully',
      problem
    });
  } catch (error) {
    console.error('Update problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating problem'
    });
  }
};

// @desc    Delete coding problem (Admin)
// @route   DELETE /api/coding/:id
// @access  Private/Admin
export const deleteCodingProblem = async (req, res) => {
  try {
    const problem = await CodingProblem.findByIdAndDelete(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Problem deleted successfully'
    });
  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting problem'
    });
  }
};

// @desc    Get problem metrics
// @route   GET /api/coding/:id/metrics
// @access  Private/Admin
export const getProblemMetrics = async (req, res) => {
  try {
    const problem = await CodingProblem.findById(req.params.id).select('title metrics');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    const successRate = problem.metrics.attempted > 0
      ? ((problem.metrics.accepted / problem.metrics.attempted) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      metrics: {
        ...problem.metrics.toObject(),
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

