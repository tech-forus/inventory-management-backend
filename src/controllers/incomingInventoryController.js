const IncomingInventoryModel = require('../models/incomingInventoryModel');
const PriceHistoryModel = require('../models/priceHistoryModel');
const RejectedItemReportModel = require('../models/rejectedItemReportModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Transform incoming inventory record from snake_case to camelCase
 */
const transformIncomingInventory = (record) => {
  if (!record) return null;
  return {
    id: record.id,
    invoiceDate: record.invoice_date,
    invoiceNumber: record.invoice_number,
    docketNumber: record.docket_number,
    transportorName: record.transportor_name,
    vendorId: record.vendor_id,
    vendorName: record.vendor_name,
    brandId: record.brand_id,
    brandName: record.brand_name,
    receivingDate: record.receiving_date,
    receivedBy: record.received_by,
    receivedByName: record.received_by_name,
    remarks: record.remarks,
    documentType: record.document_type || 'bill',
    documentSubType: record.document_sub_type || null,
    vendorSubType: record.vendor_sub_type || null,
    deliveryChallanSubType: record.delivery_challan_sub_type || null,
    destinationType: record.destination_type || null,
    destinationId: record.destination_id || null,
    status: record.status,
    totalValue: parseFloat(record.total_value || 0),
    totalQuantity: parseInt(record.total_quantity_sum || 0, 10),
    received: parseInt(record.received_sum || 0, 10),
    short: parseInt(record.short_sum || 0, 10),
    rejected: parseInt(record.rejected_sum || 0, 10),
    warranty: parseInt(record.warranty || 0, 10),
    warrantyUnit: record.warranty_unit || 'months',
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

/**
 * Incoming Inventory Controller
 * Handles all incoming inventory-related operations
 */

/**
 * Create a new incoming inventory transaction
 */
const createIncomingInventory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { items, ...inventoryData } = req.body;

    // Log the incoming data for debugging
    logger.debug({ 
      companyId, 
      inventoryDataKeys: Object.keys(inventoryData),
      itemsCount: items?.length,
      documentType: inventoryData.documentType 
    }, 'Creating incoming inventory');

    // Validation is now handled by middleware
    // Additional business logic validation can go here if needed

    const result = await IncomingInventoryModel.create(inventoryData, items, companyId);
    
    // Update price history if status is 'completed'
    if (inventoryData.status === 'completed' && result.id) {
      try {
        await PriceHistoryModel.updatePriceHistory(result.id, companyId);
      } catch (priceError) {
        logger.error({ inventoryId: result.id, error: priceError.message }, 'Error updating price history on create');
        // Don't fail the request if price history update fails
      }
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    }, 'Error in createIncomingInventory controller');
    next(error); // Pass error to error handler
  }
};

/**
 * Get all incoming inventory records
 */
const getAllIncomingInventory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      vendor: req.query.vendor,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    const records = await IncomingInventoryModel.getAll(companyId, filters);
    logger.debug({ requestId: req.id, recordCount: records.length }, 'Fetched incoming inventory records');
    
    const transformedRecords = records.map(transformIncomingInventory);
    res.json({ success: true, data: transformedRecords });
  } catch (error) {
    next(error);
  }
};

/**
 * Get incoming inventory history (for history tab)
 */
const getIncomingHistory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      vendor: req.query.vendor,
      sku: req.query.sku,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000,
    };

    const history = await IncomingInventoryModel.getHistory(companyId, filters);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

/**
 * Get incoming inventory by ID
 */
const getIncomingInventoryById = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const record = await IncomingInventoryModel.getById(id, companyId);
    if (!record) {
      throw new NotFoundError('Incoming inventory record not found');
    }

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

/**
 * Update incoming inventory status
 */
const updateIncomingInventoryStatus = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'completed', 'cancelled'].includes(status)) {
      throw new ValidationError('Invalid status. Must be draft, completed, or cancelled');
    }

    const result = await IncomingInventoryModel.updateStatus(id, status, companyId);
    
    // Update price history if status changed to 'completed'
    if (status === 'completed') {
      try {
        await PriceHistoryModel.updatePriceHistory(id, companyId);
      } catch (priceError) {
        logger.error({ inventoryId: id, error: priceError.message }, 'Error updating price history on status update');
        // Don't fail the request if price history update fails
      }
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Transform item from snake_case to camelCase
 */
const transformItem = (item) => {
  if (!item) return null;
  return {
    itemId: item.item_id,
    skuId: item.sku_id,
    skuCode: item.sku_code,
    itemName: item.item_name,
    received: parseInt(item.received || 0, 10),
    short: parseInt(item.short || 0, 10),
    rejected: parseInt(item.rejected || 0, 10),
    totalQuantity: parseInt(item.total_quantity || 0, 10),
    challanNumber: item.challan_number,
    challanDate: item.challan_date,
    unitPrice: parseFloat(item.unit_price || 0),
    totalValue: parseFloat(item.total_value || item.total_value_incl_gst || 0),
    gstPercentage: parseFloat(item.gst_percentage || 0),
    gstAmount: parseFloat(item.gst_amount || 0),
    totalValueExclGst: parseFloat(item.total_value_excl_gst || 0),
    totalValueInclGst: parseFloat(item.total_value_incl_gst || item.total_value || 0),
  };
};

/**
 * Get items for an incoming inventory record
 */
const getIncomingInventoryItems = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const items = await IncomingInventoryModel.getItemsByInventoryId(id, companyId);
    const transformedItems = items.map(transformItem);
    res.json({ success: true, data: transformedItems });
  } catch (error) {
    next(error);
  }
};

