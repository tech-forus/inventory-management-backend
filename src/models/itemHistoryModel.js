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
        SELECT * FROM (
          -- Incoming transactions
          SELECT 
            iii.id as item_id,
            iii.incoming_inventory_id as transaction_id,
            'incoming' as transaction_type,
            ii.invoice_number,
            ii.invoice_date,
            ii.receiving_date as transaction_date,
            s.item_name,
            s.sku_id,
            s.sku_id as sku_code,
            iii.total_quantity,
            iii.received,
            iii.rejected,
            iii.short,
            v.name as source_destination,
            iii.challan_number,
            iii.challan_date,
            iii.updated_at,
            iii.created_at,
            s.current_stock as current_stock
          FROM incoming_inventory_items iii
          JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
          JOIN skus s ON iii.sku_id = s.id
          LEFT JOIN vendors v ON ii.vendor_id = v.id
          WHERE s.sku_id = $1 
            AND ii.company_id = $2 
            AND ii.is_active = true
            AND ii.status = 'completed'
          
          UNION ALL
          
          -- Outgoing transactions
          SELECT
            oii.id as item_id,
            oii.outgoing_inventory_id as transaction_id,
            'outgoing' as transaction_type,
            NULL as invoice_number,
            NULL as invoice_date,
            oi.shipping_date as transaction_date,
            s.item_name,
            s.sku_id,
            s.sku_id as sku_code,
            oii.quantity as total_quantity,
            oii.quantity as received,
            0 as rejected,
            0 as short,
            COALESCE(c.customer_name, oi.destination_name) as source_destination,
            NULL as challan_number,
            NULL as challan_date,
            oii.updated_at,
            oii.created_at,
            s.current_stock as current_stock
          FROM outgoing_inventory_items oii
          JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id
          JOIN skus s ON oii.sku_id = s.id
          LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
          WHERE s.sku_id = $1 
            AND oi.company_id = $2
            AND oi.is_active = true
            AND oi.status = 'completed'
        ) combined_history
        WHERE 1=1
      `;

      const params = [skuId, companyId.toUpperCase()];
      let paramIndex = 3;

      // Add date filters if provided
      if (filters.dateFrom) {
        query += ` AND transaction_date >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        query += ` AND transaction_date <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      // Order by transaction date (most recent first), then by updated_at
      query += ` ORDER BY transaction_date DESC, updated_at DESC, created_at DESC`;

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
