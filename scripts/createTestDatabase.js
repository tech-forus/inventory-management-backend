const { Client } = require('pg');
require('dotenv').config();

/**
 * Create test database
 * This script creates the test database for running tests
 */
async function createTestDatabase() {
  // Connect to postgres database to create test database
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'forus',
  });

  const testDbName = process.env.DB_NAME_TEST || 'inventory_db_test';

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const checkResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Database "${testDbName}" already exists. Skipping creation.`);
    } else {
      // Create test database
      await adminClient.query(`CREATE DATABASE ${testDbName}`);
      console.log(`Database "${testDbName}" created successfully.`);
    }

    await adminClient.end();
  } catch (error) {
    console.error('Error creating test database:', error.message);
    if (adminClient) await adminClient.end().catch(() => {});
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createTestDatabase();
}

module.exports = { createTestDatabase };

