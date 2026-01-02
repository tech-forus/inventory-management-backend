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

async function addColumnIfNotExists(columnName, columnDefinition) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = $1
    )
  `, [columnName]);
  
  if (!result.rows[0].exists) {
    // Use parameterized query for safety, but column definition needs to be in the SQL string
    await client.query(`ALTER TABLE customers ADD COLUMN ${columnName} ${columnDefinition}`);
    return true;
  }
  return false;
}

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // First, ensure customers table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        company_id VARCHAR(6) NOT NULL
      )
    `);
    console.log('✅ Customers table exists\n');

    // List of all required columns with their definitions
    const columns = [
      { name: 'customer_name', def: 'VARCHAR(255) NOT NULL' },
      { name: 'email', def: 'VARCHAR(255)' },
      { name: 'phone', def: 'VARCHAR(50)' },
      { name: 'contact_person', def: 'VARCHAR(255)' },
      { name: 'whatsapp_number', def: 'VARCHAR(20)' },
      { name: 'address_line1', def: 'VARCHAR(255)' },
      { name: 'address_line2', def: 'VARCHAR(255)' },
      { name: 'city', def: 'VARCHAR(100)' },
      { name: 'state', def: 'VARCHAR(100)' },
      { name: 'country', def: 'VARCHAR(100)' },
      { name: 'postal_code', def: 'VARCHAR(20)' },
      { name: 'company_name', def: 'VARCHAR(255)' },
      { name: 'gst_number', def: 'VARCHAR(50)' },
      { name: 'tax_id', def: 'VARCHAR(50)' },
      { name: 'credit_limit', def: 'DECIMAL(15, 2) DEFAULT 0.00' },
      { name: 'outstanding_balance', def: 'DECIMAL(15, 2) DEFAULT 0.00' },
      { name: 'is_active', def: 'BOOLEAN DEFAULT true' },
      { name: 'notes', def: 'TEXT' },
      { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'created_by', def: 'INTEGER' },
      { name: 'updated_by', def: 'INTEGER' },
      { name: 'date_of_birth', def: 'DATE' },
      { name: 'personal_address', def: 'TEXT' },
    ];

    console.log('🔍 Checking and adding missing columns...\n');
    const addedColumns = [];

    for (const col of columns) {
      const added = await addColumnIfNotExists(col.name, col.def);
      if (added) {
        addedColumns.push(col.name);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`⏭️  Column already exists: ${col.name}`);
      }
    }

    // Add foreign key constraint for company_id if it doesn't exist
    try {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'customers_company_id_fkey'
          ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);
      console.log('✅ Foreign key constraint checked');
    } catch (err) {
      console.log('⚠️  Foreign key constraint may already exist or companies table not found');
    }

    // Add indexes if they don't exist
    const indexes = [
      { name: 'idx_customers_company_id', def: 'CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id)' },
      { name: 'idx_customers_email', def: 'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)' },
      { name: 'idx_customers_phone', def: 'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)' },
      { name: 'idx_customers_is_active', def: 'CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)' },
      { name: 'idx_customers_created_at', def: 'CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)' },
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx.def);
        console.log(`✅ Index checked: ${idx.name}`);
      } catch (err) {
        // Index might already exist, continue
      }
    }

    // Add trigger for updated_at
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_customers_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS trigger_update_customers_updated_at ON customers;
        CREATE TRIGGER trigger_update_customers_updated_at
          BEFORE UPDATE ON customers
          FOR EACH ROW
          EXECUTE FUNCTION update_customers_updated_at();
      `);
      console.log('✅ Updated_at trigger checked');
    } catch (err) {
      console.log('⚠️  Trigger setup skipped');
    }

    // Add comments
    await client.query(`
      COMMENT ON COLUMN customers.date_of_birth IS 'Date of birth of the customer (optional)';
    `);
    await client.query(`
      COMMENT ON COLUMN customers.personal_address IS 'Personal address of the customer (optional)';
    `);
    console.log('✅ Column comments added\n');

    console.log('✅ Migration completed successfully!');
    console.log(`\n📋 Summary: ${addedColumns.length} new column(s) added`);
    if (addedColumns.length > 0) {
      console.log('   Added columns:', addedColumns.join(', '));
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

