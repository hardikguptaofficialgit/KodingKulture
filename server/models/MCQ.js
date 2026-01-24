import mongoose from 'mongoose';

const mcqSchema = new mongoose.Schema({
  // Optional - null for library questions, set when added to contest
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null
  },
  // Is this a library question (reusable across contests)?
  isLibrary: {
    type: Boolean,
    default: false
  },
  // Is this library question visible to organisers? (Only admin can set this)
  isPublic: {
    type: Boolean,
    default: true
  },
  // Who created this library question (for ownership)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswers: [{
    type: Number // indices of correct options
  }],
  marks: {
    type: Number,
    required: true,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'MEDIUM'
  },
  category: {
    type: String,
    enum: ['GENERAL', 'APTITUDE', 'TECHNICAL', 'REASONING', 'ENTREPRENEURSHIP'],
    default: 'GENERAL'
  },
  explanation: {
    type: String,
    default: null
  },
  // Optional image for the question
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
  // Metrics for tracking question performance
  metrics: {
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 }
  },
  // Tags for better searchability
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
mcqSchema.index({ contestId: 1, order: 1 });
mcqSchema.index({ isLibrary: 1, category: 1 });
mcqSchema.index({ tags: 1 });

const MCQ = mongoose.model('MCQ', mcqSchema);

export default MCQ;

