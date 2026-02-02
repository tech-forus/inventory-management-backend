#!/usr/bin/env node
/**
 * RBAC Fix: Normalize user_roles.company_id to uppercase
 * Fixes case mismatch that can cause getUserCategoryAccess to return no rows.
 *
 * Usage:
 *   node scripts/rbac-fix-user-roles-company-id.js
 *   DATABASE_URL="postgresql://..." node scripts/rbac-fix-user-roles-company-id.js
 */

require('dotenv').config();
const { Client } = require('pg');

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

async function runFix() {
  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  console.log('\n🔧 RBAC Fix: Normalize user_roles.company_id to uppercase\n');

  try {
    await client.connect();

    const checkResult = await client.query(`
      SELECT user_id, role_id, company_id
      FROM user_roles
      WHERE company_id != UPPER(company_id)
    `);

    if (checkResult.rows.length === 0) {
      console.log('✅ All user_roles.company_id values are already uppercase. Nothing to fix.\n');
      await client.end();
      return;
    }

    console.log(`Found ${checkResult.rows.length} row(s) with lowercase company_id:\n`);
    checkResult.rows.forEach((r, i) => {
      console.log(`   ${i + 1}. user_id=${r.user_id} role_id=${r.role_id} company_id="${r.company_id}" → "${String(r.company_id).toUpperCase()}"`);
    });

    await client.query('BEGIN');
    const updateResult = await client.query(`
      UPDATE user_roles
      SET company_id = UPPER(company_id)
      WHERE company_id != UPPER(company_id)
      RETURNING user_id, role_id, company_id
    `);
    await client.query('COMMIT');

    console.log(`\n✅ Updated ${updateResult.rows.length} row(s). Company IDs are now uppercase.\n`);
    await client.end();
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error:', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

runFix();
