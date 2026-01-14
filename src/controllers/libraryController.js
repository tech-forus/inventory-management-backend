const VendorModel = require('../models/vendorModel');
const BrandModel = require('../models/brandModel');
const CategoryModel = require('../models/categoryModel');
const TeamModel = require('../models/teamModel');
const CustomerModel = require('../models/customerModel');
const TransportorModel = require('../models/transportorModel');
const WarehouseModel = require('../models/warehouseModel');
const MaterialModel = require('../models/materialModel');
const ColourModel = require('../models/colourModel');
const { getCompanyId } = require('../middlewares/auth');
const { parseExcelFile, parseExcelFileAllSheets } = require('../utils/helpers');
const { transformVendor, transformBrand, transformCategory, transformTeam, transformCustomer, transformTransportor, transformWarehouse, transformMaterial, transformColour, transformArray } = require('../utils/transformers');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../middlewares/errorHandler');
const xlsx = require('xlsx');

/**
 * Library Controller
 * Handles all library-related operations (vendors, brands, categories, teams)
 */

/**
 * Helper function to get categoryAccess from user (JWT or database)
 * @param {Object} user - User object from req.user
 * @param {String} companyId - Company ID
 * @returns {Promise<Array>} categoryAccess array
 */
const getUserCategoryAccess = async (user, companyId) => {
  // If categoryAccess is already in user object (from JWT), use it
  // Check if it exists as a property (even if empty array - that's valid data)
  if (user.hasOwnProperty('categoryAccess') && Array.isArray(user.categoryAccess)) {
    return user.categoryAccess;
  }
  
  // Otherwise, fetch from database (for old JWT tokens that don't have categoryAccess)
  try {
    const pool = require('../models/database');
    const userId = user.id || user.userId;
    const role = user.role;
    
    if (!userId || !role) {
      return [];
    }
    
    const table = role === 'admin' || role === 'super_admin' ? 'admins' : 'users_data';
    const result = await pool.query(
      `SELECT category_access FROM ${table} WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (result.rows.length > 0 && result.rows[0].category_access) {
      const categoryAccess = result.rows[0].category_access;
      // Parse if it's a string
      return typeof categoryAccess === 'string' ? JSON.parse(categoryAccess) : categoryAccess;
    }
    
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Helper function to filter categories based on user access
 * @param {Array} categories - Array of category objects
 * @param {Object} user - User object with role and categoryAccess
 * @param {String} categoryType - 'productCategoryIds', 'itemCategoryIds', or 'subCategoryIds'
 * @param {String} companyId - Company ID (for database fallback)
 * @returns {Promise<Array>} Filtered categories
 */
const filterCategoriesByUserAccess = async (categories, user, categoryType, companyId) => {
  const userRole = user.role;
  let categoryAccess = user.categoryAccess || [];
  
  // If categoryAccess is empty or not in JWT, fetch from database
  if (!categoryAccess || categoryAccess.length === 0) {
    categoryAccess = await getUserCategoryAccess(user, companyId);
  }
  
  // Admin and super_admin get all categories
  if (userRole === 'admin' || userRole === 'super_admin') {
    return categories;
  }
  
  // For sales/user roles, filter by categoryAccess
  if (userRole === 'sales' || userRole === 'user') {
    if (!categoryAccess || categoryAccess.length === 0) {
      // No access granted - return empty array
      return [];
    }
    
    // Collect all allowed category IDs from all access entries
    const allowedIds = new Set();
    categoryAccess.forEach(access => {
      if (access[categoryType] && Array.isArray(access[categoryType])) {
        access[categoryType].forEach(id => {
          // Convert to string for consistent comparison
          allowedIds.add(String(id));
        });
      }
    });
    
    if (allowedIds.size === 0) {
      // No allowed IDs found - return empty array
      return [];
    }
    
    // Filter categories to only include those with IDs in allowedIds
    const filtered = categories.filter(cat => {
      const catId = String(cat.id);
      return allowedIds.has(catId);
    });
    
    return filtered;
  }
  
  // Unknown role - return empty array for safety
  return [];
};

/**
 * Helper function to check if user has access to a specific category
 * @param {String|Number} categoryId - Category ID to check
 * @param {Object} user - User object with role and categoryAccess
 * @param {String} categoryType - 'productCategoryIds', 'itemCategoryIds', or 'subCategoryIds'
 * @param {String} companyId - Company ID (for database fallback)
 * @returns {Promise<Boolean>} True if user has access
 */
const hasCategoryAccess = async (categoryId, user, categoryType, companyId) => {
  const userRole = user.role;
  let categoryAccess = user.categoryAccess || [];
  
  // If categoryAccess is empty or not in JWT, fetch from database
  if (!categoryAccess || categoryAccess.length === 0) {
    categoryAccess = await getUserCategoryAccess(user, companyId);
  }
  
  // Admin and super_admin have access to all
  if (userRole === 'admin' || userRole === 'super_admin') {
    return true;
  }
  
  // For sales/user roles, check categoryAccess
  if (userRole === 'sales' || userRole === 'user') {
    if (!categoryAccess || categoryAccess.length === 0) {
      return false;
    }
    
    const categoryIdStr = String(categoryId);
    return categoryAccess.some(access => {
      if (access[categoryType] && Array.isArray(access[categoryType])) {
        return access[categoryType].some(id => String(id) === categoryIdStr);
      }
      return false;
    });
  }
  
  // Unknown role - no access
  return false;
};

// ==================== VENDORS ====================

const getVendors = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const vendors = await VendorModel.getAll(companyId);
    const transformedData = transformArray(vendors, transformVendor);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error); // Pass error to error handler
  }
};

const createVendor = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const vendor = await VendorModel.create(req.body, companyId, client);
    await client.query('COMMIT');
    res.json({ success: true, data: transformVendor(vendor) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error); // Pass error to error handler
  } finally {
    client.release();
  }
};

const uploadVendors = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    // Helper function to get value from row by matching header (case-insensitive, handles spaces)
    const getValue = (row, ...possibleKeys) => {
      for (const key of possibleKeys) {
        // Try exact match
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
        // Try case-insensitive match (normalize spaces and case)
        for (const rowKey in row) {
          const normalizedRowKey = rowKey.replace(/\s+/g, ' ').trim().toLowerCase();
          const normalizedKey = key.replace(/_/g, ' ').trim().toLowerCase();
          if (normalizedRowKey === normalizedKey) {
            if (row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey] !== '') {
              return row[rowKey];
            }
          }
        }
      }
      return null;
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const name = getValue(row, 'name', 'Name');
        if (!name || !String(name).trim()) {
          errors.push({ row: i + 2, error: 'Name is required' });
          continue;
        }

        const vendor = await VendorModel.create({
          name: String(name).trim(),
          contactPerson: getValue(row, 'contact_person', 'contactPerson', 'Contact Person') || null,
          department: getValue(row, 'department', 'Department') || null,
          designation: getValue(row, 'designation', 'Designation') || null,
          email: getValue(row, 'email', 'Email') || null,
          phone: getValue(row, 'phone', 'Phone') || null,
          gstNumber: getValue(row, 'gst_number', 'gstNumber', 'GST Number') || null,
          address: getValue(row, 'address', 'Address') || null,
          city: getValue(row, 'city', 'City') || null,
          state: getValue(row, 'state', 'State') || null,
          pin: getValue(row, 'pin', 'PIN', 'Pin') || null,
          isActive: true, // Always true for Excel uploads
        }, companyId);
        inserted.push({ id: vendor.id, name: vendor.name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} vendors successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateVendor = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const vendor = await VendorModel.update(req.params.id, req.body, companyId, client);
    
    if (!vendor) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Vendor not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformVendor(vendor) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await VendorModel.delete(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Vendor not found');
    }
    
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== BRANDS ====================

const getBrands = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const brands = await BrandModel.getAll(companyId);
    const transformedData = transformArray(brands, transformBrand);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createBrand = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const brand = await BrandModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformBrand(brand) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const uploadBrands = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const rawData = parseExcelFile(req.file.buffer);
    
    // Filter out empty rows (rows with no name)
    const data = rawData.filter(row => {
      const name = row.name || row.Name || '';
      return name && name.toString().trim();
    });

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Handle different column name formats (case-insensitive)
        const name = row.name || row.Name || '';
        if (!name || !name.toString().trim()) {
          errors.push({ row: i + 2, error: 'Name is required' });
          continue;
        }

        // Handle description with different column name formats
        const description = row.description || row.Description || '';
        
        // Always set isActive to true for Excel uploads
        const brand = await BrandModel.create({
          name: name.toString().trim(),
          description: description ? description.toString().trim() : null,
          isActive: true,
        }, companyId);
        inserted.push({ id: brand.id, name: brand.name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} brands successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateBrand = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const brand = await BrandModel.update(req.params.id, req.body, companyId);
    
    if (!brand) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Brand not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformBrand(brand) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await BrandModel.delete(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Brand not found');
    }
    
    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== PRODUCT CATEGORIES ====================

const getProductCategories = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};

    // If ID is provided, get single category
    if (req.params.id) {
      const category = await CategoryModel.getProductCategoryById(req.params.id, companyId);
      if (!category) {
        throw new NotFoundError('Product category not found');
      }
      
      // Check if user has access to this specific category
      const hasAccess = await hasCategoryAccess(req.params.id, user, 'productCategoryIds', companyId);
      if (!hasAccess) {
        throw new UnauthorizedError('You do not have access to this product category');
      }
      
      const transformedData = transformCategory(category);
      return res.json({ success: true, data: transformedData });
    }

    // Otherwise get all categories
    const categories = await CategoryModel.getProductCategories(companyId);
    const transformedData = transformArray(categories, transformCategory);
    
    // Filter categories based on user access
    const filteredData = await filterCategoriesByUserAccess(transformedData, user, 'productCategoryIds', companyId);
    
    res.json({ success: true, data: filteredData });
  } catch (error) {
    next(error);
  }
};

const createProductCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    await client.query('BEGIN');
    const category = await CategoryModel.createProductCategory(req.body, companyId);
    await client.query('COMMIT');
    const transformedData = transformCategory(category);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateProductCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    await client.query('BEGIN');
    const category = await CategoryModel.updateProductCategory(req.params.id, req.body, companyId);
    
    if (!category) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Product category not found');
    }

    await client.query('COMMIT');
    const transformedData = transformCategory(category);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteProductCategory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    const hardDelete = req.query.force === 'true' || req.query.force === true;
    const result = await CategoryModel.deleteProductCategory(req.params.id, companyId, hardDelete);
    
    if (!result) {
      throw new NotFoundError('Product category not found');
    }
    
    const message = hardDelete 
      ? 'Product category permanently deleted from database' 
      : 'Product category deleted successfully';
    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// ==================== ITEM CATEGORIES ====================

const getItemCategories = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    // If ID is provided, get single category
    if (req.params.id) {
      const category = await CategoryModel.getItemCategoryById(req.params.id, companyId);
      if (!category) {
        throw new NotFoundError('Item category not found');
      }
      
      // Check if user has access to this specific category
      const hasAccess = await hasCategoryAccess(req.params.id, user, 'itemCategoryIds', companyId);
      if (!hasAccess) {

        throw new UnauthorizedError('You do not have access to this item category');
      }
      
      const transformedData = transformCategory(category);
      return res.json({ success: true, data: transformedData });
    }

    // Otherwise get all categories (with optional productCategoryId filter)
    const productCategoryId = req.query.productCategoryId || null;
    const categories = await CategoryModel.getItemCategories(companyId, productCategoryId);
    const transformedData = transformArray(categories, transformCategory);
    
    // Filter categories based on user access
    const filteredData = await filterCategoriesByUserAccess(transformedData, user, 'itemCategoryIds', companyId);
    if (user.role === 'admin' || user.role === 'super_admin') {

    } else {


    }
    
    res.json({ success: true, data: filteredData });
  } catch (error) {
    next(error);
  }
};

const createItemCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    await client.query('BEGIN');
    const category = await CategoryModel.createItemCategory(req.body, companyId);
    await client.query('COMMIT');
    const transformedData = transformCategory(category);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateItemCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    await client.query('BEGIN');
    const category = await CategoryModel.updateItemCategory(req.params.id, req.body, companyId);
    
    if (!category) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Item category not found');
    }

    await client.query('COMMIT');
    const transformedData = transformCategory(category);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteItemCategory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    const hardDelete = req.query.force === 'true' || req.query.force === true;
    const result = await CategoryModel.deleteItemCategory(req.params.id, companyId, hardDelete);
    
    if (!result) {
      throw new NotFoundError('Item category not found');
    }
    
    const message = hardDelete 
      ? 'Item category permanently deleted from database' 
      : 'Item category deleted successfully';
    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// ==================== SUB CATEGORIES ====================

const getSubCategories = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    // If ID is provided, get single category
    if (req.params.id) {
      const category = await CategoryModel.getSubCategoryById(req.params.id, companyId);
      if (!category) {
        throw new NotFoundError('Sub category not found');
      }
      
      // Check if user has access to this specific category
      const hasAccess = await hasCategoryAccess(req.params.id, user, 'subCategoryIds', companyId);
      if (!hasAccess) {

        throw new UnauthorizedError('You do not have access to this sub category');
      }
      
      const transformedData = transformCategory(category);
      return res.json({ success: true, data: transformedData });
    }

    // Otherwise get all categories (with optional itemCategoryId filter)
    const itemCategoryId = req.query.itemCategoryId || null;
    const categories = await CategoryModel.getSubCategories(companyId, itemCategoryId);
    const transformedData = transformArray(categories, transformCategory);
    
    // Filter categories based on user access
    const filteredData = await filterCategoriesByUserAccess(transformedData, user, 'subCategoryIds', companyId);
    if (user.role === 'admin' || user.role === 'super_admin') {

    } else {


    }
    
    res.json({ success: true, data: filteredData });
  } catch (error) {
    next(error);
  }
};

const createSubCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    await client.query('BEGIN');
    const category = await CategoryModel.createSubCategory(req.body, companyId);
    await client.query('COMMIT');
    const transformedData = transformCategory(category);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateSubCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    await client.query('BEGIN');
    const category = await CategoryModel.updateSubCategory(req.params.id, req.body, companyId);
    
    if (!category) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Sub category not found');
    }

    await client.query('COMMIT');
    const transformedData = transformCategory(category);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteSubCategory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const user = req.user || {};
    const hardDelete = req.query.force === 'true' || req.query.force === true;
    const result = await CategoryModel.deleteSubCategory(req.params.id, companyId, hardDelete);
    
    if (!result) {
      throw new NotFoundError('Sub category not found');
    }
    
    const message = hardDelete 
      ? 'Sub category permanently deleted from database' 
      : 'Sub category deleted successfully';
    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// ==================== YOUR VENDORS (Alias for vendors) ====================

const getYourVendors = getVendors;
const createYourVendor = createVendor;
const updateYourVendor = updateVendor;
const deleteYourVendor = deleteVendor;

// ==================== YOUR BRANDS (Alias for brands) ====================

const getYourBrands = getBrands;
const createYourBrand = createBrand;
const updateYourBrand = updateBrand;
const deleteYourBrand = deleteBrand;

// ==================== TEAMS ====================

const getTeams = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const teams = await TeamModel.getAll(companyId);
    const transformedData = transformArray(teams, transformTeam);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const team = await TeamModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformTeam(team) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ==================== CUSTOMERS ====================

const getCustomers = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const customers = await CustomerModel.getAll(companyId);
    const transformedData = transformArray(customers, transformCustomer);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const customer = await CustomerModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformCustomer(customer) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateCustomer = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const { id } = req.params;
    
    const existingCustomer = await CustomerModel.getById(id, companyId);
    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }
    
    const customer = await CustomerModel.update(id, req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformCustomer(customer) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteCustomer = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const { id } = req.params;
    
    const existingCustomer = await CustomerModel.getById(id, companyId);
    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }
    
    await CustomerModel.delete(id, companyId);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const uploadCustomers = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name || !row.name.toString().trim()) {
          errors.push({ row: i + 2, error: 'Name is required' });
          continue;
        }

        const customer = await CustomerModel.create({
          name: row.name?.toString().trim(),
          contactPerson: row.contact_person || row.contactPerson,
          email: row.email,
          phone: row.phone,
          gstNumber: row.gst_number || row.gstNumber,
          address: row.address,
          city: row.city,
          state: row.state,
          pin: row.pin,
          isActive: true, // Always true for Excel uploads
        }, companyId);
        inserted.push({ id: customer.id, name: customer.name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} customers successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ==================== TRANSPORTORS ====================

const getTransportors = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const transportors = await TransportorModel.getAll(companyId);
    const transformedData = transformArray(transportors, transformTransportor);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createTransportor = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const transportor = await TransportorModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformTransportor(transportor) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateTransportor = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const { id } = req.params;
    
    const existingTransportor = await TransportorModel.getById(id, companyId);
    if (!existingTransportor) {
      throw new NotFoundError('Transportor not found');
    }
    
    const transportor = await TransportorModel.update(id, req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformTransportor(transportor) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteTransportor = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const { id } = req.params;
    
    const existingTransportor = await TransportorModel.getById(id, companyId);
    if (!existingTransportor) {
      throw new NotFoundError('Transportor not found');
    }
    
    await TransportorModel.delete(id, companyId);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Transportor deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const uploadTransportors = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.transporter_name && !row.name) {
          errors.push({ row: i + 2, error: 'Transporter Name is required' });
          continue;
        }

        const transportor = await TransportorModel.create({
          name: row.transporter_name || row.name,
          contactPerson: row.contact_person_name || row.contactPersonName || row.contact_person || row.contactPerson,
          contactNumber: row.contact_number || row.contactNumber,
          email: row.email_id || row.emailId || row.email,
          gstNumber: row.gst_number || row.gstNumber,
          vehicleType: row.vehicle_type || row.vehicleType,
          capacity: row.capacity,
          pricingType: row.pricing_type || row.pricingType,
          rate: parseFloat(row.rate || 0),
          isActive: true, // Always true for Excel uploads
          remarks: row.remarks || null,
        }, companyId);
        inserted.push({ id: transportor.id, name: transportor.transporter_name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} transportors successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const uploadTeams = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name || !row.name.toString().trim()) {
          errors.push({ row: i + 2, error: 'Name is required' });
          continue;
        }
        if (!row.contact_number && !row.contactNumber) {
          errors.push({ row: i + 2, error: 'Contact Number is required' });
          continue;
        }
        if (!row.email_id && !row.emailId) {
          errors.push({ row: i + 2, error: 'Email ID is required' });
          continue;
        }
        if (!row.department) {
          errors.push({ row: i + 2, error: 'Department is required' });
          continue;
        }
        if (!row.designation) {
          errors.push({ row: i + 2, error: 'Designation is required' });
          continue;
        }

        const team = await TeamModel.create({
          name: row.name?.toString().trim(),
          contactNumber: row.contact_number || row.contactNumber,
          emailId: row.email_id || row.emailId,
          department: row.department?.toString().trim(),
          designation: row.designation?.toString().trim(),
          isActive: true, // Always true for Excel uploads
        }, companyId);
        inserted.push({ id: team.id, name: team.name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} team members successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const uploadCategories = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const sheets = parseExcelFileAllSheets(req.file.buffer);

    const productCategoriesResult = { inserted: 0, updated: 0, errors: 0, errorDetails: [] };
    const itemCategoriesResult = { inserted: 0, updated: 0, errors: 0, errorDetails: [] };
    const subCategoriesResult = { inserted: 0, updated: 0, errors: 0, errorDetails: [] };

    // Helper function to check if category already exists
    const checkProductCategoryExists = async (name) => {
      const result = await client.query(
        'SELECT id FROM product_categories WHERE company_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND is_active = true',
        [companyId.toUpperCase(), name]
      );
      return result.rows[0]?.id || null;
    };

    const checkItemCategoryExists = async (name, productCategoryId) => {
      const result = await client.query(
        'SELECT id FROM item_categories WHERE company_id = $1 AND product_category_id = $2 AND LOWER(TRIM(name)) = LOWER(TRIM($3)) AND is_active = true',
        [companyId.toUpperCase(), productCategoryId, name]
      );
      return result.rows[0]?.id || null;
    };

    const checkSubCategoryExists = async (name, itemCategoryId) => {
      const result = await client.query(
        'SELECT id FROM sub_categories WHERE company_id = $1 AND item_category_id = $2 AND LOWER(TRIM(name)) = LOWER(TRIM($3)) AND is_active = true',
        [companyId.toUpperCase(), itemCategoryId, name]
      );
      return result.rows[0]?.id || null;
    };

    // Check if unified "Category Master" sheet exists (flexible matching)
    const categoryMasterSheetName = Object.keys(sheets).find(name => {
      const lowerName = name.toLowerCase().trim();
      return (lowerName.includes('category') && lowerName.includes('master')) ||
             lowerName === 'category master' ||
             lowerName === 'categorymaster';
    });

    // Process unified "Category Master" sheet if it exists
    if (categoryMasterSheetName) {
      // Re-parse the Category Master sheet with explicit headers and range
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[categoryMasterSheetName];
      
      // Find the header row by looking for "Product Category" in the first few rows
      let dataStartRow = 2; // Default: start from row 3 (0-based index 2) to skip title and header
      const maxSearchRows = 5;
      for (let i = 0; i < maxSearchRows; i++) {
        const cellA = worksheet[xlsx.utils.encode_cell({ r: i, c: 0 })]; // Column A
        if (cellA && cellA.v && cellA.v.toString().toLowerCase().includes('product category')) {
          // Found header row at index i, data starts at i+1
          dataStartRow = i + 1;
          break;
        }
      }
      
      // Parse with explicit headers, starting from the row after headers
      const unifiedData = xlsx.utils.sheet_to_json(worksheet, {
        header: [
          'Product Category',
          'Item Category',
          'Sub Category',
          'HSN Code',
          'GST Rate (%)'
        ],
        range: dataStartRow, // Start from row after headers (0-based index)
        defval: null,
        blankrows: false,
      });
      
      // Explicitly skip empty rows
      const dataRows = unifiedData.filter(row =>
        (row['Product Category'] && row['Product Category'].toString().trim()) ||
        (row['Item Category'] && row['Item Category'].toString().trim()) ||
        (row['Sub Category'] && row['Sub Category'].toString().trim())
      );
      
      // Extract unique product categories
      // Use Maps to preserve original case while using lowercase for deduplication
      const productCategoryMap = new Map(); // lowercase -> original case
      const itemCategoryMap = new Map(); // productCategory (lowercase) -> Map(itemCategory lowercase -> original case)
      const subCategoryMap = new Map(); // itemCategoryKey -> Map(subCategory lowercase -> {name, hsnCode, gstRate})
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const productCat = (row['Product Category'] || '').toString().trim();
        const itemCat = (row['Item Category'] || '').toString().trim();
        const subCat = (row['Sub Category'] || '').toString().trim();
        const hsnCode = (row['HSN Code'] || '').toString().trim() || null;
        const gstRateStr = (row['GST Rate (%)'] || '').toString().trim();
        let gstRate = null;
        
        // Parse GST Rate - can be number or string like "18", "18%", "5", etc.
        if (gstRateStr) {
          const parsed = parseFloat(gstRateStr.replace('%', '').trim());
          if (!isNaN(parsed)) {
            // Validate GST Rate (should be 0, 5, or 18)
            if (parsed === 0 || parsed === 5 || parsed === 18) {
              gstRate = parsed;
            }
          }
        }
        
        if (productCat) {
          const key = productCat.toLowerCase();
          // Preserve original case - use first occurrence
          if (!productCategoryMap.has(key)) {
            productCategoryMap.set(key, productCat);
          }
        }
        
        if (productCat && itemCat) {
          const productKey = productCat.toLowerCase().trim();
          if (!itemCategoryMap.has(productKey)) {
            itemCategoryMap.set(productKey, new Map());
          }
          const itemKey = itemCat.toLowerCase().trim();
          // Preserve original case - use first occurrence
          if (!itemCategoryMap.get(productKey).has(itemKey)) {
            itemCategoryMap.get(productKey).set(itemKey, itemCat.trim());
          }
        }
        
        if (productCat && itemCat && subCat) {
          const key = `${productCat.toLowerCase().trim()}|${itemCat.toLowerCase().trim()}`;
          if (!subCategoryMap.has(key)) {
            subCategoryMap.set(key, new Map());
          }
          const subKey = subCat.toLowerCase().trim();
          // Preserve original case - use first occurrence, but also store HSN and GST
          if (!subCategoryMap.get(key).has(subKey)) {
            subCategoryMap.get(key).set(subKey, {
              name: subCat.trim(),
              hsnCode: hsnCode,
              gstRate: gstRate
            });
          }
        }
      }
      
      // Process Product Categories from unified sheet
      const processedProductNames = new Set();
      for (const [lowercaseKey, originalName] of productCategoryMap) {
        try {
          if (processedProductNames.has(lowercaseKey)) continue;
          processedProductNames.add(lowercaseKey);
          
          // Store with original case (trimmed)
          await CategoryModel.createProductCategory({
            name: originalName.trim(),
          }, companyId);
          productCategoriesResult.inserted++;
        } catch (error) {
          productCategoriesResult.errors++;
          productCategoriesResult.errorDetails.push({ row: 'N/A', error: error.message });
        }
      }
      
      // Refresh product categories lookup - use client to see newly created items in transaction
      const productCategoriesResultQuery = await client.query(
        'SELECT id, name FROM product_categories WHERE company_id = $1 AND is_active = true ORDER BY name',
        [companyId.toUpperCase()]
      );
      const productCategories = productCategoriesResultQuery.rows;
      const productCategoryLookupMap = new Map(
        productCategories.map(pc => [(pc.name || '').toLowerCase().trim(), pc.id])
      );
      
      // Process Item Categories from unified sheet
      const processedItemKeys = new Set();
      for (const [productCatKey, itemCatsMap] of itemCategoryMap) {
        const productCategoryId = productCategoryLookupMap.get(productCatKey);
        if (!productCategoryId) {
          itemCategoriesResult.errors++;
          itemCategoriesResult.errorDetails.push({ row: 'N/A', error: `Product Category "${productCatKey}" not found` });
          continue;
        }
        
        for (const [itemCatLowercase, itemCatOriginal] of itemCatsMap) {
          try {
            const itemKey = `${productCategoryId}-${itemCatLowercase}`;
            if (processedItemKeys.has(itemKey)) continue;
            processedItemKeys.add(itemKey);
            
            // Store with original case (trimmed)
            await CategoryModel.createItemCategory({
              name: itemCatOriginal.trim(),
              productCategoryId: productCategoryId,
            }, companyId);
            itemCategoriesResult.inserted++;
          } catch (error) {
            itemCategoriesResult.errors++;
            itemCategoriesResult.errorDetails.push({ row: 'N/A', error: error.message });
          }
        }
      }
      
      // Refresh item categories lookup AFTER processing Item Categories
      // Query directly from database using the client to ensure we see newly created items in the same transaction
      const itemCategoriesResultQuery = await client.query(
        'SELECT id, product_category_id, name FROM item_categories WHERE company_id = $1 AND is_active = true ORDER BY name',
        [companyId.toUpperCase()]
      );
      const itemCategories = itemCategoriesResultQuery.rows;
      
      const itemCategoryMapForSub = new Map();
      // Create a map of product category IDs to names (lowercase for matching)
      // Use the refreshed productCategories from line 1000
      const productCategoryIdToName = new Map(
        productCategories.map(pc => [pc.id, pc.name.toLowerCase().trim()])
      );
      
      // Build lookup map: "productName|itemName" -> itemCategoryId
      for (const ic of itemCategories) {
        const productCatName = productCategoryIdToName.get(ic.product_category_id);
        if (productCatName) {
          const itemNameLower = (ic.name || '').toLowerCase().trim();
          const key = `${productCatName}|${itemNameLower}`;
          itemCategoryMapForSub.set(key, ic.id);
        }
      }
      
      // Process Sub Categories from unified sheet
      const processedSubKeys = new Set();
      for (const [itemCatKey, subCatsMap] of subCategoryMap) {
        // itemCatKey format: "productName|itemName" (both lowercase)
        const itemCategoryId = itemCategoryMapForSub.get(itemCatKey);
        if (!itemCategoryId) {
          subCategoriesResult.errors++;
          // Try to provide more helpful error message
          const [productKey, itemKey] = itemCatKey.split('|');
          const availableKeys = Array.from(itemCategoryMapForSub.keys()).slice(0, 10).join(', ');
          subCategoriesResult.errorDetails.push({ 
            row: 'N/A', 
            error: `Item Category combination "${productKey} > ${itemKey}" not found. Available: ${availableKeys || 'none'}` 
          });
          continue;
        }
        
        for (const [subCatLowercase, subCatData] of subCatsMap) {
          try {
            const subKey = `${itemCategoryId}-${subCatLowercase}`;
            if (processedSubKeys.has(subKey)) continue;
            processedSubKeys.add(subKey);
            
            // subCatData can be either a string (old format) or an object (new format with HSN/GST)
            const subCatName = typeof subCatData === 'string' ? subCatData.trim() : subCatData.name.trim();
            const hsnCode = typeof subCatData === 'object' ? subCatData.hsnCode : null;
            const gstRate = typeof subCatData === 'object' ? subCatData.gstRate : null;
            
            // Store with original case (trimmed) and HSN/GST data
            await CategoryModel.createSubCategory({
              name: subCatName,
              itemCategoryId: itemCategoryId,
              hsnCode: hsnCode,
              gstRate: gstRate,
            }, companyId);
            subCategoriesResult.inserted++;
          } catch (error) {
            subCategoriesResult.errors++;
            subCategoriesResult.errorDetails.push({ row: 'N/A', error: error.message });
          }
        }
      }
    } else {
      // Process separate sheets (original logic)
      // Process Product Categories sheet
      const productSheetName = Object.keys(sheets).find(name => 
        name.toLowerCase().includes('product') && name.toLowerCase().includes('categor')
      ) || 'Product Categories'; 
    
    const processedProductNames = new Set(); // Track processed names to avoid duplicates in same upload
    
    if (sheets[productSheetName]) {
      const productData = sheets[productSheetName];
      for (let i = 0; i < productData.length; i++) {
        const row = productData[i];
        try {
          if (!row.name || !row.name.toString().trim()) {
            productCategoriesResult.errors++;
            productCategoriesResult.errorDetails.push({ row: i + 2, error: 'Name is required' });
            continue;
          }

          const categoryName = row.name.toString().trim();
          const categoryNameLower = categoryName.toLowerCase();
          
          // Skip if already processed in this upload
          if (processedProductNames.has(categoryNameLower)) {
            productCategoriesResult.errors++;
            productCategoriesResult.errorDetails.push({ row: i + 2, error: `Duplicate category "${categoryName}" in upload file` });
            continue;
          }
          processedProductNames.add(categoryNameLower);

          // Always insert, don't check for existing
          const category = await CategoryModel.createProductCategory({
            name: categoryName,
          }, companyId);
          productCategoriesResult.inserted++;
        } catch (error) {
          productCategoriesResult.errors++;
          productCategoriesResult.errorDetails.push({ row: i + 2, error: error.message });
        }
      }
    }

    // Process Item Categories sheet - Refresh lookup after Product Categories are created
    const itemSheetName = Object.keys(sheets).find(name => 
      name.toLowerCase().includes('item') && name.toLowerCase().includes('categor')
    ) || 'Item Categories';
    
    if (sheets[itemSheetName]) {
      const itemData = sheets[itemSheetName];
      
      // Refresh product categories lookup AFTER processing Product Categories sheet
      const productCategories = await CategoryModel.getProductCategories(companyId);
      const productCategoryMap = new Map(
        productCategories.map(pc => [pc.name.toLowerCase().trim(), pc.id])
      );

      const processedItemKeys = new Set(); // Track processed (productCategoryId, name) pairs

      for (let i = 0; i < itemData.length; i++) {
        const row = itemData[i];
        try {
          if (!row.name || !row.name.toString().trim()) {
            itemCategoriesResult.errors++;
            itemCategoriesResult.errorDetails.push({ row: i + 2, error: 'Name is required' });
            continue;
          }

          const categoryName = row.name.toString().trim();
          const productCategoryName = (row.product_category || row['Product Category'] || '').toString().trim();
          
          if (!productCategoryName) {
            itemCategoriesResult.errors++;
            itemCategoriesResult.errorDetails.push({ row: i + 2, error: 'Product Category is required' });
            continue;
          }

          const productCategoryId = productCategoryMap.get(productCategoryName.toLowerCase());
          if (!productCategoryId) {
            itemCategoriesResult.errors++;
            itemCategoriesResult.errorDetails.push({ row: i + 2, error: `Product Category "${productCategoryName}" not found` });
            continue;
          }

          // Skip if already processed in this upload
          const itemKey = `${productCategoryId}-${categoryName.toLowerCase()}`;
          if (processedItemKeys.has(itemKey)) {
            itemCategoriesResult.errors++;
            itemCategoriesResult.errorDetails.push({ row: i + 2, error: `Duplicate item category "${categoryName}" for product category "${productCategoryName}" in upload file` });
            continue;
          }
          processedItemKeys.add(itemKey);

          // Always insert, don't check for existing
          const category = await CategoryModel.createItemCategory({
            name: categoryName,
            productCategoryId: productCategoryId,
          }, companyId);
          itemCategoriesResult.inserted++;
        } catch (error) {
          itemCategoriesResult.errors++;
          itemCategoriesResult.errorDetails.push({ row: i + 2, error: error.message });
        }
      }
    }

    // Process Sub Categories sheet - Refresh lookup after Item Categories are created
    const subSheetName = Object.keys(sheets).find(name => 
      name.toLowerCase().includes('sub') && name.toLowerCase().includes('categor')
    ) || 'Sub Categories';
    
    if (sheets[subSheetName]) {
      const subData = sheets[subSheetName];
      
      // Refresh item categories lookup AFTER processing Item Categories sheet
      const itemCategories = await CategoryModel.getItemCategories(companyId);
      const itemCategoryMap = new Map(
        itemCategories.map(ic => [ic.name.toLowerCase().trim(), ic.id])
      );

      const processedSubKeys = new Set(); // Track processed (itemCategoryId, name) pairs

      for (let i = 0; i < subData.length; i++) {
        const row = subData[i];
        try {
          if (!row.name || !row.name.toString().trim()) {
            subCategoriesResult.errors++;
            subCategoriesResult.errorDetails.push({ row: i + 2, error: 'Name is required' });
            continue;
          }

          const categoryName = row.name.toString().trim();
          const itemCategoryName = (row.item_category || row['Item Category'] || '').toString().trim();
          
          if (!itemCategoryName) {
            subCategoriesResult.errors++;
            subCategoriesResult.errorDetails.push({ row: i + 2, error: 'Item Category is required' });
            continue;
          }

          const itemCategoryId = itemCategoryMap.get(itemCategoryName.toLowerCase());
          if (!itemCategoryId) {
            subCategoriesResult.errors++;
            subCategoriesResult.errorDetails.push({ row: i + 2, error: `Item Category "${itemCategoryName}" not found` });
            continue;
          }

          // Skip if already processed in this upload
          const subKey = `${itemCategoryId}-${categoryName.toLowerCase()}`;
          if (processedSubKeys.has(subKey)) {
            subCategoriesResult.errors++;
            subCategoriesResult.errorDetails.push({ row: i + 2, error: `Duplicate sub category "${categoryName}" for item category "${itemCategoryName}" in upload file` });
            continue;
          }
          processedSubKeys.add(subKey);

          // Always insert, don't check for existing
          const category = await CategoryModel.createSubCategory({
            name: categoryName,
            itemCategoryId: itemCategoryId,
          }, companyId);
          subCategoriesResult.inserted++;
        } catch (error) {
          subCategoriesResult.errors++;
          subCategoriesResult.errorDetails.push({ row: i + 2, error: error.message });
        }
      }
    }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Categories uploaded successfully',
      productCategories: {
        inserted: productCategoriesResult.inserted,
        updated: productCategoriesResult.updated,
        errors: productCategoriesResult.errors,
        errorDetails: productCategoriesResult.errorDetails,
      },
      itemCategories: {
        inserted: itemCategoriesResult.inserted,
        updated: itemCategoriesResult.updated,
        errors: itemCategoriesResult.errors,
        errorDetails: itemCategoriesResult.errorDetails,
      },
      subCategories: {
        inserted: subCategoriesResult.inserted,
        updated: subCategoriesResult.updated,
        errors: subCategoriesResult.errors,
        errorDetails: subCategoriesResult.errorDetails,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateTeam = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const team = await TeamModel.update(req.params.id, req.body, companyId);
    
    if (!team) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Team member not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformTeam(team) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteTeam = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await TeamModel.delete(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Team member not found');
    }
    
    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== WAREHOUSES ====================

const getWarehouses = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const warehouses = await WarehouseModel.getAll(companyId);
    const transformedData = transformArray(warehouses, transformWarehouse);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createWarehouse = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const warehouse = await WarehouseModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformWarehouse(warehouse) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateWarehouse = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const warehouse = await WarehouseModel.update(req.params.id, req.body, companyId);
    
    if (!warehouse) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Warehouse not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformWarehouse(warehouse) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteWarehouse = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await WarehouseModel.delete(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Warehouse not found');
    }
    
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const uploadWarehouses = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.warehouse_name && !row.name) {
          errors.push({ row: i + 2, error: 'Warehouse Name is required' });
          continue;
        }

        const warehouse = await WarehouseModel.create({
          warehouseName: row.warehouse_name || row.name,
          warehouseCode: row.warehouse_code || row.code,
          address: row.address,
          city: row.city,
          state: row.state,
          pincode: row.pincode || row.pin,
          isDefault: row.is_default === true || row.is_default === 'true' || row.isDefault === true,
          status: row.status || 'active',
        }, companyId);
        inserted.push({ id: warehouse.id, name: warehouse.warehouse_name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} warehouses successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ==================== MATERIALS ====================

const getMaterials = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const materials = await MaterialModel.getAll(companyId);
    const transformedData = transformArray(materials, transformMaterial);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createMaterial = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const material = await MaterialModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformMaterial(material) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateMaterial = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const material = await MaterialModel.update(req.params.id, req.body, companyId);
    
    if (!material) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Material not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformMaterial(material) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteMaterial = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await MaterialModel.delete(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Material not found');
    }
    
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const uploadMaterials = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name || !row.name.toString().trim()) {
          errors.push({ row: i + 2, error: 'Material Name is required' });
          continue;
        }

        const material = await MaterialModel.create({
          name: row.name.toString().trim(),
          isActive: true, // Always true for Excel uploads
        }, companyId);
        inserted.push({ id: material.id, name: material.name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} materials successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ==================== COLOURS ====================

const getColours = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const colours = await ColourModel.getAll(companyId);
    const transformedData = transformArray(colours, transformColour);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createColour = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const colour = await ColourModel.create(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformColour(colour) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateColour = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const colour = await ColourModel.update(req.params.id, req.body, companyId);
    
    if (!colour) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Colour not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformColour(colour) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const deleteColour = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const result = await ColourModel.delete(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Colour not found');
    }
    
    res.json({ success: true, message: 'Colour deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const uploadColours = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const data = parseExcelFile(req.file.buffer);

    const inserted = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name || !row.name.toString().trim()) {
          errors.push({ row: i + 2, error: 'Colour Name is required' });
          continue;
        }

        const colour = await ColourModel.create({
          name: row.name.toString().trim(),
          hexCode: row.hex_code || row.hexCode,
          isActive: row.is_active !== false && row.status !== 'inactive',
        }, companyId);
        inserted.push({ id: colour.id, name: colour.name });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Uploaded ${inserted.length} colours successfully`,
      inserted: inserted.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  // Vendors
  getVendors,
  createVendor,
  uploadVendors,
  updateVendor,
  deleteVendor,
  // Brands
  getBrands,
  createBrand,
  uploadBrands,
  updateBrand,
  deleteBrand,
  // Product Categories
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  // Item Categories
  getItemCategories,
  createItemCategory,
  updateItemCategory,
  deleteItemCategory,
  // Sub Categories
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  // Unified Category Upload
  uploadCategories,
  // Your Vendors
  getYourVendors,
  createYourVendor,
  updateYourVendor,
  deleteYourVendor,
  // Your Brands
  getYourBrands,
  createYourBrand,
  updateYourBrand,
  deleteYourBrand,
  // Teams
  getTeams,
  createTeam,
  uploadTeams,
  updateTeam,
  deleteTeam,
  // Customers
  getCustomers,
  createCustomer,
  uploadCustomers,
  updateCustomer,
  deleteCustomer,
  // Transportors
  getTransportors,
  createTransportor,
  updateTransportor,
  deleteTransportor,
  uploadTransportors,
  // Warehouses
  getWarehouses,
  createWarehouse,
  uploadWarehouses,
  updateWarehouse,
  deleteWarehouse,
  // Materials
  getMaterials,
  createMaterial,
  uploadMaterials,
  updateMaterial,
  deleteMaterial,
  // Colours
  getColours,
  createColour,
  uploadColours,
  updateColour,
  deleteColour,
};



