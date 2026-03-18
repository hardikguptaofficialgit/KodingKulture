import { Resend } from 'resend';
import crypto from 'crypto';

let resend = null;

const BRAND = {
  name: 'FAKT CHECK',
  accent: '#FF6B35',
  accentSoft: '#FFF1EA',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  panel: '#FFFFFF',
  page: '#F5F7FB',
};

const getResendClient = () => {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured in environment variables');
    }

    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createButton = (label, href) => {
  if (!label || !href) return '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 10px;">
      <tr>
        <td align="center" style="border-radius: 999px; background: ${BRAND.accent};">
          <a href="${href}" style="display: inline-block; padding: 14px 24px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
};

const createInfoRows = (items = []) => {
  if (!items.length) return '';

  const rows = items
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; vertical-align: top;">
            <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.textMuted};">
              ${escapeHtml(label)}
            </div>
          </td>
          <td style="padding: 10px 0 10px 24px; border-bottom: 1px solid ${BRAND.border}; text-align: right; color: ${BRAND.text}; font-size: 14px; font-weight: 600;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0 8px;">
      ${rows}
    </table>
  `;
};

const createCodeBlock = (code) => {
  if (!code) return '';

  return `
    <div style="margin: 28px 0 18px; border-radius: 24px; background: linear-gradient(135deg, ${BRAND.accent} 0%, #FF8F67 100%); padding: 1px;">
      <div style="border-radius: 23px; background: #FFF7F3; padding: 22px 18px; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${BRAND.textMuted}; margin-bottom: 10px;">
          One-time passcode
        </div>
        <div style="font-size: 34px; line-height: 1; font-weight: 800; letter-spacing: 0.32em; color: ${BRAND.text};">
          ${escapeHtml(code)}
        </div>
      </div>
    </div>
  `;
};

export const renderEmailTemplate = ({
  preheader = '',
  eyebrow = 'FAKT CHECK',
  title,
  intro,
  body = '',
  infoRows = [],
  code,
  ctaLabel,
  ctaUrl,
  note,
  footer = 'If you did not request this message, you can safely ignore it.',
}) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title || BRAND.name)}</title>
    </head>
    <body style="margin: 0; padding: 0; background: ${BRAND.page}; font-family: Inter, Segoe UI, Arial, sans-serif; color: ${BRAND.text};">
      <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
        ${escapeHtml(preheader || intro || title || BRAND.name)}
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${BRAND.page};">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 640px;">
              <tr>
                <td style="padding-bottom: 18px; text-align: center;">
                  <div style="display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: ${BRAND.accent};">
                    ${escapeHtml(BRAND.name)}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${BRAND.panel}; border: 1px solid ${BRAND.border}; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 60px rgba(17, 24, 39, 0.08);">
                    <tr>
                      <td style="padding: 0; background: linear-gradient(135deg, rgba(255, 107, 53, 0.14) 0%, rgba(255, 255, 255, 0.96) 48%, rgba(255, 241, 234, 1) 100%);">
                        <div style="padding: 32px 32px 20px;">
                          <div style="display: inline-block; padding: 8px 14px; border-radius: 999px; background: ${BRAND.accentSoft}; color: ${BRAND.accent}; font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;">
                            ${escapeHtml(eyebrow)}
                          </div>
                          <h1 style="margin: 18px 0 12px; font-size: 30px; line-height: 1.15; color: ${BRAND.text};">
                            ${escapeHtml(title)}
                          </h1>
                          <p style="margin: 0; font-size: 15px; line-height: 1.75; color: ${BRAND.textMuted};">
                            ${escapeHtml(intro)}
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 32px 32px;">
                        ${createCodeBlock(code)}
                        ${body}
                        ${createInfoRows(infoRows)}
                        ${createButton(ctaLabel, ctaUrl)}
                        ${
                          note
                            ? `<div style="margin-top: 20px; padding: 16px 18px; border-radius: 18px; background: #FFF7F3; border: 1px solid #FED7C6; color: ${BRAND.textMuted}; font-size: 13px; line-height: 1.7;">${note}</div>`
                            : ''
                        }
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 18px 12px 0; text-align: center; color: ${BRAND.textMuted}; font-size: 12px; line-height: 1.7;">
                  ${footer}<br />
                  Copyright ${new Date().getFullYear()} ${escapeHtml(BRAND.name)}. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const sendResendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
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

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generateResetToken = () => crypto.randomBytes(32).toString('hex');

export const sendOTPEmail = async (email, otp, purpose) => {
  const isSignup = purpose === 'SIGNUP';

  return sendResendEmail({
    to: email,
    subject: isSignup ? 'Verify your email - FAKT CHECK' : 'Password reset code - FAKT CHECK',
    html: renderEmailTemplate({
      preheader: isSignup ? 'Use this OTP to verify your email address.' : 'Use this OTP to reset your password.',
      eyebrow: isSignup ? 'Email Verification' : 'Password Reset',
      title: isSignup ? 'Verify your email address' : 'Reset your password',
      intro: isSignup
        ? 'Use the verification code below to finish setting up your account.'
        : 'Use the one-time passcode below to continue resetting your password.',
      code: otp,
      note: 'This OTP expires in 10 minutes. Do not share it with anyone.',
    }),
  });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  return sendResendEmail({
    to: email,
    subject: 'Reset your password - FAKT CHECK',
    html: renderEmailTemplate({
      preheader: 'Reset your FAKT CHECK password.',
      eyebrow: 'Account Recovery',
      title: 'Choose a new password',
      intro: 'We received a password reset request for your account. Use the secure link below to continue.',
      ctaLabel: 'Reset Password',
      ctaUrl: resetUrl,
      body: `
        <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.8; color: ${BRAND.textMuted};">
          If the button does not open, copy and paste this link into your browser:
        </p>
        <div style="padding: 14px 16px; border-radius: 18px; background: #F9FAFB; border: 1px solid ${BRAND.border}; color: ${BRAND.text}; font-size: 13px; line-height: 1.7; word-break: break-word;">
          ${escapeHtml(resetUrl)}
        </div>
      `,
      note: 'This reset link expires in 1 hour. Do not share it with anyone.',
    }),
  });
};

export const sendMail = async ({ to, subject, html }) => sendResendEmail({ to, subject, html });

export const sendCoOrganiserInviteEmail = async (email, roomName, inviterName, acceptUrl) => {
  return sendResendEmail({
    to: email,
    subject: `Invitation to co-organise "${roomName}" on FAKT CHECK`,
    html: renderEmailTemplate({
      preheader: `You have been invited to co-organise ${roomName}.`,
      eyebrow: 'Room Invitation',
      title: 'You have been invited as a co-organiser',
      intro: `${inviterName} invited you to help manage the room "${roomName}" on FAKT CHECK.`,
      infoRows: [
        { label: 'Room', value: roomName },
        { label: 'Invited by', value: inviterName },
        { label: 'Access', value: 'Contests, forms, evaluations, and announcements' },
      ],
      ctaLabel: 'Accept Invitation',
      ctaUrl: acceptUrl,
      note: 'This invitation expires in 48 hours.',
      footer: 'If you were not expecting this invitation, you can safely ignore this email.',
    }),
  });
};
