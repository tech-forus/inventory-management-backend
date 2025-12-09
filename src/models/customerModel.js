const pool = require('./database');

/**
 * Customer Model
 * Handles all database operations for customers
 */
class CustomerModel {
  /**
   * Get all customers for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM customers WHERE company_id = $1 AND is_active = true ORDER BY customer_name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get customer by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new customer
   */
  static async create(customerData, companyId) {
    const result = await pool.query(
      `INSERT INTO customers (
        company_id, company_name, customer_name, phone, email_id, gst_number,
        address, city, state, pin, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        companyId.toUpperCase(),
        customerData.companyName || null,
        customerData.customerName || customerData.name,
        customerData.phone || null,
        customerData.emailId || customerData.email || null,
        customerData.gstNumber || null,
        customerData.address || null,
        customerData.city || null,
        customerData.state || null,
        customerData.pin || null,
        customerData.isActive !== undefined ? customerData.isActive : true,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update a customer
   */
  static async update(id, customerData, companyId) {
    const result = await pool.query(
      `UPDATE customers SET
        company_name = COALESCE($1, company_name),
        customer_name = COALESCE($2, customer_name),
        phone = COALESCE($3, phone),
        email_id = COALESCE($4, email_id),
        gst_number = COALESCE($5, gst_number),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        pin = COALESCE($9, pin),
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND company_id = $12
      RETURNING *`,
      [
        customerData.companyName || null,
        customerData.customerName || customerData.name || null,
        customerData.phone || null,
        customerData.emailId || customerData.email || null,
        customerData.gstNumber || null,
        customerData.address || null,
        customerData.city || null,
        customerData.state || null,
        customerData.pin || null,
        customerData.isActive !== undefined ? customerData.isActive : null,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Delete a customer (soft delete by setting is_active = false)
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      `UPDATE customers SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }
}

module.exports = CustomerModel;





