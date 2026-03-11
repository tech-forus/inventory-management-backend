const pool = require('./database');
const { ValidationError } = require('../middlewares/errorHandler');

const LEAD_STATUS_TRANSITIONS = {
    'OPEN': ['MEETING', 'LOST', 'NOT_RESPONSE'],
    'MEETING': ['QUOTATION', 'LOST', 'NOT_RESPONSE'],
    'QUOTATION': ['NEGOTIATION', 'LOST', 'NOT_RESPONSE'],
    'NEGOTIATION': ['WON', 'LOST', 'NOT_RESPONSE'],
    'NOT_RESPONSE': ['MEETING'],  // revival path only
    'LOST': ['MEETING'],          // re-engage path only
    'WON': []                     // terminal
};

const STAGE_PROBABILITY = {
    'OPEN': 5,
    'MEETING': 10,
    'QUOTATION': 25,
    'NEGOTIATION': 50,
    'WON': 99,
    'LOST': 0,
    'NOT_RESPONSE': 1
};

class LeadModel {
    /**
     * Get all leads with filters and role-based access control
     */
    static async getAll(companyId, userId, role, filters = {}) {
        let query = `
            SELECT l.*,
                   u.full_name as assigned_to_name,
                   cc.name as linked_customer_name,
                   comp.name as customer_company,
                   cc.name as customer_contact_person,
                   cc.email as customer_email,
                   comp.billing_city as customer_city,
                   l.is_pinned,
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
                   l.lead_type,
                   l.closure_time,
                   (SELECT COUNT(*) FROM lead_items li WHERE li.lead_id = l.id) as item_count,
                   (SELECT json_agg(json_build_object('id', li.id, 'item_name', li.item_name, 'quantity', li.quantity, 'unit', li.unit, 'estimated_value', li.estimated_value))
                    FROM lead_items li WHERE li.lead_id = l.id) as items,
                   COUNT(*) OVER() AS total_count
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN customer_contacts cc ON l.customer_id = cc.id
            LEFT JOIN customer_companies comp ON cc.customer_company_id = comp.id
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
            } else if (filters.status === 'CLOSED') {
                query += ` AND l.status IN ('WON', 'LOST', 'NOT_RESPONSE')`;
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
                comp.name ILIKE $${paramIndex} OR
                cc.name ILIKE $${paramIndex} OR
                comp.billing_city ILIKE $${paramIndex} OR
                comp.billing_state ILIKE $${paramIndex} OR
                EXISTS (SELECT 1 FROM lead_items li WHERE li.lead_id = l.id AND (li.item_name ILIKE $${paramIndex} OR li.sku_code ILIKE $${paramIndex}))
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.priority) {
            query += ` AND l.priority = $${paramIndex}`;
            params.push(filters.priority);
            paramIndex++;
        }

        if (filters.source) {
            query += ` AND l.source = $${paramIndex}`;
            params.push(filters.source);
            paramIndex++;
        }

        if (filters.min_value) {
            query += ` AND l.estimated_value >= $${paramIndex}`;
            params.push(filters.min_value);
            paramIndex++;
        }

        if (filters.max_value) {
            query += ` AND l.estimated_value <= $${paramIndex}`;
            params.push(filters.max_value);
            paramIndex++;
        }

        if (filters.min_probability) {
            query += ` AND EXISTS (
                SELECT 1 FROM (
                    SELECT 'OPEN' as s, 5 as p UNION SELECT 'MEETING', 10 UNION 
                    SELECT 'QUOTATION', 25 UNION SELECT 'NEGOTIATION', 50 UNION 
                    SELECT 'WON', 99 UNION SELECT 'LOST', 0 UNION SELECT 'NOT_RESPONSE', 1
                ) prob_map WHERE prob_map.s = l.status AND prob_map.p >= $${paramIndex}
            )`;
            params.push(filters.min_probability);
            paramIndex++;
        }

        // Filter by followup_state (used for MISSED tab)
        if (filters.followup_state === 'OVERDUE') {
            query += ` AND fu.scheduled_at IS NOT NULL AND fu.scheduled_at < NOW()`;
        } else if (filters.followup_state === 'DUE_SOON') {
            query += ` AND fu.scheduled_at IS NOT NULL AND fu.scheduled_at >= NOW() AND fu.scheduled_at <= NOW() + interval '1 hour'`;
        } else if (filters.followup_state === 'NO_FOLLOWUP') {
            query += ` AND fu.id IS NULL`;
        }

        // Filter by today's followups (used for TODAY tab)
        if (filters.today === 'true') {
            query += ` AND DATE(fu.scheduled_at) = CURRENT_DATE`;
        }

        // --- DYNAMIC SORTING ---
        const allowedSortFields = {
            created: 'l.created_at',
            value: 'l.estimated_value',
            activity: 'la.logged_at',
            followup: 'fu.scheduled_at',
            priority: 'CASE l.priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END'
        };

        const sortField = allowedSortFields[filters.sortBy] || 'l.created_at';
        const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Ensure nulls come last for dates
        const nullsOrder = (filters.sortBy === 'followup' || filters.sortBy === 'activity') ? ' NULLS LAST' : '';

        // Added is_pinned DESC to always keep pinned leads at the top
        query += ` ORDER BY l.is_pinned DESC, ${sortField} ${sortOrder}${nullsOrder}`;

        const limit = Math.min(parseInt(filters.limit) || 50, 200);
        const offset = parseInt(filters.offset) || 0;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        const total = parseInt(result.rows[0]?.total_count) || 0;
        const leads = result.rows.map(({ total_count, ...lead }) => lead);
        return { leads, total };
    }

    /**
     * Get per-status lead counts for tab badges (single fast query)
     */
    static async getCounts(companyId, userId, role) {
        let query = `
            SELECT
                COUNT(*)                                                                          AS total,
                COUNT(*) FILTER (WHERE l.status = 'OPEN')                                        AS open,
                COUNT(*) FILTER (WHERE l.status = 'MEETING')                                     AS meeting,
                COUNT(*) FILTER (WHERE l.status = 'QUOTATION')                                   AS quotation,
                COUNT(*) FILTER (WHERE l.status = 'NEGOTIATION')                                 AS negotiation,
                COUNT(*) FILTER (WHERE l.status = 'WON')                                         AS won,
                COUNT(*) FILTER (WHERE l.status = 'LOST')                                        AS lost,
                COUNT(*) FILTER (WHERE l.status = 'NOT_RESPONSE')                                AS not_response,
                COUNT(*) FILTER (WHERE DATE(fu.scheduled_at) = CURRENT_DATE)                     AS today,
                COUNT(*) FILTER (WHERE fu.scheduled_at IS NOT NULL AND fu.scheduled_at < NOW())  AS missed
            FROM leads l
            LEFT JOIN LATERAL (
                SELECT scheduled_at
                FROM lead_followups
                WHERE lead_id = l.id AND status = 'PENDING'
                ORDER BY scheduled_at ASC
                LIMIT 1
            ) fu ON true
            WHERE l.company_id = $1 AND l.deleted_at IS NULL
        `;
        const params = [companyId];
        if (role === 'user') {
            query += ` AND l.assigned_to = $2`;
            params.push(userId);
        }
        const result = await pool.query(query, params);
        const row = result.rows[0];
        const won = parseInt(row.won) || 0;
        const lost = parseInt(row.lost) || 0;
        const not_response = parseInt(row.not_response) || 0;
        return {
            ALL: parseInt(row.total) || 0,
            OPEN: parseInt(row.open) || 0,
            MEETING: parseInt(row.meeting) || 0,
            QUOTATION: parseInt(row.quotation) || 0,
            NEGOTIATION: parseInt(row.negotiation) || 0,
            WON: won,
            LOST: lost,
            NOT_RESPONSE: not_response,
            CLOSED: won + lost + not_response,
            TODAY: parseInt(row.today) || 0,
            MISSED: parseInt(row.missed) || 0,
        };
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
                    source, priority, estimated_value, notes,
                    lead_type, closure_time
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
                data.notes,
                data.lead_type || null,
                data.closure_time || null
            ];

            const leadResult = await client.query(leadQuery, leadParams);
            const lead = leadResult.rows[0];

            // Insert Lead Items if any
            if (data.items && data.items.length > 0) {
                const itemQuery = `
                    INSERT INTO lead_items (lead_id, sku_code, item_name, quantity, unit, estimated_value)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `;
                for (const item of data.items) {
                    await client.query(itemQuery, [
                        lead.id,
                        item.sku_code || null,
                        item.item_name,
                        item.quantity || 1,
                        item.unit || null,
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
                   cc.name as linked_customer_name,
                   comp.name as customer_company,
                   cc.name as customer_contact_person,
                   cc.email as customer_email,
                   comp.billing_city as customer_city,
                   cc.phone as customer_phone_alt,
                   comp.gst_number as customer_gst_number,
                   comp.billing_address as customer_address_line1,
                   comp.billing_state as customer_state,
                   comp.billing_pin as customer_postal_code,
                   fu.scheduled_at AS next_followup_at,
                   fu.note AS next_followup_note,
                   (SELECT json_agg(json_build_object(
                       'id', li.id, 
                       'sku_code', li.sku_code,
                       'item_name', li.item_name, 
                       'quantity', li.quantity, 
                       'unit', li.unit,
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
                   ) ORDER BY a.logged_at DESC) FROM lead_activities a WHERE a.lead_id = l.id) as activities,
                   (SELECT json_agg(json_build_object(
                       'id', q.id,
                       'quote_no', q.quote_no,
                       'status', q.status,
                       'grand_total', q.grand_total,
                       'quote_date', q.quote_date
                   ) ORDER BY q.created_at DESC) FROM quotations q WHERE q.lead_id = l.id) as quotations
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN customer_contacts cc ON l.customer_id = cc.id
            LEFT JOIN customer_companies comp ON cc.customer_company_id = comp.id
            LEFT JOIN LATERAL (
              SELECT scheduled_at, note
              FROM lead_followups
              WHERE lead_id = l.id
                AND status = 'PENDING'
              ORDER BY scheduled_at ASC
              LIMIT 1
            ) fu ON true
            WHERE l.id = $1 AND l.company_id = $2 AND l.deleted_at IS NULL
        `;
        const result = await pool.query(query, [id, companyId]);
        return result.rows[0];
    }

