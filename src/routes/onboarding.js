const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const dbConfig = require('../config/database');
const onboardingController = require('../controllers/onboardingController');
const { logger } = require('../utils/logger');

const pool = new Pool(dbConfig);

// Use controller for simple routes
router.get('/status/:companyId', onboardingController.getStatus);
router.post('/complete', onboardingController.complete);

// Keep complex routes here for now (can be refactored later)
router.post('/product-categories', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { companyId, categories } = req.body;

    if (!companyId || !Array.isArray(categories)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const inserted = [];
    for (const category of categories) {
      const result = await client.query(
        `INSERT INTO product_categories (company_id, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id, name) DO UPDATE
         SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, description`,
        [companyId.toUpperCase(), category.name, category.description || null]
      );
      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ requestId: req.id, error: error.message }, 'Error creating product categories');
    res.status(500).json({ error: 'Failed to create product categories', message: error.message });
  } finally {
    client.release();
  }
});

router.post('/item-categories', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { companyId, productCategoryId, categories } = req.body;

    if (!companyId || !productCategoryId || !Array.isArray(categories)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const inserted = [];
    for (const category of categories) {
      const result = await client.query(
        `INSERT INTO item_categories (company_id, product_category_id, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, product_category_id, name) DO UPDATE
         SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, description`,
        [companyId.toUpperCase(), productCategoryId, category.name, category.description || null]
      );
      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ requestId: req.id, error: error.message }, 'Error creating item categories');
    res.status(500).json({ error: 'Failed to create item categories', message: error.message });
  } finally {
    client.release();
  }
});

router.post('/sub-categories', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { companyId, itemCategoryId, categories } = req.body;

    if (!companyId || !itemCategoryId || !Array.isArray(categories)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const inserted = [];
    for (const category of categories) {
      const result = await client.query(
        `INSERT INTO sub_categories (company_id, item_category_id, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, item_category_id, name) DO UPDATE
         SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, description`,
        [companyId.toUpperCase(), itemCategoryId, category.name, category.description || null]
      );
      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ requestId: req.id, error: error.message }, 'Error creating sub categories');
    res.status(500).json({ error: 'Failed to create sub categories', message: error.message });
  } finally {
    client.release();
  }
});

router.post('/vendors', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { companyId, vendors } = req.body;

    if (!companyId || !Array.isArray(vendors)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const inserted = [];
    for (const vendor of vendors) {
      const result = await client.query(
        `INSERT INTO vendors (
          company_id, name, contact_person, email, phone, gst_number, 
          address, city, state, pin
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (company_id, name) DO UPDATE
        SET contact_person = EXCLUDED.contact_person,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            gst_number = EXCLUDED.gst_number,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            pin = EXCLUDED.pin,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, contact_person, email, phone, gst_number`,
        [
          companyId.toUpperCase(),
          vendor.name,
          vendor.contactPerson || null,
          vendor.email || null,
          vendor.phone || null,
          vendor.gstNumber || null,
          vendor.address || null,
          vendor.city || null,
          vendor.state || null,
          vendor.pin || null
        ]
      );
      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ requestId: req.id, error: error.message }, 'Error creating vendors');
    res.status(500).json({ error: 'Failed to create vendors', message: error.message });
  } finally {
    client.release();
  }
});

router.post('/brands', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { companyId, brands } = req.body;

    if (!companyId || !Array.isArray(brands)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const inserted = [];
    for (const brand of brands) {
      const result = await client.query(
        `INSERT INTO brands (company_id, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id, name) DO UPDATE
         SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, description`,
        [companyId.toUpperCase(), brand.name, brand.description || null]
      );
      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ requestId: req.id, error: error.message }, 'Error creating brands');
    res.status(500).json({ error: 'Failed to create brands', message: error.message });
  } finally {
    client.release();
  }
});

// GET routes
router.get('/product-categories/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, description FROM product_categories WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error fetching product categories');
    res.status(500).json({ error: 'Failed to fetch product categories', message: error.message });
  }
});

router.get('/item-categories/:companyId/:productCategoryId', async (req, res) => {
  try {
    const { companyId, productCategoryId } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, description FROM item_categories WHERE company_id = $1 AND product_category_id = $2 AND is_active = true ORDER BY name',
      [companyId.toUpperCase(), productCategoryId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error fetching item categories');
    res.status(500).json({ error: 'Failed to fetch item categories', message: error.message });
  }
});

// DELETE routes
router.delete('/product-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE product_categories SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }

    res.json({ success: true, message: 'Product category deleted successfully' });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error deleting product category');
    res.status(500).json({ error: 'Failed to delete product category', message: error.message });
  }
});

router.delete('/item-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE item_categories SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item category not found' });
    }

    res.json({ success: true, message: 'Item category deleted successfully' });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error deleting item category');
    res.status(500).json({ error: 'Failed to delete item category', message: error.message });
  }
});

router.delete('/sub-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE sub_categories SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub category not found' });
    }

    res.json({ success: true, message: 'Sub category deleted successfully' });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error deleting sub category');
    res.status(500).json({ error: 'Failed to delete sub category', message: error.message });
  }
});

router.delete('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE vendors SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error deleting vendor');
    res.status(500).json({ error: 'Failed to delete vendor', message: error.message });
  }
});

router.delete('/brands/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE brands SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error deleting brand');
    res.status(500).json({ error: 'Failed to delete brand', message: error.message });
  }
});

module.exports = router;

