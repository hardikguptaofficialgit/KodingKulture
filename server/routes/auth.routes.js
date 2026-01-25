import express from 'express';
import {
    register,
    login,
    getMe,
    updateProfile,
    sendSignupOTP,
    verifySignupOTP,
    resendOTP,
    forgotPassword,
    resetPassword,
    googleAuth
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import {
    authLimiter,
    otpLimiter,
    passwordResetLimiter,
    createAccountLimiter
} from '../middlewares/security.middleware.js';

const router = express.Router();

// =============================================
// PUBLIC AUTH ROUTES (rate limiting removed)
// =============================================

// Login
router.post('/login', login);

// Registration - legacy route (still uses OTP flow)
router.post('/register', register);

// Google OAuth
router.post('/google', googleAuth);

// OTP verification routes
router.post('/send-otp', sendSignupOTP);
router.post('/verify-otp', verifySignupOTP);
router.post('/resend-otp', resendOTP);

// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// =============================================
// PROTECTED AUTH ROUTES
// =============================================

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
