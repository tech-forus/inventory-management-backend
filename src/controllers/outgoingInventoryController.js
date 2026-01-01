const OutgoingInventoryModel = require('../models/outgoingInventoryModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Transform outgoing inventory record from snake_case to camelCase
 */
const transformOutgoingInventory = (record) => {
  if (!record) return null;
  return {
    id: record.id,
    documentType: record.document_type,
    documentSubType: record.document_sub_type,
    vendorSubType: record.vendor_sub_type,
    deliveryChallanSubType: record.delivery_challan_sub_type,
    invoiceChallanDate: record.invoice_challan_date,
    invoiceChallanNumber: record.invoice_challan_number,
    docketNumber: record.docket_number,
    transportorName: record.transportor_name,
    destinationType: record.destination_type,
    destinationId: record.destination_id,
    destinationName: record.customer_name || record.vendor_name || 'Store to Factory',
    dispatchedBy: record.dispatched_by,
    dispatchedByName: record.dispatched_by_name,
    remarks: record.remarks,
    status: record.status,
    totalValue: parseFloat(record.total_value || 0),
    totalQuantity: parseInt(record.total_quantity_sum || 0, 10),
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

/**
 * Transform outgoing inventory item from snake_case to camelCase
 */
const transformOutgoingItem = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    skuId: item.sku_id, // SKU ID (integer)
    skuCode: item.sku_code || item.sku_id, // SKU code string from JOIN
    itemName: item.item_name || 'N/A',
    outgoingQuantity: parseInt(item.outgoing_quantity || 0, 10),
    rejectedQuantity: parseInt(item.rejected_quantity || 0, 10),
    unitPrice: parseFloat(item.unit_price || 0),
    totalValue: parseFloat(item.total_value || item.total_value_incl_gst || 0),
    gstPercentage: parseFloat(item.gst_percentage || 0),
    gstAmount: parseFloat(item.gst_amount || 0),
    totalValueExclGst: parseFloat(item.total_value_excl_gst || 0),
    totalValueInclGst: parseFloat(item.total_value_incl_gst || item.total_value || 0),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
};

/**
 * Transform outgoing inventory history item from snake_case to camelCase
 */
const transformOutgoingHistoryItem = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    date: item.date,
    invoiceChallanDate: item.date, // Alias for backward compatibility
    documentNumber: item.document_number,
    documentType: item.document_type,
    documentSubType: item.document_sub_type,
    vendorSubType: item.vendor_sub_type,
    deliveryChallanSubType: item.delivery_challan_sub_type,
    destination: item.destination,
    sku: item.sku,
    quantity: parseInt(item.quantity || 0, 10),
    value: parseFloat(item.value || 0),
    totalValueExclGst: parseFloat(item.total_value_excl_gst || 0),
    totalValueInclGst: parseFloat(item.total_value_incl_gst || item.value || 0),
    gstPercentage: parseFloat(item.gst_percentage || 0),
    gstAmount: parseFloat(item.gst_amount || 0),
    status: item.status,
    createdAt: item.created_at,
  };
};

/**
 * Outgoing Inventory Controller
 * Handles all outgoing inventory-related operations
 */

/**
 * GET /api/inventory/outgoing
 * Get all outgoing inventory records
 */
const getAllOutgoing = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      destination: req.query.destination,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    const records = await OutgoingInventoryModel.getAll(companyId, filters);
    const transformedRecords = records.map(transformOutgoingInventory);

    res.json({
      success: true,
      data: transformedRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/outgoing/:id
 * Get outgoing inventory by ID
 */
const getOutgoingById = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const record = await OutgoingInventoryModel.getById(id, companyId);
    if (!record) {
      throw new NotFoundError('Outgoing inventory record not found');
    }

    const items = await OutgoingInventoryModel.getItems(id);
    const transformedRecord = transformOutgoingInventory(record);
    const transformedItems = items.map(transformOutgoingItem);

    res.json({
      success: true,
      data: {
        ...transformedRecord,
        items: transformedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/outgoing
 * Create new outgoing inventory
 */
const createOutgoing = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { items, ...inventoryData } = req.body;

    // Validation
    if (!inventoryData.documentType) {
      throw new ValidationError('Document type is required');
    }

    if (!inventoryData.invoiceChallanDate) {
      throw new ValidationError('Invoice/Challan date is required');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    // Validate items
    for (const item of items) {
      if (!item.skuId) {
        throw new ValidationError('SKU ID is required for all items');
      }
      if (!item.outgoingQuantity || item.outgoingQuantity <= 0) {
        throw new ValidationError('Outgoing quantity must be greater than 0');
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        throw new ValidationError('Unit price must be 0 or greater');
      }
    }

    const result = await OutgoingInventoryModel.create(inventoryData, items, companyId);
    const transformedRecord = transformOutgoingInventory(result);
    const transformedItems = result.items.map(transformOutgoingItem);

    logger.info({ outgoingInventoryId: result.id, companyId }, 'Outgoing inventory created');

    res.status(201).json({
      success: true,
      message: 'Outgoing inventory created successfully',
      data: {
        ...transformedRecord,
        items: transformedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/outgoing/history
 * Get outgoing inventory history (item-level data)
 */
const getOutgoingHistory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      destination: req.query.destination,
      sku: req.query.sku,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000,
    };

    const history = await OutgoingInventoryModel.getHistory(companyId, filters);
    const transformedHistory = history.map(transformOutgoingHistoryItem);
    res.json({ success: true, data: transformedHistory });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/inventory/outgoing/:id
 * Delete outgoing inventory
 */
const deleteOutgoing = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    await OutgoingInventoryModel.delete(id, companyId);

    logger.info({ outgoingInventoryId: id, companyId }, 'Outgoing inventory deleted');

    res.json({
      success: true,
      message: 'Outgoing inventory deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOutgoing,
  getOutgoingById,
  createOutgoing,
  getOutgoingHistory,
  deleteOutgoing,
};

