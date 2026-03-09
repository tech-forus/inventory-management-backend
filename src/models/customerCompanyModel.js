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

            // 1. Get company initials for the prefix
            const initialsRes = await db.query('SELECT get_company_initials($1) as initials', [companyId]);
            const initials = initialsRes.rows[0].initials;

            // 2. Insert the company row
            const query = `
                INSERT INTO customer_companies (
                    company_id, unit_id, name, customer_type, 
                    customer_stage, gst_number, billing_address, billing_city, 
                    billing_state, billing_pin, credit_period, payment_terms, 
                    loyalty_tier, tags, interests, is_active, number_of_units
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `;

            const params = [
                companyId,
                data.unitId || null,
                data.name,
                data.customerType || 'Industry',
                data.customerStage || 'potential',
                data.gstNumber || null,
                data.billingAddress || null,
                data.billingCity || null,
                data.billingState || null,
                data.billingPin || null,
                data.creditPeriod || 0,
                data.paymentTerms || 'Open Credit',
                data.loyaltyTier || null,
                JSON.stringify(data.tags || []),
                JSON.stringify(data.interests || []),
                data.isActive !== undefined ? data.isActive : true,
                data.numberOfUnits || 1
            ];

            const result = await db.query(query, params);
            let company = result.rows[0];

            // 3. Generate and update code
            const codeRes = await db.query('SELECT generate_customer_company_code($1) as code', [initials]);
            const code = codeRes.rows[0].code;

            await db.query('UPDATE customer_companies SET customer_code = $1 WHERE id = $2', [code, company.id]);
            company.customer_code = code;

            // 4. Add units if provided
            if (units && units.length > 0) {
                for (const unitData of units) {
                    await CustomerUnitModel.create(company.id, unitData, db);
                }
            }

            // 5. Add consignee addresses if provided
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
     * Get all customer companies for a tenant
     */
    static async getAll(companyId, filters = {}) {
        let whereCompany = `cc.company_id = $1 AND cc.deleted_at IS NULL`;
        let whereUnit = `cu.company_id = $1`;
        const params = [companyId];
        let paramIndex = 2;

        if (filters.search) {
            whereCompany += ` AND (cc.name ILIKE $${paramIndex} OR cc.customer_code ILIKE $${paramIndex} OR cc.gst_number ILIKE $${paramIndex})`;
            whereUnit += ` AND (cu.unit_name ILIKE $${paramIndex} OR cu.customer_code ILIKE $${paramIndex} OR cu.gst_number ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        const query = `
          SELECT 
            cc.id as id,
            cc.customer_code,
            cc.name,
            cc.gst_number,
            cc.customer_type,
            cc.billing_address,
            cc.billing_city as city,
            cc.is_active,
            cc.is_pinned,
            'company' as row_type,
            cc.id as company_id,
            NULL as unit_id,
            (SELECT COUNT(*) FROM customer_contacts WHERE customer_company_id = cc.id AND deleted_at IS NULL) as contact_count
          FROM customer_companies cc
          WHERE ${whereCompany}
          
          UNION ALL
          
          SELECT
            cu.id as id,
            cu.customer_code,
            cu.unit_name as name,
            cu.gst_number,
            cc.customer_type,
            cu.billing_address,
            NULL as city,
            cc.is_active,
            cc.is_pinned,
            'unit' as row_type,
            cc.id as company_id,
            cu.id as unit_id,
            0 as contact_count
          FROM customer_units cu
          JOIN customer_companies cc ON cu.company_id = cc.id
          WHERE ${whereCompany} AND ${whereUnit}
          
          ORDER BY is_pinned DESC, customer_code ASC
        `;

        const result = await pool.query(query, params);
        return result.rows;
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
    static async update(id, companyId, data, client = null) {
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
            if (data.units && Array.isArray(data.units)) {
                const CustomerUnitModel = require('./customerUnitModel');
                for (const unit of data.units) {
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
