const { Client } = require('pg');
require('dotenv').config();

/**
 * WARNING: This script is for LOCAL DEVELOPMENT ONLY
 * 
 * For production:
 * - Use migrations: npm run migrate
 * - Do NOT run this script in production
 * - Database should be created manually or via infrastructure as code
 */
async function createDatabase() {
  // Warn if running in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: createDatabase.js should NOT be run in production!');
    console.error('   For production, use migrations: npm run migrate');
    console.error('   Or create the database manually via your infrastructure setup.');
    process.exit(1);
  }
  
  console.log('⚠️  WARNING: This script is for LOCAL DEVELOPMENT ONLY');
  console.log('   For production, use migrations instead.\n');
  // Connect to PostgreSQL server (default postgres database)
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'forus',
    database: 'postgres' // Connect to default postgres database first
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const checkDbQuery = `
      SELECT 1 FROM pg_database WHERE datname = 'inventory_db'
    `;
    const dbExists = await client.query(checkDbQuery);

    if (dbExists.rows.length > 0) {
      console.log('⚠️  Database "inventory_db" already exists');
      console.log('   If you want to recreate it, drop it first using:');
      console.log('   DROP DATABASE inventory_db;');
    } else {
      // Create the database
      await client.query('CREATE DATABASE inventory_db');
      console.log('✅ Database "inventory_db" created successfully!');
    }

    await client.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    
    if (error.code === '3D000') {
      console.error('   Database does not exist (this is expected for first run)');
    } else if (error.code === '28P01') {
      console.error('   Authentication failed. Please check your DB_PASSWORD in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Please ensure PostgreSQL is running');
    }
    
    process.exit(1);
  }
}

createDatabase();

