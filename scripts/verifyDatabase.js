const { Client } = require('pg');
require('dotenv').config();

async function verifyDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'forus',
    database: 'inventory_db'
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to inventory_db database');
    
    // Get database info
    const result = await client.query(`
      SELECT 
        current_database() as database_name,
        version() as postgres_version
    `);
    
    console.log('\n📊 Database Information:');
    console.log(`   Database: ${result.rows[0].database_name}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].postgres_version.split(',')[0]}`);
    
    await client.end();
    console.log('\n✅ Verification complete!');
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    process.exit(1);
  }
}

verifyDatabase();

