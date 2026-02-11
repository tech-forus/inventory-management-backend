const { pool } = require('../../src/models/database');

async function debugSkuData() {
    const client = await pool.connect();
    try {
        const skuCode = 'YZEKCRCZl IMXWSO'; // From screenshot (approximate)
        // Actually better to search by item name or partial SKU if OCR is bad
        // "Driver_T12401400-50PB ECO"

        console.log('Searching for SKU...');
        const skuRes = await client.query(`
      SELECT id, sku_id, item_name, current_stock, min_stock_level, 
             vendor_id, average_unit_price, min_unit_price, purchase_count
      FROM skus 
      WHERE item_name LIKE '%Driver_T12401400%' OR sku_id LIKE '%YZEK%'
      LIMIT 1
    `);

        if (skuRes.rows.length === 0) {
            console.log('SKU not found');
            return;
        }

        const sku = skuRes.rows[0];
        console.log('SKU Data:', sku);

        console.log('\nChecking Incoming Inventory for SKU ID:', sku.id);
        const incomingRes = await client.query(`
      SELECT ii.id, ii.invoice_number, ii.status, ii.vendor_id, ii.receiving_date, iii.unit_price
      FROM incoming_inventory_items iii
      JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      WHERE iii.sku_id = $1
    `, [sku.id]);

        console.log('Incoming Inventory Records:', incomingRes.rows);

        if (incomingRes.rows.length > 0) {
            const vendorId = incomingRes.rows[0].vendor_id;
            console.log('\nChecking Vendor:', vendorId);
            if (vendorId) {
                const vendorRes = await client.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
                console.log('Vendor Data:', vendorRes.rows[0]);
            } else {
                console.log('Vendor ID is NULL in incoming inventory');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

debugSkuData();
