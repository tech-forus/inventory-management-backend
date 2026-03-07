const pool = require('../src/models/database.js');

async function run() {
    const client = await pool.connect();
    try {
        const res1 = await client.query(`SELECT COUNT(*) as c FROM customer_contacts WHERE company_id = 'YZEKCR' AND deleted_at IS NULL;`);
        console.log("customer_contacts count:", res1.rows[0].c);

        const res2 = await client.query(`
      SELECT COUNT(*) as c
      FROM customer_contacts cc
      JOIN customer_companies comp ON cc.customer_company_id = comp.id
      WHERE cc.company_id = 'YZEKCR' AND cc.deleted_at IS NULL;
    `);
        console.log("JOIN count:", res2.rows[0].c);

        const res3 = await client.query(`
      SELECT cc.name
      FROM customer_contacts cc
      JOIN customer_companies comp ON cc.customer_company_id = comp.id
      WHERE cc.company_id = 'YZEKCR' AND cc.deleted_at IS NULL
    `);
        console.log("JOIN objects:", res3.rows.map(r => r.name));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
