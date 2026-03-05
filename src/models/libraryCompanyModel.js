const pool = require('./database');

/**
 * LibraryCompanyModel
 * Handles database operations for external companies in the library
 */
class LibraryCompanyModel {
    /**
     * Create a new library company and its units
     */
    static async create(tenantCompanyId, data, units = [], createdBy = null, client = null) {
        const db = client || pool;

        // 1. Create the company
        const compResult = await db.query(
            `INSERT INTO library_companies (
        tenant_company_id, company_name, company_code, company_type, 
        gst_number, registration_type, billing_address, city, state, pincode, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                tenantCompanyId,
                data.companyName,
                data.companyCode,
                data.companyType || 'Customer',
                data.gstNumber || null,
                data.registrationType || null,
                data.billingAddress || null,
                data.city || null,
                data.state || null,
                data.pincode || null,
                createdBy
            ]
        );

        const company = compResult.rows[0];

        // 2. Create units (warehouses)
        const createdUnits = [];
        if (units && units.length > 0) {
            for (const unit of units) {
                const unitResult = await db.query(
                    `INSERT INTO library_company_units (
            library_company_id, unit_name, address, city, state, pincode, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
                    [
                        company.id,
                        unit.unitName,
                        unit.address || null,
                        unit.city || null,
                        unit.state || null,
                        unit.pincode || null,
                        unit.isDefault || false
                    ]
                );
                createdUnits.push(unitResult.rows[0]);
            }
        }

        return { ...company, units: createdUnits };
    }

    /**
     * Get all library companies for a tenant
     */
    static async getAll(tenantCompanyId) {
        const query = `
      SELECT c.*, 
        COALESCE(
          (SELECT json_agg(u) FROM library_company_units u WHERE u.library_company_id = c.id),
          '[]'::json
        ) as units
      FROM library_companies c
      WHERE c.tenant_company_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.company_name ASC
    `;
        const result = await pool.query(query, [tenantCompanyId]);
        return result.rows;
    }

    /**
     * Get a single library company by ID
     */
    static async getById(id, tenantCompanyId) {
        const query = `
      SELECT c.*, 
        COALESCE(
          (SELECT json_agg(u) FROM library_company_units u WHERE u.library_company_id = c.id),
          '[]'::json
        ) as units
      FROM library_companies c
      WHERE c.id = $1 AND c.tenant_company_id = $2 AND c.deleted_at IS NULL
    `;
        const result = await pool.query(query, [id, tenantCompanyId]);
        return result.rows[0];
    }

    /**
     * Update a library company
     */
    static async update(id, tenantCompanyId, data, client = null) {
        const db = client || pool;
        const query = `
      UPDATE library_companies 
      SET 
        company_name = $1, 
        company_type = $2, 
        gst_number = $3, 
        registration_type = $4, 
        billing_address = $5, 
        city = $6, 
        state = $7, 
        pincode = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND tenant_company_id = $10 AND deleted_at IS NULL
      RETURNING *
    `;
        const result = await db.query(query, [
            data.companyName,
            data.companyType,
            data.gstNumber,
            data.registrationType,
            data.billingAddress,
            data.city,
            data.state,
            data.pincode,
            id,
            tenantCompanyId
        ]);
        return result.rows[0];
    }

    /**
     * Soft delete a library company
     */
    static async delete(id, tenantCompanyId) {
        const query = `
      UPDATE library_companies 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND tenant_company_id = $2
      RETURNING *
    `;
        const result = await pool.query(query, [id, tenantCompanyId]);
        return result.rows[0];
    }
}

module.exports = LibraryCompanyModel;
