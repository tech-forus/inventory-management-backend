const pool = require('./database');

class CustomerModel {
  /**
   * Get all customers with filters and role-based access control
   */
  static async getAll(companyId, userId, role, filters = {}) {
    let whereClause = `WHERE cc.company_id = $1 AND cc.deleted_at IS NULL`;
    const params = [companyId];
    let paramIndex = 2;

    // Search filter
    if (filters.search) {
      whereClause += ` AND (
                cc.name ILIKE $${paramIndex} OR 
                cc.phone ILIKE $${paramIndex} OR 
                cc.email ILIKE $${paramIndex} OR 
                comp.name ILIKE $${paramIndex} OR
                comp.gst_number ILIKE $${paramIndex} OR
                comp.customer_code ILIKE $${paramIndex}
            )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      whereClause += ` AND cc.is_active = $${paramIndex}`;
      params.push(filters.status === 'active');
      paramIndex++;
    }

    // Role-based filtering (if applicable to new structure)
    // Assuming assigned_to might be added to companies or contacts later, 
    // for now we filter by companyId which is tenant id.

    const countQuery = `
      SELECT COUNT(*) 
      FROM customer_contacts cc
      JOIN customer_companies comp ON cc.customer_company_id = comp.id
      ${whereClause}
    `;
    const totalResult = await pool.query(countQuery, params);
    const total = parseInt(totalResult.rows[0].count);

    // Sorting logic
    let orderBy = 'cc.created_at DESC';
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'ALPHABETICAL':
          orderBy = 'comp.name ASC, cc.name ASC';
          break;
        case 'CITY':
          orderBy = 'comp.billing_city ASC';
          break;
        default:
          orderBy = 'cc.created_at DESC';
      }
    }

    let query = `
            SELECT 
                cc.id,
                cc.name,
                cc.phone,
                cc.email,
                cc.department,
                cc.designation,
                cc.is_active,
                cc.created_at,
                comp.id as customer_company_id,
                comp.name as company_name,
                comp.customer_code,
                comp.customer_type,
                comp.customer_stage,
                comp.gst_number,
                comp.billing_address,
                comp.billing_city as city,
                comp.billing_state as state,
                comp.billing_pin as postal_code
            FROM customer_contacts cc
            JOIN customer_companies comp ON cc.customer_company_id = comp.id
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

    // Map fields to match legacy frontend expectations
    const customers = result.rows.map(row => ({
      ...row,
      // Frontend expects 'name' to be the primary display name, 
      // which we've already set as cc.name. 
      // 'company_name' is also correct.
      isActive: row.is_active,
      address_line1: row.billing_address,
      postal_code: row.postal_code,
      gst_number: row.gst_number
    }));

    return { customers, total };
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
   * Generate the next customer code (CUST-001, POT-001, etc.)
   */
  static async generateCustomerCode(db, companyId, stage) {
    const prefix = stage === 'existing' ? 'CUST' : 'POT';
    const result = await db.query(
      `SELECT generate_customer_code($1, $2) as code`,
      [companyId, prefix]
    );
    return result.rows[0].code;
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

    const stage = data.customerStage || data.customer_stage || 'potential';
    const customerCode = await CustomerModel.generateCustomerCode(db, companyId, stage);

    const query = `
            INSERT INTO customers (
                company_id, assigned_to, customer_name, phone, email, 
                company_name, city, postal_code, address_line1, gst_number,
                birthday, anniversary, interests, tags, loyalty_tier, 
                preferred_categories, notes, whatsapp_number, contact_person,
                date_of_birth, personal_address, credit_period, state,
                customer_type, source, is_active, department, designation,
                payment_terms, consignee_address, is_consignee_same_as_billing,
                customer_stage, customer_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
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
      stage,                                                    // customer_stage
      customerCode                                              // customer_code
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
      customer_stage: 'customer_stage',
      customerCode: 'customer_code',
      customer_code: 'customer_code',
      isPinned: 'is_pinned',
      is_pinned: 'is_pinned'
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

    // If customer_stage is being changed to 'existing', auto-generate a new CUST code
    const newStage = updates.get('customer_stage');
    if (newStage === 'existing') {
      // Check if customer currently has a POT code (meaning they're being promoted)
      const currentCustomer = await db.query(
        'SELECT customer_code, customer_stage FROM customers WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );
      const current = currentCustomer.rows[0];
      if (current && current.customer_stage === 'potential' && current.customer_code && (current.customer_code.startsWith('POT-') || current.customer_code.includes('/PT') || current.customer_code.includes('/PID'))) {
        // Generate a new CUST code
        const newCode = await CustomerModel.generateCustomerCode(db, companyId, 'existing');
        sets.push(`customer_code = $${paramIndex}`);
        params.push(newCode);
        paramIndex++;
      }
    }

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
