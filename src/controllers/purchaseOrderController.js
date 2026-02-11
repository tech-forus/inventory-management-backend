const PurchaseOrderModel = require('../models/purchaseOrderModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { transformPurchaseOrder } = require('../utils/transformers');

/**
 * Purchase Order Controller
 */

const getAllPurchaseOrders = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const filters = {
            search: req.query.search,
            page: req.query.page,
            limit: req.query.limit,
            offset: req.query.offset
        };
        const orders = await PurchaseOrderModel.getAll(companyId, filters);
        const transformedOrders = orders.map(transformPurchaseOrder);
        res.json({ success: true, data: transformedOrders });
    } catch (error) {
        next(error);
    }
};

const getPurchaseOrderById = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const order = await PurchaseOrderModel.getById(req.params.id, companyId);
        if (!order) {
            throw new NotFoundError('Purchase Order not found');
        }
        res.json({ success: true, data: transformPurchaseOrder(order) });
    } catch (error) {
        next(error);
    }
};

const createPurchaseOrder = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user.userId;

        let poNumber = req.body.poNumber;
        if (!poNumber) {
            // Simple generation: PO-Timestamp-Random
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            poNumber = `PO-${timestamp}-${random}`;
        }

        const poData = {
            ...req.body,
            poNumber
        };

        const order = await PurchaseOrderModel.create(poData, companyId, userId);
        res.json({ success: true, data: transformPurchaseOrder(order) });
    } catch (error) {
        next(error);
    }
};

const updatePurchaseOrderStatus = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { status } = req.body;

        if (!status) {
            throw new ValidationError('Status is required');
        }

        const order = await PurchaseOrderModel.updateStatus(req.params.id, status, companyId);
        if (!order) {
            throw new NotFoundError('Purchase Order not found');
        }
        res.json({ success: true, data: transformPurchaseOrder(order) });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrderStatus
};
