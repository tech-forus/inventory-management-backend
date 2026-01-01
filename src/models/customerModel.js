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
      [companyId]
    );
    return result.rows;
  }

  /**
   * Get customer by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId]
    );
    return result.rows[0];
  }

  /**
   * Create a new customer
   */
  static async create(customerData, companyId) {
    const result = await pool.query(
      `INSERT INTO customers (
        company_id, customer_name, contact_person, email, phone, whatsapp_number,
        address_line1, address_line2, city, state, country, postal_code,
        company_name, gst_number, tax_id,
        credit_limit, outstanding_balance,
        is_active, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        companyId,
        customerData.customerName || customerData.name,
        customerData.contactPerson || null,
        customerData.email || customerData.emailId || null,
        customerData.phone || null,
        customerData.whatsappNumber || null,
        customerData.addressLine1 || customerData.address || null,
        customerData.addressLine2 || null,
        customerData.city || null,
        customerData.state || null,
        customerData.country || null,
        customerData.postalCode || customerData.pin || null,
        customerData.companyName || null,
        customerData.gstNumber || null,
        customerData.taxId || null,
        customerData.creditLimit || 0.00,
        customerData.outstandingBalance || 0.00,
        customerData.isActive !== undefined ? customerData.isActive : true,
        customerData.notes || null,
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
        customer_name = COALESCE($1, customer_name),
        contact_person = COALESCE($2, contact_person),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        whatsapp_number = COALESCE($5, whatsapp_number),
        address_line1 = COALESCE($6, address_line1),
        address_line2 = COALESCE($7, address_line2),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        country = COALESCE($10, country),
        postal_code = COALESCE($11, postal_code),
        company_name = COALESCE($12, company_name),
        gst_number = COALESCE($13, gst_number),
        tax_id = COALESCE($14, tax_id),
        credit_limit = COALESCE($15, credit_limit),
        outstanding_balance = COALESCE($16, outstanding_balance),
        is_active = COALESCE($17, is_active),
        notes = COALESCE($18, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19 AND company_id = $20
      RETURNING *`,
      [
        customerData.customerName || customerData.name || null,
        customerData.contactPerson || null,
        customerData.email || customerData.emailId || null,
        customerData.phone || null,
        customerData.whatsappNumber || null,
        customerData.addressLine1 || customerData.address || null,
        customerData.addressLine2 || null,
        customerData.city || null,
        customerData.state || null,
        customerData.country || null,
        customerData.postalCode || customerData.pin || null,
        customerData.companyName || null,
        customerData.gstNumber || null,
        customerData.taxId || null,
        customerData.creditLimit !== undefined ? customerData.creditLimit : null,
        customerData.outstandingBalance !== undefined ? customerData.outstandingBalance : null,
        customerData.isActive !== undefined ? customerData.isActive : null,
        customerData.notes || null,
        id,
        companyId,
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
      [id, companyId]
    );
    return result.rows[0];
  }
}

module.exports = CustomerModel;





