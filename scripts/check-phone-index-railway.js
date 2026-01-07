require('dotenv').config();
const { Client } = require('pg');

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.error('\nUsage:');
  console.error('  node scripts/check-phone-index-railway.js "postgresql://user:pass@host:port/db"');
  console.error('  OR');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/check-phone-index-railway.js');
  process.exit(1);
}

function getDbConfig() {
  try {
    const url = new URL(DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false },
    };
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error.message);
    process.exit(1);
  }
}

async function checkIndex() {
  const dbConfig = getDbConfig();

  console.log('🔍 Checking Railway Database for Phone Index...\n');
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Check if the index exists
    const indexCheck = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND indexname = 'idx_users_phone'
    `);

    if (indexCheck.rows.length > 0) {
      console.log('✅ Index EXISTS: idx_users_phone');
      console.log(`   Table: ${indexCheck.rows[0].tablename}`);
      console.log(`   Schema: ${indexCheck.rows[0].schemaname}`);
      console.log(`   Definition: ${indexCheck.rows[0].indexdef}\n`);
      
      // Also check if phone column exists
      const columnCheck = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'phone'
      `);

      if (columnCheck.rows.length > 0) {
        const phoneCol = columnCheck.rows[0];
        console.log('✅ Phone column EXISTS in users table:');
        console.log(`   Type: ${phoneCol.data_type}${phoneCol.character_maximum_length ? `(${phoneCol.character_maximum_length})` : ''}`);
        console.log(`   Nullable: ${phoneCol.is_nullable}\n`);
      } else {
        console.log('⚠️  Phone column NOT FOUND in users table\n');
      }

      // Check index usage statistics (if available)
      const indexStats = await client.query(`
        SELECT 
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE relname = 'users'
        AND indexrelname = 'idx_users_phone'
      `);

      if (indexStats.rows.length > 0) {
        const stats = indexStats.rows[0];
        console.log('📈 Index Statistics:');
        console.log(`   Index Scans: ${stats.index_scans || 0}`);
        console.log(`   Tuples Read: ${stats.tuples_read || 0}`);
        console.log(`   Tuples Fetched: ${stats.tuples_fetched || 0}\n`);
      }

      console.log('✅ Migration 047_add_phone_index_to_users.sql has been APPLIED\n');
      await client.end();
      process.exit(0);
    } else {
      console.log('❌ Index NOT FOUND: idx_users_phone\n');
      
      // Check if phone column exists
      const columnCheck = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'phone'
      `);

      if (columnCheck.rows.length > 0) {
        console.log('✅ Phone column EXISTS in users table');
        console.log('⚠️  But index is missing - migration needs to be run\n');
      } else {
        console.log('⚠️  Phone column also NOT FOUND in users table\n');
      }

      // List all indexes on users table
      const allIndexes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'users'
        ORDER BY indexname
      `);

      if (allIndexes.rows.length > 0) {
        console.log('📋 Existing indexes on users table:');
        allIndexes.rows.forEach(idx => {
          console.log(`   - ${idx.indexname}`);
        });
        console.log('');
      }

      console.log('❌ Migration 047_add_phone_index_to_users.sql has NOT been applied\n');
      console.log('💡 To apply the migration, run:');
      console.log('   node scripts/run-migration-railway.js "postgresql://..." 047_add_phone_index_to_users.sql\n');
      
      await client.end();
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error checking index:', error.message);
    console.error('Error details:', error);

    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  checkIndex().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { checkIndex, getDbConfig };

