const pool = require('./database');

class CustomerContactModel {
    /**
     * Create a new customer contact linked to a unit
     */
    static async create(unitId, tenantCompanyId, data, client = null) {
        const pool = require('./database');
        const db = client || await pool.connect();
        const shouldRelease = !client;

        try {
            if (shouldRelease) await db.query('BEGIN');

            // 1. Fetch unit + its parent company in one query
            const unitRes = await db.query(
                `SELECT cu.id, cu.customer_code as unit_code, cu.company_id as customer_company_id
                 FROM customer_units cu
                 WHERE cu.id = $1`,
                [unitId]
            );
            if (unitRes.rows.length === 0) throw new Error('Unit not found');
            const unit = unitRes.rows[0];

            // 2. Generate contact code under unit code
            const codeRes = await db.query(
                `SELECT generate_customer_contact_code($1) AS code`,
                [unit.unit_code]
            );
            const contactCode = codeRes.rows[0].code;

            const query = `
                INSERT INTO customer_contacts (
                    unit_id, customer_company_id, company_id, name, department, 
                    designation, phone, whatsapp_number, email, 
                    is_primary, is_active, loyalty_tier, interests, 
                    contact_stage, contact_code
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;

            const params = [
                unit.id,
                unit.customer_company_id,
                tenantCompanyId,
                data.name,
                data.department || null,
                data.designation || null,
                data.phone || null,
                data.whatsappNumber || data.whatsapp_number || null,
                data.email || null,
                data.isPrimary || false,
                data.isActive !== undefined ? data.isActive : true,
                data.loyaltyTier || null,
                data.interests ? JSON.stringify(data.interests) : null,
                data.contactStage || 'potential',
                contactCode
            ];

            const result = await db.query(query, params);
            const contact = result.rows[0];

            if (shouldRelease) await db.query('COMMIT');
            return contact;
        } catch (error) {
            if (shouldRelease) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldRelease) db.release();
        }
    }

    /**
     * Get all contacts for a specific company or tenant.
     * Supports: search, stage, state, hasGst, assignedTo, sortBy, limit, offset.
     */
    static async getAll(tenantCompanyId, filters = {}) {
        let whereClause = `WHERE cc.company_id = $1 AND cc.deleted_at IS NULL`;
        const params = [tenantCompanyId];
        let paramIndex = 2;

        if (filters.customerCompanyId || filters.customer_company_id) {
            whereClause += ` AND cc.customer_company_id = $${paramIndex}`;
            params.push(filters.customerCompanyId || filters.customer_company_id);
            paramIndex++;
        }

        if (filters.unitId || filters.unit_id) {
            whereClause += ` AND cc.unit_id = $${paramIndex}`;
            params.push(filters.unitId || filters.unit_id);
            paramIndex++;
        }

        if (filters.search) {
            whereClause += ` AND (
                cc.name  ILIKE $${paramIndex}
                OR cc.phone ILIKE $${paramIndex}
                OR cc.email ILIKE $${paramIndex}
                OR comp.name ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        // Stage filter
        const stage = (filters.stage || '').toUpperCase();
        if (stage && stage !== 'ALL') {
            if (stage === 'POTENTIAL') {
                whereClause += ` AND cc.contact_stage = 'potential'`;
            } else if (stage === 'EXISTING') {
                whereClause += ` AND cc.contact_stage = 'existing'`;
            } else if (stage === 'NEWLY_ADDED') {
                const period = filters.newlyAddedPeriod || '1M';
                if (period === 'CUSTOM' && filters.customFrom && filters.customTo) {
                    whereClause += ` AND cc.created_at >= $${paramIndex} AND cc.created_at <= $${paramIndex + 1}`;
                    params.push(filters.customFrom, filters.customTo);
                    paramIndex += 2;
                } else {
                    const INTERVAL_MAP = { '1W': '7 days', '1M': '30 days', '3M': '3 months', '6M': '6 months', '1Y': '1 year' };
                    const interval = INTERVAL_MAP[period] || '30 days';
                    whereClause += ` AND cc.created_at >= NOW() - INTERVAL '${interval}'`;
                }
            } else if (stage === 'NOT_CONTACTED') {
                const period = filters.notContactedPeriod || '1M';
                if (period === 'CUSTOM' && filters.ncCustomFrom && filters.ncCustomTo) {
                    whereClause += ` AND cc.created_at >= $${paramIndex} AND cc.created_at <= $${paramIndex + 1} AND cc.contact_stage = 'potential'`;
                    params.push(filters.ncCustomFrom, filters.ncCustomTo);
                    paramIndex += 2;
                } else {
                    const INTERVAL_MAP = { '15D': '15 days', '1M': '30 days', '3M': '3 months', '6M': '6 months', '1Y': '1 year' };
                    const interval = INTERVAL_MAP[period] || '30 days';
                    whereClause += ` AND cc.created_at <= NOW() - INTERVAL '${interval}' AND cc.contact_stage = 'potential'`;
                }
            }
        }

        // State filter (via joined customer_units)
        if (filters.state) {
            whereClause += ` AND cu.billing_state = $${paramIndex}`;
            params.push(filters.state);
            paramIndex++;
        }

        // GST filter (via joined customer_units)
        const hasGst = filters.hasGst;
        if (hasGst === 'true' || hasGst === true) {
            whereClause += ` AND cu.billing_gst_number IS NOT NULL AND cu.billing_gst_number <> ''`;
        } else if (hasGst === 'false' || hasGst === false) {
            whereClause += ` AND (cu.billing_gst_number IS NULL OR cu.billing_gst_number = '')`;
        }

        // Sort
        const SORT_MAP = {
            'RECENTLY_ADDED':   'cc.created_at DESC',
            'ALPHABETICAL':     'cc.name ASC',
            'LAST_INTERACTED':  'cc.updated_at DESC',
            'TOTAL_REVENUE':    'cc.created_at DESC',
            'CITY':             'cu.billing_city ASC NULLS LAST',
        };
        const orderClause = SORT_MAP[filters.sortBy] || 'cc.created_at DESC';

        // Pagination
        const limit  = Math.min(parseInt(filters.limit)  || 25, 200);
        const offset = parseInt(filters.offset) || 0;

        const query = `
            SELECT
                cc.*,
                comp.name  AS company_name,
                cu.billing_state AS state,
                cu.billing_city  AS city,
                cu.billing_gst_number AS unit_gst_number,
                COUNT(*) OVER() AS total_count
            FROM customer_contacts cc
            LEFT JOIN customer_companies comp ON cc.customer_company_id = comp.id
            LEFT JOIN customer_units     cu   ON cc.unit_id = cu.id
            ${whereClause}
            ORDER BY ${orderClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        const total  = parseInt(result.rows[0]?.total_count) || 0;
        const rows   = result.rows.map(({ total_count, ...r }) => r);
        return { rows, total };
    }

    /**
     * Get a single contact by ID
     */
    static async getById(id, tenantCompanyId) {
        const query = `
      SELECT cc.*, comp.name as company_name
      FROM customer_contacts cc
      LEFT JOIN customer_companies comp ON cc.customer_company_id = comp.id
      WHERE cc.id = $1 AND cc.company_id = $2 AND cc.deleted_at IS NULL
    `;
        const result = await pool.query(query, [id, tenantCompanyId]);
        return result.rows[0];
    }

    /**
     * Update a contact
     */
    static async update(id, tenantCompanyId, data, client = null) {
        const db = client || pool;
        const sets = [];
        const params = [id, tenantCompanyId];
        let paramIndex = 3;

        const allowedFields = ['name', 'department', 'designation', 'phone', 'whatsapp_number', 'email', 'is_primary', 'is_active', 'loyalty_tier', 'interests', 'contact_stage', 'unit_id'];

        for (let [key, value] of Object.entries(data)) {
            // Handle camelCase from frontend
            if (key === 'whatsappNumber') key = 'whatsapp_number';
            if (key === 'loyaltyTier') key = 'loyalty_tier';
            if (key === 'billingAddress') key = 'billing_address';
            if (key === 'shippingAddress') key = 'shipping_address';
            if (key === 'contactStage') key = 'contact_stage';

            if (allowedFields.includes(key)) {
                sets.push(`${key} = $${paramIndex}`);
                if (key === 'interests') {
                    params.push(value ? JSON.stringify(value) : null);
                } else {
                    params.push(value);
                }
                paramIndex++;
            }
        }

        if (sets.length === 0) return null;

        const query = `
      UPDATE customer_contacts 
      SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;
        const result = await db.query(query, params);
        return result.rows[0];
    }

    /**
     * Soft delete a contact
     */
    static async delete(id, tenantCompanyId) {
        const query = `UPDATE customer_contacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING *`;
        const result = await pool.query(query, [id, tenantCompanyId]);
        return result.rows[0];
    }

    /**
     * Get counts for contacts grouping by stage
     */
    static async getCounts(tenantCompanyId) {
        const query = `
      SELECT contact_stage, COUNT(*) as count
      FROM customer_contacts
      WHERE company_id = $1 AND deleted_at IS NULL
      GROUP BY contact_stage
    `;
        const result = await pool.query(query, [tenantCompanyId]);
        const counts = { potential: 0, existing: 0, total: 0 };
        result.rows.forEach(row => {
            const stage = row.contact_stage || 'potential';
            counts[stage] = parseInt(row.count);
            counts.total += parseInt(row.count);
        });
        return counts;
    }
}

module.exports = CustomerContactModel;
