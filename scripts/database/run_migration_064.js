const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost', 
  database: process.env.DB_NAME || 'inventory_db',
  password: process.env.DB_PASS || 'your_password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Migration 064: Dashboard Performance Indexes...');
    
    // Check if indexes already exist
    console.log('📊 Checking existing indexes...');
    const existingIndexes = await client.query(`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE indexname IN (
        'idx_skus_stock_levels',
        'idx_incoming_receiving_date', 
        'idx_outgoing_date_status',
        'idx_outgoing_items_analytics',
        'idx_skus_company_active',
        'idx_skus_non_movable'
      )
      ORDER BY indexname;
    `);
    
    if (existingIndexes.rows.length > 0) {
      console.log('✅ Found existing indexes:');
      existingIndexes.rows.forEach(row => {
        console.log(`   - ${row.indexname} on ${row.tablename}`);
      });
    } else {
      console.log('📝 No existing performance indexes found.');
    }
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, 'migrations', '064_add_dashboard_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔧 Executing migration...');
    await client.query(migrationSQL);
    
    // Verify indexes were created
    console.log('🔍 Verifying created indexes...');
    const newIndexes = await client.query(`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE indexname IN (
        'idx_skus_stock_levels',
        'idx_incoming_receiving_date',
        'idx_outgoing_date_status', 
        'idx_outgoing_items_analytics',
        'idx_skus_company_active',
        'idx_skus_non_movable'
      )
      ORDER BY indexname;
    `);
    
    console.log('✅ Dashboard Performance Indexes:');
    newIndexes.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname} on ${row.tablename}`);
    });
    
    // Show index sizes for monitoring
    console.log('\n📏 Index sizes:');
    const indexSizes = await client.query(`
      SELECT 
        indexname,
        pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as size
      FROM pg_indexes 
      WHERE indexname IN (
        'idx_skus_stock_levels',
        'idx_incoming_receiving_date',
        'idx_outgoing_date_status',
        'idx_outgoing_items_analytics', 
        'idx_skus_company_active',
        'idx_skus_non_movable'
      )
      ORDER BY indexname;
    `);
    
    indexSizes.rows.forEach(row => {
      console.log(`   📊 ${row.indexname}: ${row.size}`);
    });
    
    console.log('\n🎉 Migration 064 completed successfully!');
    console.log('📈 Dashboard performance should be significantly improved.');
    
  } catch (error) {
    console.error('❌ Migration 064 failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };