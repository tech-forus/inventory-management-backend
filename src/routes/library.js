const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const libraryController = require('../controllers/libraryController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream', // Some browsers send this for .xlsx
      'application/x-zip-compressed', // Some browsers send this for .xlsx
      'text/csv',
    ];

    // Check file extension as fallback
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    const isValidMimeType = validMimeTypes.includes(file.mimetype);
    const isValidExtension = validExtensions.includes(fileExtension);

    if (isValidMimeType || isValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

const customerCompanyModel = require('../models/customerCompanyModel');
const customerContactModel = require('../models/customerContactModel');

// Apply authenticate middleware to all routes in this router
router.use(authenticate);


/**
 * VENDORS ROUTES
 * All routes delegate to libraryController
 */
router.get('/vendors', libraryController.getVendors);
router.post('/vendors', libraryController.createVendor);
router.post('/vendors/upload', upload.single('file'), libraryController.uploadVendors);
router.put('/vendors/:id', libraryController.updateVendor);
router.delete('/vendors/:id', libraryController.deleteVendor);

/**
 * BRANDS ROUTES
 * All routes delegate to libraryController
 */
router.get('/brands', libraryController.getBrands);
router.post('/brands', libraryController.createBrand);
router.post('/brands/upload', upload.single('file'), libraryController.uploadBrands);
router.put('/brands/:id', libraryController.updateBrand);
router.delete('/brands/:id', libraryController.deleteBrand);

/**
 * PRODUCT CATEGORIES ROUTES
 * All routes delegate to libraryController
 */
router.get('/product', libraryController.getProductCategories);
router.post('/product', libraryController.createProductCategory);
router.put('/product/:id', libraryController.updateProductCategory);
router.delete('/product/:id', libraryController.deleteProductCategory);

/**
 * ITEM CATEGORIES ROUTES
 * All routes delegate to libraryController
 */
router.get('/item', libraryController.getItemCategories);
router.post('/item', libraryController.createItemCategory);
router.put('/item/:id', libraryController.updateItemCategory);
router.delete('/item/:id', libraryController.deleteItemCategory);

/**
 * SUB CATEGORIES ROUTES
 * All routes delegate to libraryController
 */
router.get('/sub', libraryController.getSubCategories);
router.post('/sub', libraryController.createSubCategory);
router.put('/sub/:id', libraryController.updateSubCategory);
router.delete('/sub/:id', libraryController.deleteSubCategory);

/**
 * SUB CATEGORY DEFAULTS ROUTES
 * Manage default SKU field values for sub-categories
 */
router.get('/sub-categories/defaults', libraryController.getAllSubCategoryDefaults);
router.get('/sub-categories/:subCategoryId/defaults', libraryController.getSubCategoryDefaults);
router.get('/sub-categories/:subCategoryId/defaults/:defaultId', libraryController.getSubCategoryDefaultById);
router.post('/sub-categories/:subCategoryId/defaults', libraryController.createSubCategoryDefault);
router.put('/sub-categories/:subCategoryId/defaults/:defaultId', libraryController.updateSubCategoryDefault);
router.delete('/sub-categories/:subCategoryId/defaults/:defaultId', libraryController.deleteSubCategoryDefault);

/**
 * UNIFIED CATEGORIES UPLOAD ROUTE
 * Uploads Product Categories, Item Categories, and Sub Categories from a single Excel file
 */
router.post('/upload', upload.single('file'), libraryController.uploadCategories);

/**
 * YOUR VENDORS ROUTES (Alias for vendors)
 * All routes delegate to libraryController
 */
router.get('/yourvendors', libraryController.getYourVendors);
router.post('/yourvendors', libraryController.createYourVendor);
router.put('/yourvendors/:id', libraryController.updateYourVendor);
router.delete('/yourvendors/:id', libraryController.deleteYourVendor);

/**
 * YOUR BRANDS ROUTES (Alias for brands)
 * All routes delegate to libraryController
 */
router.get('/yourbrands', libraryController.getYourBrands);
router.post('/yourbrands', libraryController.createYourBrand);
router.put('/yourbrands/:id', libraryController.updateYourBrand);
router.delete('/yourbrands/:id', libraryController.deleteYourBrand);

/**
 * YOUR PRODUCT CATEGORIES ROUTES
 * Note: These routes have additional functionality (get by ID, etc.)
 * For now, delegate to existing controller methods
 */
router.get('/yourproductcategories', libraryController.getProductCategories);
router.get('/yourproductcategories/:id', libraryController.getProductCategories);
router.post('/yourproductcategories', libraryController.createProductCategory);
router.put('/yourproductcategories/:id', libraryController.updateProductCategory);
router.delete('/yourproductcategories/:id', libraryController.deleteProductCategory);

/**
 * YOUR ITEM CATEGORIES ROUTES
 * Note: These routes have additional functionality (get by ID, etc.)
 * For now, delegate to existing controller methods
 */
router.get('/youritemcategories', libraryController.getItemCategories);
router.get('/youritemcategories/:id', libraryController.getItemCategories);
router.post('/youritemcategories', libraryController.createItemCategory);
router.put('/youritemcategories/:id', libraryController.updateItemCategory);
router.delete('/youritemcategories/:id', libraryController.deleteItemCategory);

/**
 * YOUR SUB CATEGORIES ROUTES
 * Note: These routes have additional functionality (get by ID, etc.)
 * For now, delegate to existing controller methods
 */
router.get('/yoursubcategories', libraryController.getSubCategories);
router.get('/yoursubcategories/:id', libraryController.getSubCategories);
router.post('/yoursubcategories', libraryController.createSubCategory);
router.put('/yoursubcategories/:id', libraryController.updateSubCategory);
router.delete('/yoursubcategories/:id', libraryController.deleteSubCategory);

/**
 * TEAMS ROUTES
 * All routes delegate to libraryController
 */
router.get('/teams', libraryController.getTeams);
router.post('/teams', libraryController.createTeam);
router.post('/teams/upload', upload.single('file'), libraryController.uploadTeams);
router.put('/teams/:id', libraryController.updateTeam);
router.delete('/teams/:id', libraryController.deleteTeam);

/**
 * CUSTOMER COMPANIES ROUTES
 */
router.get('/customer-companies', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const rows = await customerCompanyModel.getAll(companyId, req.query);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { next(err); }
});

