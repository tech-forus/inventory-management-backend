const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Check if whatsapp_number column exists
    const checkWhatsApp = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportors' AND column_name = 'whatsapp_number'
      )
    `);

    if (!checkWhatsApp.rows[0].exists) {
      console.log('🔍 Adding whatsapp_number column to transportors table...');
      await client.query(`
        ALTER TABLE transportors
        ADD COLUMN whatsapp_number VARCHAR(20);
      `);
      console.log('✅ Added whatsapp_number column\n');
    } else {
      console.log('⏭️  whatsapp_number column already exists\n');
    }

    // Check if sub_vendor is nullable
    const checkSubVendor = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'transportors' AND column_name = 'sub_vendor'
    `);

    if (checkSubVendor.rows.length > 0 && checkSubVendor.rows[0].is_nullable === 'NO') {
      console.log('🔍 Making sub_vendor column nullable...');
      await client.query(`
        ALTER TABLE transportors
        ALTER COLUMN sub_vendor DROP NOT NULL;
      `);
      console.log('✅ Made sub_vendor nullable\n');
    } else {
      console.log('⏭️  sub_vendor is already nullable\n');
    }

    // Add comments
    try {
      await client.query(`
        COMMENT ON COLUMN transportors.whatsapp_number IS 'WhatsApp number for transporter contact (optional)';
      `);
      await client.query(`
        COMMENT ON COLUMN transportors.sub_vendor IS 'Sub vendor or sub-contractor name (optional)';
      `);
      console.log('✅ Column comments added\n');
    } catch (err) {
      console.log('⚠️  Could not add comments (may already exist)\n');
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

