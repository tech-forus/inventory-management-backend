const pool = require('./database');
const { logger } = require('../utils/logger');

/**
 * Rejected Item Report Model
 * Handles all database operations for rejected item reports
 */
class RejectedItemReportModel {
  /**
   * Generate a unique report number in format: REJ/<InvoiceNumber>/<sequence>
   */
  static async generateReportNumber(invoiceNumber, companyId) {
    try {
      // Ensure invoiceNumber is treated as string for consistent matching
      const invoiceNumberStr = String(invoiceNumber || '');
      
      if (!invoiceNumberStr) {
        throw new Error('Invoice number is required for generating report number');
      }
      
      // Get the highest sequence number for this invoice number
      // Use TRIM and CAST to handle any type mismatches
      // Handle NULL values from SUBSTRING (when no reports exist yet)
      const result = await pool.query(
        `SELECT MAX(
          CASE 
            WHEN report_number ~ '/\\d+$' THEN
              CAST(SUBSTRING(report_number FROM '/(\\d+)$') AS INTEGER)
            ELSE NULL
          END
        ) as max_sequence
        FROM rejected_item_reports
        WHERE TRIM(CAST(original_invoice_number AS VARCHAR)) = TRIM(CAST($1 AS VARCHAR))
          AND company_id = $2
          AND is_active = true`,
        [invoiceNumberStr, companyId.toUpperCase()]
      );

      const maxSequence = result.rows[0]?.max_sequence ?? 0;
      const nextSequence = maxSequence + 1;
      
      // Format: REJ/<InvoiceNumber>/<sequence>
      const reportNumber = `REJ/${invoiceNumberStr}/${nextSequence.toString().padStart(3, '0')}`;
      
      logger.info({ 
        invoiceNumber: invoiceNumberStr, 
        maxSequence, 
        nextSequence, 
        reportNumber,
        companyId: companyId.toUpperCase()
      }, 'Generated report number');
      
      return reportNumber;
    } catch (error) {
      logger.error({ 
        error: error.message,
        stack: error.stack,
        invoiceNumber,
        companyId: companyId.toUpperCase()
      }, 'Error generating report number');
      throw new Error(`Failed to generate report number: ${error.message}`);
    }
  }

  /**
   * Get all rejected item reports with filters
   */
  static async getAll(companyId, filters = {}) {
    try {
      // Check if table exists
      const tableCheck = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'rejected_item_reports'
        )`
      );
      
      if (!tableCheck.rows[0]?.exists) {
        logger.warn('rejected_item_reports table does not exist');
        return [];
      }

      // Check if status column exists
      const columnCheck = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'rejected_item_reports' 
         AND column_name = 'status'`
      );
      const hasStatusColumn = columnCheck.rows.length > 0;

