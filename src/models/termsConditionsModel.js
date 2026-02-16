const db = require('./database');

/**
 * Terms & Conditions Model
 * Manages master T&C library and PO-specific terms
 */
const TermsConditionsModel = {

    // ================== MASTER TERMS LIBRARY ==================

    /**
     * Get all master terms & conditions
     */
    async getAllMasterTerms() {
        const query = `
            SELECT * FROM terms_conditions 
            ORDER BY term_order ASC, id ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    /**
     * Get a single master term by ID or term_key
     */
    async getMasterTermById(idOrKey) {
        const query = `
            SELECT * FROM terms_conditions 
            WHERE id = ? OR term_key = ?
            LIMIT 1
        `;
        const [rows] = await db.query(query, [idOrKey, idOrKey]);
        return rows[0];
    },

    /**
     * Get mandatory terms only
     */
    async getMandatoryTerms() {
        const query = `
            SELECT * FROM terms_conditions 
            WHERE is_mandatory = TRUE
            ORDER BY term_order ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    /**
     * Create a new custom term
     */
    async createMasterTerm(termData) {
        const {
            term_key,
            term_title,
            term_value,
            term_order = 0,
            is_mandatory = false,
            is_system_default = false,
            category = 'custom'
        } = termData;

        const query = `
            INSERT INTO terms_conditions 
            (term_key, term_title, term_value, term_order, is_mandatory, is_system_default, category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            term_key, term_title, term_value, term_order,
            is_mandatory, is_system_default, category
        ]);

        return this.getMasterTermById(result.insertId);
    },

    /**
     * Update a master term
     */
    async updateMasterTerm(id, termData) {
        const updates = [];
        const values = [];

        // Build dynamic update query
        const allowedFields = ['term_title', 'term_value', 'term_order', 'is_mandatory', 'category'];

        allowedFields.forEach(field => {
            if (termData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(termData[field]);
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);

        const query = `
            UPDATE terms_conditions 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.query(query, values);
        return this.getMasterTermById(id);
    },

    /**
     * Delete a custom term (cannot delete system defaults)
     */
    async deleteMasterTerm(id) {
        // Check if it's a system default
        const term = await this.getMasterTermById(id);
        if (!term) {
            throw new Error('Term not found');
        }
        if (term.is_system_default) {
            throw new Error('Cannot delete system default terms');
        }

        const query = `DELETE FROM terms_conditions WHERE id = ?`;
        await db.query(query, [id]);
        return true;
    },

    // ================== PO-SPECIFIC TERMS ==================

    /**
     * Get all terms for a specific PO
     */
    async getTermsByPoId(poId) {
        const query = `
            SELECT 
                pt.*,
                tc.term_title,
                tc.term_value as master_value,
                tc.is_mandatory,
                tc.category
            FROM po_terms_conditions pt
            LEFT JOIN terms_conditions tc ON pt.term_key = tc.term_key
            WHERE pt.po_id = ?
            ORDER BY pt.term_order ASC
        `;
        const [rows] = await db.query(query, [poId]);
        return rows;
    },

    /**
     * Get variables for a specific PO
     */
    async getVariablesByPoId(poId) {
        const query = `
            SELECT * FROM po_term_variables 
            WHERE po_id = ?
        `;
        const [rows] = await db.query(query, [poId]);

        // Convert to key-value object
        const variables = {};
        rows.forEach(row => {
            variables[row.variable_name] = row.variable_value;
        });

        return variables;
    },

    /**
     * Save terms for a PO (replaces existing)
     */
    async savePoTerms(poId, termsData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Delete existing terms for this PO
            await connection.query('DELETE FROM po_terms_conditions WHERE po_id = ?', [poId]);

            // Insert new terms
            if (termsData && termsData.length > 0) {
                const insertQuery = `
                    INSERT INTO po_terms_conditions 
                    (po_id, term_key, customized_value, final_value, term_order)
                    VALUES (?, ?, ?, ?, ?)
                `;

                for (const term of termsData) {
                    await connection.query(insertQuery, [
                        poId,
                        term.term_key,
                        term.customized_value || null,
                        term.final_value,
                        term.term_order || 0
                    ]);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Save variables for a PO (replaces existing)
     */
    async savePoVariables(poId, variables) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Delete existing variables for this PO
            await connection.query('DELETE FROM po_term_variables WHERE po_id = ?', [poId]);

            // Insert new variables
            if (variables && Object.keys(variables).length > 0) {
                const insertQuery = `
                    INSERT INTO po_term_variables 
                    (po_id, variable_name, variable_value)
                    VALUES (?, ?, ?)
                `;

                for (const [varName, varValue] of Object.entries(variables)) {
                    await connection.query(insertQuery, [poId, varName, varValue]);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Update terms_status in purchase_orders table
     */
    async updatePoTermsStatus(poId, status) {
        const query = `
            UPDATE purchase_orders 
            SET terms_status = ?
            WHERE id = ?
        `;
        await db.query(query, [status, poId]);
    },

    /**
     * Check if PO has mandatory terms configured
     */
    async validatePoTerms(poId) {
        // Get mandatory term keys
        const mandatoryTerms = await this.getMandatoryTerms();
        const mandatoryKeys = mandatoryTerms.map(t => t.term_key);

        // Get PO terms
        const poTerms = await this.getTermsByPoId(poId);
        const poTermKeys = poTerms.map(t => t.term_key);

        // Find missing mandatory terms
        const missingTerms = mandatoryKeys.filter(key => !poTermKeys.includes(key));

        return {
            isValid: missingTerms.length === 0,
            missingTerms: missingTerms,
            hasTerms: poTerms.length > 0,
            totalConfigured: poTerms.length,
            totalMandatory: mandatoryTerms.length
        };
    },

    /**
     * Replace placeholders in term text with actual values
     */
    replaceVariables(text, variables) {
        let result = text;

        // Replace all [VARIABLE_NAME] with actual values
        for (const [key, value] of Object.entries(variables)) {
            const pattern = new RegExp(`\\[${key}\\]`, 'gi');
            result = result.replace(pattern, value || `[${key}]`);
        }

        return result;
    },

    /**
     * Generate preview of terms with variables replaced
     */
    async generatePreview(termKeys, variables) {
        const terms = [];

        for (const termKey of termKeys) {
            const masterTerm = await this.getMasterTermById(termKey);
            if (masterTerm) {
                const finalValue = this.replaceVariables(masterTerm.term_value, variables);
                terms.push({
                    term_key: masterTerm.term_key,
                    term_title: masterTerm.term_title,
                    term_order: masterTerm.term_order,
                    original_value: masterTerm.term_value,
                    final_value: finalValue,
                    has_unfilled_placeholders: finalValue.includes('[') && finalValue.includes(']')
                });
            }
        }

        // Sort by term_order
        terms.sort((a, b) => a.term_order - b.term_order);

        return terms;
    },

    /**
     * Extract placeholders from term text
     */
    extractPlaceholders(text) {
        const regex = /\[([A-Z_]+)\]/g;
        const placeholders = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (!placeholders.includes(match[1])) {
                placeholders.push(match[1]);
            }
        }

        return placeholders;
    },

    /**
     * Get all unique placeholders from selected terms
     */
    async getRequiredVariables(termKeys) {
        const allPlaceholders = new Set();

        for (const termKey of termKeys) {
            const term = await this.getMasterTermById(termKey);
            if (term) {
                const placeholders = this.extractPlaceholders(term.term_value);
                placeholders.forEach(p => allPlaceholders.add(p));
            }
        }

        return Array.from(allPlaceholders);
    }
};

module.exports = TermsConditionsModel;
