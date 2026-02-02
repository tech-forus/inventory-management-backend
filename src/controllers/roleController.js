const pool = require('../models/database');
const { getCompanyId } = require('../middlewares/auth');
const { NotFoundError, ConflictError } = require('../middlewares/errorHandler');

/**
 * Get all permissions (global list)
 */
const getPermissions = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, module, action FROM permissions ORDER BY module, action'
    );
    const permissions = result.rows.map((r) => ({
      id: r.id,
      module: r.module,
      action: r.action,
      key: `${r.module}.${r.action}`,
    }));
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all roles for a company with their permissions
 */
const getRoles = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    const rolesResult = await pool.query(
      `SELECT id, name, description, is_system, created_at
       FROM roles WHERE company_id = $1 ORDER BY name`,
      [companyId]
    );

    const roles = [];
    for (const row of rolesResult.rows) {
      const permsResult = await pool.query(
        `SELECT p.module, p.action FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1`,
        [row.id]
      );
      const permissions = permsResult.rows.map((p) => `${p.module}.${p.action}`);

      const rcaResult = await pool.query(
        'SELECT product_category_ids, item_category_ids, sub_category_ids FROM role_category_access WHERE role_id = $1',
        [row.id]
      );
      const rca = rcaResult.rows[0];
      const categoryAccess = rca
        ? {
            productCategoryIds: rca.product_category_ids || [],
            itemCategoryIds: rca.item_category_ids || [],
            subCategoryIds: rca.sub_category_ids || [],
          }
        : null;

      roles.push({
        id: row.id,
        name: row.name,
        description: row.description,
        isSystem: row.is_system,
        permissions,
        categoryAccess,
        createdAt: row.created_at,
      });
    }

    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new role
 * Body: { name, description?, permissions: string[], categoryAccess?: { productCategoryIds, itemCategoryIds, subCategoryIds } }
 */
const createRole = async (req, res, next) => {
  try {
    const { name, description, permissions, categoryAccess } = req.body;
    const companyId = getCompanyId(req);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }

    const check = await pool.query(
      'SELECT id FROM roles WHERE company_id = $1 AND name = $2',
      [companyId, name.trim()]
    );
    if (check.rows.length > 0) {
      throw new ConflictError('Role with this name already exists');
    }

    const roleResult = await pool.query(
      `INSERT INTO roles (company_id, name, description, is_system)
       VALUES ($1, $2, $3, false)
       RETURNING id, name, description, created_at`,
      [companyId, name.trim(), description || null]
    );
    const role = roleResult.rows[0];

    const permArray = Array.isArray(permissions) ? permissions : [];
    for (const perm of permArray) {
      const [module, action] = String(perm).split('.');
      if (!module || !action) continue;
      const pResult = await pool.query(
        'SELECT id FROM permissions WHERE module = $1 AND action = $2',
        [module, action]
      );
      if (pResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [role.id, pResult.rows[0].id]
        );
      }
    }

    const permsResult = await pool.query(
      `SELECT p.module, p.action FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [role.id]
    );
    const rolePermissions = permsResult.rows.map((p) => `${p.module}.${p.action}`);

    if (categoryAccess && typeof categoryAccess === 'object') {
      const pcIds = Array.isArray(categoryAccess.productCategoryIds) ? categoryAccess.productCategoryIds : [];
      const icIds = Array.isArray(categoryAccess.itemCategoryIds) ? categoryAccess.itemCategoryIds : [];
      const scIds = Array.isArray(categoryAccess.subCategoryIds) ? categoryAccess.subCategoryIds : [];
      await pool.query(
        `INSERT INTO role_category_access (role_id, product_category_ids, item_category_ids, sub_category_ids, "view", "create", edit, "delete")
         VALUES ($1, $2, $3, $4, true, false, false, false)`,
        [role.id, pcIds, icIds, scIds]
      );
    }

    const rcaResult = await pool.query(
      'SELECT product_category_ids, item_category_ids, sub_category_ids FROM role_category_access WHERE role_id = $1',
      [role.id]
    );
    const rca = rcaResult.rows[0];
    const catAccess = rca
      ? {
          productCategoryIds: rca.product_category_ids || [],
          itemCategoryIds: rca.item_category_ids || [],
          subCategoryIds: rca.sub_category_ids || [],
        }
      : null;

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: rolePermissions,
        categoryAccess: catAccess,
        createdAt: role.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a role
 */
const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, categoryAccess } = req.body;
    const companyId = getCompanyId(req);

    const roleCheck = await pool.query(
      'SELECT id FROM roles WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    if (roleCheck.rows.length === 0) {
      throw new NotFoundError('Role not found');
    }

    const updates = [];
    const params = [];
    let idx = 1;
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(description || null);
    }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id, companyId);
      await pool.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`,
        params
      );
    }

    if (Array.isArray(permissions)) {
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      for (const perm of permissions) {
        const [module, action] = String(perm).split('.');
        if (!module || !action) continue;
        const pResult = await pool.query(
          'SELECT id FROM permissions WHERE module = $1 AND action = $2',
          [module, action]
        );
        if (pResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [id, pResult.rows[0].id]
          );
        }
      }
    }

    if (categoryAccess !== undefined) {
      if (categoryAccess && typeof categoryAccess === 'object') {
        const pcIds = Array.isArray(categoryAccess.productCategoryIds) ? categoryAccess.productCategoryIds : [];
        const icIds = Array.isArray(categoryAccess.itemCategoryIds) ? categoryAccess.itemCategoryIds : [];
        const scIds = Array.isArray(categoryAccess.subCategoryIds) ? categoryAccess.subCategoryIds : [];
        await pool.query(
          `INSERT INTO role_category_access (role_id, product_category_ids, item_category_ids, sub_category_ids, "view", "create", edit, "delete")
           VALUES ($1, $2, $3, $4, true, false, false, false)
           ON CONFLICT (role_id) DO UPDATE SET
             product_category_ids = EXCLUDED.product_category_ids,
             item_category_ids = EXCLUDED.item_category_ids,
             sub_category_ids = EXCLUDED.sub_category_ids`,
          [id, pcIds, icIds, scIds]
        );
      } else {
        await pool.query('DELETE FROM role_category_access WHERE role_id = $1', [id]);
      }
    }

    const roleResult = await pool.query(
      'SELECT id, name, description, updated_at FROM roles WHERE id = $1',
      [id]
    );
    const permsResult = await pool.query(
      `SELECT p.module, p.action FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [id]
    );
    const rcaResult = await pool.query(
      'SELECT product_category_ids, item_category_ids, sub_category_ids FROM role_category_access WHERE role_id = $1',
      [id]
    );
    const rca = rcaResult.rows[0];
    const catAccess = rca
      ? {
          productCategoryIds: rca.product_category_ids || [],
          itemCategoryIds: rca.item_category_ids || [],
          subCategoryIds: rca.sub_category_ids || [],
        }
      : null;

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        id: parseInt(id),
        name: roleResult.rows[0].name,
        description: roleResult.rows[0].description,
        permissions: permsResult.rows.map((p) => `${p.module}.${p.action}`),
        categoryAccess: catAccess,
        updatedAt: roleResult.rows[0].updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a role
 */
const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    const roleCheck = await pool.query(
      'SELECT id, is_system FROM roles WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    if (roleCheck.rows.length === 0) {
      throw new NotFoundError('Role not found');
    }
    if (roleCheck.rows[0].is_system) {
      return res.status(400).json({
        success: false,
        error: 'System roles cannot be deleted',
      });
    }

    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    await pool.query('DELETE FROM user_roles WHERE role_id = $1', [id]);
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPermissions,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
