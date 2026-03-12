/**
 * Backfill expected_closure_date for existing leads
 * that have closure_time but no expected_closure_date
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function backfill() {
  const client = await pool.connect();
  try {
    // Update all leads that have closure_time but no expected_closure_date
    const result = await client.query(`
      UPDATE leads
      SET expected_closure_date = CASE
        WHEN closure_time IN ('immediate', 'immediately') THEN (created_at::date + INTERVAL '1 day')::date
        WHEN closure_time = 'upto_15_days' THEN (created_at::date + INTERVAL '15 days')::date
        WHEN closure_time = 'in_a_month' THEN (created_at::date + INTERVAL '30 days')::date
        WHEN closure_time = 'later' THEN (created_at::date + INTERVAL '90 days')::date
      END
      WHERE closure_time IS NOT NULL
        AND expected_closure_date IS NULL
        AND deleted_at IS NULL
      RETURNING id, closure_time, created_at, expected_closure_date
    `);

    console.log(`✅ Updated ${result.rowCount} leads with expected_closure_date`);
    result.rows.forEach(row => {
      console.log(`  Lead #${row.id}: ${row.closure_time} → ${row.expected_closure_date}`);
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

backfill();
