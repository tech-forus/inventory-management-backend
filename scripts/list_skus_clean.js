require('dotenv').config();
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const companyId = 'YZEKCR';
        const query = `
            SELECT id, item_name, model, series
            FROM skus
            WHERE company_id = $1 AND is_active = true
            ORDER BY id ASC;
        `;
        const res = await pool.query(query, [companyId]);
        
        console.log('ID | Item Name | Model | Series');
        console.log('---|-----------|-------|-------');
        res.rows.forEach(row => {
            console.log(`${row.id} | ${row.item_name} | ${row.model || ''} | ${row.series || ''}`);
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
