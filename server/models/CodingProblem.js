import mongoose from 'mongoose';

const codingProblemSchema = new mongoose.Schema({
  // Optional - null for library problems
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null
  },
  // Is this a library problem (reusable)?
  isLibrary: {
    type: Boolean,
    default: false
  },
  // Is this library problem visible to organisers? (Only admin can set this)
  isPublic: {
    type: Boolean,
    default: true
  },
  // Who created this library problem (for ownership)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Problem description is required']
  },
  inputFormat: {
    type: String,
    required: true
  },
  outputFormat: {
    type: String,
    required: true
  },
  constraints: [{
    type: String
  }],
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  testcases: [{
    input: {
      type: String,
      required: true
    },
    output: {
      type: String,
      required: true
    },
    hidden: {
      type: Boolean,
      default: false
    },
    points: {
      type: Number,
      default: 10
    }
  }],
  score: {
    type: Number,
    required: true,
    default: 100
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'MEDIUM'
  },
  category: {
    type: String,
    enum: ['GENERAL', 'DSA', 'ALGORITHMS', 'DATABASE', 'SYSTEM_DESIGN'],
    default: 'GENERAL'
  },
  timeLimit: {
    type: Number, // in seconds
    default: 2
  },
  memoryLimit: {
    type: Number, // in MB
    default: 256
  },
  tags: [{
    type: String
  }],
  // Optional image for the problem description
  imageUrl: {
    type: String,
    default: null
  },
  imagePublicId: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  // Metrics for tracking
  metrics: {
    attempted: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
    wrongAnswer: { type: Number, default: 0 },
    tle: { type: Number, default: 0 },
    runtimeError: { type: Number, default: 0 }
  },
  // Legacy fields (kept for backward compatibility)
  submissionCount: {
    type: Number,
    default: 0
  },
  acceptedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
codingProblemSchema.index({ contestId: 1, order: 1 });
codingProblemSchema.index({ isLibrary: 1, category: 1 });
codingProblemSchema.index({ isLibrary: 1, difficulty: 1 });
codingProblemSchema.index({ tags: 1 });

// Virtual for acceptance rate
codingProblemSchema.virtual('acceptanceRate').get(function () {
  const total = this.metrics?.attempted || this.submissionCount || 0;
  const accepted = this.metrics?.accepted || this.acceptedCount || 0;
  if (total === 0) return 0;
  return ((accepted / total) * 100).toFixed(2);
});

const CodingProblem = mongoose.model('CodingProblem', codingProblemSchema);

export default CodingProblem;

