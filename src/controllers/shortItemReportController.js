const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');
const pool = require('../models/database');

/**
 * Transform short item report from snake_case to camelCase
 */
const transformShortReport = (report) => {
  if (!report) return null;
  const shortQuantity = parseInt(report.short_quantity || 0, 10);
  const receivedBack = parseInt(report.received_back || 0, 10);
  const netRejected = report.net_rejected !== undefined && report.net_rejected !== null
    ? parseInt(report.net_rejected, 10)
    : Math.max(0, shortQuantity - receivedBack);
  
  return {
    id: report.id,
    incomingInventoryId: report.incoming_inventory_id,
    incomingInventoryItemId: report.incoming_inventory_item_id,
    invoiceNumber: report.invoice_number,
    invoiceReceivedDate: report.invoice_received_date,
    skuId: report.sku_id,
    skuCode: report.sku_code,
    itemName: report.item_name,
    shortQuantity: shortQuantity,
    receivedBack: receivedBack,
    netRejected: netRejected,
    status: report.status || 'Pending',
    createdAt: report.created_at,
    vendorId: report.vendor_id ? report.vendor_id.toString() : null,
    brandId: report.brand_id ? report.brand_id.toString() : null,
  };
};

/**
 * GET /api/inventory/short-item-reports
 * Get all short item reports
 */
const getAllShortItemReports = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const {
      dateFrom,
      dateTo,
      search,
      limit,
      offset,
    } = req.query;

    let query = `
      SELECT 
        iii.id,
        iii.incoming_inventory_id,
        iii.id as incoming_inventory_item_id,
        ii.invoice_number,
        ii.receiving_date as invoice_received_date,
        iii.sku_id,
        s.sku_id as sku_code,
        s.item_name,
        (iii.total_quantity - iii.received) as short_quantity,
        GREATEST(0, (iii.total_quantity - iii.received) - iii.short) as received_back,
        iii.short as net_rejected,
        CASE 
          WHEN iii.short = 0 THEN 'Received Back'
          WHEN iii.short < (iii.total_quantity - iii.received) THEN 'Partially Received'
          ELSE 'Pending'
        END as status,
        iii.created_at,
        ii.vendor_id,
        ii.brand_id
      FROM incoming_inventory_items iii
      INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      LEFT JOIN skus s ON iii.sku_id = s.id
      WHERE ii.company_id = $1 
        AND ii.is_active = true
        AND (iii.total_quantity - iii.received) > 0
        AND iii.short >= 0
    `;
    
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (dateFrom) {
      query += ` AND ii.receiving_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND ii.receiving_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        ii.invoice_number ILIKE $${paramIndex} OR
        s.sku_id ILIKE $${paramIndex} OR
        s.item_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY iii.created_at DESC`;

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit, 10));
      paramIndex++;
    }

    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset, 10));
    }

    const result = await pool.query(query, params);
    const transformedReports = result.rows.map(transformShortReport);

    res.json({
      success: true,
      data: transformedReports,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Error getting short item reports');
    next(error);
  }
};

/**
 * GET /api/inventory/short-item-reports/:id
 * Get a short item report by ID
 */
const getShortItemReportById = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const query = `
      SELECT 
        iii.id,
        iii.incoming_inventory_id,
        iii.id as incoming_inventory_item_id,
        ii.invoice_number,
        ii.receiving_date as invoice_received_date,
        iii.sku_id,
        s.sku_id as sku_code,
        s.item_name,
        (iii.total_quantity - iii.received) as short_quantity,
        GREATEST(0, (iii.total_quantity - iii.received) - iii.short) as received_back,
        iii.short as net_rejected,
        CASE 
          WHEN iii.short = 0 THEN 'Received Back'
          WHEN iii.short < (iii.total_quantity - iii.received) THEN 'Partially Received'
          ELSE 'Pending'
        END as status,
        iii.created_at,
        ii.vendor_id,
        ii.brand_id
      FROM incoming_inventory_items iii
      INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
      LEFT JOIN skus s ON iii.sku_id = s.id
      WHERE iii.id = $1 
        AND ii.company_id = $2
        AND ii.is_active = true
        AND (iii.total_quantity - iii.received) > 0
        AND iii.short >= 0
    `;

    const result = await pool.query(query, [id, companyId.toUpperCase()]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Short item report not found');
    }

    res.json({
      success: true,
      data: transformShortReport(result.rows[0]),
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Error getting short item report');
    next(error);
  }
};

module.exports = {
  getAllShortItemReports,
  getShortItemReportById,
};




