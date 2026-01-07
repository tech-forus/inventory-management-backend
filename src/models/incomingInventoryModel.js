const pool = require('./database');
const { logger } = require('../utils/logger');

/**
 * Incoming Inventory Model
 * Handles all database operations for incoming inventory
 */
class IncomingInventoryModel {
  /**
   * Create a new incoming inventory transaction with items
   */
  static async create(inventoryData, items, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate total value from items (including GST)
      const totalValue = items.reduce((sum, item) => {
        const quantity = item.totalQuantity || 0;
        const unitPrice = item.unitPrice || 0;
        const gstPercentage = item.gstRate || item.gstPercentage || 0;
        
        // Calculate base value (excl GST)
        const baseValue = quantity * unitPrice;
        // Calculate GST amount
        const gstAmount = baseValue * (gstPercentage / 100);
        // Total value including GST
        const totalInclGst = baseValue + gstAmount;
        
        return sum + (item.totalValueInclGst || item.totalInclGst || totalInclGst);
      }, 0);

      // Insert main incoming inventory record
      const inventoryResult = await client.query(
        `INSERT INTO incoming_inventory (
          company_id, invoice_date, invoice_number, docket_number, transportor_name,
          vendor_id, brand_id, warranty, warranty_unit, receiving_date, received_by, remarks,
          document_type, document_sub_type, vendor_sub_type, delivery_challan_sub_type,
          destination_type, destination_id, status, total_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          companyId.toUpperCase(),
          inventoryData.invoiceDate,
          inventoryData.invoiceNumber,
          inventoryData.docketNumber || null,
          inventoryData.transportorName || null,
          inventoryData.vendorId,
          inventoryData.brandId,
          inventoryData.warranty || 0,
          inventoryData.warrantyUnit || 'months',
          inventoryData.receivingDate,
          inventoryData.receivedBy || null,
          inventoryData.remarks || null,
          inventoryData.documentType || 'bill',
          inventoryData.documentSubType || null,
          inventoryData.vendorSubType || null,
          inventoryData.deliveryChallanSubType || null,
          inventoryData.destinationType || null,
          inventoryData.destinationId || null,
          inventoryData.status || 'draft',
          totalValue,
        ]
      );

      const incomingInventoryId = inventoryResult.rows[0].id;

      // Insert items with GST calculations
      const insertedItems = [];
      for (const item of items) {
        const quantity = item.totalQuantity || 0;
        const unitPrice = item.unitPrice || 0;
        const gstPercentage = item.gstRate || item.gstPercentage || 0;
        
        // Calculate base value (excl GST)
        const totalValueExclGst = quantity * unitPrice;
        // Calculate GST amount
        const gstAmount = totalValueExclGst * (gstPercentage / 100);
        // Total value including GST
        const totalValueInclGst = totalValueExclGst + gstAmount;
        
        const itemResult = await client.query(
          `INSERT INTO incoming_inventory_items (
            incoming_inventory_id, sku_id, received, short,
            total_quantity, unit_price, total_value, 
            gst_percentage, gst_amount, total_value_excl_gst, total_value_incl_gst,
            number_of_boxes, received_boxes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            incomingInventoryId,
            item.skuId,
            item.received || 0,
            item.short || 0,
            quantity,
            unitPrice,
            totalValueInclGst, // total_value stores incl GST for consistency
            gstPercentage,
            gstAmount,
            totalValueExclGst,
            totalValueInclGst,
            item.numberOfBoxes || 0,
            item.receivedBoxes || 0,
          ]
        );
        insertedItems.push(itemResult.rows[0]);

        // Update SKU stock if status is 'completed'
        // IMPORTANT: Only add RECEIVED items to stock, not total quantity
        if (inventoryData.status === 'completed') {
          const receivedQty = item.received || 0;
          if (receivedQty > 0) {
            await client.query(
              'UPDATE skus SET current_stock = current_stock + $1 WHERE id = $2',
              [receivedQty, item.skuId]
            );
            logger.debug({ skuId: item.skuId, stockChange: receivedQty }, `Updated SKU ${item.skuId} stock: +${receivedQty} (received items only)`);
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
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        inventoryData: {
          documentType: inventoryData.documentType,
          documentSubType: inventoryData.documentSubType,
          vendorSubType: inventoryData.vendorSubType,
          deliveryChallanSubType: inventoryData.deliveryChallanSubType,
          destinationType: inventoryData.destinationType,
          destinationId: inventoryData.destinationId,
          vendorId: inventoryData.vendorId,
          brandId: inventoryData.brandId,
        },
        itemsCount: items?.length 
      }, 'Error creating incoming inventory in model');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all incoming inventory records for a company with filters
   */
  static async getAll(companyId, filters = {}) {
    let query = `
      SELECT 
        ii.*,
        v.name as vendor_name,
        b.name as brand_name,
        t.name as received_by_name,
        COALESCE(SUM(iii.total_quantity), 0)::INTEGER as total_quantity_sum,
        COALESCE(SUM(iii.received), 0)::INTEGER as received_sum,
        COALESCE(SUM(iii.short), 0)::INTEGER as short_sum,
        COALESCE(SUM(iii.rejected), 0)::INTEGER as rejected_sum
      FROM incoming_inventory ii
      LEFT JOIN vendors v ON ii.vendor_id = v.id
      LEFT JOIN brands b ON ii.brand_id = b.id
      LEFT JOIN teams t ON ii.received_by = t.id
      LEFT JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
      WHERE ii.company_id = $1 AND ii.is_active = true
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND ii.receiving_date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND ii.receiving_date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.vendor) {
      query += ` AND ii.vendor_id = $${paramIndex}`;
      params.push(filters.vendor);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND ii.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ` GROUP BY 
      ii.id, ii.company_id, ii.invoice_date, ii.invoice_number, ii.docket_number, 
      ii.transportor_name, ii.vendor_id, ii.brand_id, ii.warranty, ii.warranty_unit,
      ii.receiving_date, ii.received_by, ii.remarks, ii.status, ii.total_value, 
      ii.document_type, ii.document_sub_type, ii.vendor_sub_type, ii.delivery_challan_sub_type,
      ii.destination_type, ii.destination_id, ii.is_active, ii.created_at, ii.updated_at, 
      v.name, b.name, t.name 
      ORDER BY ii.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    logger.debug({ query: query.substring(0, 200) + '...', params }, 'Executing query');
    const result = await pool.query(query, params);
    logger.debug({ rowCount: result.rows.length }, 'Query returned rows');
    if (result.rows.length > 0) {
      logger.debug({
        id: result.rows[0].id,
        invoice_number: result.rows[0].invoice_number,
        total_quantity_sum: result.rows[0].total_quantity_sum,
        received_sum: result.rows[0].received_sum,
        short_sum: result.rows[0].short_sum,
        rejected_sum: result.rows[0].rejected_sum,
        total_quantity_sum_type: typeof result.rows[0].total_quantity_sum
      });
    }
    return result.rows;
  }

  /**
   * Get incoming inventory history (for history tab) - grouped by invoice
   */
  static async getHistory(companyId, filters = {}) {
    let query = `
      SELECT 
        ii.id,
        ii.invoice_date,
        ii.invoice_number,
        ii.receiving_date,
        v.name as vendor_name,
        t.name as received_by_name,
        ii.total_value,
        COALESCE(SUM(iii.total_quantity), 0)::INTEGER as total_quantity,
        COALESCE(SUM(iii.received), 0)::INTEGER as received_quantity,
        COALESCE(SUM(iii.short), 0)::INTEGER as total_short,
        COALESCE(SUM(iii.total_value_excl_gst), 0)::DECIMAL(15, 2) as total_value_excl_gst,
        COALESCE(SUM(iii.total_value_incl_gst), 0)::DECIMAL(15, 2) as total_value_incl_gst,
        COALESCE(SUM(iii.gst_amount), 0)::DECIMAL(15, 2) as gst_amount,
        CASE 
          WHEN COALESCE(SUM(iii.short), 0) > 0 THEN 'Pending'
          ELSE 'Complete'
        END as status,
        COUNT(DISTINCT iii.id) as item_count
      FROM incoming_inventory ii
      LEFT JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
      LEFT JOIN vendors v ON ii.vendor_id = v.id
      LEFT JOIN teams t ON ii.received_by = t.id
      WHERE ii.company_id = $1 AND ii.is_active = true AND ii.status = 'completed'
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND ii.receiving_date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND ii.receiving_date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.vendor) {
      query += ` AND ii.vendor_id = $${paramIndex}`;
      params.push(filters.vendor);
      paramIndex++;
    }

    query += ` GROUP BY ii.id, ii.invoice_date, ii.invoice_number, ii.receiving_date, v.name, t.name, ii.total_value`;

    if (filters.sku) {
      // Filter by SKU - need to add HAVING clause or subquery
      query = `
        SELECT DISTINCT
          ii.id,
          ii.invoice_date,
          ii.invoice_number,
          ii.receiving_date,
          v.name as vendor_name,
          t.name as received_by_name,
          ii.total_value,
          COALESCE(SUM(iii.total_quantity), 0)::INTEGER as total_quantity,
          COALESCE(SUM(iii.received), 0)::INTEGER as received_quantity,
          COALESCE(SUM(iii.short), 0)::INTEGER as total_short,
          COALESCE(SUM(iii.total_value_excl_gst), 0)::DECIMAL(15, 2) as total_value_excl_gst,
          COALESCE(SUM(iii.total_value_incl_gst), 0)::DECIMAL(15, 2) as total_value_incl_gst,
          COALESCE(SUM(iii.gst_amount), 0)::DECIMAL(15, 2) as gst_amount,
          CASE 
            WHEN COALESCE(SUM(iii.short), 0) > 0 THEN 'Pending'
            ELSE 'Complete'
          END as status,
          COUNT(DISTINCT iii.id) as item_count
        FROM incoming_inventory ii
        LEFT JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        LEFT JOIN vendors v ON ii.vendor_id = v.id
        LEFT JOIN teams t ON ii.received_by = t.id
        LEFT JOIN skus s ON iii.sku_id = s.id
        WHERE ii.company_id = $1 AND ii.is_active = true AND ii.status = 'completed'
          AND (s.sku_id ILIKE $${paramIndex} OR s.item_name ILIKE $${paramIndex})
      `;
      const skuSearch = `%${filters.sku}%`;
      params.push(skuSearch);
      paramIndex++;
      query += ` GROUP BY ii.id, ii.invoice_date, ii.invoice_number, ii.receiving_date, v.name, t.name, ii.total_value`;
    }

    query += ` ORDER BY ii.receiving_date DESC, ii.id DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get items for a specific incoming inventory record
   */
  static async getItemsByInventoryId(inventoryId, companyId) {
    const result = await pool.query(
      `SELECT 
        iii.id as item_id,
        iii.sku_id,
        s.sku_id as sku_code,
        s.item_name,
        iii.received,
        iii.short,
        iii.rejected,
        iii.total_quantity,
        iii.challan_number,
        iii.challan_date,
        iii.unit_price,
        iii.total_value
      FROM incoming_inventory_items iii
      LEFT JOIN skus s ON iii.sku_id = s.id
      INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      WHERE iii.incoming_inventory_id = $1 AND ii.company_id = $2 AND ii.is_active = true
      ORDER BY iii.id`,
      [inventoryId, companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get incoming inventory by ID with items
   */
  static async getById(id, companyId) {
    const inventoryResult = await pool.query(
      `SELECT 
        ii.*,
        v.name as vendor_name,
        b.name as brand_name,
        t.name as received_by_name
      FROM incoming_inventory ii
      LEFT JOIN vendors v ON ii.vendor_id = v.id
      LEFT JOIN brands b ON ii.brand_id = b.id
      LEFT JOIN teams t ON ii.received_by = t.id
      WHERE ii.id = $1 AND ii.company_id = $2 AND ii.is_active = true`,
      [id, companyId.toUpperCase()]
    );

    if (inventoryResult.rows.length === 0) {
      return null;
    }

    const itemsResult = await pool.query(
      `SELECT 
        iii.*,
        s.sku_id,
        s.item_name
      FROM incoming_inventory_items iii
      LEFT JOIN skus s ON iii.sku_id = s.id
      WHERE iii.incoming_inventory_id = $1
      ORDER BY iii.id`,
      [id]
    );

    return {
      ...inventoryResult.rows[0],
      items: itemsResult.rows,
    };
  }

  /**
   * Update incoming inventory status (e.g., from draft to completed)
   */
  static async updateStatus(id, status, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current record
      const currentResult = await client.query(
        'SELECT status FROM incoming_inventory WHERE id = $1 AND company_id = $2',
        [id, companyId.toUpperCase()]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Incoming inventory record not found');
      }

      const currentStatus = currentResult.rows[0].status;

      // Update status
      const updateResult = await client.query(
        'UPDATE incoming_inventory SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 RETURNING *',
        [status, id, companyId.toUpperCase()]
      );

      // If changing from draft to completed, update SKU stock
      // IMPORTANT: Only add RECEIVED items to stock, not total quantity
      if (currentStatus === 'draft' && status === 'completed') {
        const itemsResult = await client.query(
          'SELECT sku_id, received FROM incoming_inventory_items WHERE incoming_inventory_id = $1',
          [id]
        );

        for (const item of itemsResult.rows) {
          const receivedQty = item.received || 0;
          if (receivedQty > 0) {
            await client.query(
              'UPDATE skus SET current_stock = current_stock + $1 WHERE id = $2',
              [receivedQty, item.sku_id]
            );
            logger.debug({ skuId: item.sku_id, stockChange: receivedQty }, `Updated SKU ${item.sku_id} stock: +${receivedQty} (received items only)`);
          }
        }
      }

      // If changing from completed to draft, reverse SKU stock
      // IMPORTANT: Only reverse RECEIVED items from stock, not total quantity
      if (currentStatus === 'completed' && status === 'draft') {
        const itemsResult = await client.query(
          'SELECT sku_id, received FROM incoming_inventory_items WHERE incoming_inventory_id = $1',
          [id]
        );

        for (const item of itemsResult.rows) {
          const receivedQty = item.received || 0;
          if (receivedQty > 0) {
            await client.query(
              'UPDATE skus SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
              [receivedQty, item.sku_id]
            );
            logger.debug({ skuId: `Reversed SKU ${item.sku_id} stock: -${receivedQty} (received items only)` }, `Reversed SKU ${item.sku_id} stock: -${receivedQty} (received items only)`);
          }
        }
      }

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Move received quantity to rejected (defective items)
   * IMPORTANT: Only updates rejected, does NOT modify received (received is fixed)
   * Reduces current stock by the moved quantity
   */
  static async moveReceivedToRejected(inventoryId, itemId, quantity, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the incoming inventory record belongs to the company
      const inventoryResult = await client.query(
        'SELECT id, status FROM incoming_inventory WHERE id = $1 AND company_id = $2 AND is_active = true',
        [inventoryId, companyId.toUpperCase()]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error('Incoming inventory record not found');
      }

      // Get current item values
      const itemResult = await client.query(
        'SELECT sku_id, received, short, rejected, total_quantity FROM incoming_inventory_items WHERE id = $1 AND incoming_inventory_id = $2',
        [itemId, inventoryId]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Incoming inventory item not found');
      }

      const currentItem = itemResult.rows[0];
      const receivedQty = currentItem.received || 0;
      const currentRejected = currentItem.rejected || 0;
      const availableQty = receivedQty - currentRejected; // Available = received - rejected

      if (availableQty <= 0) {
        throw new Error('No available quantity to move to rejected');
      }

      // Validate quantity
      const moveQty = quantity !== undefined ? parseInt(quantity, 10) : availableQty;
      if (moveQty <= 0) {
        throw new Error('Quantity to move must be greater than 0');
      }
      if (moveQty > availableQty) {
        throw new Error(`Cannot move ${moveQty} to rejected. Only ${availableQty} available (received: ${receivedQty} - rejected: ${currentRejected}).`);
      }

      // Only update rejected (received remains fixed)
      const newRejected = currentRejected + moveQty;

      // Update the item - ONLY rejected changes
      await client.query(
        `UPDATE incoming_inventory_items 
         SET rejected = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND incoming_inventory_id = $3`,
        [newRejected, itemId, inventoryId]
      );

      // Reduce stock by the quantity moved to rejected (rejected items are not in stock)
      await client.query(
        'UPDATE skus SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
        [moveQty, currentItem.sku_id]
      );

      logger.debug({ itemId, skuId: currentItem.sku_id, moveQty }, `Moved ${moveQty} to rejected for item ${itemId}, reduced stock by ${moveQty}`);

      await client.query('COMMIT');

      // Get updated item
      const updatedItemResult = await client.query(
        'SELECT * FROM incoming_inventory_items WHERE id = $1',
        [itemId]
      );

      return updatedItemResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Move short quantity to rejected
   * IMPORTANT: Only updates rejected, does NOT modify short (short is editable but not auto-adjusted here)
   * Note: Short items were never in stock, so moving to rejected doesn't change stock
   * This function is kept for backward compatibility but should be replaced with direct rejected update
   */
  static async moveShortToRejected(inventoryId, itemId, quantity, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the incoming inventory record belongs to the company
      const inventoryResult = await client.query(
        'SELECT id, status FROM incoming_inventory WHERE id = $1 AND company_id = $2 AND is_active = true',
        [inventoryId, companyId.toUpperCase()]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error('Incoming inventory record not found');
      }

      // Get current item values
      const itemResult = await client.query(
        'SELECT sku_id, received, short, rejected, total_quantity FROM incoming_inventory_items WHERE id = $1 AND incoming_inventory_id = $2',
        [itemId, inventoryId]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Incoming inventory item not found');
      }

      const currentItem = itemResult.rows[0];
      const shortQty = currentItem.short || 0;
      const currentRejected = currentItem.rejected || 0;

      if (shortQty <= 0) {
        throw new Error('No short quantity to move to rejected');
      }

      // Validate quantity
      const moveQty = quantity !== undefined ? parseInt(quantity, 10) : shortQty;
      if (moveQty <= 0) {
        throw new Error('Quantity to move must be greater than 0');
      }
      if (moveQty > shortQty) {
        throw new Error(`Cannot move ${moveQty} to rejected. Only ${shortQty} available in short.`);
      }

      // Only update rejected (short remains unchanged - user should update it separately if needed)
      const newRejected = currentRejected + moveQty;

      // Update the item - ONLY rejected changes
      await client.query(
        `UPDATE incoming_inventory_items 
         SET rejected = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND incoming_inventory_id = $3`,
        [newRejected, itemId, inventoryId]
      );

      // Note: Short items were never in stock, so moving to rejected doesn't change stock
      // Stock adjustment is NOT needed here

      logger.debug({ itemId, skuId: currentItem.sku_id, moveQty }, `Moved ${moveQty} from short to rejected for item ${itemId} (no stock change - short was never in stock)`);

      await client.query('COMMIT');

      // Get updated item
      const updatedItemResult = await client.query(
        'SELECT * FROM incoming_inventory_items WHERE id = $1',
        [itemId]
      );

      return updatedItemResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update short quantity and challan information for an item
   * IMPORTANT: Only updates short and challan fields. Does NOT modify received (received is fixed).
   * Stock behavior: Short changes directly affect stock
   * - When short decreases (items arrive): stock increases
   * - When short increases (items become short): stock decreases
   */
  static async updateShortItem(inventoryId, itemId, updates, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the incoming inventory record belongs to the company
      const inventoryResult = await client.query(
        'SELECT id, status FROM incoming_inventory WHERE id = $1 AND company_id = $2 AND is_active = true',
        [inventoryId, companyId.toUpperCase()]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error('Incoming inventory record not found');
      }

      // Get current item values
      const itemResult = await client.query(
        'SELECT sku_id, received, short, rejected, total_quantity FROM incoming_inventory_items WHERE id = $1 AND incoming_inventory_id = $2',
        [itemId, inventoryId]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Incoming inventory item not found');
      }

      const currentItem = itemResult.rows[0];
      const oldReceived = currentItem.received || 0;
      const oldShort = currentItem.short || 0;
      const oldRejected = currentItem.rejected || 0;
      const totalQty = currentItem.total_quantity || 0;

      // Only update short if provided (received is FIXED and cannot be changed)
      const newShort = updates.short !== undefined ? parseInt(updates.short, 10) : oldShort;
      const challanNumber = updates.challanNumber !== undefined ? updates.challanNumber : null;
      const challanDate = updates.challanDate !== undefined ? updates.challanDate : null;

      // Validation: short must be non-negative
      if (newShort < 0) {
        throw new Error('Short quantity cannot be negative');
      }

      // Validation: available = received - rejected + (arrived short items) must be >= 0
      // arrived short items = initialShort - currentShort = (totalQuantity - received) - currentShort
      const initialShort = totalQty - oldReceived; // Initial short at creation
      const arrivedShort = Math.max(0, initialShort - newShort); // Items that arrived from short
      const available = oldReceived - oldRejected + arrivedShort;
      if (available < 0) {
        throw new Error(`Invalid quantities: Available (${available}) = Received (${oldReceived}) - Rejected (${oldRejected}) + Arrived Short (${arrivedShort}) cannot be negative`);
      }

      // Update the item - only short and challan fields
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updates.short !== undefined) {
        updateFields.push(`short = $${paramIndex}`);
        updateValues.push(newShort);
        paramIndex++;
      }

      if (challanNumber !== null) {
        updateFields.push(`challan_number = $${paramIndex}`);
        updateValues.push(challanNumber);
        paramIndex++;
      }

      if (challanDate !== null) {
        updateFields.push(`challan_date = $${paramIndex}`);
        updateValues.push(challanDate);
        paramIndex++;
      }

      // If nothing to update, return early
      if (updateFields.length === 0) {
        await client.query('COMMIT');
        return currentItem;
      }

      // Always update the timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(itemId, inventoryId);

      await client.query(
        `UPDATE incoming_inventory_items 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex} AND incoming_inventory_id = $${paramIndex + 1}`,
        updateValues
      );

      // Stock behavior: Short changes directly affect stock
      // When short decreases (items arrive): stock increases
      // When short increases (items become short): stock decreases
      const shortDiff = newShort - oldShort;
      if (shortDiff !== 0) {
        // shortDiff is negative when short decreases (items arrived), so we subtract (which adds to stock)
        // shortDiff is positive when short increases (items become short), so we subtract (which removes from stock)
        await client.query(
          'UPDATE skus SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
          [-shortDiff, currentItem.sku_id]
        );
        logger.debug({ skuId: currentItem.sku_id, stockChange: -shortDiff }, `Updated SKU ${currentItem.sku_id} stock: ${-shortDiff > 0 ? '+' : ''}${-shortDiff} (from short update - short directly affects available stock)`);
      }

      await client.query('COMMIT');

      // Get updated item
      const updatedItemResult = await client.query(
        'SELECT * FROM incoming_inventory_items WHERE id = $1',
        [itemId]
      );

      return updatedItemResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update rejected/short quantities for incoming inventory items
   * IMPORTANT: Only updates the fields provided. Does NOT modify received or auto-calculate anything.
   * Rules:
   * - received is FIXED (never changes)
   * - short is editable (user can change it)
   * - rejected is editable (user can change it)
   * - available = received - rejected - short (calculated, not stored)
   * Stock behavior:
   * - When rejected increases: stock decreases by rejected delta
   * - When short changes: stock does NOT change (short was never in stock)
   */
  static async updateRejectedShort(id, itemId, updates, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the incoming inventory record belongs to the company
      const inventoryResult = await client.query(
        'SELECT id, status FROM incoming_inventory WHERE id = $1 AND company_id = $2 AND is_active = true',
        [id, companyId.toUpperCase()]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error('Incoming inventory record not found');
      }

      // Get current item values
      const itemResult = await client.query(
        'SELECT sku_id, received, short, rejected, total_quantity FROM incoming_inventory_items WHERE id = $1 AND incoming_inventory_id = $2',
        [itemId, id]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Incoming inventory item not found');
      }

      const currentItem = itemResult.rows[0];
      const oldReceived = currentItem.received || 0;
      const oldShort = currentItem.short || 0;
      const oldRejected = currentItem.rejected || 0;
      const totalQty = currentItem.total_quantity || 0;
      
      // Get new values from updates (only what's provided)
      const newRejected = updates.rejected !== undefined ? parseInt(updates.rejected, 10) : oldRejected;
      const newShort = updates.short !== undefined ? parseInt(updates.short, 10) : oldShort;

      // Validation: rejected cannot exceed received
      if (newRejected > oldReceived) {
        throw new Error(`Rejected quantity (${newRejected}) cannot exceed received quantity (${oldReceived})`);
      }

      // Validation: rejected, short must be non-negative
      if (newRejected < 0) {
        throw new Error('Rejected quantity cannot be negative');
      }
      if (newShort < 0) {
        throw new Error('Short quantity cannot be negative');
      }

      // Validation: available = received - rejected + (arrived short items) must be >= 0
      // arrived short items = initialShort - currentShort = (totalQuantity - received) - currentShort
      const initialShort = totalQty - oldReceived; // Initial short at creation
      const arrivedShort = Math.max(0, initialShort - newShort); // Items that arrived from short
      const available = oldReceived - newRejected + arrivedShort;
      if (available < 0) {
        throw new Error(`Invalid quantities: Available (${available}) = Received (${oldReceived}) - Rejected (${newRejected}) + Arrived Short (${arrivedShort}) cannot be negative`);
      }

      // Update the item with only the fields provided (no auto-calculation)
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updates.rejected !== undefined) {
        updateFields.push(`rejected = $${paramIndex}`);
        updateValues.push(newRejected);
        paramIndex++;
      }

      if (updates.short !== undefined) {
        updateFields.push(`short = $${paramIndex}`);
        updateValues.push(newShort);
        paramIndex++;
      }

      // If nothing to update, return early
      if (updateFields.length === 0) {
        await client.query('COMMIT');
        return currentItem;
      }

      // Always update the timestamp to track changes
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(itemId, id);

      await client.query(
        `UPDATE incoming_inventory_items 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex} AND incoming_inventory_id = $${paramIndex + 1}`,
        updateValues
      );

      // Stock adjustment:
      // When rejected increases: stock decreases
      // When rejected decreases: stock increases
      // When short decreases: stock increases (short items arrived, add to stock)
      // When short increases: stock decreases (items moved to short, remove from stock)
      const rejectedDiff = newRejected - oldRejected;
      const shortDiff = newShort - oldShort;
      
      // Rejected changes affect stock
      if (rejectedDiff !== 0) {
        await client.query(
          'UPDATE skus SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
          [rejectedDiff, currentItem.sku_id]
        );
        logger.debug({ skuId: currentItem.sku_id, stockChange: -rejectedDiff }, `Updated SKU ${currentItem.sku_id} stock: ${rejectedDiff > 0 ? '-' : '+'}${Math.abs(rejectedDiff)} (from rejected update)`);
      }
      
      // Short changes directly affect stock (short value directly updates available stock)
      // When short decreases (items arrive): stock increases
      // When short increases (items become short): stock decreases
      if (shortDiff !== 0) {
        // shortDiff is negative when short decreases (items arrived), so we subtract (which adds to stock)
        // shortDiff is positive when short increases (items become short), so we subtract (which removes from stock)
        await client.query(
          'UPDATE skus SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
          [-shortDiff, currentItem.sku_id]
        );
        logger.debug({ skuId: currentItem.sku_id, stockChange: -shortDiff }, `Updated SKU ${currentItem.sku_id} stock: ${-shortDiff > 0 ? '+' : ''}${-shortDiff} (from short update - short directly affects available stock)`);
      }

      // Optionally update invoice/challan number and date if provided
      if (updates.invoiceNumber || updates.invoiceDate) {
        const invoiceUpdateFields = [];
        const invoiceUpdateValues = [];
        let invoiceParamIndex = 1;

        if (updates.invoiceNumber) {
          invoiceUpdateFields.push(`invoice_number = $${invoiceParamIndex}`);
          invoiceUpdateValues.push(updates.invoiceNumber);
          invoiceParamIndex++;
        }

        if (updates.invoiceDate) {
          invoiceUpdateFields.push(`invoice_date = $${invoiceParamIndex}`);
          invoiceUpdateValues.push(updates.invoiceDate);
          invoiceParamIndex++;
        }

        if (invoiceUpdateFields.length > 0) {
          invoiceUpdateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          invoiceUpdateValues.push(id, companyId.toUpperCase());
          const whereClause = `WHERE id = $${invoiceParamIndex} AND company_id = $${invoiceParamIndex + 1}`;
          await client.query(
            `UPDATE incoming_inventory SET ${invoiceUpdateFields.join(', ')} ${whereClause}`,
            invoiceUpdateValues
          );
        }
      }

      await client.query('COMMIT');

      // Get updated item
      const updatedItemResult = await client.query(
        'SELECT * FROM incoming_inventory_items WHERE id = $1',
        [itemId]
      );

      return updatedItemResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update rejected and short quantities at record level
   * IMPORTANT: This function is DEPRECATED and should not be used.
   * It violates the new rules where received is fixed and quantities should be updated per item.
   * This function is kept for backward compatibility but will be removed in future versions.
   * Use updateRejectedShort for individual item updates instead.
   */
  static async updateRecordLevelRejectedShort(inventoryId, rejected, short, companyId) {
    throw new Error('updateRecordLevelRejectedShort is deprecated. Use updateRejectedShort for individual item updates instead. Received quantity cannot be modified after creation.');
  }

  /**
   * Soft delete incoming inventory
   */
  static async delete(id, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get items to reverse stock if status is completed
      const inventoryResult = await client.query(
        'SELECT status FROM incoming_inventory WHERE id = $1 AND company_id = $2',
        [id, companyId.toUpperCase()]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error('Incoming inventory record not found');
      }

      if (inventoryResult.rows[0].status === 'completed') {
        const itemsResult = await client.query(
          'SELECT sku_id, received FROM incoming_inventory_items WHERE incoming_inventory_id = $1',
          [id]
        );

        // IMPORTANT: Only reverse RECEIVED items from stock, not total quantity
        for (const item of itemsResult.rows) {
          const receivedQty = item.received || 0;
          if (receivedQty > 0) {
            await client.query(
              'UPDATE skus SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
              [receivedQty, item.sku_id]
            );
            logger.debug({ skuId: item.sku_id, stockChange: -receivedQty }, `Reversed SKU ${item.sku_id} stock on delete: -${receivedQty} (received items only)`);
          }
        }
      }

      // Soft delete
      const result = await client.query(
        'UPDATE incoming_inventory SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all rejected items across all incoming inventory records
   */
  static async getRejectedItems(companyId, filters = {}) {
    let query = `
      SELECT 
        iii.id as item_id,
        iii.incoming_inventory_id,
        iii.sku_id,
        iii.total_quantity,
        iii.received,
        iii.rejected,
        iii.short,
        iii.challan_number,
        iii.challan_date,
        iii.updated_at as item_updated_at,
        ii.invoice_number,
        ii.invoice_date,
        ii.receiving_date,
        ii.status,
        v.name as vendor_name,
        v.id as vendor_id,
        b.name as brand_name,
        b.id as brand_id,
        s.code as sku_code,
        s.name as sku_name,
        s.product_category,
        s.item_category,
        s.sub_category
      FROM incoming_inventory_items iii
      INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      LEFT JOIN vendors v ON ii.vendor_id = v.id
      LEFT JOIN brands b ON ii.brand_id = b.id
      LEFT JOIN skus s ON iii.sku_id = s.id
      WHERE ii.company_id = $1 
        AND ii.is_active = true 
        AND iii.rejected > 0
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND ii.receiving_date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND ii.receiving_date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.vendor) {
      query += ` AND ii.vendor_id = $${paramIndex}`;
      params.push(filters.vendor);
      paramIndex++;
    }

    if (filters.brand) {
      query += ` AND ii.brand_id = $${paramIndex}`;
      params.push(filters.brand);
      paramIndex++;
    }

    if (filters.sku) {
      query += ` AND s.code ILIKE $${paramIndex}`;
      params.push(`%${filters.sku}%`);
      paramIndex++;
    }

    query += ` ORDER BY iii.updated_at DESC, ii.receiving_date DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = IncomingInventoryModel;


