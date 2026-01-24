/**
 * Verification script - Confirm the update was successful
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

async function verifyUpdate() {
    const client = await pool.connect();

    try {
        console.log('=== VERIFICATION - JDDITS Records After Update ===\n');

        // Check for records with the NEW date (2026-01-12)
        console.log('1. Records with NEW date (2026-01-12):');
        const newDateQuery = `
      SELECT id, invoice_challan_number, invoice_challan_date
      FROM outgoing_inventory
      WHERE destination_type = 'customer'
        AND destination_id = 12
        AND invoice_challan_date = '2026-01-12'
      ORDER BY id
    `;
        const newDateResult = await client.query(newDateQuery);
        console.log(`   Found: ${newDateResult.rowCount} records`);
        newDateResult.rows.forEach(row => {
            console.log(`   - ID ${row.id}: ${row.invoice_challan_number}`);
        });

        // Check for records with the OLD date (2026-12-01)
        console.log('\n2. Records with OLD date (2026-12-01):');
        const oldDateQuery = `
      SELECT id, invoice_challan_number, invoice_challan_date
      FROM outgoing_inventory
      WHERE destination_type = 'customer'
        AND destination_id = 12
        AND invoice_challan_date = '2026-12-01'
    `;
        const oldDateResult = await client.query(oldDateQuery);
        console.log(`   Found: ${oldDateResult.rowCount} records`);
        if (oldDateResult.rowCount > 0) {
            console.log('   ⚠️  WARNING: Some records still have the old date!');
        } else {
            console.log('   ✅ Confirmed: No records remain with the old date');
        }

        console.log('\n========================================');
        if (newDateResult.rowCount === 13 && oldDateResult.rowCount === 0) {
            console.log('✅ VERIFICATION SUCCESSFUL!');
            console.log('All 13 JDDITS records have been updated correctly.');
        } else {
            console.log('⚠️  VERIFICATION INCOMPLETE');
            console.log(`Expected 13 records with new date, found${newDateResult.rowCount}`);
            console.log(`Expected 0 records with old date, found ${oldDateResult.rowCount}`);
        }
        console.log('========================================\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyUpdate();
