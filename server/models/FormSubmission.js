import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
    fieldId: {
        type: String,
        required: true
    },
    // Single value for TEXT, TEXTAREA, RADIO, NUMBER, URL, DATE
    // Array for CHECKBOX
    value: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    isAutoScored: {
        type: Boolean,
        default: false
    },
    // Calculated immediately for auto-scored fields
    autoScore: {
        type: Number,
        default: 0
    },
    // Set by organiser for manual evaluation
    manualScore: {
        type: Number,
        default: null
    },
    maxMarks: {
        type: Number,
        default: 0
    },
    // True when organiser has evaluated this field (for manual fields)
    isEvaluated: {
        type: Boolean,
        default: false
    },
    // Organiser's feedback for this field
    feedback: {
        type: String,
        default: ''
    }
}, { _id: false });

const formSubmissionSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    contestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contest',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    responses: [responseSchema],
    // Total auto-calculated score
    totalAutoScore: {
        type: Number,
        default: 0
    },
    // Total manually assigned score
    totalManualScore: {
        type: Number,
        default: 0
    },
    // Combined total
    totalScore: {
        type: Number,
        default: 0
    },
    maxPossibleScore: {
        type: Number,
        default: 0
    },
    // True when all manual fields have been evaluated
    isFullyEvaluated: {
        type: Boolean,
        default: false
    },
    evaluatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    evaluatedAt: {
        type: Date,
        default: null
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    // All participants will be notified via email when evaluated
    notifyOnEvaluate: {
        type: Boolean,
        default: true
    },
    // Time spent on this form in seconds
    timeTaken: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Calculate scores before saving
formSubmissionSchema.pre('save', function (next) {
    let autoScore = 0;
    let manualScore = 0;
    let maxScore = 0;
    let allManualEvaluated = true;
    let hasManualFields = false;

    this.responses.forEach(response => {
        maxScore += response.maxMarks || 0;
        if (response.isAutoScored) {
            autoScore += response.autoScore || 0;
        } else {
            hasManualFields = true;
            if (response.isEvaluated) {
                manualScore += response.manualScore || 0;
            } else {
                allManualEvaluated = false;
            }
        }
    });

    this.totalAutoScore = autoScore;
    this.totalManualScore = manualScore;
    this.totalScore = autoScore + manualScore;
    this.maxPossibleScore = maxScore;
    this.isFullyEvaluated = hasManualFields ? allManualEvaluated : true;

    next();
});

// Compound index for quick lookups
formSubmissionSchema.index({ contestId: 1, userId: 1 });
formSubmissionSchema.index({ formId: 1, userId: 1 }, { unique: true });

const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema);

export default FormSubmission;
