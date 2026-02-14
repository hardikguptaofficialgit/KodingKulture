import Contest from '../models/Contest.js';
import Result from '../models/Result.js';
import Violation from '../models/Violation.js';
import ContestRegistration from '../models/ContestRegistration.js';
import ContestProgress from '../models/ContestProgress.js';
import Room from '../models/Room.js';
import MCQ from '../models/MCQ.js';
import MCQSubmission from '../models/MCQSubmission.js';
import Submission from '../models/Submission.js';
import CodingProblem from '../models/CodingProblem.js';
import ContestMCQ from '../models/ContestMCQ.js';
import ContestCodingProblem from '../models/ContestCodingProblem.js';
import FormSubmission from '../models/FormSubmission.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// @desc    Get all contests
// @route   GET /api/contests
// @access  Public
export const getAllContests = async (req, res) => {
  try {
    const { status } = req.query;

    // Public view: only show published AND approved contests that are NOT room-specific
    const query = {
      isPublished: true,
      verificationStatus: 'APPROVED',
      $or: [{ roomId: null }, { roomId: { $exists: false } }] // Exclude room contests
    };
    if (status) {
      query.status = status;
    }

    const contests = await Contest.find(query)
      .sort({ startTime: -1 })
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: contests.length,
      contests
    });
  } catch (error) {
    console.error('Get contests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contests'
    });
  }
};

// @desc    Get single contest
// @route   GET /api/contests/:id
// @access  Public
export const getContestById = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    res.status(200).json({
      success: true,
      contest
    });
  } catch (error) {
    console.error('Get contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contest'
    });
  }
};

// @desc    Create contest
// @route   POST /api/contests
// @access  Private/Admin or Organiser
export const createContest = async (req, res) => {
  try {
    const { roomId } = req.body;

    // Determine verification status:
    // - Admin contests: auto-approved
    // - Room contests: auto-approved (no admin verification needed)
    // - Regular organiser contests: pending approval
    let verificationStatus = 'PENDING';
    if (req.user.role === 'ADMIN') {
      verificationStatus = 'APPROVED';
    } else if (roomId) {
      // Verify the user is owner or co-organiser of the room
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      if (!room.isOwner(req.user._id) && !room.isCoOrganiser(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create contests in this room'
        });
      }
      verificationStatus = 'APPROVED'; // Room contests auto-approved
    }

    const contestData = {
      ...req.body,
      createdBy: req.user._id,
      verificationStatus,
      // Convert empty string roomId to null for proper MongoDB handling
      roomId: roomId && roomId.trim() !== '' ? roomId : null
    };

    const contest = await Contest.create(contestData);

    const message = req.user.role === 'ADMIN'
      ? 'Contest created successfully'
      : 'Contest created and submitted for approval';

    res.status(201).json({
      success: true,
      message,
      contest
    });
  } catch (error) {
    console.error('Create contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating contest'
    });
  }
};

// @desc    Update contest
// @route   PUT /api/contests/:id
// @access  Private/Admin
export const updateContest = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If timing is being updated, recalculate status
    if (updateData.startTime || updateData.endTime) {
      const now = new Date();
      const existingContest = (!updateData.startTime || !updateData.endTime)
        ? await Contest.findById(req.params.id) : null;
      const startTime = new Date(updateData.startTime || existingContest.startTime);
      const endTime = new Date(updateData.endTime || existingContest.endTime);

      if (now < startTime) {
        updateData.status = 'UPCOMING';
      } else if (now >= startTime && now <= endTime) {
        updateData.status = 'LIVE';
      } else {
        updateData.status = 'ENDED';
      }
    }

    const contest = await Contest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contest updated successfully',
      contest
    });
  } catch (error) {
    console.error('Update contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating contest'
    });
  }
};

// @desc    Delete contest
// @route   DELETE /api/contests/:id
// @access  Private/Admin
export const deleteContest = async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Cascade delete all related data
    const contestId = req.params.id;
    await Promise.all([
      Result.deleteMany({ contestId }),
      ContestProgress.deleteMany({ contestId }),
      ContestRegistration.deleteMany({ contestId }),
      Submission.deleteMany({ contestId }),
      MCQSubmission.deleteMany({ contestId }),
      FormSubmission.deleteMany({ contestId }),
      Violation.deleteMany({ contestId }),
      MCQ.deleteMany({ contestId, isLibrary: { $ne: true } }),
      CodingProblem.deleteMany({ contestId, isLibrary: { $ne: true } }),
      ContestMCQ.deleteMany({ contestId }),
      ContestCodingProblem.deleteMany({ contestId })
    ]);

    res.status(200).json({
      success: true,
      message: 'Contest and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting contest'
    });
  }
};

// @desc    Register for contest
// @route   POST /api/contests/:id/register
// @access  Private
export const registerForContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const contest = await Contest.findById(id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Block registration for ended contests
    if (contest.status === 'ENDED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for an ended contest'
      });
    }

    // Check if already registered in ContestRegistration
    const existingRegistration = await ContestRegistration.findOne({
      contestId: id,
      userId
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this contest'
      });
    }

    // Check max participants
    if (contest.maxParticipants && contest.participants.length >= contest.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Contest is full'
      });
    }

    // Create ContestRegistration record
    await ContestRegistration.create({
      contestId: id,
      userId,
      registeredAt: new Date()
    });

    // Also add to participants array for backward compatibility
    if (!contest.participants.includes(userId)) {
      contest.participants.push(userId);
      await contest.save();
    }

    // Create result entry
    const existingResult = await Result.findOne({ userId, contestId: id });
    if (!existingResult) {
      await Result.create({
        userId,
        contestId: contest._id,
        status: 'REGISTERED'
      });
    }

    // Return updated contest
    const updatedContest = await Contest.findById(contest._id).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Successfully registered for contest',
      contest: updatedContest
    });
  } catch (error) {
    console.error('Register contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error registering for contest'
    });
  }
};

// @desc    Get user's registered contests
// @route   GET /api/contests/my-contests
// @access  Private
export const getMyContests = async (req, res) => {
  try {
    const contests = await Contest.find({
      participants: req.user._id
    }).sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: contests.length,
      contests
    });
  } catch (error) {
    console.error('Get my contests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contests'
    });
  }
};

// @desc    Start contest (initialize progress and timer)
// @route   POST /api/contests/:id/start
// @access  Private
export const startContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Check if user is registered
    if (!contest.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not registered for this contest'
      });
    }

    // Check if contest is live
    if (contest.status !== 'LIVE') {
      return res.status(400).json({
        success: false,
        message: 'Contest is not currently live'
      });
    }

    // ContestProgress is now statically imported at the top of the file

    // Check if already started
    let progress = await ContestProgress.findOne({ contestId: id, userId });

    if (progress) {
      // Already started, return existing progress
      return res.status(200).json({
        success: true,
        message: 'Contest already started',
        progress,
        remainingTime: Math.max(0, contest.duration * 60 - Math.floor((Date.now() - progress.startedAt) / 1000))
      });
    }

    // Create new progress
    progress = await ContestProgress.create({
      contestId: id,
      userId,
      startedAt: new Date(),
      status: 'IN_PROGRESS'
    });

    res.status(201).json({
      success: true,
      message: 'Contest started',
      progress,
      remainingTime: contest.duration * 60
    });
  } catch (error) {
    console.error('Start contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting contest'
    });
  }
};

// @desc    Get contest progress
// @route   GET /api/contests/:id/progress
// @access  Private
export const getContestProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // ContestProgress is statically imported at the top
    const contest = await Contest.findById(id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const progress = await ContestProgress.findOne({ contestId: id, userId });

    if (!progress) {
      return res.status(200).json({
        success: true,
        started: false,
        message: 'Contest not started yet'
      });
    }

    const elapsedSeconds = Math.floor((Date.now() - progress.startedAt) / 1000);
    const remainingTime = Math.max(0, contest.duration * 60 - elapsedSeconds);

    res.status(200).json({
      success: true,
      started: true,
      progress,
      remainingTime,
      contest: {
        title: contest.title,
        duration: contest.duration,
        sections: contest.sections
      }
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching progress'
    });
  }
};

