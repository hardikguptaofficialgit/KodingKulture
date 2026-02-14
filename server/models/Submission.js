import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingProblem',
    required: true
  },
  sourceCode: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['c', 'cpp', 'java', 'python', 'javascript', 'go', 'rust']
  },
  languageId: {
    type: Number,
    required: true
  },
  verdict: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'JUDGE0_UNAVAILABLE'],
    default: 'PENDING'
  },
  score: {
    type: Number,
    default: 0
  },
  testcasesPassed: {
    type: Number,
    default: 0
  },
  totalTestcases: {
    type: Number,
    default: 0
  },
  executionTime: {
    type: Number, // in ms
    default: null
  },
  memoryUsed: {
    type: Number, // in KB
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  testcaseResults: [{
    testcaseId: mongoose.Schema.Types.ObjectId,
    passed: Boolean,
    executionTime: Number,
    memoryUsed: Number,
    error: String
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ userId: 1, contestId: 1, problemId: 1 });
submissionSchema.index({ contestId: 1, verdict: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
