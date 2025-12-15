const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dbConfig = require('./config');

/**
 * Migration Runner
 * Runs all migration files in the migrations directory in order
 */
async function runMigrations() {
  // Connect to postgres database first to create migration tracking table
  const postgresClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
    ssl: dbConfig.ssl || false, // Include SSL config
  });

  // Connect to target database for running migrations
  const targetClient = new Client(dbConfig);

  try {
    await postgresClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Create migrations tracking table in postgres database
    await postgresClient.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await targetClient.connect();
    console.log(`✅ Connected to database: ${dbConfig.database || 'inventory_db'}`);

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
      // Check if migration already ran
      const checkResult = await postgresClient.query(
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
        await targetClient.query('BEGIN');
        await targetClient.query(sql);
        await targetClient.query('COMMIT');

        // Record migration
        await postgresClient.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );

        console.log(`✅ Completed: ${file}\n`);
      } catch (error) {
        await targetClient.query('ROLLBACK');
        throw error;
      }
    }

    await targetClient.end();
    await postgresClient.end();
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (targetClient) await targetClient.end().catch(() => {});
    if (postgresClient) await postgresClient.end().catch(() => {});
    process.exit(1);
  }
}

runMigrations();

