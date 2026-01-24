/**
 * List records with detailed customer/vendor names
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

async function listWithNames() {
    const client = await pool.connect();

    try {
        console.log('=== OUTGOING INVENTORY RECORDS - DECEMBER 1, 2026 ===\n');

        const query = `
      SELECT 
        oi.id,
        oi.invoice_challan_number,
        to_char(oi.invoice_challan_date, 'YYYY-MM-DD') as date,
        oi.destination_type,
        oi.destination_id,
        oi.document_type
      FROM outgoing_inventory oi
      WHERE oi.invoice_challan_date = '2026-12-01'
      ORDER BY oi.id
    `;

        const result = await client.query(query);

        console.log(`Found ${result.rowCount} records:\n`);

        for (const row of result.rows) {
            console.log(`ID: ${row.id}`);
            console.log(`  Invoice#: ${row.invoice_challan_number}`);
            console.log(`  Date: ${row.date}`);
            console.log(`  Type: ${row.destination_type}`);
            console.log(`  Destination ID: ${row.destination_id}`);
            console.log(`  Document Type: ${row.document_type}`);
            console.log('---');
        }

        console.log('\n=== REVERSE CHECK - JANUARY 12, 2026 ===\n');

        const query2 = `
      SELECT 
        oi.id,
        oi.invoice_challan_number,
        to_char(oi.invoice_challan_date, 'YYYY-MM-DD') as date
      FROM outgoing_inventory oi
      WHERE oi.invoice_challan_date = '2026-01-12'
    `;

        const result2 = await client.query(query2);
        console.log(`Found ${result2.rowCount} records with January 12, 2026\n`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

listWithNames();
