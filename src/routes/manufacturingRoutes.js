const express = require('express');
const router = express.Router();
const ManufacturingController = require('../controllers/manufacturingController');
const { authenticate } = require('../middlewares/auth');

/**
 * Manufacturing Routes
 * All routes require authentication
 */

// Get finished good with BOM components
router.get(
    '/finished-good/:skuId/components',
    authenticate,
    ManufacturingController.getFinishedGoodWithComponents
);

// Process manufacturing/production
router.post(
    '/process',
    authenticate,
    ManufacturingController.processManufacturing
);

// Get manufacturing history
router.get(
    '/history',
    authenticate,
    ManufacturingController.getManufacturingHistory
);

// Get specific manufacturing record details
router.get(
    '/:manufacturingId',
    authenticate,
    ManufacturingController.getManufacturingDetails
);

// Save Bill of Materials
router.post(
    '/bom',
    authenticate,
    ManufacturingController.saveBOM
);

module.exports = router;
