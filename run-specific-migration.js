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
        const migrationFile = path.join(__dirname, 'scripts/database/migrations/134_add_expected_closure_date_to_leads.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('🔄 Running migration: 134_add_expected_closure_date_to_leads.sql');
        
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('✅ Migration completed successfully!');
        console.log('📋 Added expected_closure_date column to leads table');
        console.log('🔍 Created index for performance');
        console.log('📝 Added documentation comments');
        
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        await client.query('ROLLBACK');
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
