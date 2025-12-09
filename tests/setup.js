// Load environment variables (fallback to .env if .env.test doesn't exist)
try {
  require('dotenv').config({ path: '.env.test' });
} catch (e) {
  // .env.test doesn't exist, use .env
}
require('dotenv').config(); // Fallback to .env

// Set test environment
process.env.NODE_ENV = 'test';

// Set test database if not already set
if (!process.env.DB_NAME || process.env.DB_NAME === 'inventory_db') {
  process.env.DB_NAME = process.env.DB_NAME_TEST || 'inventory_db_test';
}

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Test database should be configured via environment variables
  // Run migrations before tests (optional - can be done manually)
  try {
    const { runMigrations } = require('./helpers/migrate');
    await runMigrations();
  } catch (error) {
    // Silently fail if migrations already run or database doesn't exist
    // Tests will fail if database is not properly set up
    console.warn('Migration setup warning:', error.message);
  }
});

// Global test teardown
afterAll(async () => {
  // Close any open connections
  try {
    const pool = require('../src/models/database');
    await pool.end();
  } catch (error) {
    // Ignore errors during teardown
  }
});
