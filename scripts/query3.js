const pool = require('../src/models/database.js');

async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT cc.id, cc.name, cc.customer_company_id, comp.deleted_at as comp_deleted, comp.id as comp_id
      FROM customer_contacts cc
      LEFT JOIN customer_companies comp ON cc.customer_company_id = comp.id
      WHERE cc.company_id = 'YZEKCR' AND cc.deleted_at IS NULL
      AND comp.id IS NULL OR comp.deleted_at IS NOT NULL;
    `);
        console.log("Missing contacts:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
