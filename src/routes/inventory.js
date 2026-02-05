const express = require('express');
const router = express.Router();
const { authenticate, getCompanyId } = require('../middlewares/auth');
const incomingInventoryController = require('../controllers/incomingInventoryController');
const outgoingInventoryController = require('../controllers/outgoingInventoryController');
const rejectedItemReportController = require('../controllers/rejectedItemReportController');
const itemHistoryController = require('../controllers/itemHistoryController');
const { validateRequired, validateArray, validateDate, validateNumeric, validateIncomingItems, validateIncomingInventorySupplier } = require('../middlewares/validation');
const pool = require('../models/database');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/inventory
 * Get all inventory items (SKUs with stock info) - for dashboard
 */
router.get('/', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    const {
      search,
      productCategory,
      itemCategory,
      subCategory,
      brand,
      stockStatus,
      vendorId,
    } = req.query;

    let query = `
      SELECT 
        s.id,
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.min_stock_level as min_stock,
        s.product_category_id,
        s.item_category_id,
        s.sub_category_id,
        s.brand_id,
        s.vendor_id,
        pc.name as product_category,
        ic.name as item_category,
        sc.name as sub_category,
        b.name as brand,
        COALESCE(last_vendor.name, v.name) as vendor,
        latest_incoming.unit_price as last_purchase_price
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date, iii.unit_price, ii.vendor_id
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id 
          AND ii.company_id = $1 
          AND ii.is_active = true 
          AND ii.status = 'completed'
          AND ii.vendor_id IS NOT NULL
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      LEFT JOIN vendors last_vendor ON latest_incoming.vendor_id = last_vendor.id
      WHERE s.company_id = $1 AND s.is_active = true
    `;
    const params = [companyId];
    let paramIndex = 2;

    // Add filters
    if (search) {
      const searchTrimmed = search.trim().replace(/\s+/g, '');
      query += ` AND (REPLACE(s.sku_id, ' ', '') ILIKE $${paramIndex} OR REPLACE(s.item_name, ' ', '') ILIKE $${paramIndex})`;
      params.push(`%${searchTrimmed}%`);
      paramIndex++;
    }
    if (productCategory) {
      query += ` AND s.product_category_id = $${paramIndex}`;
      params.push(productCategory);
      paramIndex++;
    }
    if (itemCategory) {
      query += ` AND s.item_category_id = $${paramIndex}`;
      params.push(itemCategory);
      paramIndex++;
    }
    if (subCategory) {
      query += ` AND s.sub_category_id = $${paramIndex}`;
      params.push(subCategory);
      paramIndex++;
    }
    if (brand) {
      query += ` AND s.brand_id = $${paramIndex}`;
      params.push(brand);
      paramIndex++;
    }
    if (stockStatus) {
      if (stockStatus === 'critical') {
        query += ` AND s.current_stock = 0 AND s.min_stock_level > 0`;
      } else if (stockStatus === 'out') {
        query += ` AND s.current_stock = 0 AND (s.min_stock_level <= 0 OR s.min_stock_level IS NULL)`;
      } else if (stockStatus === 'low') {
        query += ` AND s.current_stock > 0 AND s.current_stock < s.min_stock_level`;
      } else if (stockStatus === 'in') {
        query += ` AND s.current_stock > 0 AND s.current_stock >= s.min_stock_level`;
      }
    }
    if (vendorId) {
      query += ` AND (s.vendor_id = $${paramIndex} OR s.vendor_id IS NULL)`;
      params.push(vendorId);
      paramIndex++;
    }

    query += ` ORDER BY s.item_name ASC`;

    const result = await pool.query(query, params);

    // Transform to camelCase
    const transformedData = result.rows.map(row => ({
      id: row.id,
      skuId: row.sku_id,
      itemName: row.item_name,
      currentStock: parseInt(row.current_stock || 0, 10),
      minStock: parseInt(row.min_stock || 0, 10),
      productCategoryId: row.product_category_id,
      itemCategoryId: row.item_category_id,
      subCategoryId: row.sub_category_id,
      brandId: row.brand_id,
      vendorId: row.vendor_id,
      productCategory: row.product_category,
      itemCategory: row.item_category,
      subCategory: row.sub_category,
      brand: row.brand,
      vendor: row.vendor,
      lastPurchasePrice: row.last_purchase_price,
    }));

    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
});

// Incoming Inventory Routes
router.post(
  '/incoming',
  validateRequired(['invoiceNumber', 'invoiceDate', 'items']),
  validateDate('invoiceDate', true), // Required field
  validateArray('items', 1),
  validateIncomingInventorySupplier(), // Validates vendorId/brandId OR destinationId conditionally
  validateIncomingItems(),
  incomingInventoryController.createIncomingInventory
);

