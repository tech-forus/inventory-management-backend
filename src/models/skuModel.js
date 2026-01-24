const pool = require('./database');
const LedgerService = require('../services/ledgerService');

/**
 * SKU Model
 * Handles all database operations for SKUs
 */
class SKUModel {
  /**
   * Get all SKUs with filters
   */
  static async getAll(filters, companyId) {
    let query = `
      SELECT 
        s.*,
        pc.name as product_category,
        ic.name as item_category,
        sc.name as sub_category,
        b.name as brand,
        v.name as vendor,
        CASE 
          WHEN latest_incoming.receiving_date IS NOT NULL THEN 'IN'
          ELSE NULL
        END as transaction_type
      FROM skus s
      LEFT JOIN product_categories pc ON s.product_category_id = pc.id
      LEFT JOIN item_categories ic ON s.item_category_id = ic.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id 
          AND ii.company_id = $1 
          AND ii.is_active = true 
          AND ii.status = 'completed'
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      WHERE s.company_id = $1 AND s.is_active = true
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    // Add filters
    if (filters.search && filters.search.trim()) {
      const searchTrimmed = filters.search.trim();
      query += ` AND (
        s.sku_id ILIKE $${paramIndex} 
        OR s.item_name ILIKE $${paramIndex} 
        OR s.model ILIKE $${paramIndex} 
        OR s.hsn_sac_code ILIKE $${paramIndex}
        OR s.series ILIKE $${paramIndex}
        OR s.rating_size ILIKE $${paramIndex}
        OR s.item_details ILIKE $${paramIndex}
        OR s.vendor_item_code ILIKE $${paramIndex}
        OR b.name ILIKE $${paramIndex}
        OR sc.name ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTrimmed}%`);
      paramIndex++;
    }
    if (filters.productCategory) {
      // Support comma-separated list of category IDs for "All" selection
      if (typeof filters.productCategory === 'string' && filters.productCategory.includes(',')) {
        const categoryIds = filters.productCategory.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        if (categoryIds.length > 0) {
          query += ` AND s.product_category_id = ANY($${paramIndex}::integer[])`;
          params.push(categoryIds);
          paramIndex++;
        }
      } else {
        query += ` AND s.product_category_id = $${paramIndex}`;
        params.push(filters.productCategory);
        paramIndex++;
      }
    } else if (filters.productCategories) {
      // Handle multiple category IDs (comma-separated string) - alternative parameter name
      const rawCats = String(filters.productCategories);
      const categoryIds = rawCats.split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      if (categoryIds.length > 0) {
        query += ` AND s.product_category_id = ANY($${paramIndex}::integer[])`;
        params.push(categoryIds);
        paramIndex++;
      }
    }
    if (filters.itemCategory) {
      query += ` AND s.item_category_id = $${paramIndex}`;
      params.push(filters.itemCategory);
      paramIndex++;
    }
    if (filters.subCategory) {
      query += ` AND s.sub_category_id = $${paramIndex}`;
      params.push(filters.subCategory);
      paramIndex++;
    }
    if (filters.brand) {
      query += ` AND s.brand_id = $${paramIndex}`;
      params.push(filters.brand);
      paramIndex++;
    }
    if (filters.stockStatus) {
      if (filters.stockStatus === 'critical') {
        query += ` AND s.current_stock = 0 AND s.min_stock_level > 0`;
      } else if (filters.stockStatus === 'out') {
        query += ` AND s.current_stock = 0 AND (s.min_stock_level <= 0 OR s.min_stock_level IS NULL)`;
      } else if (filters.stockStatus === 'low') {
        query += ` AND s.current_stock > 0 AND s.current_stock < s.min_stock_level`;
      } else if (filters.stockStatus === 'in') {
        query += ` AND s.current_stock > 0 AND s.current_stock >= s.min_stock_level`;
      } else if (filters.stockStatus === 'alert') {
        query += ` AND (s.current_stock < s.min_stock_level OR s.current_stock = 0)`;
      } else if (filters.stockStatus === 'non-movable') {
        query += ` AND s.is_non_movable = true`;
      }
    }
    if (filters.hsnCode) {
      query += ` AND s.hsn_sac_code ILIKE $${paramIndex}`;
      params.push(`%${filters.hsnCode}%`);
      paramIndex++;
    }


    // Add dynamic sorting
    let orderBy = 's.created_at DESC'; // default
    if (filters.sortBy) {
      const validSortFields = {
        'productCategory': 'pc.name',
        'itemCategory': 'ic.name',
        'subCategory': 'sc.name',
        'itemName': 's.item_name',
        'brand': 'b.name',
        'vendor': 'v.name',
        'currentStock': 's.current_stock',
        'skuId': 's.sku_id',
        'model': 's.model',
        'hsnSacCode': 's.hsn_sac_code'
      };

      if (validSortFields[filters.sortBy]) {
        const direction = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
        orderBy = `${validSortFields[filters.sortBy]} ${direction}`;
      }
    }

    // Add pagination (ensure valid values)
    const page = Math.max(1, parseInt(filters.page) || 1); // Ensure page >= 1
    const limit = Math.max(1, parseInt(filters.limit) || 20); // Ensure limit >= 1
    const offset = Math.max(0, (page - 1) * limit); // Ensure offset >= 0
    query += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);


    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get total count for pagination
   */
  static async getCount(filters, companyId) {
    let query = `
      SELECT COUNT(*) 
      FROM skus s
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
      WHERE s.company_id = $1 AND s.is_active = true
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    // Add same filters as getAll
    if (filters.search && filters.search.trim()) {
      const searchTrimmed = filters.search.trim();
      query += ` AND (
        s.sku_id ILIKE $${paramIndex} 
        OR s.item_name ILIKE $${paramIndex} 
        OR s.model ILIKE $${paramIndex} 
        OR s.hsn_sac_code ILIKE $${paramIndex}
        OR s.series ILIKE $${paramIndex}
        OR s.rating_size ILIKE $${paramIndex}
        OR s.item_details ILIKE $${paramIndex}
        OR s.vendor_item_code ILIKE $${paramIndex}
        OR b.name ILIKE $${paramIndex}
        OR sc.name ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTrimmed}%`);
      paramIndex++;
    }
    if (filters.productCategory) {
      // Support comma-separated list of category IDs for "All" selection
      if (typeof filters.productCategory === 'string' && filters.productCategory.includes(',')) {
        const categoryIds = filters.productCategory.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        if (categoryIds.length > 0) {
          query += ` AND s.product_category_id = ANY($${paramIndex}::integer[])`;
          params.push(categoryIds);
          paramIndex++;
        }
      } else {
        query += ` AND s.product_category_id = $${paramIndex}`;
        params.push(filters.productCategory);
        paramIndex++;
      }
    } else if (filters.productCategories) {
      // Handle multiple category IDs (comma-separated string) - alternative parameter name
      const rawCats = String(filters.productCategories);
      const categoryIds = rawCats.split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      if (categoryIds.length > 0) {
        query += ` AND s.product_category_id = ANY($${paramIndex}::integer[])`;
        params.push(categoryIds);
        paramIndex++;
      }
    }
    if (filters.itemCategory) {
      query += ` AND s.item_category_id = $${paramIndex}`;
      params.push(filters.itemCategory);
      paramIndex++;
    }
    if (filters.subCategory) {
      query += ` AND s.sub_category_id = $${paramIndex}`;
      params.push(filters.subCategory);
      paramIndex++;
    }
    if (filters.brand) {
      query += ` AND s.brand_id = $${paramIndex}`;
      params.push(filters.brand);
      paramIndex++;
    }
    if (filters.stockStatus) {
      if (filters.stockStatus === 'critical') {
        query += ` AND s.current_stock = 0 AND s.min_stock_level > 0`;
      } else if (filters.stockStatus === 'out') {
        query += ` AND s.current_stock = 0 AND (s.min_stock_level <= 0 OR s.min_stock_level IS NULL)`;
      } else if (filters.stockStatus === 'low') {
        query += ` AND s.current_stock > 0 AND s.current_stock < s.min_stock_level`;
      } else if (filters.stockStatus === 'in') {
        query += ` AND s.current_stock > 0 AND s.current_stock >= s.min_stock_level`;
      } else if (filters.stockStatus === 'alert') {
        query += ` AND (s.current_stock < s.min_stock_level OR s.current_stock = 0)`;
      } else if (filters.stockStatus === 'non-movable') {
        query += ` AND s.is_non_movable = true`;
      }
    }
    if (filters.hsnCode) {
      query += ` AND s.hsn_sac_code ILIKE $${paramIndex}`;
      params.push(`%${filters.hsnCode}%`);
      paramIndex++;
    }
    if (filters.dateFrom) {
      query += ` AND s.created_at >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }
    if (filters.dateTo) {
      query += ` AND s.created_at <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get SKU by ID (with company ID filter for security)
   * Supports both integer ID and SKU ID string
   */
  static async getById(id, companyId = null) {
    // Convert id to string to check if it's numeric
    const idStr = String(id);
    const isNumeric = /^\d+$/.test(idStr);

    // Use appropriate column based on whether ID is numeric or alphanumeric
    const whereClause = isNumeric ? 's.id = $1' : 's.sku_id = $1';
    const idValue = isNumeric ? parseInt(idStr, 10) : idStr;

    let query = `
      SELECT 
        s.*,
        s.opening_stock,
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
      WHERE ${whereClause}
    `;
    const params = [idValue];

    // Add company ID filter if provided
    if (companyId) {
      query += ` AND s.company_id = $${params.length + 1}`;
      params.push(companyId.toUpperCase());
    }

    // Add is_active filter
    query += ` AND s.is_active = true`;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
 * Create a new SKU
 */
  static async create(skuData, companyId, skuId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Parse custom_fields if it's a string
      let customFields = null;
      if (skuData.customFields) {
        try {
          customFields = typeof skuData.customFields === 'string'
            ? JSON.parse(skuData.customFields)
            : skuData.customFields;
        } catch (e) {
          console.error('Error parsing custom_fields:', e);
          customFields = null;
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
          current_stock, custom_fields, status, is_active, is_non_movable, opening_stock
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
          $28, $29, $30, $31, $32, $33, $34, $35, $36
        ) RETURNING *`,
        [
          companyId.toUpperCase(),
          skuId,
          skuData.productCategoryId,
          skuData.itemCategoryId,
          skuData.subCategoryId || null,
          skuData.itemName,
          skuData.itemDetails || null,
          skuData.vendorId || null, // Now nullable
          skuData.vendorItemCode || null,
          skuData.brandId,
          skuData.hsnSacCode || null,
          skuData.gstRate || null,
          skuData.ratingSize || null,
          skuData.model || null,
          skuData.series || null,
          skuData.unit,
          skuData.material || null,
          skuData.manufactureOrImport || null,
          skuData.color || null,
          skuData.weight || null,
          skuData.weightUnit || 'kg',
          skuData.length || null,
          skuData.lengthUnit || 'mm',
          skuData.width || null,
          skuData.widthUnit || 'mm',
          skuData.height || null,
          skuData.heightUnit || 'mm',
          skuData.minStockLevel || 0,
          skuData.reorderPoint || null,
          skuData.defaultStorageLocation || null,
          skuData.openingStock !== undefined && skuData.openingStock !== null ? skuData.openingStock : 0, // Use openingStock for current_stock initialization
          customFields ? JSON.stringify(customFields) : null,
          skuData.status || 'active',
          skuData.status === 'active',
          skuData.isNonMovable || false,
          skuData.openingStock || 0, // opening_stock value
        ]
      );

      const newSku = result.rows[0];

      // Record Opening Stock in Ledger if > 0
      if (newSku.opening_stock > 0) {
        await LedgerService.addTransaction(client, {
          skuId: newSku.id,
          transactionDate: newSku.created_at,
          transactionType: 'OPENING',
          referenceNumber: 'Opening Stock',
          sourceDestination: 'Opening Balance',
          createdBy: null,
          createdByName: 'System',
          quantityChange: newSku.opening_stock,
          companyId: companyId.toUpperCase()
        });
      }

      await client.query('COMMIT');
      return newSku;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update SKU (with company ID filter for security)
   */
  static async update(id, skuData, companyId = null) {
    // Parse custom_fields if it's a string
    let customFields = null;
    if (skuData.customFields) {
      try {
        customFields = typeof skuData.customFields === 'string'
          ? JSON.parse(skuData.customFields)
          : skuData.customFields;
      } catch (e) {
        console.error('Error parsing custom_fields:', e);
        customFields = null;
      }
    }

    let paramIndex = 35;
    let query = `
      UPDATE skus SET
        product_category_id = $1, item_category_id = $2, sub_category_id = $3,
        item_name = $4, item_details = $5, vendor_id = $6, vendor_item_code = $7, brand_id = $8,
        hsn_sac_code = $9, gst_rate = $10, rating_size = $11, model = $12, series = $13, unit = $14,
        material = $15, manufacture_or_import = $16, color = $17,
        weight = $18, weight_unit = $19, length = $20, length_unit = $21, width = $22, width_unit = $23, height = $24, height_unit = $25,
        min_stock_level = $26, reorder_point = $27, default_storage_location = $28,
        current_stock = $29, custom_fields = $30,
        status = $31, is_active = $32, is_non_movable = $33, opening_stock = $34, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
    `;

    // Add company ID filter if provided
    if (companyId) {
      paramIndex++;
      query += ` AND company_id = $${paramIndex}`;
    }

    const params = [
      skuData.productCategoryId,
      skuData.itemCategoryId,
      skuData.subCategoryId || null,
      skuData.itemName,
      skuData.itemDetails || null,
      skuData.vendorId || null, // Now nullable
      skuData.vendorItemCode || null,
      skuData.brandId,
      skuData.hsnSacCode || null,
      skuData.gstRate || null,
      skuData.ratingSize || null,
      skuData.model || null,
      skuData.series || null,
      skuData.unit,
      skuData.material || null,
      skuData.manufactureOrImport || null,
      skuData.color || null,
      skuData.weight || null,
      skuData.weightUnit || 'kg',
      skuData.length || null,
      skuData.lengthUnit || 'mm',
      skuData.width || null,
      skuData.widthUnit || 'mm',
      skuData.height || null,
      skuData.heightUnit || 'mm',
      skuData.minStockLevel || 0,
      skuData.reorderPoint || null,
      skuData.defaultStorageLocation || null,
      skuData.openingStock !== undefined && skuData.openingStock !== null ? skuData.openingStock : 0, // Use openingStock for current_stock
      customFields ? JSON.stringify(customFields) : null,
      skuData.status || 'active',
      skuData.status === 'active',
      skuData.isNonMovable !== undefined ? skuData.isNonMovable : false,
      skuData.openingStock || 0, // opening_stock value
      id,
    ];

    if (companyId) {
      query = query.replace('WHERE id = $35', `WHERE id = $35 AND company_id = $36`);
      params.push(companyId.toUpperCase());
    }

    query += ` RETURNING *`;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Soft delete SKU (with company ID filter for security)
   */
  static async delete(id, companyId = null) {
    let query = 'UPDATE skus SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    const params = [id];

    // Add company ID filter if provided
    if (companyId) {
      query += ` AND company_id = $2`;
      params.push(companyId.toUpperCase());
    }

    query += ` RETURNING id`;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Check if SKU ID exists
   */
  static async skuIdExists(skuId) {
    const result = await pool.query('SELECT id FROM skus WHERE sku_id = $1', [skuId]);
    return result.rows.length > 0;
  }

  /**
   * Generate a unique lock key for advisory lock based on itemName + model + companyId
   * Uses a simple hash to convert string combination to integer for pg_advisory_lock
   */
  static generateDuplicateLockKey(itemName, model, companyId) {
    // Normalize inputs
    const normalizedItemName = String(itemName || '').trim().toLowerCase();
    const normalizedModel = model ? String(model).trim().toUpperCase() : '';
    const normalizedCompanyId = String(companyId || '').toUpperCase();
    
    // Create a combined string
    const combined = `${normalizedCompanyId}|${normalizedItemName}|${normalizedModel}`;
    
    // Simple hash function to convert string to integer (for advisory lock)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and ensure it's within PostgreSQL's int4 range
    // PostgreSQL advisory locks use int8, but we'll use a safe range
    return Math.abs(hash) % 2147483647; // Max safe int for PostgreSQL
  }

  /**
   * Check if SKU with same itemName and model already exists
   * @param {string} itemName - Item name
   * @param {string} model - Model number (can be null, empty string, or value)
   * @param {string} companyId - Company ID
   * @param {number|string} excludeId - SKU ID to exclude from check (for updates)
   * @param {object} client - Optional database client for transaction support (prevents race conditions)
   * @returns {Promise<boolean>} - True if duplicate exists
   */
  static async itemNameModelExists(itemName, model, companyId, excludeId = null, client = null) {
    if (!itemName) {
      return false;
    }

    // Normalize model: treat null, undefined, empty string, and whitespace-only as equivalent
    let normalizedModel = '';
    if (model !== null && model !== undefined && model !== '') {
      const modelStr = String(model).trim();
      // Only set normalizedModel if it's not empty after trimming
      if (modelStr !== '') {
        normalizedModel = modelStr;
      }
    }
    
    const normalizedItemName = String(itemName).trim();
    if (!normalizedItemName) {
      return false;
    }

    // Build query - handle NULL and empty string for model
    // Use SELECT FOR UPDATE to lock rows and prevent race conditions
    let query = `
      SELECT id FROM skus 
      WHERE company_id = $1 
        AND LOWER(TRIM(item_name)) = LOWER(TRIM($2))
        AND is_active = true
    `;
    const params = [companyId.toUpperCase(), normalizedItemName];

    // Handle model comparison: treat NULL and empty string as the same
    if (normalizedModel === '') {
      // Check for NULL or empty string (COALESCE converts NULL to empty string for comparison)
      query += ` AND COALESCE(TRIM(model), '') = ''`;
    } else {
      // Check for exact match (case-insensitive, trimmed)
      query += ` AND UPPER(TRIM(COALESCE(model, ''))) = UPPER(TRIM($3))`;
      params.push(normalizedModel);
    }

    if (excludeId) {
      const excludeParamIndex = params.length + 1;
      query += ` AND id != $${excludeParamIndex}`;
      params.push(excludeId);
    }

    // Add FOR UPDATE lock to prevent concurrent inserts (only if using transaction client)
    if (client) {
      query += ` FOR UPDATE`;
    }

    // Use transaction client if provided (prevents race conditions), otherwise use pool
    const queryClient = client || pool;
    const result = await queryClient.query(query, params);
    return result.rows.length > 0;
  }
}

module.exports = SKUModel;


