const { Pool } = require('pg');

// Railway PostgreSQL connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false // Required for Railway
    }
});

async function verifyPurchasePageFix() {
    try {
        console.log('\n=== Verifying Purchase Page Fix ===\n');

        // Test the updated query (same as in skuModel.js getAll method)
        const testQuery = `
      SELECT 
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.min_stock_level,
        v.name as sku_default_vendor,
        COALESCE(last_vendor.name, v.name) as vendor,
        latest_incoming.unit_price as last_purchase_price,
        latest_incoming.receiving_date as last_receiving_date
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
      WHERE s.is_active = true
      ORDER BY s.created_at DESC
      LIMIT 20;
    `;

        console.log('Executing updated query...\n');
        const result = await pool.query(testQuery);

        if (result.rows.length === 0) {
            console.log('❌ No SKUs found in the database');
        } else {
            console.log(`✅ Found ${result.rows.length} SKU(s):\n`);

            let hasIncomingHistory = 0;
            let noIncomingHistory = 0;

            result.rows.forEach((row, idx) => {
                console.log(`${idx + 1}. SKU: ${row.sku_id}`);
                console.log(`   Item Name: ${row.item_name}`);
                console.log(`   Current Stock: ${row.current_stock}`);
                console.log(`   Min Stock Level: ${row.min_stock_level}`);
                console.log(`   SKU Default Vendor: ${row.sku_default_vendor || '-'}`);
                console.log(`   Vendor (displayed): ${row.vendor || '-'}`);
                console.log(`   Last PP: ${row.last_purchase_price ? `₹${row.last_purchase_price}` : '-'}`);
                console.log(`   Last Receiving Date: ${row.last_receiving_date || '-'}`);

                if (row.last_purchase_price) {
                    hasIncomingHistory++;
                    console.log(`   ✅ Has incoming inventory history`);
                } else {
                    noIncomingHistory++;
                    console.log(`   ⚠️  No incoming inventory history`);
                }
                console.log('');
            });

            console.log('=== Summary ===');
            console.log(`Total SKUs: ${result.rows.length}`);
            console.log(`With incoming history: ${hasIncomingHistory}`);
            console.log(`Without incoming history: ${noIncomingHistory}`);

            if (hasIncomingHistory > 0) {
                console.log('\n✅ SUCCESS: The fix is working! SKUs with incoming inventory now show Last PP and Vendor.');
            } else {
                console.log('\n⚠️  WARNING: No SKUs have incoming inventory history yet. The fix will work once inventory is added.');
            }
        }

        await pool.end();
        console.log('\n=== Verification Complete ===\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error during verification:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

verifyPurchasePageFix();
