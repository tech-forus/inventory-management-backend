require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway')
        ? { rejectUnauthorized: false }
        : false
});

async function verifyMigration() {
    const client = await pool.connect();

    try {
        console.log('🔍 Verifying Terms & Conditions Migration...\n');

        // Check all terms
        const allTerms = await client.query(`
            SELECT term_key, term_title, is_mandatory, is_system_default 
            FROM terms_conditions 
            ORDER BY term_order
        `);

        console.log(`📊 Total Terms: ${allTerms.rows.length}\n`);

        console.log('📋 Standard Terms:');
        allTerms.rows.forEach((term, idx) => {
            const badge = term.is_mandatory ? '⚠️  MANDATORY' : '   ';
            console.log(`   ${idx + 1}. ${term.term_title} ${badge}`);
        });

        console.log('\n📊 Statistics:');
        const mandatory = allTerms.rows.filter(t => t.is_mandatory).length;
        const systemDefaults = allTerms.rows.filter(t => t.is_system_default).length;

        console.log(`   - Mandatory Terms: ${mandatory}`);
        console.log(`   - System Defaults: ${systemDefaults}`);
        console.log(`   - Optional Terms: ${allTerms.rows.length - mandatory}`);

        console.log('\n✅ Migration verification complete!');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

verifyMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
