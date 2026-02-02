#!/usr/bin/env node
/**
 * Database Migration Script
 * Runs all SQL migrations against a PostgreSQL database.
 *
 * Usage:
 *   # Using DATABASE_URL from environment (recommended)
 *   DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/run-migrate-db.js
 *
 *   # Or set in .env and run:
 *   node scripts/run-migrate-db.js
 *
 *   # Or pass URL as first argument:
 *   node scripts/run-migrate-db.js "postgresql://user:pass@host:port/db"
 */

require('dotenv').config();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.argv[2] ||
  'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

function getDbConfig() {
  const url = new URL(CONNECTION_STRING);
  const isRailway = url.hostname.includes('rlwy.net') || url.hostname.includes('railway');
  return {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1) || 'railway',
    user: url.username,
    password: url.password,
    ssl: isRailway ? { rejectUnauthorized: false } : false,
  };
}

async function runMigrations() {
  const dbConfig = getDbConfig();

  console.log('🚀 Starting database migration...\n');
  console.log('📊 Database:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migration tracking table ready\n');

    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`📦 Found ${files.length} migration file(s)\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipCount++;
        continue;
      }

      console.log(`🔄 Running: ${file}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);

        console.log(`✅ Completed: ${file}\n`);
        successCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error in ${file}:`, err.message);
        errorCount++;
      }
    }

    await client.end();

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      process.exit(1);
    }
    console.log('\n✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runMigrations, getDbConfig };
