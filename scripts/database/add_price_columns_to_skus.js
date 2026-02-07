const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inventory_db';

const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Adding columns to skus table...');

        await client.query(`
      ALTER TABLE skus 
      ADD COLUMN IF NOT EXISTS average_unit_price DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS min_unit_price DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
    `);

        await client.query('COMMIT');
        console.log('Migration successful');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
        process.exit(0);
    }
}

migrate();
