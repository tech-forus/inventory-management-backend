require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway')
        ? { rejectUnauthorized: false }
        : false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Terms & Conditions Migration...\n');

        // Read SQL files
        const createTablesSql = fs.readFileSync(
            path.join(__dirname, 'create_terms_conditions_tables.sql'),
            'utf8'
        );
        const seedDataSql = fs.readFileSync(
            path.join(__dirname, 'seed_terms_conditions.sql'),
            'utf8'
        );

        console.log('📋 Step 1: Creating tables...');
        await client.query(createTablesSql);
        console.log('✅ Tables created successfully!\n');

        console.log('📋 Step 2: Seeding 20 standard terms...');
        await client.query(seedDataSql);
        console.log('✅ Data seeded successfully!\n');

        // Verify
        console.log('📋 Step 3: Verifying data...');
        const result = await client.query('SELECT COUNT(*) as count FROM terms_conditions');
        const count = result.rows[0].count;

        console.log(`✅ Verified: ${count} terms in database\n`);

        if (count == 20) {
            console.log('🎉 Migration completed successfully!');
            console.log('   - 3 tables created');
            console.log('   - 20 standard T&C terms loaded');
            console.log('   - System ready to use!\n');
        } else {
            console.warn(`⚠️  Warning: Expected 20 terms, found ${count}`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    });
