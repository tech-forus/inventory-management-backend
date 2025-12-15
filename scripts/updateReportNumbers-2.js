/**
 * Script to update existing rejected item report numbers
 * from old format (REJ-XXX-YYY) to new format (REJ/XXX/YYY)
 * 
 * Usage: node scripts/updateReportNumbers.js
 */

const pool = require('../src/models/database');
const { logger } = require('../src/utils/logger');

async function updateReportNumbers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, check what report numbers exist
    const checkResult = await client.query(
      `SELECT id, report_number, original_invoice_number 
       FROM rejected_item_reports 
       WHERE is_active = true
       LIMIT 10`
    );
    
    console.log(`\nSample of existing report numbers:`);
    checkResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Report Number: ${row.report_number}, Invoice: ${row.original_invoice_number}`);
    });
    
    // Get all report numbers in old format (more flexible pattern)
    const result = await client.query(
      `SELECT id, report_number, original_invoice_number 
       FROM rejected_item_reports 
       WHERE report_number LIKE 'REJ-%'
       AND is_active = true`
    );

    console.log(`Found ${result.rows.length} report numbers to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const row of result.rows) {
      try {
        // Skip if already in new format
        if (row.report_number.includes('/')) {
          console.log(`Skipping (already new format): ${row.report_number}`);
          continue;
        }
        
        // Parse the old format: REJ-INV-2025-004-001 or REJ-XXX-YYY
        // Try multiple patterns to handle different formats
        let match = row.report_number.match(/^REJ-(.+)-(\d+)$/);
        
        // If that doesn't work, try splitting by last hyphen
        if (!match) {
          const parts = row.report_number.split('-');
          if (parts.length >= 3 && parts[0] === 'REJ') {
            const sequence = parts[parts.length - 1];
            const invoiceNumber = parts.slice(1, -1).join('-');
            match = ['', invoiceNumber, sequence];
          }
        }
        
        if (match && match.length >= 3) {
          const invoiceNumber = match[1];
          const sequence = match[2];
          
          // Create new format: REJ/INV-2025-004/001
          const newReportNumber = `REJ/${invoiceNumber}/${sequence}`;

          // Check if new report number already exists (shouldn't happen, but safety check)
          const checkResult = await client.query(
            `SELECT id FROM rejected_item_reports 
             WHERE report_number = $1 AND id != $2`,
            [newReportNumber, row.id]
          );

          if (checkResult.rows.length > 0) {
            console.error(`Warning: New report number ${newReportNumber} already exists. Skipping ID ${row.id}`);
            errorCount++;
            continue;
          }

          // Update the report number
          await client.query(
            `UPDATE rejected_item_reports 
             SET report_number = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [newReportNumber, row.id]
          );

          console.log(`Updated: ${row.report_number} → ${newReportNumber}`);
          updatedCount++;
        } else {
          console.error(`Could not parse report number: ${row.report_number}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating report ID ${row.id}:`, error.message);
        errorCount++;
      }
    }

    await client.query('COMMIT');
    
    console.log('\n=== Update Summary ===');
    console.log(`Total found: ${result.rows.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('Update completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating report numbers:', error);
    logger.error({ error: error.message }, 'Error updating report numbers');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateReportNumbers()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

