import { Resend } from 'resend';
import crypto from 'crypto';

// Lazy initialization - only create client when needed
let resend = null;

const getResendClient = () => {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured in environment variables');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate reset token (cryptographically secure)
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send OTP email
export const sendOTPEmail = async (email, otp, purpose) => {
  const subject = purpose === 'SIGNUP'
    ? 'Verify your email - Koding Kulture'
    : 'Password Reset OTP - Koding Kulture';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155; }
        .logo { text-align: center; font-size: 28px; font-weight: bold; color: #FF6B35; margin-bottom: 30px; }
        .otp-box { background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white; }
        .message { color: #94a3b8; line-height: 1.6; text-align: center; }
        .warning { color: #fbbf24; font-size: 13px; margin-top: 20px; text-align: center; }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🚀 Koding Kulture</div>
        <p class="message">
          ${purpose === 'SIGNUP'
      ? 'Welcome! Please use the following OTP to verify your email address:'
      : 'Please use the following OTP to reset your password:'}
        </p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p class="warning">⚠️ This OTP expires in 10 minutes. Do not share it with anyone.</p>
        <div class="footer">
          If you didn't request this, please ignore this email.<br>
          © 2026 Koding Kulture. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send password reset link
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155; }
        .logo { text-align: center; font-size: 28px; font-weight: bold; color: #FF6B35; margin-bottom: 30px; }
        .message { color: #94a3b8; line-height: 1.6; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 30px 0; }
        .btn-container { text-align: center; }
        .warning { color: #fbbf24; font-size: 13px; margin-top: 20px; text-align: center; }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
        .link { word-break: break-all; color: #60a5fa; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🚀 Koding Kulture</div>
        <p class="message">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <div class="btn-container">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>
        <p class="message" style="font-size: 12px;">
          Or copy this link: <span class="link">${resetUrl}</span>
        </p>
        <p class="warning">⚠️ This link expires in 1 hour. Do not share it with anyone.</p>
        <div class="footer">
          If you didn't request this, please ignore this email.<br>
          © 2026 Koding Kulture. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your password - Koding Kulture',
      html
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    console.log('Reset email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Generic send mail function
export const sendMail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send co-organiser invite email
export const sendCoOrganiserInviteEmail = async (email, roomName, inviterName, acceptUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155; }
        .logo { text-align: center; font-size: 28px; font-weight: bold; color: #FF6B35; margin-bottom: 30px; }
        .message { color: #94a3b8; line-height: 1.6; text-align: center; }
        .room-name { color: #FF6B35; font-weight: bold; font-size: 20px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px; }
        .btn-decline { background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%); }
        .btn-container { text-align: center; margin: 30px 0; }
        .warning { color: #fbbf24; font-size: 13px; margin-top: 20px; text-align: center; }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🚀 FAKT CHECK</div>
        <p class="message">
          <strong>${inviterName}</strong> has invited you to become a <strong>Co-Organiser</strong> of the room:
        </p>
        <p class="message room-name">${roomName}</p>
        <p class="message">
          As a co-organiser, you'll be able to manage contests, evaluate form submissions, and post announcements in this room.
        </p>
        <div class="btn-container">
          <a href="${acceptUrl}" class="btn">Accept Invitation</a>
        </div>
        <p class="warning">⚠️ This invitation expires in 48 hours.</p>
        <div class="footer">
          If you didn't expect this invitation, you can safely ignore this email.<br>
          © 2026 FAKT CHECK. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `You're invited to co-organise "${roomName}" on FAKT CHECK`,
      html
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    console.log('Co-organiser invite email sent:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};
