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
 * CUSTOMERS ROUTES
 * All routes delegate to libraryController
 */
router.get('/customers', libraryController.getCustomers);
router.post('/customers', libraryController.createCustomer);
router.post('/customers/upload', upload.single('file'), libraryController.uploadCustomers);
router.put('/customers/:id', libraryController.updateCustomer);
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

module.exports = router;

