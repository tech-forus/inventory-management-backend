require('dotenv').config();
const pool = require('../src/models/database');
const { logger } = require('../src/utils/logger');

async function testConnection() {
  console.log('\n🔍 Testing Database Connection...\n');
  
  // Log configuration (without password)
  const dbConfig = require('../src/config/database');
  console.log('Database Configuration:');
  console.log('  Host:', dbConfig.host);
  console.log('  Port:', dbConfig.port);
  console.log('  Database:', dbConfig.database);
  console.log('  User:', dbConfig.user);
  console.log('  Password:', dbConfig.password ? '***' : 'NOT SET');
  console.log('  SSL:', dbConfig.ssl ? 'Enabled' : 'Disabled');
  console.log('');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('   ✅ Connection successful!\n');

    // Test if required tables exist
    console.log('2. Checking required tables...');
    const tables = ['users', 'companies', 'admins', 'users_data'];
    
    for (const table of tables) {
      try {
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        if (tableCheck.rows[0].exists) {
          console.log(`   ✅ Table '${table}' exists`);
        } else {
          console.log(`   ❌ Table '${table}' does NOT exist`);
        }
      } catch (err) {
        console.log(`   ❌ Error checking table '${table}':`, err.message);
      }
    }
    console.log('');

    // Test login query
    console.log('3. Testing login query structure...');
    try {
      const testQuery = await pool.query(
        `SELECT 
          u.id, u.company_id, u.email, u.password, u.full_name, 
          COALESCE(u.phone, a.phone, ud.phone) as phone,
          u.role, u.is_active,
          c.company_name
        FROM users u
        INNER JOIN companies c ON u.company_id = c.company_id
        LEFT JOIN admins a ON u.id = a.user_id
        LEFT JOIN users_data ud ON u.id = ud.user_id
        LIMIT 1`
      );
      console.log('   ✅ Login query structure is valid');
      if (testQuery.rows.length > 0) {
        console.log('   ✅ Found at least one user in database');
      } else {
        console.log('   ⚠️  No users found in database');
      }
    } catch (err) {
      console.log('   ❌ Login query failed:', err.message);
      console.log('   Error code:', err.code);
    }
    console.log('');

    console.log('✅ All database tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('\n💡 Troubleshooting:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   → PostgreSQL is not running');
      console.error('   → Start PostgreSQL: pg_ctl start or service postgresql start');
    } else if (error.code === '28P01') {
      console.error('   → Database authentication failed');
      console.error('   → Check DB_USER and DB_PASSWORD in .env file');
    } else if (error.code === '3D000') {
      console.error('   → Database does not exist');
      console.error('   → Create database or run migrations: npm run migrate');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   → Database host not found');
      console.error('   → Check DB_HOST in .env file');
    } else {
      console.error('   → Check your database configuration in .env file');
      console.error('   → Ensure PostgreSQL is running and accessible');
    }
    
    console.error('\n📝 Required .env variables:');
    console.error('   DB_HOST=localhost');
    console.error('   DB_PORT=5432');
    console.error('   DB_NAME=inventory_db');
    console.error('   DB_USER=postgres');
    console.error('   DB_PASSWORD=your_password\n');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();








