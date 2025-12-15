const pool = require('./database');
const { logger } = require('../utils/logger');

/**
 * Price History Model
 * Handles all database operations for price history
 */
class PriceHistoryModel {
  /**
   * Update price history when a new incoming inventory is saved
   * This should be called after an incoming inventory is marked as 'completed'
   */
  static async updatePriceHistory(inventoryId, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the incoming inventory with items
      const inventoryResult = await client.query(
        `SELECT 
          ii.id,
          ii.vendor_id,
          ii.invoice_date,
          ii.invoice_number,
          ii.receiving_date,
          v.name as vendor_name
        FROM incoming_inventory ii
        LEFT JOIN vendors v ON ii.vendor_id = v.id
        WHERE ii.id = $1 AND ii.company_id = $2 AND ii.status = 'completed'`,
        [inventoryId, companyId.toUpperCase()]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error('Incoming inventory not found or not completed');
      }

      const inventory = inventoryResult.rows[0];

      // Get all items for this inventory
      const itemsResult = await client.query(
        `SELECT 
          iii.sku_id,
          iii.unit_price
        FROM incoming_inventory_items iii
        WHERE iii.incoming_inventory_id = $1 AND iii.unit_price > 0`,
        [inventoryId]
      );

      const items = itemsResult.rows;

      // Process each item
      for (const item of items) {
        const { sku_id, unit_price } = item;

        // Get current price history for this SKU
        const currentHistory = await client.query(
          `SELECT * FROM price_history 
           WHERE sku_id = $1 AND company_id = $2 AND type = 'current' AND is_active = true
           ORDER BY buying_date DESC, created_at DESC
           LIMIT 1`,
          [sku_id, companyId.toUpperCase()]
        );

        // If there's a current price, move it to previous
        if (currentHistory.rows.length > 0) {
          const oldCurrent = currentHistory.rows[0];
          
          // Deactivate old current
          await client.query(
            `UPDATE price_history 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [oldCurrent.id]
          );

          // Create new previous entry (if it doesn't already exist or is different)
          const existingPrevious = await client.query(
            `SELECT * FROM price_history 
             WHERE sku_id = $1 AND company_id = $2 AND type = 'previous' 
             AND price = $3 AND vendor_id = $4 AND is_active = true
             ORDER BY buying_date DESC
             LIMIT 1`,
            [sku_id, companyId.toUpperCase(), oldCurrent.price, oldCurrent.vendor_id]
          );

          if (existingPrevious.rows.length === 0) {
            await client.query(
              `INSERT INTO price_history 
               (company_id, sku_id, price, vendor_name, vendor_id, buying_date, invoice_number, invoice_id, type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'previous')`,
              [
                companyId.toUpperCase(),
                sku_id,
                oldCurrent.price,
                oldCurrent.vendor_name,
                oldCurrent.vendor_id,
                oldCurrent.buying_date,
                oldCurrent.invoice_number,
                oldCurrent.invoice_id
              ]
            );
          }
        }

        // Create new current entry
        await client.query(
          `INSERT INTO price_history 
           (company_id, sku_id, price, vendor_name, vendor_id, buying_date, invoice_number, invoice_id, type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'current')`,
          [
            companyId.toUpperCase(),
            sku_id,
            unit_price,
            inventory.vendor_name,
            inventory.vendor_id,
            inventory.receiving_date,
            inventory.invoice_number,
            inventoryId
          ]
        );

        // Update lowest price
        const lowestResult = await client.query(
          `SELECT * FROM price_history 
           WHERE sku_id = $1 AND company_id = $2 AND type = 'lowest' AND is_active = true
           ORDER BY price ASC, buying_date DESC
           LIMIT 1`,
          [sku_id, companyId.toUpperCase()]
        );

        if (lowestResult.rows.length === 0 || parseFloat(unit_price) < parseFloat(lowestResult.rows[0].price)) {
          // Deactivate old lowest if exists
          if (lowestResult.rows.length > 0) {
            await client.query(
              `UPDATE price_history 
               SET is_active = false, updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [lowestResult.rows[0].id]
            );
          }

          // Create new lowest entry
          await client.query(
            `INSERT INTO price_history 
             (company_id, sku_id, price, vendor_name, vendor_id, buying_date, invoice_number, invoice_id, type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'lowest')`,
            [
              companyId.toUpperCase(),
              sku_id,
              unit_price,
              inventory.vendor_name,
              inventory.vendor_id,
              inventory.receiving_date,
              inventory.invoice_number,
              inventoryId
            ]
          );
        }
      }

      await client.query('COMMIT');
      logger.debug({ inventoryId, itemCount: items.length }, 'Price history updated successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ inventoryId, error: error.message }, 'Error updating price history');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get price history for a SKU
   */
  static async getPriceHistory(skuId, companyId) {
    const query = `
      SELECT 
        price,
        vendor_name,
        buying_date,
        invoice_number,
        type
      FROM price_history
      WHERE sku_id = $1 
        AND company_id = $2 
        AND is_active = true
      ORDER BY 
        CASE type
          WHEN 'current' THEN 1
          WHEN 'previous' THEN 2
          WHEN 'lowest' THEN 3
        END
    `;

    const result = await pool.query(query, [skuId, companyId.toUpperCase()]);
    
    const history = {
      current: null,
      previous: null,
      lowest: null
    };

    result.rows.forEach(row => {
      if (row.type === 'current') {
        history.current = {
          price: parseFloat(row.price),
          vendorName: row.vendor_name,
          buyingDate: row.buying_date,
          invoiceNumber: row.invoice_number
        };
      } else if (row.type === 'previous') {
        history.previous = {
          price: parseFloat(row.price),
          vendorName: row.vendor_name,
          buyingDate: row.buying_date,
          invoiceNumber: row.invoice_number
        };
      } else if (row.type === 'lowest') {
        history.lowest = {
          price: parseFloat(row.price),
          vendorName: row.vendor_name,
          buyingDate: row.buying_date,
          invoiceNumber: row.invoice_number
        };
      }
    });

    return history;
  }

  /**
   * Check if price history exists for a SKU (to determine if icon should be shown)
   */
  static async hasPriceHistory(skuId, companyId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM price_history 
       WHERE sku_id = $1 AND company_id = $2 AND is_active = true AND type = 'current'`,
      [skuId, companyId.toUpperCase()]
    );

    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = PriceHistoryModel;

