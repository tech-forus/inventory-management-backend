const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { apiRateLimiter, authRateLimiter, strictRateLimiter } = require('./middlewares/conditionalRateLimit');
const requestLogger = require('./middlewares/requestLogger');
require('dotenv').config();

const app = express();

// ----------------------
// Security middleware - Helmet (must be first)
// ----------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// ----------------------
// Request logging middleware (after helmet, before other middleware)
// ----------------------
app.use(requestLogger);

// ----------------------
// CORS configuration (patched)
// ----------------------

// Read and parse CORS_ORIGINS env
const rawOrigins = process.env.CORS_ORIGINS || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Log CORS config clearly
console.log('[CORS] NODE_ENV:', process.env.NODE_ENV);
console.log('[CORS] CORS_ORIGINS raw:', rawOrigins);
console.log('[CORS] allowedOrigins parsed:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow no-origin requests (curl, server-to-server, some mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Always allow local React dev server explicitly
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    if (isLocalhost) {
      return callback(null, true);
    }

    // 3. Known production origins
    const knownOrigins = [
      'https://inventory-management-frontend-1ip7hw67t-tech-forus-projects.vercel.app',
      'https://forusbiz.ai',
      'https://www.forusbiz.ai'
    ];

    if (knownOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 4. If no allowedOrigins configured, allow all (for development flexibility)
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // 5. Check against allowedOrigins from env
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 6. Origin not allowed: deny CORS (no header)
    console.warn('[CORS] Origin NOT allowed by CORS:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Explicitly handle all OPTIONS preflight requests
app.options('*', cors(corsOptions));

// ----------------------
// Body parsing middleware
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// Routes
// ----------------------

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Inventory Management System API',
    status: 'Server is running',
    version: '1.0.0',
  });
});

// Ping endpoint for health checks
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Health check endpoint with database connectivity check
app.get('/api/health', async (req, res) => {
  const pool = require('./models/database');
  const timestamp = new Date().toISOString();

  try {
    // Check database connection
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      db: 'UP',
      timestamp,
    });
  } catch (error) {
    res.status(500).json({
      status: 'DEGRADED',
      db: 'DOWN',
      timestamp,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ----------------------
// API Routes
// ----------------------
const companiesRoutes = require('./routes/companies');
const authRoutes = require('./routes/auth');
const libraryRoutes = require('./routes/library');
const skusRoutes = require('./routes/skus');
const inventoryRoutes = require('./routes/inventory');
const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const emailRoutes = require('./routes/email');
const manufacturingRoutes = require('./routes/manufacturingRoutes');
const dashboardRoutes = require('./routes/dashboard');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const termsConditionsRoutes = require('./routes/termsConditions');
const salesRoutes = require('./routes/sales');

// Apply conditional rate limiting to routes
// Authenticated users get unlimited requests (JWT valid for 12 hours)
// Unauthenticated users are rate limited

app.use('/api/companies', companiesRoutes);
app.use('/api/auth', authRateLimiter, authRoutes); // 5 requests/15min for unauthenticated
app.use('/api/library', apiRateLimiter, libraryRoutes); // 100 requests/15min for unauthenticated
app.use('/api/categories', apiRateLimiter, libraryRoutes);
app.use('/api/skus', apiRateLimiter, skusRoutes); // 100 requests/15min for unauthenticated
app.use('/api/inventory', strictRateLimiter, inventoryRoutes); // 50 requests/15min for unauthenticated
app.use('/api/users', usersRoutes); // User management routes
app.use('/api/roles', rolesRoutes); // Role management routes
app.use('/api/email', emailRoutes); // Email routes
app.use('/api/manufacturing', apiRateLimiter, manufacturingRoutes); // Manufacturing routes
app.use('/api/dashboard', apiRateLimiter, dashboardRoutes); // Dashboard routes
app.use('/api/purchase-orders', apiRateLimiter, purchaseOrderRoutes); // Purchase Order routes
app.use('/api/terms-conditions', apiRateLimiter, termsConditionsRoutes); // Terms & Conditions routes
app.use('/api/sales', apiRateLimiter, salesRoutes); // Sales routes

// New "your" prefixed routes (must be last to avoid catching other routes)
app.use('/api', apiRateLimiter, libraryRoutes);

// ----------------------
// 404 handler (must be after all routes, before error handler)
// ----------------------
const { notFoundHandler } = require('./middlewares/errorHandler');
app.use(notFoundHandler);

// ----------------------
// Error handling middleware (must be last, 4 parameters)
// ----------------------
const { errorHandler } = require('./middlewares/errorHandler');
app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

module.exports = app;
