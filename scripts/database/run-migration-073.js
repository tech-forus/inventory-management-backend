#!/usr/bin/env node
/**
 * Standalone script to run migration 073_add_employee_id_to_teams
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/database/run-migration-073.js
 *   node scripts/database/run-migration-073.js "postgresql://user:pass@host:port/db"
 */

const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL required. Set env or pass as first argument.');
  console.error('   Example: node run-migration-073.js "postgresql://user:pass@host:port/db"');
  process.exit(1);
}

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port) || 5432,
    database: u.pathname.slice(1),
    user: u.username,
    password: u.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  };
}

async function run() {
  const config = parseDbUrl(DATABASE_URL);
  const client = new Client(config);

  try {
    console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`);
    await client.connect();
    console.log('✅ Connected\n');

    const migrationFile = '073_add_employee_id_to_teams.sql';
    const filePath = path.join(__dirname, 'migrations', migrationFile);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`🔄 Running migration: ${migrationFile}`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Migration ${migrationFile} completed successfully\n`);

    // Record in schema_migrations if table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migrationFile]);
    } catch (e) {
      if (e.code !== '23505') throw e; // 23505 = unique violation, already recorded
    }

    console.log('✅ Done.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
