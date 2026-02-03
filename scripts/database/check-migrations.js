#!/usr/bin/env node
/**
 * Check migration status on database
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/database/check-migrations.js
 *   node scripts/database/check-migrations.js "postgresql://..."
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql')) {
  console.error('❌ DATABASE_URL required.');
  console.error('   Example: node check-migrations.js "postgresql://user:pass@host:port/db"');
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

async function check() {
  const client = new Client(parseDbUrl(DATABASE_URL));

  try {
    await client.connect();
    const dbName = new URL(DATABASE_URL).pathname.slice(1);
    console.log(`✅ Connected to database: ${dbName}\n`);

    // Get executed migrations
    const res = await client.query(`
      SELECT filename, executed_at 
      FROM schema_migrations 
      ORDER BY id
    `);

    const executed = res.rows.map((r) => r.filename);
    console.log(`📋 Executed migrations: ${executed.length}\n`);

    if (executed.length > 0) {
      res.rows.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.filename} (${r.executed_at})`);
      });
    }

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const allFiles = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = allFiles.filter((f) => !executed.includes(f));
    if (pending.length > 0) {
      console.log(`\n⚠️  Pending migrations: ${pending.length}`);
      pending.forEach((f) => console.log(`   - ${f}`));
    } else {
      console.log(`\n✅ All ${allFiles.length} migrations completed.`);
    }
  } catch (err) {
    if (err.message.includes('relation "schema_migrations" does not exist')) {
      console.log('⚠️  schema_migrations table does not exist.');
      console.log('   No migrations have been run yet.');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

check();
