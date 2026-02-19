const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate } = require('../middlewares/auth');

// Protect all routes
router.use(authenticate);

// --- Customers ---
router.get('/customers', salesController.getAllCustomers);
router.post('/customers', salesController.createCustomer);
router.put('/customers/:id', salesController.updateCustomer);
router.put('/customers/:id/reassign', salesController.reassignCustomer);

// --- Leads ---
router.get('/leads', salesController.getAllLeads);
router.get('/leads/:id', salesController.getLead);
router.post('/leads', salesController.createLead);
router.put('/leads/:id', salesController.updateLead);
router.delete('/leads/:id', salesController.deleteLead);

// Follow-ups
router.post('/leads/:id/follow-ups', salesController.addFollowUp);
router.put('/leads/:id/follow-ups/:fid', salesController.markFollowUpDone);

// --- Dashboard ---
router.get('/dashboard/stats', salesController.getDashboardStats);

module.exports = router;