    /**
     * Update lead
     */
    static async update(id, companyId, data) {
        const sets = [];
        const params = [id, companyId];
        let paramIndex = 3;

        const updatableFields = [
            'status', 'probability', 'estimated_value', 'notes', 'priority',
            'lead_type', 'closure_time', 'is_pinned'
        ];

        for (const field of updatableFields) {
            if (data[field] !== undefined) {
                // State Machine Validation for status moves
                if (field === 'status') {
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

                sets.push(`${field} = $${paramIndex}`);
                params.push(data[field]);
                paramIndex++;
            }
        }

        if (sets.length === 0 && !data.items) return this.getById(id, companyId);

        if (sets.length > 0) {
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

        // AUTO-REENGAGEMENT LOOP: If moving to NOT_RESPONSE, schedule a follow-up in 7 days
        if (data.status === 'NOT_RESPONSE') {
            const reengageDate = new Date();
            reengageDate.setDate(reengageDate.getDate() + 7);
            await this.addFollowUp(id, {
                scheduled_at: reengageDate.toISOString(),
                note: 'SYSTEM: Re-engagement loop - checking back with No Response lead'
            }, 'SYSTEM');
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
                        INSERT INTO lead_items (lead_id, sku_code, item_name, quantity, unit, estimated_value)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `;
                for (const item of items) {
                    await client.query(itemQuery, [
                        leadId,
                        item.sku_code || null,
                        item.item_name,
                        item.quantity || 1,
                        item.unit || null,
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
     * Toggle Pin Status
     */
    static async togglePin(id, companyId, isPinned) {
        const query = `
            UPDATE leads 
            SET is_pinned = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;
        const result = await pool.query(query, [id, companyId, isPinned]);
        return result.rows[0];
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
            openLeads: `SELECT COUNT(*) FROM leads l ${whereClause} AND status IN ('OPEN', 'MEETING', 'QUOTATION', 'NEGOTIATION', 'NOT_RESPONSE')`,
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
            totalCustomers: `SELECT COUNT(*) FROM customer_companies WHERE company_id = $1`,
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
