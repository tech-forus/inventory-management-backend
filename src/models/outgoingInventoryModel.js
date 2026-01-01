const pool = require('./database');
const { logger } = require('../utils/logger');

/**
 * Outgoing Inventory Model
 * Handles all database operations for outgoing inventory
 */
class OutgoingInventoryModel {
  /**
   * Create a new outgoing inventory transaction with items
   */
  static async create(inventoryData, items, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate total value from items (including GST)
      const totalValue = items.reduce((sum, item) => {
        const quantity = item.outgoingQuantity || 0;
        const unitPrice = item.unitPrice || 0;
        const gstPercentage = item.gstPercentage || item.gstRate || 0;
        
        // Calculate base value (excl GST)
        const baseValue = quantity * unitPrice;
        // Calculate GST amount
        const gstAmount = baseValue * (gstPercentage / 100);
        // Total value including GST
        const totalInclGst = baseValue + gstAmount;
        
        return sum + (item.totalValueInclGst || item.totalInclGst || totalInclGst);
      }, 0);

      // Insert main outgoing inventory record
      const inventoryResult = await client.query(
        `INSERT INTO outgoing_inventory (
          company_id, document_type, document_sub_type, vendor_sub_type, delivery_challan_sub_type,
          invoice_challan_date, invoice_challan_number, docket_number, transportor_name,
          destination_type, destination_id, dispatched_by, remarks, status, total_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          companyId.toUpperCase(),
          inventoryData.documentType,
          inventoryData.documentSubType || null,
          inventoryData.vendorSubType || null,
          inventoryData.deliveryChallanSubType || null,
          inventoryData.invoiceChallanDate,
          inventoryData.invoiceChallanNumber || null,
          inventoryData.docketNumber || null,
          inventoryData.transportorName || null,
          inventoryData.destinationType,
          inventoryData.destinationId || null,
          inventoryData.dispatchedBy || null,
          inventoryData.remarks || null,
          inventoryData.status || 'draft',
          totalValue,
        ]
      );

      const outgoingInventoryId = inventoryResult.rows[0].id;

      // Check if this is the rejected quantity case (Delivery Challan > Replacement > To Vendor)
      const isRejectedCase = (
        inventoryData.documentType === 'delivery_challan' &&
        inventoryData.documentSubType === 'replacement' &&
        inventoryData.deliveryChallanSubType === 'to_vendor'
      );

      // Insert items with GST calculations
      const insertedItems = [];
      for (const item of items) {
        const quantity = item.outgoingQuantity || 0;
        const unitPrice = item.unitPrice || 0;
        const gstPercentage = item.gstPercentage || item.gstRate || 0;
        const outgoingQty = quantity;
        const rejectedQty = isRejectedCase ? outgoingQty : 0;
        
        // Calculate base value (excl GST)
        const totalValueExclGst = quantity * unitPrice;
        // Calculate GST amount
        const gstAmount = totalValueExclGst * (gstPercentage / 100);
        // Total value including GST
        const totalValueInclGst = totalValueExclGst + gstAmount;

        const itemResult = await client.query(
          `INSERT INTO outgoing_inventory_items (
            outgoing_inventory_id, sku_id, outgoing_quantity, rejected_quantity,
            unit_price, total_value,
            gst_percentage, gst_amount, total_value_excl_gst, total_value_incl_gst
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            outgoingInventoryId,
            item.skuId,
            outgoingQty,
            rejectedQty,
            unitPrice,
            totalValueInclGst, // total_value stores incl GST for consistency
            gstPercentage,
            gstAmount,
            totalValueExclGst,
            totalValueInclGst,
          ]
        );
        insertedItems.push(itemResult.rows[0]);

        // Update SKU stock if status is 'completed'
        // IMPORTANT: Reduce stock for outgoing items, except for rejected quantity case
        if (inventoryData.status === 'completed' && !isRejectedCase) {
          if (outgoingQty > 0) {
            // Verify stock availability before updating
            const skuCheck = await client.query(
              'SELECT current_stock FROM skus WHERE id = $1',
              [item.skuId]
            );
            
            if (skuCheck.rows.length === 0) {
              throw new Error(`SKU ${item.skuId} not found`);
            }

            const currentStock = skuCheck.rows[0].current_stock;
            if (currentStock < outgoingQty) {
              throw new Error(`Insufficient stock for SKU ${item.skuId}. Available: ${currentStock}, Required: ${outgoingQty}`);
            }

            await client.query(
              'UPDATE skus SET current_stock = current_stock - $1 WHERE id = $2',
              [outgoingQty, item.skuId]
            );
            logger.debug({ skuId: item.skuId, stockChange: -outgoingQty }, `Updated SKU ${item.skuId} stock: -${outgoingQty}`);
          }
        }
      }

