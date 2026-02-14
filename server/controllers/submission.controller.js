import Submission from '../models/Submission.js';
import CodingProblem from '../models/CodingProblem.js';
import Result from '../models/Result.js';
import { LANGUAGE_MAP, LANGUAGE_ID_MAP } from '../config/judge0.js';
import { submitToJudge0, mapStatusToVerdict } from '../services/judge0.service.js';

// @desc    Test run code (without saving)
// @route   POST /api/submissions/test
// @access  Private
export const testRunCode = async (req, res) => {
  try {
    const { problemId, sourceCode, languageId, input } = req.body;

    if (!sourceCode || !languageId) {
      return res.status(400).json({
        success: false,
        message: 'Source code and language are required'
      });
    }

    // Run code with custom input
    try {
      const result = await submitToJudge0(
        sourceCode,
        languageId,
        input || '',
        '' // No expected output for test run
      );

      // Check if we should compare with expected output
      let expectedOutput = null;
      let passed = null;

      // Only compare if problemId is provided and no custom input was given
      if (problemId && !input) {
        const problem = await CodingProblem.findById(problemId);
        if (problem && problem.examples && problem.examples.length > 0) {
          expectedOutput = problem.examples[0].output;
          const actualOutput = (result.stdout || '').trim();
          const expected = expectedOutput.trim();
          passed = actualOutput === expected;
        }
      }

      res.status(200).json({
        success: true,
        output: result.stdout || '',
        error: result.stderr || result.compile_output || null,
        executionTime: result.time ? parseFloat(result.time) * 1000 : 0,
        memoryUsed: result.memory || 0,
        expectedOutput: expectedOutput,
        passed: passed
      });
    } catch (error) {
      console.error('Test run error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute code',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Test run code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check code against all test cases (without saving)
// @route   POST /api/submissions/check-all
// @access  Private
export const checkAllTestCases = async (req, res) => {
  try {
    const { problemId, sourceCode, languageId } = req.body;

    if (!sourceCode || !languageId || !problemId) {
      return res.status(400).json({
        success: false,
        message: 'Source code, language, and problem ID are required'
      });
    }

    // Get problem with testcases
    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Run code against all testcases
    let passedCount = 0;
    const testcaseResults = [];

    for (let i = 0; i < problem.testcases.length; i++) {
      const testcase = problem.testcases[i];
      try {
        const result = await submitToJudge0(
          sourceCode,
          languageId,
          testcase.input,
          testcase.output
        );

        const verdict = mapStatusToVerdict(result.status.id);
        const passed = verdict === 'ACCEPTED';

        if (passed) {
          passedCount++;
        }

        testcaseResults.push({
          testcaseNumber: i + 1,
          passed,
          verdict,
          input: testcase.hidden ? '[Hidden]' : testcase.input,
          expectedOutput: testcase.hidden ? '[Hidden]' : testcase.output,
          actualOutput: testcase.hidden ? '[Hidden]' : (result.stdout || '').trim(),
          executionTime: result.time ? parseFloat(result.time) * 1000 : 0,
          memoryUsed: result.memory || 0,
          error: result.stderr || result.compile_output || null,
          hidden: testcase.hidden
        });
      } catch (error) {
        console.error(`Testcase ${i + 1} execution error:`, error);
        testcaseResults.push({
          testcaseNumber: i + 1,
          passed: false,
          verdict: 'EXECUTION_ERROR',
          error: 'Execution failed',
          hidden: testcase.hidden
        });
      }
    }

    const allPassed = passedCount === problem.testcases.length;

    res.status(200).json({
      success: true,
      allPassed,
      passedCount,
      totalTestcases: problem.testcases.length,
      testcaseResults
    });
  } catch (error) {
    console.error('Check all test cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Submit code solution
// @route   POST /api/submissions
// @access  Private
export const submitCode = async (req, res) => {
  try {
    const { contestId, problemId, sourceCode, language, languageId: reqLanguageId } = req.body;

    if (!sourceCode) {
      return res.status(400).json({
        success: false,
        message: 'Source code is required'
      });
    }

    // Resolve language - accept either languageId (number) or language (string)
    let resolvedLanguageId;
    let resolvedLanguage;

    if (reqLanguageId) {
      // Frontend sent languageId (number)
      resolvedLanguageId = reqLanguageId;
      resolvedLanguage = LANGUAGE_ID_MAP[reqLanguageId] || 'python';
    } else if (language) {
      // Frontend sent language (string)
      resolvedLanguage = language;
      resolvedLanguageId = LANGUAGE_MAP[language];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Language is required'
      });
    }

    if (!resolvedLanguageId) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported language'
      });
    }

    // Get problem with testcases
    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Create submission record
    const submission = await Submission.create({
      userId: req.user._id,
      contestId,
      problemId,
      sourceCode,
      language: resolvedLanguage,
      languageId: resolvedLanguageId,
      totalTestcases: problem.testcases.length
    });

    // Run code against testcases
    let passedCount = 0;
    let totalScore = 0;
    const testcaseResults = [];

    for (const testcase of problem.testcases) {
      try {
        const result = await submitToJudge0(
          sourceCode,
          resolvedLanguageId,
          testcase.input,
          testcase.output
        );

        const verdict = mapStatusToVerdict(result.status.id);
        const passed = verdict === 'ACCEPTED';

        if (passed) {
          passedCount++;
          totalScore += testcase.points;
        }

        testcaseResults.push({
          testcaseId: testcase._id,
          passed,
          verdict,
          executionTime: result.time ? parseFloat(result.time) * 1000 : 0,
          memoryUsed: result.memory || 0,
          error: result.stderr || result.compile_output || null
        });

        // All testcases are always evaluated for partial scoring
      } catch (error) {
        console.error('Testcase execution error:', error);
        testcaseResults.push({
          testcaseId: testcase._id,
          passed: false,
          error: 'Execution failed',
          isExecutionFailure: true
        });
      }
    }

    // Check if ALL testcases failed due to execution errors (Judge0 down)
    const executionFailures = testcaseResults.filter(r => r.isExecutionFailure);
    if (executionFailures.length === testcaseResults.length && testcaseResults.length > 0) {
      // All testcases failed to execute — Judge0 is likely down
      // Save the submission with JUDGE0_UNAVAILABLE verdict for manual review (score = 0)
      submission.verdict = 'JUDGE0_UNAVAILABLE';
      submission.score = 0;
      submission.testcasesPassed = 0;
      submission.testcaseResults = testcaseResults;
      submission.errorMessage = 'Judge0 service unavailable — code saved for manual review';
      await submission.save();

      return res.status(200).json({
        success: true,
        saved: true,
        message: 'Code execution service unavailable. Your code has been saved and can be reviewed manually.',
        submission: {
          id: submission._id,
          verdict: submission.verdict,
          score: 0,
          testcasesPassed: 0,
          totalTestcases: submission.totalTestcases
        }
      });
    }

    // Calculate final verdict from the first failing testcase's actual verdict
    let finalVerdict = 'ACCEPTED';
    if (passedCount < problem.testcases.length) {
      const firstFailure = testcaseResults.find(r => !r.passed && !r.isExecutionFailure);
      finalVerdict = firstFailure?.verdict || 'WRONG_ANSWER';
    }

    // Update submission
    submission.verdict = finalVerdict;
    submission.score = totalScore;
    submission.testcasesPassed = passedCount;
    submission.testcaseResults = testcaseResults;
    await submission.save();

    // Update problem stats (both legacy and metrics fields)
    problem.submissionCount++;
    problem.metrics.attempted++;
    if (finalVerdict === 'ACCEPTED') {
      problem.acceptedCount++;
      problem.metrics.accepted++;
    } else if (finalVerdict === 'WRONG_ANSWER') {
      problem.metrics.wrongAnswer++;
    } else if (finalVerdict === 'TIME_LIMIT_EXCEEDED') {
      problem.metrics.tle++;
    } else if (finalVerdict === 'RUNTIME_ERROR') {
      problem.metrics.runtimeError++;
    }
    await problem.save();

    // Update result
    const result = await Result.findOne({ userId: req.user._id, contestId });
    if (result) {
      const problemIndex = result.codingSubmissions.findIndex(
        s => s.problemId.toString() === problemId
      );

      if (problemIndex >= 0) {
        // Update existing
        if (totalScore > result.codingSubmissions[problemIndex].score) {
          result.codingSubmissions[problemIndex].score = totalScore;
          result.codingSubmissions[problemIndex].bestSubmission = submission._id;
        }
        result.codingSubmissions[problemIndex].attempts++;
        result.codingSubmissions[problemIndex].solved = result.codingSubmissions[problemIndex].solved || (finalVerdict === 'ACCEPTED');
      } else {
        // Add new
        result.codingSubmissions.push({
          problemId,
          bestSubmission: submission._id,
          score: totalScore,
          attempts: 1,
          solved: finalVerdict === 'ACCEPTED'
        });
      }

      // Recalculate total coding score
      result.codingScore = result.codingSubmissions.reduce((sum, s) => sum + s.score, 0);
      result.totalScore = result.mcqScore + result.codingScore;

      await result.save();
    }

    res.status(201).json({
      success: true,
      message: 'Code submitted successfully',
      submission: {
        id: submission._id,
        verdict: submission.verdict,
        score: submission.score,
        testcasesPassed: submission.testcasesPassed,
        totalTestcases: submission.totalTestcases
      }
    });
  } catch (error) {
    console.error('Submit code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting code'
    });
  }
};

// @desc    Get user submissions for a problem
// @route   GET /api/submissions/problem/:problemId
// @access  Private
export const getSubmissionsByProblem = async (req, res) => {
  try {
    const filter = {
      userId: req.user._id,
      problemId: req.params.problemId
    };

    // If contestId is provided, filter by it to avoid cross-contest submission display
    if (req.query.contestId) {
      filter.contestId = req.query.contestId;
    }

    const submissions = await Submission.find(filter).sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submissions'
    });
  }
};

