const QuotationModel = require('../models/quotationModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');

// ─── Create ───────────────────────────────────────────────────────────────────

const createQuotation = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId } = req.user;
        const userFullName = req.user.full_name || req.user.name || '';

        const { items, quote_date, ...rest } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new ValidationError('At least one line item is required');
        }
        if (!quote_date) {
            throw new ValidationError('quote_date is required');
        }

        const quotation = await QuotationModel.create(
            { ...rest, items, quote_date },
            userId,
            userFullName,
            companyId
        );

        res.status(201).json({ success: true, data: quotation });
    } catch (err) {
        next(err);
    }
};

// ─── List ─────────────────────────────────────────────────────────────────────

const getAllQuotations = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const filters = {
            status:   req.query.status,
            lead_id:  req.query.lead_id,
            search:   req.query.search,
            limit:    req.query.limit,
            offset:   req.query.offset,
        };
        const { quotations, total } = await QuotationModel.getAll(companyId, filters);
        res.json({ success: true, data: { quotations, total } });
    } catch (err) {
        next(err);
    }
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

const getQuotation = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const quotation = await QuotationModel.getById(req.params.id, companyId);
        if (!quotation) throw new NotFoundError('Quotation not found');
        res.json({ success: true, data: quotation });
    } catch (err) {
        next(err);
    }
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updateQuotation = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { items, ...rest } = req.body;

        if (items !== undefined && (!Array.isArray(items) || items.length === 0)) {
            throw new ValidationError('items must be a non-empty array');
        }

        const quotation = await QuotationModel.update(
            req.params.id,
            { ...rest, items: items || [] },
            companyId
        );
        if (!quotation) throw new NotFoundError('Quotation not found');
        res.json({ success: true, data: quotation });
    } catch (err) {
        next(err);
    }
};

// ─── Update Status ────────────────────────────────────────────────────────────

const updateStatus = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { status } = req.body;
        if (!status) throw new ValidationError('status is required');

        const quotation = await QuotationModel.updateStatus(req.params.id, status, companyId);
        if (!quotation) throw new NotFoundError('Quotation not found');
        res.json({ success: true, data: quotation });
    } catch (err) {
        next(err);
    }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteQuotation = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const result = await QuotationModel.delete(req.params.id, companyId);
        if (!result) throw new NotFoundError('Quotation not found or not in DRAFT status');
        res.json({ success: true, message: 'Quotation deleted' });
    } catch (err) {
        next(err);
    }
};

// ─── Quotations for a lead ────────────────────────────────────────────────────

const getLeadQuotations = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { quotations } = await QuotationModel.getAll(companyId, { lead_id: req.params.id });
        res.json({ success: true, data: quotations });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createQuotation,
    getAllQuotations,
    getQuotation,
    updateQuotation,
    updateStatus,
    deleteQuotation,
    getLeadQuotations,
};