// @desc    Final submit contest
// @route   POST /api/contests/:id/submit
// @access  Private
export const finalSubmitContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { mcqAnswers, codingSubmissions } = req.body;

    // Models are statically imported at the top

    const progress = await ContestProgress.findOne({ contestId: id, userId });

    if (!progress) {
      return res.status(400).json({
        success: false,
        message: 'Contest not started'
      });
    }

    if (progress.status === 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Contest already submitted'
      });
    }

    const now = new Date();
    const totalTimeSpent = Math.floor((now - progress.startedAt) / 1000);

    // Update progress
    progress.submittedAt = now;
    progress.totalTimeSpent = totalTimeSpent;
    progress.status = 'SUBMITTED';

    // Save MCQ answers if provided
    if (mcqAnswers && mcqAnswers.length > 0) {
      progress.mcqProgress.answers = mcqAnswers;

      // Also save to MCQSubmission for scoring
      await MCQSubmission.findOneAndUpdate(
        { contestId: id, userId },
        {
          contestId: id,
          userId,
          answers: mcqAnswers,
          submittedAt: now
        },
        { upsert: true, new: true }
      );
    }

    await progress.save();

    // Calculate MCQ Score
    let mcqScore = 0;
    const mcqAnswerDetails = [];
    if (mcqAnswers && mcqAnswers.length > 0) {
      for (const answer of mcqAnswers) {
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

          // Update MCQ metrics
          mcq.metrics.attempted++;
          if (isCorrect) {
            mcq.metrics.correct++;
          } else {
            mcq.metrics.wrong++;
          }
          await mcq.save();
        }
      }
    }

    // Calculate Coding Score from accepted submissions
    let codingScore = 0;
    const codingSubmissionDetails = [];
    const userSubmissions = await Submission.find({
      userId,
      contestId: id,
      verdict: 'ACCEPTED'
    });

    // Group by problemId and get best score per problem
    const problemScores = {};
    for (const sub of userSubmissions) {
      const problemId = sub.problemId.toString();
      if (!problemScores[problemId] || sub.score > problemScores[problemId].score) {
        problemScores[problemId] = sub;
      }
    }

    for (const [problemId, sub] of Object.entries(problemScores)) {
      codingScore += sub.score || 0;
      codingSubmissionDetails.push({
        problemId: sub.problemId,
        bestSubmission: sub._id,
        score: sub.score || 0,
        solved: true
      });
    }

    const totalScore = mcqScore + codingScore;

    // Create or update Result record
    await Result.findOneAndUpdate(
      { contestId: id, userId },
      {
        contestId: id,
        userId,
        mcqScore,
        mcqAnswers: mcqAnswerDetails,
        codingScore,
        codingSubmissions: codingSubmissionDetails,
        totalScore,
        timeTaken: totalTimeSpent,
        startedAt: progress.startedAt,
        submittedAt: now,
        status: 'SUBMITTED'
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Contest submitted successfully',
      totalTimeSpent,
      mcqScore,
      codingScore,
      totalScore,
      progress
    });
  } catch (error) {
    console.error('Final submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting contest'
    });
  }
};

// @desc    Update question/problem time tracking
// @route   POST /api/contests/:id/track-time
// @access  Private
export const trackTime = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { type, questionId, problemId, timeSpent } = req.body;

    const ContestProgress = (await import('../models/ContestProgress.js')).default;
    const progress = await ContestProgress.findOne({ contestId: id, userId });

    if (!progress) {
      return res.status(400).json({
        success: false,
        message: 'Contest not started'
      });
    }

    if (type === 'mcq') {
      const existingTime = progress.mcqProgress.questionTimes.find(
        q => q.questionId.toString() === questionId
      );
      if (existingTime) {
        // Accumulate time instead of replacing
        existingTime.timeSpent += timeSpent;
        existingTime.answeredAt = new Date();
      } else {
        progress.mcqProgress.questionTimes.push({
          questionId,
          timeSpent,
          startedAt: new Date(),
          answeredAt: new Date()
        });
      }
    } else if (type === 'coding') {
      const pid = problemId || questionId; // Support both field names
      const existingTime = progress.codingProgress.problemTimes.find(
        p => p.problemId.toString() === pid
      );
      if (existingTime) {
        // Accumulate time instead of replacing
        existingTime.timeSpent += timeSpent;
        existingTime.submittedAt = new Date();
      } else {
        progress.codingProgress.problemTimes.push({
          problemId: pid,
          timeSpent,
          startedAt: new Date(),
          submittedAt: new Date()
        });
      }
    } else if (type === 'mcq-section') {
      // Accumulate MCQ section time
      progress.mcqProgress.sectionTimeSpent = (progress.mcqProgress.sectionTimeSpent || 0) + timeSpent;
    } else if (type === 'coding-section') {
      // Accumulate Coding section time
      progress.codingProgress.sectionTimeSpent = (progress.codingProgress.sectionTimeSpent || 0) + timeSpent;
    }

    await progress.save();

    res.status(200).json({
      success: true,
      message: 'Time tracked'
    });
  } catch (error) {
    console.error('Track time error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error tracking time'
    });
  }
};

