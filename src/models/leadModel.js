const pool = require('./database');
const { ValidationError } = require('../middlewares/errorHandler');

const LEAD_STATUS_TRANSITIONS = {
    'OPEN': ['NEGOTIATION', 'LOST', 'NOT_RESPONSE'],
    'NEGOTIATION': ['WON', 'LOST', 'OPEN', 'NOT_RESPONSE'],
    'NOT_RESPONSE': ['OPEN', 'LOST'],
    'WON': [],
    'LOST': []
};

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
                   c.email as customer_email,
                   c.city as customer_city,
                   fu.scheduled_at AS next_followup_at,
                   fu.id AS next_followup_id,
                   fu.note AS next_followup_note,
                   CASE
                     WHEN fu.scheduled_at IS NULL THEN 'NO_FOLLOWUP'
                     WHEN fu.scheduled_at < now() THEN 'OVERDUE'
                     WHEN fu.scheduled_at <= now() + interval '1 hour' THEN 'DUE_SOON'
                     ELSE 'PENDING'
                   END AS followup_state,
                   la.type  AS last_activity_type,
                   la.note  AS last_activity_note,
                   la.logged_at AS last_activity_at,
                   (SELECT COUNT(*) FROM lead_items li WHERE li.lead_id = l.id) as item_count,
                   (SELECT json_agg(json_build_object('id', li.id, 'item_name', li.item_name, 'quantity', li.quantity, 'estimated_value', li.estimated_value))
                    FROM lead_items li WHERE li.lead_id = l.id) as items
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN customers c ON l.customer_id = c.id
            LEFT JOIN LATERAL (
              SELECT id, scheduled_at, note
              FROM lead_followups
              WHERE lead_id = l.id
                AND status = 'PENDING'
              ORDER BY scheduled_at ASC
              LIMIT 1
            ) fu ON true
            LEFT JOIN LATERAL (
              SELECT type, note, logged_at
              FROM lead_activities
              WHERE lead_id = l.id
              ORDER BY logged_at DESC
              LIMIT 1
            ) la ON true
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
            if (filters.status === 'NEGLECTED') {
                query += ` AND fu.id IS NULL AND l.status NOT IN ('WON', 'LOST')`;
            } else {
                query += ` AND l.status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }
        }

        if (filters.search) {
            query += ` AND (
                l.customer_name ILIKE $${paramIndex} OR 
                l.customer_phone ILIKE $${paramIndex} OR
                l.notes ILIKE $${paramIndex} OR
                c.company_name ILIKE $${paramIndex} OR
                c.customer_name ILIKE $${paramIndex}
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
                data.status || 'OPEN',
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

            // Insert Follow Up if provided (using new table)
            if (data.initial_follow_up) {
                const followQuery = `
                    INSERT INTO lead_followups (lead_id, scheduled_at, note, created_by)
                    VALUES ($1, $2, $3, $4)
                `;
                await client.query(followQuery, [
                    lead.id,
                    data.initial_follow_up.scheduled_at,
                    data.initial_follow_up.note,
                    assignedTo
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
                   c.email as customer_email,
                   c.city as customer_city,
                   c.phone as customer_phone_alt,
                   (SELECT json_agg(json_build_object(
                       'id', li.id, 
                       'sku_code', li.sku_code,
                       'item_name', li.item_name, 
                       'quantity', li.quantity, 
                       'estimated_value', li.estimated_value
                   )) FROM lead_items li WHERE li.lead_id = l.id) as items,
                   (SELECT json_agg(json_build_object(
                       'id', f.id,
                       'scheduled_at', f.scheduled_at,
                       'note', f.note,
                       'status', f.status,
                       'completed_at', f.completed_at
                   ) ORDER BY f.scheduled_at DESC) FROM lead_followups f WHERE f.lead_id = l.id) as follow_ups,
                   (SELECT json_agg(json_build_object(
                       'id', a.id,
                       'type', a.type,
                       'note', a.note,
                       'logged_at', a.logged_at,
                       'logged_by', a.logged_by
                   ) ORDER BY a.logged_at DESC) FROM lead_activities a WHERE a.lead_id = l.id) as activities
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
        const params = [id, companyId];
        let paramIndex = 3;

        const allowedFields = ['status', 'priority', 'notes', 'estimated_value', 'closed_reason', 'closed_at'];

        for (const key of Object.keys(data)) {
            if (allowedFields.includes(key)) {
                sets.push(`${key} = $${paramIndex}`);
                params.push(data[key]);
                paramIndex++;
            }
        }

        if (sets.length === 0 && !data.items) return this.getById(id, companyId);

        if (sets.length > 0) {
            // State Machine Validation
            if (data.status) {
                const currentRes = await pool.query('SELECT status FROM leads WHERE id = $1 AND company_id = $2', [id, companyId]);
                if (currentRes.rows.length === 0) return null;
                const currentStatus = currentRes.rows[0].status;

                if (currentStatus !== data.status) {
                    const allowed = LEAD_STATUS_TRANSITIONS[currentStatus] || [];
                    if (!allowed.includes(data.status)) {
                        throw new ValidationError(`Invalid progression: Cannot move from ${currentStatus} to ${data.status}`);
                    }
                }
            }

            const query = `
                UPDATE leads
                SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
                RETURNING *
            `;
            await pool.query(query, params);
        }

        // If items are provided, update them in a transaction
        if (data.items) {
            await this.updateItems(id, data.items);
        }

        return this.getById(id, companyId);
    }

    /**
     * Update lead items (Delete and Re-insert logic)
     */
    static async updateItems(leadId, items) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM lead_items WHERE lead_id = $1', [leadId]);
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
    static async addFollowUp(leadId, data, userId) {
        const client = await pool.connect();
        try {
            const leadRes = await client.query('SELECT status FROM leads WHERE id = $1', [leadId]);
            if (leadRes.rows.length === 0) throw new Error('Lead not found');
            const leadStatus = leadRes.rows[0].status;

            if (['WON', 'LOST'].includes(leadStatus)) {
                throw new ValidationError('Cannot schedule follow-up for a closed deal (WON/LOST)');
            }

            await client.query('BEGIN');

            // Business rule: one active follow-up per lead
            await client.query(`
                UPDATE lead_followups
                SET status = 'CANCELLED'
                WHERE lead_id = $1 AND status = 'PENDING'
            `, [leadId]);

            const query = `
                INSERT INTO lead_followups (lead_id, scheduled_at, note, created_by)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await client.query(query, [leadId, data.scheduled_at, data.note, userId]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    /**
     * Mark Follow-up as Completed
     */
    static async completeFollowUp(followUpId) {
        const query = `
            UPDATE lead_followups
            SET status = 'COMPLETED',
                completed_at = now()
            WHERE id = $1 AND status = 'PENDING'
            RETURNING *
        `;
        const result = await pool.query(query, [followUpId]);
        return result.rows[0];
    }

    /**
     * Add Activity Log entry
     */
    static async addActivity(leadId, data, userId, companyId) {
        const query = `
            INSERT INTO lead_activities (lead_id, company_id, type, note, logged_by, logged_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const loggedAt = data.logged_at || new Date().toISOString();
        const result = await pool.query(query, [
            leadId, companyId, data.type, data.note || null, userId, loggedAt
        ]);
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
            openLeads: `SELECT COUNT(*) FROM leads l ${whereClause} AND status IN ('OPEN', 'NEGOTIATION', 'NOT_RESPONSE')`,
            wonLeads: `SELECT COUNT(*) FROM leads l ${whereClause} AND status = 'WON'`,
            totalValue: `SELECT COALESCE(SUM(estimated_value), 0) FROM leads l ${whereClause}`,
            wonValue: `SELECT COALESCE(SUM(estimated_value), 0) FROM leads l ${whereClause} AND status = 'WON'`,
            upcomingFollowUps: `
                SELECT COUNT(*) 
                FROM lead_followups f
                JOIN leads l ON f.lead_id = l.id
                ${whereClause} 
                AND f.scheduled_at BETWEEN now() AND (now() + INTERVAL '7 days')
                AND f.status = 'PENDING'
            `,
            totalCustomers: `SELECT COUNT(*) FROM customers WHERE company_id = $1`,
            upcomingFollowUpsList: `
                SELECT f.*, l.customer_name, l.id as lead_id
                FROM lead_followups f
                JOIN leads l ON f.lead_id = l.id
                ${whereClause}
                AND f.scheduled_at BETWEEN now() AND (now() + INTERVAL '7 days')
                AND f.status = 'PENDING'
                ORDER BY f.scheduled_at ASC
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
