const pool = require('../src/models/database');

async function checkIncomingInventoryData() {
  try {
    console.log('=== Checking Incoming Inventory Data for SKU ===\n');

    // First, let's find the SKU ID for YZEKCR X6F3RTDG (might have spaces)
    const skuQuery = `
      SELECT id, sku_id, item_name, vendor_id
      FROM skus 
      WHERE sku_id LIKE '%YZEKCR%X6F3RTDG%'
      LIMIT 5;
    `;
    
    console.log('1. Searching for SKU...');
    const skuResult = await pool.query(skuQuery);
    
    if (skuResult.rows.length === 0) {
      console.log('❌ No SKU found matching YZEKCR X6F3RTDG');
      process.exit(0);
    }
    
    console.log(`✅ Found SKU(s):`);
    skuResult.rows.forEach(sku => {
      console.log(`   - ID: ${sku.id}, SKU_ID: "${sku.sku_id}", Name: ${sku.item_name}, Vendor ID: ${sku.vendor_id}`);
    });
    
    const skuId = skuResult.rows[0].id;
    console.log(`\nUsing SKU ID: ${skuId}\n`);

    // Check if there are any incoming inventory items for this SKU
    const incomingQuery = `
      SELECT 
        ii.id as incoming_id,
        ii.invoice_number,
        ii.vendor_id,
        v.name as vendor_name,
        ii.receiving_date,
        ii.status,
        ii.is_active,
        iii.unit_price,
        iii.total_quantity
      FROM incoming_inventory_items iii
      INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      LEFT JOIN vendors v ON ii.vendor_id = v.id
      WHERE iii.sku_id = $1
      ORDER BY ii.receiving_date DESC, ii.id DESC
      LIMIT 5;
    `;
    
    console.log('2. Checking incoming inventory items...');
    const incomingResult = await pool.query(incomingQuery, [skuId]);
    
    if (incomingResult.rows.length === 0) {
      console.log('❌ No incoming inventory items found for this SKU');
    } else {
      console.log(`✅ Found ${incomingResult.rows.length} incoming inventory record(s):`);
      incomingResult.rows.forEach((item, idx) => {
        console.log(`\n   Record ${idx + 1}:`);
        console.log(`   - Invoice: ${item.invoice_number}`);
        console.log(`   - Vendor ID: ${item.vendor_id}`);
        console.log(`   - Vendor Name: ${item.vendor_name}`);
        console.log(`   - Unit Price: ${item.unit_price}`);
        console.log(`   - Quantity: ${item.total_quantity}`);
        console.log(`   - Receiving Date: ${item.receiving_date}`);
        console.log(`   - Status: ${item.status}`);
        console.log(`   - Is Active: ${item.is_active}`);
      });
    }

    // Now test the LATERAL join query (similar to what's in skuModel.js)
    console.log('\n3. Testing LATERAL join query (as used in skuModel.js)...');
    const lateralQuery = `
      SELECT 
        s.sku_id,
        s.item_name,
        v.name as vendor,
        latest_incoming.unit_price as last_purchase_price
      FROM skus s
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date, iii.unit_price
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id 
          AND ii.is_active = true 
          AND ii.status = 'completed'
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      WHERE s.id = $1;
    `;
    
    const lateralResult = await pool.query(lateralQuery, [skuId]);
    
    if (lateralResult.rows.length > 0) {
      const row = lateralResult.rows[0];
      console.log('✅ LATERAL join result:');
      console.log(`   - SKU ID: ${row.sku_id}`);
      console.log(`   - Item Name: ${row.item_name}`);
      console.log(`   - Vendor (from SKU master): ${row.vendor}`);
      console.log(`   - Last Purchase Price: ${row.last_purchase_price}`);
      
      if (!row.last_purchase_price) {
        console.log('\n⚠️  ISSUE: Last Purchase Price is NULL even though incoming inventory exists!');
        console.log('   This suggests the LATERAL join condition might be filtering out the data.');
      }
    }

    console.log('\n=== Analysis Complete ===\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkIncomingInventoryData();