    // Check if tracking columns exist
    const trackingColumnsCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name IN ('sent_to_vendor', 'received_back', 'scrapped', 'net_rejected')`
    );
    const hasTrackingColumns = trackingColumnsCheck.rows.length >= 4;

    // Check if reason column exists
    const reasonColumnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name = 'reason'`
    );
    const hasReasonColumn = reasonColumnCheck.rows.length > 0;

      let query = `
        SELECT 
          rir.id,
          rir.report_number,
          rir.original_invoice_number,
          rir.inspection_date,
          rir.sku_id,
          rir.item_name,
          rir.quantity,
          ${hasStatusColumn ? 'rir.status,' : "'Pending' as status,"}
          ${hasTrackingColumns ? 'rir.sent_to_vendor, rir.received_back, rir.scrapped, rir.net_rejected,' : '0 as sent_to_vendor, 0 as received_back, 0 as scrapped, rir.quantity as net_rejected,'}
          ${hasReasonColumn ? 'rir.reason,' : 'NULL as reason,'}
          rir.created_at,
          rir.incoming_inventory_id,
          rir.incoming_inventory_item_id,
          s.sku_id as sku_code,
          ii.vendor_id,
          ii.brand_id
        FROM rejected_item_reports rir
        LEFT JOIN skus s ON rir.sku_id = s.id
        LEFT JOIN incoming_inventory ii ON rir.incoming_inventory_id = ii.id
        WHERE rir.company_id = $1 AND rir.is_active = true
      `;
    
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.dateFrom) {
      query += ` AND rir.inspection_date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND rir.inspection_date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (
        rir.report_number ILIKE $${paramIndex} OR
        rir.original_invoice_number ILIKE $${paramIndex} OR
        rir.item_name ILIKE $${paramIndex} OR
        s.code ILIKE $${paramIndex}
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      paramIndex += 4;
    }

    query += ` ORDER BY rir.created_at DESC, rir.inspection_date DESC`;

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
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Error in getAll rejected item reports');
      throw error;
    }
  }

  /**
   * Get a rejected item report by ID
   */
  static async getById(id, companyId) {
    // Check if status column exists
    const columnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name = 'status'`
    );
    const hasStatusColumn = columnCheck.rows.length > 0;

    // Check if tracking columns exist
    const trackingColumnsCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name IN ('sent_to_vendor', 'received_back', 'scrapped', 'net_rejected')`
    );
    const hasTrackingColumns = trackingColumnsCheck.rows.length >= 4;

    // Check if reason column exists
    const reasonColumnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name = 'reason'`
    );
    const hasReasonColumn = reasonColumnCheck.rows.length > 0;

      const result = await pool.query(
      `SELECT 
        rir.id,
        rir.report_number,
        rir.original_invoice_number,
        rir.inspection_date,
        rir.sku_id,
        rir.item_name,
        rir.quantity,
        ${hasStatusColumn ? 'rir.status,' : "'Pending' as status,"}
        ${hasTrackingColumns ? 'rir.sent_to_vendor, rir.received_back, rir.scrapped, rir.net_rejected,' : '0 as sent_to_vendor, 0 as received_back, 0 as scrapped, rir.quantity as net_rejected,'}
        ${hasReasonColumn ? 'rir.reason,' : 'NULL as reason,'}
        rir.created_at,
        rir.incoming_inventory_id,
        rir.incoming_inventory_item_id,
        s.sku_id as sku_code,
        ii.vendor_id,
        ii.brand_id
      FROM rejected_item_reports rir
      LEFT JOIN skus s ON rir.sku_id = s.id
      LEFT JOIN incoming_inventory ii ON rir.incoming_inventory_id = ii.id
      WHERE rir.id = $1 
        AND rir.company_id = $2 
        AND rir.is_active = true`,
      [id, companyId.toUpperCase()]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new rejected item report
   */
  static async create(reportData, companyId) {
    // Validate required fields
    if (!reportData.incomingInventoryId) {
      throw new Error('incomingInventoryId is required');
    }
    if (!reportData.incomingInventoryItemId) {
      throw new Error('incomingInventoryItemId is required');
    }
    if (!reportData.skuId) {
      throw new Error('skuId is required');
    }
    if (!reportData.quantity || reportData.quantity <= 0) {
      throw new Error('quantity must be greater than 0');
    }

    // Get invoice number from incoming inventory
    const invoiceResult = await pool.query(
      `SELECT invoice_number 
       FROM incoming_inventory 
       WHERE id = $1 AND company_id = $2`,
      [reportData.incomingInventoryId, companyId.toUpperCase()]
    );

    if (!invoiceResult.rows[0]) {
      throw new Error(`Incoming inventory not found: id=${reportData.incomingInventoryId}, companyId=${companyId.toUpperCase()}`);
    }

    const invoiceNumber = invoiceResult.rows[0].invoice_number;
    
    if (!invoiceNumber) {
      throw new Error(`Invoice number is NULL for incoming inventory id=${reportData.incomingInventoryId}`);
    }

    logger.debug({ 
      incomingInventoryId: reportData.incomingInventoryId,
      invoiceNumber,
      companyId: companyId.toUpperCase()
    }, 'Creating rejected item report - got invoice number');

    // Generate report number
    const reportNumber = await this.generateReportNumber(invoiceNumber, companyId);

    // Check if status column exists
    const statusColumnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name = 'status'`
    );
    const hasStatusColumn = statusColumnCheck.rows.length > 0;

    // Check if tracking columns exist
    const trackingColumnsCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name IN ('sent_to_vendor', 'received_back', 'scrapped', 'net_rejected')`
    );
    const hasTrackingColumns = trackingColumnsCheck.rows.length === 4;

    // Check if reason column exists
    const reasonColumnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name = 'reason'`
    );
    const hasReasonColumn = reasonColumnCheck.rows.length > 0;

    // Build INSERT fields and values dynamically based on available columns
    let insertFields = `company_id, report_number, original_invoice_number, incoming_inventory_id, incoming_inventory_item_id, sku_id, item_name, quantity, inspection_date`;
    let insertValues = `$1, $2, $3, $4, $5, $6, $7, $8, $9`;
    let paramIndex = 10;

    const insertParams = [
      companyId.toUpperCase(),
      reportNumber,
      invoiceNumber,
      reportData.incomingInventoryId,
      reportData.incomingInventoryItemId,
      reportData.skuId,
      reportData.itemName,
      reportData.quantity,
      reportData.inspectionDate || new Date().toISOString().split('T')[0],
    ];

    // Add tracking columns if they exist
    if (hasTrackingColumns) {
      insertFields += `, sent_to_vendor, received_back, scrapped, net_rejected`;
      insertValues += `, $${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}`;
      // Initialize: sent_to_vendor = 0, received_back = 0, scrapped = 0, net_rejected = quantity
      insertParams.push(0); // sent_to_vendor
      insertParams.push(0); // received_back
      insertParams.push(0); // scrapped
      insertParams.push(reportData.quantity); // net_rejected = quantity initially
      paramIndex += 4;
    }

    // Add status column if it exists
    if (hasStatusColumn) {
      insertFields += `, status`;
      insertValues += `, $${paramIndex}`;
      insertParams.push(reportData.status || 'Pending');
      paramIndex++;
    }

    // Add reason column if it exists
    if (hasReasonColumn) {
      insertFields += `, reason`;
      insertValues += `, $${paramIndex}`;
      insertParams.push(reportData.reason || null);
      paramIndex++;
    }

    try {
      const result = await pool.query(
        `INSERT INTO rejected_item_reports (${insertFields})
         VALUES (${insertValues})
         RETURNING *`,
        insertParams
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('INSERT succeeded but no row returned');
      }

      logger.info(
        { 
          reportId: result.rows[0].id, 
          reportNumber,
          quantity: reportData.quantity,
          invoiceNumber,
          incomingInventoryId: reportData.incomingInventoryId,
          incomingInventoryItemId: reportData.incomingInventoryItemId
        },
        'Successfully created rejected item report'
      );

      return result.rows[0];
    } catch (dbError) {
      // Check for unique constraint violations
      if (dbError.code === '23505') { // PostgreSQL unique violation
        logger.error({ 
          error: dbError.message,
          detail: dbError.detail,
          constraint: dbError.constraint,
          reportData,
          companyId: companyId.toUpperCase()
        }, 'Unique constraint violation when creating rejected item report');
        throw new Error(`Report already exists for this combination. Constraint: ${dbError.constraint || 'unknown'}`);
      }
      
      // Check for foreign key violations
      if (dbError.code === '23503') { // PostgreSQL foreign key violation
        logger.error({ 
          error: dbError.message,
          detail: dbError.detail,
          reportData,
          companyId: companyId.toUpperCase()
        }, 'Foreign key violation when creating rejected item report');
        throw new Error(`Invalid reference: ${dbError.detail || dbError.message}`);
      }
      
      // Re-throw with more context
      logger.error({ 
        error: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        stack: dbError.stack,
        reportData,
        companyId: companyId.toUpperCase(),
        insertFields,
        insertParams
      }, 'Database error when creating rejected item report');
      
      throw new Error(`Failed to create rejected item report: ${dbError.message}`);
    }
  }

  /**
   * Update a rejected item report
   */
  static async update(id, updateData, companyId) {
    // Check if tracking columns exist
    const trackingColumnsCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name IN ('sent_to_vendor', 'received_back', 'scrapped', 'net_rejected')`
    );
    const hasTrackingColumns = trackingColumnsCheck.rows.length >= 4;

    // Check if status column exists
    const statusCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'rejected_item_reports' 
       AND column_name = 'status'`
    );
    const hasStatusColumn = statusCheck.rows.length > 0;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (updateData.sentToVendor !== undefined && hasTrackingColumns) {
      updateFields.push(`sent_to_vendor = $${paramIndex}`);
      updateValues.push(parseInt(updateData.sentToVendor, 10));
      paramIndex++;
    }

    if (updateData.receivedBack !== undefined && hasTrackingColumns) {
      updateFields.push(`received_back = $${paramIndex}`);
      updateValues.push(parseInt(updateData.receivedBack, 10));
      paramIndex++;
    }

    if (updateData.scrapped !== undefined && hasTrackingColumns) {
      updateFields.push(`scrapped = $${paramIndex}`);
      updateValues.push(parseInt(updateData.scrapped, 10));
      paramIndex++;
    }

    if (updateData.netRejected !== undefined && hasTrackingColumns) {
      updateFields.push(`net_rejected = $${paramIndex}`);
      updateValues.push(parseInt(updateData.netRejected, 10));
      paramIndex++;
    } else if (hasTrackingColumns && (updateData.sentToVendor !== undefined || updateData.receivedBack !== undefined || updateData.scrapped !== undefined)) {
      // Auto-calculate net_rejected if not provided
      const currentReport = await this.getById(id, companyId);
      if (currentReport) {
        const sentToVendor = updateData.sentToVendor !== undefined ? parseInt(updateData.sentToVendor, 10) : parseInt(currentReport.sent_to_vendor || 0, 10);
        const receivedBack = updateData.receivedBack !== undefined ? parseInt(updateData.receivedBack, 10) : parseInt(currentReport.received_back || 0, 10);
        const scrapped = updateData.scrapped !== undefined ? parseInt(updateData.scrapped, 10) : parseInt(currentReport.scrapped || 0, 10);
        const quantity = parseInt(currentReport.quantity || 0, 10);
        const netRejected = Math.max(0, quantity - sentToVendor - receivedBack - scrapped);
        
        updateFields.push(`net_rejected = $${paramIndex}`);
        updateValues.push(netRejected);
        paramIndex++;
      }
    }

    if (updateData.status !== undefined && hasStatusColumn) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(updateData.status);
      paramIndex++;
    }

    if (updateData.inspectionDate !== undefined) {
      updateFields.push(`inspection_date = $${paramIndex}`);
      updateValues.push(updateData.inspectionDate);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add WHERE clause parameters
    updateValues.push(id, companyId.toUpperCase());
    const whereParamIndex = paramIndex;
    const companyParamIndex = paramIndex + 1;

    const query = `
      UPDATE rejected_item_reports 
      SET ${updateFields.join(', ')}
      WHERE id = $${whereParamIndex} AND company_id = $${companyParamIndex} AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info({ reportId: id, updatedFields: updateFields }, 'Updated rejected item report');
    return result.rows[0];
  }

  /**
   * Delete a rejected item report (soft delete)
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      `UPDATE rejected_item_reports 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2 AND is_active = true
       RETURNING *`,
      [id, companyId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info({ reportId: id }, 'Deleted rejected item report');
    return result.rows[0];
  }
}

module.exports = RejectedItemReportModel;
