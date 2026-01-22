const pool = require('./database');
const { logger } = require('../utils/logger');
const LedgerService = require('../services/ledgerService');

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
          destination_type, destination_id, dispatched_by, remarks, status, total_value,
          freight_amount, number_of_boxes, received_boxes, invoice_level_discount, invoice_level_discount_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
          inventoryData.freightAmount || 0,
          inventoryData.numberOfBoxes || 0,
          inventoryData.receivedBoxes || 0,
          inventoryData.invoiceLevelDiscount || 0,
          inventoryData.invoiceLevelDiscountType || 'percentage',
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

        // First, resolve SKU ID string to integer ID
        // item.skuId can be either integer ID or SKU ID string (like "QVSTARYUMBPZW2")
        const isNumericSkuId = /^\d+$/.test(String(item.skuId));
        let skuIntegerId;
        
        if (isNumericSkuId) {
          skuIntegerId = parseInt(item.skuId, 10);
        } else {
          // Look up SKU by SKU ID string to get integer ID
          const skuLookup = await client.query(
            'SELECT id FROM skus WHERE sku_id = $1 AND company_id = $2',
            [item.skuId, companyId.toUpperCase()]
          );
          if (skuLookup.rows.length === 0) {
            throw new Error(`SKU ${item.skuId} not found`);
          }
          skuIntegerId = skuLookup.rows[0].id;
        }

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
            gst_percentage, gst_amount, total_excl_gst, total_incl_gst,
            sku_discount, sku_discount_amount, amount_after_sku_discount,
            invoice_discount_share, final_taxable_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            outgoingInventoryId,
            skuIntegerId, // Use integer ID instead of item.skuId
            outgoingQty,
            rejectedQty,
            unitPrice,
            item.totalInclGst || totalValueInclGst, // total_value stores incl GST for consistency
            gstPercentage,
            item.gstAmount || gstAmount,
            item.totalExclGst || totalValueExclGst,
            item.totalInclGst || totalValueInclGst,
            item.skuDiscount || 0,
            item.skuDiscountAmount || 0,
            item.amountAfterSkuDiscount || totalValueExclGst,
            item.invoiceDiscountShare || 0,
            item.finalTaxableAmount || totalValueExclGst,
          ]
        );
        insertedItems.push(itemResult.rows[0]);

        // Verify stock availability before allowing outgoing (status is 'completed')
        // IMPORTANT: Stock update is now handled by LedgerService (single source of truth)
        // We still need to check availability before creating the ledger entry
        if (inventoryData.status === 'completed' && !isRejectedCase) {
          if (outgoingQty > 0) {
            // Verify stock availability - check latest ledger balance
            const lastBalanceResult = await client.query(
              `SELECT net_balance 
               FROM inventory_ledgers 
               WHERE sku_id = $1 AND company_id = $2
               ORDER BY transaction_date DESC, created_at DESC, id DESC 
               LIMIT 1`,
              [skuIntegerId, companyId.toUpperCase()] // Use integer ID
            );

            let availableStock = 0;
            if (lastBalanceResult.rows.length > 0) {
              availableStock = parseInt(lastBalanceResult.rows[0].net_balance, 10);
            } else {
              // Fallback: check skus.current_stock if no ledger entries exist
              const skuCheck = await client.query(
                'SELECT current_stock FROM skus WHERE id = $1',
                [skuIntegerId] // Use integer ID
              );
              if (skuCheck.rows.length === 0) {
                throw new Error(`SKU ${item.skuId} not found`);
              }
              availableStock = skuCheck.rows[0].current_stock;
            }

            if (availableStock < outgoingQty) {
              throw new Error(`Insufficient stock for SKU ${item.skuId}. Available: ${availableStock}, Required: ${outgoingQty}`);
            }

            logger.debug({ skuId: item.skuId, skuIntegerId, availableStock, outgoingQty }, `Stock check passed for SKU ${item.skuId}, stock will be updated by ledger`);
          }
        }
      }

      // Ledger Logic (Post-Item Loop, Pre-Commit)
      if (inventoryData.status === 'completed' && !isRejectedCase) {
        // Fetch Names
        let teamName = 'System';
        let destName = 'Store to Factory';

        if (inventoryData.dispatchedBy) {
          const teamRes = await client.query('SELECT name FROM teams WHERE id = $1', [inventoryData.dispatchedBy]);
          if (teamRes.rows.length > 0) teamName = teamRes.rows[0].name;
        }

        if (inventoryData.destinationId) {
          if (inventoryData.destinationType === 'customer') {
            const custRes = await client.query('SELECT customer_name FROM customers WHERE id = $1', [inventoryData.destinationId]);
            if (custRes.rows.length > 0) destName = `Customer: ${custRes.rows[0].customer_name}`;
          } else if (inventoryData.destinationType === 'vendor') {
            const vendRes = await client.query('SELECT name FROM vendors WHERE id = $1', [inventoryData.destinationId]);
            if (vendRes.rows.length > 0) destName = `Vendor: ${vendRes.rows[0].name}`;
          }
        }

        // Loop items again? Or use `insertedItems`?
        // Use `insertedItems`.
        for (const item of insertedItems) {
          const qty = item.outgoing_quantity || 0;
          if (qty > 0) {
            await LedgerService.addTransaction(client, {
              skuId: item.sku_id,
              transactionDate: inventoryData.invoiceChallanDate,
              transactionType: 'OUT',
              referenceNumber: `OUT / ${inventoryData.invoiceChallanNumber || inventoryData.docketNumber || 'N/A'}`,
              sourceDestination: destName,
              createdBy: inventoryData.dispatchedBy,
              createdByName: teamName,
              quantityChange: -qty, // Negative for OUT
              companyId: companyId.toUpperCase()
            });
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
        oi.invoice_challan_number,
        oi.docket_number,
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
        oi.created_at,
        ot.name as dispatched_by_name
      FROM outgoing_inventory oi
      INNER JOIN outgoing_inventory_items oii ON oi.id = oii.outgoing_inventory_id
      LEFT JOIN skus s ON oii.sku_id = s.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'
      LEFT JOIN teams ot ON oi.dispatched_by = ot.id
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

    // General search across multiple fields (matching SKU Management search)
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query += ` AND (
        COALESCE(oi.invoice_challan_number, '') ILIKE $${paramIndex}
        OR COALESCE(oi.docket_number, '') ILIKE $${paramIndex}
        OR COALESCE(c.customer_name, '') ILIKE $${paramIndex}
        OR COALESCE(v.name, '') ILIKE $${paramIndex}
        OR COALESCE(ot.name, '') ILIKE $${paramIndex}
        OR COALESCE(s.sku_id, '') ILIKE $${paramIndex}
        OR COALESCE(s.item_name, '') ILIKE $${paramIndex}
        OR COALESCE(s.model, '') ILIKE $${paramIndex}
        OR COALESCE(s.hsn_sac_code, '') ILIKE $${paramIndex}
        OR COALESCE(s.series, '') ILIKE $${paramIndex}
        OR COALESCE(s.rating_size, '') ILIKE $${paramIndex}
        OR COALESCE(s.item_details, '') ILIKE $${paramIndex}
        OR COALESCE(s.vendor_item_code, '') ILIKE $${paramIndex}
        OR COALESCE(b.name, '') ILIKE $${paramIndex}
        OR COALESCE(sc.name, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(searchTerm);
      paramIndex++;
    }

    // Legacy destination filter (keep for backward compatibility)
    if (filters.destination && !filters.search) {
      query += ` AND (c.customer_name ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.destination}%`);
      paramIndex++;
    }

    // Legacy SKU filter (keep for backward compatibility)
    if (filters.sku && !filters.search) {
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
            // Stock update is now handled by LedgerService (single source of truth)
            logger.debug({ skuId: item.sku_id, stockChange: item.outgoing_quantity }, `Restoring SKU ${item.sku_id} stock: +${item.outgoing_quantity}, will be updated by ledger`);

            // Ledger Entry for Deletion
            await LedgerService.addTransaction(client, {
              skuId: item.sku_id,
              transactionDate: new Date(),
              transactionType: 'IN', // Restore stock
              referenceNumber: `VOID / ${record.invoice_challan_number || record.docket_number || 'N/A'}`,
              sourceDestination: 'Transaction Deleted',
              createdBy: record.dispatched_by,
              createdByName: record.dispatched_by_name || 'System',
              quantityChange: item.outgoing_quantity,
              companyId: companyId.toUpperCase()
            });
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

