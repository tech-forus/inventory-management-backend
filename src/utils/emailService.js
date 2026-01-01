const { Resend } = require('resend');
const { logger } = require('./logger');

// Initialize Resend client
let resend = null;

const initializeEmailService = () => {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (apiKey) {
    resend = new Resend(apiKey);
    logger.info({
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    }, 'Resend API email service initialized');
  } else {
    logger.warn({
      hasApiKey: false
    }, 'Email service not configured. RESEND_API_KEY missing.');
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
 * Send email using Resend HTTP API
 */
const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!resend) {
    logger.error({
      message: 'Email service not configured. Cannot send email.'
    }, 'Email service not configured');
    throw new Error('Email service not configured');
  }

  try {
    const { error, data } = await resend.emails.send({
      from: 'ForusBiz <noreply@forusbiz.ai>',
      to,
      subject,
      html,
      text,
      ...(replyTo && { reply_to: replyTo }),
    });

    if (error) {
      logger.error({
        message: 'Resend API error',
        error: error.message,
        errorCode: error.name,
        to,
        subject
      }, 'Email Send Error');
      throw error;
    }

    logger.info({
      emailId: data?.id,
      to,
      subject
    }, 'Email sent successfully');
    
    return data;
  } catch (error) {
    logger.error({
      message: `Failed to send email to ${to}`,
      error: error.message,
      errorCode: error.name || error.code,
      to,
      subject
    }, 'Email Send Error');
    throw error;
  }
};

/**
 * Send invitation email with set password link
 */
const sendInvitationEmail = async (email, firstName, lastName, token, companyId) => {
  // Determine frontend URL based on environment
  // In development, use localhost:3000, in production use www.forusbiz.ai
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  let frontendUrl = process.env.FRONTEND_URL || 
    (isDevelopment 
      ? 'http://localhost:3000' 
      : 'https://www.forusbiz.ai');
  
  // Ensure we always use forusbiz.ai instead of forusbiz.com
  if (frontendUrl && frontendUrl.includes('forusbiz.com')) {
    frontendUrl = frontendUrl.replace('forusbiz.com', 'forusbiz.ai');
    logger.info({ frontendUrl }, 'Frontend URL updated from forusbiz.com to forusbiz.ai');
  }
  
  const setPasswordUrl = `${frontendUrl}/set-password/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 40px 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .link-container { text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 6px; }
        .invitation-link { font-size: 16px; color: #2563eb; text-decoration: none; word-break: break-all; line-height: 1.6; }
        .invitation-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="link-container">
          <a href="${setPasswordUrl}" class="invitation-link">${setPasswordUrl}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Set Your Password - Inventory Management System',
    html,
    text: setPasswordUrl,
  });
};

module.exports = {
  sendEmail,
  sendInvitationEmail,
  initializeEmailService,
};
