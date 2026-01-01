const pool = require('./database');

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
    if (filters.search) {
      query += ` AND (s.sku_id ILIKE $${paramIndex} OR s.item_name ILIKE $${paramIndex} OR s.model ILIKE $${paramIndex} OR s.hsn_sac_code ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    if (filters.productCategory) {
      query += ` AND s.product_category_id = $${paramIndex}`;
      params.push(filters.productCategory);
      paramIndex++;
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
      if (filters.stockStatus === 'low') {
        query += ` AND s.current_stock <= s.min_stock_level`;
      } else if (filters.stockStatus === 'out') {
        query += ` AND s.current_stock = 0`;
      } else if (filters.stockStatus === 'in') {
        query += ` AND s.current_stock > s.min_stock_level`;
      }
    }
    if (filters.hsnCode) {
      query += ` AND s.hsn_sac_code ILIKE $${paramIndex}`;
      params.push(`%${filters.hsnCode}%`);
      paramIndex++;
    }

    // Add pagination (ensure valid values)
    const page = Math.max(1, parseInt(filters.page) || 1); // Ensure page >= 1
    const limit = Math.max(1, parseInt(filters.limit) || 20); // Ensure limit >= 1
    const offset = Math.max(0, (page - 1) * limit); // Ensure offset >= 0
    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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
      WHERE s.company_id = $1 AND s.is_active = true
    `;
    const params = [companyId.toUpperCase()];
    let paramIndex = 2;

    // Add same filters as getAll
    if (filters.search) {
      query += ` AND (s.sku_id ILIKE $${paramIndex} OR s.item_name ILIKE $${paramIndex} OR s.model ILIKE $${paramIndex} OR s.hsn_sac_code ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    if (filters.productCategory) {
      query += ` AND s.product_category_id = $${paramIndex}`;
      params.push(filters.productCategory);
      paramIndex++;
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
      if (filters.stockStatus === 'low') {
        query += ` AND s.current_stock <= s.min_stock_level`;
      } else if (filters.stockStatus === 'out') {
        query += ` AND s.current_stock = 0`;
      } else if (filters.stockStatus === 'in') {
        query += ` AND s.current_stock > s.min_stock_level`;
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
   */
  static async getById(id, companyId = null) {
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
      WHERE s.id = $1
    `;
    const params = [id];
    
    // Add company ID filter if provided
    if (companyId) {
      query += ` AND s.company_id = $2`;
      params.push(companyId.toUpperCase());
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Create a new SKU
   */
  static async create(skuData, companyId, skuId) {
    const result = await pool.query(
      `INSERT INTO skus (
        company_id, sku_id, product_category_id, item_category_id, sub_category_id,
        item_name, item_details, vendor_id, vendor_item_code, brand_id,
        hsn_sac_code, rating_size, model, series, unit,
        material, insulation, input_supply, color, cri, cct, beam_angle, led_type, shape,
        weight, length, width, height, rack_number,
        min_stock_level, reorder_point, default_storage_location,
        current_stock, status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35
      ) RETURNING *`,
      [
        companyId.toUpperCase(),
        skuId,
        skuData.productCategoryId,
        skuData.itemCategoryId,
        skuData.subCategoryId || null,
        skuData.itemName,
        skuData.itemDetails || null,
        skuData.vendorId,
        skuData.vendorItemCode || null,
        skuData.brandId,
        skuData.hsnSacCode || null,
        skuData.ratingSize || null,
        skuData.model || null,
        skuData.series || null,
        skuData.unit,
        skuData.material || null,
        skuData.insulation || null,
        skuData.inputSupply || null,
        skuData.color || null,
        skuData.cri || null,
        skuData.cct || null,
        skuData.beamAngle || null,
        skuData.ledType || null,
        skuData.shape || null,
        skuData.weight || null,
        skuData.length || null,
        skuData.width || null,
        skuData.height || null,
        skuData.rackNumber || null,
        skuData.minStockLevel,
        skuData.reorderPoint || null,
        skuData.defaultStorageLocation || null,
        skuData.currentStock !== undefined && skuData.currentStock !== null ? skuData.currentStock : (skuData.minStockLevel || 0), // Use user-entered currentStock, fallback to minStockLevel
        skuData.status || 'active',
        skuData.status === 'active',
      ]
    );
    return result.rows[0];
  }

  /**
   * Update SKU (with company ID filter for security)
   */
  static async update(id, skuData, companyId = null) {
    let query = `
      UPDATE skus SET
        product_category_id = $1, item_category_id = $2, sub_category_id = $3,
        item_name = $4, item_details = $5, vendor_id = $6, vendor_item_code = $7, brand_id = $8,
        hsn_sac_code = $9, rating_size = $10, model = $11, series = $12, unit = $13,
        material = $14, insulation = $15, input_supply = $16, color = $17, cri = $18, cct = $19,
        beam_angle = $20, led_type = $21, shape = $22,
        weight = $23, length = $24, width = $25, height = $26, rack_number = $27,
        min_stock_level = $28, reorder_point = $29, default_storage_location = $30,
        status = $31, is_active = $32, updated_at = CURRENT_TIMESTAMP
      WHERE id = $33
    `;
    
    // Add company ID filter if provided
    if (companyId) {
      query += ` AND company_id = $33`;
    }
    
    const params = [
      skuData.productCategoryId,
      skuData.itemCategoryId,
      skuData.subCategoryId || null,
      skuData.itemName,
      skuData.itemDetails || null,
      skuData.vendorId,
      skuData.vendorItemCode || null,
      skuData.brandId,
      skuData.hsnSacCode || null,
      skuData.ratingSize || null,
      skuData.model || null,
      skuData.series || null,
      skuData.unit,
      skuData.material || null,
      skuData.insulation || null,
      skuData.inputSupply || null,
      skuData.color || null,
      skuData.cri || null,
      skuData.cct || null,
      skuData.beamAngle || null,
      skuData.ledType || null,
      skuData.shape || null,
      skuData.weight || null,
      skuData.length || null,
      skuData.width || null,
      skuData.height || null,
      skuData.rackNumber || null,
      skuData.minStockLevel,
      skuData.reorderPoint || null,
      skuData.defaultStorageLocation || null,
      skuData.status || 'active',
      skuData.status === 'active',
      id,
    ];
    
    // Add company ID filter if provided
    if (companyId) {
      query = query.replace('WHERE id = $33', `WHERE id = $33 AND company_id = $34`);
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
}

module.exports = SKUModel;


