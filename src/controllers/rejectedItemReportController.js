const RejectedItemReportModel = require('../models/rejectedItemReportModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Transform rejected item report from snake_case to camelCase
 */
const transformReport = (report) => {
  if (!report) return null;
  const sentToVendor = parseInt(report.sent_to_vendor || 0, 10);
  const receivedBack = parseInt(report.received_back || 0, 10);
  const scrapped = parseInt(report.scrapped || 0, 10);
  const quantity = parseInt(report.quantity || 0, 10);
  const netRejected = report.net_rejected !== undefined && report.net_rejected !== null
    ? parseInt(report.net_rejected, 10)
    : Math.max(0, quantity - sentToVendor - receivedBack - scrapped);

  return {
    id: report.id,
    reportNumber: report.report_number,
    originalInvoiceNumber: report.original_invoice_number,
    inspectionDate: report.inspection_date,
    skuId: report.sku_id,
    skuCode: report.sku_code,
    itemName: report.item_name,
    reason: report.reason || null,
    quantity: quantity,
    sentToVendor: sentToVendor,
    receivedBack: receivedBack,
    scrapped: scrapped,
    netRejected: netRejected,
    status: report.status || 'Pending',
    createdAt: report.created_at,
    incomingInventoryId: report.incoming_inventory_id,
    incomingInventoryItemId: report.incoming_inventory_item_id,
    vendorId: report.vendor_id ? report.vendor_id.toString() : null,
    brandId: report.brand_id ? report.brand_id.toString() : null,
    vendorName: report.vendor_name || null,
    brandName: report.brand_name || null,
    originalUnitPrice: parseFloat(report.original_unit_price || 0),
  };
};

/**
 * GET /api/inventory/rejected-item-reports
 * Get all rejected item reports
 */
const getAllRejectedItemReports = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const {
      dateFrom,
      dateTo,
      search,
      limit,
      offset,
    } = req.query;

    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (search) filters.search = search.trim();
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const reports = await RejectedItemReportModel.getAll(companyId, filters);
    const transformedReports = reports.map(transformReport);

    res.json({
      success: true,
      data: transformedReports,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Error getting rejected item reports');
    next(error);
  }
};

/**
 * GET /api/inventory/rejected-item-reports/:id
 * Get a rejected item report by ID
 */
const getRejectedItemReportById = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const report = await RejectedItemReportModel.getById(id, companyId);

    if (!report) {
      throw new NotFoundError('Rejected item report not found');
    }

    res.json({
      success: true,
      data: transformReport(report),
    });
  } catch (error) {
    logger.error({ error: error.message, reportId: req.params.id }, 'Error getting rejected item report');
    next(error);
  }
};

/**
 * POST /api/inventory/rejected-item-reports
 * Create a new rejected item report
 */
const createRejectedItemReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const {
      incomingInventoryId,
      incomingInventoryItemId,
      skuId,
      itemName,
      quantity,
      inspectionDate,
      status,
    } = req.body;

    if (!incomingInventoryId || !incomingInventoryItemId || !skuId || !itemName || !quantity) {
      throw new ValidationError('Missing required fields');
    }

    const report = await RejectedItemReportModel.create(
      {
        incomingInventoryId,
        incomingInventoryItemId,
        skuId,
        itemName,
        quantity: parseInt(quantity, 10),
        inspectionDate,
        status,
      },
      companyId
    );

    res.status(201).json({
      success: true,
      data: transformReport(report),
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Error creating rejected item report');
    next(error);
  }
};

/**
 * PUT /api/inventory/rejected-item-reports/:id
 * Update a rejected item report
 */
const updateRejectedItemReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const {
      sentToVendor,
      receivedBack,
      scrapped,
      netRejected,
      status,
      inspectionDate,
    } = req.body;

    // Read current state first so we can apply stock/ledger deltas for receivedBack
    const current = await RejectedItemReportModel.getById(id, companyId);
    if (!current) {
      throw new NotFoundError('Rejected item report not found');
    }

    // Validate that at least one field is being updated
    if (
      sentToVendor === undefined &&
      receivedBack === undefined &&
      scrapped === undefined &&
      netRejected === undefined &&
      status === undefined &&
      inspectionDate === undefined
    ) {
      throw new ValidationError('At least one field must be provided for update');
    }

    // Validate numeric fields
    if (sentToVendor !== undefined && (isNaN(sentToVendor) || sentToVendor < 0)) {
      throw new ValidationError('sentToVendor must be a non-negative number');
    }
    if (receivedBack !== undefined && (isNaN(receivedBack) || receivedBack < 0)) {
      throw new ValidationError('receivedBack must be a non-negative number');
    }
    if (scrapped !== undefined && (isNaN(scrapped) || scrapped < 0)) {
      throw new ValidationError('scrapped must be a non-negative number');
    }
    if (netRejected !== undefined && (isNaN(netRejected) || netRejected < 0)) {
      throw new ValidationError('netRejected must be a non-negative number');
    }

    const report = await RejectedItemReportModel.update(
      id,
      {
        sentToVendor,
        receivedBack,
        scrapped,
        netRejected,
        status,
        inspectionDate,
      },
      companyId
    );

    if (!report) {
      throw new NotFoundError('Rejected item report not found');
    }

    // If receivedBack increased, add stock back and record a positive REJ ledger entry (green in UI)
    // Note: stock was already reduced when the items were moved to rejected.
    const oldReceivedBack = parseInt(current.receivedBack || current.received_back || 0, 10) || 0;
    const newReceivedBack = parseInt(report.received_back || 0, 10) || 0;
    const deltaReceivedBack = Math.max(0, newReceivedBack - oldReceivedBack);

    if (deltaReceivedBack > 0) {
      const pool = require('../models/database');
      const LedgerService = require('../services/ledgerService');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Add stock back
        await client.query(
          'UPDATE skus SET current_stock = current_stock + $1 WHERE id = $2',
          [deltaReceivedBack, current.sku_id]
        );

        // Determine creator display
        const user = req.user || {};
        const createdByName =
          user.role && String(user.role).toLowerCase().includes('admin')
            ? 'Super Admin'
            : (user.email || 'System');

        await LedgerService.addTransaction(client, {
          skuId: current.sku_id,
          transactionDate: new Date(),
          transactionType: 'REJ',
          referenceNumber: `REJ-RETURN / ${current.original_invoice_number || current.originalInvoiceNumber || 'N/A'}`,
          sourceDestination: `Vendor: ${current.vendor_name || current.vendorName || 'Unknown'}`,
          createdBy: user.id || user.userId || null,
          createdByName,
          quantityChange: deltaReceivedBack, // positive: add back to stock
          companyId: companyId.toUpperCase(),
        });

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    res.json({
      success: true,
      data: transformReport(report),
    });
  } catch (error) {
    logger.error({ error: error.message, reportId: req.params.id }, 'Error updating rejected item report');
    next(error);
  }
};

/**
 * DELETE /api/inventory/rejected-item-reports/:id
 * Delete a rejected item report
 */
const deleteRejectedItemReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const report = await RejectedItemReportModel.delete(id, companyId);

    if (!report) {
      throw new NotFoundError('Rejected item report not found');
    }

    res.json({
      success: true,
      message: 'Rejected item report deleted successfully',
    });
  } catch (error) {
    logger.error({ error: error.message, reportId: req.params.id }, 'Error deleting rejected item report');
    next(error);
  }
};

module.exports = {
  getAllRejectedItemReports,
  getRejectedItemReportById,
  createRejectedItemReport,
  updateRejectedItemReport,
  deleteRejectedItemReport,
};
