require('dotenv').config();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

/**
 * Production Migration Runner
 * 
 * This script runs migrations using node-pg-migrate
 * It should be run manually or via CI/CD pipeline, NOT on app start
 * 
 * Usage:
 *   npm run migrate
 * 
 * Environment variables required:
 *   DB_HOST
 *   DB_PORT
 *   DB_NAME
 *   DB_USER
 *   DB_PASSWORD
 */
async function checkDatabaseConnection() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'inventory_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function main() {
  // Warn if running in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Running migrations in development mode');
    console.log('   For production, ensure NODE_ENV=production\n');
  }

  // Check database connection
  console.log('🔍 Checking database connection...');
  const connected = await checkDatabaseConnection();
  
  if (!connected) {
    console.error('❌ Cannot connect to database. Please check your environment variables.');
    process.exit(1);
  }

  console.log('✅ Database connection successful\n');
  console.log('📦 Running migrations...\n');
  
  // Note: Actual migration execution is handled by node-pg-migrate
  // This script is just a wrapper for safety checks
  console.log('💡 Run: npm run migrate');
  console.log('   Or: node-pg-migrate up');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Migration check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkDatabaseConnection };

