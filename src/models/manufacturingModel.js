const pool = require('./database');
const { logger } = require('../utils/logger');
const LedgerService = require('../services/ledgerService');

/**
 * Manufacturing Model
 * Handles database operations for Bill of Materials (BOM) and Production
 */
class ManufacturingModel {
    /**
     * Get finished good with its BOM components
     */
    static async getFinishedGoodWithComponents(skuId, companyId) {
        // 1. Get finished good details
        const finishedGoodRes = await pool.query(
            `SELECT 
        s.id, s.sku_id, s.item_name, s.current_stock, s.min_stock_level, s.unit,
        pc.name as product_category,
        ic.name as item_category
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      WHERE s.id = $1 AND s.company_id = $2 AND s.is_active = true`,
            [skuId, companyId.toUpperCase()]
        );

        if (finishedGoodRes.rows.length === 0) {
            return null;
        }

        // 2. Get BOM components
        const componentsRes = await pool.query(
            `SELECT 
        bm.id,
        bm.raw_material_sku_id,
        bm.quantity_required,
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.unit,
        s.min_stock_level
      FROM bom_materials bm
      JOIN skus s ON bm.raw_material_sku_id = s.id
      WHERE bm.finished_good_sku_id = $1 AND bm.company_id = $2 AND bm.is_active = true`,
            [skuId, companyId.toUpperCase()]
        );

        return {
            finishedGood: finishedGoodRes.rows[0],
            components: componentsRes.rows
        };
    }

