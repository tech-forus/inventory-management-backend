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
    console.log('[OutgoingInventoryModel] create() called:', {
      companyId: companyId,
      companyIdUpper: companyId.toUpperCase(),
      itemsCount: items?.length,
      items: items?.map(item => ({
        skuId: item.skuId,
        skuIdType: typeof item.skuId,
        outgoingQuantity: item.outgoingQuantity
      })),
      status: inventoryData?.status,
      isRejectedCase: inventoryData?.deliveryChallanSubType === 'to_vendor' || inventoryData?.deliveryChallanSubType === 'replacement'
    });

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
        console.log('[OutgoingInventoryModel] Processing item:', {
          skuId: item.skuId,
          skuIdType: typeof item.skuId,
          skuIdValue: String(item.skuId),
          outgoingQuantity: item.outgoingQuantity,
          companyId: companyId.toUpperCase()
        });

        const quantity = item.outgoingQuantity || 0;
        const unitPrice = item.unitPrice || 0;
        const gstPercentage = item.gstPercentage || item.gstRate || 0;
        const outgoingQty = quantity;
        const rejectedQty = isRejectedCase ? outgoingQty : 0;

        // First, resolve SKU ID string to integer ID
        // item.skuId can be either integer ID or SKU ID string (like "QVSTARYUMBPZW2")
        const skuIdString = String(item.skuId);
        const isNumericSkuId = /^\d+$/.test(skuIdString);
        let skuIntegerId;
        
        console.log('[OutgoingInventoryModel] SKU ID resolution:', {
          originalSkuId: item.skuId,
          skuIdString: skuIdString,
          isNumeric: isNumericSkuId,
          companyId: companyId.toUpperCase()
        });
        
        if (isNumericSkuId) {
          skuIntegerId = parseInt(item.skuId, 10);
          console.log('[OutgoingInventoryModel] Using numeric SKU ID directly:', {
            skuIntegerId: skuIntegerId,
            type: typeof skuIntegerId
          });
        } else {
          // Look up SKU by SKU ID string to get integer ID
          console.log('[OutgoingInventoryModel] Looking up SKU by SKU ID string:', {
            skuIdString: skuIdString,
            companyId: companyId.toUpperCase()
          });
          
          const skuLookup = await client.query(
            'SELECT id FROM skus WHERE sku_id = $1 AND company_id = $2',
            [skuIdString, companyId.toUpperCase()]
          );
          
          console.log('[OutgoingInventoryModel] SKU lookup result:', {
            query: 'SELECT id FROM skus WHERE sku_id = $1 AND company_id = $2',
            params: [skuIdString, companyId.toUpperCase()],
            rowsFound: skuLookup.rows.length,
            result: skuLookup.rows
          });
          
          if (skuLookup.rows.length === 0) {
            console.error('[OutgoingInventoryModel] SKU not found:', {
              skuId: skuIdString,
              companyId: companyId.toUpperCase()
            });
            throw new Error(`SKU ${item.skuId} not found`);
          }
          skuIntegerId = skuLookup.rows[0].id;
          console.log('[OutgoingInventoryModel] Resolved SKU ID:', {
            skuIdString: skuIdString,
            skuIntegerId: skuIntegerId,
            type: typeof skuIntegerId
          });
        }

        // Calculate base value (excl GST)
        const totalValueExclGst = quantity * unitPrice;
        // Calculate GST amount
        const gstAmount = totalValueExclGst * (gstPercentage / 100);
        // Total value including GST
        const totalValueInclGst = totalValueExclGst + gstAmount;

        console.log('[OutgoingInventoryModel] Inserting outgoing inventory item:', {
          outgoingInventoryId: outgoingInventoryId,
          skuIntegerId: skuIntegerId,
          skuIntegerIdType: typeof skuIntegerId,
          outgoingQty: outgoingQty,
          rejectedQty: rejectedQty
        });

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
        
        console.log('[OutgoingInventoryModel] Item inserted successfully:', {
          itemId: itemResult.rows[0]?.id,
          skuId: itemResult.rows[0]?.sku_id
        });
        
        insertedItems.push(itemResult.rows[0]);

        // Verify stock availability before allowing outgoing (status is 'completed')
        // IMPORTANT: Stock update is now handled by LedgerService (single source of truth)
        // We still need to check availability before creating the ledger entry
        if (inventoryData.status === 'completed' && !isRejectedCase) {
          if (outgoingQty > 0) {
            console.log('[OutgoingInventoryModel] Checking stock availability:', {
              skuId: item.skuId,
              skuIntegerId: skuIntegerId,
              skuIntegerIdType: typeof skuIntegerId,
              companyId: companyId.toUpperCase(),
              outgoingQty: outgoingQty,
              isRejectedCase: isRejectedCase
            });

            // Verify stock availability - check latest ledger balance
            // Use same ORDER BY as LedgerService and Item History: created_at DESC, id DESC
            // This ensures we get the most recently created transaction, not just the latest transaction_date
            const ledgerQuery = `SELECT net_balance 
               FROM inventory_ledgers 
               WHERE sku_id = $1 AND company_id = $2
               ORDER BY created_at DESC, id DESC 
               LIMIT 1`;
            const ledgerParams = [skuIntegerId, companyId.toUpperCase()];
            
            console.log('[OutgoingInventoryModel] Executing ledger stock check query:', {
              query: ledgerQuery,
              params: ledgerParams,
              paramTypes: ledgerParams.map(p => typeof p)
            });

            const lastBalanceResult = await client.query(ledgerQuery, ledgerParams);

            console.log('[OutgoingInventoryModel] Ledger stock check result:', {
              rowsFound: lastBalanceResult.rows.length,
              result: lastBalanceResult.rows,
              netBalance: lastBalanceResult.rows[0]?.net_balance
            });

            let availableStock = 0;
            if (lastBalanceResult.rows.length > 0) {
              availableStock = parseInt(lastBalanceResult.rows[0].net_balance, 10);
              console.log('[OutgoingInventoryModel] Using ledger balance:', {
                availableStock: availableStock,
                netBalance: lastBalanceResult.rows[0].net_balance
              });
            } else {
              console.log('[OutgoingInventoryModel] No ledger entries found, checking skus.current_stock:', {
                skuIntegerId: skuIntegerId,
                skuIntegerIdType: typeof skuIntegerId
              });

              // Fallback: check skus.current_stock if no ledger entries exist
              const skuCheckQuery = 'SELECT current_stock FROM skus WHERE id = $1';
              const skuCheckParams = [skuIntegerId];
              
              console.log('[OutgoingInventoryModel] Executing SKU stock check query:', {
                query: skuCheckQuery,
                params: skuCheckParams,
                paramTypes: skuCheckParams.map(p => typeof p)
              });

              const skuCheck = await client.query(skuCheckQuery, skuCheckParams);
              
              console.log('[OutgoingInventoryModel] SKU stock check result:', {
                rowsFound: skuCheck.rows.length,
                result: skuCheck.rows,
                currentStock: skuCheck.rows[0]?.current_stock
              });

              if (skuCheck.rows.length === 0) {
                console.error('[OutgoingInventoryModel] SKU not found in skus table:', {
                  skuId: item.skuId,
                  skuIntegerId: skuIntegerId
                });
                throw new Error(`SKU ${item.skuId} not found`);
              }
              availableStock = skuCheck.rows[0].current_stock;
              console.log('[OutgoingInventoryModel] Using skus.current_stock:', {
                availableStock: availableStock
              });
            }

            console.log('[OutgoingInventoryModel] Stock validation:', {
              availableStock: availableStock,
              outgoingQty: outgoingQty,
              isSufficient: availableStock >= outgoingQty
            });

            if (availableStock < outgoingQty) {
              console.error('[OutgoingInventoryModel] Insufficient stock:', {
                skuId: item.skuId,
                skuIntegerId: skuIntegerId,
                availableStock: availableStock,
                outgoingQty: outgoingQty
              });
              throw new Error(`Insufficient stock for SKU ${item.skuId}. Available: ${availableStock}, Required: ${outgoingQty}`);
            }

            console.log('[OutgoingInventoryModel] Stock check passed:', {
              skuId: item.skuId,
              skuIntegerId: skuIntegerId,
              availableStock: availableStock,
              outgoingQty: outgoingQty
            });

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
      console.log('[OutgoingInventoryModel] Transaction committed successfully:', {
        outgoingInventoryId: inventoryResult.rows[0]?.id,
        itemsCount: insertedItems.length
      });
      return {
        ...inventoryResult.rows[0],
        items: insertedItems,
      };
    } catch (error) {
      console.error('[OutgoingInventoryModel] Error in create():', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        internalPosition: error.internalPosition,
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        constraint: error.constraint,
        file: error.file,
        line: error.line,
        routine: error.routine
      });
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

    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim().replace(/\s+/g, '');
      query += ` AND (
        REPLACE(COALESCE(oi.invoice_challan_number, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(oi.docket_number, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(c.customer_name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(c.company_name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(v.name, ''), ' ', '') ILIKE $${paramIndex}
        OR oi.id IN (
          SELECT oii2.outgoing_inventory_id FROM outgoing_inventory_items oii2
          JOIN skus s2 ON oii2.sku_id = s2.id
          WHERE REPLACE(COALESCE(s2.sku_id, ''), ' ', '') ILIKE $${paramIndex}
          OR REPLACE(COALESCE(s2.item_name, ''), ' ', '') ILIKE $${paramIndex}
        )
      )`;
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    } else if (filters.destination) {
      const destSearch = filters.destination.trim().replace(/\s+/g, '');
      query += ` AND (REPLACE(COALESCE(c.customer_name, ''), ' ', '') ILIKE $${paramIndex} OR REPLACE(COALESCE(v.name, ''), ' ', '') ILIKE $${paramIndex})`;
      queryParams.push(`%${destSearch}%`);
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
      const searchTerm = filters.search.trim().replace(/\s+/g, '');
      query += ` AND (
        REPLACE(COALESCE(oi.invoice_challan_number, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(oi.docket_number, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(c.customer_name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(v.name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(ot.name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.sku_id, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.item_name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.model, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.hsn_sac_code, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.series, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.rating_size, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.item_details, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.vendor_item_code, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(b.name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(sc.name, ''), ' ', '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    // Legacy destination filter (keep for backward compatibility)
    if (filters.destination && !filters.search) {
      const destSearch = filters.destination.trim().replace(/\s+/g, '');
      query += ` AND (REPLACE(COALESCE(c.customer_name, ''), ' ', '') ILIKE $${paramIndex} OR REPLACE(COALESCE(v.name, ''), ' ', '') ILIKE $${paramIndex})`;
      queryParams.push(`%${destSearch}%`);
      paramIndex++;
    }

    // Legacy SKU filter (keep for backward compatibility)
    if (filters.sku && !filters.search) {
      const skuSearch = filters.sku.trim().replace(/\s+/g, '');
      query += ` AND REPLACE(s.sku_id, ' ', '') ILIKE $${paramIndex}`;
      queryParams.push(`%${skuSearch}%`);
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
   * Get all outgoing inventory items with warranty and serial number data
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters (dateFrom, dateTo, invoiceChallanNumber, search)
   * @returns {Array} Array of items with warranty and serial number data
   */
  static async getAllWarrantySerialItems(companyId, filters = {}) {
    let query = `
      SELECT 
        oii.id as item_id,
        oii.sku_id,
        s.sku_id as sku_code,
        s.item_name,
        s.unit,
        s.warranty as sku_default_warranty,
        oii.outgoing_quantity as received,
        oii.unit_price,
        COALESCE(oii.warranty, s.warranty, 0) as current_warranty,
        oii.serial_number,
        oi.invoice_challan_number as invoice_number,
        oi.invoice_challan_date as invoice_date,
        oi.invoice_challan_date as receiving_date,
        COALESCE(c.customer_name, v.name, 'Store to Factory') as vendor_name,
        b.name as brand_name
      FROM outgoing_inventory_items oii
      INNER JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id
      LEFT JOIN skus s ON oii.sku_id = s.id
      LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
      LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'
      LEFT JOIN brands b ON s.brand_id = b.id
      WHERE oi.company_id = $1 
        AND oi.is_active = true
        AND oi.status = 'completed'
    `;
    
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND oi.invoice_challan_date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND oi.invoice_challan_date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.invoiceChallanNumber) {
      query += ` AND oi.invoice_challan_number ILIKE $${paramIndex}`;
      params.push(`%${filters.invoiceChallanNumber}%`);
      paramIndex++;
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      query += ` AND (
        oi.invoice_challan_number ILIKE $${paramIndex}
        OR s.sku_id ILIKE $${paramIndex}
        OR s.item_name ILIKE $${paramIndex}
        OR COALESCE(c.customer_name, v.name, '') ILIKE $${paramIndex}
        OR b.name ILIKE $${paramIndex}
        OR oii.serial_number ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    query += ` ORDER BY oi.invoice_challan_date DESC, oi.invoice_challan_number, oii.id`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, params);
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

