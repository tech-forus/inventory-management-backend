const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function diagnosePriceIssue() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Get the SKU that was just created (YZEKCREOFKIYT0)
        console.log('=== Testing SKU: YZEKCREOFKIYT0 ===\n');

        // Test 1: Check SKU table directly
        console.log('📊 Test 1: SKU Table Data');
        const skuQuery = `
      SELECT id, sku_id, item_name, current_stock
      FROM skus 
      WHERE sku_id = 'YZEKCREOFKIYT0' AND is_active = true
    `;
        const skuResult = await client.query(skuQuery);
        console.log('SKU Data:', skuResult.rows);
        console.log('');

        if (skuResult.rows.length === 0) {
            console.log('❌ SKU not found in database');
            return;
        }

        const sku = skuResult.rows[0];
        const skuId = sku.id;

        // Test 2: Check incoming inventory items for this SKU
        console.log('📊 Test 2: Incoming Inventory Items');
        const itemsQuery = `
      SELECT 
        ii.id as incoming_id,
        ii.receiving_date,
        ii.status,
        ii.is_active,
        ii.vendor_id,
        iii.unit_price,
        iii.quantity
      FROM incoming_inventory ii
      INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
      WHERE iii.sku_id = $1
      ORDER BY ii.receiving_date DESC, ii.id DESC
    `;
        const itemsResult = await client.query(itemsQuery, [skuId]);
        console.log('Found', itemsResult.rows.length, 'incoming inventory items:');
        itemsResult.rows.forEach((row, idx) => {
            console.log(`  ${idx + 1}:`, row);
        });
        console.log('');

        // Test 3: Test the LATERAL JOIN for last_purchase_price
        console.log('📊 Test 3: Last Purchase Price LATERAL JOIN');
        const lastPPQuery = `
      SELECT 
        s.sku_id,
        latest_incoming.unit_price as last_purchase_price,
        latest_incoming.receiving_date
      FROM skus s
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date, iii.unit_price, ii.vendor_id
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id
          AND ii.company_id = s.company_id
          AND ii.is_active = true
          AND ii.status = 'completed'
          AND ii.vendor_id IS NOT NULL
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      WHERE s.id = $1
    `;
        const lastPPResult = await client.query(lastPPQuery, [skuId]);
        console.log('Last Purchase Price:', lastPPResult.rows);
        console.log('');

        // Test 4: Test the LATERAL JOIN for purchase_stats
        console.log('📊 Test 4: Purchase Stats LATERAL JOIN (Avg & Min)');
        const statsQuery = `
      SELECT 
        s.sku_id,
        purchase_stats.average_unit_price,
        purchase_stats.min_unit_price
      FROM skus s
      LEFT JOIN LATERAL (
        SELECT 
          AVG(iii.unit_price)::DECIMAL(10,2) as average_unit_price,
          MIN(iii.unit_price) as min_unit_price
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id
          AND ii.company_id = s.company_id
          AND ii.is_active = true
          AND ii.status = 'completed'
      ) purchase_stats ON true
      WHERE s.id = $1
    `;
        const statsResult = await client.query(statsQuery, [skuId]);
        console.log('Purchase Stats:', statsResult.rows);
        console.log('');

        // Test 5: Test the complete query as used in skuModel.js getAll
        console.log('📊 Test 5: Complete Query (as in getAll)');
        const completeQuery = `
      SELECT
        s.sku_id,
        s.item_name,
        latest_incoming.unit_price as last_purchase_price,
        purchase_stats.average_unit_price,
        purchase_stats.min_unit_price
      FROM skus s
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date, iii.unit_price, ii.vendor_id
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id
          AND ii.company_id = s.company_id
          AND ii.is_active = true
          AND ii.status = 'completed'
          AND ii.vendor_id IS NOT NULL
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      LEFT JOIN LATERAL (
        SELECT 
          AVG(iii.unit_price)::DECIMAL(10,2) as average_unit_price,
          MIN(iii.unit_price) as min_unit_price
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id
          AND ii.company_id = s.company_id
          AND ii.is_active = true
          AND ii.status = 'completed'
      ) purchase_stats ON true
      WHERE s.id = $1 AND s.is_active = true
    `;
        const completeResult = await client.query(completeQuery, [skuId]);
        console.log('Complete Result:');
        completeResult.rows.forEach(row => {
            console.log('  SKU ID:', row.sku_id);
            console.log('  Item Name:', row.item_name);
            console.log('  Last Purchase Price:', row.last_purchase_price);
            console.log('  Average Unit Price:', row.average_unit_price);
            console.log('  Min Unit Price:', row.min_unit_price);
        });
        console.log('');

        console.log('✅ Diagnosis complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

diagnosePriceIssue();
