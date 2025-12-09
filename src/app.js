const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { apiRateLimiter, authRateLimiter, strictRateLimiter } = require('./middlewares/conditionalRateLimit');
const requestLogger = require('./middlewares/requestLogger');
require('dotenv').config();

const app = express();

// Security middleware - Helmet (must be first)
app.use(helmet());

// Request logging middleware (after helmet, before other middleware)
app.use(requestLogger);

// CORS configuration - stricter for production
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // If no allowed origins configured, allow all (development only)
    if (allowedOrigins.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS_ORIGINS must be configured in production'));
      }
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Note: Conditional rate limiters are now used
// - Authenticated users (valid JWT): Unlimited requests for 12 hours (JWT lifetime)
// - Unauthenticated users: Rate limited based on IP address
// See ./middlewares/conditionalRateLimit.js for details

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Inventory Management System API',
    status: 'Server is running',
    version: '1.0.0'
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

// API Routes
const companiesRoutes = require('./routes/companies');
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const libraryRoutes = require('./routes/library');
const skusRoutes = require('./routes/skus');
const inventoryRoutes = require('./routes/inventory');

// Apply conditional rate limiting to routes
// Authenticated users get unlimited requests (JWT valid for 12 hours)
// Unauthenticated users are rate limited
app.use('/api/companies', companiesRoutes);
app.use('/api/auth', authRateLimiter, authRoutes); // 5 requests/15min for unauthenticated
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/library', apiRateLimiter, libraryRoutes); // 100 requests/15min for unauthenticated
app.use('/api/categories', apiRateLimiter, libraryRoutes);
app.use('/api/skus', apiRateLimiter, skusRoutes); // 100 requests/15min for unauthenticated
app.use('/api/inventory', strictRateLimiter, inventoryRoutes); // 50 requests/15min for unauthenticated
// New "your" prefixed routes (must be last to avoid catching other routes)
app.use('/api', apiRateLimiter, libraryRoutes);

// 404 handler (must be after all routes, before error handler)
const { notFoundHandler } = require('./middlewares/errorHandler');
app.use(notFoundHandler);

// Error handling middleware (must be last, 4 parameters)
const { errorHandler } = require('./middlewares/errorHandler');
app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

module.exports = app;

