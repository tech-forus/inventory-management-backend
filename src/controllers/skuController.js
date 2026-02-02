const SKUModel = require('../models/skuModel');
const { getCompanyId } = require('../middlewares/auth');
const { getUserCategoryAccess } = require('../utils/rbac');
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
    const user = req.user || {};
    const categoryAccess = await getUserCategoryAccess(user.userId, companyId, user.role);

    const filters = {
      search: req.query.search ? req.query.search.trim() : undefined,
      productCategory: req.query.productCategory,
      productCategories: req.query.productCategories,
      itemCategory: req.query.itemCategory,
      subCategory: req.query.subCategory,
      brand: req.query.brand,
      stockStatus: req.query.stockStatus,
      hsnCode: req.query.hsnCode,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      allowedProductCategoryIds: categoryAccess?.productCategoryIds || null,
      allowedItemCategoryIds: categoryAccess?.itemCategoryIds || null,
      allowedSubCategoryIds: categoryAccess?.subCategoryIds || null,
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

    // Check if SKU with same itemName and model already exists
    if (req.body.itemName) {
      // Normalize model: treat null, undefined, empty string, and whitespace as equivalent
      let modelValue = '';
      if (req.body.model !== null && req.body.model !== undefined && req.body.model !== '') {
        const modelStr = String(req.body.model).trim();
        if (modelStr !== '') {
          modelValue = modelStr;
        }
      }
      
      // Generate a lock key from itemName + model + companyId for advisory lock
      const lockKey = SKUModel.generateDuplicateLockKey(req.body.itemName, modelValue, companyId);
      
      // Acquire advisory lock to prevent concurrent duplicate checks
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);
      
      // Pass transaction client to prevent race conditions
      const duplicateExists = await SKUModel.itemNameModelExists(
        req.body.itemName,
        modelValue,
        companyId,
        null, // excludeId (not needed for create)
        client // Pass transaction client
      );
      if (duplicateExists) {
        await client.query('ROLLBACK');
        throw new ValidationError('This Item Already Exists');
      }
    }

    const sku = await SKUModel.create(req.body, companyId, skuId);

    // Fetch the created SKU with joins
    const createdSKU = await SKUModel.getById(sku.id, companyId);

    await client.query('COMMIT');

    const transformedData = transformSKU(createdSKU);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    // Handle unique constraint violation as duplicate error
    // PostgreSQL error code 23505 = unique constraint violation
    if (error.code === '23505') {
      const errorMessage = error.message || '';
      const errorConstraint = error.constraint || '';
      
      // Check if this is related to item_name + model duplicate constraint
      // Check constraint name, error message, or if it's a generic duplicate on skus table
      const isItemModelDuplicate = 
        errorConstraint.includes('item_name_model') ||
        errorConstraint.includes('idx_skus_unique') ||
        errorConstraint.startsWith('idx_s') ||
        errorMessage.includes('idx_skus_unique_item_name_model') ||
        errorMessage.includes('item_name_model') ||
        (errorMessage.includes('duplicate key') && 
         (errorMessage.includes('skus') || errorMessage.includes('item') || errorMessage.includes('model')));
      
      if (isItemModelDuplicate) {
        next(new ValidationError('This Item Already Exists'));
        return;
      }
    }
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

    // Check if SKU with same itemName and model already exists (excluding current SKU)
    if (req.body.itemName) {
      // Check for duplicates even if model is empty string or null
      // Normalize model: treat null, undefined, empty string, and whitespace as equivalent
      let modelValue = '';
      if (req.body.model !== null && req.body.model !== undefined && req.body.model !== '') {
        const modelStr = String(req.body.model).trim();
        if (modelStr !== '') {
          modelValue = modelStr;
        }
      }
      
      // Generate a lock key from itemName + model + companyId for advisory lock
      const lockKey = SKUModel.generateDuplicateLockKey(req.body.itemName, modelValue, companyId);
      
      // Acquire advisory lock to prevent concurrent duplicate checks
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);
      
      // Pass transaction client to prevent race conditions
      const duplicateExists = await SKUModel.itemNameModelExists(
        req.body.itemName,
        modelValue,
        companyId,
        req.params.id, // Exclude current SKU from check
        client // Pass transaction client
      );
      if (duplicateExists) {
        await client.query('ROLLBACK');
        throw new ValidationError('This Item Already Exists');
      }
    }

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
    // Handle unique constraint violation as duplicate error
    // PostgreSQL error code 23505 = unique constraint violation
    if (error.code === '23505') {
      const errorMessage = error.message || '';
      const errorConstraint = error.constraint || '';
      
      // Check if this is related to item_name + model duplicate constraint
      // Check constraint name, error message, or if it's a generic duplicate on skus table
      const isItemModelDuplicate = 
        errorConstraint.includes('item_name_model') ||
        errorConstraint.includes('idx_skus_unique') ||
        errorConstraint.startsWith('idx_s') ||
        errorMessage.includes('idx_skus_unique_item_name_model') ||
        errorMessage.includes('item_name_model') ||
        (errorMessage.includes('duplicate key') && 
         (errorMessage.includes('skus') || errorMessage.includes('item') || errorMessage.includes('model')));
      
      if (isItemModelDuplicate) {
        next(new ValidationError('This Item Already Exists'));
        return;
      }
    }
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

        // Try case-insensitive match (strip asterisks, normalize spaces, handle forward slashes)
        for (const rowKey in row) {
          // Normalize row key: remove asterisks, normalize spaces, handle forward slashes
          const normalizedRowKey = rowKey
            .replace(/\s*\*\s*$/, '') // Remove trailing asterisk
            .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
            .replace(/\s*\/\s*/g, '/') // Normalize spaces around forward slashes
            .trim()
            .toLowerCase();
          
          // Normalize search key: replace underscores with spaces, normalize spaces
          const normalizedKey = key
            .replace(/_/g, ' ') // Replace underscores with spaces
            .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
            .replace(/\s*\/\s*/g, '/') // Normalize spaces around forward slashes
            .trim()
            .toLowerCase();
          
          if (normalizedRowKey === normalizedKey) {
            const value = row[rowKey];
            if (value !== undefined && value !== null && value !== '') {
              return value;
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
        const itemName = getValue(row, 'item_name', 'itemName', 'Item Name', 'Item Name*');
        if (!itemName || !String(itemName).trim()) {
          errors.push({ row: i + 2, error: 'Item Name is required' });
          continue;
        }

        const productCategoryName = getValue(row, 'product_category', 'productCategory', 'Product Category', 'Product Category*', 'product_category_name');
        const itemCategoryName = getValue(row, 'item_category', 'itemCategory', 'Item Category', 'Item Category*', 'item_category_name');
        const vendorName = getValue(row, 'vendor', 'vendorName', 'Vendor', 'vendor_name');
        const brandName = getValue(row, 'brand', 'brandName', 'Brand', 'Brand*', 'brand_name');
        const unit = getValue(row, 'unit', 'Unit', 'Unit*');

        if (!productCategoryName) {
          errors.push({ row: i + 2, error: 'Product Category is required' });
          continue;
        }
        if (!itemCategoryName) {
          errors.push({ row: i + 2, error: 'Item Category is required' });
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

        // Validate HSN Code (required field from template)
        const hsnCode = getValue(row, 'hsn_sac_code', 'hsnSacCode', 'HSN Code', 'HSN Code*', 'HSN/SAC Code', 'HSN', 'hsn');
        if (!hsnCode || !String(hsnCode).trim()) {
          errors.push({ row: i + 2, error: 'HSN Code is required' });
          continue;
        }

        // Validate GST Percentage (required field from template)
        const gstPercentage = getValue(row, 'gst_percentage', 'gstPercentage', 'GST Percentage', 'GST Percentage*', 'GST Rate', 'gst_rate', 'GST Rate (%)');
        if (!gstPercentage || String(gstPercentage).trim() === '') {
          errors.push({ row: i + 2, error: 'GST Percentage is required' });
          continue;
        }

        // Validate Sub Category (required field from template)
        const subCategoryName = getValue(row, 'sub_category', 'subCategory', 'Sub Category', 'Sub Category*', 'sub_category_name');
        if (!subCategoryName || !String(subCategoryName).trim()) {
          errors.push({ row: i + 2, error: 'Sub Category is required' });
          continue;
        }

        // Validate Material (required field from template)
        const material = getValue(row, 'material', 'Material', 'Material*');
        if (!material || !String(material).trim()) {
          errors.push({ row: i + 2, error: 'Material is required' });
          continue;
        }

        // Validate Manufacture or Import (required field from template)
        const manufactureOrImport = getValue(row, 'manufacture_or_import', 'manufactureOrImport', 'Manufacture or Import', 'Manufacture or Import*');
        if (!manufactureOrImport || !String(manufactureOrImport).trim()) {
          errors.push({ row: i + 2, error: 'Manufacture or Import is required' });
          continue;
        }

        // Validate Default Storage Location (required field from template)
        const defaultStorageLocation = getValue(row, 'default_storage_location', 'defaultStorageLocation', 'Storage Location', 'Default Storage Location', 'Default Storage Location *');
        if (!defaultStorageLocation || !String(defaultStorageLocation).trim()) {
          errors.push({ row: i + 2, error: 'Default Storage Location is required' });
          continue;
        }

        // Validate Current Stock (required field from template)
        // Try multiple variations of the header name
        const currentStockValue = getValue(
          row, 
          'current_stock', 
          'currentStock', 
          'Current Stock', 
          'Current Stock *',
          'Current/Opening Stocks', 
          'Current/Opening Stocks *', 
          'Current/Opening Stocks*',
          'Current / Opening Stocks',
          'Current / Opening Stocks *',
          'Opening Stock',
          'Opening Stock *',
          'Opening Stocks',
          'Opening Stocks *'
        );
        
        // Check if value exists (0 is a valid value, so we need to check for null/undefined/empty string)
        if (currentStockValue === null || currentStockValue === undefined || (typeof currentStockValue === 'string' && currentStockValue.trim() === '')) {
          // Debug: log available keys to help diagnose header matching issues
          const availableKeys = Object.keys(row).join(', ');
          errors.push({ 
            row: i + 2, 
            error: `Current/Opening Stocks is required. Available columns: ${availableKeys.substring(0, 200)}` 
          });
          continue;
        }
        
        // Parse the value - handle both string and number types
        const stockString = String(currentStockValue).trim();
        const parsedStock = stockString === '' ? 0 : parseInt(stockString, 10);
        
        if (isNaN(parsedStock) || parsedStock < 0) {
          errors.push({ row: i + 2, error: `Current/Opening Stocks must be a valid non-negative number (found: "${currentStockValue}")` });
          continue;
        }
        const currentStock = parsedStock;

        // Lookup IDs
        const productCategoryId = lookupId(productCategoryName, productCategoryMap, 'Product Category');
        const itemCategoryId = lookupId(itemCategoryName, itemCategoryMap, 'Item Category');
        const vendorId = vendorName ? lookupId(vendorName, vendorMap, 'Vendor') : null;
        const brandId = lookupId(brandName, brandMap, 'Brand');
        const subCategoryId = lookupId(subCategoryName, subCategoryMap, 'Sub Category');

        // Get the generated SKU ID for this row
        const skuId = skuIds[i];

        // Parse custom fields from Field Name and Field Value columns
        let customFields = null;
        const fieldName = getValue(row, 'field_name', 'Field Name');
        const fieldValue = getValue(row, 'field_value', 'Field Value');
        if (fieldName && fieldValue) {
          try {
            customFields = JSON.stringify([{ key: String(fieldName).trim(), value: String(fieldValue).trim() }]);
          } catch (e) {
            console.error('Error creating custom fields:', e);
          }
        }

        // Parse GST Percentage (already validated above)
        let gstRate = null;
        const parsedGst = parseFloat(String(gstPercentage).replace('%', '').trim());
        if (!isNaN(parsedGst)) {
          gstRate = parsedGst;
        } else {
          errors.push({ row: i + 2, error: 'GST Percentage must be a valid number' });
          continue;
        }

        // Prepare SKU data
        const skuData = {
          productCategoryId,
          itemCategoryId,
          subCategoryId,
          itemName: String(itemName).trim(),
          itemDetails: getValue(row, 'item_details', 'itemDetails', 'Item Details', 'Item Details as per Vendor', 'description', 'Description') || null,
          vendorId,
          vendorItemCode: getValue(row, 'vendor_item_code', 'vendorItemCode', 'Vendor Item Code', 'Item Code as per Vendor') ? String(getValue(row, 'vendor_item_code', 'vendorItemCode', 'Vendor Item Code', 'Item Code as per Vendor')).trim() : null,
          brandId,
          hsnSacCode: String(hsnCode).trim(),
          gstRate: gstRate,
          ratingSize: getValue(row, 'rating_size', 'ratingSize', 'Rating Size', 'Rating', 'Rating/Size', 'rating') || null,
          model: getValue(row, 'model', 'Model', 'Model No.', 'Model No.*', 'Model No') || null,
          series: getValue(row, 'series', 'Series') || null,
          unit: String(unit).trim(),
          material: String(material).trim(),
          manufactureOrImport: String(manufactureOrImport).trim(),
          color: getValue(row, 'color', 'Color') || null,
          weight: getValue(row, 'weight', 'Weight') ? parseFloat(getValue(row, 'weight', 'Weight')) : null,
          length: getValue(row, 'length', 'Length') ? parseFloat(getValue(row, 'length', 'Length')) : null,
          width: getValue(row, 'width', 'Width') ? parseFloat(getValue(row, 'width', 'Width')) : null,
          height: getValue(row, 'height', 'Height') ? parseFloat(getValue(row, 'height', 'Height')) : null,
          currentStock: currentStock, // Use parsed current stock value
          openingStock: currentStock, // Set openingStock same as currentStock for ledger entry
          minStockLevel: getValue(row, 'min_stock_level', 'minStockLevel', 'Min Stock', 'min_stock', 'Minimum Stock Level', 'Minimum Stock Level (MSQ)', 'MSQ') ? parseInt(getValue(row, 'min_stock_level', 'minStockLevel', 'Min Stock', 'min_stock', 'Minimum Stock Level', 'Minimum Stock Level (MSQ)', 'MSQ')) : 0,
          defaultStorageLocation: String(defaultStorageLocation).trim(),
          customFields: customFields,
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



