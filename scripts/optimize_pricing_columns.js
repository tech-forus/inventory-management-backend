const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function migrate() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        console.log('🔄 Adding pricing columns to skus table...');

        // 1. Add Columns
        await client.query(`
            ALTER TABLE skus 
            ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(10,2) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS average_unit_price DECIMAL(10,2) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS min_unit_price DECIMAL(10,2) DEFAULT NULL;
        `);
        console.log('✅ Columns added (or already exist)');

        // 2. Add Indexes for Sorting Speed
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_skus_last_purchase_price ON skus(last_purchase_price);
            CREATE INDEX IF NOT EXISTS idx_skus_average_unit_price ON skus(average_unit_price);
            CREATE INDEX IF NOT EXISTS idx_skus_min_unit_price ON skus(min_unit_price);
        `);
        console.log('✅ Indexes created');

        console.log('🔄 Populating data from historical records (this may take a moment)...');

        // 3. Populate Data
        // We use a WITH clause to aggregate stats first, then UPDATE
        const updateQuery = `
            WITH stats AS (
                SELECT 
                    iii.sku_id,
                    MIN(iii.unit_price) as min_price,
                    AVG(iii.unit_price)::DECIMAL(10,2) as avg_price
                FROM incoming_inventory_items iii
                JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
                WHERE ii.status = 'completed' AND ii.is_active = true
                GROUP BY iii.sku_id
            ),
            latest AS (
                SELECT DISTINCT ON (iii.sku_id)
                    iii.sku_id,
                    iii.unit_price as last_price
                FROM incoming_inventory_items iii
                JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
                WHERE ii.status = 'completed' AND ii.is_active = true
                ORDER BY iii.sku_id, ii.receiving_date DESC, ii.id DESC
            )
            UPDATE skus s
            SET 
                min_unit_price = stats.min_price,
                average_unit_price = stats.avg_price,
                last_purchase_price = latest.last_price
            FROM stats
            LEFT JOIN latest ON stats.sku_id = latest.sku_id
            WHERE s.id = stats.sku_id;
        `;

        const result = await client.query(updateQuery);
        console.log(`✅ Data populated. Updated ${result.rowCount} rows.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await client.end();
        console.log('🔌 Disconnected');
    }
}

migrate().catch(console.error);
