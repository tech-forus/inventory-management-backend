const ManufacturingModel = require('../models/manufacturingModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');

/**
 * Manufacturing Controller
 * Handles manufacturing/production related requests
 */

/**
 * Get finished good with its component BOM
 */
const getFinishedGoodWithComponents = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { skuId } = req.params;

        if (!skuId) {
            throw new ValidationError('SKU ID is required');
        }

        const data = await ManufacturingModel.getFinishedGoodWithComponents(skuId, companyId);

        if (!data) {
            throw new NotFoundError('Finished good not found');
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Process a manufacturing run
 */
const processManufacturing = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user.userId;
        const userEmail = req.user.email;

        const {
            finishedGoodSkuId,
            quantity,
            components,
            batchNumber,
            productionLocation,
            notes,
            manufactureDate
        } = req.body;

        // Validation
        if (!finishedGoodSkuId) throw new ValidationError('Finished good SKU ID is required');
        if (!quantity || quantity <= 0) throw new ValidationError('Quantity must be greater than zero');
        if (!components || !Array.isArray(components) || components.length === 0) {
            throw new ValidationError('At least one component is required');
        }

        const result = await ManufacturingModel.processManufacturing({
            finishedGoodSkuId,
            quantity,
            components,
            batchNumber,
            productionLocation,
            notes,
            manufactureDate,
            createdByName: userEmail // Pass email as creator name
        }, companyId, userId);

        res.json({
            success: true,
            message: 'Manufacturing process completed successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get manufacturing history
 */
const getManufacturingHistory = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const filters = {
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            finishedGoodSkuId: req.query.finishedGoodSkuId,
            limit: parseInt(req.query.limit) || 50
        };

        const history = await ManufacturingModel.getHistory(companyId, filters);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get specific manufacturing record details
 */
const getManufacturingDetails = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { manufacturingId } = req.params;

        const details = await ManufacturingModel.getDetails(manufacturingId, companyId);

        if (!details) {
            throw new NotFoundError('Manufacturing record not found');
        }

        res.json({
            success: true,
            data: details
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Save Bill of Materials
 */
const saveBOM = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user.userId;
        const { finishedGoodSkuId, components } = req.body;

        if (!finishedGoodSkuId) {
            throw new ValidationError('Finished good SKU ID is required');
        }

        if (!components || !Array.isArray(components)) {
            throw new ValidationError('Components list is required');
        }

        await ManufacturingModel.saveBOM({
            finishedGoodSkuId,
            components
        }, companyId, userId);

        res.json({
            success: true,
            message: 'Bill of Materials saved successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFinishedGoodWithComponents,
    processManufacturing,
    getManufacturingHistory,
    getManufacturingDetails,
    saveBOM
};
