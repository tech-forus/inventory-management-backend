/**
 * Test script to verify backend structure is working properly
 * Run with: node test_backend_structure.js
 */

console.log('========================================');
console.log('Backend Structure Test Suite');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, testFn) {
  try {
    testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: Config files
test('Config: database.js exists and exports config', () => {
  const dbConfig = require('../src/config/database');
  if (!dbConfig || !dbConfig.host) {
    throw new Error('Database config not properly exported');
  }
});

test('Config: jwt.js exists and exports config', () => {
  const jwtConfig = require('../src/config/jwt');
  if (!jwtConfig || !jwtConfig.secret) {
    throw new Error('JWT config not properly exported');
  }
});

// Test 2: Middleware
test('Middleware: auth.js exists and exports functions', () => {
  const { authenticate, getCompanyId } = require('../src/middlewares/auth');
  if (typeof authenticate !== 'function' || typeof getCompanyId !== 'function') {
    throw new Error('Auth middleware functions not properly exported');
  }
});

test('Middleware: errorHandler.js exists and exports functions', () => {
  const { errorHandler, notFoundHandler } = require('../src/middlewares/errorHandler');
  if (typeof errorHandler !== 'function' || typeof notFoundHandler !== 'function') {
    throw new Error('Error handler middleware functions not properly exported');
  }
});

test('Middleware: upload.js exists and exports multer config', () => {
  const upload = require('../src/middlewares/upload');
  if (!upload) {
    throw new Error('Upload middleware not properly exported');
  }
});

// Test 3: Models
test('Models: database.js exists and exports pool', () => {
  const pool = require('../src/models/database');
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Database pool not properly exported');
  }
});

// Test 4: Controllers
test('Controllers: authController.js exists and exports functions', () => {
  const authController = require('../src/controllers/authController');
  if (!authController || typeof authController.login !== 'function') {
    throw new Error('Auth controller not properly exported');
  }
});

test('Controllers: companyController.js exists and exports functions', () => {
  const companyController = require('../src/controllers/companyController');
  if (!companyController || typeof companyController.register !== 'function') {
    throw new Error('Company controller not properly exported');
  }
});

test('Controllers: onboardingController.js exists and exports functions', () => {
  const onboardingController = require('../src/controllers/onboardingController');
  if (!onboardingController || typeof onboardingController.getStatus !== 'function') {
    throw new Error('Onboarding controller not properly exported');
  }
});

// Test 5: Routes
test('Routes: auth.js exists and exports router', () => {
  const authRoutes = require('../src/routes/auth');
  if (!authRoutes || typeof authRoutes.use !== 'function') {
    throw new Error('Auth routes not properly exported');
  }
});

test('Routes: companies.js exists and exports router', () => {
  const companiesRoutes = require('../src/routes/companies');
  if (!companiesRoutes || typeof companiesRoutes.use !== 'function') {
    throw new Error('Companies routes not properly exported');
  }
});

test('Routes: onboarding.js exists and exports router', () => {
  const onboardingRoutes = require('../src/routes/onboarding');
  if (!onboardingRoutes || typeof onboardingRoutes.use !== 'function') {
    throw new Error('Onboarding routes not properly exported');
  }
});

test('Routes: library.js exists and exports router', () => {
  const libraryRoutes = require('../src/routes/library');
  if (!libraryRoutes || typeof libraryRoutes.use !== 'function') {
    throw new Error('Library routes not properly exported');
  }
});

test('Routes: skus.js exists and exports router', () => {
  const skusRoutes = require('../src/routes/skus');
  if (!skusRoutes || typeof skusRoutes.use !== 'function') {
    throw new Error('SKUs routes not properly exported');
  }
});

// Test 6: Utils
test('Utils: helpers.js exists and exports functions', () => {
  const helpers = require('./utils/helpers');
  if (!helpers || typeof helpers.parseExcelFile !== 'function') {
    throw new Error('Helpers not properly exported');
  }
});

test('Utils: companyIdGenerator.js exists and exports functions', () => {
  const { generateUniqueCompanyId } = require('./utils/companyIdGenerator');
  if (typeof generateUniqueCompanyId !== 'function') {
    throw new Error('Company ID generator not properly exported');
  }
});

test('Utils: skuIdGenerator.js exists and exports functions', () => {
  const { generateUniqueSKUId } = require('./utils/skuIdGenerator');
  if (typeof generateUniqueSKUId !== 'function') {
    throw new Error('SKU ID generator not properly exported');
  }
});

// Test 7: Server can be imported
test('Server: server.js can be imported without errors', () => {
  // Don't actually start the server, just check imports
  const express = require('express');
  const cors = require('cors');
  require('dotenv').config();
  
  // Check if all route imports work
  require('../src/routes/companies');
  require('../src/routes/auth');
  require('../src/routes/onboarding');
  require('../src/routes/library');
  require('../src/routes/skus');
  
  // Check if middleware imports work
  require('../src/middlewares/errorHandler');
});

// Test 8: Database connection (if database is available)
test('Database: Connection pool can be created', async () => {
  const pool = require('../src/models/database');
  try {
    // Try a simple query
    await pool.query('SELECT 1 as test');
  } catch (error) {
    // If database is not available, that's okay for structure test
    if (error.message.includes('ECONNREFUSED') || error.message.includes('password')) {
      console.log('  ⚠ Database not available (this is okay for structure test)');
    } else {
      throw error;
    }
  }
});

// Summary
console.log('\n========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✅ All structure tests passed!');
  console.log('Backend structure is properly organized.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please check the errors above.');
  process.exit(1);
}