      await client.query('COMMIT');
      return {
        ...inventoryResult.rows[0],
        items: insertedItems,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all outgoing inventory records for a company with filters
   */
  static async getAll(companyId, filters = {}) {
    let query = `
      SELECT 
        oi.*,
        c.customer_name as customer_name,
        c.company_name as customer_company_name,
        v.name as vendor_name,
        t.name as dispatched_by_name,
        COALESCE(SUM(oii.outgoing_quantity), 0)::INTEGER as total_quantity_sum,
        COALESCE(SUM(oii.total_value), 0)::DECIMAL as total_value_sum
      FROM outgoing_inventory oi
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'
      LEFT JOIN teams t ON oi.dispatched_by = t.id
      LEFT JOIN outgoing_inventory_items oii ON oi.id = oii.outgoing_inventory_id
      WHERE oi.company_id = $1 AND oi.is_active = true
    `;

    const queryParams = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND oi.invoice_challan_date >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND oi.invoice_challan_date <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.destination) {
      query += ` AND (c.customer_name ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.destination}%`);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND oi.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    query += ` GROUP BY oi.id, c.customer_name, c.company_name, v.name, t.name
               ORDER BY oi.invoice_challan_date DESC, oi.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      queryParams.push(filters.offset);
    }

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  /**
   * Get outgoing inventory by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      `SELECT 
        oi.*,
        c.customer_name as customer_name,
        c.company_name as customer_company_name,
        v.name as vendor_name,
        t.name as dispatched_by_name
      FROM outgoing_inventory oi
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'
      LEFT JOIN teams t ON oi.dispatched_by = t.id
      WHERE oi.id = $1 AND oi.company_id = $2 AND oi.is_active = true`,
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Get items for an outgoing inventory record
   */
  static async getItems(outgoingInventoryId) {
    const result = await pool.query(
      `SELECT 
        oii.*,
        s.sku_id as sku_code,
        s.item_name
      FROM outgoing_inventory_items oii
      JOIN skus s ON oii.sku_id = s.id
      WHERE oii.outgoing_inventory_id = $1
      ORDER BY oii.id`,
      [outgoingInventoryId]
    );
    return result.rows;
  }

  /**
   * Get outgoing inventory history (for history tab) - returns item-level data
   */
  static async getHistory(companyId, filters = {}) {
    let query = `
      SELECT 
        oii.id,
        oi.id as record_id,
        oi.invoice_challan_date as date,
        COALESCE(oi.invoice_challan_number, oi.docket_number) as document_number,
        oi.document_type,
        oi.document_sub_type,
        oi.vendor_sub_type,
        oi.delivery_challan_sub_type,
        COALESCE(c.customer_name, v.name, 'Store to Factory') as destination,
        s.sku_id as sku,
        oii.outgoing_quantity as quantity,
        oii.total_value as value,
        oii.total_value_excl_gst,
        oii.total_value_incl_gst,
        oii.gst_percentage,
        oii.gst_amount,
        oi.status,
        oi.created_at
      FROM outgoing_inventory oi
      INNER JOIN outgoing_inventory_items oii ON oi.id = oii.outgoing_inventory_id
      LEFT JOIN skus s ON oii.sku_id = s.id
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'
      WHERE oi.company_id = $1 AND oi.is_active = true AND oi.status = 'completed'
    `;

    const queryParams = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND oi.invoice_challan_date >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND oi.invoice_challan_date <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.destination) {
      query += ` AND (c.customer_name ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.destination}%`);
      paramIndex++;
    }

    if (filters.sku) {
      query += ` AND s.sku_id ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.sku}%`);
      paramIndex++;
    }

    query += ` ORDER BY oi.invoice_challan_date DESC, oi.created_at DESC, oii.id ASC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(filters.limit);
      paramIndex++;
    }

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  /**
   * Delete outgoing inventory (soft delete)
   */
  static async delete(id, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the record to check status and items
      const record = await this.getById(id, companyId);
      if (!record) {
        throw new Error('Outgoing inventory record not found');
      }

      // If status is 'completed', restore stock
      if (record.status === 'completed') {
        const items = await this.getItems(id);
        const isRejectedCase = (
          record.document_type === 'delivery_challan' &&
          record.document_sub_type === 'replacement' &&
          record.delivery_challan_sub_type === 'to_vendor'
        );

        for (const item of items) {
          if (!isRejectedCase && item.outgoing_quantity > 0) {
            await client.query(
              'UPDATE skus SET current_stock = current_stock + $1 WHERE id = $2',
              [item.outgoing_quantity, item.sku_id]
            );
            logger.debug({ skuId: item.sku_id, stockChange: item.outgoing_quantity }, `Restored SKU ${item.sku_id} stock: +${item.outgoing_quantity}`);
          }
        }
      }

      // Soft delete the record
      await client.query(
        'UPDATE outgoing_inventory SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = OutgoingInventoryModel;

