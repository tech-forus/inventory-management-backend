const { Pool } = require('pg');

// Railway PostgreSQL connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkSpecificSKU() {
    try {
        console.log('\n=== Checking Specific SKU: YZEKCR X6F3RTDG ===\n');

        // Search for the SKU (handle potential spacing issues)
        const skuSearchQuery = `
      SELECT id, sku_id, item_name, vendor_id, current_stock
      FROM skus 
      WHERE sku_id LIKE '%YZEKCR%X6F3RTDG%'
      OR sku_id LIKE '%YZEKCR%6F3RTDG%'
      LIMIT 5;
    `;

        const skuResult = await pool.query(skuSearchQuery);

        if (skuResult.rows.length === 0) {
            console.log('❌ SKU not found. Checking all SKUs with X6F3RTDG pattern...\n');

            const altQuery = `SELECT sku_id FROM skus WHERE sku_id LIKE '%X6F3RTDG%' LIMIT 10;`;
            const altResult = await pool.query(altQuery);

            if (altResult.rows.length > 0) {
                console.log('Found similar SKUs:');
                altResult.rows.forEach(row => console.log(`  - ${row.sku_id}`));
            } else {
                console.log('No SKUs found with X6F3RTDG pattern.');
            }
        } else {
            console.log('✅ Found SKU(s):');
            skuResult.rows.forEach(sku => {
                console.log(`  - ID: ${sku.id}, SKU: "${sku.sku_id}", Stock: ${sku.current_stock}`);
            });

            const skuId = skuResult.rows[0].id;
            console.log(`\nChecking incoming inventory for SKU ID ${skuId}...\n`);

            // Check for incoming inventory
            const incomingQuery = `
        SELECT 
          ii.id, ii.invoice_number, ii.status, ii.is_active,
          ii.vendor_id, v.name as vendor_name,
          iii.unit_price, iii.total_quantity,
          ii.receiving_date
        FROM incoming_inventory_items iii
        INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
        LEFT JOIN vendors v ON ii.vendor_id = v.id
        WHERE iii.sku_id = $1
        ORDER BY ii.receiving_date DESC
        LIMIT 5;
      `;

            const incomingResult = await pool.query(incomingQuery, [skuId]);

            if (incomingResult.rows.length === 0) {
                console.log('❌ No incoming inventory records found for this SKU.');
            } else {
                console.log(`✅ Found ${incomingResult.rows.length} incoming inventory record(s):\n`);
                incomingResult.rows.forEach((item, idx) => {
                    console.log(`${idx + 1}. Invoice: ${item.invoice_number}`);
                    console.log(`   Status: ${item.status}, Active: ${item.is_active}`);
                    console.log(`   Vendor: ${item.vendor_name} (ID: ${item.vendor_id})`);
                    console.log(`   Unit Price: ₹${item.unit_price}`);
                    console.log(`   Quantity: ${item.total_quantity}`);
                    console.log(`   Receiving Date: ${item.receiving_date}`);
                    console.log('');
                });
            }
        }

        // Check total incoming inventory count
        console.log('\n=== Overall Database Status ===\n');

        const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM skus WHERE is_active = true) as total_skus,
        (SELECT COUNT(DISTINCT ii.id) FROM incoming_inventory ii WHERE ii.is_active = true) as total_incoming_records,
        (SELECT COUNT(DISTINCT ii.id) FROM incoming_inventory ii WHERE ii.is_active = true AND ii.status = 'completed') as completed_incoming_records,
        (SELECT COUNT(*) FROM incoming_inventory_items) as total_incoming_items;
    `;

        const statsResult = await pool.query(statsQuery);
        const stats = statsResult.rows[0];

        console.log(`Total Active SKUs: ${stats.total_skus}`);
        console.log(`Total Incoming Inventory Records: ${stats.total_incoming_records}`);
        console.log(`Completed Incoming Records: ${stats.completed_incoming_records}`);
        console.log(`Total Incoming Inventory Items: ${stats.total_incoming_items}`);

        await pool.end();
        console.log('\n=== Check Complete ===\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkSpecificSKU();
