const QuotationModel = require('../models/quotationModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { generateQuotationPDF } = require('../utils/pdfGenerator');
const emailService = require('../utils/emailService');

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
            status: req.query.status,
            lead_id: req.query.lead_id,
            search: req.query.search,
            limit: req.query.limit,
            offset: req.query.offset,
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

// ─── Send Quotation via Email ─────────────────────────────────────────────────

const sendQuotationEmail = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const quotationId = req.params.id;

        // 1. Fetch full quotation details
        const quotation = await QuotationModel.getById(quotationId, companyId);
        if (!quotation) throw new NotFoundError('Quotation not found');

        if (!quotation.customer_email) {
            throw new ValidationError('Customer email is not provided for this quotation');
        }

        // 2. Generate PDF Buffer
        const pdfBuffer = await generateQuotationPDF(quotation);

        // 3. Prepare Email Content
        const companyName = quotation.company_name || 'ForusBiz';
        const subject = `Quotation #${quotation.quote_no} from ${companyName}`;

        const html = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #374151; max-width: 600px;">
                <h2 style="color: #4f46e5;">Quotation #${quotation.quote_no}</h2>
                <p>Dear ${quotation.customer_name || 'Customer'},</p>
                <p>Please find attached the quotation as discussed. Below is a brief summary:</p>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <table style="width: 100%;">
                        <tr><td style="color: #6b7280; width: 120px;">Date:</td><td><strong>${quotation.quote_date}</strong></td></tr>
                        <tr><td style="color: #6b7280;">Valid Until:</td><td><strong>${quotation.valid_until || '—'}</strong></td></tr>
                        <tr><td style="color: #6b7280;">Grand Total:</td><td style="font-size: 18px; color: #4f46e5;"><strong>₹${quotation.grand_total.toLocaleString('en-IN')}</strong></td></tr>
                    </table>
                </div>
                <p>If you have any questions or would like to proceed, please feel free to reply to this email.</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="font-size: 14px; color: #6b7280;">Best Regards,<br><strong>${quotation.assigned_to_name || 'Sales Department'}</strong><br>${companyName}</p>
            </div>
        `;

        // 4. Send Email
        await emailService.sendEmail({
            to: quotation.customer_email,
            subject,
            html,
            attachments: [
                {
                    filename: `Quotation_${quotation.quote_no}.pdf`,
                    content: pdfBuffer,
                }
            ]
        });

        // 5. Update Status to 'SENT' if it was 'DRAFT'
        if (quotation.status === 'DRAFT') {
            await QuotationModel.updateStatus(quotationId, 'SENT', companyId);
        }

        res.json({ success: true, message: 'Email sent successfully' });
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
    sendQuotationEmail,
};
