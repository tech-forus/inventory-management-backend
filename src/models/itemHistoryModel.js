const pool = require('./database');
const { logger } = require('../utils/logger');

/**
 * Item History Model
 * Handles fetching complete item history including both incoming and outgoing transactions
 */
class ItemHistoryModel {
  /**
   * Get complete history for a specific SKU (incoming + outgoing transactions)
   * @param {string} skuId - The SKU ID to fetch history for
   * @param {string} companyId - Company ID
   * @param {object} filters - Optional filters (dateFrom, dateTo)
   * @returns {Array} Array of history records with transaction details
   */
  static async getItemHistory(skuId, companyId, filters = {}) {
    try {
      let query = `
        SELECT 
          il.id as transaction_id,
          il.transaction_date,
          il.transaction_type,
          il.reference_number as invoice_number,
          il.source_destination,
          il.created_by_name as created_by,
          il.quantity_change,
          il.net_balance as current_stock,
          il.created_at,
          -- Backward compatibility fields
          il.reference_number as challan_number,
          il.transaction_date as challan_date, 
          CASE 
            WHEN il.quantity_change < 0 THEN -il.quantity_change 
            ELSE il.quantity_change 
          END as total_quantity
        FROM inventory_ledgers il
        JOIN skus s ON il.sku_id = s.id
        WHERE s.sku_id = $1 
          AND il.company_id = $2
      `;

      const params = [skuId, companyId.toUpperCase()];
      let paramIndex = 3;

      // Add date filters if provided
      if (filters.dateFrom) {
        query += ` AND il.transaction_date >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        query += ` AND il.transaction_date <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      // Order by transaction date (most recent first), then by id (for stable sort)
      query += ` ORDER BY il.transaction_date DESC, il.created_at DESC, il.id DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      logger.info(`[ItemHistoryModel] Fetching history for SKU: ${skuId}, Company: ${companyId}`);
      const result = await pool.query(query, params);

      logger.info(`[ItemHistoryModel] Found ${result.rows.length} history records for SKU: ${skuId}`);
      return result.rows;
    } catch (error) {
      logger.error(`[ItemHistoryModel] Error fetching item history for SKU ${skuId}:`, error);
      throw error;
    }
  }
}

module.exports = ItemHistoryModel;
