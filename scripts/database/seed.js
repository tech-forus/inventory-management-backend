const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dbConfig = require('./config');

/**
 * Seed Runner
 * Runs all seed files in the seeds directory
 */
async function runSeeds() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all seed files
    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No seed files found in seeds directory');
      return;
    }

    console.log(`\n🌱 Found ${files.length} seed file(s)\n`);

    for (const file of files) {
      console.log(`🔄 Running seed: ${file}`);

      const filePath = path.join(seedsDir, file);

      if (file.endsWith('.sql')) {
        // Run SQL seed file
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✅ Completed: ${file}\n`);
      } else if (file.endsWith('.js')) {
        // Run JavaScript seed file
        const seedModule = require(filePath);
        if (typeof seedModule === 'function') {
          await seedModule(client);
        } else if (typeof seedModule.default === 'function') {
          await seedModule.default(client);
        }
        console.log(`✅ Completed: ${file}\n`);
      }
    }

    await client.end();
    console.log('✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

runSeeds();

