/**
 * Find customer ID 12 details
 */

const { Pool } = require('pg');

const dbConfig = {
    host: 'centerbeam.proxy.rlwy.net',
    port: 22395,
    database: 'railway',
    user: 'postgres',
    password: 'lWKfNKluCcjlvvCBpNItDEjMhdqUQMth',
    ssl: {
        rejectUnauthorized: false
    },
};

const pool = new Pool(dbConfig);

async function checkCustomer12() {
    const client = await pool.connect();

    try {
        console.log('Checking customer ID 12...\n');

        const query = `
      SELECT * FROM customers WHERE id = 12
    `;

        const result = await client.query(query);

        if (result.rowCount > 0) {
            console.log('Customer ID 12 Details:');
            console.log(JSON.stringify(result.rows[0], null, 2));
        } else {
            console.log('No customer found with ID 12');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCustomer12();
