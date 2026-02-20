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
    if (role === 'user') {
      query += ` AND c.assigned_to = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Search filter
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

    // Status filter
    if (filters.status) {
      query += ` AND c.is_active = $${paramIndex}`;
      params.push(filters.status === 'active');
      paramIndex++;
    }

    // Count query for pagination meta
    const countQuery = `SELECT COUNT(*) OVER() as total_count FROM customers c WHERE c.company_id = $1 ${query.split('WHERE c.company_id = $1')[1].split('ORDER BY')[0]}`;

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
  static async create(client, data, companyId, assignedTo) {
    const db = client || pool;
    // Map frontend fields (name, phone, etc) to DB columns if slightly different
    // DB Columns from migration 086 + 031:
    // customer_name, phone, email, company_name, city, postal_code, address_line1 (address), gst_number (gstin)
    // assigned_to, birthday, anniversary, interests, tags, loyalty_tier, preferred_categories, notes

    const query = `
            INSERT INTO customers (
                company_id, assigned_to, customer_name, phone, email, 
                company_name, city, postal_code, address_line1, gst_number,
                birthday, anniversary, interests, tags, loyalty_tier, 
                preferred_categories, notes, whatsapp_number, contact_person,
                date_of_birth, personal_address, credit_period, state,
                customer_type, source, is_active, department, designation
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
            RETURNING *
        `;

    const params = [
      companyId,
      assignedTo,
      data.name || data.customer_name,                          // customer_name
      data.phone,
      data.email,
      data.company_name || data.name,                           // company_name (fallback to name)
      data.city,
      data.pin || data.pincode || data.postal_code,             // postal_code
      data.address || data.address_line1,                       // address_line1
      data.gstNumber || data.gstin || data.gst_number,          // gst_number
      data.dateOfBirth || data.birthday || null,                // birthday
      data.anniversaryDate || data.anniversary || null,         // anniversary
      JSON.stringify(data.interests || []),
      JSON.stringify(data.tags || []),
      data.loyaltyTier || data.loyalty_tier || null,            // loyalty_tier
      data.preferred_categories || null,
      data.notes || null,
      data.whatsappNumber || data.whatsapp_number || null,      // whatsapp_number
      data.contactPerson || data.contact_person || null,        // contact_person
      data.dateOfBirth || data.date_of_birth || null,           // date_of_birth
      data.personalAddress || data.personal_address || null,    // personal_address
      data.creditPeriod || data.credit_period || 0,             // credit_period
      data.state || null,                                       // state
      data.customerType || data.customer_type || null,          // customer_type
      data.source || null,                                      // source
      data.isActive !== undefined ? data.isActive : true,       // is_active
      data.department || null,                                  // department
      data.designation || null                                  // designation
    ];

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Get a single customer by ID
   */
  static async getById(id, companyId) {
    const query = `
            SELECT c.*, u.full_name as assigned_to_name
            FROM customers c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.id = $1 AND c.company_id = $2
        `;
    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }

  /**
   * Update customer
   */
  static async update(client, id, data, companyId) {
    const db = client || pool;
    // Dynamic update to handle partial updates
    const sets = [];
    const params = [id, companyId];
    let paramIndex = 3;

    const mappings = {
      // Frontend camelCase keys → DB column names
      name: 'customer_name',
      customerName: 'customer_name',
      phone: 'phone',
      email: 'email',
      company_name: 'company_name',
      city: 'city',
      state: 'state',
      pin: 'postal_code',
      pincode: 'postal_code',
      address: 'address_line1',
      gstNumber: 'gst_number',
      gstin: 'gst_number',
      whatsappNumber: 'whatsapp_number',
      contactPerson: 'contact_person',
      dateOfBirth: 'date_of_birth',
      birthday: 'birthday',
      anniversaryDate: 'anniversary',
      anniversary: 'anniversary',
      personalAddress: 'personal_address',
      creditPeriod: 'credit_period',
      interests: 'interests',
      tags: 'tags',
      loyaltyTier: 'loyalty_tier',
      loyalty_tier: 'loyalty_tier',
      customerType: 'customer_type',
      customer_type: 'customer_type',
      source: 'source',
      preferred_categories: 'preferred_categories',
      notes: 'notes',
      isActive: 'is_active',
      department: 'department',
      designation: 'designation'
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

    const result = await db.query(query, params);
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
