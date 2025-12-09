const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Run migrations for test database
 */
async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'inventory_db_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'forus',
  });

  try {
    await client.connect();
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../scripts/database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        // Ignore errors for idempotent migrations (IF NOT EXISTS, etc.)
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate')) {
          throw error;
        }
      }
    }

    await client.end();
  } catch (error) {
    if (client) await client.end().catch(() => {});
    throw error;
  }
}

module.exports = { runMigrations };

