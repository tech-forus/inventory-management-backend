const pool = require('./database');

class CustomerModel {
  /**
   * Get all customers with filters and role-based access control
   */
  static async getAll(companyId, userId, role, filters = {}) {
    let query = `
            SELECT c.*, u.full_name as assigned_to_name
            FROM customers c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.company_id = $1
        `;
    const params = [companyId];
    let paramIndex = 2;

    // Role-based filtering
    // User sees only their own customers
    if (role === 'user') {
      query += ` AND c.assigned_to = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Search filter (name, phone, email, company_name)
    if (filters.search) {
      query += ` AND (
                c.customer_name ILIKE $${paramIndex} OR 
                c.phone ILIKE $${paramIndex} OR 
                c.email ILIKE $${paramIndex} OR 
                c.company_name ILIKE $${paramIndex}
            )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Create a new customer
   */
  static async create(data, companyId, assignedTo) {
    // Map frontend fields (name, phone, etc) to DB columns if slightly different
    // DB Columns from migration 086 + 031:
    // customer_name, phone, email, company_name, city, postal_code, address_line1 (address), gst_number (gstin)
    // assigned_to, birthday, anniversary, interests, tags, loyalty_tier, preferred_categories, notes

    const query = `
            INSERT INTO customers (
                company_id, assigned_to, customer_name, phone, email, 
                company_name, city, postal_code, address_line1, gst_number,
                birthday, anniversary, interests, tags, loyalty_tier, 
                preferred_categories, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `;

    const params = [
      companyId,
      assignedTo,
      data.name,                 // customer_name
      data.phone,
      data.email,
      data.company_name,
      data.city,
      data.pincode,              // postal_code
      data.address,              // address_line1
      data.gstin,                // gst_number
      data.birthday || null,
      data.anniversary || null,
      JSON.stringify(data.interests || []),
      JSON.stringify(data.tags || []),
      data.loyalty_tier || null,
      data.preferred_categories || null,
      data.notes || null
    ];

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Update customer
   */
  static async update(id, data, companyId) {
    // Dynamic update to handle partial updates
    const sets = [];
    const params = [id, companyId];
    let paramIndex = 3;

    const mappings = {
      name: 'customer_name',
      phone: 'phone',
      email: 'email',
      company_name: 'company_name',
      city: 'city',
      pincode: 'postal_code',
      address: 'address_line1',
      gstin: 'gst_number',
      birthday: 'birthday',
      anniversary: 'anniversary',
      interests: 'interests',
      tags: 'tags',
      loyalty_tier: 'loyalty_tier',
      preferred_categories: 'preferred_categories',
      notes: 'notes'
    };

    for (const [key, value] of Object.entries(data)) {
      if (mappings[key]) {
        sets.push(`${mappings[key]} = $${paramIndex}`);
        if (key === 'interests' || key === 'tags') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
        paramIndex++;
      }
    }

    if (sets.length === 0) return null;

    const query = `
            UPDATE customers
            SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND company_id = $2
            RETURNING *
        `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Reassign customer (Admin only)
   */
  static async reassign(id, newUserId, companyId) {
    const query = `
            UPDATE customers
            SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND company_id = $3
            RETURNING *
        `;
    const result = await pool.query(query, [newUserId, id, companyId]);
    return result.rows[0];
  }
}

module.exports = CustomerModel;
