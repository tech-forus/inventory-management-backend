const pool = require('./database');

/**
 * Vendor Model
 * Handles all database operations for vendors
 */
class VendorModel {
  /**
   * Get all vendors for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM vendors WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get vendor by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM vendors WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new vendor
   */
  static async create(vendorData, companyId) {
    const result = await pool.query(
      `INSERT INTO vendors (
        company_id, name, contact_person, designation, email, phone, whatsapp_number, gst_number,
        address, city, state, pin, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        companyId.toUpperCase(),
        vendorData.name,
        vendorData.contactPerson || null,
        vendorData.designation || null,
        vendorData.email || null,
        vendorData.phone || null,
        vendorData.whatsappNumber || null,
        vendorData.gstNumber || null,
        vendorData.address || null,
        vendorData.city || null,
        vendorData.state || null,
        vendorData.pin || null,
        vendorData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update vendor
   */
  static async update(id, vendorData, companyId) {
    const result = await pool.query(
      `UPDATE vendors SET
        name = $1, contact_person = $2, designation = $3, email = $4,
        phone = $5, whatsapp_number = $6, gst_number = $7, address = $8, city = $9,
        state = $10, pin = $11, is_active = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND company_id = $14
      RETURNING *`,
      [
        vendorData.name,
        vendorData.contactPerson || null,
        vendorData.designation || null,
        vendorData.email || null,
        vendorData.phone || null,
        vendorData.whatsappNumber || null,
        vendorData.gstNumber || null,
        vendorData.address || null,
        vendorData.city || null,
        vendorData.state || null,
        vendorData.pin || null,
        vendorData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Soft delete vendor
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE vendors SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Bulk create vendors
   */
  static async bulkCreate(vendors, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const vendor of vendors) {
        const result = await client.query(
          `INSERT INTO vendors (
            company_id, name, contact_person, designation, email, phone, whatsapp_number, gst_number,
            address, city, state, pin
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (company_id, name) DO UPDATE
          SET contact_person = EXCLUDED.contact_person,
              designation = EXCLUDED.designation,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              whatsapp_number = EXCLUDED.whatsapp_number,
              gst_number = EXCLUDED.gst_number,
              address = EXCLUDED.address,
              city = EXCLUDED.city,
              state = EXCLUDED.state,
              pin = EXCLUDED.pin,
              updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
          [
            companyId.toUpperCase(),
            vendor.name,
            vendor.contactPerson || vendor.contact_person || null,
            vendor.designation || null,
            vendor.email || null,
            vendor.phone || null,
            vendor.whatsappNumber || vendor.whatsapp_number || null,
            vendor.gstNumber || vendor.gst_number || null,
            vendor.address || null,
            vendor.city || null,
            vendor.state || null,
            vendor.pin || null,
          ]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = VendorModel;


