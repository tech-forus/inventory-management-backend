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
   * @param {object} filters - Optional filters (dateFrom, dateTo, transactionType, search)
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
          il.created_by as created_by_id,
          il.quantity_change,
          il.net_balance as current_stock,
          il.created_at,
          il.updated_at,
          -- Get rejected and short from incoming_inventory_items for IN transactions
          COALESCE(iii.rejected, 0) as rejected,
          COALESCE(iii.short, 0) as short,
          COALESCE(iii.received, 0) as received,
          -- Get challan info from incoming_inventory_items
          COALESCE(iii.challan_number, '') as challan_number,
          COALESCE(iii.challan_date, NULL) as challan_date,
          -- Get dispatch person name for OUT transactions
          ot.name as dispatch_person_name,
          -- Extract invoice number from reference_number (remove "IN / " or "OUT / " prefix)
          CASE 
            WHEN il.transaction_type = 'IN' THEN REPLACE(il.reference_number, 'IN / ', '')
            WHEN il.transaction_type = 'OUT' THEN REPLACE(REPLACE(il.reference_number, 'OUT / ', ''), 'OUT/', '')
            WHEN il.transaction_type = 'REJ' THEN REPLACE(il.reference_number, 'REJ / ', '')
            ELSE il.reference_number
          END as extracted_invoice_number,
          -- Backward compatibility fields
          il.reference_number as challan_number_ledger,
          il.transaction_date as challan_date_ledger, 
          CASE 
            WHEN il.quantity_change < 0 THEN -il.quantity_change 
            ELSE il.quantity_change 
          END as total_quantity
        FROM inventory_ledgers il
        JOIN skus s ON il.sku_id = s.id
        -- Left join with incoming_inventory to get rejected/short for IN transactions
        LEFT JOIN incoming_inventory ii ON 
          il.transaction_type IN ('IN', 'REJ')
          AND ii.invoice_number = CASE 
            WHEN il.transaction_type = 'IN' THEN REPLACE(il.reference_number, 'IN / ', '')
            WHEN il.transaction_type = 'REJ' THEN REPLACE(il.reference_number, 'REJ / ', '')
            ELSE il.reference_number
          END
          AND ii.company_id = il.company_id
          AND ii.is_active = true
        LEFT JOIN incoming_inventory_items iii ON 
          iii.incoming_inventory_id = ii.id
          AND iii.sku_id = il.sku_id
        -- Left join with outgoing_inventory to get dispatch person for OUT transactions
        LEFT JOIN outgoing_inventory oi ON 
          il.transaction_type = 'OUT'
          AND (
            oi.invoice_challan_number = REPLACE(REPLACE(il.reference_number, 'OUT / ', ''), 'OUT/', '')
            OR oi.docket_number = REPLACE(REPLACE(il.reference_number, 'OUT / ', ''), 'OUT/', '')
          )
          AND oi.company_id = il.company_id
        LEFT JOIN teams ot ON oi.dispatched_by = ot.id
        WHERE s.sku_id = $1 
          AND il.company_id = $2
      `;

      const params = [skuId, companyId.toUpperCase()];
      let paramIndex = 3;

      // Add transaction type filter
      if (filters.transactionType) {
        if (Array.isArray(filters.transactionType) && filters.transactionType.length > 0) {
          const typeMap = {
            'incoming': 'IN',
            'outgoing': 'OUT',
            'opening': 'OPENING',
            'rejected': 'REJ'
          };
          const dbTypes = filters.transactionType.map(t => typeMap[t] || t).filter(Boolean);
          if (dbTypes.length > 0) {
            query += ` AND il.transaction_type = ANY($${paramIndex}::text[])`;
            params.push(dbTypes);
            paramIndex++;
          }
        } else if (typeof filters.transactionType === 'string') {
          const typeMap = {
            'incoming': 'IN',
            'outgoing': 'OUT',
            'opening': 'OPENING',
            'rejected': 'REJ'
          };
          const dbType = typeMap[filters.transactionType] || filters.transactionType;
          query += ` AND il.transaction_type = $${paramIndex}`;
          params.push(dbType);
          paramIndex++;
        }
      }

      // Add search filter (invoice, challan, vendor, destination)
      if (filters.search) {
        query += ` AND (
          il.reference_number ILIKE $${paramIndex}
          OR il.source_destination ILIKE $${paramIndex}
          OR COALESCE(iii.challan_number, '') ILIKE $${paramIndex}
        )`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

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

      // Order by updated_at DESC (most recent first), then created_at DESC, then id DESC
      query += ` ORDER BY COALESCE(il.updated_at, il.created_at) DESC, il.created_at DESC, il.id DESC`;

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

  /**
   * Get summary statistics for a specific SKU
   * @param {string} skuId - The SKU ID
   * @param {string} companyId - Company ID
   * @returns {Object} Summary statistics
   */
  static async getItemHistorySummary(skuId, companyId) {
    try {
      const query = `
        SELECT 
          -- Opening Stock
          COALESCE(SUM(CASE WHEN il.transaction_type = 'OPENING' THEN il.quantity_change ELSE 0 END), 0)::INTEGER as opening_stock,
          -- Total Incoming
          COALESCE(SUM(CASE WHEN il.transaction_type = 'IN' THEN il.quantity_change ELSE 0 END), 0)::INTEGER as total_incoming,
          -- Total Outgoing
          COALESCE(SUM(CASE WHEN il.transaction_type = 'OUT' THEN ABS(il.quantity_change) ELSE 0 END), 0)::INTEGER as total_outgoing,
          -- Current Stock (latest net_balance)
          COALESCE((
            SELECT net_balance 
            FROM inventory_ledgers il2
            JOIN skus s2 ON il2.sku_id = s2.id
            WHERE s2.sku_id = $1 AND il2.company_id = $2
            ORDER BY COALESCE(il2.updated_at, il2.created_at) DESC, il2.created_at DESC, il2.id DESC
            LIMIT 1
          ), 0)::INTEGER as current_stock,
          -- Total Rejected (from incoming_inventory_items)
          COALESCE((
            SELECT SUM(iii.rejected)
            FROM incoming_inventory_items iii
            JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
            JOIN skus s3 ON iii.sku_id = s3.id
            WHERE s3.sku_id = $1 AND ii.company_id = $2 AND ii.is_active = true
          ), 0)::INTEGER as total_rejected,
          -- Total Short (from incoming_inventory_items)
          COALESCE((
            SELECT SUM(iii.short)
            FROM incoming_inventory_items iii
            JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
            JOIN skus s4 ON iii.sku_id = s4.id
            WHERE s4.sku_id = $1 AND ii.company_id = $2 AND ii.is_active = true
          ), 0)::INTEGER as total_short,
          -- Total transaction count
          COUNT(*)::INTEGER as total_transactions
        FROM inventory_ledgers il
        JOIN skus s ON il.sku_id = s.id
        WHERE s.sku_id = $1 AND il.company_id = $2
      `;

      const result = await pool.query(query, [skuId, companyId.toUpperCase()]);
      return result.rows[0];
    } catch (error) {
      logger.error(`[ItemHistoryModel] Error fetching summary for SKU ${skuId}:`, error);
      throw error;
    }
  }
}

module.exports = ItemHistoryModel;
