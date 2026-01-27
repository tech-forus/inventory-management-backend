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
  // Parse custom_fields if it exists - return null or parsed value
  let customFields = null;
  if (sku.custom_fields) {
    try {
      const parsed = typeof sku.custom_fields === 'string'
        ? JSON.parse(sku.custom_fields)
        : sku.custom_fields;

      // Ensure it's an array format
      if (Array.isArray(parsed)) {
        customFields = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Convert object format to array format
        customFields = Object.entries(parsed).map(([key, value]) => ({
          key: String(key || ''),
          value: String(value || '')
        }));
      } else {
        customFields = null;
      }
    } catch (e) {
      console.error('Error parsing custom_fields:', e);
      customFields = null;
    }
  }

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
    manufactureOrImport: sku.manufacture_or_import,
    insulation: sku.insulation,
    inputSupply: sku.input_supply,
    color: sku.color,
    cri: sku.cri,
    cct: sku.cct,
    beamAngle: sku.beam_angle,
    ledType: sku.led_type,
    shape: sku.shape,
    weight: sku.weight,
    weightUnit: sku.weight_unit,
    length: sku.length,
    lengthUnit: sku.length_unit,
    width: sku.width,
    widthUnit: sku.width_unit,
    height: sku.height,
    heightUnit: sku.height_unit,
    rackNumber: sku.rack_number,
    gstRate: sku.gst_rate,
    customFields,
    currentStock: sku.current_stock,
    minStockLevel: sku.min_stock_level,
    reorderPoint: sku.reorder_point,
    defaultStorageLocation: sku.default_storage_location,
    isActive: sku.is_active,
    isNonMovable: sku.is_non_movable,
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
    const user = req.user || {};
    const {
      search,
      productCategory,
      itemCategory,
      subCategory,
      brand,
      stockStatus,
      hsnCode,
      sortBy,
      sortOrder = 'asc',
      page = 1,
      limit = 20,
      excludeNonMovable,
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
    if (search && search.trim()) {
      const searchTrimmed = search.trim().replace(/\s+/g, '');
      query += ` AND (
        REPLACE(s.sku_id, ' ', '') ILIKE $${paramIndex} 
        OR REPLACE(s.item_name, ' ', '') ILIKE $${paramIndex} 
        OR REPLACE(COALESCE(s.model, ''), ' ', '') ILIKE $${paramIndex} 
        OR REPLACE(COALESCE(s.hsn_sac_code, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.series, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.rating_size, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.item_details, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(s.vendor_item_code, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(b.name, ''), ' ', '') ILIKE $${paramIndex}
        OR REPLACE(COALESCE(sc.name, ''), ' ', '') ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTrimmed}%`);
      paramIndex++;
    }
    if (productCategory) {
      // Support comma-separated list of category IDs for "All" selection
      if (productCategory.includes(',')) {
        const categoryIds = productCategory.split(',').map(id => id.trim()).filter(id => id);
        if (categoryIds.length > 0) {
          query += ` AND s.product_category_id = ANY($${paramIndex}::int[])`;
          params.push(categoryIds);
          paramIndex++;
        }
      } else {
        query += ` AND s.product_category_id = $${paramIndex}`;
        params.push(productCategory);
        paramIndex++;
      }
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
      if (stockStatus === 'critical') {
        query += ` AND s.current_stock = 0 AND s.min_stock_level > 0`;
      } else if (stockStatus === 'out') {
        query += ` AND s.current_stock = 0 AND (s.min_stock_level <= 0 OR s.min_stock_level IS NULL)`;
      } else if (stockStatus === 'low') {
        query += ` AND s.current_stock > 0 AND s.current_stock < s.min_stock_level`;
      } else if (stockStatus === 'in') {
        query += ` AND s.current_stock > 0 AND s.current_stock >= s.min_stock_level`;
      } else if (stockStatus === 'alert') {
        query += ` AND (s.current_stock < s.min_stock_level OR s.current_stock = 0)`;
      } else if (stockStatus === 'non-movable') {
        query += ` AND s.is_non_movable = true`;
      }
    }
    if (hsnCode) {
      query += ` AND s.hsn_sac_code ILIKE $${paramIndex}`;
      params.push(`%${hsnCode}%`);
      paramIndex++;
    }
    if (excludeNonMovable === 'true') {
      query += ` AND s.is_non_movable = false`;
    }

    // Add sorting
    const validSortFields = {
      skuId: 's.sku_id',
      itemName: 's.item_name',
      brand: 'b.name',
      currentStock: 's.current_stock',
      usefulStocks: 's.current_stock',
      createdAt: 's.created_at'
    };

    const sortField = validSortFields[sortBy] || 's.created_at';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY[\s\S]*$/, '');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    // Transform snake_case to camelCase
    const transformedData = result.rows.map(transformSKU);
    const totalCount = parseInt(countResult.rows[0].count);
    if (productCategory && productCategory.includes(',')) {
      const categoryIds = productCategory.split(',').map(id => id.trim());
    }

    res.json({
      success: true,
      data: transformedData,
      total: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skus/:id
 * Get SKU by ID (supports both integer ID and SKU ID string)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const companyId = getCompanyId(req).toUpperCase();

    // Check if ID is numeric (integer) or alphanumeric (SKU ID string)
    const isNumeric = /^\d+$/.test(idParam);
    const whereClause = isNumeric ? 's.id = $1' : 's.sku_id = $1';

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
      WHERE ${whereClause} AND s.company_id = $2 AND s.is_active = true`,
      [isNumeric ? parseInt(idParam, 10) : idParam, companyId]
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
  validateRequired(['productCategoryId', 'itemCategoryId', 'subCategoryId', 'itemName', 'brandId', 'unit', 'model', 'material', 'manufactureOrImport']),
  validateNumeric('productCategoryId'),
  validateNumeric('itemCategoryId'),
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
        manufactureOrImport,
        color,
        weight,
        weightUnit,
        length,
        lengthUnit,
        width,
        widthUnit,
        height,
        heightUnit,
        openingStock,
        minStockLevel,
        reorderPoint,
        defaultStorageLocation,
        isNonMovable, // Added isNonMovable
        customFields,
        status = 'active',
      } = req.body;

      // Parse custom_fields if it's a string
      let customFieldsParsed = null;
      if (customFields) {
        try {
          customFieldsParsed = typeof customFields === 'string'
            ? JSON.parse(customFields)
            : customFields;
          // Ensure it's valid JSON
          if (customFieldsParsed && typeof customFieldsParsed === 'object') {
            customFieldsParsed = JSON.stringify(customFieldsParsed);
          } else {
            customFieldsParsed = null;
          }
        } catch (e) {
          console.error('Error parsing customFields:', e);
          customFieldsParsed = null;
        }
      }

      const result = await client.query(
        `INSERT INTO skus (
        company_id, sku_id, product_category_id, item_category_id, sub_category_id,
        item_name, item_details, vendor_id, vendor_item_code, brand_id,
        hsn_sac_code, gst_rate, rating_size, model, series, unit,
        material, manufacture_or_import, color,
        weight, weight_unit, length, length_unit, width, width_unit, height, height_unit,
        min_stock_level, reorder_point, default_storage_location,
        current_stock, opening_stock, is_non_movable, custom_fields, status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
      ) RETURNING *`,
        [
          companyId,
          skuId,
          productCategoryId,
          itemCategoryId,
          subCategoryId,
          itemName,
          itemDetails || null,
          vendorId || null,
          vendorItemCode || null,
          brandId,
          hsnSacCode || null,
          gstRate !== undefined && gstRate !== null ? parseFloat(gstRate) : null,
          ratingSize || null,
          model || null,
          series || null,
          unit,
          material || null,
          manufactureOrImport || null,
          color || null,
          weight !== undefined && weight !== null ? parseFloat(weight) : null,
          weightUnit || 'kg',
          length !== undefined && length !== null ? parseFloat(length) : null,
          lengthUnit || 'mm',
          width !== undefined && width !== null ? parseFloat(width) : null,
          widthUnit || 'mm',
          height !== undefined && height !== null ? parseFloat(height) : null,
          heightUnit || 'mm',
          minStockLevel,
          reorderPoint || null,
          defaultStorageLocation || null,
          openingStock !== undefined && openingStock !== null ? openingStock : 0, // Use openingStock for current_stock initialization
          openingStock !== undefined && openingStock !== null ? openingStock : 0, // opening_stock value
          req.body.isNonMovable || false,
          customFieldsParsed,
          status,
          status === 'active',
        ]
      );

      // Record Opening Stock in Ledger if > 0
      const newSku = result.rows[0];
      if (newSku.opening_stock > 0) {
        const LedgerService = require('../services/ledgerService');
        await LedgerService.addTransaction(client, {
          skuId: newSku.id,
          transactionDate: newSku.created_at,
          transactionType: 'OPENING',
          referenceNumber: 'Opening Stock',
          sourceDestination: 'Opening Balance',
          createdBy: null,
          createdByName: 'System',
          quantityChange: newSku.opening_stock,
          companyId: companyId
        });
      }

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

      // Handle duplicate SKU (itemName + model) as a user-friendly validation error
      // PostgreSQL error code 23505 = unique constraint violation
      if (error && error.code === '23505') {
        const errorMessage = error.message || '';
        const errorConstraint = error.constraint || '';

        const isItemModelDuplicate =
          errorConstraint.includes('item_name_model') ||
          errorConstraint.includes('idx_skus_unique_item_name_model') ||
          errorConstraint.startsWith('idx_s') ||
          errorMessage.includes('idx_skus_unique_item_name_model') ||
          errorMessage.includes('item_name_model');

        if (isItemModelDuplicate) {
          return res.status(400).json({
            success: false,
            error: 'This Item Already Exists',
          });
        }
      }

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
 * Update SKU (supports both integer ID and SKU ID string)
 */
router.put(
  '/:id',
  validateRequired(['productCategoryId', 'itemCategoryId', 'subCategoryId', 'itemName', 'brandId', 'unit', 'model', 'material', 'manufactureOrImport']),
  validateNumeric('productCategoryId'),
  validateNumeric('itemCategoryId'),
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

    // Determine if ID is numeric or alphanumeric
    const idParam = req.params.id;
    const isNumeric = /^\d+$/.test(idParam);
    const whereClause = isNumeric ? 'id = $34' : 'sku_id = $34'; // Updated from $35 to $34 since we removed current_stock parameter
    const idValue = isNumeric ? parseInt(idParam, 10) : idParam;
    const companyId = getCompanyId(req).toUpperCase();

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
        manufactureOrImport,
        color,
        weight,
        weightUnit,
        length,
        lengthUnit,
        width,
        widthUnit,
        height,
        heightUnit,
        openingStock,
        currentStock, // Extract currentStock from request
        minStockLevel,
        reorderPoint,
        defaultStorageLocation,
        customFields,
        status,
      } = req.body;

      // Fetch old SKU to get current stock before update
      // Use proper parameter numbering ($1, $2) instead of referencing UPDATE query parameters
      const oldSkuQuery = isNumeric 
        ? 'SELECT id, current_stock, opening_stock FROM skus WHERE id = $1 AND company_id = $2'
        : 'SELECT id, current_stock, opening_stock FROM skus WHERE sku_id = $1 AND company_id = $2';
      
      const oldSkuResult = await client.query(oldSkuQuery, [idValue, companyId]);

      if (oldSkuResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'SKU not found' });
      }

      const oldSku = oldSkuResult.rows[0];
      const oldCurrentStock = parseInt(oldSku.current_stock || 0, 10);
      
      // Parse new current stock (use openingStock if currentStock not provided, for backward compatibility)
      const newCurrentStock = currentStock !== undefined && currentStock !== null 
        ? parseInt(String(currentStock).trim(), 10) 
        : (openingStock !== undefined && openingStock !== null ? parseInt(String(openingStock).trim(), 10) : oldCurrentStock);
      
      // Calculate stock difference
      const stockDifference = newCurrentStock - oldCurrentStock;

      // Parse custom_fields if it's a string
      let customFieldsParsed = null;
      if (customFields) {
        try {
          customFieldsParsed = typeof customFields === 'string'
            ? JSON.parse(customFields)
            : customFields;
          // Ensure it's valid JSON
          if (customFieldsParsed && typeof customFieldsParsed === 'object') {
            customFieldsParsed = JSON.stringify(customFieldsParsed);
          } else {
            customFieldsParsed = null;
          }
        } catch (e) {
          console.error('Error parsing customFields:', e);
          customFieldsParsed = null;
        }
      }

      const result = await client.query(
        `UPDATE skus SET
        product_category_id = $1, item_category_id = $2, sub_category_id = $3,
        item_name = $4, item_details = $5, vendor_id = $6, vendor_item_code = $7, brand_id = $8,
        hsn_sac_code = $9, gst_rate = $10, rating_size = $11, model = $12, series = $13, unit = $14,
        material = $15, manufacture_or_import = $16, color = $17,
        weight = $18, weight_unit = $19, length = $20, length_unit = $21, width = $22, width_unit = $23, height = $24, height_unit = $25,
        min_stock_level = $26, reorder_point = $27, default_storage_location = $28,
        is_non_movable = $29, custom_fields = $30, status = $31, is_active = $32, opening_stock = $33, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause} AND company_id = $35 RETURNING *`,
        [
          productCategoryId,
          itemCategoryId,
          subCategoryId,
          itemName,
          itemDetails || null,
          vendorId || null,
          vendorItemCode || null,
          brandId,
          hsnSacCode || null,
          gstRate !== undefined && gstRate !== null ? parseFloat(gstRate) : null,
          ratingSize || null,
          model || null,
          series || null,
          unit,
          material || null,
          manufactureOrImport || null,
          color || null,
          weight !== undefined && weight !== null ? parseFloat(weight) : null,
          weightUnit || 'kg',
          length !== undefined && length !== null ? parseFloat(length) : null,
          lengthUnit || 'mm',
          width !== undefined && width !== null ? parseFloat(width) : null,
          widthUnit || 'mm',
          height !== undefined && height !== null ? parseFloat(height) : null,
          heightUnit || 'mm',
          minStockLevel,
          reorderPoint || null,
          defaultStorageLocation || null,
          req.body.isNonMovable || false,
          customFieldsParsed,
          status || 'active',
          status === 'active',
          openingStock !== undefined && openingStock !== null ? openingStock : 0, // opening_stock value
          idValue,
          companyId,
        ]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'SKU not found' });
      }

      // Create ledger entry if stock changed
      if (stockDifference !== 0) {
        const LedgerService = require('../services/ledgerService');
        const user = req.user || {};
        const createdByName = user.role && String(user.role).toLowerCase().includes('admin')
          ? 'Super Admin'
          : (user.email || 'System');

        await LedgerService.addTransaction(client, {
          skuId: oldSku.id,
          transactionDate: new Date(),
          transactionType: 'OPENING', // Use OPENING type for manual stock adjustments
          referenceNumber: 'Stock Adjustment',
          sourceDestination: 'Manual Stock Update',
          createdBy: user.id || user.userId || null,
          createdByName: createdByName,
          quantityChange: stockDifference, // Positive for increase, negative for decrease
          companyId: companyId
        });
      }

      await client.query('COMMIT');

      // Fetch the updated SKU with joins to get category names
      const selectWhereClause = isNumeric ? 's.id = $1' : 's.sku_id = $1';
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
      WHERE ${selectWhereClause} AND s.company_id = $2 AND s.is_active = true`,
        [idValue, companyId]
      );

      if (updatedSKU.rows.length === 0) {
        return res.status(404).json({ error: 'SKU not found' });
      }

      // Transform snake_case to camelCase
      const transformedData = transformSKU(updatedSKU.rows[0]);
      res.json({ success: true, data: transformedData });
    } catch (error) {
      await client.query('ROLLBACK');

      // Handle duplicate SKU (itemName + model) as a user-friendly validation error
      if (error && error.code === '23505') {
        const errorMessage = error.message || '';
        const errorConstraint = error.constraint || '';

        const isItemModelDuplicate =
          errorConstraint.includes('item_name_model') ||
          errorConstraint.includes('idx_skus_unique_item_name_model') ||
          errorConstraint.startsWith('idx_s') ||
          errorMessage.includes('idx_skus_unique_item_name_model') ||
          errorMessage.includes('item_name_model');

        if (isItemModelDuplicate) {
          return res.status(400).json({
            success: false,
            error: 'This Item Already Exists',
          });
        }
      }

      next(error);
    } finally {
      client.release();
    }
  });