// @desc    Save MCQ progress (periodic auto-save)
// @route   POST /api/contests/:id/save-progress
// @access  Private
export const saveProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { mcqAnswers } = req.body;

    // ContestProgress is statically imported at the top

    const progress = await ContestProgress.findOne({ contestId: id, userId });

    if (!progress) {
      return res.status(400).json({
        success: false,
        message: 'Contest not started'
      });
    }

    if (progress.status === 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Contest already submitted'
      });
    }

    // Save MCQ answers to progress
    if (mcqAnswers && mcqAnswers.length > 0) {
      progress.mcqProgress.answers = mcqAnswers;
    }

    await progress.save();

    res.status(200).json({
      success: true,
      message: 'Progress saved'
    });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving progress'
    });
  }
};

// @desc    Emergency save MCQ progress (for browser close - accepts token in body)
// @route   POST /api/contests/:id/emergency-save
// @access  Special (token in body, not header)
export const emergencySave = async (req, res) => {
  try {
    const { id } = req.params;
    const { mcqAnswers, token } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Verify token manually
    // jwt and User are statically imported at the top

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const userId = decoded.id;
    // ContestProgress is statically imported at the top

    const progress = await ContestProgress.findOne({ contestId: id, userId });

    if (!progress || progress.status === 'SUBMITTED') {
      return res.status(200).json({ success: true, message: 'No save needed' });
    }

    // Save MCQ answers
    if (mcqAnswers && mcqAnswers.length > 0) {
      progress.mcqProgress.answers = mcqAnswers;
      await progress.save();
    }

    res.status(200).json({ success: true, message: 'Emergency save successful' });
  } catch (error) {
    console.error('Emergency save error:', error);
    res.status(500).json({ success: false, message: 'Emergency save failed' });
  }
};

// @desc    Log proctoring violation
// @route   POST /api/contests/:id/violation
// @access  Private
export const logViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { type, details } = req.body;

    // ContestProgress is statically imported at the top

    // Get current progress
    const progress = await ContestProgress.findOne({ contestId: id, userId });

    if (!progress) {
      return res.status(400).json({
        success: false,
        message: 'Contest not started'
      });
    }

    if (progress.status === 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Contest already submitted'
      });
    }

    // Increment warning count
    progress.warningCount = (progress.warningCount || 0) + 1;
    const warningNumber = progress.warningCount;

    // Log the violation
    await Violation.create({
      userId,
      contestId: id,
      type,
      warningNumber,
      details
    });

    // Check if max warnings reached (configurable per contest, default 3)
    const contest = await Contest.findById(id);
    const maxWarnings = contest?.maxWarnings || 3;
    let autoSubmit = false;

    if (warningNumber >= maxWarnings) {
      progress.status = 'SUBMITTED';
      progress.submittedAt = new Date();
      progress.terminationReason = 'MALPRACTICE';
      autoSubmit = true;
    }

    await progress.save();

    res.status(200).json({
      success: true,
      warningNumber,
      maxWarnings,
      autoSubmit,
      message: autoSubmit
        ? 'Maximum violations reached. Contest auto-submitted.'
        : `Warning ${warningNumber}/${maxWarnings}`
    });
  } catch (error) {
    console.error('Log violation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error logging violation'
    });
  }
};

// @desc    Get violations for a contest (Admin)
// @route   GET /api/contests/:id/violations
// @access  Private/Admin
export const getContestViolations = async (req, res) => {
  try {
    const { id } = req.params;

    const violations = await Violation.find({ contestId: id })
      .populate('userId', 'name email')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: violations.length,
      violations
    });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching violations'
    });
  }
};

