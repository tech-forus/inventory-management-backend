const { z } = require('zod');
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
        const { userId, role } = req.user;
        const filters = {
            search: req.query.search,
            limit: req.query.limit,
            offset: req.query.offset,
            stage: req.query.stage,
            newlyAddedDays: req.query.newlyAddedDays,
            customFrom: req.query.customFrom,
            customTo: req.query.customTo,
            notContactedDays: req.query.notContactedDays,
            notContactedFrom: req.query.notContactedFrom,
            notContactedTo: req.query.notContactedTo,
            assignedTo: req.query.assignedTo,
            state: req.query.state,
            hasGst: req.query.hasGst,
            sortBy: req.query.sortBy
        };
        const { customers, total } = await CustomerModel.getAll(companyId, userId, role, filters);
        res.json({ success: true, data: { customers, total } });
    } catch (error) {
        next(error);
    }
};

const getCustomerCounts = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId, role } = req.user;
        const counts = await CustomerModel.getCounts(companyId, userId, role);
        res.json({ success: true, data: counts });
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
        const customer = await CustomerModel.update(null, id, req.body, companyId);
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

const toggleCustomerPin = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;
        const { is_pinned } = req.body;
        const customer = await CustomerModel.update(null, id, { is_pinned }, companyId);
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
            offset: req.query.offset,
            followup_state: req.query.followup_state,
            today: req.query.today,
        };
        const { leads, total } = await LeadModel.getAll(companyId, userId, role, filters);
        res.json({ success: true, data: { leads, total } });
    } catch (error) {
        next(error);
    }
};

const getLeadCounts = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { userId, role } = req.user;
        const counts = await LeadModel.getCounts(companyId, userId, role);
        res.json({ success: true, data: counts });
    } catch (error) {
        next(error);
    }
};

const getLead = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;
        const lead = await LeadModel.getById(id, companyId);
        if (!lead) throw new NotFoundError('Lead not found');
        res.json({ success: true, data: lead });
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

        const lead = await LeadModel.update(id, companyId, req.body);
        if (!lead) throw new NotFoundError('Lead not found');

        // Auto-promote customer: potential → existing when lead is WON
        if (lead.status === 'WON' && lead.customer_id) {
            try {
                await CustomerModel.update(null, lead.customer_id, { customer_stage: 'existing' }, companyId);
            } catch (promoteErr) {
                console.error('[updateLead] Failed to auto-promote customer:', promoteErr.message);
                // Non-blocking: lead update still succeeds even if promotion fails
            }
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

const deleteLead = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;
        const lead = await LeadModel.delete(id, companyId);
        if (!lead) throw new NotFoundError('Lead not found');
        res.json({ success: true, data: lead, message: 'Lead deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const toggleLeadPin = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;
        const { is_pinned } = req.body;
        const lead = await LeadModel.togglePin(id, companyId, is_pinned);
        if (!lead) throw new NotFoundError('Lead not found');
        res.json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

// Follow-ups

const createFollowupSchema = z.object({
    scheduledAt: z.string().datetime(), // ISO string
    note: z.string().optional(),
});

const addFollowUp = async (req, res, next) => {
    try {
        const { id } = req.params; // leadId
        const { userId } = req.user;

        const validated = createFollowupSchema.parse({
            scheduledAt: req.body.scheduled_at,
            note: req.body.note
        });

        const followUp = await LeadModel.addFollowUp(id, {
            scheduled_at: validated.scheduledAt,
            note: validated.note
        }, userId);

        res.status(201).json({ success: true, data: followUp });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return next(new ValidationError(error.errors[0].message));
        }
        next(error);
    }
};

const completeFollowup = async (req, res, next) => {
    try {
        const { fid } = req.params; // followUpId
        const updated = await LeadModel.completeFollowUp(fid);
        if (!updated) throw new NotFoundError('Follow up not found or already closed');
        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// Activity Log

const VALID_ACTIVITY_TYPES = ['CALL', 'MAIL', 'MEET', 'CHAT', 'QUOTE'];

const addActivity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;
        const companyId = getCompanyId(req);
        const { type, note, logged_at } = req.body;

        if (!VALID_ACTIVITY_TYPES.includes(type)) {
            throw new ValidationError(`Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
        }

        const activity = await LeadModel.addActivity(id, { type, note, logged_at }, userId, companyId);
        res.status(201).json({ success: true, data: activity });
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
    getCustomerCounts,
    createCustomer,
    updateCustomer,
    reassignCustomer,
    getAllLeads,
    getLeadCounts,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    addFollowUp,
    completeFollowup,
    addActivity,
    getDashboardStats,
    toggleCustomerPin,
    toggleLeadPin
};
