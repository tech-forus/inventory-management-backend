const pool = require('./database');

/**
 * Category Model
 * Handles all database operations for categories (product, item, sub)
 */
class CategoryModel {
  /**
   * Product Categories
   * Only return product categories that have at least one item category with at least one sub category (complete hierarchy)
   */
  static async getProductCategories(companyId) {
    const result = await pool.query(
      `SELECT DISTINCT pc.* 
       FROM product_categories pc
       INNER JOIN item_categories ic ON pc.id = ic.product_category_id AND ic.is_active = true
       INNER JOIN sub_categories sc ON ic.id = sc.item_category_id AND sc.is_active = true
       WHERE pc.company_id = $1 AND pc.is_active = true 
       ORDER BY pc.name`,
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  static async getProductCategoryById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM product_categories WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  static async createProductCategory(categoryData, companyId) {
    const result = await pool.query(
      `INSERT INTO product_categories (company_id, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        categoryData.name,
        categoryData.description || null,
        categoryData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  static async updateProductCategory(id, categoryData, companyId) {
    const result = await pool.query(
      `UPDATE product_categories SET
        name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND company_id = $5
      RETURNING *`,
      [
        categoryData.name,
        categoryData.description || null,
        categoryData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  static async deleteProductCategory(id, companyId, hardDelete = false) {
    if (hardDelete) {
      // Hard delete - completely remove from database
      const result = await pool.query(
        'DELETE FROM product_categories WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );
      return result.rows[0];
    } else {
      // Soft delete - set is_active = false
      const result = await pool.query(
        'UPDATE product_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );
      return result.rows[0];
    }
  }

  /**
   * Item Categories
   * Only return item categories that have at least one sub category (complete hierarchy)
   */
  static async getItemCategories(companyId, productCategoryId = null) {
    let query = `SELECT DISTINCT ic.* 
                 FROM item_categories ic
                 INNER JOIN sub_categories sc ON ic.id = sc.item_category_id AND sc.is_active = true
                 WHERE ic.company_id = $1 AND ic.is_active = true`;
    const params = [companyId.toUpperCase()];

    if (productCategoryId) {
      query += ' AND ic.product_category_id = $2';
      params.push(productCategoryId);
    }

    query += ' ORDER BY ic.name';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getItemCategoryById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM item_categories WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  static async createItemCategory(categoryData, companyId) {
    const result = await pool.query(
      `INSERT INTO item_categories (company_id, product_category_id, name, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, product_category_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        categoryData.productCategoryId,
        categoryData.name,
        categoryData.description || null,
        categoryData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  static async updateItemCategory(id, categoryData, companyId) {
    const result = await pool.query(
      `UPDATE item_categories SET
        name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND company_id = $5
      RETURNING *`,
      [
        categoryData.name,
        categoryData.description || null,
        categoryData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  static async deleteItemCategory(id, companyId, hardDelete = false) {
    if (hardDelete) {
      // Hard delete - completely remove from database
      const result = await pool.query(
        'DELETE FROM item_categories WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );
      return result.rows[0];
    } else {
      // Soft delete - set is_active = false
      const result = await pool.query(
        'UPDATE item_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );
      return result.rows[0];
    }
  }

  /**
   * Sub Categories
   */
  static async getSubCategories(companyId, itemCategoryId = null) {
    let query = 'SELECT * FROM sub_categories WHERE company_id = $1 AND is_active = true';
    const params = [companyId.toUpperCase()];

    if (itemCategoryId) {
      query += ' AND item_category_id = $2';
      params.push(itemCategoryId);
    }

    query += ' ORDER BY name';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getSubCategoryById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM sub_categories WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  static async createSubCategory(categoryData, companyId) {
    const result = await pool.query(
      `INSERT INTO sub_categories (company_id, item_category_id, name, description, hsn_code, gst_rate, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (company_id, item_category_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           hsn_code = EXCLUDED.hsn_code,
           gst_rate = EXCLUDED.gst_rate,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        categoryData.itemCategoryId,
        categoryData.name,
        categoryData.description || null,
        categoryData.hsnCode || null,
        categoryData.gstRate !== undefined && categoryData.gstRate !== null ? categoryData.gstRate : null,
        categoryData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  static async updateSubCategory(id, categoryData, companyId) {
    const result = await pool.query(
      `UPDATE sub_categories SET
        name = $1, description = $2, hsn_code = $3, gst_rate = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND company_id = $7
      RETURNING *`,
      [
        categoryData.name,
        categoryData.description || null,
        categoryData.hsnCode || null,
        categoryData.gstRate !== undefined && categoryData.gstRate !== null ? categoryData.gstRate : null,
        categoryData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  static async deleteSubCategory(id, companyId, hardDelete = false) {
    if (hardDelete) {
      // Hard delete - completely remove from database
      const result = await pool.query(
        'DELETE FROM sub_categories WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );
      return result.rows[0];
    } else {
      // Soft delete - set is_active = false
      const result = await pool.query(
        'UPDATE sub_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId.toUpperCase()]
      );
      return result.rows[0];
    }
  }

  /**
   * Sub Category Defaults
   * Methods for managing default SKU field values per sub-category
   */
  static async getSubCategoryDefaults(subCategoryId, companyId) {
    const result = await pool.query(
      `SELECT * FROM sub_category_defaults 
       WHERE sub_category_id = $1 AND company_id = $2 AND is_active = true 
       ORDER BY name`,
      [subCategoryId, companyId.toUpperCase()]
    );
    return result.rows;
  }

  static async getAllSubCategoryDefaults(companyId) {
    const result = await pool.query(
      `SELECT * FROM sub_category_defaults 
       WHERE company_id = $1 AND is_active = true 
       ORDER BY sub_category_id, name`,
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  static async getSubCategoryDefaultById(defaultId, companyId) {
    const result = await pool.query(
      `SELECT * FROM sub_category_defaults 
       WHERE id = $1 AND company_id = $2 AND is_active = true`,
      [defaultId, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  static async createSubCategoryDefault(subCategoryId, defaultData, companyId) {
    const result = await pool.query(
      `INSERT INTO sub_category_defaults (
        sub_category_id, company_id, name,
        hsn_code, gst_rate,
        default_vendor_id, default_brand_id,
        default_unit, default_material, default_color, default_series, 
        default_rating_size, default_manufacture_or_import,
        default_weight, default_weight_unit,
        default_length, default_length_unit,
        default_width, default_width_unit,
        default_height, default_height_unit,
        default_warehouse_id, default_min_stock_level,
        default_item_details, default_custom_fields,
        is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      ON CONFLICT (company_id, sub_category_id, name) DO UPDATE
      SET 
        hsn_code = EXCLUDED.hsn_code,
        gst_rate = EXCLUDED.gst_rate,
        default_vendor_id = EXCLUDED.default_vendor_id,
        default_brand_id = EXCLUDED.default_brand_id,
        default_unit = EXCLUDED.default_unit,
        default_material = EXCLUDED.default_material,
        default_color = EXCLUDED.default_color,
        default_series = EXCLUDED.default_series,
        default_rating_size = EXCLUDED.default_rating_size,
        default_manufacture_or_import = EXCLUDED.default_manufacture_or_import,
        default_weight = EXCLUDED.default_weight,
        default_weight_unit = EXCLUDED.default_weight_unit,
        default_length = EXCLUDED.default_length,
        default_length_unit = EXCLUDED.default_length_unit,
        default_width = EXCLUDED.default_width,
        default_width_unit = EXCLUDED.default_width_unit,
        default_height = EXCLUDED.default_height,
        default_height_unit = EXCLUDED.default_height_unit,
        default_warehouse_id = EXCLUDED.default_warehouse_id,
        default_min_stock_level = EXCLUDED.default_min_stock_level,
        default_item_details = EXCLUDED.default_item_details,
        default_custom_fields = EXCLUDED.default_custom_fields,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        subCategoryId,
        companyId.toUpperCase(),
        defaultData.name,
        defaultData.hsnCode || null,
        defaultData.gstRate !== undefined && defaultData.gstRate !== null ? defaultData.gstRate : null,
        defaultData.defaultVendorId || null,
        defaultData.defaultBrandId || null,
        defaultData.defaultUnit || null,
        defaultData.defaultMaterial || null,
        defaultData.defaultColor || null,
        defaultData.defaultSeries || null,
        defaultData.defaultRatingSize || null,
        defaultData.defaultManufactureOrImport || null,
        defaultData.defaultWeight || null,
        defaultData.defaultWeightUnit || null,
        defaultData.defaultLength || null,
        defaultData.defaultLengthUnit || null,
        defaultData.defaultWidth || null,
        defaultData.defaultWidthUnit || null,
        defaultData.defaultHeight || null,
        defaultData.defaultHeightUnit || null,
        defaultData.defaultWarehouseId || null,
        defaultData.defaultMinStockLevel || null,
        defaultData.defaultItemDetails || null,
        defaultData.defaultCustomFields ? JSON.stringify(defaultData.defaultCustomFields) : null,
        defaultData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  static async updateSubCategoryDefault(defaultId, defaultData, companyId) {
    const result = await pool.query(
      `UPDATE sub_category_defaults SET
        name = $1,
        hsn_code = $2,
        gst_rate = $3,
        default_vendor_id = $4,
        default_brand_id = $5,
        default_unit = $6,
        default_material = $7,
        default_color = $8,
        default_series = $9,
        default_rating_size = $10,
        default_manufacture_or_import = $11,
        default_weight = $12,
        default_weight_unit = $13,
        default_length = $14,
        default_length_unit = $15,
        default_width = $16,
        default_width_unit = $17,
        default_height = $18,
        default_height_unit = $19,
        default_warehouse_id = $20,
        default_min_stock_level = $21,
        default_item_details = $22,
        default_custom_fields = $23,
        is_active = $24,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $25 AND company_id = $26
      RETURNING *`,
      [
        defaultData.name,
        defaultData.hsnCode || null,
        defaultData.gstRate !== undefined && defaultData.gstRate !== null ? defaultData.gstRate : null,
        defaultData.defaultVendorId || null,
        defaultData.defaultBrandId || null,
        defaultData.defaultUnit || null,
        defaultData.defaultMaterial || null,
        defaultData.defaultColor || null,
        defaultData.defaultSeries || null,
        defaultData.defaultRatingSize || null,
        defaultData.defaultManufactureOrImport || null,
        defaultData.defaultWeight || null,
        defaultData.defaultWeightUnit || null,
        defaultData.defaultLength || null,
        defaultData.defaultLengthUnit || null,
        defaultData.defaultWidth || null,
        defaultData.defaultWidthUnit || null,
        defaultData.defaultHeight || null,
        defaultData.defaultHeightUnit || null,
        defaultData.defaultWarehouseId || null,
        defaultData.defaultMinStockLevel || null,
        defaultData.defaultItemDetails || null,
        defaultData.defaultCustomFields ? JSON.stringify(defaultData.defaultCustomFields) : null,
        defaultData.isActive !== false,
        defaultId,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  static async deleteSubCategoryDefault(defaultId, companyId, hardDelete = false) {
    if (hardDelete) {
      const result = await pool.query(
        'DELETE FROM sub_category_defaults WHERE id = $1 AND company_id = $2 RETURNING id',
        [defaultId, companyId.toUpperCase()]
      );
      return result.rows[0];
    } else {
      const result = await pool.query(
        'UPDATE sub_category_defaults SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
        [defaultId, companyId.toUpperCase()]
      );
      return result.rows[0];
    }
  }
}

module.exports = CategoryModel;


