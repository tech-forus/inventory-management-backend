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
     * Get all customer units for a tenant (units-only list — companies are internal grouping only)
     */
    static async getAll(companyId, filters = {}) {
        const params = [companyId];
        let searchClause = '';
        let paramIndex = 2;

        if (filters.search) {
            searchClause = `AND (
                cu.unit_name ILIKE $${paramIndex}
                OR cu.customer_code ILIKE $${paramIndex}
                OR cu.gst_number ILIKE $${paramIndex}
                OR cc.name ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        const query = `
            SELECT
                cu.id                       AS id,
                cu.customer_code,
                cu.unit_name                AS name,
                cu.gst_number,
                cu.billing_address,
                cu.shipping_address,
                cu.is_shipping_same_as_billing,
                cu.billing_pincode,
                cu.billing_city             AS city,
                cu.billing_state,
                cu.billing_gst_number,
                cu.shipping_pincode,
                cu.shipping_city,
                cu.shipping_state,
                cu.shipping_gst_number,
                cc.customer_type,
                cc.credit_period,
                cc.payment_terms,
                cc.is_active,
                cc.id                       AS company_id,
                cc.name                     AS company_name,
                cu.id                       AS unit_id,
                (SELECT COUNT(*) FROM customer_contacts
                 WHERE customer_company_id = cc.id AND deleted_at IS NULL) AS contact_count
            FROM customer_units cu
            JOIN customer_companies cc ON cu.company_id = cc.id
            WHERE cc.company_id = $1
              AND cc.deleted_at IS NULL
              ${searchClause}
            ORDER BY cu.customer_code ASC NULLS LAST
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
