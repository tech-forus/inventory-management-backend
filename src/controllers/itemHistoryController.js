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
        received: record.received || 0,
        rejected: record.rejected || 0,
        short: record.short || 0,
        sourceDestination: record.source_destination,
        vendorName: record.source_destination, // Alias for backward compatibility
        challanNumber: record.challan_number || record.challan_number_ledger || '',
        challanDate: record.challan_date || record.challan_date_ledger || null,
        updatedAt: record.created_at,
        createdAt: record.created_at,
        currentStock: record.current_stock,
        createdBy: record.created_by,
        createdById: record.created_by_id,
        dispatchPersonName: record.dispatch_person_name,
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
        challan_number: record.challan_number || record.challan_number_ledger,
        challan_date: record.challan_date || record.challan_date_ledger,
        updated_at: record.updated_at || record.created_at,
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

        // Parse transaction type filter (can be array or single value)
        let transactionType = req.query.transactionType;
        if (transactionType) {
            if (typeof transactionType === 'string' && transactionType.includes(',')) {
                transactionType = transactionType.split(',').map(t => t.trim());
            } else if (typeof transactionType === 'string') {
                transactionType = [transactionType];
            }
        }

        const filters = {
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            transactionType: transactionType,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        };

        logger.info(`[itemHistoryController] Fetching history for SKU: ${skuId}`, { filters });
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

/**
 * Get summary statistics for item history
 */
const getItemHistorySummary = async (req, res, next) => {
    try {
        const { skuId } = req.params;
        const companyId = getCompanyId(req);

        if (!skuId) {
            throw new ValidationError('SKU ID is required');
        }

        logger.info(`[itemHistoryController] Fetching summary for SKU: ${skuId}`);
        const summary = await ItemHistoryModel.getItemHistorySummary(skuId, companyId);

        logger.info(`[itemHistoryController] Returning summary for SKU: ${skuId}`);
        res.json({ success: true, data: summary });
    } catch (error) {
        logger.error('[itemHistoryController] Error fetching item history summary:', error);
        next(error);
    }
};

module.exports = {
    getItemHistory,
    getItemHistorySummary,
};
