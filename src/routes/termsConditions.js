const express = require('express');
const router = express.Router();
const TermsConditionsModel = require('../models/termsConditionsModel');

// ================== MASTER TERMS LIBRARY ROUTES ==================

/**
 * GET /api/terms-conditions
 * Get all master terms & conditions
 */
// ================== GLOBAL DEFAULTS ROUTES ==================

/**
 * GET /api/terms-conditions/defaults
 * Get global default terms configuration
 */
router.get('/defaults', async (req, res) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId query parameter is required'
            });
        }

        // Initialize table if needed - model handles it
        const defaults = await TermsConditionsModel.getGlobalDefaults(companyId);

        res.json({
            success: true,
            data: defaults
        });
    } catch (error) {
        console.error('Error fetching global defaults:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch global defaults',
            error: error.message
        });
    }
});

/**
 * POST /api/terms-conditions/defaults
 * Save global default terms configuration
 */
router.post('/defaults', async (req, res) => {
    try {
        const { selectedTerms, variables, companyId } = req.body;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId is required'
            });
        }

        await TermsConditionsModel.saveGlobalDefaults({
            selectedTerms: selectedTerms || [],
            variables: variables || {},
            companyId: companyId
        });

        res.json({
            success: true,
            message: 'Default terms saved successfully'
        });
    } catch (error) {
        console.error('Error saving global defaults:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save global defaults',
            error: error.message
        });
    }
});

// ================== MASTER TERMS LIBRARY ROUTES ==================

/**
 * GET /api/terms-conditions
 * Get all master terms & conditions
 */
router.get('/', async (req, res) => {
    try {
        const terms = await TermsConditionsModel.getAllMasterTerms();
        res.json({
            success: true,
            data: terms,
            total: terms.length
        });
    } catch (error) {
        console.error('Error fetching master terms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch terms & conditions',
            error: error.message
        });
    }
});

/**
 * GET /api/terms-conditions/mandatory
 * Get only mandatory terms
 */
router.get('/mandatory', async (req, res) => {
    try {
        const terms = await TermsConditionsModel.getMandatoryTerms();
        res.json({
            success: true,
            data: terms,
            total: terms.length
        });
    } catch (error) {
        console.error('Error fetching mandatory terms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mandatory terms',
            error: error.message
        });
    }
});

/**
 * GET /api/terms-conditions/:id
 * Get a single term by ID or term_key
 */
router.get('/:id', async (req, res) => {
    try {
        const term = await TermsConditionsModel.getMasterTermById(req.params.id);

        if (!term) {
            return res.status(404).json({
                success: false,
                message: 'Term not found'
            });
        }

        res.json({
            success: true,
            data: term
        });
    } catch (error) {
        console.error('Error fetching term:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch term',
            error: error.message
        });
    }
});

/**
 * POST /api/terms-conditions
 * Create a new custom term
 */
router.post('/', async (req, res) => {
    try {
        const { term_key, term_title, term_value, term_order, is_mandatory, category } = req.body;

        // Validation
        if (!term_key || !term_title || !term_value) {
            return res.status(400).json({
                success: false,
                message: 'term_key, term_title, and term_value are required'
            });
        }

        const newTerm = await TermsConditionsModel.createMasterTerm({
            term_key,
            term_title,
            term_value,
            term_order: term_order || 0,
            is_mandatory: is_mandatory || false,
            is_system_default: false, // Custom terms are never system defaults
            category: category || 'custom'
        });

        res.status(201).json({
            success: true,
            message: 'Custom term created successfully',
            data: newTerm
        });
    } catch (error) {
        console.error('Error creating term:', error);

        // Handle duplicate term_key
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'A term with this key already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create term',
            error: error.message
        });
    }
});

/**
 * PUT /api/terms-conditions/:id
 * Update a master term
 */
