const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function findRecentSKUs() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Find recent SKUs with incoming inventory
        console.log('📊 Finding recent SKUs with purchase history...\n');

        const query = `
      SELECT 
        s.id,
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.created_at,
        COUNT(iii.id) as purchase_count
      FROM skus s
      LEFT JOIN incoming_inventory_items iii ON iii.sku_id = s.id
      WHERE s.is_active = true
      GROUP BY s.id, s.sku_id, s.item_name, s.current_stock, s.created_at
      HAVING COUNT(iii.id) > 0
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

        const result = await client.query(query);
        console.log('Found', result.rows.length, 'SKUs with purchase history:');
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

findRecentSKUs();
