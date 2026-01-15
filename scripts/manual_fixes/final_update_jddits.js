/**
 * FINAL UPDATE: Change JDDITS records from 2026-12-01 to 2026-01-12
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

async function updateJDDITSDate() {
    const client = await pool.connect();

    try {
        console.log('=== JDDITS DATE UPDATE ===\n');
        console.log('Customer: JDDITS (ID: 12) - Forus Electric');
        console.log('Changing date: 2026-12-01 → 2026-01-12\n');

        await client.query('BEGIN');

        // Update all outgoing inventory records for customer 12 with date 2026-12-01
        const updateQuery = `
      UPDATE outgoing_inventory
      SET invoice_challan_date = '2026-01-12'
      WHERE destination_type = 'customer'
        AND destination_id = 12
        AND invoice_challan_date = '2026-12-01'
      RETURNING id, invoice_challan_number, invoice_challan_date
    `;

        const result = await client.query(updateQuery);

        console.log(`✅ Successfully updated ${result.rowCount} record(s):\n`);

        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID ${row.id} - Invoice: ${row.invoice_challan_number} - New Date: ${row.invoice_challan_date}`);
        });

        await client.query('COMMIT');

        console.log('\n========================================');
        console.log('✅ DATABASE UPDATE COMPLETED!');
        console.log('========================================');
        console.log(`\nAll ${result.rowCount} JDDITS outgoing records have been updated.`);
        console.log('Date changed from December 1, 2026 to January 12, 2026.\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during update:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

updateJDDITSDate();
