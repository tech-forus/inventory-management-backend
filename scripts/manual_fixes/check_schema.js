/**
 * Quick script to check database schema
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

async function checkSchema() {
    const client = await pool.connect();

    try {
        console.log('Checking customers table columns...');
        const customersColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `);
        console.table(customersColumns.rows);

        console.log('\nChecking vendors table columns...');
        const vendorsColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vendors'
      ORDER BY ordinal_position
    `);
        console.log(JSON.stringify(vendorsColumns.rows, null, 2));

        console.log('\nChecking outgoing_inventory records with date 2026-01-12...');
        const records = await client.query(`
      SELECT id, invoice_challan_number, invoice_challan_date, destination_type, destination_id
      FROM outgoing_inventory
      WHERE invoice_challan_date = '2026-01-12'
    `);
        console.table(records.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