/**
 * DELETE /api/skus/:id
 * Soft delete SKU (supports both integer ID and SKU ID string)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const isNumeric = /^\d+$/.test(idParam);
    const whereClause = isNumeric ? 'id = $1' : 'sku_id = $1';
    const idValue = isNumeric ? parseInt(idParam, 10) : idParam;
    const companyId = getCompanyId(req).toUpperCase();

    const result = await pool.query(
      `UPDATE skus SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE ${whereClause} AND company_id = $2 RETURNING id`,
      [idValue, companyId]
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
    const sortBy = req.query.sortBy || 'units'; // 'units', 'revenue', or 'frequency'

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - period);
    dateFrom.setHours(0, 0, 0, 0); // Start of day
    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999); // End of day

    // Build the query to get top selling SKUs from outgoing inventory
    let query = `
      SELECT 
        s.id,
        s.sku_id,
        s.item_name,
        s.current_stock,
        s.min_stock_level as min_stock,
        COALESCE(pc.name, ic.name, sc.name, 'Uncategorized') as category,
        COALESCE(SUM(oii.outgoing_quantity), 0)::INTEGER as units_sold,
        COALESCE(SUM(oii.total_value), 0)::DECIMAL as revenue,
        MAX(oi.invoice_challan_date) as last_sale_date,
        COUNT(DISTINCT oi.id) as sale_frequency
      FROM skus s
      INNER JOIN outgoing_inventory_items oii ON s.id = oii.sku_id
      INNER JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      WHERE s.company_id = $1 
        AND oi.company_id = $1
        AND oi.is_active = true 
        AND oi.status = 'completed'
        AND oi.invoice_challan_date >= $2::DATE
        AND oi.invoice_challan_date <= $3::DATE
      GROUP BY s.id, s.sku_id, s.item_name, s.current_stock, s.min_stock_level, 
               s.product_category_id, s.item_category_id, s.sub_category_id,
               pc.name, ic.name, sc.name
      HAVING SUM(oii.outgoing_quantity) > 0
    `;

    // Add sorting based on sortBy parameter
    if (sortBy === 'revenue') {
      query += ` ORDER BY revenue DESC, units_sold DESC`;
    } else if (sortBy === 'frequency') {
      query += ` ORDER BY sale_frequency DESC, units_sold DESC`;
    } else {
      // Default: sort by units
      query += ` ORDER BY units_sold DESC, revenue DESC`;
    }

    // Limit to top 100 results
    query += ` LIMIT 100`;

    const result = await pool.query(query, [
      companyId,
      dateFrom.toISOString().split('T')[0], // Format as YYYY-MM-DD
      dateTo.toISOString().split('T')[0]
    ]);

    // Format the response to match frontend expectations
    const formattedData = result.rows.map((row) => ({
      skuId: row.sku_id,
      id: row.id,
      itemName: row.item_name,
      name: row.item_name,
      category: row.category,
      unitsSold: parseInt(row.units_sold) || 0,
      revenue: parseFloat(row.revenue) || 0,
      currentStock: parseInt(row.current_stock) || 0,
      minStock: parseInt(row.min_stock) || 0,
      lastSaleDate: row.last_sale_date ? new Date(row.last_sale_date).toISOString() : null,
      saleFrequency: parseInt(row.sale_frequency) || 0
    }));

    res.json({
      success: true,
      data: formattedData
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

    const query = `
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
      WHERE s.company_id = $1 AND s.is_active = true AND s.is_non_movable = true AND s.current_stock > 0
      ORDER BY s.updated_at DESC
    `;

    const result = await pool.query(query, [companyId]);

    // Transform data
    const transformedData = result.rows.map(sku => ({
      skuId: sku.sku_id,
      itemName: sku.item_name,
      category: sku.product_category || 'Uncategorized',
      currentStock: sku.current_stock,
      lastMovementDate: sku.updated_at,
      aging: Math.floor((new Date() - new Date(sku.updated_at)) / (1000 * 60 * 60 * 24)),
      unitPrice: 0, // In standard inventory view, unit price might be elsewhere
      inventoryValue: 0 // Placeholder
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/skus/bulk-non-movable
 * Mark multiple SKUs as non-movable
 */
router.patch('/bulk-non-movable', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No IDs provided' });
    }

    const companyId = getCompanyId(req).toUpperCase();

    // We support both numeric IDs and alphanumeric SKU IDs
    const isNumericArray = ids.every(id => /^\d+$/.test(String(id)));
    const idColumn = isNumericArray ? 'id' : 'sku_id';

    const query = `
      UPDATE skus 
      SET is_non_movable = true, updated_at = NOW()
      WHERE company_id = $1 AND ${idColumn} = ANY($2)
      RETURNING id
    `;

    const result = await pool.query(query, [companyId, ids]);

    res.json({
      success: true,
      data: {
        updatedCount: result.rowCount,
        ids: result.rows.map(row => row.id)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