// @desc    Get submission details
// @route   GET /api/submissions/:id
// @access  Private
export const getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('problemId', 'title')
      .populate('userId', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Only owner, admin, or organiser can view
    if (submission.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANISER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      });
    }

    res.status(200).json({
      success: true,
      submission
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submission'
    });
  }
};

// @desc    Get aggregated coding progress for a contest (accepted / total problems)
// @route   GET /api/submissions/contest/:contestId/progress
// @access  Private
export const getCodingProgress = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user._id;

    // Get total problem count
    const problems = await CodingProblem.find({ contestId }).select('_id');
    const total = problems.length;

    // Get distinct problem IDs with at least one ACCEPTED submission
    const acceptedProblemIds = await Submission.distinct('problemId', {
      contestId,
      userId,
      verdict: 'ACCEPTED'
    });

    res.status(200).json({
      success: true,
      accepted: acceptedProblemIds.length,
      total
    });
  } catch (error) {
    console.error('Get coding progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coding progress'
    });
  }
};

// @desc    Get coding review for a contest (user's submissions with problem details)
// @route   GET /api/submissions/contest/:contestId/review
// @access  Private
export const getCodingReview = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user._id;

    // Get all problems for this contest
    const problems = await CodingProblem.find({ contestId })
      .select('title difficulty marks order')
      .sort({ order: 1 });

    // Get all user submissions for this contest
    const submissions = await Submission.find({ contestId, userId })
      .select('problemId language verdict score submittedAt')
      .sort({ submittedAt: -1 });

    // Group submissions by problem
    const review = problems.map(problem => {
      const problemSubmissions = submissions.filter(
        s => s.problemId.toString() === problem._id.toString()
      );
      const bestSubmission = problemSubmissions.find(s => s.verdict === 'ACCEPTED') || problemSubmissions[0] || null;

      return {
        problem: {
          _id: problem._id,
          title: problem.title,
          difficulty: problem.difficulty,
          marks: problem.marks
        },
        submissionCount: problemSubmissions.length,
        bestVerdict: bestSubmission?.verdict || 'NOT_ATTEMPTED',
        bestScore: bestSubmission?.score || 0,
        language: bestSubmission?.language || null,
        lastSubmittedAt: problemSubmissions[0]?.submittedAt || null
      };
    });

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Get coding review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coding review'
    });
  }
};

// @desc    Get pending (JUDGE0_UNAVAILABLE) submissions for a contest
// @route   GET /api/submissions/contest/:contestId/pending
// @access  Private/Admin or Organiser
export const getPendingSubmissions = async (req, res) => {
  try {
    const { contestId } = req.params;

    const submissions = await Submission.find({
      contestId,
      verdict: 'JUDGE0_UNAVAILABLE'
    })
      .populate('userId', 'name email rollNumber')
      .populate('problemId', 'title difficulty score')
      .select('userId problemId sourceCode language languageId verdict errorMessage submittedAt')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    console.error('Get pending submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending submissions'
    });
  }
};
