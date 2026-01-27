const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration064() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sub_category_defaults'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('⏭️  Table sub_category_defaults already exists');
      console.log('   Checking if migration needs to be updated...\n');
      
      // Check if all required columns exist
      const checkColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sub_category_defaults'
        ORDER BY column_name;
      `);
      
      const existingColumns = checkColumns.rows.map(row => row.column_name);
      console.log(`   Found ${existingColumns.length} existing columns`);
      
      // Verify key columns exist
      const requiredColumns = [
        'id', 'sub_category_id', 'company_id', 'name',
        'hsn_code', 'gst_rate', 'default_vendor_id', 'default_brand_id'
      ];
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
        console.log('   Running migration to add missing columns...\n');
      } else {
        console.log('   ✅ All required columns exist');
        console.log('   Migration already applied or table structure is correct\n');
        await client.end();
        return;
      }
    }

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '064_create_sub_category_defaults.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration 064: Create sub_category_defaults table\n');
    console.log('   Reading migration file:', migrationPath);
    console.log('   File size:', migrationSQL.length, 'bytes\n');

    // Execute the migration
    await client.query('BEGIN');
    
    try {
      // Execute the SQL migration
      await client.query(migrationSQL);
      
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully\n');

      // Verify the table was created
      const verifyTable = await client.query(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sub_category_defaults') as column_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sub_category_defaults'
      `);

      if (verifyTable.rows.length > 0) {
        console.log('✅ Table verified: sub_category_defaults');
        console.log(`   Columns: ${verifyTable.rows[0].column_count}\n`);

        // Show table structure
        const columns = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'sub_category_defaults'
          ORDER BY ordinal_position;
        `);

        console.log('📋 Table structure:');
        columns.rows.forEach((row, index) => {
          const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
          console.log(`   ${index + 1}. ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${nullable}${defaultVal}`);
        });

        // Check indexes
        const indexes = await client.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'sub_category_defaults'
          ORDER BY indexname;
        `);

        if (indexes.rows.length > 0) {
          console.log('\n📊 Indexes:');
          indexes.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.indexname}`);
          });
        }

        // Check foreign keys
        const foreignKeys = await client.query(`
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'sub_category_defaults'
          ORDER BY tc.constraint_name;
        `);

        if (foreignKeys.rows.length > 0) {
          console.log('\n🔗 Foreign Keys:');
          foreignKeys.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
          });
        }

        console.log('\n✅ Migration 064 completed successfully!');
        console.log('   Table: sub_category_defaults');
        console.log('   Purpose: Store default SKU field values for sub-categories');
        console.log('   Supports: Multiple default sets per sub-category\n');

      } else {
        throw new Error('Table verification failed - table was not created');
      }

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
runMigration064();
