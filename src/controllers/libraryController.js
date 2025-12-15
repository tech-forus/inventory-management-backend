const VendorModel = require('../models/vendorModel');
const BrandModel = require('../models/brandModel');
const CategoryModel = require('../models/categoryModel');
const TeamModel = require('../models/teamModel');
const CustomerModel = require('../models/customerModel');
const { getCompanyId } = require('../middlewares/auth');
const { parseExcelFile } = require('../utils/helpers');
const { transformVendor, transformBrand, transformCategory, transformTeam, transformCustomer, transformArray } = require('../utils/transformers');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');

/**
 * Library Controller
 * Handles all library-related operations (vendors, brands, categories, teams)
 */

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
    const vendor = await VendorModel.create(req.body, companyId);
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name || !row.name.toString().trim()) {
          errors.push({ row: i + 2, error: 'Name is required' });
          continue;
        }

        const vendor = await VendorModel.create({
          name: row.name?.toString().trim(),
          contactPerson: row.contact_person || row.contactPerson,
          designation: row.designation,
          email: row.email,
          phone: row.phone,
          gstNumber: row.gst_number || row.gstNumber,
          address: row.address,
          city: row.city,
          state: row.state,
          pin: row.pin,
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
    const vendor = await VendorModel.update(req.params.id, req.body, companyId);
    
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

        const brand = await BrandModel.create({
          name: row.name?.toString().trim(),
          description: row.description,
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
    const categories = await CategoryModel.getProductCategories(companyId);
    const transformedData = transformArray(categories, transformCategory);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createProductCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const category = await CategoryModel.createProductCategory(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformCategory(category) });
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
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const category = await CategoryModel.updateProductCategory(req.params.id, req.body, companyId);
    
    if (!category) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Product category not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformCategory(category) });
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
    const result = await CategoryModel.deleteProductCategory(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Product category not found');
    }
    
    res.json({ success: true, message: 'Product category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== ITEM CATEGORIES ====================

const getItemCategories = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const productCategoryId = req.query.productCategoryId || null;
    const categories = await CategoryModel.getItemCategories(companyId, productCategoryId);
    const transformedData = transformArray(categories, transformCategory);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createItemCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const category = await CategoryModel.createItemCategory(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformCategory(category) });
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
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const category = await CategoryModel.updateItemCategory(req.params.id, req.body, companyId);
    
    if (!category) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Item category not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformCategory(category) });
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
    const result = await CategoryModel.deleteItemCategory(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Item category not found');
    }
    
    res.json({ success: true, message: 'Item category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== SUB CATEGORIES ====================

const getSubCategories = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const itemCategoryId = req.query.itemCategoryId || null;
    const categories = await CategoryModel.getSubCategories(companyId, itemCategoryId);
    const transformedData = transformArray(categories, transformCategory);
    res.json({ success: true, data: transformedData });
  } catch (error) {
    next(error);
  }
};

const createSubCategory = async (req, res, next) => {
  const pool = require('../models/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const category = await CategoryModel.createSubCategory(req.body, companyId);
    await client.query('COMMIT');
    res.json({ success: true, data: transformCategory(category) });
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
    await client.query('BEGIN');
    const companyId = getCompanyId(req);
    const category = await CategoryModel.updateSubCategory(req.params.id, req.body, companyId);
    
    if (!category) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Sub category not found');
    }

    await client.query('COMMIT');
    res.json({ success: true, data: transformCategory(category) });
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
    const result = await CategoryModel.deleteSubCategory(req.params.id, companyId);
    
    if (!result) {
      throw new NotFoundError('Sub category not found');
    }
    
    res.json({ success: true, message: 'Sub category deleted successfully' });
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
  updateTeam,
  deleteTeam,
  // Customers
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};



