#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

const companyName = process.argv[2] || 'JDDITS';
const roleName = process.argv[3] || 'User';

const url = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function run() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const comp = await client.query(
    'SELECT company_id FROM companies WHERE LOWER(company_name) = LOWER($1)',
    [companyName]
  );
  if (comp.rows.length === 0) {
    console.log('Company', companyName, 'not found');
    process.exit(1);
  }
  const cid = comp.rows[0].company_id;

  const role = await client.query(
    'SELECT id, name FROM roles WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
    [cid, roleName]
  );
  if (role.rows.length === 0) {
    console.log('Role', roleName, 'not found in', companyName);
    process.exit(1);
  }
  const rid = role.rows[0].id;

  const rca = await client.query(
    'SELECT product_category_ids, item_category_ids, sub_category_ids FROM role_category_access WHERE role_id = $1',
    [rid]
  );

  const pc = rca.rows[0]?.product_category_ids || [];
  const ic = rca.rows[0]?.item_category_ids || [];
  const sc = rca.rows[0]?.sub_category_ids || [];

  let pcNames = [], icNames = [], scNames = [];
  if (pc.length) {
    const r = await client.query(
      'SELECT id, name FROM product_categories WHERE id = ANY($1::int[]) AND company_id = $2',
      [pc, cid]
    );
    pcNames = r.rows;
  }
  if (ic.length) {
    const r = await client.query(
      'SELECT id, name FROM item_categories WHERE id = ANY($1::int[]) AND company_id = $2',
      [ic, cid]
    );
    icNames = r.rows;
  }
  if (sc.length) {
    const r = await client.query(
      'SELECT id, name FROM sub_categories WHERE id = ANY($1::int[]) AND company_id = $2',
      [sc, cid]
    );
    scNames = r.rows;
  }

  console.log('\nCompany:', companyName, '(' + cid + ')');
  console.log('Role:', roleName, '(id=' + rid + ')\n');
  console.log('Product categories:', pcNames.length ? pcNames.map(r => r.name).join(', ') : '(empty = full access)');
  console.log('Item categories:', icNames.length ? icNames.map(r => r.name).join(', ') : '(empty = full access)');
  console.log('Sub categories:', scNames.length ? scNames.map(r => r.name).join(', ') : '(empty = full access)');
  console.log('');

  await client.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
