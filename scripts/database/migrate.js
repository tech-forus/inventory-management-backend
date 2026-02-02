const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dbConfig = require('./config');

/**
 * Migration Runner
 * Runs all migration files in the migrations directory in order.
 * Stores schema_migrations in the TARGET database so that when the DB is dropped
 * and recreated (e.g. CI test DB), all migrations are re-applied.
 */
async function runMigrations() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log(`✅ Connected to database: ${dbConfig.database || 'inventory_db'}`);

    // Create migrations tracking table in TARGET database (not postgres)
    // This ensures that when the DB is dropped/recreated, we re-run all migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order

    if (files.length === 0) {
      console.log('⚠️  No migration files found in migrations directory');
      return;
    }

    console.log(`\n📦 Found ${files.length} migration file(s)\n`);

    for (const file of files) {
      // Check if migration already ran (in target DB)
      const checkResult = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Running migration: ${file}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        // Record migration in target DB
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );

        console.log(`✅ Completed: ${file}\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    await client.end();
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

runMigrations();

