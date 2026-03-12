const pool = require('../src/models/database.js');

async function run() {
    try {
        const companyId = 'YZEKCR';
        const query = `
            SELECT id, sku_id, item_name, model, series, item_nickname
            FROM skus
            WHERE company_id = $1 AND is_active = true
            ORDER BY id ASC;
        `;
        const res = await pool.query(query, [companyId]);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
