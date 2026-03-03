const QuotationModel = require('../models/quotationModel');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { generateQuotationPDF } = require('../utils/pdfGenerator');
const emailService = require('../utils/emailService');
const { format } = require('date-fns');

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

        const formatDate = (dateStr) => {
            if (!dateStr) return '—';
            try {
                return format(new Date(dateStr), 'dd MMMM yyyy');
            } catch {
                return dateStr;
            }
        };

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(amount || 0);
        };

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #4f46e5; padding: 24px; text-align: left;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em;">QUOTATION</h1>
                    <p style="color: #c7d2fe; margin: 4px 0 0; font-size: 13px; font-weight: 500;">#${quotation.quote_no}</p>
                </div>
                
                <div style="padding: 32px 24px;">
                    <p style="margin-top: 0; font-size: 16px; font-weight: 500;">Dear ${quotation.customer_name || 'Customer/Partner'},</p>
                    <p style="color: #4b5563; font-size: 15px;">Please find attached the quotation as discussed. We've included a summary of the details below for your quick reference:</p>
                    
                    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                        <h2 style="margin: 0 0 16px; font-size: 12px; font-weight: 800; color: #6b7280; letter-spacing: 0.08em; text-transform: uppercase;">Quotation Summary</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 140px;">Quote Date</td>
                                <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${formatDate(quotation.quote_date)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Valid Until</td>
                                <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${formatDate(quotation.valid_until)}</td>
                            </tr>
                            <tr style="border-top: 1px solid #e5e7eb;">
                                <td style="padding: 12px 0 0; color: #4f46e5; font-size: 15px; font-weight: 700;">Grand Total</td>
                                <td style="padding: 12px 0 0; color: #4f46e5; font-size: 20px; font-weight: 800;">${formatCurrency(quotation.grand_total)}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 14px;">The complete breakdown of items and terms is available in the attached PDF invoice.</p>
                    <p style="color: #4b5563; font-size: 14px; margin-bottom: 0;">If you have any questions, feel free to reply to this email.</p>
                </div>
                
                <div style="padding: 0 24px 32px;">
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 24px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #111827;">Best Regards,</p>
                    <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #374151;">${quotation.assigned_to_name || 'Sales Department'}</p>
                    <p style="margin: 2px 0 0; font-size: 13px; color: #6b7280;">${companyName}</p>
                </div>
                
                <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #f3f4f6;">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">This is an automated quotation delivery from ${companyName}.</p>
                </div>
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
