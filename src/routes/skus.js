const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Pool } = require('pg');
const dbConfig = require('../config/database');
const { authenticate, getCompanyId } = require('../middlewares/auth');
const { generateUniqueSKUId } = require('../utils/skuIdGenerator');
const { validateRequired, validateNumeric } = require('../middlewares/validation');
const skuController = require('../controllers/skuController');

const pool = new Pool(dbConfig);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

// Apply authenticate middleware to all routes in this router
router.use(authenticate);

// Helper function to transform SKU object from snake_case to camelCase
const transformSKU = (sku) => {
  return {
    id: sku.id,
    skuId: sku.sku_id,
    productCategoryId: sku.product_category_id,
    productCategory: sku.product_category,
    itemCategoryId: sku.item_category_id,
    itemCategory: sku.item_category,
    subCategoryId: sku.sub_category_id,
    subCategory: sku.sub_category,
    itemName: sku.item_name,
    itemDetails: sku.item_details,
    vendorId: sku.vendor_id,
    vendor: sku.vendor,
    vendorItemCode: sku.vendor_item_code,
    brandId: sku.brand_id,
    brand: sku.brand,
    hsnSacCode: sku.hsn_sac_code,
    ratingSize: sku.rating_size,
    model: sku.model,
    series: sku.series,
    unit: sku.unit,
    material: sku.material,
    insulation: sku.insulation,
    inputSupply: sku.input_supply,
    color: sku.color,
    cri: sku.cri,
    cct: sku.cct,
    beamAngle: sku.beam_angle,
    ledType: sku.led_type,
    shape: sku.shape,
    weight: sku.weight,
    length: sku.length,
    width: sku.width,
    height: sku.height,
    rackNumber: sku.rack_number,
    gstRate: sku.gst_rate,
    currentStock: sku.current_stock,
    minStockLevel: sku.min_stock_level,
    reorderPoint: sku.reorder_point,
    defaultStorageLocation: sku.default_storage_location,
    isActive: sku.is_active,
    createdAt: sku.created_at,
    updatedAt: sku.updated_at,
  };
};

/**
 * GET /api/skus
 * Get all SKUs with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    const {
      search,
      productCategory,
      itemCategory,
      subCategory,
      brand,
      stockStatus,
      hsnCode,
      page = 1,
      limit = 20,
    } = req.query;

    let query = `
      SELECT 
        s.*,
        pc.name as product_category,
        ic.name as item_category,
        sc.name as sub_category,
        b.name as brand,
        v.name as vendor
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      WHERE s.company_id = $1 AND s.is_active = true
    `;
    const params = [companyId];
    let paramIndex = 2;

    // Add filters
    if (search) {
      query += ` AND (s.sku_id ILIKE $${paramIndex} OR s.item_name ILIKE $${paramIndex} OR s.model ILIKE $${paramIndex} OR s.hsn_sac_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (productCategory) {
      query += ` AND s.product_category_id = $${paramIndex}`;
      params.push(productCategory);
      paramIndex++;
    }
    if (itemCategory) {
      query += ` AND s.item_category_id = $${paramIndex}`;
      params.push(itemCategory);
      paramIndex++;
    }
    if (subCategory) {
      query += ` AND s.sub_category_id = $${paramIndex}`;
      params.push(subCategory);
      paramIndex++;
    }
    if (brand) {
      query += ` AND s.brand_id = $${paramIndex}`;
      params.push(brand);
      paramIndex++;
    }
    if (stockStatus) {
      if (stockStatus === 'low') {
        query += ` AND s.current_stock <= s.min_stock_level`;
      } else if (stockStatus === 'out') {
        query += ` AND s.current_stock = 0`;
      } else if (stockStatus === 'in') {
        query += ` AND s.current_stock > s.min_stock_level`;
      }
    }
    if (hsnCode) {
      query += ` AND s.hsn_sac_code ILIKE $${paramIndex}`;
      params.push(`%${hsnCode}%`);
      paramIndex++;
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY[\s\S]*$/, '');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    // Transform snake_case to camelCase
    const transformedData = result.rows.map(transformSKU);

    res.json({
      success: true,
      data: transformedData,
      total: parseInt(countResult.rows[0].count),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skus/:id
 * Get SKU by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.*,
        pc.name as product_category,
        ic.name as item_category,
        sc.name as sub_category,
        b.name as brand,
        v.name as vendor
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    // Transform snake_case to camelCase
    const transformedData = transformSKU(result.rows[0]);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/skus
 * Create a new SKU
 */
