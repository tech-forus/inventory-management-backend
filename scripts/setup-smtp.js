#!/usr/bin/env node
/**
 * SMTP Configuration Setup Script
 * 
 * This script helps configure SMTP settings for the email service
 * 
 * Usage:
 *   node scripts/setup-smtp.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// SMTP Configuration
const smtpConfig = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'tech@foruselectric.com',
  SMTP_PASS: 'dhim ovxq wvoz wxts',
  FRONTEND_URL: process.env.NODE_ENV === 'production' ? 'https://www.forusbiz.ai' : 'http://localhost:3000',
};

console.log('📧 Setting up SMTP configuration...\n');

// Read existing .env file if it exists
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found existing .env file');
} else {
  console.log('📝 Creating new .env file');
  // If .env.example exists, use it as a template
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  }
}

// Update or add SMTP configuration
const lines = envContent.split('\n');
const updatedLines = [];
const smtpKeys = Object.keys(smtpConfig);
const foundKeys = new Set();

// Process existing lines
for (const line of lines) {
  const trimmedLine = line.trim();
  let updated = false;
  
  for (const key of smtpKeys) {
    if (trimmedLine.startsWith(`${key}=`)) {
      updatedLines.push(`${key}=${smtpConfig[key]}`);
      foundKeys.add(key);
      updated = true;
      break;
    }
  }
  
  if (!updated) {
    updatedLines.push(line);
  }
}

// Add missing SMTP configuration
for (const key of smtpKeys) {
  if (!foundKeys.has(key)) {
    updatedLines.push(`${key}=${smtpConfig[key]}`);
  }
}

// Write updated .env file
const updatedContent = updatedLines.join('\n');
fs.writeFileSync(envPath, updatedContent, 'utf8');

console.log('\n✅ SMTP configuration updated successfully!\n');
console.log('📋 Configuration:');
console.log(`   SMTP Host: ${smtpConfig.SMTP_HOST}`);
console.log(`   SMTP Port: ${smtpConfig.SMTP_PORT}`);
console.log(`   SMTP User: ${smtpConfig.SMTP_USER}`);
console.log(`   Frontend URL: ${smtpConfig.FRONTEND_URL}`);
console.log('\n💡 Note: Make sure to restart your server for changes to take effect.');
console.log('💡 For production (Railway), set these environment variables in Railway dashboard.\n');

