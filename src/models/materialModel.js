const pool = require('./database');

/**
 * Material Model
 * Handles all database operations for materials
 */
class MaterialModel {
  /**
   * Get all materials for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM materials WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get material by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM materials WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new material
   */
  static async create(materialData, companyId) {
    const result = await pool.query(
      `INSERT INTO materials (company_id, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        materialData.name,
        materialData.description || null,
        materialData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update material
   */
  static async update(id, materialData, companyId) {
    const result = await pool.query(
      `UPDATE materials SET
        name = $1,
        description = $2,
        is_active = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND company_id = $5
      RETURNING *`,
      [
        materialData.name,
        materialData.description || null,
        materialData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Delete material (soft delete)
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE materials SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }
}

module.exports = MaterialModel;

