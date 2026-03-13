const pool = require('./database');

class CustomerUnitModel {
    /**
     * Create a new customer unit with auto-generated unit_code
     */
    static async create(companyId, data, client = null) {
        const db = client || await pool.connect();
        const shouldRelease = !client;

        try {
            if (shouldRelease) await db.query('BEGIN');

            // Use initials passed from parent create(), or fetch if standalone
            let initials = data.initials;
            if (!initials) {
                const companyRes = await db.query(
                    `SELECT cc.company_id FROM customer_companies cc WHERE cc.id = $1`,
                    [companyId]
                );
                if (companyRes.rows.length === 0) throw new Error('Parent company not found');
                const tenantId = companyRes.rows[0].company_id;
                const initialsRes = await db.query('SELECT get_company_initials($1) as initials', [tenantId]);
                initials = initialsRes.rows[0].initials;
            }

            // Generate a unique top-level CID code for this unit
            const cidRes = await db.query('SELECT generate_customer_company_code($1) as code', [initials]);
            const customerCode = cidRes.rows[0].code;

            const result = await db.query(`
                INSERT INTO customer_units (
                    company_id, unit_name, customer_code,
                    gst_number, billing_address, shipping_address, is_shipping_same_as_billing,
                    billing_pincode, billing_city, billing_state, billing_gst_number,
                    shipping_pincode, shipping_city, shipping_state, shipping_gst_number
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `, [
                companyId,
                data.unitName || data.name || 'Unit 1',
                customerCode,
                data.billingGstNumber || data.gstNumber || null,
                data.billingAddress || null,
                data.shippingAddress || null,
                data.isShippingSameAsBilling || false,
                data.billingPincode || null,
                data.billingCity || null,
                data.billingState || null,
                data.billingGstNumber || data.gstNumber || null,
                data.shippingPincode || null,
                data.shippingCity || null,
                data.shippingState || null,
                data.shippingGstNumber || null
            ]);

            const unit = result.rows[0];
            if (shouldRelease) await db.query('COMMIT');
            return unit;
        } catch (error) {
            if (shouldRelease) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldRelease) db.release();
        }
    }

    /**
     * Get all units for a tenant (all customer companies)
     */
    static async getAll(tenantCompanyId) {
        const query = `
            SELECT cu.*, cc.name as company_name
            FROM customer_units cu
            JOIN customer_companies cc ON cu.company_id = cc.id
            WHERE cc.company_id = $1
            ORDER BY cc.name ASC, cu.unit_name ASC
        `;
        const result = await pool.query(query, [tenantCompanyId]);
        return result.rows;
    }

    /**
     * Get all units for a company
     */
    static async getByCompanyId(companyId) {
        const query = `SELECT * FROM customer_units WHERE company_id = $1 ORDER BY created_at ASC`;
        const result = await pool.query(query, [companyId]);
        return result.rows;
    }

    /**
     * Get unit by ID
     */
    static async getById(id) {
        const query = `SELECT * FROM customer_units WHERE id = $1`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Update unit
     */
    static async update(id, data, client = null) {
        const db = client || pool;
        const sets = [];
        const params = [id];
        let paramIndex = 2;

        // Field mapping: camelCase from frontend -> snake_case DB column
        const fieldMap = {
            unitName: 'unit_name',
            name: 'unit_name',
            address: 'address',
            gstNumber: 'gst_number',
            billingAddress: 'billing_address',
            shippingAddress: 'shipping_address',
            isShippingSameAsBilling: 'is_shipping_same_as_billing',
            billingPincode: 'billing_pincode',
            billingCity: 'billing_city',
            billingState: 'billing_state',
            billingGstNumber: 'billing_gst_number',
            shippingPincode: 'shipping_pincode',
            shippingCity: 'shipping_city',
            shippingState: 'shipping_state',
            shippingGstNumber: 'shipping_gst_number'
        };

        for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
            if (data[jsKey] !== undefined) {
                sets.push(`${dbCol} = $${paramIndex}`);
                params.push(data[jsKey]);
                paramIndex++;
            }
        }

        if (sets.length === 0) return null;

        const query = `
            UPDATE customer_units 
            SET ${sets.join(', ')} 
            WHERE id = $1 
            RETURNING *
        `;
        const result = await db.query(query, params);
        return result.rows[0];
    }

    /**
     * Delete unit
     */
    static async delete(id) {
        const query = `DELETE FROM customer_units WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = CustomerUnitModel;