router.put('/:id', async (req, res) => {
    try {
        const updatedTerm = await TermsConditionsModel.updateMasterTerm(req.params.id, req.body);

        res.json({
            success: true,
            message: 'Term updated successfully',
            data: updatedTerm
        });
    } catch (error) {
        console.error('Error updating term:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update term',
            error: error.message
        });
    }
});

/**
 * DELETE /api/terms-conditions/:id
 * Delete a custom term (cannot delete system defaults)
 */
router.delete('/:id', async (req, res) => {
    try {
        await TermsConditionsModel.deleteMasterTerm(req.params.id);

        res.json({
            success: true,
            message: 'Term deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting term:', error);

        if (error.message === 'Cannot delete system default terms') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to delete term',
            error: error.message
        });
    }
});

// ================== PO-SPECIFIC TERMS ROUTES ==================

/**
 * GET /api/terms-conditions/po/:poId
 * Get all terms configured for a specific PO
 */
router.get('/po/:poId', async (req, res) => {
    try {
        const terms = await TermsConditionsModel.getTermsByPoId(req.params.poId);
        const variables = await TermsConditionsModel.getVariablesByPoId(req.params.poId);

        res.json({
            success: true,
            data: {
                terms: terms,
                variables: variables,
                totalTerms: terms.length
            }
        });
    } catch (error) {
        console.error('Error fetching PO terms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch PO terms',
            error: error.message
        });
    }
});

/**
 * POST /api/terms-conditions/po/:poId
 * Save terms and variables for a specific PO
 */
router.post('/po/:poId', async (req, res) => {
    try {
        const { terms, variables } = req.body;
        const poId = req.params.poId;

        // Validate request
        if (!terms || !Array.isArray(terms)) {
            return res.status(400).json({
                success: false,
                message: 'Terms array is required'
            });
        }

        // Save terms
        await TermsConditionsModel.savePoTerms(poId, terms);

        // Save variables
        if (variables) {
            await TermsConditionsModel.savePoVariables(poId, variables);
        }

        // Validate and update status
        const validation = await TermsConditionsModel.validatePoTerms(poId);

        let status = 'not_set';
        if (validation.hasTerms) {
            status = validation.isValid ? 'complete' : 'partial';
        }

        await TermsConditionsModel.updatePoTermsStatus(poId, status);

        res.json({
            success: true,
            message: 'Terms & conditions saved successfully',
            data: {
                validation: validation,
                status: status
            }
        });
    } catch (error) {
        console.error('Error saving PO terms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save PO terms',
            error: error.message
        });
    }
});

/**
 * GET /api/terms-conditions/po/:poId/validate
 * Validate if PO has all mandatory terms configured
 */
router.get('/po/:poId/validate', async (req, res) => {
    try {
        const validation = await TermsConditionsModel.validatePoTerms(req.params.poId);

        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('Error validating PO terms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate PO terms',
            error: error.message
        });
    }
});

// ================== UTILITY ROUTES ==================

/**
 * POST /api/terms-conditions/preview
 * Generate preview of terms with variables replaced
 */
router.post('/preview', async (req, res) => {
    try {
        const { termKeys, variables } = req.body;

        if (!termKeys || !Array.isArray(termKeys)) {
            return res.status(400).json({
                success: false,
                message: 'termKeys array is required'
            });
        }

        const preview = await TermsConditionsModel.generatePreview(termKeys, variables || {});

        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate preview',
            error: error.message
        });
    }
});

/**
 * POST /api/terms-conditions/required-variables
 * Get list of required variables for selected terms
 */
router.post('/required-variables', async (req, res) => {
    try {
        const { termKeys } = req.body;

        if (!termKeys || !Array.isArray(termKeys)) {
            return res.status(400).json({
                success: false,
                message: 'termKeys array is required'
            });
        }

        const variables = await TermsConditionsModel.getRequiredVariables(termKeys);

        res.json({
            success: true,
            data: variables
        });
    } catch (error) {
        console.error('Error fetching required variables:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch required variables',
            error: error.message
        });
    }
});

module.exports = router;
