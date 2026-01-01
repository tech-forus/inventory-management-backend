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
app.use(helmet());

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
    // Log what origin we are evaluating
    console.log('[CORS] Incoming Origin:', origin || '(no origin)');

    // 1. Allow no-origin requests (curl, server-to-server, some mobile apps)
    if (!origin) {
      console.log('[CORS] Allowing request with no Origin header');
      return callback(null, true);
    }

    // 2. Always allow local React dev server explicitly (for development)
    if (origin === 'http://localhost:3000' || origin === 'http://localhost:5173') {
      console.log('[CORS] Allowing local dev server:', origin);
      return callback(null, true);
    }

    // 2.5. Always allow Vercel frontend deployment
    if (origin === 'https://inventory-management-frontend-1ip7hw67t-tech-forus-projects.vercel.app') {
      console.log('[CORS] Allowing Vercel frontend:', origin);
      return callback(null, true);
    }

    // 2.6. Always allow forusbiz.ai and www.forusbiz.ai frontend deployments
    if (origin === 'https://forusbiz.ai' || origin === 'https://www.forusbiz.ai') {
      console.log('[CORS] Allowing forusbiz frontend:', origin);
      return callback(null, true);
    }

    // 3. If no allowedOrigins configured, allow all (for development flexibility)
    if (allowedOrigins.length === 0) {
      console.warn(
        '[CORS] allowedOrigins is empty. Allowing all origins. ' +
          'Set CORS_ORIGINS in env for stricter control.'
      );
      return callback(null, true);
    }

    // 4. Check against allowedOrigins from env
    if (allowedOrigins.includes(origin)) {
      console.log('[CORS] Origin is in allowedOrigins → allowed');
      return callback(null, true);
    }

    // 5. Origin not allowed: deny CORS (no header)
    console.warn('[CORS] Origin NOT allowed by CORS:', origin, 'Allowed:', allowedOrigins);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // For older browsers
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
