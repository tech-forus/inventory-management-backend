const pool = require('./database');

class CustomerCompanyModel {
    /**
     * Create a new customer company and its initial consignee addresses
     */
    static async create(companyId, data, consigneeAddresses = [], client = null) {
        const db = client || pool;

        const query = `
      INSERT INTO customer_companies (
        company_id, unit_id, name, customer_code, customer_type, 
        customer_stage, gst_number, billing_address, billing_city, 
        billing_state, billing_pin, credit_period, payment_terms, 
        loyalty_tier, tags, interests, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

        const params = [
            companyId,
            data.unitId || null,
            data.name,
            data.customerCode || null,
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
            data.isActive !== undefined ? data.isActive : true
        ];

        const result = await db.query(query, params);
        const company = result.rows[0];

        // Add consignee addresses if provided
        if (consigneeAddresses && consigneeAddresses.length > 0) {
            for (const addr of consigneeAddresses) {
                await this.addConsigneeAddress(company.id, addr, db);
            }
        }

        return company;
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
        let whereClause = `WHERE cc.company_id = $1 AND cc.deleted_at IS NULL`;
        const params = [companyId];
        let paramIndex = 2;

        if (filters.search) {
            whereClause += ` AND (cc.name ILIKE $${paramIndex} OR cc.customer_code ILIKE $${paramIndex} OR cc.gst_number ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        const query = `
      SELECT cc.*, 
        (SELECT COUNT(*) FROM customer_contacts WHERE customer_company_id = cc.id AND deleted_at IS NULL) as contact_count
      FROM customer_companies cc
      ${whereClause}
      ORDER BY cc.name ASC
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
        const db = client || pool;
        const sets = [];
        const params = [id, companyId];
        let paramIndex = 3;

        for (const [key, value] of Object.entries(data)) {
            if (['name', 'customer_code', 'customer_type', 'customer_stage', 'gst_number', 'billing_address', 'billing_city', 'billing_state', 'billing_pin', 'credit_period', 'payment_terms', 'loyalty_tier', 'is_active'].includes(key)) {
                sets.push(`${key} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        }

        if (sets.length === 0) return null;

        const query = `
      UPDATE customer_companies 
      SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;
        const result = await db.query(query, params);
        return result.rows[0];
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
