const pool = require('./database');

/**
 * Brand Model
 * Handles all database operations for brands
 */
class BrandModel {
  /**
   * Get all brands for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM brands WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get brand by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM brands WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new brand
   */
  static async create(brandData, companyId) {
    const result = await pool.query(
      `INSERT INTO brands (company_id, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        brandData.name,
        brandData.description || null,
        brandData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update brand
   */
  static async update(id, brandData, companyId) {
    const result = await pool.query(
      `UPDATE brands SET
        name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND company_id = $5
      RETURNING *`,
      [
        brandData.name,
        brandData.description || null,
        brandData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Soft delete brand
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE brands SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Bulk create brands
   */
  static async bulkCreate(brands, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const brand of brands) {
        const result = await client.query(
          `INSERT INTO brands (company_id, name, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (company_id, name) DO UPDATE
           SET description = EXCLUDED.description,
               updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            companyId.toUpperCase(),
            brand.name,
            brand.description || null,
          ]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BrandModel;


