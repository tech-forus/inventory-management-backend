const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get DATABASE_URL from command line argument or environment variable
const databaseUrl = process.argv[2] || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is required');
  console.error('Usage: node run-others-migration-railway.js <DATABASE_URL>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connecting to Railway database...');
    
    // Test connection
    await client.query('SELECT NOW()');
    console.log('✓ Connected to Railway database');
    
    // Read and run migrations in order
    const migrations = [
      '048_create_warehouses.sql',
      '049_create_materials.sql',
      '050_create_colours.sql'
    ];
    
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, 'database', 'migrations', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.error(`✗ Migration file not found: ${migrationPath}`);
        continue;
      }
      
      console.log(`\nRunning migration: ${migrationFile}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✓ Successfully applied ${migrationFile}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Error applying ${migrationFile}:`, error.message);
        throw error;
      }
    }
    
    console.log('\n✓ All migrations completed successfully!');
    
    // Verify tables were created
    console.log('\nVerifying tables...');
    const tables = ['warehouses', 'materials', 'colours'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✓ Table '${table}' exists`);
        
        // Get column count
        const colsResult = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position;
        `, [table]);
        
        console.log(`  Columns (${colsResult.rows.length}):`, colsResult.rows.map(r => r.column_name).join(', '));
      } else {
        console.log(`✗ Table '${table}' does not exist`);
      }
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();



