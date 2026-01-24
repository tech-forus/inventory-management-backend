const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway',
    ssl: { rejectUnauthorized: false },
});

async function debugSku() {
    try {
        const skuCode = 'QVSTAREJZVOADO';
        console.log(`Checking SKU: ${skuCode}`);

        // 1. Get SKU details
        const skuRes = await pool.query(`SELECT * FROM skus WHERE sku_id = $1`, [skuCode]);
        if (skuRes.rows.length === 0) {
            console.log('SKU not found!');
            return;
        }
        const sku = skuRes.rows[0];
        console.log('SKU Details:', {
            id: sku.id,
            item_name: sku.item_name,
            current_stock: sku.current_stock,
            opening_stock: sku.opening_stock,
            created_at: sku.created_at
        });

        // 2. Check Outgoing Items
        console.log('\n--- Outgoing Items ---');
        const outRes = await pool.query(`
      SELECT 
        oii.id, 
        oii.outgoing_quantity, 
        oi.status, 
        oi.document_type, 
        oi.destination_type,
        oi.destination_id,
        oi.created_at,
        oi.invoice_challan_number
      FROM outgoing_inventory_items oii
      JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id
      WHERE oii.sku_id = $1
    `, [sku.id]);

        if (outRes.rows.length === 0) {
            console.log('No outgoing items found in DB for this SKU.');
        } else {
            outRes.rows.forEach(row => {
                console.log(row);
            });
        }

        // 3. Check Incoming Items
        console.log('\n--- Incoming Items ---');
        const inRes = await pool.query(`
      SELECT 
        iii.id, 
        iii.received_quantity, 
        ii.status, 
        ii.vendor_id
      FROM incoming_inventory_items iii
      JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      WHERE iii.sku_id = $1
    `, [sku.id]);

        inRes.rows.forEach(row => {
            console.log(row);
        });

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debugSku();
