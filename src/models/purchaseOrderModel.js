const pool = require('./database');

class PurchaseOrderModel {
  /**
   * Create a new purchase order
   */
  static async create(poData, companyId, userId) {
    const query = `
      INSERT INTO purchase_orders (
        company_id, po_number, order_date, total_amount, status, items, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;
    const params = [
      companyId.toUpperCase(),
      poData.poNumber,
      poData.date || new Date(),
      poData.totalAmount || 0,
      poData.status || 'Created',
      JSON.stringify(poData.items || []),
      userId
    ];

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get all purchase orders for a company
   */
  static async getAll(companyId, filters = {}) {
    let query = `
      SELECT po.*, u.full_name as created_by_name 
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.company_id = $1
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    if (filters.search) {
      query += ` AND po.po_number ILIKE $${paramIndex}`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Default sorting by date desc
    query += ` ORDER BY po.order_date DESC, po.created_at DESC`;

    // Pagination
    if (filters.limit) {
      const limit = parseInt(filters.limit) || 20;
      const offset = parseInt(filters.offset) || 0;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get purchase order by ID
   */
  static async getById(id, companyId) {
    const query = `
      SELECT po.*, u.full_name as created_by_name 
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = $1 AND po.company_id = $2
    `;
    const result = await pool.query(query, [id, companyId.toUpperCase()]);
    return result.rows[0];
  }

  /**
   * Get purchase order by PO Number
   */
  static async getByPoNumber(poNumber, companyId) {
    const query = `
      SELECT * FROM purchase_orders 
      WHERE po_number = $1 AND company_id = $2
    `;
    const result = await pool.query(query, [poNumber, companyId.toUpperCase()]);
    return result.rows[0];
  }

  /**
   * Update purchase order status
   */
  static async updateStatus(id, status, companyId) {
    const query = `
      UPDATE purchase_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, id, companyId.toUpperCase()]);
    return result.rows[0];
  }
}

module.exports = PurchaseOrderModel;