// @desc    Check registration status for a contest
// @route   GET /api/contests/:id/registration-status
// @access  Private
export const getRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const registration = await ContestRegistration.findOne({
      contestId: id,
      userId
    });

    const progress = await ContestProgress.findOne({
      contestId: id,
      userId
    });

    res.status(200).json({
      success: true,
      isRegistered: !!registration,
      registeredAt: registration?.registeredAt || null,
      hasStarted: !!progress,
      startedAt: progress?.startedAt || null,
      status: progress?.status || null,
      submittedAt: progress?.submittedAt || null
    });
  } catch (error) {
    console.error('Check registration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking registration status'
    });
  }
};

// @desc    Get all participants for a contest (Admin view)
// @route   GET /api/contests/:id/participants
// @access  Private/Admin
export const getContestParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all registrations
    const registrations = await ContestRegistration.find({ contestId: id })
      .populate('userId', 'name email college phone')
      .sort({ registeredAt: 1 });

    // Get all progress records
    const progressRecords = await ContestProgress.find({ contestId: id })
      .populate('userId', 'name email college phone')
      .sort({ startedAt: 1 });

    // Build a combined view
    const participantMap = new Map();

    // Add registrations
    for (const reg of registrations) {
      if (reg.userId) {
        participantMap.set(reg.userId._id.toString(), {
          user: {
            id: reg.userId._id,
            name: reg.userId.name,
            email: reg.userId.email,
            college: reg.userId.college,
            phone: reg.userId.phone
          },
          registeredAt: reg.registeredAt,
          startedAt: null,
          submittedAt: null,
          status: 'REGISTERED',
          terminationReason: null
        });
      }
    }

    // Merge with progress records
    for (const prog of progressRecords) {
      if (prog.userId) {
        const key = prog.userId._id.toString();
        const existing = participantMap.get(key) || {
          user: {
            id: prog.userId._id,
            name: prog.userId.name,
            email: prog.userId.email,
            college: prog.userId.college,
            phone: prog.userId.phone
          },
          registeredAt: null
        };

        participantMap.set(key, {
          ...existing,
          startedAt: prog.startedAt,
          submittedAt: prog.submittedAt,
          status: prog.status || 'IN_PROGRESS',
          terminationReason: prog.terminationReason
        });
      }
    }

    const participants = Array.from(participantMap.values());

    // Summary stats
    const stats = {
      totalRegistered: registrations.length,
      totalStarted: progressRecords.length,
      totalSubmitted: progressRecords.filter(p => p.status === 'SUBMITTED').length,
      totalTimedOut: progressRecords.filter(p => p.status === 'TIMED_OUT').length,
      totalMalpractice: progressRecords.filter(p => p.terminationReason === 'MALPRACTICE').length,
      notStarted: registrations.length - progressRecords.length
    };

    res.status(200).json({
      success: true,
      stats,
      participants
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching participants'
    });
  }
};

// @desc    Get contests for admin/organiser dashboard
// @route   GET /api/contests/admin
// @access  Private/Admin or Organiser
export const getAdminContests = async (req, res) => {
  try {
    let query = {};

    // If organiser, show their own contests AND contests from rooms where they are co-organiser
    if (req.user.role === 'ORGANISER') {
      const coOrgRooms = await Room.find({ coOrganisers: req.user._id }).select('_id');
      const coOrgRoomIds = coOrgRooms.map(r => r._id);

      if (coOrgRoomIds.length > 0) {
        query.$or = [
          { createdBy: req.user._id },
          { roomId: { $in: coOrgRoomIds } }
        ];
      } else {
        query.createdBy = req.user._id;
      }
    }
    // Admin sees all contests

    const contests = await Contest.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('roomId', 'name shortCode');

    // Calculate stats
    const stats = {
      totalContests: contests.length,
      liveContests: contests.filter(c => c.status === 'LIVE').length,
      upcomingContests: contests.filter(c => c.status === 'UPCOMING').length,
      pendingApproval: contests.filter(c => c.verificationStatus === 'PENDING').length,
      totalParticipants: contests.reduce((sum, c) => sum + (c.participants?.length || 0), 0)
    };

    res.status(200).json({
      success: true,
      count: contests.length,
      stats,
      contests
    });
  } catch (error) {
    console.error('Get admin contests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contests'
    });
  }
};

