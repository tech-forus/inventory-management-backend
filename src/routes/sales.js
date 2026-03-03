const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middlewares/auth');

// Protect all routes
router.use(authenticate);

// --- Customers ---
router.get('/customers', salesController.getAllCustomers);
router.get('/customers/counts', salesController.getCustomerCounts);
router.post('/customers', salesController.createCustomer);
router.put('/customers/:id', salesController.updateCustomer);
router.put('/customers/:id/reassign', salesController.reassignCustomer);

// --- Leads ---
router.get('/leads', salesController.getAllLeads);
router.get('/leads/counts', salesController.getLeadCounts);
router.get('/leads/:id', salesController.getLead);
router.post('/leads', salesController.createLead);
router.put('/leads/:id', salesController.updateLead);
router.delete('/leads/:id', salesController.deleteLead);

// Follow-ups
router.post('/leads/:id/followups', salesController.addFollowUp);
router.patch('/followups/:fid/complete', salesController.completeFollowup);

// Activities
router.post('/leads/:id/activities', salesController.addActivity);

// Quotations for a lead
router.get('/leads/:id/quotations', quotationController.getLeadQuotations);

// --- Quotations ---
router.get('/quotations', quotationController.getAllQuotations);
router.get('/quotations/counts', quotationController.getQuotationCounts);
router.post('/quotations', quotationController.createQuotation);
router.get('/quotations/:id', quotationController.getQuotation);
router.put('/quotations/:id', quotationController.updateQuotation);
router.patch('/quotations/:id/status', quotationController.updateStatus);
router.delete('/quotations/:id', quotationController.deleteQuotation);
router.post('/quotations/:id/send-email', quotationController.sendQuotationEmail);

// --- Dashboard ---
router.get('/dashboard/stats', salesController.getDashboardStats);

module.exports = router;
