/**
 * Check both dates and list all JDDITS records
 */

const { Pool } = require('pg');

const dbConfig = {
    host: 'centerbeam.proxy.rlwy.net',
    port: 22395,
    database: 'railway',
    user: 'postgres',
    password: 'lWKfNKluCcjlvvCBpNItDEjMhdqUQMth',
    ssl: {
        rejectUnauthorized: false
    },
};

const pool = new Pool(dbConfig);

async function checkRecords() {
    const client = await pool.connect();

    try {
        console.log('Connected to Railway database\n');

        // Check records with 2026-12-01
        console.log('1. Checking records with date 2026-12-01 (December 1)...\n');
        const dec1 = await client.query(`
      SELECT id, invoice_challan_number, invoice_challan_date, destination_type, destination_id, document_type, created_at
      FROM outgoing_inventory
      WHERE invoice_challan_date = '2026-12-01'
      ORDER BY created_at DESC
      LIMIT 10
    `);
        console.log(`Found ${dec1.rowCount} record(s):`);
        console.table(dec1.rows);

        // Check records with 2026-01-12
        console.log('\n2. Checking records with date 2026-01-12 (January 12)...\n');
        const jan12 = await client.query(`
      SELECT id, invoice_challan_number, invoice_challan_date, destination_type, destination_id, document_type, created_at
      FROM outgoing_inventory
      WHERE invoice_challan_date = '2026-01-12'
      ORDER BY created_at DESC
      LIMIT 10
    `);
        console.log(`Found ${jan12.rowCount} record(s):`);
        console.table(jan12.rows);

        // Check recent records
        console.log('\n3. Checking 10 most recent outgoing inventory records...\n');
        const recent = await client.query(`
      SELECT id, invoice_challan_number, invoice_challan_date, destination_type, destination_id, document_type, created_at
      FROM outgoing_inventory
      ORDER BY created_at DESC
      LIMIT 10
    `);
        console.table(recent.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkRecords();
