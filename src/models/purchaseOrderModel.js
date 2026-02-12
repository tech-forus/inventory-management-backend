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
   * Generate next PO Number
   * Format: PO-YYMM-{COMPANY_INITIALS}-{SEQ}
   * Example: PO-2602-FEPL-0001
   */
  static async generateNextPoNumber(companyId) {
    // 1. Get Company Name for Initials
    const companyRes = await pool.query(
      'SELECT company_name FROM companies WHERE company_id = $1',
      [companyId.toUpperCase()]
    );

    let initials = 'FC'; // Fallback
    if (companyRes.rows.length > 0 && companyRes.rows[0].company_name) {
      const name = companyRes.rows[0].company_name;
      // Extract first letter of each word
      initials = name.trim().split(/\s+/)
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ''); // Ensure only alphanumeric
    }

    // 2. Date Component (YYMM)
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');

    // 3. Construct Prefix
    const prefix = `PO-${yy}${mm}-${initials}-`;

    // 4. Find Latest PO with this prefix
    const query = `
      SELECT po_number FROM purchase_orders 
      WHERE po_number LIKE $1 AND company_id = $2
      ORDER BY LENGTH(po_number) DESC, po_number DESC 
      LIMIT 1
    `;

    const result = await pool.query(query, [`${prefix}%`, companyId.toUpperCase()]);

    let sequence = 1;
    if (result.rows.length > 0) {
      const lastPo = result.rows[0].po_number;
      // Extract sequence part
      const lastSeqStr = lastPo.replace(prefix, '');
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    // 5. Format Full PO Number
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
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
