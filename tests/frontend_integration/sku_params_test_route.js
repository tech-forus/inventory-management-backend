const express = require('express');
const router = express.Router();
const SKUModel = require('../../src/models/skuModel');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Create a standalone pool for testing
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Mock Authentication Middleware
const mockAuth = (req, res, next) => {
    req.user = {
        companyId: 'YZEKCR', // Hardcoded for test
        userId: 1,
        role: 'admin'
    };
    next();
};

// Test Endpoint for SKU Retrieval
router.get('/skus', mockAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            search,
            productCategory,
            itemCategory,
            subCategory,
            brand,
            stockStatus,
            sortBy,
            sortOrder
        } = req.query;

        console.log('[TEST-API] Received SKU Filter Params:', JSON.stringify(req.query, null, 2));

        // Construct SQL Query based on Standard SKUModel logic (simplified for test)
        let query = `
      SELECT s.*, 
        b.name as brand_name, 
        pc.name as product_category_name,
        ic.name as item_category_name,
        sc.name as sub_category_name
      FROM skus s
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      WHERE s.company_id = $1 AND s.is_active = true
    `;

        const values = [req.user.companyId];
        let paramIndex = 2;

        if (search) {
            query += ` AND (
        s.sku_id ILIKE $${paramIndex} OR 
        s.item_name ILIKE $${paramIndex} OR 
        s.model ILIKE $${paramIndex}
      )`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        // Add other filters logic here mirroring SKUModel...
        // For brevity in this test file, let's just return basic paginated results
        // to verify the connection and basic filtering.

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(parseInt(limit), offset);

        const result = await pool.query(query, values);
        const totalCountRes = await pool.query('SELECT COUNT(*) FROM skus WHERE company_id = $1 AND is_active = true', [req.user.companyId]);

        // Map to Frontend Expected Format
        const skus = result.rows.map(row => ({
            id: row.id,
            skuId: row.sku_id,
            itemName: row.item_name,
            productCategory: row.product_category_name,
            itemCategory: row.item_category_name,
            subCategory: row.sub_category_name,
            brand: row.brand_name,
            currentStock: row.current_stock,
            minStock: row.min_stock,
            minStockLevel: row.min_stock, // Map both for compatibility
            // ... add other fields as needed
        }));

        res.json({
            data: skus,
            total: parseInt(totalCountRes.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('[TEST-API] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
