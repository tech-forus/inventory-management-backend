const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration(migrationFile) {
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        console.log(`Reading migration file: ${migrationPath}`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration...');
        console.log('---');

        // Execute the migration
        await client.query(sql);

        console.log('---');
        console.log('✓ Migration completed successfully!');

    } catch (error) {
        console.error('✗ Migration failed:');
        console.error(error.message);
        if (error.detail) {
            console.error('Detail:', error.detail);
        }
        if (error.hint) {
            console.error('Hint:', error.hint);
        }
        process.exit(1);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('Usage: node run-migration.js <migration-file>');
    console.error('Example: node run-migration.js 075_add_search_blob_to_skus.sql');
    process.exit(1);
}

runMigration(migrationFile);
