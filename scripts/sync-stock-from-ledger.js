/**
 * Sync Script: Update skus.current_stock from inventory_ledgers.net_balance
 * 
 * This script ensures that skus.current_stock matches the latest ledger net_balance
 * for all SKUs. Run this to fix any discrepancies.
 * 
 * Usage: node scripts/sync-stock-from-ledger.js [companyId]
 */

const pool = require('../src/models/database');
const { logger } = require('../src/utils/logger');

async function syncStockFromLedger(companyId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let query = `
      SELECT 
        s.id as sku_id,
        s.sku_id as sku_code,
        s.current_stock as current_stock_sku,
        COALESCE((
          SELECT net_balance 
          FROM inventory_ledgers il
          WHERE il.sku_id = s.id AND il.company_id = s.company_id
          ORDER BY il.created_at DESC, il.id DESC
          LIMIT 1
        ), 0)::INTEGER as current_stock_ledger,
        s.company_id
      FROM skus s
      WHERE s.is_active = true
    `;

    const params = [];
    if (companyId) {
      query += ` AND s.company_id = $1`;
      params.push(companyId.toUpperCase());
    }

    const result = await client.query(query, params);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of result.rows) {
      const skuId = row.sku_id;
      const skuCode = row.sku_code;
      const currentStockSku = parseInt(row.current_stock_sku || 0, 10);
      const currentStockLedger = parseInt(row.current_stock_ledger || 0, 10);

      if (currentStockSku === currentStockLedger) {
        skipped++;
        continue;
      }

      try {
        await client.query(
          'UPDATE skus SET current_stock = $1 WHERE id = $2',
          [currentStockLedger, skuId]
        );
        synced++;
        logger.info({
          skuId,
          skuCode,
          oldStock: currentStockSku,
          newStock: currentStockLedger,
          companyId: row.company_id
        }, `Synced stock for SKU ${skuCode}`);
      } catch (error) {
        errors++;
        logger.error({
          error: error.message,
          skuId,
          skuCode,
          companyId: row.company_id
        }, `Error syncing stock for SKU ${skuCode}`);
      }
    }

    await client.query('COMMIT');

    logger.info({
      total: result.rows.length,
      synced,
      skipped,
      errors
    }, 'Stock sync completed');

    return {
      total: result.rows.length,
      synced,
      skipped,
      errors
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error: error.message }, 'Error in stock sync');
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  const companyId = process.argv[2] || null;
  syncStockFromLedger(companyId)
    .then((result) => {
      console.log('Sync completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}

module.exports = { syncStockFromLedger };
