const ItemHistoryModel = require('../models/itemHistoryModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Transform item history record from snake_case to camelCase
 */
const transformHistoryRecord = (record) => {
    return {
        itemId: record.item_id,
        transactionId: record.transaction_id,
        transactionType: record.transaction_type,
        invoiceNumber: record.invoice_number,
        invoiceDate: record.invoice_date,
        transactionDate: record.transaction_date,
        receivingDate: record.transaction_date, // Alias for backward compatibility
        itemName: record.item_name,
        skuId: record.sku_id,
        skuCode: record.sku_code,
        totalQuantity: record.total_quantity,
        received: record.received,
        rejected: record.rejected,
        short: record.short,
        sourceDestination: record.source_destination,
        vendorName: record.source_destination, // Alias for backward compatibility
        challanNumber: record.challan_number,
        challanDate: record.challan_date,
        updatedAt: record.updated_at,
        createdAt: record.created_at,
        currentStock: record.current_stock,
        // Keep snake_case for backward compatibility
        item_id: record.item_id,
        transaction_id: record.transaction_id,
        transaction_type: record.transaction_type,
        invoice_number: record.invoice_number,
        invoice_date: record.invoice_date,
        transaction_date: record.transaction_date,
        receiving_date: record.transaction_date,
        item_name: record.item_name,
        sku_id: record.sku_id,
        sku_code: record.sku_code,
        total_quantity: record.total_quantity,
        source_destination: record.source_destination,
        vendor_name: record.source_destination,
        challan_number: record.challan_number,
        challan_date: record.challan_date,
        updated_at: record.updated_at,
        created_at: record.created_at,
        current_stock: record.current_stock,
    };
};

/**
 * Get complete item history (incoming + outgoing transactions)
 */
const getItemHistory = async (req, res, next) => {
    try {
        const { skuId } = req.params;
        const companyId = getCompanyId(req);

        if (!skuId) {
            throw new ValidationError('SKU ID is required');
        }

        const filters = {
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        };

        logger.info(`[itemHistoryController] Fetching history for SKU: ${skuId}`);
        const history = await ItemHistoryModel.getItemHistory(skuId, companyId, filters);

        // Transform records from snake_case to camelCase
        const transformedHistory = history.map(transformHistoryRecord);

        logger.info(`[itemHistoryController] Returning ${transformedHistory.length} history records`);
        res.json({ success: true, data: transformedHistory });
    } catch (error) {
        logger.error('[itemHistoryController] Error fetching item history:', error);
        next(error);
    }
};

module.exports = {
    getItemHistory,
};
