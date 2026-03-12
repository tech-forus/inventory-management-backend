require('dotenv').config();
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to database...');
        const res = await pool.query('SELECT NOW()');
        console.log('Connection successful:', res.rows[0]);
        
        const companyId = 'YZEKCR';
        const query = `
            SELECT id, sku_id, item_name, model, series, item_nickname
            FROM skus
            WHERE company_id = $1 AND is_active = true
            ORDER BY id ASC;
        `;
        const skuRes = await pool.query(query, [companyId]);
        console.log('SKUs found:', skuRes.rows.length);
        console.log(JSON.stringify(skuRes.rows, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