    /**
     * Process manufacturing / production run
     * Atomic transaction: Deduct raw materials, Add finished good, Create records
     */
    static async processManufacturing(data, companyId, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const {
                finishedGoodSkuId,
                quantity,
                components,
                batchNumber,
                productionLocation,
                notes,
                manufactureDate
            } = data;

            const companyIdUpper = companyId.toUpperCase();
            const mfgDate = manufactureDate || new Date();

            // --- 1. Create Outgoing Inventory Record (Raw Materials Consumption) ---
            const outgoingResult = await client.query(
                `INSERT INTO outgoing_inventory (
          company_id, document_type, invoice_challan_date, invoice_challan_number,
          destination_type, remarks, status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id`,
                [
                    companyIdUpper,
                    'manufacturing',
                    mfgDate,
                    batchNumber ? `MFG-${batchNumber}` : `MFG-COMP-${Date.now()}`,
                    'store_to_factory',
                    `Raw material consumption for manufacturing run. Batch: ${batchNumber || 'N/A'}`,
                    'completed'
                ]
            );
            const outgoingId = outgoingResult.rows[0].id;

            // --- 2. Process each raw material component ---
            for (const component of components) {
                const requiredQty = component.quantity_required * quantity;

                // Update stock
                const stockUpdateRes = await client.query(
                    `UPDATE skus 
           SET current_stock = current_stock - $1 
           WHERE id = $2 AND company_id = $3 AND current_stock >= $1
           RETURNING sku_id, item_name, current_stock`,
                    [requiredQty, component.raw_material_sku_id, companyIdUpper]
                );

                if (stockUpdateRes.rows.length === 0) {
                    throw new Error(`Insufficient stock for ${component.item_name} (SKU: ${component.sku_id})`);
                }

                // Create outgoing item record
                await client.query(
                    `INSERT INTO outgoing_inventory_items (
            outgoing_inventory_id, sku_id, outgoing_quantity, status
          ) VALUES ($1, $2, $3, 'completed')`,
                    [outgoingId, component.raw_material_sku_id, requiredQty]
                );

                // Ledger Entry (OUT)
                await LedgerService.addTransaction(client, {
                    skuId: component.raw_material_sku_id,
                    transactionDate: mfgDate,
                    transactionType: 'OUT',
                    referenceNumber: `MFG-${batchNumber || 'RUN'}`,
                    sourceDestination: productionLocation || 'Production Unit',
                    createdBy: userId,
                    createdByName: data.createdByName || 'User',
                    quantityChange: -requiredQty,
                    companyId: companyIdUpper
                });
            }

            // --- 3. Create Incoming Inventory Record (Finished Good Addition) ---
            const incomingResult = await client.query(
                `INSERT INTO incoming_inventory (
          company_id, invoice_date, invoice_number, receiving_date, 
          reason, remarks, status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id`,
                [
                    companyIdUpper,
                    mfgDate,
                    batchNumber ? `MFG-${batchNumber}` : `MFG-PROD-${Date.now()}`,
                    mfgDate,
                    'from_factory',
                    `Finished good produced from manufacturing run. Batch: ${batchNumber || 'N/A'}`,
                    'completed'
                ]
            );
            const incomingId = incomingResult.rows[0].id;

            // Update finished good stock
            await client.query(
                `UPDATE skus SET current_stock = current_stock + $1 WHERE id = $2 AND company_id = $3`,
                [quantity, finishedGoodSkuId, companyIdUpper]
            );

            // Create incoming item record
            await client.query(
                `INSERT INTO incoming_inventory_items (
          incoming_inventory_id, sku_id, received, total_quantity
        ) VALUES ($1, $2, $3, $3)`,
                [incomingId, finishedGoodSkuId, quantity]
            );

            // Ledger Entry (IN)
            await LedgerService.addTransaction(client, {
                skuId: finishedGoodSkuId,
                transactionDate: mfgDate,
                transactionType: 'IN',
                referenceNumber: `MFG-${batchNumber || 'RUN'}`,
                sourceDestination: productionLocation || 'Production Unit',
                createdBy: userId,
                createdByName: data.createdByName || 'User',
                quantityChange: quantity,
                companyId: companyIdUpper
            });

            // --- 4. Create Main Manufacturing Record ---
            const mfgRecordRes = await client.query(
                `INSERT INTO manufacturing_records (
          company_id, finished_good_sku_id, quantity, manufacture_date,
          batch_number, production_location, notes, status,
          incoming_inventory_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
                [
                    companyIdUpper,
                    finishedGoodSkuId,
                    quantity,
                    mfgDate,
                    batchNumber || null,
                    productionLocation || null,
                    notes || null,
                    'completed',
                    incomingId,
                    userId
                ]
            );
            const manufacturingId = mfgRecordRes.rows[0].id;

            // --- 5. Record Components Used for traceability ---
            for (const component of components) {
                const requiredQty = component.quantity_required * quantity;
                await client.query(
                    `INSERT INTO manufacturing_components (
            manufacturing_id, raw_material_sku_id, quantity_used, outgoing_inventory_id
          ) VALUES ($1, $2, $3, $4)`,
                    [manufacturingId, component.raw_material_sku_id, requiredQty, outgoingId]
                );
            }

            await client.query('COMMIT');
            return { manufacturingId, incomingId, outgoingId };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error({ error: error.message, stack: error.stack }, 'Manufacturing Process Failed');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get manufacturing history
     */
    static async getHistory(companyId, filters = {}) {
        let query = `
      SELECT 
        mr.*,
        s.sku_id,
        s.item_name as finished_good_name,
        u.email as created_by_email
      FROM manufacturing_records mr
      JOIN skus s ON mr.finished_good_sku_id = s.id
      LEFT JOIN users u ON mr.created_by = u.id
      WHERE mr.company_id = $1
    `;
        const params = [companyId.toUpperCase()];
        let paramIndex = 2;

        if (filters.dateFrom) {
            query += ` AND mr.manufacture_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }
        if (filters.dateTo) {
            query += ` AND mr.manufacture_date <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }
        if (filters.finishedGoodSkuId) {
            query += ` AND mr.finished_good_sku_id = $${paramIndex}`;
            params.push(filters.finishedGoodSkuId);
            paramIndex++;
        }

        query += ` ORDER BY mr.manufacture_date DESC, mr.created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filters.limit);
        }

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Get specific manufacturing record details
     */
    static async getDetails(manufacturingId, companyId) {
        // 1. Get header
        const headerRes = await pool.query(
            `SELECT 
        mr.*,
        s.sku_id,
        s.item_name as finished_good_name,
        u.email as created_by_email
      FROM manufacturing_records mr
      JOIN skus s ON mr.finished_good_sku_id = s.id
      LEFT JOIN users u ON mr.created_by = u.id
      WHERE mr.id = $1 AND mr.company_id = $2`,
            [manufacturingId, companyId.toUpperCase()]
        );

        if (headerRes.rows.length === 0) {
            return null;
        }

        // 2. Get components
        const componentsRes = await pool.query(
            `SELECT 
        mc.quantity_used,
        s.sku_id,
        s.item_name,
        s.unit
      FROM manufacturing_components mc
      JOIN skus s ON mc.raw_material_sku_id = s.id
      WHERE mc.manufacturing_id = $1`,
            [manufacturingId]
        );

        return {
            ...headerRes.rows[0],
            components: componentsRes.rows
        };
    }
}

module.exports = ManufacturingModel;
