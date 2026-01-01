const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailService');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middlewares/auth');

/**
 * Test email endpoint
 * POST /api/email/send-test
 * Body: { email: "yourpersonal@gmail.com" }
 */
router.post('/send-test', authenticate, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 40px 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .content { text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Email from ForusBiz</h1>
          </div>
          <div class="content">
            <p>This is a test email to verify that Resend is configured correctly.</p>
            <p>If you received this email, your email service is working! ✅</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: email,
      subject: 'Test Email from ForusBiz',
      html,
      text: 'This is a test email to verify that Resend is configured correctly. If you received this email, your email service is working!',
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        emailId: result?.id,
        to: email
      }
    });
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack
    }, 'Test email send error');
    next(error);
  }
});

module.exports = router;