router.post(
  '/',
  validateRequired(['productCategoryId', 'itemCategoryId', 'subCategoryId', 'itemName', 'vendorId', 'brandId', 'unit', 'model', 'hsnSacCode']),
  validateNumeric('productCategoryId'),
  validateNumeric('itemCategoryId'),
  validateNumeric('vendorId'),
  validateNumeric('brandId'),
  validateNumeric('minStockLevel', 0),
  validateNumeric('currentStock', 0), // Validate currentStock if provided (must be >= 0)
  async (req, res, next) => {
    // Validate model number (max 20 characters)
    if (req.body.model && req.body.model.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Model number must be maximum 20 characters',
        field: 'model',
      });
    }
    
    // Validate HSN/SAC Code (4-8 numeric digits)
    if (req.body.hsnSacCode) {
      if (!/^[0-9]{4,8}$/.test(req.body.hsnSacCode)) {
        return res.status(400).json({
          success: false,
          error: 'HSN/SAC Code must be 4-8 numeric digits (0-9)',
          field: 'hsnSacCode',
        });
      }
    }
    
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req).toUpperCase();

    // Generate SKU ID if not provided or if auto-generate is enabled
    let skuId = req.body.skuId;
    if (!skuId || req.body.autoGenerateSKU !== false) {
      skuId = await generateUniqueSKUId(client, companyId);
    }

    // Validate SKU ID format (should be 14 characters: 6 company ID + 8 alphanumeric)
    if (skuId.length !== 14) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'SKU ID must be 14 characters (6 company ID + 8 alphanumeric)' });
    }

    // Check if SKU ID already exists
    const existingCheck = await client.query('SELECT id FROM skus WHERE sku_id = $1', [skuId]);
    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'SKU ID already exists' });
    }

    const {
      productCategoryId,
      itemCategoryId,
      subCategoryId,
      itemName,
      itemDetails,
      vendorId,
      vendorItemCode,
      brandId,
      hsnSacCode,
      gstRate,
      ratingSize,
      model,
      series,
      unit,
      material,
      insulation,
      inputSupply,
      color,
      cri,
      cct,
      beamAngle,
      ledType,
      shape,
      weight,
      length,
      width,
      height,
      rackNumber,
      currentStock,
      minStockLevel,
      reorderPoint,
      defaultStorageLocation,
      status = 'active',
    } = req.body;

    const result = await client.query(
      `INSERT INTO skus (
        company_id, sku_id, product_category_id, item_category_id, sub_category_id,
        item_name, item_details, vendor_id, vendor_item_code, brand_id,
        hsn_sac_code, gst_rate, rating_size, model, series, unit,
        material, insulation, input_supply, color, cri, cct, beam_angle, led_type, shape,
        weight, length, width, height, rack_number,
        min_stock_level, reorder_point, default_storage_location,
        current_stock, status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36
      ) RETURNING *`,
      [
        companyId,
        skuId,
        productCategoryId,
        itemCategoryId,
        subCategoryId,
        itemName,
        itemDetails || null,
        vendorId,
        vendorItemCode || null,
        brandId,
        hsnSacCode || null,
        gstRate !== undefined && gstRate !== null ? parseFloat(gstRate) : null,
        ratingSize || null,
        model || null,
        series || null,
        unit,
        material || null,
        insulation || null,
        inputSupply || null,
        color || null,
        cri || null,
        cct || null,
        beamAngle || null,
        ledType || null,
        shape || null,
        weight || null,
        length || null,
        width || null,
        height || null,
        rackNumber || null,
        minStockLevel,
        reorderPoint || null,
        defaultStorageLocation || null,
        currentStock !== undefined && currentStock !== null ? currentStock : (minStockLevel || 0), // Use user-entered currentStock, fallback to minStockLevel
        status,
        status === 'active',
      ]
    );

    await client.query('COMMIT');
    
    // Fetch the created SKU with joins to get category names
    const createdSKU = await client.query(
      `SELECT 
        s.*,
        pc.name as product_category,
        ic.name as item_category,
        sc.name as sub_category,
        b.name as brand,
        v.name as vendor
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      WHERE s.id = $1`,
      [result.rows[0].id]
    );
    
    // Transform snake_case to camelCase
    const transformedData = transformSKU(createdSKU.rows[0]);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * POST /api/skus/upload
 * Upload SKUs from Excel file
 * Excel file should NOT contain sku_id - it will be auto-generated
 */
router.post('/upload', upload.single('file'), skuController.uploadSKUs);

/**
 * PUT /api/skus/:id
 * Update SKU
 */
