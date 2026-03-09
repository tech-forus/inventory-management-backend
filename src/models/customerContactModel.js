const pool = require('./database');

class CustomerContactModel {
    /**
     * Create a new customer contact linked to a company
     */
    static async create(companyId, tenantCompanyId, data, client = null) {
        const pool = require('./database');
        const db = client || await pool.connect();
        const shouldRelease = !client;

        try {
            if (shouldRelease) await db.query('BEGIN');

            // 1. Fetch parent company code
            const companyRes = await db.query(
                `SELECT customer_code FROM customer_companies WHERE id = $1`,
                [companyId]
            );
            if (companyRes.rows.length === 0) throw new Error('Parent company not found');
            const companyCode = companyRes.rows[0].customer_code;

            // 2. Fetch unit code if unit_id is provided
            let unitCode = null;
            if (data.unit_id || data.unitId) {
                const unitRes = await db.query(
                    `SELECT unit_code FROM customer_units WHERE id = $1`,
                    [data.unit_id || data.unitId]
                );
                if (unitRes.rows.length > 0) {
                    unitCode = unitRes.rows[0].unit_code;
                }
            }

            // 3. Generate contact code
            const codeRes = await db.query(
                `SELECT generate_customer_contact_code($1, $2) AS code`,
                [companyCode, unitCode]
            );
            const contactCode = codeRes.rows[0].code;

            const query = `
                INSERT INTO customer_contacts (
                    customer_company_id, company_id, name, department, 
                    designation, phone, whatsapp_number, email, 
                    is_primary, is_active, loyalty_tier, interests, 
                    contact_stage, unit_id, contact_code
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;

            const params = [
                companyId,
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
                data.unit_id || data.unitId || null,
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
     * Get all contacts for a specific company or tenant
     */
    static async getAll(tenantCompanyId, filters = {}) {
        let whereClause = `WHERE cc.company_id = $1 AND cc.deleted_at IS NULL`;
        const params = [tenantCompanyId];
        let paramIndex = 2;

        if (filters.customerCompanyId) {
            whereClause += ` AND cc.customer_company_id = $${paramIndex}`;
            params.push(filters.customerCompanyId);
            paramIndex++;
        }

        if (filters.search) {
            whereClause += ` AND (cc.name ILIKE $${paramIndex} OR cc.phone ILIKE $${paramIndex} OR cc.email ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        const query = `
      SELECT cc.*, comp.name as company_name
      FROM customer_contacts cc
      LEFT JOIN customer_companies comp ON cc.customer_company_id = comp.id
      ${whereClause}
      ORDER BY cc.name ASC
    `;

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Get a single contact by ID
     */
    static async getById(id, tenantCompanyId) {
        const query = `
      SELECT cc.*, comp.name as company_name
      FROM customer_contacts cc
      JOIN customer_companies comp ON cc.customer_company_id = comp.id
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
