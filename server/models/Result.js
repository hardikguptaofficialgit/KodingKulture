import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
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
  mcqScore: {
    type: Number,
    default: 0
  },
  mcqAnswers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MCQ'
    },
    selectedOptions: [Number],
    isCorrect: Boolean,
    marksAwarded: Number,
    timeTaken: Number // in seconds
  }],
  codingScore: {
    type: Number,
    default: 0
  },
  codingSubmissions: [{
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingProblem'
    },
    bestSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    },
    score: Number,
    attempts: Number,
    solved: Boolean
  }],
  formsScore: {
    type: Number,
    default: 0
  },
  isFormsEvaluated: {
    type: Boolean,
    default: true // true by default if no forms section
  },
  totalScore: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  timeTaken: {
    type: Number, // total time in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['REGISTERED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATED'],
    default: 'IN_PROGRESS'
  },
  certificateGenerated: {
    type: Boolean,
    default: false
  },
  certificateUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique user-contest combination
resultSchema.index({ userId: 1, contestId: 1 }, { unique: true });
resultSchema.index({ contestId: 1, totalScore: -1, timeTaken: 1 });

const Result = mongoose.model('Result', resultSchema);

export default Result;
