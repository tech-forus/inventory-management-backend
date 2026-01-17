const { Pool } = require('pg');
const dbConfig = require('../src/config/database');

const pool = new Pool(dbConfig);

async function checkDatabase() {
    const client = await pool.connect();
    try {
        console.log('--- RECENT OUTGOING INVENTORY ---');
        const res = await client.query(`
            SELECT id, document_type, invoice_challan_number, invoice_challan_date, destination_type, destination_id, total_value 
            FROM outgoing_inventory 
            ORDER BY created_at DESC 
            LIMIT 5;
        `);
        console.table(res.rows);

        console.log('\n--- CUSTOMERS (First 5) ---');
        const resCustomers = await client.query(`SELECT id, customer_name FROM customers LIMIT 5;`);
        console.table(resCustomers.rows);

        console.log('\n--- VENDORS (First 5) ---');
        const resVendors = await client.query(`SELECT id, name FROM vendors LIMIT 5;`);
        console.table(resVendors.rows);

    } catch (err) {
        console.error('Database check failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDatabase();
