const pool = require('./database');

/**
 * Colour Model
 * Handles all database operations for colours
 */
class ColourModel {
  /**
   * Get all colours for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM colours WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get colour by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM colours WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new colour
   */
  static async create(colourData, companyId) {
    const result = await pool.query(
      `INSERT INTO colours (company_id, name, hex_code, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, name) DO UPDATE
       SET hex_code = EXCLUDED.hex_code,
           description = EXCLUDED.description,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        colourData.name,
        colourData.hexCode || null,
        colourData.description || null,
        colourData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update colour
   */
  static async update(id, colourData, companyId) {
    const result = await pool.query(
      `UPDATE colours SET
        name = $1,
        hex_code = $2,
        description = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND company_id = $6
      RETURNING *`,
      [
        colourData.name,
        colourData.hexCode || null,
        colourData.description || null,
        colourData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Delete colour (soft delete)
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE colours SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }
}

module.exports = ColourModel;

