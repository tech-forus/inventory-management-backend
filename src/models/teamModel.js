const pool = require('./database');

/**
 * Team Model
 * Handles all database operations for teams
 */
class TeamModel {
  /**
   * Get all teams for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM teams WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get team by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM teams WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new team member
   */
  static async create(teamData, companyId) {
    const result = await pool.query(
      `INSERT INTO teams (company_id, name, contact_number, email_id, department, designation, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (company_id, email_id) DO UPDATE
       SET name = EXCLUDED.name,
           contact_number = EXCLUDED.contact_number,
           department = EXCLUDED.department,
           designation = EXCLUDED.designation,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        companyId.toUpperCase(),
        teamData.name,
        teamData.contactNumber,
        teamData.emailId,
        teamData.department,
        teamData.designation,
        teamData.isActive !== false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update team member
   */
  static async update(id, teamData, companyId) {
    const result = await pool.query(
      `UPDATE teams 
       SET name = $1, 
           contact_number = $2, 
           email_id = $3, 
           department = $4, 
           designation = $5, 
           is_active = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND company_id = $8 
       RETURNING *`,
      [
        teamData.name,
        teamData.contactNumber,
        teamData.emailId,
        teamData.department,
        teamData.designation,
        teamData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Soft delete team member
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE teams SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }
}

module.exports = TeamModel;


