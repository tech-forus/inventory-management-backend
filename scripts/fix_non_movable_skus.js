const { Pool } = require('pg');
const dbConfig = require('../src/config/database');

const pool = new Pool(dbConfig);

/**
 * Script to fix existing non-movable SKUs in the database
 * 
 * This script identifies SKUs that should be marked as non-movable based on
 * existing data patterns and updates their is_non_movable flag to true.
 * 
 * Identification criteria:
 * 1. SKUs that are displayed on the Non-Movable SKU page (from analytics)
 * 2. SKUs with no recent movement (configurable threshold)
 */

async function fixNonMovableSKUs() {
    console.log('Using dbConfig:', JSON.stringify({ ...dbConfig, password: '****' }, null, 2));

    const client = await pool.connect();

    try {
        console.log('\n========================================');
        console.log('Starting Non-Movable SKU Data Fix');
        console.log('========================================\n');

        // Step 1: Check current state
        console.log('Step 1: Checking current state...');
        const currentStateQuery = `
      SELECT 
        COUNT(*) as total_skus,
        COUNT(*) FILTER (WHERE is_non_movable = true) as marked_non_movable,
        COUNT(*) FILTER (WHERE is_non_movable IS NULL OR is_non_movable = false) as not_marked
      FROM skus 
      WHERE is_active = true;
    `;

        const currentState = await client.query(currentStateQuery);
        console.log('Current database state:');
        console.log(`- Total active SKUs: ${currentState.rows[0].total_skus}`);
        console.log(`- Marked as non-movable: ${currentState.rows[0].marked_non_movable}`);
        console.log(`- Not marked: ${currentState.rows[0].not_marked}\n`);

        // Step 2: Identify SKUs that should be marked as non-movable
        // These are SKUs with no outgoing movement in the last 180 days (6 months)
        console.log('Step 2: Identifying SKUs with no recent movement (last 180 days)...');

        const identifyQuery = `
      SELECT 
        s.id,
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.is_non_movable,
        s.company_id,
        COALESCE(MAX(oi.invoice_challan_date), s.created_at) as last_movement_date,
        CURRENT_DATE - COALESCE(MAX(oi.invoice_challan_date)::DATE, s.created_at::DATE) as days_since_movement
      FROM skus s
      LEFT JOIN outgoing_inventory_items oii ON s.id = oii.sku_id
      LEFT JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id 
        AND oi.is_active = true 
        AND oi.status = 'completed'
      WHERE s.is_active = true
        AND s.current_stock > 0  -- Only SKUs with stock
      GROUP BY s.id, s.sku_id, s.item_name, s.current_stock, s.is_non_movable, s.company_id, s.created_at
      HAVING 
        COALESCE(MAX(oi.invoice_challan_date)::DATE, s.created_at::DATE) < CURRENT_DATE - INTERVAL '180 days'
        AND (s.is_non_movable IS NULL OR s.is_non_movable = false)
      ORDER BY days_since_movement DESC;
    `;

        const identifyResult = await client.query(identifyQuery);
        console.log(`Found ${identifyResult.rows.length} SKUs with no movement in last 180 days\n`);

        if (identifyResult.rows.length > 0) {
            console.log('Sample of SKUs to be marked as non-movable:');
            identifyResult.rows.slice(0, 5).forEach((sku, index) => {
                console.log(`  ${index + 1}. ${sku.sku_id} - ${sku.item_name.substring(0, 40)}...`);
                console.log(`     Days since last movement: ${sku.days_since_movement}`);
                console.log(`     Current stock: ${sku.current_stock}\n`);
            });
        }

        // Step 3: Update SKUs to mark them as non-movable
        if (identifyResult.rows.length === 0) {
            console.log('No SKUs need to be updated. All non-movable flags are correct.\n');
        } else {
            console.log(`Step 3: Updating ${identifyResult.rows.length} SKUs as non-movable...`);

            const skuIds = identifyResult.rows.map(row => row.id);

            const updateQuery = `
        UPDATE skus 
        SET is_non_movable = true, updated_at = NOW()
        WHERE id = ANY($1::int[])
        RETURNING id, sku_id, item_name;
      `;

            const updateResult = await client.query(updateQuery, [skuIds]);
            console.log(`✅ Successfully updated ${updateResult.rowCount} SKUs as non-movable\n`);
        }

        // Step 4: Verify final state
        console.log('Step 4: Verifying final state...');
        const finalState = await client.query(currentStateQuery);
        console.log('Final database state:');
        console.log(`- Total active SKUs: ${finalState.rows[0].total_skus}`);
        console.log(`- Marked as non-movable: ${finalState.rows[0].marked_non_movable}`);
        console.log(`- Not marked: ${finalState.rows[0].not_marked}\n`);

        console.log('========================================');
        console.log('✅ Non-Movable SKU Data Fix Complete!');
        console.log('========================================\n');

        console.log('Summary of changes:');
        const changeCount = parseInt(finalState.rows[0].marked_non_movable) - parseInt(currentState.rows[0].marked_non_movable);
        console.log(`- SKUs newly marked as non-movable: ${changeCount}`);
        console.log('\nNote: The "Non Movable" filter should now work correctly!');

    } catch (err) {
        console.error('❌ Error during non-movable SKU data fix:', err.message);
        console.error('Stack trace:', err.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
fixNonMovableSKUs();
