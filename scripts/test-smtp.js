#!/usr/bin/env node
/**
 * Test SMTP Configuration
 * 
 * This script tests the SMTP connection and sends a test email
 * 
 * Usage:
 *   node scripts/test-smtp.js <test-email>
 */

require('dotenv').config();
const { initializeEmailService, sendInvitationEmail } = require('../src/utils/emailService');

async function testSMTP() {
  console.log('🧪 Testing SMTP Configuration...\n');
  
  // Initialize email service
  initializeEmailService();
  
  // Check configuration
  console.log('📋 SMTP Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`   Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`   User: ${process.env.SMTP_USER || 'Not set'}`);
  console.log(`   Password: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'Not set'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'Auto-detected based on NODE_ENV'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials not configured!');
    console.error('   Please set SMTP_USER and SMTP_PASS in your .env file or environment variables.\n');
    process.exit(1);
  }
  
  // Get test email from command line argument
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.log('ℹ️  To send a test email, provide an email address:');
    console.log('   node scripts/test-smtp.js your-email@example.com\n');
    console.log('✅ SMTP configuration looks good!');
    return;
  }
  
  console.log(`📧 Sending test invitation email to: ${testEmail}\n`);
  
  try {
    // Generate a test token
    const crypto = require('crypto');
    const testToken = crypto.randomBytes(32).toString('hex');
    
    await sendInvitationEmail(
      testEmail,
      'Test',
      'User',
      testToken,
      'TEST01'
    );
    
    console.log('✅ Test email sent successfully!\n');
    console.log('📬 Please check your inbox (and spam folder) for the test email.');
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('\n💡 Common issues:');
    console.error('   1. Check if SMTP credentials are correct');
    console.error('   2. For Gmail, make sure you\'re using an App Password (not regular password)');
    console.error('   3. Check if "Less secure app access" is enabled (for older Gmail accounts)');
    console.error('   4. Verify firewall/network allows SMTP connections\n');
    process.exit(1);
  }
}

testSMTP().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


