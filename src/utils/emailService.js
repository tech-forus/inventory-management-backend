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
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name (optional)
 * @param {string} options.token - Password reset token
 * @param {string} options.companyId - Company ID
 * @param {string} options.companyName - Company name for display
 * @param {string} options.role - User role (Admin/User)
 */
const sendInvitationEmail = async ({ email, firstName, lastName, token, companyId, companyName = 'Your Company', role = 'User' }) => {
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
  const currentYear = new Date().getFullYear();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited to ForusBiz</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          margin: 0; 
          padding: 0; 
          background-color: #f3f4f6; 
        }
        .wrapper {
          padding: 40px 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          border-radius: 12px; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          padding: 32px 40px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .logo span {
          color: #c7d2fe;
        }
        .content {
          padding: 40px;
        }
        .greeting {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }
        .intro {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 24px;
        }
        .highlight {
          color: #4f46e5;
          font-weight: 600;
        }
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 28px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .info-label {
          font-size: 14px;
          color: #6b7280;
          width: 100px;
          flex-shrink: 0;
        }
        .info-value {
          font-size: 14px;
          color: #111827;
          font-weight: 500;
        }
        .button-container {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff !important;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          padding: 14px 40px;
          border-radius: 8px;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
        }
        .expiry-warning {
          text-align: center;
          background-color: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
        }
        .expiry-icon {
          font-size: 16px;
        }
        .expiry-text {
          font-size: 14px;
          color: #92400e;
          font-weight: 500;
        }
        .fallback {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .fallback-link {
          font-size: 13px;
          color: #4f46e5;
          word-break: break-all;
          text-decoration: none;
        }
        .fallback-link:hover {
          text-decoration: underline;
        }
        .divider {
          border: 0;
          border-top: 1px solid #e5e7eb;
          margin: 28px 0;
        }
        .features {
          margin-bottom: 24px;
        }
        .features-title {
          font-size: 15px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }
        .features-list {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }
        .features-list li {
          font-size: 14px;
          color: #4b5563;
          padding: 6px 0;
          padding-left: 24px;
          position: relative;
        }
        .features-list li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: 600;
        }
        .help-text {
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px 40px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }
        .footer-text a {
          color: #6b7280;
          text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
          .wrapper { padding: 20px 12px; }
          .header { padding: 24px 20px; }
          .content { padding: 24px 20px; }
          .footer { padding: 20px; }
          .button { padding: 12px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header with Logo -->
          <div class="header">
            <div class="logo">Forus<span>Biz</span></div>
          </div>
          
          <!-- Main Content -->
          <div class="content">
            <div class="greeting">Hello ${firstName}${lastName ? ' ' + lastName : ''},</div>
            
            <p class="intro">
              You have been invited to join <span class="highlight">${companyName}</span>'s 
              inventory management system on ForusBiz as a <span class="highlight">${role}</span>.
            </p>
            
            <div class="info-box">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 14px; color: #6b7280; padding: 4px 0; width: 100px;">Company:</td>
                  <td style="font-size: 14px; color: #111827; font-weight: 500; padding: 4px 0;">${companyName}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #6b7280; padding: 4px 0;">Your Role:</td>
                  <td style="font-size: 14px; color: #111827; font-weight: 500; padding: 4px 0;">${role}</td>
                </tr>
              </table>
            </div>
            
            <!-- CTA Button -->
            <div class="button-container">
              <a href="${setPasswordUrl}" class="button">Set Your Password</a>
            </div>
            
            <!-- Expiry Warning -->
            <div class="expiry-warning">
              <span class="expiry-icon">⚠️</span>
              <span class="expiry-text">This invitation link will expire in 24 hours.</span>
            </div>
            
            <!-- Fallback Link -->
            <p class="fallback">If the button doesn't work, copy and paste this link into your browser:</p>
            <a href="${setPasswordUrl}" class="fallback-link">${setPasswordUrl}</a>
            
            <hr class="divider">
            
            <!-- Features -->
            <div class="features">
              <div class="features-title">After setting your password, you will be able to:</div>
              <ul class="features-list">
                <li>Access the inventory management dashboard</li>
                <li>View and manage inventory items</li>
                <li>Track incoming and outgoing inventory</li>
                <li>Generate reports and analytics</li>
              </ul>
            </div>
            
            <p class="help-text">
              If you did not expect this invitation or have questions,<br>
              please contact your administrator.
            </p>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              © ${currentYear} ForusBiz. All rights reserved.<br>
              This is an automated message. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${firstName}${lastName ? ' ' + lastName : ''},

You have been invited to join ${companyName}'s inventory management system on ForusBiz as a ${role}.

Company: ${companyName}
Your Role: ${role}

To set your password, click the link below:
${setPasswordUrl}

⚠️ This invitation link will expire in 24 hours.

After setting your password, you will be able to:
- Access the inventory management dashboard
- View and manage inventory items
- Track incoming and outgoing inventory
- Generate reports and analytics

If you did not expect this invitation or have questions, please contact your administrator.

© ${currentYear} ForusBiz. All rights reserved.
  `.trim();

  return await sendEmail({
    to: email,
    subject: `You're Invited to Join ${companyName} on ForusBiz`,
    html,
    text: textContent,
  });
};

module.exports = {
  sendEmail,
  sendInvitationEmail,
  initializeEmailService,
};
