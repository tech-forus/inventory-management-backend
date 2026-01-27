const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration065() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Check if pg_trgm extension is already enabled
    const checkExtension = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
      )
    `);

    if (checkExtension.rows[0].exists) {
      console.log('✅ pg_trgm extension is already enabled\n');
    } else {
      console.log('📦 pg_trgm extension not found - will be enabled\n');
    }

    // Check existing trigram indexes
    const checkIndexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname LIKE '%_trgm'
      ORDER BY indexname;
    `);

    const existingIndexes = checkIndexes.rows.map(row => row.indexname);
    
    if (existingIndexes.length > 0) {
      console.log(`📊 Found ${existingIndexes.length} existing trigram index(es):`);
      existingIndexes.forEach(idx => console.log(`   - ${idx}`));
      console.log('');
    } else {
      console.log('📊 No existing trigram indexes found\n');
    }

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '065_enable_pg_trgm_fuzzy_search.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration 065: Enable pg_trgm fuzzy search\n');
    console.log('   Reading migration file:', migrationPath);
    console.log('   File size:', migrationSQL.length, 'bytes\n');

    // Execute the migration
    await client.query('BEGIN');
    
    try {
      // Execute the SQL migration
      await client.query(migrationSQL);
      
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully\n');

      // Verify the extension is enabled
      const verifyExtension = await client.query(`
        SELECT 
          extname,
          extversion
        FROM pg_extension 
        WHERE extname = 'pg_trgm'
      `);

      if (verifyExtension.rows.length > 0) {
        console.log('✅ Extension verified: pg_trgm');
        console.log(`   Version: ${verifyExtension.rows[0].extversion}\n`);
      } else {
        throw new Error('Extension verification failed - pg_trgm was not enabled');
      }

      // Verify indexes were created
      const verifyIndexes = await client.query(`
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes 
        WHERE indexname LIKE '%_trgm'
        ORDER BY tablename, indexname;
      `);

      if (verifyIndexes.rows.length > 0) {
        console.log(`✅ Created/Verified ${verifyIndexes.rows.length} trigram index(es):\n`);
        
        // Group by table
        const indexesByTable = {};
        verifyIndexes.rows.forEach(row => {
          if (!indexesByTable[row.tablename]) {
            indexesByTable[row.tablename] = [];
          }
          indexesByTable[row.tablename].push(row.indexname);
        });

        Object.keys(indexesByTable).sort().forEach(tableName => {
          console.log(`   📋 ${tableName}:`);
          indexesByTable[tableName].forEach(idxName => {
            console.log(`      ✓ ${idxName}`);
          });
          console.log('');
        });

        // Show index sizes
        const indexSizes = await client.query(`
          SELECT
            schemaname,
            relname AS tablename,
            indexrelname AS indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
          FROM pg_stat_user_indexes
          WHERE indexrelname LIKE '%_trgm'
          ORDER BY pg_relation_size(indexrelid) DESC;
        `);

        if (indexSizes.rows.length > 0) {
          console.log('📊 Index sizes:');
          indexSizes.rows.forEach(row => {
            console.log(`   ${row.indexname.padEnd(50)} ${row.index_size}`);
          });
          console.log('');
        }

      } else {
        console.log('⚠️  Warning: No trigram indexes found after migration');
        console.log('   This might be normal if tables don\'t exist yet\n');
      }

      // Test similarity function
      console.log('🧪 Testing similarity() function:');
      const testSimilarity = await client.query(`
        SELECT 
          similarity('SwitchBoard', 'SwitchBord') as test1,
          similarity('SwitchBoard', 'Switch') as test2,
          similarity('SwitchBoard', 'Light') as test3;
      `);

      const results = testSimilarity.rows[0];
      console.log(`   similarity('SwitchBoard', 'SwitchBord') = ${results.test1.toFixed(4)} (should be ~0.89)`);
      console.log(`   similarity('SwitchBoard', 'Switch') = ${results.test2.toFixed(4)} (should be ~0.50)`);
      console.log(`   similarity('SwitchBoard', 'Light') = ${results.test3.toFixed(4)} (should be ~0.00)`);
      console.log('');

      console.log('✅ Migration 065 completed successfully!');
      console.log('   Extension: pg_trgm');
      console.log('   Purpose: Enable fuzzy search with typo tolerance');
      console.log('   Features: similarity() function, GIN trigram indexes');
      console.log('   Performance: Optimized for fast fuzzy matching\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    await client.end();

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error(error.stack);
    
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      await client.end().catch(() => {});
    }
    process.exit(1);
  }
}

// Run the migration
runMigration065();
