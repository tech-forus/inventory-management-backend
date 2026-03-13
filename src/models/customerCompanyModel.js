const pool = require('./database');
const CustomerUnitModel = require('./customerUnitModel');

class CustomerCompanyModel {
    /**
     * Create a new customer company and its initial consignee addresses
     */
    static async create(companyId, data, consigneeAddresses = [], units = [], client = null) {
        const pool = require('./database');
        const db = client || await pool.connect();
        const shouldRelease = !client;

        try {
            if (shouldRelease) await db.query('BEGIN');

            // Get company initials — needed for unit code generation
            const initialsRes = await db.query('SELECT get_company_initials($1) as initials', [companyId]);
            const initials = initialsRes.rows[0].initials;

            // Insert the company row — NO customer_code generated here.
            // The company is purely an internal grouping record.
            const result = await db.query(`
                INSERT INTO customer_companies (
                    company_id, name, customer_type, customer_stage,
                    credit_period, payment_terms, loyalty_tier,
                    tags, interests, is_active, number_of_units
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                companyId,
                data.name,
                data.customerType || 'Industry',
                data.customerStage || 'potential',
                data.creditPeriod || 0,
                data.paymentTerms || 'Open Credit',
                data.loyaltyTier || null,
                JSON.stringify(data.tags || []),
                JSON.stringify(data.interests || []),
                data.isActive !== undefined ? data.isActive : true,
                data.numberOfUnits || 1
            ]);

            const company = result.rows[0];

            // Create all units — each gets its own CID code
            if (units && units.length > 0) {
                for (const unitData of units) {
                    await CustomerUnitModel.create(company.id, { ...unitData, initials }, db);
                }
            }

            if (consigneeAddresses && consigneeAddresses.length > 0) {
                for (const addr of consigneeAddresses) {
                    await this.addConsigneeAddress(company.id, addr, db);
                }
            }

            if (shouldRelease) await db.query('COMMIT');
            return company;
        } catch (error) {
            if (shouldRelease) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldRelease) db.release();
        }
    }

    /**
     * Add a consignee address to a company
     */
    static async addConsigneeAddress(companyId, data, client = null) {
        const db = client || pool;
        const query = `
      INSERT INTO customer_consignee_addresses (
        customer_company_id, label, address, city, state, pin, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const params = [
            companyId,
            data.label,
            data.address,
            data.city || null,
            data.state || null,
            data.pin || null,
            data.isDefault || false
        ];
        const result = await db.query(query, params);
        return result.rows[0];
    }

    /**
     * Get all customer companies for a tenant — one row per company.
     * Supports: search, customerType, stage, state, hasGst, sortBy, limit, offset.
     */
    static async getAll(companyId, filters = {}) {
        const params = [companyId];
        const conditions = ['cc.company_id = $1', 'cc.deleted_at IS NULL'];
        let paramIndex = 2;

        if (filters.search) {
            conditions.push(`(
                cc.name ILIKE $${paramIndex}
                OR EXISTS (
                    SELECT 1 FROM customer_units cu2
                    WHERE cu2.company_id = cc.id
                      AND cu2.deleted_at IS NULL
                      AND (
                          cu2.unit_name ILIKE $${paramIndex}
                          OR cu2.customer_code ILIKE $${paramIndex}
                          OR cu2.gst_number ILIKE $${paramIndex}
                          OR cu2.billing_gst_number ILIKE $${paramIndex}
                      )
                )
            )`);
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.customerType) {
            conditions.push(`cc.customer_type = $${paramIndex}`);
            params.push(filters.customerType);
            paramIndex++;
        }

        if (filters.stage && filters.stage !== 'ALL') {
            conditions.push(`cc.customer_stage = $${paramIndex}`);
            params.push(filters.stage.toLowerCase());
            paramIndex++;
        }

        // State filter — company must have at least one unit in that state
        if (filters.state) {
            conditions.push(`EXISTS (
                SELECT 1 FROM customer_units cu2
                WHERE cu2.company_id = cc.id AND cu2.deleted_at IS NULL
                  AND cu2.billing_state = $${paramIndex}
            )`);
            params.push(filters.state);
            paramIndex++;
        }

        // GST filter — company must have at least one unit with/without GST
        const hasGst = filters.hasGst;
        if (hasGst === 'true' || hasGst === true) {
            conditions.push(`EXISTS (
                SELECT 1 FROM customer_units cu2
                WHERE cu2.company_id = cc.id AND cu2.deleted_at IS NULL
                  AND cu2.billing_gst_number IS NOT NULL AND cu2.billing_gst_number <> ''
            )`);
        } else if (hasGst === 'false' || hasGst === false) {
            conditions.push(`NOT EXISTS (
                SELECT 1 FROM customer_units cu2
                WHERE cu2.company_id = cc.id AND cu2.deleted_at IS NULL
                  AND cu2.billing_gst_number IS NOT NULL AND cu2.billing_gst_number <> ''
            )`);
        }

        const whereClause = conditions.join(' AND ');

        // Sort
        const SORT_MAP = {
            'RECENTLY_ADDED': 'cc.created_at DESC',
            'ALPHABETICAL': 'cc.name ASC',
            'LAST_INTERACTED': 'cc.updated_at DESC',
            'TOTAL_REVENUE': 'cc.created_at DESC',
            'CITY': '(SELECT cu3.billing_city FROM customer_units cu3 WHERE cu3.company_id = cc.id AND cu3.deleted_at IS NULL ORDER BY cu3.id ASC LIMIT 1) ASC NULLS LAST',
        };
        const orderClause = SORT_MAP[filters.sortBy] || 'cc.created_at DESC';

        // Pagination
        const limit = Math.min(parseInt(filters.limit) || 25, 200);
        const offset = parseInt(filters.offset) || 0;

        const query = `
            SELECT
                cc.id,
                cc.id                AS company_id,
                cc.name,
                cc.customer_type,
                cc.customer_stage,
                cc.is_active,
                cc.created_at,
                (SELECT cu.customer_code
                 FROM customer_units cu WHERE cu.company_id = cc.id AND cu.deleted_at IS NULL
                 ORDER BY cu.id ASC LIMIT 1)                             AS customer_code,
                (SELECT cu.billing_gst_number
                 FROM customer_units cu WHERE cu.company_id = cc.id AND cu.deleted_at IS NULL
                 ORDER BY cu.id ASC LIMIT 1)                             AS gst_number,
                (SELECT cu.billing_city
                 FROM customer_units cu WHERE cu.company_id = cc.id AND cu.deleted_at IS NULL
                 ORDER BY cu.id ASC LIMIT 1)                             AS city,
                (SELECT cu.billing_state
                 FROM customer_units cu WHERE cu.company_id = cc.id AND cu.deleted_at IS NULL
                 ORDER BY cu.id ASC LIMIT 1)                             AS state,
                (SELECT cu.billing_address
                 FROM customer_units cu WHERE cu.company_id = cc.id AND cu.deleted_at IS NULL
                 ORDER BY cu.id ASC LIMIT 1)                             AS billing_address,
                (SELECT COUNT(*)
                 FROM customer_contacts cont
                 WHERE cont.customer_company_id = cc.id AND cont.deleted_at IS NULL) AS contact_count,
                COUNT(*) OVER()      AS total_count
            FROM customer_companies cc
            WHERE ${whereClause}
            ORDER BY ${orderClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        const total = parseInt(result.rows[0]?.total_count) || 0;
        const rows = result.rows.map(({ total_count, ...r }) => r);
        return { rows, total };
    }


    /**
     * Get a company by ID with its addresses and contacts
     */
    static async getById(id, companyId) {
        const companyQuery = `SELECT * FROM customer_companies WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`;
        const companyRes = await pool.query(companyQuery, [id, companyId]);

        if (companyRes.rows.length === 0) return null;

        const company = companyRes.rows[0];

        const addressQuery = `SELECT * FROM customer_consignee_addresses WHERE customer_company_id = $1`;
        const addressRes = await pool.query(addressQuery, [id]);

        const contactQuery = `SELECT * FROM customer_contacts WHERE customer_company_id = $1 AND deleted_at IS NULL`;
        const contactRes = await pool.query(contactQuery, [id]);

        return {
            ...company,
            consignee_addresses: addressRes.rows,
            contacts: contactRes.rows
        };
    }

    /**
     * Update a company record
     */
    static async update(id, companyId, data, units = [], client = null) {
        const pool = require('./database');
        const db = client || await pool.connect();
        const shouldRelease = !client;

        try {
            if (shouldRelease) await db.query('BEGIN');

            const sets = [];
            const params = [id, companyId];
            let paramIndex = 3;

            for (const [key, value] of Object.entries(data)) {
                // map frontend camelCase to database snake_case
                const mapping = {
                    'customerType': 'customer_type',
                    'customerStage': 'customer_stage',
                    'customerCode': 'customer_code',
                    'gstNumber': 'gst_number',
                    'billingAddress': 'billing_address',
                    'billingCity': 'billing_city',
                    'billingState': 'billing_state',
                    'billingPin': 'billing_pin',
                    'creditPeriod': 'credit_period',
                    'paymentTerms': 'payment_terms',
                    'loyaltyTier': 'loyalty_tier',
                    'isActive': 'is_active',
                    'numberOfUnits': 'number_of_units'
                };

                const dbKey = mapping[key] || key;

                const allowedFields = [
                    'name', 'customer_code', 'customer_type', 'customer_stage',
                    'gst_number', 'billing_address', 'billing_city', 'billing_state',
                    'billing_pin', 'credit_period', 'payment_terms', 'loyalty_tier',
                    'is_active', 'number_of_units', 'deleted_at'
                ];

                if (allowedFields.includes(dbKey)) {
                    sets.push(`${dbKey} = $${paramIndex}`);
                    params.push(value);
                    paramIndex++;
                }
            }

            let company = null;

            if (sets.length > 0) {
                const query = `
                    UPDATE customer_companies 
                    SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $1 AND company_id = $2
                    RETURNING *
                `;
                const result = await db.query(query, params);
                company = result.rows[0];
            } else {
                // If no company fields to update, fetch it to return
                const getQuery = `SELECT * FROM customer_companies WHERE id = $1 AND company_id = $2`;
                const getResult = await db.query(getQuery, [id, companyId]);
                company = getResult.rows[0];
            }

            if (!company) {
                if (shouldRelease) await db.query('ROLLBACK');
                return null;
            }

            // Sync units
            if (units && Array.isArray(units) && units.length > 0) {
                const CustomerUnitModel = require('./customerUnitModel');
                for (const unit of units) {
                    if (unit.id) {
                        await CustomerUnitModel.update(unit.id, unit, db);
                    } else {
                        await CustomerUnitModel.create(company.id, unit, db);
                    }
                }
            }

            if (shouldRelease) await db.query('COMMIT');
            return company;
        } catch (error) {
            if (shouldRelease) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldRelease) db.release();
        }
    }

    /**
     * Soft delete a company
     */
    static async delete(id, companyId) {
        const query = `UPDATE customer_companies SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING *`;
        const result = await pool.query(query, [id, companyId]);
        return result.rows[0];
    }
}

module.exports = CustomerCompanyModel;
