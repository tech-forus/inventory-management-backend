#!/usr/bin/env node
/**
 * Railway PostgreSQL Migration Script
 * 
 * This script migrates the database schema to Railway PostgreSQL
 * 
 * Usage:
 *   node scripts/migrate-railway.js
 * 
 * Environment variables required (set in Railway):
 *   DATABASE_URL (preferred) - Full connection string
 *   OR
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   NODE_ENV=production
 */

require('dotenv').config();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Parse DATABASE_URL or use individual variables
function getDbConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }, // Railway requires SSL
    };
  }
  
  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost')
      ? { rejectUnauthorized: false }
      : false,
  };
}

async function runMigrations() {
  const dbConfig = getDbConfig();
  
  console.log('🚀 Starting Railway PostgreSQL Migration...\n');
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migration tracking table ready\n');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`📦 Found ${files.length} migration file(s)\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      // Check if migration already ran
      const checkResult = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipCount++;
        continue;
      }

      console.log(`🔄 Running migration: ${file}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        // Record migration
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );

        console.log(`✅ Completed: ${file}\n`);
        successCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error in ${file}:`, error.message);
        console.error(`   ${error.stack}\n`);
        errorCount++;
        // Continue with next migration instead of stopping
      }
    }

    await client.end();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ All migrations completed successfully!');
    } else {
      console.log(`\n⚠️  Completed with ${errorCount} error(s). Please review the errors above.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error.stack);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run migrations
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations, getDbConfig };

