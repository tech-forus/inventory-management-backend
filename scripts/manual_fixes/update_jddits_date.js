/**
 * Manual Database Fix: Update JDDITS outgoing inventory date
 * 
 * Purpose: Change date from 01/12/2026 (2026-01-12) to 12/01/2026 (2026-12-01)
 * for JDDITS company outgoing inventory records
 */

const { Pool } = require('pg');

// Railway PostgreSQL connection
const dbConfig = {
  host: 'centerbeam.proxy.rlwy.net',
  port: 22395,
  database: 'railway',
  user: 'postgres',
  password: 'lWKfNKluCcjlvvCBpNItDEjMhdqUQMth',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(dbConfig);

async function updateJDDITSDate() {
  const client = await pool.connect();

  try {
    console.log('Connected to database successfully');
    console.log('========================================\n');

    // Start transaction
    await client.query('BEGIN');

    // Step 1: Find the record(s) for verification
    console.log('Step 1: Finding JDDITS records with date 2026-01-12...\n');

    const findQuery = `
      SELECT 
        oi.id,
        oi.invoice_challan_number,
        oi.invoice_challan_date,
        oi.destination_type,
        oi.destination_id,
        CASE 
          WHEN oi.destination_type = 'customer' THEN c.customer_name
          WHEN oi.destination_type = 'vendor' THEN v.vendor_name
          ELSE 'N/A'
        END as destination_name,
        oi.document_type,
        oi.created_at
      FROM outgoing_inventory oi
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'  
      WHERE 
        (
          (oi.destination_type = 'customer' AND c.customer_name ILIKE '%JDDITS%') OR
          (oi.destination_type = 'vendor' AND v.vendor_name ILIKE '%JDDITS%')
        )
        AND oi.invoice_challan_date = '2026-01-12'
      ORDER BY oi.created_at DESC
    `;

    const findResult = await client.query(findQuery);

    if (findResult.rows.length === 0) {
      console.log('❌ No records found matching criteria (JDDITS company with date 2026-01-12)');
      console.log('\nAttempting alternate search (checking all outgoing records with this date)...\n');

      const altQuery = `
        SELECT 
          oi.id,
          oi.invoice_challan_number,
          oi.invoice_challan_date,
          oi.destination_type,
          oi.destination_id,
          CASE 
            WHEN oi.destination_type = 'customer' THEN c.customer_name
            WHEN oi.destination_type = 'vendor' THEN v.vendor_name
            ELSE 'N/A'
          END as destination_name,
          oi.document_type
        FROM outgoing_inventory oi
        LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
        LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'  
        WHERE oi.invoice_challan_date = '2026-01-12'
        ORDER BY oi.created_at DESC
      `;

      const altResult = await client.query(altQuery);
      console.log(`Found ${altResult.rows.length} record(s) with date 2026-01-12:`);
      console.table(altResult.rows);

      await client.query('ROLLBACK');
      return;
    }

    console.log(`✓ Found ${findResult.rows.length} record(s) to update:`);
    console.table(findResult.rows);
    console.log('\n');

    // Step 2: Perform the UPDATE
    console.log('Step 2: Updating date from 2026-01-12 to 2026-12-01...\n');

    const updateQuery = `
      UPDATE outgoing_inventory oi
      SET invoice_challan_date = '2026-12-01'
      WHERE oi.id IN (
        SELECT oi2.id
        FROM outgoing_inventory oi2
        LEFT JOIN customers c ON oi2.destination_id = c.id AND oi2.destination_type = 'customer'
        LEFT JOIN vendors v ON oi2.destination_id = v.id AND oi2.destination_type = 'vendor'
        WHERE 
          (
            (oi2.destination_type = 'customer' AND c.customer_name ILIKE '%JDDITS%') OR
            (oi2.destination_type = 'vendor' AND v.vendor_name ILIKE '%JDDITS%')
          )
          AND oi2.invoice_challan_date = '2026-01-12'
      )
      RETURNING id, invoice_challan_number, invoice_challan_date
    `;

    const updateResult = await client.query(updateQuery);

    console.log(`✓ Successfully updated ${updateResult.rowCount} record(s):`);
    console.table(updateResult.rows);
    console.log('\n');

    // Step 3: Verify the update
    console.log('Step 3: Verifying the update...\n');

    const verifyQuery = `
      SELECT 
        oi.id,
        oi.invoice_challan_number,
        oi.invoice_challan_date,
        oi.destination_type,
        CASE 
          WHEN oi.destination_type = 'customer' THEN c.customer_name
          WHEN oi.destination_type = 'vendor' THEN v.vendor_name
          ELSE 'N/A'
        END as destination_name,
        oi.updated_at
      FROM outgoing_inventory oi
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'  
      WHERE 
        (
          (oi.destination_type = 'customer' AND c.customer_name ILIKE '%JDDITS%') OR
          (oi.destination_type = 'vendor' AND v.vendor_name ILIKE '%JDDITS%')
        )
        AND oi.invoice_challan_date = '2026-12-01'
      ORDER BY oi.updated_at DESC
    `;

    const verifyResult = await client.query(verifyQuery);

    console.log(`✓ Verification complete. Found ${verifyResult.rows.length} record(s) with new date:`);
    console.table(verifyResult.rows);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('✅ Database update completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateJDDITSDate()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