router.put(
  '/:id',
  validateRequired(['productCategoryId', 'itemCategoryId', 'subCategoryId', 'itemName', 'vendorId', 'brandId', 'unit', 'model', 'hsnSacCode']),
  validateNumeric('productCategoryId'),
  validateNumeric('itemCategoryId'),
  validateNumeric('vendorId'),
  validateNumeric('brandId'),
  validateNumeric('minStockLevel', 0),
  async (req, res, next) => {
    // Validate model number (max 20 characters)
    if (req.body.model && req.body.model.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Model number must be maximum 20 characters',
        field: 'model',
      });
    }
    
    // Validate HSN/SAC Code (4-8 numeric digits)
    if (req.body.hsnSacCode) {
      if (!/^[0-9]{4,8}$/.test(req.body.hsnSacCode)) {
        return res.status(400).json({
          success: false,
          error: 'HSN/SAC Code must be 4-8 numeric digits (0-9)',
          field: 'hsnSacCode',
        });
      }
    }
    
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      productCategoryId,
      itemCategoryId,
      subCategoryId,
      itemName,
      itemDetails,
      vendorId,
      vendorItemCode,
      brandId,
      hsnSacCode,
      gstRate,
      ratingSize,
      model,
      series,
      unit,
      material,
      insulation,
      inputSupply,
      color,
      cri,
      cct,
      beamAngle,
      ledType,
      shape,
      weight,
      length,
      width,
      height,
      rackNumber,
      minStockLevel,
      reorderPoint,
      defaultStorageLocation,
      status,
    } = req.body;

    const result = await client.query(
      `UPDATE skus SET
        product_category_id = $1, item_category_id = $2, sub_category_id = $3,
        item_name = $4, item_details = $5, vendor_id = $6, vendor_item_code = $7, brand_id = $8,
        hsn_sac_code = $9, gst_rate = $10, rating_size = $11, model = $12, series = $13, unit = $14,
        material = $15, insulation = $16, input_supply = $17, color = $18, cri = $19, cct = $20,
        beam_angle = $21, led_type = $22, shape = $23,
        weight = $24, length = $25, width = $26, height = $27, rack_number = $28,
        min_stock_level = $29, reorder_point = $30, default_storage_location = $31,
        status = $32, is_active = $33, updated_at = CURRENT_TIMESTAMP
      WHERE id = $34 RETURNING *`,
      [
        productCategoryId,
        itemCategoryId,
        subCategoryId,
        itemName,
        itemDetails || null,
        vendorId,
        vendorItemCode || null,
        brandId,
        hsnSacCode || null,
        gstRate !== undefined && gstRate !== null ? parseFloat(gstRate) : null,
        ratingSize || null,
        model || null,
        series || null,
        unit,
        material || null,
        insulation || null,
        inputSupply || null,
        color || null,
        cri || null,
        cct || null,
        beamAngle || null,
        ledType || null,
        shape || null,
        weight || null,
        length || null,
        width || null,
        height || null,
        rackNumber || null,
        minStockLevel,
        reorderPoint || null,
        defaultStorageLocation || null,
        status || 'active',
        status === 'active',
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'SKU not found' });
    }

    await client.query('COMMIT');
    
    // Fetch the updated SKU with joins to get category names
    const updatedSKU = await client.query(
      `SELECT 
        s.*,
        pc.name as product_category,
        ic.name as item_category,
        sc.name as sub_category,
        b.name as brand,
        v.name as vendor
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      WHERE s.id = $1`,
      [req.params.id]
    );
    
    if (updatedSKU.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    // Transform snake_case to camelCase
    const transformedData = transformSKU(updatedSKU.rows[0]);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/skus/:id
 * Soft delete SKU
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE skus SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    res.json({ success: true, message: 'SKU deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skus/analytics/top-selling
 * Get top selling SKUs
 */
router.get('/analytics/top-selling', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    const period = parseInt(req.query.period || 30, 10); // Default 30 days
    const sortBy = req.query.sortBy || 'units'; // 'units' or 'value'

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - period);

    // Query to get top selling SKUs from outgoing inventory
    // For now, return empty array as outgoing inventory is not fully implemented
    // TODO: Implement when outgoing inventory is ready
    res.json({ 
      success: true, 
      data: [],
      message: 'Outgoing inventory analytics not yet implemented'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skus/analytics/slow-moving
 * Get slow moving SKUs
 */
router.get('/analytics/slow-moving', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    const period = parseInt(req.query.period || 3, 10); // Default 3 months
    const threshold = parseInt(req.query.threshold || 5, 10); // Default 5 units

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - period);

    // Query to find SKUs with low movement
    // For now, return empty array as outgoing inventory is not fully implemented
    // TODO: Implement when outgoing inventory is ready
    res.json({ 
      success: true, 
      data: [],
      message: 'Slow moving SKU analytics not yet implemented'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skus/analytics/non-movable
 * Get non-movable SKUs (no sales in period)
 */
router.get('/analytics/non-movable', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    const period = parseInt(req.query.period || 6, 10); // Default 6 months

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - period);

    // Query to find SKUs with no movement
    // For now, return empty array as outgoing inventory is not fully implemented
    // TODO: Implement when outgoing inventory is ready
    res.json({ 
      success: true, 
      data: [],
      message: 'Non-movable SKU analytics not yet implemented'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


