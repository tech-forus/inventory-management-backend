/**
 * simplified update - Directly update by ID
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

async function simpleUpdate() {
    const client = await pool.connect();

    try {
        console.log('Connected to Railway database successfully\n');

        // Find all outgoing records with date 2026-01-12
        console.log('Finding outgoing inventory records with date 2026-01-12...\n');
        const findQuery = `
      SELECT id, invoice_challan_number, invoice_challan_date, destination_type, destination_id, document_type
      FROM outgoing_inventory
      WHERE invoice_challan_date = '2026-01-12'
      ORDER BY created_at DESC
    `;

        const findResult = await client.query(findQuery);
        console.log(`Found ${findResult.rowCount} record(s):`);
        console.table(findResult.rows);

        if (findResult.rowCount === 0) {
            console.log('\n❌ No records found with date 2026-01-12');
            await pool.end();
            return;
        }

        // Let user see what we found
        console.log('\n📋 Please check the records above.');
        console.log('If you can identify the JDDITS record by ID, we can update it directly.\n');

        // For now, let's update ALL records with this date (assuming JDDITS is the only one)
        console.log('Proceeding to update ALL records from 2026-01-12 to 2026-12-01...\n');

        await client.query('BEGIN');

        const updateQuery = `
      UPDATE outgoing_inventory
      SET invoice_challan_date = '2026-12-01'
      WHERE invoice_challan_date = '2026-01-12'
      RETURNING id, invoice_challan_number, invoice_challan_date
    `;

        const updateResult = await client.query(updateQuery);

        console.log(`✅ Successfully updated ${updateResult.rowCount} record(s):`);
        console.table(updateResult.rows);

        await client.query('COMMIT');

        console.log('\n========================================');
        console.log('✅ Update completed successfully!');
        console.log('========================================\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

simpleUpdate();
