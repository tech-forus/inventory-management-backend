const pool = require('./database');

/**
 * Generates the next quote number for a company and returns it.
 * Mirrors the PO number pattern: queries the quotations table for the last
 * number with this month's prefix, then increments by 1.
 *
 * Format: Q-YYMM-<COMPANY_INITIALS>-<seq 001-999>
 * Example: Q-2602-FEPL-0001
 */
async function nextQuoteNo(client, companyId) {
    // Get company initials from companies table (same as PO pattern)
    const companyRes = await client.query(
        'SELECT company_name FROM companies WHERE company_id = $1',
        [companyId.toUpperCase()]
    );

    let initials = 'FC'; // Fallback
    if (companyRes.rows.length > 0 && companyRes.rows[0].company_name) {
        const name = companyRes.rows[0].company_name;
        initials = name.trim().split(/\s+/)
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `Q-${yy}${mm}-${initials}-`;

    // Find the last quote_no with this prefix for this company
    const result = await client.query(`
        SELECT quote_no FROM quotations
        WHERE quote_no LIKE $1 AND company_id = $2
        ORDER BY LENGTH(quote_no) DESC, quote_no DESC
        LIMIT 1
    `, [`${prefix}%`, companyId.toUpperCase()]);

    let sequence = 1;
    if (result.rows.length > 0) {
        const lastNo = result.rows[0].quote_no;
        const lastSeqStr = lastNo.replace(prefix, '');
        const lastSeq = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`;
}

class QuotationModel {

    /**
     * Create a new quotation (DRAFT) with its line items.
     * All writes happen in a single transaction.
     */
    static async create(data, userId, userFullName, companyId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const quoteNo = await nextQuoteNo(client, companyId);

            const qRes = await client.query(`
                INSERT INTO quotations (
                    company_id, lead_id, quote_no, version, status,
                    quote_date, valid_until,
                    customer_name, customer_company, customer_email, customer_phone,
                    customer_gst_no, billing_address, consigning_address,
                    subtotal, overall_disc_type, overall_disc_value, overall_disc_amt,
                    taxable_amt, total_tax, grand_total,
                    terms_text, internal_notes,
                    assigned_to, created_by
                ) VALUES (
                    $1,$2,$3,$4,'DRAFT',
                    $5,$6,
                    $7,$8,$9,$10,
                    $11,$12,$13,
                    $14,$15,$16,$17,
                    $18,$19,$20,
                    $21,$22,
                    $23,$23
                )
                RETURNING *
            `, [
                companyId,
                data.lead_id || null,
                quoteNo,
                data.version || 'V1',
                data.quote_date,
                data.valid_until || null,
                data.customer_name || null,
                data.customer_company || null,
                data.customer_email || null,
                data.customer_phone || null,
                data.customer_gst_no || null,
                data.billing_address || null,
                data.consigning_address || null,
                data.subtotal || 0,
                data.overall_disc_type || 'pct',
                data.overall_disc_value || 0,
                data.overall_disc_amt || 0,
                data.taxable_amt || 0,
                data.total_tax || 0,
                data.grand_total || 0,
                data.terms_text || null,
                data.internal_notes || null,
                userId,
            ]);

            const quotation = qRes.rows[0];

            // Insert line items
            const items = data.items || [];
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                await client.query(`
                    INSERT INTO quotation_items
                        (quotation_id, sort_order, sku_code, item_name, brand, hsn, qty, unit, rate, discount_pct, gst_pct, amount)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                `, [
                    quotation.id, i,
                    it.sku_code || null,
                    it.item_name || null,
                    it.brand || null,
                    it.hsn || null,
                    it.qty || 0,
                    it.unit || 'Pcs',
                    it.rate || 0,
                    it.discount || 0,
                    it.gst || 0,
                    it.amount || 0,
                ]);
            }

            await client.query('COMMIT');
            return { ...quotation, items };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Update an existing quotation and replace all its items.
     */
    static async update(id, data, companyId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const qRes = await client.query(`
                UPDATE quotations SET
                    version             = COALESCE($1, version),
                    quote_date          = COALESCE($2, quote_date),
                    valid_until         = $3,
                    customer_name       = $4,
                    customer_company    = $5,
                    customer_email      = $6,
                    customer_phone      = $7,
                    customer_gst_no     = $8,
                    billing_address     = $9,
                    consigning_address  = $10,
                    subtotal            = $11,
                    overall_disc_type   = $12,
                    overall_disc_value  = $13,
                    overall_disc_amt    = $14,
                    taxable_amt         = $15,
                    total_tax           = $16,
                    grand_total         = $17,
                    terms_text          = $18,
                    internal_notes      = $19,
                    updated_at          = NOW()
                WHERE id = $20 AND company_id = $21
                RETURNING *
            `, [
                data.version,
                data.quote_date,
                data.valid_until || null,
                data.customer_name || null,
                data.customer_company || null,
                data.customer_email || null,
                data.customer_phone || null,
                data.customer_gst_no || null,
                data.billing_address || null,
                data.consigning_address || null,
                data.subtotal || 0,
                data.overall_disc_type || 'pct',
                data.overall_disc_value || 0,
                data.overall_disc_amt || 0,
                data.taxable_amt || 0,
                data.total_tax || 0,
                data.grand_total || 0,
                data.terms_text || null,
                data.internal_notes || null,
                id,
                companyId,
            ]);

            if (!qRes.rows.length) throw new Error('Quotation not found');

            // Replace items
            await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [id]);
            const items = data.items || [];
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                await client.query(`
                    INSERT INTO quotation_items
                        (quotation_id, sort_order, sku_code, item_name, brand, hsn, qty, unit, rate, discount_pct, gst_pct, amount)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                `, [
                    id, i,
                    it.sku_code || null,
                    it.item_name || null,
                    it.brand || null,
                    it.hsn || null,
                    it.qty || 0,
                    it.unit || 'Pcs',
                    it.rate || 0,
                    it.discount || 0,
                    it.gst || 0,
                    it.amount || 0,
                ]);
            }

            await client.query('COMMIT');
            return { ...qRes.rows[0], items };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get all quotations for a company (list view).
     */
    static async getAll(companyId, filters = {}) {
        const conditions = ['q.company_id = $1'];
        const params = [companyId];
        let idx = 2;

        if (filters.status) {
            conditions.push(`q.status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.lead_id) {
            conditions.push(`q.lead_id = $${idx++}`);
            params.push(filters.lead_id);
        }
        if (filters.search) {
            conditions.push(`(q.quote_no ILIKE $${idx} OR q.customer_name ILIKE $${idx} OR q.customer_company ILIKE $${idx})`);
            params.push(`%${filters.search}%`);
            idx++;
        }

        const where = conditions.join(' AND ');
        const limit = Math.min(parseInt(filters.limit) || 50, 200);
        const offset = parseInt(filters.offset) || 0;

        const result = await pool.query(`
            SELECT
                q.*,
                u.full_name AS assigned_to_name,
                (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) AS item_count,
                COUNT(*) OVER() AS total_count
            FROM quotations q
            LEFT JOIN users u ON u.id = q.assigned_to
            WHERE ${where}
            ORDER BY q.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `, [...params, limit, offset]);

        const total = parseInt(result.rows[0]?.total_count) || 0;
        const quotations = result.rows.map(({ total_count, ...q }) => q);
        return { quotations, total };
    }

    /**
     * Get a single quotation with its items.
     */
    static async getById(id, companyId) {
        const qRes = await pool.query(`
            SELECT q.*, u.full_name AS assigned_to_name, c.company_name
            FROM quotations q
            LEFT JOIN users u ON u.id = q.assigned_to
            LEFT JOIN companies c ON c.company_id = q.company_id
            WHERE q.id = $1 AND q.company_id = $2
        `, [id, companyId]);

        if (!qRes.rows.length) return null;

        const itemsRes = await pool.query(`
            SELECT * FROM quotation_items
            WHERE quotation_id = $1
            ORDER BY sort_order ASC
        `, [id]);

        return { ...qRes.rows[0], items: itemsRes.rows };
    }

    /**
     * Update status only (SENT / ACCEPTED / REJECTED / EXPIRED).
     */
    static async updateStatus(id, status, companyId) {
        const VALID = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
        if (!VALID.includes(status)) throw new Error(`Invalid status: ${status}`);

        const result = await pool.query(`
            UPDATE quotations
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND company_id = $3
            RETURNING *
        `, [status, id, companyId]);

        return result.rows[0] || null;
    }

    /**
     * Delete a DRAFT quotation (cascades to items).
     */
    static async delete(id, companyId) {
        const result = await pool.query(`
            DELETE FROM quotations
            WHERE id = $1 AND company_id = $2 AND status = 'DRAFT'
            RETURNING id
        `, [id, companyId]);
        return result.rows[0] || null;
    }
}

module.exports = QuotationModel;
