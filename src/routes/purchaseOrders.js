const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const purchaseOrderController = require('../controllers/purchaseOrderController');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/purchase-orders
 * Get all purchase orders with filters
 */
router.get('/', purchaseOrderController.getAllPurchaseOrders);

/**
 * POST /api/purchase-orders
 * Create a new purchase order
 */
router.post('/', purchaseOrderController.createPurchaseOrder);

/**
 * GET /api/purchase-orders/next-number
 * Get the next available PO number
 */
router.get('/next-number', purchaseOrderController.getNextPoNumber);

/**
 * GET /api/purchase-orders/:id
 * Get purchase order by ID
 */
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

/**
 * PATCH /api/purchase-orders/:id/status
 * Update purchase order status
 */
router.patch('/:id/status', purchaseOrderController.updatePurchaseOrderStatus);

module.exports = router;
