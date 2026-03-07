const pool = require('../src/models/database.js');

async function run() {
    try {
        console.log("--- customers ---");
        const res1 = await pool.query('SELECT * FROM customers LIMIT 3;');
        console.log(JSON.stringify(res1.rows, null, 2));

        console.log("--- customer_companies ---");
        const res2 = await pool.query('SELECT * FROM customer_companies LIMIT 3;');
        console.log(JSON.stringify(res2.rows, null, 2));

        console.log("--- customer_contacts ---");
        const res3 = await pool.query('SELECT * FROM customer_contacts LIMIT 3;');
        console.log(JSON.stringify(res3.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
