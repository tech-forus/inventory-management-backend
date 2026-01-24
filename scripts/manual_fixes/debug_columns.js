/**
 * Quick script to check database schema for vendors and skus
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

async function checkSchema() {
    const client = await pool.connect();

    try {
        console.log('\nChecking vendors table columns...');
        const vendorsColumns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'vendors'
          ORDER BY ordinal_position
        `);
        console.log(JSON.stringify(vendorsColumns.rows, null, 2));

        console.log('\nChecking skus table columns...');
        const skusColumns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'skus'
          ORDER BY ordinal_position
        `);
        console.log(JSON.stringify(skusColumns.rows, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