router.get('/incoming', incomingInventoryController.getAllIncomingInventory);
router.get('/incoming/history', incomingInventoryController.getIncomingHistory);
router.get('/incoming/price-history', incomingInventoryController.getPriceHistory);
router.get('/incoming/has-price-history', incomingInventoryController.hasPriceHistory);
router.get('/incoming/warranty-serial-items', incomingInventoryController.getAllWarrantySerialItems);
router.get('/incoming/by-invoice/:invoiceNumber', incomingInventoryController.getItemsByInvoiceNumber);
router.get('/incoming/search-invoices', incomingInventoryController.searchInvoices);
router.get('/incoming/:id', incomingInventoryController.getIncomingInventoryById);
router.get('/incoming/:id/items', incomingInventoryController.getIncomingInventoryItems);

router.put(
  '/incoming/:id/status',
  validateRequired(['status']),
  incomingInventoryController.updateIncomingInventoryStatus
);

router.put(
  '/incoming/:id/short',
  validateRequired(['items']),
  validateArray('items', 1),
  incomingInventoryController.updateShort
);

router.post(
  '/incoming/:id/move-to-rejected',
  validateRequired(['itemId']),
  validateNumeric('itemId'),
  validateNumeric('quantity', 0),
  incomingInventoryController.moveShortToRejected
);

router.post(
  '/incoming/:id/move-received-to-rejected',
  validateRequired(['itemId']),
  validateNumeric('itemId'),
  validateNumeric('quantity', 0),
  incomingInventoryController.moveReceivedToRejected
);

router.put(
  '/incoming/:id/update-short-item',
  validateRequired(['itemId']),
  validateNumeric('itemId'),
  validateNumeric('received', 0),
  validateNumeric('short', 0),
  validateDate('challanDate', false), // Optional field
  incomingInventoryController.updateShortItem
);

router.put(
  '/incoming/:id/update-item-rejected-short',
  validateRequired(['itemId']),
  validateNumeric('itemId'),
  validateNumeric('rejected', 0),
  validateNumeric('short', 0),
  incomingInventoryController.updateItemRejectedShort
);

router.put(
  '/incoming/:id/update-record-level',
  validateNumeric('rejected', 0),
  validateNumeric('short', 0),
  incomingInventoryController.updateRecordLevelRejectedShort
);

router.get(
  '/incoming/rejected-items',
  incomingInventoryController.getRejectedItems
);

router.delete('/incoming/:id', incomingInventoryController.deleteIncomingInventory);

// Warranty and Serial Number Routes
// IMPORTANT: More specific routes must come before parameterized routes
router.put('/incoming-items/bulk-update', incomingInventoryController.bulkUpdateWarrantyAndSerial);
router.put('/incoming-items/:itemId', incomingInventoryController.updateWarrantyAndSerial);

// Rejected Item Reports Routes
router.get('/rejected-item-reports', rejectedItemReportController.getAllRejectedItemReports);
router.get('/rejected-item-reports/:id', rejectedItemReportController.getRejectedItemReportById);
router.post(
  '/rejected-item-reports',
  validateRequired(['incomingInventoryId', 'incomingInventoryItemId', 'skuId', 'itemName', 'quantity']),
  validateNumeric('incomingInventoryId'),
  validateNumeric('incomingInventoryItemId'),
  validateNumeric('skuId'),
  validateNumeric('quantity'),
  validateDate('inspectionDate', false),
  rejectedItemReportController.createRejectedItemReport
);
router.put(
  '/rejected-item-reports/:id',
  validateNumeric('sentToVendor', false),
  validateNumeric('receivedBack', false),
  validateNumeric('scrapped', false),
  validateNumeric('netRejected', false),
  validateDate('inspectionDate', false),
  rejectedItemReportController.updateRejectedItemReport
);
router.delete('/rejected-item-reports/:id', rejectedItemReportController.deleteRejectedItemReport);

// Short Item Reports Routes
const shortItemReportController = require('../controllers/shortItemReportController');
router.get('/short-item-reports', shortItemReportController.getAllShortItemReports);
router.get('/short-item-reports/:id', shortItemReportController.getShortItemReportById);

// Item History Routes (Unified incoming + outgoing)
router.get('/items/:skuId/history', itemHistoryController.getItemHistory);
router.get('/items/:skuId/history/summary', itemHistoryController.getItemHistorySummary);

/**
 * GET /api/inventory/outgoing/history
 * Get outgoing inventory history (stub - returns empty for now)
 */
/**
 * OUTGOING INVENTORY ROUTES
 */
router.post('/outgoing', outgoingInventoryController.createOutgoing);
router.get('/outgoing', outgoingInventoryController.getAllOutgoing);
router.get('/outgoing/history', outgoingInventoryController.getOutgoingHistory);
router.get('/outgoing/warranty-serial-items', outgoingInventoryController.getAllWarrantySerialItems);
router.get('/outgoing/:id', outgoingInventoryController.getOutgoingById);
router.delete('/outgoing/:id', outgoingInventoryController.deleteOutgoing);

module.exports = router;


