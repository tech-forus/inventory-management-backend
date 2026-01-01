const VendorModel = require('../models/vendorModel');
const BrandModel = require('../models/brandModel');
const CategoryModel = require('../models/categoryModel');
const TeamModel = require('../models/teamModel');
const CustomerModel = require('../models/customerModel');
const TransportorModel = require('../models/transportorModel');
const { getCompanyId } = require('../middlewares/auth');
const { parseExcelFile, parseExcelFileAllSheets } = require('../utils/helpers');
const { transformVendor, transformBrand, transformCategory, transformTeam, transformCustomer, transformTransportor, transformArray } = require('../utils/transformers');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const xlsx = require('xlsx');

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
        
        // Handle isActive with different column name formats
        const isActiveValue = row.is_active !== undefined ? row.is_active :
                             row.isActive !== undefined ? row.isActive :
                             row['Is Active'] !== undefined ? row['Is Active'] :
                             row['is active'] !== undefined ? row['is active'] :
                             true; // Default to true if not specified
        
        // Convert string "true"/"false" to boolean
        const isActive = typeof isActiveValue === 'string' 
          ? (isActiveValue.toLowerCase().trim() === 'true' || isActiveValue.toLowerCase().trim() === '1')
          : (isActiveValue !== false && isActiveValue !== 0);

        const brand = await BrandModel.create({
          name: name.toString().trim(),
          description: description ? description.toString().trim() : null,
          isActive: isActive,
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

    // If ID is provided, get single category
    if (req.params.id) {
      const category = await CategoryModel.getProductCategoryById(req.params.id, companyId);
      if (!category) {
        throw new NotFoundError('Product category not found');
      }
      return res.json({ success: true, data: transformCategory(category) });
    }

    // Otherwise get all categories
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

    // If ID is provided, get single category
    if (req.params.id) {
      const category = await CategoryModel.getItemCategoryById(req.params.id, companyId);
      if (!category) {
        throw new NotFoundError('Item category not found');
      }
      return res.json({ success: true, data: transformCategory(category) });
    }

    // Otherwise get all categories (with optional productCategoryId filter)
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

    // If ID is provided, get single category
    if (req.params.id) {
      const category = await CategoryModel.getSubCategoryById(req.params.id, companyId);
      if (!category) {
        throw new NotFoundError('Sub category not found');
      }
      return res.json({ success: true, data: transformCategory(category) });
    }

    // Otherwise get all categories (with optional itemCategoryId filter)
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
          isActive: row.is_active !== undefined ? (row.is_active === 'true' || row.is_active === true) : true,
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
          isActive: row.status === 'Active' || row.is_active === 'true' || row.is_active === true || row.status !== 'Inactive',
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
          isActive: row.is_active !== undefined ? (row.is_active === 'true' || row.is_active === true) : true,
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
          'Sub Category'
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
      const subCategoryMap = new Map(); // itemCategoryKey -> Map(subCategory lowercase -> original case)
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const productCat = (row['Product Category'] || '').toString().trim();
        const itemCat = (row['Item Category'] || '').toString().trim();
        const subCat = (row['Sub Category'] || '').toString().trim();
        
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
          // Preserve original case - use first occurrence
          if (!subCategoryMap.get(key).has(subKey)) {
            subCategoryMap.get(key).set(subKey, subCat.trim());
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
        
        for (const [subCatLowercase, subCatOriginal] of subCatsMap) {
          try {
            const subKey = `${itemCategoryId}-${subCatLowercase}`;
            if (processedSubKeys.has(subKey)) continue;
            processedSubKeys.add(subKey);
            
            // Store with original case (trimmed)
            await CategoryModel.createSubCategory({
              name: subCatOriginal.trim(),
              itemCategoryId: itemCategoryId,
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
};



