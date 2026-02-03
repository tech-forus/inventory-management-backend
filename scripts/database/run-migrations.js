#!/usr/bin/env node
/**
 * Migration runner for remote databases (Railway, Heroku, etc.)
 * Usage: DATABASE_URL="postgresql://..." node scripts/database/run-migrations.js
 * Or: node scripts/database/run-migrations.js "postgresql://..."
 * Optional 3rd arg: run specific migration only (e.g. 055_create_departments_designations_relation.sql)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];
const SPECIFIC_FILE = process.argv[3];

if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql')) {
  console.error('❌ DATABASE_URL required.');
  process.exit(1);
}

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  };
}

async function runMigrations() {
  const client = new Client(parseDbUrl(DATABASE_URL));

  try {
    await client.connect();
    console.log('✅ Connected\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    let files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (SPECIFIC_FILE) {
      if (!files.includes(SPECIFIC_FILE)) {
        throw new Error(`Migration file not found: ${SPECIFIC_FILE}`);
      }
      files = [SPECIFIC_FILE];
    }

    for (const file of files) {
      const checkResult = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        console.log(`✅ Completed: ${file}\n`);
      } catch (err) {
        console.error(`❌ Failed: ${file}`, err.message);
        throw err;
      }
    }

    console.log('✅ All migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
