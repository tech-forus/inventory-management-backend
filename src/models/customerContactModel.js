const pool = require('./database');

class CustomerContactModel {
    /**
     * Create a new customer contact linked to a company
     */
    static async create(companyId, tenantCompanyId, data, client = null) {
        const db = client || pool;

        const query = `
      INSERT INTO customer_contacts (
        customer_company_id, company_id, name, department, 
        designation, phone, whatsapp_number, email, 
        is_primary, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            data.isActive !== undefined ? data.isActive : true
        ];

        const result = await db.query(query, params);
        return result.rows[0];
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
      JOIN customer_companies comp ON cc.customer_company_id = comp.id
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

        const allowedFields = ['name', 'department', 'designation', 'phone', 'whatsapp_number', 'email', 'is_primary', 'is_active'];

        for (let [key, value] of Object.entries(data)) {
            // Handle camelCase from frontend
            if (key === 'whatsappNumber') key = 'whatsapp_number';

            if (allowedFields.includes(key)) {
                sets.push(`${key} = $${paramIndex}`);
                params.push(value);
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
}

module.exports = CustomerContactModel;
