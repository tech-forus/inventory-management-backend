const CustomerModel = require('../models/customerModel');
const LeadModel = require('../models/leadModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');

/**
 * Sales Controller
 */

// --- Customers ---

const getAllCustomers = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId, role } = req.user; // Assuming req.user populated by auth middleware
        const filters = {
            search: req.query.search,
            limit: req.query.limit,
            offset: req.query.offset
        };
        const customers = await CustomerModel.getAll(companyId, userId, role, filters);
        res.json({ success: true, data: customers });
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId } = req.user;

        // Auto-assign to creator
        const customer = await CustomerModel.create(req.body, companyId, userId);
        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;
        const customer = await CustomerModel.update(id, req.body, companyId);
        if (!customer) throw new NotFoundError('Customer not found');
        res.json({ success: true, data: customer });
    } catch (error) {
        next(error);
    }
};

const reassignCustomer = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { role } = req.user;

        if (role !== 'admin' && role !== 'super_admin') {
            throw new ValidationError('Only admins can reassign customers');
        }

        const { id } = req.params;
        const { assigned_to } = req.body;

        if (!assigned_to) throw new ValidationError('New User ID is required');

        const customer = await CustomerModel.reassign(id, assigned_to, companyId);
        if (!customer) throw new NotFoundError('Customer not found');

        res.json({ success: true, data: customer });
    } catch (error) {
        next(error);
    }
};

// --- Leads ---

const getAllLeads = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId, role } = req.user;
        const filters = {
            status: req.query.status,
            search: req.query.search,
            limit: req.query.limit,
            page: req.query.page, // Handle pagination logic in model or here? Model handles limit/offset.
            offset: req.query.offset // Frontend usually sends limit/offset or page/limit
        };
        const leads = await LeadModel.getAll(companyId, userId, role, filters);
        res.json({ success: true, data: leads });
    } catch (error) {
        next(error);
    }
};

const createLead = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId } = req.user;

        const lead = await LeadModel.create(req.body, companyId, userId);
        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

const updateLead = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        const lead = await LeadModel.update(id, req.body, companyId);
        if (!lead) throw new NotFoundError('Lead not found');
        res.json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

const addFollowUp = async (req, res, next) => {
    try {
        const { id } = req.params; // leadId
        const followUp = await LeadModel.addFollowUp(id, req.body);
        res.status(201).json({ success: true, data: followUp });
    } catch (error) {
        next(error);
    }
};

const markFollowUpDone = async (req, res, next) => {
    try {
        const { fid } = req.params; // followUpId
        const updated = await LeadModel.markFollowUpDone(fid, true);
        if (!updated) throw new NotFoundError('Follow up not found');
        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// --- Dashboard ---

const getDashboardStats = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId, role } = req.user;

        const stats = await LeadModel.getDashboardStats(companyId, userId, role);
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCustomers,
    createCustomer,
    updateCustomer,
    reassignCustomer,
    getAllLeads,
    createLead,
    updateLead,
    addFollowUp,
    markFollowUpDone,
    getDashboardStats
};
