const { Client } = require('pg');

// Database connection for Railway (with SSL disabled for this script)
const client = new Client({
    host: 'centerbeam.proxy.rlwy.net',
    port: 22395,
    database: 'railway',
    user: 'postgres',
    password: 'lWKfNKluCcjlvvCBpNItDEjMhdqUQMth',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Read and run the migration
        const fs = require('fs');
        const path = require('path');
        const migrationFile = path.join(__dirname, 'scripts/database/migrations/135_add_address_details_to_units.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('🔄 Running migration: 135_add_address_details_to_units.sql');
        
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('✅ Migration completed successfully!');
        console.log('📋 Added billing/shipping pincode, city, state, GST columns to customer_units');
        console.log('📝 Migrated existing gst_number data to billing_gst_number');
        
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        await client.query('ROLLBACK');
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
