const { Pool } = require('pg');

// Railway PostgreSQL connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testUpdatedQuery() {
    try {
        console.log('\n=== Testing Updated Query for SKU: YZEKCRX6F3RTDG ===\n');

        // Use the exact query structure from skuModel.js
        const testQuery = `
      SELECT 
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.min_stock_level,
        v.name as sku_default_vendor,
        COALESCE(last_vendor.name, v.name) as vendor,
        latest_incoming.unit_price as last_purchase_price,
        latest_incoming.receiving_date,
        latest_incoming.vendor_id as incoming_vendor_id,
        last_vendor.name as incoming_vendor_name
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date, iii.unit_price, ii.vendor_id
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id 
          AND ii.is_active = true 
          AND ii.status = 'completed'
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      LEFT JOIN vendors last_vendor ON latest_incoming.vendor_id = last_vendor.id
      WHERE s.sku_id = 'YZEKCRX6F3RTDG' AND s.is_active = true;
    `;

        console.log('Executing query...\n');
        const result = await pool.query(testQuery);

        if (result.rows.length === 0) {
            console.log('❌ No results returned - SKU not found or query error');
        } else {
            const row = result.rows[0];

            console.log('✅ Query Result:\n');
            console.log('SKU Information:');
            console.log(`  SKU ID: ${row.sku_id}`);
            console.log(`  Item Name: ${row.item_name}`);
            console.log(`  Current Stock: ${row.current_stock}`);
            console.log(`  Min Stock Level: ${row.min_stock_level}`);
            console.log('');

            console.log('Vendor Information:');
            console.log(`  SKU Default Vendor: ${row.sku_default_vendor || 'NULL'}`);
            console.log(`  Incoming Vendor ID: ${row.incoming_vendor_id || 'NULL'}`);
            console.log(`  Incoming Vendor Name: ${row.incoming_vendor_name || 'NULL'}`);
            console.log(`  Vendor (displayed): ${row.vendor || 'NULL'}`);
            console.log('');

            console.log('Purchase Information:');
            console.log(`  Last Purchase Price: ${row.last_purchase_price ? `₹${row.last_purchase_price}` : 'NULL'}`);
            console.log(`  Last Receiving Date: ${row.receiving_date || 'NULL'}`);
            console.log('');

            // Verify the fix is working
            console.log('=== Verification ===\n');

            if (row.last_purchase_price !== null) {
                console.log('✅ PASS: Last Purchase Price is populated (₹' + row.last_purchase_price + ')');
            } else {
                console.log('❌ FAIL: Last Purchase Price is NULL (expected ₹24.56)');
            }

            if (row.vendor !== null && row.vendor !== '-') {
                console.log(`✅ PASS: Vendor is populated ("${row.vendor}")`);
            } else {
                console.log('❌ FAIL: Vendor is NULL or "-" (expected "mrigank")');
            }

            if (row.incoming_vendor_name === 'mrigank' && row.last_purchase_price === 24.56) {
                console.log('\n🎉 SUCCESS! The fix is working correctly!');
                console.log('   - Last PP shows: ₹24.56 (from latest incoming inventory)');
                console.log('   - Vendor shows: mrigank (from latest incoming inventory)');
            } else {
                console.log('\n⚠️  Results differ from expected values');
                console.log(`   Expected: Vendor="mrigank", Price=24.56`);
                console.log(`   Got: Vendor="${row.incoming_vendor_name}", Price=${row.last_purchase_price}`);
            }
        }

        await pool.end();
        console.log('\n=== Test Complete ===\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

testUpdatedQuery();
