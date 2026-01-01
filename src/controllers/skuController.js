const SKUModel = require('../models/skuModel');
const { getCompanyId } = require('../middlewares/auth');
const { generateUniqueSKUId, generateBulkUniqueSKUIds } = require('../utils/skuIdGenerator');
const { transformSKU } = require('../utils/transformers');
const { parseExcelFile } = require('../utils/helpers');
const pool = require('../models/database');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');

/**
 * SKU Controller
 * Handles all SKU-related operations
 */

/**
 * Get all SKUs with filters
 */
const getAllSKUs = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const filters = {
      search: req.query.search,
      productCategory: req.query.productCategory,
      itemCategory: req.query.itemCategory,
      subCategory: req.query.subCategory,
      brand: req.query.brand,
      stockStatus: req.query.stockStatus,
      hsnCode: req.query.hsnCode,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };

    const skus = await SKUModel.getAll(filters, companyId);
    const total = await SKUModel.getCount(filters, companyId);
    const transformedData = skus.map(transformSKU);

    res.json({
      success: true,
      data: transformedData,
      total,
      pagination: {
        page: parseInt(filters.page),
        limit: parseInt(filters.limit),
        total,
        totalPages: Math.ceil(total / parseInt(filters.limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SKU by ID
 */
const getSKUById = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const sku = await SKUModel.getById(req.params.id, companyId);
    
    if (!sku) {
      throw new NotFoundError('SKU not found');
    }

    const transformedData = transformSKU(sku);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new SKU
 */
const createSKU = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);

    // Generate SKU ID if not provided or if auto-generate is enabled
    let skuId = req.body.skuId;
    if (!skuId || req.body.autoGenerateSKU !== false) {
      skuId = await generateUniqueSKUId(client, companyId);
    }

    // Validate SKU ID format (should be 14 characters: 6 company ID + 8 alphanumeric)
    if (skuId.length !== 14) {
      await client.query('ROLLBACK');
      throw new ValidationError('SKU ID must be 14 characters (6 company ID + 8 alphanumeric)');
    }

    // Check if SKU ID already exists
    const exists = await SKUModel.skuIdExists(skuId);
    if (exists) {
      await client.query('ROLLBACK');
      throw new ValidationError('SKU ID already exists');
    }

    const sku = await SKUModel.create(req.body, companyId, skuId);
    
    // Fetch the created SKU with joins
    const createdSKU = await SKUModel.getById(sku.id, companyId);
    
    await client.query('COMMIT');
    
    const transformedData = transformSKU(createdSKU);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Update SKU
 */
const updateSKU = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);

    const sku = await SKUModel.update(req.params.id, req.body, companyId);
    
    if (!sku) {
      await client.query('ROLLBACK');
      throw new NotFoundError('SKU not found');
    }

    // Fetch the updated SKU with joins
    const updatedSKU = await SKUModel.getById(req.params.id, companyId);
    
    await client.query('COMMIT');
    
    if (!updatedSKU) {
      throw new NotFoundError('SKU not found');
    }
    
    const transformedData = transformSKU(updatedSKU);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Delete SKU (soft delete)
 */
const deleteSKU = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await SKUModel.delete(req.params.id, companyId);

    if (!result) {
      throw new NotFoundError('SKU not found');
    }

    res.json({ success: true, message: 'SKU deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload SKUs from Excel file
 * Excel file should NOT contain sku_id - it will be auto-generated
 */
const uploadSKUs = async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req).toUpperCase();
    const data = parseExcelFile(req.file.buffer);

    if (!data || data.length === 0) {
      throw new ValidationError('Excel file is empty or could not be parsed');
    }

    // Generate unique SKU IDs for all rows
    const skuIds = await generateBulkUniqueSKUIds(client, companyId, data.length);

    // Fetch lookup maps for categories, vendors, and brands
    const [productCategories, itemCategories, subCategories, vendors, brands] = await Promise.all([
      client.query('SELECT id, LOWER(TRIM(name)) as name_lower, name FROM product_categories WHERE company_id = $1 AND is_active = true', [companyId]),
      client.query('SELECT id, LOWER(TRIM(name)) as name_lower, name FROM item_categories WHERE company_id = $1 AND is_active = true', [companyId]),
      client.query('SELECT id, LOWER(TRIM(name)) as name_lower, name FROM sub_categories WHERE company_id = $1 AND is_active = true', [companyId]),
      client.query('SELECT id, LOWER(TRIM(name)) as name_lower, name FROM vendors WHERE company_id = $1 AND is_active = true', [companyId]),
      client.query('SELECT id, LOWER(TRIM(name)) as name_lower, name FROM brands WHERE company_id = $1 AND is_active = true', [companyId]),
    ]);

    // Create lookup maps (case-insensitive)
    const productCategoryMap = new Map(productCategories.rows.map(pc => [pc.name_lower, pc.id]));
    const itemCategoryMap = new Map(itemCategories.rows.map(ic => [ic.name_lower, ic.id]));
    const subCategoryMap = new Map(subCategories.rows.map(sc => [sc.name_lower, sc.id]));
    const vendorMap = new Map(vendors.rows.map(v => [v.name_lower, v.id]));
    const brandMap = new Map(brands.rows.map(b => [b.name_lower, b.id]));

    const inserted = [];
    const errors = [];

    // Helper function to normalize Excel column names
    // Handles variations like "Product Category *", "Product Category", "product_category", etc.
    const getValue = (row, ...possibleKeys) => {
      for (const key of possibleKeys) {
        // Try exact match
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
        
        // Try with asterisk and spaces (e.g., "Product Category *")
        const withAsterisk = `${key} *`;
        if (row[withAsterisk] !== undefined && row[withAsterisk] !== null && row[withAsterisk] !== '') {
          return row[withAsterisk];
        }
        
        // Try camelCase version
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (row[camelKey] !== undefined && row[camelKey] !== null && row[camelKey] !== '') {
          return row[camelKey];
        }
        
        // Try camelCase with asterisk
        const camelKeyWithAsterisk = `${camelKey} *`;
        if (row[camelKeyWithAsterisk] !== undefined && row[camelKeyWithAsterisk] !== null && row[camelKeyWithAsterisk] !== '') {
          return row[camelKeyWithAsterisk];
        }
        
        // Try case-insensitive match (strip asterisks and compare)
        for (const rowKey in row) {
          const normalizedRowKey = rowKey.replace(/\s*\*\s*$/, '').trim();
          const normalizedKey = key.replace(/_/g, ' ').trim();
          if (normalizedRowKey.toLowerCase() === normalizedKey.toLowerCase()) {
            if (row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey] !== '') {
              return row[rowKey];
            }
          }
        }
      }
      return null;
    };

    // Helper function to lookup ID by name
    const lookupId = (name, map, entityType) => {
      if (!name) return null;
      const normalizedName = String(name).toLowerCase().trim();
      const id = map.get(normalizedName);
      if (!id) {
        throw new Error(`${entityType} "${name}" not found. Please ensure it exists in the library.`);
      }
      return id;
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Required fields validation
        const itemName = getValue(row, 'item_name', 'itemName', 'Item Name');
        if (!itemName || !String(itemName).trim()) {
          errors.push({ row: i + 2, error: 'Item Name is required' });
          continue;
        }

        const productCategoryName = getValue(row, 'product_category', 'productCategory', 'Product Category', 'product_category_name');
        const itemCategoryName = getValue(row, 'item_category', 'itemCategory', 'Item Category', 'item_category_name');
        const vendorName = getValue(row, 'vendor', 'vendorName', 'Vendor', 'vendor_name');
        const brandName = getValue(row, 'brand', 'brandName', 'Brand', 'brand_name');
        const unit = getValue(row, 'unit', 'Unit');

        if (!productCategoryName) {
          errors.push({ row: i + 2, error: 'Product Category is required' });
          continue;
        }
        if (!itemCategoryName) {
          errors.push({ row: i + 2, error: 'Item Category is required' });
          continue;
        }
        if (!vendorName) {
          errors.push({ row: i + 2, error: 'Vendor is required' });
          continue;
        }
        if (!brandName) {
          errors.push({ row: i + 2, error: 'Brand is required' });
          continue;
        }
        if (!unit) {
          errors.push({ row: i + 2, error: 'Unit is required' });
          continue;
        }

        // Validate Current Stock (required field from template)
        const currentStockValue = getValue(row, 'current_stock', 'currentStock', 'Current Stock');
        if (currentStockValue === null || currentStockValue === undefined || currentStockValue === '') {
          errors.push({ row: i + 2, error: 'Current Stock is required' });
          continue;
        }
        const parsedStock = parseInt(String(currentStockValue).trim());
        if (isNaN(parsedStock) || parsedStock < 0) {
          errors.push({ row: i + 2, error: 'Current Stock must be a valid non-negative number' });
          continue;
        }
        const currentStock = parsedStock;

        // Lookup IDs
        const productCategoryId = lookupId(productCategoryName, productCategoryMap, 'Product Category');
        const itemCategoryId = lookupId(itemCategoryName, itemCategoryMap, 'Item Category');
        const vendorId = lookupId(vendorName, vendorMap, 'Vendor');
        const brandId = lookupId(brandName, brandMap, 'Brand');
        
        const subCategoryName = getValue(row, 'sub_category', 'subCategory', 'Sub Category', 'sub_category_name');
        const subCategoryId = subCategoryName ? lookupId(subCategoryName, subCategoryMap, 'Sub Category') : null;

        // Get the generated SKU ID for this row
        const skuId = skuIds[i];

        // Prepare SKU data
        const skuData = {
          productCategoryId,
          itemCategoryId,
          subCategoryId,
          itemName: String(itemName).trim(),
          itemDetails: getValue(row, 'item_details', 'itemDetails', 'Item Details', 'Item Details as per Vendor', 'description', 'Description') || null,
          vendorId,
          vendorItemCode: getValue(row, 'vendor_item_code', 'vendorItemCode', 'Vendor Item Code') ? String(getValue(row, 'vendor_item_code', 'vendorItemCode', 'Vendor Item Code')).trim() : null,
          brandId,
          hsnSacCode: getValue(row, 'hsn_sac_code', 'hsnSacCode', 'HSN Code', 'HSN/SAC Code', 'HSN', 'hsn') ? String(getValue(row, 'hsn_sac_code', 'hsnSacCode', 'HSN Code', 'HSN/SAC Code', 'HSN', 'hsn')).trim() : null,
          ratingSize: getValue(row, 'rating_size', 'ratingSize', 'Rating Size', 'Rating/Size', 'rating') || null,
          model: getValue(row, 'model', 'Model') || null,
          series: getValue(row, 'series', 'Series') || null,
          unit: String(unit).trim(),
          material: getValue(row, 'material', 'Material') || null,
          insulation: getValue(row, 'insulation', 'Insulation') || null,
          inputSupply: getValue(row, 'input_supply', 'inputSupply', 'Input Supply') || null,
          color: getValue(row, 'color', 'Color') || null,
          cri: getValue(row, 'cri', 'CRI') ? parseFloat(getValue(row, 'cri', 'CRI')) : null,
          cct: getValue(row, 'cct', 'CCT') ? parseFloat(getValue(row, 'cct', 'CCT')) : null,
          beamAngle: getValue(row, 'beam_angle', 'beamAngle', 'Beam Angle') || null,
          ledType: getValue(row, 'led_type', 'ledType', 'LED Type') || null,
          shape: getValue(row, 'shape', 'Shape') || null,
          weight: getValue(row, 'weight', 'Weight', 'Weight (Kg)', 'Weight (kg)') ? parseFloat(getValue(row, 'weight', 'Weight', 'Weight (Kg)', 'Weight (kg)')) : null,
          length: getValue(row, 'length', 'Length', 'Length (cm)', 'Length (Cm)', 'Length (CM)') ? parseFloat(getValue(row, 'length', 'Length', 'Length (cm)', 'Length (Cm)', 'Length (CM)')) : null,
          width: getValue(row, 'width', 'Width', 'Width (cm)', 'Width (Cm)', 'Width (CM)') ? parseFloat(getValue(row, 'width', 'Width', 'Width (cm)', 'Width (Cm)', 'Width (CM)')) : null,
          height: getValue(row, 'height', 'Height', 'Height (cm)', 'Height (Cm)', 'Height (CM)') ? parseFloat(getValue(row, 'height', 'Height', 'Height (cm)', 'Height (Cm)', 'Height (CM)')) : null,
          rackNumber: getValue(row, 'rack_number', 'rackNumber', 'Rack Number') || null,
          currentStock: currentStock, // Use parsed current stock value
          minStockLevel: getValue(row, 'min_stock_level', 'minStockLevel', 'Min Stock', 'min_stock', 'Minimum Stock Level') ? parseInt(getValue(row, 'min_stock_level', 'minStockLevel', 'Min Stock', 'min_stock', 'Minimum Stock Level')) : 0,
          reorderPoint: getValue(row, 'reorder_point', 'reorderPoint', 'Reorder Point') ? parseInt(getValue(row, 'reorder_point', 'reorderPoint', 'Reorder Point')) : null,
          defaultStorageLocation: getValue(row, 'default_storage_location', 'defaultStorageLocation', 'Storage Location', 'Default Storage Location') || null,
          status: getValue(row, 'status', 'Status') || 'active',
        };

        // Create SKU
        const sku = await SKUModel.create(skuData, companyId, skuId);
        inserted.push({ id: sku.id, skuId: sku.sku_id, itemName: sku.item_name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message || 'Failed to create SKU' });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} products successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
      data: inserted,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getAllSKUs,
  getSKUById,
  createSKU,
  updateSKU,
  deleteSKU,
  uploadSKUs,
};