router.get('/customer-companies/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const company = await customerCompanyModel.getById(req.params.id, companyId);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
});

router.post('/customer-companies', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { consignee_addresses, ...data } = req.body;
    const company = await customerCompanyModel.create(companyId, data, consignee_addresses || []);
    res.status(201).json({ success: true, company });
  } catch (err) { next(err); }
});

router.put('/customer-companies/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const company = await customerCompanyModel.update(req.params.id, companyId, req.body);
    res.json({ success: true, company });
  } catch (err) { next(err); }
});

router.delete('/customer-companies/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    await customerCompanyModel.delete(req.params.id, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * CUSTOMER CONTACTS ROUTES
 */
router.get('/customer-contacts', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const rows = await customerContactModel.getAll(companyId, req.query);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { next(err); }
});

router.post('/customer-contacts', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { customer_company_id, ...data } = req.body;
    const contact = await customerContactModel.create(customer_company_id, companyId, data);
    res.status(201).json({ success: true, contact });
  } catch (err) { next(err); }
});

router.put('/customer-contacts/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const contact = await customerContactModel.update(req.params.id, companyId, req.body);
    res.json({ success: true, contact });
  } catch (err) { next(err); }
});

router.delete('/customer-contacts/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    await customerContactModel.delete(req.params.id, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Aliases for backward compatibility
router.get('/customers', libraryController.getCustomers);
router.get('/customers/counts', libraryController.getCustomerCounts);
router.post('/customers', libraryController.createCustomer);
router.post('/customers/upload', upload.single('file'), libraryController.uploadCustomers);
router.put('/customers/:id', libraryController.updateCustomer);
router.put('/customers/:id/pin', libraryController.toggleCustomerPin);
router.delete('/customers/:id', libraryController.deleteCustomer);

/**
 * TRANSPORTORS ROUTES
 * All routes delegate to libraryController
 */
router.get('/transportors', libraryController.getTransportors);
router.post('/transportors', libraryController.createTransportor);
router.post('/transportors/upload', upload.single('file'), libraryController.uploadTransportors);
router.put('/transportors/:id', libraryController.updateTransportor);
router.delete('/transportors/:id', libraryController.deleteTransportor);

/**
 * WAREHOUSES ROUTES
 * All routes delegate to libraryController
 */
router.get('/warehouses', libraryController.getWarehouses);
router.post('/warehouses', libraryController.createWarehouse);
router.post('/warehouses/upload', upload.single('file'), libraryController.uploadWarehouses);
router.put('/warehouses/:id', libraryController.updateWarehouse);
router.delete('/warehouses/:id', libraryController.deleteWarehouse);

/**
 * MATERIALS ROUTES
 * All routes delegate to libraryController
 */
router.get('/materials', libraryController.getMaterials);
router.post('/materials', libraryController.createMaterial);
router.post('/materials/upload', upload.single('file'), libraryController.uploadMaterials);
router.put('/materials/:id', libraryController.updateMaterial);
router.delete('/materials/:id', libraryController.deleteMaterial);

/**
 * COLOURS ROUTES
 * All routes delegate to libraryController
 */
router.get('/colours', libraryController.getColours);
router.post('/colours', libraryController.createColour);
router.post('/colours/upload', upload.single('file'), libraryController.uploadColours);
router.put('/colours/:id', libraryController.updateColour);
router.delete('/colours/:id', libraryController.deleteColour);

module.exports = router;

