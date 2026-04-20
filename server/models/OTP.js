import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['SIGNUP', 'RESET_PASSWORD'],
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    // Store pending user data for signup
    pendingUserData: {
        name: String,
        password: String,
        college: String,
        phone: String
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }
}, {
    timestamps: true
});

// TTL index - automatically delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookup
otpSchema.index({ email: 1, purpose: 1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
