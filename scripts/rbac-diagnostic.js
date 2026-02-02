#!/usr/bin/env node
/**
 * RBAC Diagnostic Script
 * Verifies user_roles, role_category_access, and category IDs for a given user.
 * Helps diagnose why category filtering may not be working.
 *
 * Usage:
 *   node scripts/rbac-diagnostic.js <user_email_or_id>
 *   DATABASE_URL="postgresql://..." node scripts/rbac-diagnostic.js mrigankforus@gmail.com
 *   node scripts/rbac-diagnostic.js 123
 */

require('dotenv').config();
const { Client } = require('pg');

const args = process.argv.slice(2);
const connArg = args.find((a) => a.startsWith('postgresql://'));
const userArg = args.find((a) => !a.startsWith('postgresql://'));

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  connArg ||
  'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const userInput = userArg || process.env.DIAG_USER;

function getDbConfig() {
  const url = new URL(CONNECTION_STRING);
  const isRailway = url.hostname.includes('rlwy.net') || url.hostname.includes('railway');
  return {
    connectionString: CONNECTION_STRING,
    ssl: isRailway ? { rejectUnauthorized: false } : false,
  };
}

async function runDiagnostic() {
  if (!userInput) {
    console.log('Usage: node scripts/rbac-diagnostic.js <user_email_or_id>');
    console.log('Example: node scripts/rbac-diagnostic.js mrigankforus@gmail.com');
    console.log('         node scripts/rbac-diagnostic.js 42');
    process.exit(1);
  }

  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  console.log('\n🔍 RBAC Diagnostic for user:', userInput, '\n');

  try {
    await client.connect();

    const isNumeric = /^\d+$/.test(String(userInput).trim());
    const userQuery = isNumeric
      ? 'SELECT id, email, full_name, company_id, role FROM users WHERE id = $1'
      : 'SELECT id, email, full_name, company_id, role FROM users WHERE LOWER(email) = LOWER($1)';
    const userResult = await client.query(userQuery, [userInput.trim()]);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', userInput);
      await client.end();
      process.exit(1);
    }

    const user = userResult.rows[0];
    const userId = user.id;
    const companyId = String(user.company_id).toUpperCase();

    console.log('📋 User:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.full_name);
    console.log('   Company ID:', user.company_id, '(normalized:', companyId + ')');
    console.log('   users.role:', user.role);
    console.log('');

    const userRolesResult = await client.query(
      `SELECT ur.user_id, ur.role_id, ur.company_id, r.name as role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND UPPER(ur.company_id) = UPPER($2)`,
      [userId, companyId]
    );

    console.log('📋 user_roles (JOIN roles):');
    if (userRolesResult.rows.length === 0) {
      console.log('   ❌ NO ROWS - User has no RBAC roles assigned!');
      console.log('   → Fix: Assign roles via Access Control → Edit User → Assign Roles');
    } else {
      userRolesResult.rows.forEach((r, i) => {
        console.log(`   ${i + 1}. role_id=${r.role_id} role_name="${r.role_name}" company_id="${r.company_id}"`);
      });
    }
    console.log('');

    const roleIds = userRolesResult.rows.map((r) => r.role_id);
    let roleCategoryAccess = [];

    if (roleIds.length > 0) {
      const rcaResult = await client.query(
        `SELECT rca.role_id, r.name as role_name,
                rca.product_category_ids, rca.item_category_ids, rca.sub_category_ids
         FROM role_category_access rca
         JOIN roles r ON rca.role_id = r.id
         WHERE rca.role_id = ANY($1::int[])`,
        [roleIds]
      );
      roleCategoryAccess = rcaResult.rows;
    }

    console.log('📋 role_category_access (for user\'s roles):');
    if (roleCategoryAccess.length === 0) {
      console.log('   ❌ NO ROWS - User\'s roles have no category restrictions!');
      console.log('   → Fix: Edit role in Access Control → ROLES tab → Edit User role → Add category access');
    } else {
      roleCategoryAccess.forEach((r, i) => {
        const pcLen = (r.product_category_ids || []).length;
        const icLen = (r.item_category_ids || []).length;
        const scLen = (r.sub_category_ids || []).length;
        const hasRestrictions = pcLen > 0 || icLen > 0 || scLen > 0;
        console.log(`   ${i + 1}. role="${r.role_name}" product_ids=${pcLen} item_ids=${icLen} sub_ids=${scLen} ${hasRestrictions ? '✓' : '⚠ empty'}`);
        if (hasRestrictions) {
          console.log('      product_category_ids:', r.product_category_ids || []);
          console.log('      item_category_ids:', r.item_category_ids || []);
          console.log('      sub_category_ids:', r.sub_category_ids || []);
        }
      });
    }
    console.log('');

    const allProductIds = new Set();
    const allItemIds = new Set();
    const allSubIds = new Set();
    roleCategoryAccess.forEach((r) => {
      (r.product_category_ids || []).forEach((id) => allProductIds.add(id));
      (r.item_category_ids || []).forEach((id) => allItemIds.add(id));
      (r.sub_category_ids || []).forEach((id) => allSubIds.add(id));
    });

    if (allProductIds.size > 0 || allItemIds.size > 0 || allSubIds.size > 0) {
      console.log('📋 Category names (resolved from IDs):');
      if (allProductIds.size > 0) {
        const pcResult = await client.query(
          'SELECT id, name FROM product_categories WHERE id = ANY($1::int[]) AND company_id = $2',
          [Array.from(allProductIds), companyId]
        );
        console.log('   Product categories:', pcResult.rows.map((r) => `${r.id}:${r.name}`).join(', ') || 'none found');
      }
      if (allItemIds.size > 0) {
        const icResult = await client.query(
          'SELECT id, name FROM item_categories WHERE id = ANY($1::int[]) AND company_id = $2',
          [Array.from(allItemIds), companyId]
        );
        console.log('   Item categories:', icResult.rows.map((r) => `${r.id}:${r.name}`).join(', ') || 'none found');
      }
      if (allSubIds.size > 0) {
        const scResult = await client.query(
          'SELECT id, name FROM sub_categories WHERE id = ANY($1::int[]) AND company_id = $2',
          [Array.from(allSubIds), companyId]
        );
        console.log('   Sub categories:', scResult.rows.map((r) => `${r.id}:${r.name}`).join(', ') || 'none found');
      }
      console.log('');

      const whereParts = ['s.company_id = $1', 's.is_active = true'];
      const params = [companyId];
      let idx = 2;
      if (allProductIds.size > 0) {
        whereParts.push(`s.product_category_id = ANY($${idx}::int[])`);
        params.push(Array.from(allProductIds));
        idx++;
      }
      if (allItemIds.size > 0) {
        whereParts.push(`s.item_category_id = ANY($${idx}::int[])`);
        params.push(Array.from(allItemIds));
        idx++;
      }
      if (allSubIds.size > 0) {
        whereParts.push(`s.sub_category_id = ANY($${idx}::int[])`);
        params.push(Array.from(allSubIds));
        idx++;
      }
      const skuCountResult = await client.query(
        `SELECT COUNT(*) as total FROM skus s WHERE ${whereParts.join(' AND ')}`,
        params
      );

      const totalSkusResult = await client.query(
        'SELECT COUNT(*) as total FROM skus WHERE company_id = $1 AND is_active = true',
        [companyId]
      );

      console.log('📋 Expected SKU counts:');
      console.log('   Total SKUs in company:', totalSkusResult.rows[0].total);
      console.log('   SKUs matching user restrictions:', skuCountResult.rows[0].total);
      console.log('');
    }

    const willFilter = allProductIds.size > 0 || allItemIds.size > 0 || allSubIds.size > 0;
    console.log('📋 Summary:');
    console.log('   getUserCategoryAccess would return:', willFilter ? 'RESTRICTED' : 'null (full access)');
    if (!willFilter) {
      console.log('   Reason: user_roles empty OR role_category_access empty OR all arrays empty');
    }
    console.log('');

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

runDiagnostic();
