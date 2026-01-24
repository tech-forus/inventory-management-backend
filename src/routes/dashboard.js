const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

/**
 * DASHBOARD ROUTES
 * Optimized endpoints for dashboard data loading
 */

/**
 * GET /api/dashboard/metrics
 * Get all dashboard metrics in a single optimized call
 * Replaces multiple separate API calls:
 * - /api/skus (limited)
 * - /api/skus/analytics/top-selling  
 * - /api/skus/analytics/non-movable
 * - /api/inventory/incoming/history
 * - /api/inventory/outgoing/history
 */
router.get('/metrics', authenticate, dashboardController.getDashboardMetrics);

/**
 * GET /api/dashboard/slow-moving
 * Get slow moving SKUs analysis (separate for performance)
 */
router.get('/slow-moving', authenticate, dashboardController.getSlowMovingSKUs);

module.exports = router;