/**
 * Move received quantity to rejected (defective items)
 */
const moveReceivedToRejected = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // incoming inventory id
    const { itemId, quantity, inspectionDate, reason } = req.body;

    if (!itemId) {
      throw new ValidationError('itemId is required');
    }

    // Validate quantity is provided and positive
    const moveQty = quantity !== undefined && quantity !== null ? parseInt(quantity, 10) : null;
    if (!moveQty || moveQty <= 0) {
      throw new ValidationError('Quantity must be provided and greater than 0');
    }

    // Get item details BEFORE moving to rejected (for report creation)
    const itemResultBefore = await IncomingInventoryModel.getItemsByInventoryId(id, companyId);
    const itemBefore = itemResultBefore.find(i => (i.item_id || i.itemId) === parseInt(itemId));
    
    if (!itemBefore) {
      throw new ValidationError('Item not found');
    }

    // Store old rejected value for logging
    const oldRejected = itemBefore.rejected || 0;

    // Move to rejected in inventory
    const result = await IncomingInventoryModel.moveReceivedToRejected(id, itemId, moveQty, companyId);
    
    // Create rejected item report - ALWAYS create a new report for each rejection action
    // Each rejection creates a new report with sequential number (001, 002, 003, etc.)
    let reportCreated = false;
    try {
      // Get item details for the report (after update) - need SKU and item name
      const itemResult = await IncomingInventoryModel.getItemsByInventoryId(id, companyId);
      const item = itemResult.find(i => (i.item_id || i.itemId) === parseInt(itemId));
      
      if (!item) {
        logger.error({ itemId, inventoryId: id }, 'Item not found after update');
        throw new Error('Item not found after update');
      }

      // Validate SKU ID exists
      const skuId = item.sku_id || itemBefore.sku_id;
      if (!skuId) {
        logger.error({ item, itemBefore, itemId, inventoryId: id }, 'SKU ID is missing');
        throw new Error('SKU ID is required for creating rejected item report');
      }

      // Validate reason if provided
      if (reason && reason.length > 30) {
        throw new ValidationError('Reason must be maximum 30 characters');
      }

      // Always use the quantity that was moved in THIS action
      // This ensures each rejection creates a separate report with the correct quantity
      const reportData = {
        incomingInventoryId: parseInt(id),
        incomingInventoryItemId: parseInt(itemId),
        skuId: skuId,
        itemName: item.item_name || itemBefore.item_name || 'N/A',
        quantity: moveQty, // This is the quantity moved in THIS action (will create report 001, 002, etc.)
        inspectionDate: inspectionDate || new Date().toISOString().split('T')[0],
        reason: reason ? reason.trim().substring(0, 30) : null,
      };

      logger.info({ 
        reportData, 
        companyId: companyId.toUpperCase(),
        oldRejected: oldRejected,
        newRejected: item.rejected || 0,
        moveQty
      }, 'Creating rejected item report');
      
      const createdReport = await RejectedItemReportModel.create(reportData, companyId);
      reportCreated = true;
      
      logger.info({ 
        reportId: createdReport.id, 
        reportNumber: createdReport.report_number,
        quantity: moveQty,
        invoiceNumber: createdReport.original_invoice_number
      }, 'Successfully created rejected item report');
      
    } catch (reportError) {
      // Log the error with full context
      logger.error({ 
        error: reportError.message, 
        stack: reportError.stack,
        itemId,
        inventoryId: id,
        quantity: moveQty,
        companyId: companyId.toUpperCase(),
        oldRejected,
        reportErrorCode: reportError.code,
        reportErrorDetail: reportError.detail
      }, 'Error creating rejected item report');
      
      // Return success for inventory update, but include warning about report creation failure
      // This allows the inventory operation to complete even if report creation fails
      res.json({ 
        success: true, 
        data: result,
        warning: `Inventory updated successfully, but failed to create rejected item report: ${reportError.message}`,
        reportCreated: false
      });
      return;
    }
    
    // Return success with report creation confirmation
    res.json({ 
      success: true, 
      data: result,
      reportCreated: true,
      message: 'Items moved to rejected and report created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move short quantity to rejected
 */
const moveShortToRejected = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // incoming inventory id
    const { itemId, quantity } = req.body;

    if (!itemId) {
      throw new ValidationError('itemId is required');
    }

    const result = await IncomingInventoryModel.moveShortToRejected(id, itemId, quantity, companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Update short item (edit short, challan)
 * IMPORTANT: received is FIXED and cannot be changed after creation
 */
const updateShortItem = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // incoming inventory id
    const { itemId, short, challanNumber, challanDate } = req.body;

    if (!itemId) {
      throw new ValidationError('itemId is required');
    }

    // received cannot be updated - it's fixed at creation
    if (req.body.received !== undefined) {
      throw new ValidationError('Received quantity cannot be modified after creation. It is fixed at entry.');
    }

    const updates = {};
    if (short !== undefined) updates.short = short;
    if (challanNumber !== undefined) updates.challanNumber = challanNumber;
    if (challanDate !== undefined) updates.challanDate = challanDate;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one of short, challanNumber, or challanDate must be provided');
    }

    const result = await IncomingInventoryModel.updateShortItem(id, itemId, updates, companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Update short quantities for incoming inventory items
 */
const updateShort = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // incoming inventory id
    const { itemId, short, invoiceNumber, invoiceDate } = req.body;

    if (!itemId) {
      throw new ValidationError('itemId is required');
    }

    if (short === undefined) {
      throw new ValidationError('short must be provided');
    }

    const updates = {};
    if (short !== undefined) updates.short = short;
    if (invoiceNumber) updates.invoiceNumber = invoiceNumber;
    if (invoiceDate) updates.invoiceDate = invoiceDate;

    const result = await IncomingInventoryModel.updateRejectedShort(id, itemId, updates, companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Update rejected and short for a specific item
 */
const updateItemRejectedShort = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // incoming inventory id
    const { itemId, rejected, short } = req.body;

    if (!itemId) {
      throw new ValidationError('itemId is required');
    }

    const updates = {};
    if (rejected !== undefined) updates.rejected = rejected;
    if (short !== undefined) updates.short = short;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one of rejected or short must be provided');
    }

    const result = await IncomingInventoryModel.updateRejectedShort(id, itemId, updates, companyId);
    res.json({ success: true, data: result, message: 'Item quantities updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update rejected and short at record level
 * DEPRECATED: This endpoint is deprecated. Use updateItemRejectedShort for individual item updates instead.
 * Received quantity cannot be modified after creation.
 */
const updateRecordLevelRejectedShort = async (req, res, next) => {
  try {
    throw new ValidationError('Record-level updates are deprecated. Use updateItemRejectedShort endpoint to update individual items. Received quantity cannot be modified after creation.');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete incoming inventory (soft delete)
 */
const deleteIncomingInventory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    await IncomingInventoryModel.delete(id, companyId);
    res.json({ success: true, message: 'Incoming inventory deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all rejected items
 */
const getRejectedItems = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      vendor: req.query.vendor,
      brand: req.query.brand,
      sku: req.query.sku,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    const items = await IncomingInventoryModel.getRejectedItems(companyId, filters);
    logger.debug({ requestId: req.id, itemCount: items.length }, 'Fetched rejected items');
    
    // Transform to camelCase
    const transformedItems = items.map(item => ({
      itemId: item.item_id,
      incomingInventoryId: item.incoming_inventory_id,
      skuId: item.sku_id,
      skuCode: item.sku_code,
      skuName: item.sku_name,
      totalQuantity: parseInt(item.total_quantity || 0, 10),
      received: parseInt(item.received || 0, 10),
      rejected: parseInt(item.rejected || 0, 10),
      short: parseInt(item.short || 0, 10),
      challanNumber: item.challan_number,
      challanDate: item.challan_date,
      itemUpdatedAt: item.item_updated_at,
      invoiceNumber: item.invoice_number,
      invoiceDate: item.invoice_date,
      receivingDate: item.receiving_date,
      status: item.status,
      vendorName: item.vendor_name,
      vendorId: item.vendor_id,
      brandName: item.brand_name,
      brandId: item.brand_id,
      productCategory: item.product_category,
      itemCategory: item.item_category,
      subCategory: item.sub_category,
    }));

    res.json({ success: true, data: transformedItems });
  } catch (error) {
    next(error);
  }
};

/**
 * Get price history for a SKU
 */
const getPriceHistory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { skuId } = req.query;

    if (!skuId) {
      throw new ValidationError('SKU ID is required');
    }

    const history = await PriceHistoryModel.getPriceHistory(parseInt(skuId), companyId);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if price history exists for a SKU
 */
const hasPriceHistory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { skuId } = req.query;

    if (!skuId) {
      throw new ValidationError('SKU ID is required');
    }

    const hasHistory = await PriceHistoryModel.hasPriceHistory(parseInt(skuId), companyId);
    res.json({ success: true, data: { hasHistory } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncomingInventory,
  getAllIncomingInventory,
  getIncomingHistory,
  getIncomingInventoryById,
  getIncomingInventoryItems,
  updateIncomingInventoryStatus,
  moveReceivedToRejected,
  moveShortToRejected,
  updateShortItem,
  updateShort,
  updateItemRejectedShort,
  updateRecordLevelRejectedShort,
  getRejectedItems,
  deleteIncomingInventory,
  getPriceHistory,
  hasPriceHistory,
};


