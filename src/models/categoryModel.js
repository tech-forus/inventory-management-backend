const pool = require('./database');

/**
 * Category Model
 * Handles all database operations for categories (product, item, sub)
 */
class CategoryModel {
  /**
   * Product Categories
   */
  static async getProductCategories(companyId) {
    const result = await pool.query(
      'SELECT * FROM product_categories WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );
    return result.rows;
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

  static async deleteProductCategory(id, companyId) {
    const result = await pool.query(
      'UPDATE product_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Item Categories
   */
  static async getItemCategories(companyId, productCategoryId = null) {
    let query = 'SELECT * FROM item_categories WHERE company_id = $1 AND is_active = true';
    const params = [companyId.toUpperCase()];
    
    if (productCategoryId) {
      query += ' AND product_category_id = $2';
      params.push(productCategoryId);
    }
    
    query += ' ORDER BY name';
    const result = await pool.query(query, params);
    return result.rows;
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

  static async deleteItemCategory(id, companyId) {
    const result = await pool.query(
      'UPDATE item_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
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

  static async createSubCategory(categoryData, companyId) {
    const result = await pool.query(
      `INSERT INTO sub_categories (company_id, item_category_id, name, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, item_category_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        categoryData.itemCategoryId,
        categoryData.name,
        categoryData.description || null,
        categoryData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  static async updateSubCategory(id, categoryData, companyId) {
    const result = await pool.query(
      `UPDATE sub_categories SET
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

  static async deleteSubCategory(id, companyId) {
    const result = await pool.query(
      'UPDATE sub_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }
}

module.exports = CategoryModel;


