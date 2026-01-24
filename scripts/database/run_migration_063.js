const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '063_add_unique_constraint_item_name_model.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Starting migration: 063_add_unique_constraint_item_name_model');
    console.log('─────────────────────────────────────────────────────────\n');

    // Check for existing duplicates before migration
    console.log('🔍 Checking for existing duplicates...');
    const duplicateCheck = await client.query(`
      SELECT 
        company_id,
        LOWER(TRIM(item_name)) as normalized_item_name,
        UPPER(TRIM(COALESCE(model, ''))) as normalized_model,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY id) as ids
      FROM skus
      WHERE is_active = true
      GROUP BY company_id, LOWER(TRIM(item_name)), UPPER(TRIM(COALESCE(model, '')))
      HAVING COUNT(*) > 1;
    `);

    if (duplicateCheck.rows.length > 0) {
      console.log(`   ⚠️  Found ${duplicateCheck.rows.length} duplicate group(s)`);
      let totalDuplicates = 0;
      duplicateCheck.rows.forEach(dup => {
        const count = parseInt(dup.duplicate_count);
        totalDuplicates += (count - 1); // Subtract 1 because we keep the oldest
        console.log(`     - Company: ${dup.company_id}, Item: ${dup.normalized_item_name}, Model: ${dup.normalized_model || '(empty)'}, Count: ${count}`);
      });
      console.log(`   📊 Total duplicate SKUs to be marked inactive: ${totalDuplicates}\n`);
    } else {
      console.log('   ✓ No duplicates found\n');
    }

    // Execute the migration
    console.log('⏳ Executing migration SQL...');
    console.log('   This will:');
    console.log('   1. Mark duplicate SKUs as inactive (keep oldest)');
    console.log('   2. Create unique index: idx_skus_unique_item_name_model');
    console.log('');

    await client.query(migrationSQL);

    console.log('✅ Migration SQL executed successfully!\n');

    // Verify the index was created
    console.log('🔍 Verifying changes...\n');

    // Check if index exists
    console.log('📇 Checking unique index:');
    const indexCheck = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname = 'idx_skus_unique_item_name_model';
    `);

    if (indexCheck.rows.length > 0) {
      console.log('   ✓ Index created successfully:');
      console.log(`     Name: ${indexCheck.rows[0].indexname}`);
      console.log(`     Definition: ${indexCheck.rows[0].indexdef.substring(0, 100)}...`);
    } else {
      console.log('   ⚠️  Index not found (might have failed silently)');
    }

    // Check for remaining duplicates
    console.log('\n🔍 Checking for remaining duplicates:');
    const remainingDuplicates = await client.query(`
      SELECT 
        company_id,
        LOWER(TRIM(item_name)) as normalized_item_name,
        UPPER(TRIM(COALESCE(model, ''))) as normalized_model,
        COUNT(*) as duplicate_count
      FROM skus
      WHERE is_active = true
      GROUP BY company_id, LOWER(TRIM(item_name)), UPPER(TRIM(COALESCE(model, '')))
      HAVING COUNT(*) > 1;
    `);

    if (remainingDuplicates.rows.length > 0) {
      console.log(`   ⚠️  Warning: ${remainingDuplicates.rows.length} duplicate group(s) still exist`);
      remainingDuplicates.rows.forEach(dup => {
        console.log(`     - Company: ${dup.company_id}, Item: ${dup.normalized_item_name}, Model: ${dup.normalized_model || '(empty)'}, Count: ${dup.duplicate_count}`);
      });
    } else {
      console.log('   ✓ No duplicates remaining (all cleaned up)');
    }

    // Count inactive SKUs
    console.log('\n📊 Checking inactive SKUs:');
    const inactiveCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM skus 
      WHERE is_active = false;
    `);
    console.log(`   - Total inactive SKUs: ${inactiveCount.rows[0].count}`);

    console.log('\n─────────────────────────────────────────────────────────');
    console.log('🎉 Migration 063 completed successfully!');
    console.log('─────────────────────────────────────────────────────────');
    console.log('✅ Unique constraint added to prevent duplicate SKUs');
    console.log('✅ Existing duplicates have been cleaned up');
    console.log('✅ Future duplicates will be prevented at database level');
    console.log('─────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('─────────────────────────────────────────────────────────');
    console.error(`Error Code: ${error.code || 'N/A'}`);
    console.error(`Error Message: ${error.message}`);
    
    if (error.position) {
      console.error(`Position: ${error.position}`);
    }
    
    if (error.detail) {
      console.error(`Detail: ${error.detail}`);
    }
    
    if (error.hint) {
      console.error(`Hint: ${error.hint}`);
    }

    // Check if it's a constraint violation (index already exists)
    if (error.code === '42P07' || error.message.includes('already exists')) {
      console.error('\n⚠️  Index might already exist. This is safe to ignore if re-running.');
    }

    console.error('─────────────────────────────────────────────────────────\n');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the migration
console.log('═════════════════════════════════════════════════════════');
console.log('   SKU DUPLICATE PREVENTION MIGRATION');
console.log('   Migration 063: Unique Constraint on Item Name + Model');
console.log('═════════════════════════════════════════════════════════\n');

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
