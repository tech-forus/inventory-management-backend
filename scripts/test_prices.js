const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function testPrices() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database\n');

        const query = `
      SELECT
        s.sku_id,
        s.item_name,
        latest_incoming.unit_price as last_purchase_price,
        purchase_stats.average_unit_price,
        purchase_stats.min_unit_price
      FROM skus s
      LEFT JOIN LATERAL (
        SELECT iii.unit_price
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
      WHERE s.sku_id = 'YZEKCREOFKIYT0' AND s.is_active = true
    `;

        const result = await client.query(query);

        if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log('SKU ID:', row.sku_id);
            console.log('Item Name:', row.item_name);
            console.log('Last Purchase Price:', row.last_purchase_price);
            console.log('Average Unit Price:', row.average_unit_price);
            console.log('Min Unit Price:', row.min_unit_price);
        } else {
            console.log('No data found');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

testPrices();
