const pool = require('./database');

/**
 * Warehouse Model
 * Handles all database operations for warehouses
 */
class WarehouseModel {
  /**
   * Get all warehouses for a company
   */
  static async getAll(companyId) {
    const result = await pool.query(
      'SELECT * FROM warehouses WHERE company_id = $1 ORDER BY is_default DESC, warehouse_name',
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get warehouse by ID
   */
  static async getById(id, companyId) {
    const result = await pool.query(
      'SELECT * FROM warehouses WHERE id = $1 AND company_id = $2',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new warehouse
   */
  static async create(warehouseData, companyId) {
    // If this is set as default, unset other defaults for the company
    if (warehouseData.isDefault) {
      await pool.query(
        'UPDATE warehouses SET is_default = false WHERE company_id = $1',
        [companyId.toUpperCase()]
      );
    }

    const result = await pool.query(
      `INSERT INTO warehouses (
        company_id, warehouse_name, warehouse_code, address, city, state, pincode,
        is_default, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        companyId.toUpperCase(),
        warehouseData.warehouseName,
        warehouseData.warehouseCode || null,
        warehouseData.address || null,
        warehouseData.city || null,
        warehouseData.state || null,
        warehouseData.pincode || null,
        warehouseData.isDefault || false,
        warehouseData.status || 'active',
      ]
    );
    return result.rows[0];
  }

  /**
   * Update warehouse
   */
  static async update(id, warehouseData, companyId) {
    // If this is set as default, unset other defaults for the company
    if (warehouseData.isDefault) {
      await pool.query(
        'UPDATE warehouses SET is_default = false WHERE company_id = $1 AND id != $2',
        [companyId.toUpperCase(), id]
      );
    }

    const result = await pool.query(
      `UPDATE warehouses SET
        warehouse_name = $1,
        warehouse_code = $2,
        address = $3,
        city = $4,
        state = $5,
        pincode = $6,
        is_default = $7,
        status = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND company_id = $10
      RETURNING *`,
      [
        warehouseData.warehouseName,
        warehouseData.warehouseCode || null,
        warehouseData.address || null,
        warehouseData.city || null,
        warehouseData.state || null,
        warehouseData.pincode || null,
        warehouseData.isDefault || false,
        warehouseData.status || 'active',
        id,
        companyId.toUpperCase(),
      ]
    );
    return result.rows[0];
  }

  /**
   * Delete warehouse (soft delete by setting status to inactive)
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE warehouses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 RETURNING *',
      ['inactive', id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }
}

module.exports = WarehouseModel;