// @desc    Manually end a contest and auto-submit all active participants
// @route   POST /api/contests/:id/end
// @access  Private/Admin or Organiser
export const endContestManually = async (req, res) => {
  try {
    const contestId = req.params.id;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Check ownership for organiser
    if (req.user.role === 'ORGANISER' && contest.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only end your own contests.'
      });
    }

    // Check if contest is already ended
    if (new Date(contest.endTime) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Contest has already ended'
      });
    }

    // Get all active participants (IN_PROGRESS but not SUBMITTED)
    const activeParticipants = await ContestProgress.find({
      contestId,
      status: 'IN_PROGRESS'
    }).populate('userId', 'name email');

    let autoSubmittedCount = 0;

    // Auto-submit each active participant
    for (const progress of activeParticipants) {
      try {
        // Calculate MCQ score from saved answers
        let mcqScore = 0;
        const mcqAnswers = progress.mcqAnswers || [];

        // Get MCQs for this contest to calculate scores
        // MCQ and ContestMCQ are statically imported at the top

        // Direct MCQs
        const directMCQs = await MCQ.find({ contestId });

        // Library MCQs linked to contest
        const contestMCQLinks = await ContestMCQ.find({ contestId }).populate('mcqId');
        const libraryMCQs = contestMCQLinks.filter(link => link.mcqId).map(link => ({
          ...link.mcqId.toObject(),
          marks: link.marks || link.mcqId.marks
        }));

        const allMCQs = [...directMCQs, ...libraryMCQs];

        // Calculate score
        for (const answer of mcqAnswers) {
          const mcq = allMCQs.find(m => m._id.toString() === answer.mcqId.toString());
          if (mcq) {
            const correctAnswers = mcq.options
              .map((opt, idx) => opt.isCorrect ? idx : -1)
              .filter(idx => idx !== -1);
            const userAnswers = answer.selectedOptions || [];

            const isCorrect =
              correctAnswers.length === userAnswers.length &&
              correctAnswers.every(a => userAnswers.includes(a));

            if (isCorrect) {
              mcqScore += mcq.marks || 0;
            }

            // Update MCQ metrics
            mcq.metrics = mcq.metrics || { attempted: 0, correct: 0, wrong: 0 };
            mcq.metrics.attempted++;
            if (isCorrect) {
              mcq.metrics.correct++;
            } else {
              mcq.metrics.wrong++;
            }
            await mcq.save();
          }
        }

        // Calculate coding score from existing submissions
        // Submission, CodingProblem, ContestCodingProblem are statically imported at the top

        const directProblems = await CodingProblem.find({ contestId });
        const contestProblemLinks = await ContestCodingProblem.find({ contestId }).populate('problemId');
        const libraryProblems = contestProblemLinks.filter(link => link.problemId).map(link => ({
          ...link.problemId.toObject(),
          score: link.score || link.problemId.score
        }));

        const allProblems = [...directProblems, ...libraryProblems];
        let codingScore = 0;

        for (const problem of allProblems) {
          const bestSubmission = await Submission.findOne({
            problemId: problem._id,
            contestId,
            userId: progress.userId._id,
            verdict: 'ACCEPTED'
          }).sort({ score: -1 });

          if (bestSubmission) {
            codingScore += bestSubmission.score || problem.score || 0;
          }
        }

        const totalScore = mcqScore + codingScore;

        // Create or update result
        await Result.findOneAndUpdate(
          { contestId, userId: progress.userId._id },
          {
            contestId,
            userId: progress.userId._id,
            mcqScore,
            codingScore,
            totalScore,
            submittedAt: new Date(),
            isAutoSubmitted: true,
            autoSubmitReason: 'CONTEST_ENDED_BY_ADMIN'
          },
          { upsert: true, new: true }
        );

        // Update progress status
        progress.status = 'TIMED_OUT';
        progress.submittedAt = new Date();
        await progress.save();

        autoSubmittedCount++;
      } catch (err) {
        console.error(`Failed to auto-submit for user ${progress.userId._id}:`, err);
      }
    }

    // Update contest end time to now and set status to ENDED
    contest.endTime = new Date();
    contest.status = 'ENDED';
    contest.manuallyEnded = true;
    contest.endedBy = req.user._id;
    await contest.save();

    res.status(200).json({
      success: true,
      message: `Contest ended successfully. ${autoSubmittedCount} participants were auto-submitted.`,
      autoSubmittedCount,
      totalActiveParticipants: activeParticipants.length
    });
  } catch (error) {
    console.error('End contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error ending contest'
    });
  }
};
