#!/usr/bin/env node
/**
 * Migration 072: Create role_category_access table
 * Category-level access control per role (product, item, sub categories)
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/run-migration-072-role-category-access.js
 *   node scripts/run-migration-072-role-category-access.js "postgresql://..."
 *   node scripts/run-migration-072-role-category-access.js
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.argv[2] ||
  'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

function getDbConfig() {
  const url = new URL(CONNECTION_STRING);
  const isRailway = url.hostname.includes('rlwy.net') || url.hostname.includes('railway');
  return {
    connectionString: CONNECTION_STRING,
    ssl: isRailway ? { rejectUnauthorized: false } : false,
  };
}

async function runMigration072() {
  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  console.log('🚀 Migration 072: role_category_access (Category-level RBAC)\n');
  console.log('📊 Connecting to database...\n');

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'role_category_access'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('⏭️  Table role_category_access already exists');
      const columns = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'role_category_access'
        ORDER BY ordinal_position
      `);
      console.log(`   Columns: ${columns.rows.map((r) => r.column_name).join(', ')}\n`);
      await client.end();
      return;
    }

    // Ensure roles table exists (migration 069 dependency)
    const checkRoles = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'roles'
      )
    `);
    if (!checkRoles.rows[0].exists) {
      throw new Error('Table "roles" does not exist. Run migration 069_create_rbac_tables.sql first.');
    }

    const migrationPath = path.join(__dirname, 'database', 'migrations', '072_create_role_category_access.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    let migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    // Strip outer BEGIN/COMMIT - we use our own transaction
    migrationSQL = migrationSQL.replace(/^\s*BEGIN\s*;/i, '').replace(/;\s*COMMIT\s*;?\s*$/i, ';').trim();
    console.log('🔄 Running migration 072_create_role_category_access.sql\n');

    await client.query('BEGIN');
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully\n');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Verify table
    const verify = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'role_category_access'
      ORDER BY ordinal_position
    `);

    console.log('📋 Table structure: role_category_access');
    verify.rows.forEach((row, i) => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`   ${i + 1}. ${row.column_name.padEnd(25)} ${row.data_type.padEnd(25)} ${nullable}${def}`);
    });

    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'role_category_access'
    `);
    if (indexes.rows.length > 0) {
      console.log('\n📊 Indexes:');
      indexes.rows.forEach((r) => console.log(`   - ${r.indexname}`));
    }

    console.log('\n✅ Migration 072 completed successfully!');
    console.log('   Table: role_category_access');
    console.log('   Purpose: Category-level access per role (product, item, sub categories)');
    console.log('   Empty arrays = full access at that level\n');

    await client.end();
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end().catch(() => {});
    }
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration072().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runMigration072 };
