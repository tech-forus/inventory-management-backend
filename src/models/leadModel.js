const pool = require('./database');

class LeadModel {
    /**
     * Get all leads with filters and role-based access control
     */
    static async getAll(companyId, userId, role, filters = {}) {
        let query = `
            SELECT l.*, 
                   u.full_name as assigned_to_name,
                   c.customer_name as linked_customer_name,
                   c.company_name as customer_company,
                   c.contact_person as customer_contact_person,
                   (SELECT COUNT(*) FROM lead_items li WHERE li.lead_id = l.id) as item_count,
                   (SELECT json_agg(json_build_object('id', li.id, 'item_name', li.item_name, 'quantity', li.quantity, 'estimated_value', li.estimated_value)) 
                    FROM lead_items li WHERE li.lead_id = l.id) as items,
                   (SELECT json_agg(json_build_object(
                       'id', f.id, 
                       'follow_up_date', f.follow_up_date,
                       'follow_up_time', f.follow_up_time, 
                       'note', f.note, 
                       'is_done', f.is_done
                   )) FROM lead_follow_ups f WHERE f.lead_id = l.id) as follow_ups
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN customers c ON l.customer_id = c.id
            WHERE l.company_id = $1 AND l.deleted_at IS NULL
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (role === 'user') {
            query += ` AND l.assigned_to = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        if (filters.status) {
            query += ` AND l.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.search) {
            query += ` AND (
                l.customer_name ILIKE $${paramIndex} OR 
                l.customer_phone ILIKE $${paramIndex} OR
                l.notes ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        query += ` ORDER BY l.created_at DESC`;

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
     * Create lead + items in transaction
     */
    static async create(data, companyId, assignedTo) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Inserting lead:', data);

            // Insert Lead
            const leadQuery = `
                INSERT INTO leads (
                    company_id, assigned_to, customer_id, 
                    customer_name, customer_phone, type, status, 
                    source, priority, estimated_value, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;
            const leadParams = [
                companyId,
                assignedTo,
                data.customer_id || null,
                data.customer_name,
                data.customer_phone,
                data.type || 'purchase',
                data.status || 'open',
                data.source || 'walk_in',
                data.priority || 'medium',
                data.estimated_value || 0,
                data.notes
            ];

            const leadResult = await client.query(leadQuery, leadParams);
            const lead = leadResult.rows[0];

            // Insert Lead Items if any
            if (data.items && data.items.length > 0) {
                const itemQuery = `
                    INSERT INTO lead_items (lead_id, sku_code, item_name, quantity, estimated_value)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                for (const item of data.items) {
                    await client.query(itemQuery, [
                        lead.id,
                        item.sku_code || null,
                        item.item_name,
                        item.quantity || 1,
                        item.estimated_value || 0
                    ]);
                }
            }

            // Insert Follow Up if provided (optional convenience)
            if (data.initial_follow_up) {
                const followQuery = `
                    INSERT INTO lead_follow_ups (lead_id, follow_up_date, follow_up_time, note)
                    VALUES ($1, $2, $3, $4)
                `;
                await client.query(followQuery, [
                    lead.id,
                    data.initial_follow_up.date,
                    data.initial_follow_up.time,
                    data.initial_follow_up.note
                ]);
            }

            await client.query('COMMIT');
            return lead;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    /**
     * Get single lead with full details
     */
    static async getById(id, companyId) {
        const query = `
            SELECT l.*, 
                   u.full_name as assigned_to_name,
                   c.customer_name as linked_customer_name,
                   c.company_name as customer_company,
                   c.contact_person as customer_contact_person,
                   (SELECT json_agg(json_build_object(
                       'id', li.id, 
                       'sku_code', li.sku_code,
                       'item_name', li.item_name, 
                       'quantity', li.quantity, 
                       'estimated_value', li.estimated_value
                   )) FROM lead_items li WHERE li.lead_id = l.id) as items,
                   (SELECT json_agg(json_build_object(
                       'id', f.id, 
                       'follow_up_date', f.follow_up_date,
                       'follow_up_time', f.follow_up_time, 
                       'note', f.note, 
                       'is_done', f.is_done
                   )) FROM lead_follow_ups f WHERE f.lead_id = l.id) as follow_ups
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN customers c ON l.customer_id = c.id
            WHERE l.id = $1 AND l.company_id = $2 AND l.deleted_at IS NULL
        `;
        const result = await pool.query(query, [id, companyId]);
        return result.rows[0];
    }

    /**
     * Update Lead
     */
    static async update(id, data, companyId) {
        // Implement simple dynamic update for lead fields
        const sets = [];
        const params = [id, companyId]; // Note: update generally doesn't check assigned_to, allows admins/users to update if they have access (controller checks permissions)
        let paramIndex = 3;

        const allowedFields = ['status', 'priority', 'notes', 'estimated_value', 'closed_reason', 'closed_at']; // Add others as needed

        for (const key of Object.keys(data)) {
            if (allowedFields.includes(key)) {
                sets.push(`${key} = $${paramIndex}`);
                params.push(data[key]);
                paramIndex++;
            }
        }

        if (sets.length === 0) return null;

        const query = `
            UPDATE leads
            SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;
        const result = await pool.query(query, params);

        // If items are provided, update them in a transaction
        if (result.rows[0] && data.items) {
            await this.updateItems(id, data.items);
        }

        return result.rows[0];
    }

    /**
     * Update lead items (Delete and Re-insert logic)
     */
    static async updateItems(leadId, items) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Delete existing items
            await client.query('DELETE FROM lead_items WHERE lead_id = $1', [leadId]);

            // 2. Insert new items
            if (items && items.length > 0) {
                const itemQuery = `
                    INSERT INTO lead_items (lead_id, sku_code, item_name, quantity, estimated_value)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                for (const item of items) {
                    await client.query(itemQuery, [
                        leadId,
                        item.sku_code || null,
                        item.item_name,
                        item.quantity || 1,
                        item.estimated_value || 0
                    ]);
                }
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    /**
     * Soft Delete Lead
     */
    static async delete(id, companyId) {
        const query = `
            UPDATE leads 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND company_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [id, companyId]);
        return result.rows[0];
    }

    /**
     * Add Follow-up
     */
    static async addFollowUp(leadId, data) {
        const query = `
            INSERT INTO lead_follow_ups (lead_id, follow_up_date, follow_up_time, note)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [leadId, data.date, data.time, data.note]);
        return result.rows[0];
    }

    /**
     * Mark Follow-up as Done
     */
    static async markFollowUpDone(followUpId, isDone = true) {
        const query = `
            UPDATE lead_follow_ups
            SET is_done = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [isDone, followUpId]);
        return result.rows[0];
    }

    /**
     * Get Dashboard Stats
     */
    static async getDashboardStats(companyId, userId, role) {
        // Build base WHERE clause
        let whereClause = `WHERE l.company_id = $1`;
        const params = [companyId];

        if (role === 'user') {
            whereClause += ` AND l.assigned_to = $2 AND l.deleted_at IS NULL`;
            params.push(userId);
        } else {
            whereClause += ` AND l.deleted_at IS NULL`;
        }

        const queries = {
            totalLeads: `SELECT COUNT(*) FROM leads l ${whereClause}`,
            openLeads: `SELECT COUNT(*) FROM leads l ${whereClause} AND status = 'open'`,
            wonLeads: `SELECT COUNT(*) FROM leads l ${whereClause} AND status = 'closed_won'`,
            totalValue: `SELECT COALESCE(SUM(estimated_value), 0) FROM leads l ${whereClause}`,
            wonValue: `SELECT COALESCE(SUM(estimated_value), 0) FROM leads l ${whereClause} AND status = 'closed_won'`,
            upcomingFollowUps: `
                SELECT COUNT(*) 
                FROM lead_follow_ups f
                JOIN leads l ON f.lead_id = l.id
                ${whereClause} 
                AND f.follow_up_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
                AND f.is_done = FALSE
            `,
            totalCustomers: `SELECT COUNT(*) FROM customers WHERE company_id = $1`,
            upcomingFollowUpsList: `
                SELECT f.*, l.customer_name, l.id as lead_id
                FROM lead_follow_ups f
                JOIN leads l ON f.lead_id = l.id
                ${whereClause}
                AND f.follow_up_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
                AND f.is_done = FALSE
                ORDER BY f.follow_up_date ASC, f.follow_up_time ASC
                LIMIT 10
            `
        };

        // If user, query needs $2.
        if (role === 'user') {
            queries.totalCustomers += ` AND assigned_to = $2`;
        }

        // Execute all in parallel
        const results = await Promise.all([
            pool.query(queries.totalLeads, params),
            pool.query(queries.openLeads, params),
            pool.query(queries.wonLeads, params),
            pool.query(queries.totalValue, params),
            pool.query(queries.wonValue, params),
            pool.query(queries.upcomingFollowUps, params),
            pool.query(queries.totalCustomers, params),
            pool.query(queries.upcomingFollowUpsList, params)
        ]);

        return {
            totalLeads: parseInt(results[0].rows[0].count),
            openLeads: parseInt(results[1].rows[0].count),
            wonLeads: parseInt(results[2].rows[0].count),
            totalValue: parseFloat(results[3].rows[0].coalesce),
            wonValue: parseFloat(results[4].rows[0].coalesce),
            upcomingFollowUps: parseInt(results[5].rows[0].count),
            totalCustomers: parseInt(results[6].rows[0].count),
            upcomingFollowUpsList: results[7].rows
        };
    }
}

module.exports = LeadModel;
