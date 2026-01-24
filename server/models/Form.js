import mongoose from 'mongoose';

const formFieldSchema = new mongoose.Schema({
    fieldId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['TEXT', 'TEXTAREA', 'RADIO', 'CHECKBOX', 'NUMBER', 'URL', 'DATE'],
        required: true
    },
    label: {
        type: String,
        required: true
    },
    required: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: ''
    },
    // For RADIO and CHECKBOX types
    options: [{
        type: String
    }],
    // For auto-scoring RADIO/CHECKBOX fields
    correctAnswers: [{
        type: String
    }],
    // If true, field is auto-scored based on correctAnswers
    isAutoScored: {
        type: Boolean,
        default: false
    },
    marks: {
        type: Number,
        default: 0
    },
    order: {
        type: Number,
        default: 0
    }
}, { _id: false });

const formSchema = new mongoose.Schema({
    contestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contest',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    fields: [formFieldSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Calculate total marks before saving
formSchema.pre('save', function (next) {
    this.totalMarks = this.fields.reduce((sum, field) => sum + (field.marks || 0), 0);
    next();
});

const Form = mongoose.model('Form', formSchema);

export default Form;
