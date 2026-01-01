const pool = require('./database');

/**
 * Transportor Model
 * Handles all database operations for transportors
 */
class TransportorModel {
  /**
   * Get all transportors for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM transportors WHERE company_id = $1 AND is_active = true ORDER BY transporter_name',
      [companyId]
    );
    return result.rows;
  }

  /**
   * Get transportor by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM transportors WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId]
    );
    return result.rows[0];
  }

  /**
   * Create a new transportor
   */
  static async create(transportorData, companyId) {
    const result = await pool.query(
      `INSERT INTO transportors (
        company_id, transporter_name, contact_person_name, contact_number,
        email_id, gst_number, sub_vendor, is_active, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        companyId,
        transportorData.name || transportorData.transporterName,
        transportorData.contactPerson || transportorData.contactPersonName,
        transportorData.contactNumber,
        transportorData.email || transportorData.emailId,
        transportorData.gstNumber,
        transportorData.subVendor || '',
        transportorData.isActive !== undefined ? transportorData.isActive : true,
        transportorData.remarks || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update a transportor
   */
  static async update(id, transportorData, companyId) {
    const result = await pool.query(
      `UPDATE transportors SET
        transporter_name = COALESCE($1, transporter_name),
        contact_person_name = COALESCE($2, contact_person_name),
        contact_number = COALESCE($3, contact_number),
        email_id = COALESCE($4, email_id),
        gst_number = COALESCE($5, gst_number),
        sub_vendor = COALESCE($6, sub_vendor),
        is_active = COALESCE($7, is_active),
        remarks = COALESCE($8, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND company_id = $10
      RETURNING *`,
      [
        transportorData.name || transportorData.transporterName || null,
        transportorData.contactPerson || transportorData.contactPersonName || null,
        transportorData.contactNumber || null,
        transportorData.email || transportorData.emailId || null,
        transportorData.gstNumber || null,
        transportorData.subVendor || null,
        transportorData.isActive !== undefined ? transportorData.isActive : null,
        transportorData.remarks || null,
        id,
        companyId,
      ]
    );
    return result.rows[0];
  }

  /**
   * Delete a transportor (soft delete by setting is_active = false)
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      `UPDATE transportors SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId]
    );
    return result.rows[0];
  }
}

module.exports = TransportorModel;

