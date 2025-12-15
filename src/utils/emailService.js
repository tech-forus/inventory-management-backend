const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// Create reusable transporter
let transporter = null;

const initializeEmailService = () => {
  // Email configuration from environment variables
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Only create transporter if credentials are provided
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
    logger.info('Email service initialized');
  } else {
    logger.warn('Email service not configured. SMTP credentials missing.');
  }
};

// Initialize on module load
// Note: This will be called again after dotenv.config() in server.js
// The function is idempotent, so calling it multiple times is safe
initializeEmailService();

// Re-initialize after a short delay to ensure env vars are loaded
// This is a safety measure in case the module is loaded before dotenv.config()
setTimeout(() => {
  initializeEmailService();
}, 100);

/**
 * Send invitation email with set password link
 */
const sendInvitationEmail = async (email, firstName, lastName, token, companyId) => {
  if (!transporter) {
    logger.error('Email service not configured. Cannot send invitation email.');
    throw new Error('Email service not configured');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const setPasswordUrl = `${frontendUrl}/set-password/${token}`;

  const mailOptions = {
    from: `"Inventory Management System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Set Your Password - Inventory Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Inventory Management System</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName} ${lastName},</p>
            <p>You have been invited to join the Inventory Management System. Please set your password by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${setPasswordUrl}" class="button">Set Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${setPasswordUrl}</p>
            <p><strong>Company ID:</strong> ${companyId}</p>
            <p><strong>Note:</strong> This link will expire in 24 hours.</p>
            <p>If you did not request this invitation, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Inventory Management System

      Hello ${firstName} ${lastName},

      You have been invited to join the Inventory Management System. Please set your password by visiting the following link:

      ${setPasswordUrl}

      Company ID: ${companyId}

      Note: This link will expire in 24 hours.

      If you did not request this invitation, please ignore this email.

      This is an automated message. Please do not reply to this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Invitation email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send invitation email to ${email}:`, error);
    throw error;
  }
};

module.exports = {
  sendInvitationEmail,
  initializeEmailService,
};

