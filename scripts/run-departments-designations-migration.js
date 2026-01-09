const { Pool } = require('pg');

// Database connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    // Step 1: Add department column to vendors if it doesn't exist
    console.log('Step 1: Adding department column to vendors table...');
    await client.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS department VARCHAR(255);
    `);
    console.log('✓ Department column added');

    // Step 2: Create departments table
    console.log('Step 2: Creating departments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Departments table created');

    // Step 3: Create designations table
    console.log('Step 3: Creating designations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS designations (
        id SERIAL PRIMARY KEY,
        department_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_designations_department 
          FOREIGN KEY (department_id) 
          REFERENCES departments(id) 
          ON DELETE CASCADE,
        
        CONSTRAINT unique_department_designation 
          UNIQUE (department_id, name)
      );
    `);
    console.log('✓ Designations table created');

    // Step 4: Create indexes
    console.log('Step 4: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_designations_department_id ON designations(department_id);
      CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
      CREATE INDEX IF NOT EXISTS idx_designations_name ON designations(name);
    `);
    console.log('✓ Indexes created');

    // Step 5: Populate departments
    console.log('Step 5: Populating departments...');
    const departments = [
      'Engineering / Technology',
      'Product',
      'Quality / Testing',
      'Data / Analytics',
      'Sales',
      'Marketing',
      'Customer Support / Success',
      'Finance / Accounts',
      'Human Resources (HR)',
      'Operations',
      'Legal / Compliance',
      'Administration'
    ];

    for (const deptName of departments) {
      await client.query(`
        INSERT INTO departments (name) 
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
      `, [deptName]);
    }
    console.log(`✓ ${departments.length} departments populated`);

    // Step 6: Populate designations
    console.log('Step 6: Populating designations...');
    const designationsData = [
      { dept: 'Engineering / Technology', designations: ['Software Engineer', 'Engineering Manager'] },
      { dept: 'Product', designations: ['Product Manager', 'Product Lead'] },
      { dept: 'Quality / Testing', designations: ['QA Engineer', 'QA Manager'] },
      { dept: 'Data / Analytics', designations: ['Data Analyst', 'Data Scientist'] },
      { dept: 'Sales', designations: ['Sales Executive', 'Sales Manager'] },
      { dept: 'Marketing', designations: ['Marketing Specialist', 'Marketing Manager'] },
      { dept: 'Customer Support / Success', designations: ['Customer Support Executive', 'Customer Success Manager'] },
      { dept: 'Finance / Accounts', designations: ['Accountant', 'Finance Manager'] },
      { dept: 'Human Resources (HR)', designations: ['HR Executive', 'HR Manager'] },
      { dept: 'Operations', designations: ['Operations Executive', 'Operations Manager'] },
      { dept: 'Legal / Compliance', designations: ['Legal Officer', 'Compliance Manager'] },
      { dept: 'Administration', designations: ['Admin Executive', 'Admin Manager'] }
    ];

    let totalDesignations = 0;
    for (const item of designationsData) {
      const deptResult = await client.query('SELECT id FROM departments WHERE name = $1', [item.dept]);
      if (deptResult.rows.length > 0) {
        const deptId = deptResult.rows[0].id;
        for (const desName of item.designations) {
          await client.query(`
            INSERT INTO designations (department_id, name) 
            VALUES ($1, $2)
            ON CONFLICT (department_id, name) DO NOTHING
          `, [deptId, desName]);
          totalDesignations++;
        }
      }
    }
    console.log(`✓ ${totalDesignations} designations populated`);

    // Step 7: Add foreign key columns to vendors
    console.log('Step 7: Adding foreign key columns to vendors table...');
    await client.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS department_id INTEGER,
      ADD COLUMN IF NOT EXISTS designation_id INTEGER;
    `);
    console.log('✓ Foreign key columns added');

    // Step 8: Migrate existing data
    console.log('Step 8: Migrating existing vendor data...');
    
    // Migrate departments
    const deptResult = await client.query(`
      UPDATE vendors v
      SET department_id = d.id
      FROM departments d
      WHERE v.department = d.name
      AND v.department IS NOT NULL
      AND v.department_id IS NULL;
    `);
    console.log(`✓ Migrated ${deptResult.rowCount} vendor departments`);

    // Migrate designations
    const desResult = await client.query(`
      UPDATE vendors v
      SET designation_id = des.id
      FROM designations des
      INNER JOIN departments d ON des.department_id = d.id
      WHERE v.designation = des.name
      AND v.department_id = d.id
      AND v.designation IS NOT NULL
      AND v.designation_id IS NULL;
    `);
    console.log(`✓ Migrated ${desResult.rowCount} vendor designations`);

    // Step 9: Add foreign key constraints
    console.log('Step 9: Adding foreign key constraints...');
    
    // Drop existing constraints if they exist
    await client.query(`
      ALTER TABLE vendors DROP CONSTRAINT IF EXISTS fk_vendors_department;
      ALTER TABLE vendors DROP CONSTRAINT IF EXISTS fk_vendors_designation;
    `);

    await client.query(`
      ALTER TABLE vendors
      ADD CONSTRAINT fk_vendors_department 
        FOREIGN KEY (department_id) 
        REFERENCES departments(id) 
        ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE vendors
      ADD CONSTRAINT fk_vendors_designation 
        FOREIGN KEY (designation_id) 
        REFERENCES designations(id) 
        ON DELETE SET NULL;
    `);
    console.log('✓ Foreign key constraints added');

    // Step 10: Create indexes for foreign keys
    console.log('Step 10: Creating indexes for foreign keys...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_department_id ON vendors(department_id);
      CREATE INDEX IF NOT EXISTS idx_vendors_designation_id ON vendors(designation_id);
    `);
    console.log('✓ Indexes created');

    // Step 11: Add comments
    console.log('Step 11: Adding comments...');
    await client.query(`
      COMMENT ON TABLE departments IS 'Department master table';
      COMMENT ON TABLE designations IS 'Designation master table with relationship to departments';
      COMMENT ON COLUMN vendors.department_id IS 'Foreign key to departments table';
      COMMENT ON COLUMN vendors.designation_id IS 'Foreign key to designations table';
      COMMENT ON COLUMN vendors.department IS 'Department of the vendor contact person (legacy column)';
    `);
    console.log('✓ Comments added');

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\nMigration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
