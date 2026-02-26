const pool = require('./database');

class CustomerModel {
  /**
   * Get all customers with filters and role-based access control
   */
  static async getAll(companyId, userId, role, filters = {}) {
    let whereClause = `WHERE c.company_id = $1`;
    const params = [companyId];
    let paramIndex = 2;

    // Role-based filtering
    if (role === 'user') {
      whereClause += ` AND c.assigned_to = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Stage filter
    if (filters.stage && filters.stage !== 'ALL' && filters.stage !== 'NEWLY_ADDED' && filters.stage !== 'NOT_CONTACTED') {
      whereClause += ` AND c.customer_stage = $${paramIndex}`;
      params.push(filters.stage.toLowerCase());
      paramIndex++;
    }

    // Newly Added filter
    if (filters.newlyAddedDays) {
      whereClause += ` AND c.created_at > NOW() - (INTERVAL '1 day' * $${paramIndex})`;
      params.push(parseInt(filters.newlyAddedDays));
      paramIndex++;
    } else if (filters.customFrom && filters.customTo) {
      whereClause += ` AND c.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.customFrom, filters.customTo);
      paramIndex += 2;
    }

    // Not Contacted filter (No leads in last X days)
    if (filters.notContactedDays) {
      whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM leads l 
        WHERE l.customer_id = c.id 
        AND l.created_at > NOW() - (INTERVAL '1 day' * $${paramIndex})
      )`;
      params.push(parseInt(filters.notContactedDays));
      paramIndex++;
    } else if (filters.notContactedFrom && filters.notContactedTo) {
      whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM leads l 
        WHERE l.customer_id = c.id 
        AND l.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}
      )`;
      params.push(filters.notContactedFrom, filters.notContactedTo);
      paramIndex += 2;
    }

    // Search filter
    if (filters.search) {
      whereClause += ` AND (
                c.customer_name ILIKE $${paramIndex} OR 
                c.phone ILIKE $${paramIndex} OR 
                c.email ILIKE $${paramIndex} OR 
                c.company_name ILIKE $${paramIndex} OR
                c.gst_number ILIKE $${paramIndex}
            )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      whereClause += ` AND c.is_active = $${paramIndex}`;
      params.push(filters.status === 'active');
      paramIndex++;
    }

    // NEW FILTERS
    if (filters.assignedTo) {
      whereClause += ` AND c.assigned_to = $${paramIndex}`;
      params.push(filters.assignedTo);
      paramIndex++;
    }

    if (filters.state) {
      whereClause += ` AND c.state = $${paramIndex}`;
      params.push(filters.state);
      paramIndex++;
    }

    if (filters.hasGst !== undefined && filters.hasGst !== null && filters.hasGst !== '') {
      if (filters.hasGst === 'true' || filters.hasGst === true) {
        whereClause += ` AND (c.gst_number IS NOT NULL AND c.gst_number != '')`;
      } else {
        whereClause += ` AND (c.gst_number IS NULL OR c.gst_number = '')`;
      }
    }

    if (filters.customerStage) {
      whereClause += ` AND c.customer_stage = $${paramIndex}`;
      params.push(filters.customerStage.toLowerCase());
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM customers c ${whereClause}`;
    const totalResult = await pool.query(countQuery, params);
    const total = parseInt(totalResult.rows[0].count);

    // Sorting logic
    let orderBy = 'c.created_at DESC';
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'ALPHABETICAL':
          orderBy = 'c.company_name ASC';
          break;
        case 'CITY':
          orderBy = 'c.city ASC';
          break;
        case 'LAST_INTERACTED':
          orderBy = 'stats.last_interaction_at DESC NULLS LAST';
          break;
        case 'TOTAL_REVENUE':
          orderBy = 'stats.total_revenue DESC NULLS LAST';
          break;
        default:
          orderBy = 'c.created_at DESC';
      }
    }

    let query = `
            SELECT c.*, u.full_name as assigned_to_name,
                   stats.last_interaction_at,
                   stats.total_revenue
            FROM customers c
            LEFT JOIN users u ON c.assigned_to = u.id
            LEFT JOIN (
              SELECT 
                customer_id, 
                MAX(created_at) as last_interaction_at,
                SUM(CASE WHEN status = 'WON' THEN estimated_value ELSE 0 END) as total_revenue
              FROM leads
              GROUP BY customer_id
            ) stats ON c.id = stats.customer_id
            ${whereClause}
            ORDER BY ${orderBy}
        `;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(filters.limit));
      paramIndex++;
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(parseInt(filters.offset));
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return { customers: result.rows, total };
  }

  /**
   * Get counts for different customer buckets
   */
  static async getCounts(companyId, userId, role) {
    let whereClause = `WHERE company_id = $1`;
    const params = [companyId];

    if (role === 'user') {
      whereClause += ` AND assigned_to = $2`;
      params.push(userId);
    }

    const query = `
      SELECT 
        COUNT(*) as "ALL",
        COUNT(*) FILTER (WHERE customer_stage = 'potential') as "POTENTIAL",
        COUNT(*) FILTER (WHERE customer_stage = 'existing') as "EXISTING",
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as "NEWLY_ADDED",
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM leads l 
          WHERE l.customer_id = customers.id 
          AND l.created_at > NOW() - INTERVAL '30 days'
        )) as "NOT_CONTACTED"
      FROM customers
      ${whereClause}
    `;

    const result = await pool.query(query, params);
    const row = result.rows[0];
    return {
      ALL: parseInt(row.ALL || 0),
      POTENTIAL: parseInt(row.POTENTIAL || 0),
      EXISTING: parseInt(row.EXISTING || 0),
      NEWLY_ADDED: parseInt(row.NEWLY_ADDED || 0),
      NOT_CONTACTED: parseInt(row.NOT_CONTACTED || 0)
    };
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
                customer_type, source, is_active, department, designation,
                payment_terms, consignee_address, is_consignee_same_as_billing,
                customer_stage
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
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
      data.billingAddress || data.address || data.address_line1,// address_line1
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
      data.designation || null,                                 // designation
      data.paymentTerms || 'Open Credit',                       // payment_terms
      data.consigneeAddress || null,                            // consignee_address
      data.isConsigneeSameAsBilling !== undefined ? data.isConsigneeSameAsBilling : false, // is_consignee_same_as_billing
      data.customerStage || data.customer_stage || 'potential'  // customer_stage
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
      designation: 'designation',
      billingAddress: 'address_line1',
      consigneeAddress: 'consignee_address',
      isConsigneeSameAsBilling: 'is_consignee_same_as_billing',
      paymentTerms: 'payment_terms',
      customerStage: 'customer_stage',
      customer_stage: 'customer_stage'
    };

    const updates = new Map();
    for (const [key, value] of Object.entries(data)) {
      const dbCol = mappings[key];
      if (dbCol && value !== undefined) {
        // Convert empty strings to null for the database
        const processedValue = value === '' ? null : value;
        updates.set(dbCol, processedValue);
      }
    }

    for (const [dbCol, value] of updates.entries()) {
      sets.push(`${dbCol} = $${paramIndex}`);
      if (dbCol === 'interests' || dbCol === 'tags') {
        params.push(Array.isArray(value) ? JSON.stringify(value) : value);
      } else {
        params.push(value);
      }
      paramIndex++;
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

  /**
   * Delete a customer (hard delete)
   */
  static async delete(id, companyId) {
    const query = `
            DELETE FROM customers
            WHERE id = $1 AND company_id = $2
            RETURNING *
        `;
    const result = await pool.query(query, [id, companyId]);
    return result.rows[0] || null;
  }
}

module.exports = CustomerModel;
