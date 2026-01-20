const pool = require('../models/database');
const { logger } = require('../utils/logger');

/**
 * Ledger Service
 * Handles recording transactions to the inventory_ledgers table.
 */
class LedgerService {
    /**
     * Add a transaction to the inventory ledger.
     * Calculates the new net_balance based on the previous balance.
     * 
     * @param {Object} client - Database client (part of transaction)
     * @param {Object} data - Transaction data
     * @param {number} data.skuId - SKU ID (Integer)
     * @param {string} data.transactionDate - Date of transaction
     * @param {string} data.transactionType - 'OPENING', 'IN', 'OUT', 'REJ'
     * @param {string} data.referenceNumber - Invoice #, Challan #, or other ref
     * @param {string} data.sourceDestination - Vendor Name, Customer Name, etc.
     * @param {string} data.createdBy - ID or Name of creator (Team/User)
     * @param {string} data.createdByName - Name of creator
     * @param {number} data.quantityChange - Positive for IN/OPENING, Negative for OUT/REJ
     * @param {string} data.companyId - Company ID
     */
    static async addTransaction(client, data) {
        try {
            const {
                skuId,
                transactionDate,
                transactionType,
                referenceNumber,
                sourceDestination,
                createdBy,
                createdByName,
                quantityChange,
                companyId
            } = data;

            // 1. Fetch the last net_balance for this SKU
            // Lock the rows for this SKU to ensure sequential processing?
            // Since we are inside a transaction (client), valid.
            // But we need the GLOBAL last balance.
            // Order by transaction_date DESC, created_at DESC, id DESC LIMIT 1

            const lastBalanceResult = await client.query(
                `SELECT net_balance 
         FROM inventory_ledgers 
         WHERE sku_id = $1 AND company_id = $2
         ORDER BY transaction_date DESC, created_at DESC, id DESC 
         LIMIT 1`,
                [skuId, companyId]
            );

            let currentBalance = 0;
            if (lastBalanceResult.rows.length > 0) {
                currentBalance = parseInt(lastBalanceResult.rows[0].net_balance, 10);
            }

            // 2. Calculate new balance
            const change = parseInt(quantityChange, 10);
            const newBalance = currentBalance + change;

            // 3. Insert new record
            const insertResult = await client.query(
                `INSERT INTO inventory_ledgers (
           company_id, sku_id, transaction_date, transaction_type,
           reference_number, source_destination, created_by, created_by_name,
           quantity_change, net_balance, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         RETURNING *`,
                [
                    companyId,
                    skuId,
                    transactionDate,
                    transactionType,
                    referenceNumber,
                    sourceDestination,
                    createdBy || null,
                    createdByName || 'System',
                    change,
                    newBalance
                ]
            );

            logger.info({
                type: 'LEDGER_INSERT',
                skuId,
                type: transactionType,
                change,
                balance: newBalance
            }, 'Recorded ledger transaction');

            return insertResult.rows[0];

        } catch (error) {
            logger.error({ error, data }, 'Error adding ledger transaction');
            throw error;
        }
    }
}

module.exports = LedgerService;
