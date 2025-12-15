require('dotenv').config();

/**
 * Database Configuration
 * Centralized configuration for database connections
 */

// Default Railway connection (provided by user) used only when no DATABASE_URL is set
const DEFAULT_RAILWAY_URL = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

// Helper to parse a database URL (Railway, Heroku, etc.)
function parseDatabaseUrl(urlString) {
  if (!urlString) return null;
  const url = new URL(urlString);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading '/'
    user: url.username,
    password: url.password,
    ssl:
      url.protocol === 'postgresql:' || url.protocol === 'postgres:'
        ? { rejectUnauthorized: false } // Railway requires SSL but doesn't provide CA cert
        : false,
  };
}

// Parse DATABASE_URL if available
// Priority: DATABASE_URL -> RAILWAY_DATABASE_URL -> default Railway URL (production only)
const resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.RAILWAY_DATABASE_URL ||
  (process.env.NODE_ENV === 'production' ? DEFAULT_RAILWAY_URL : null);

const urlConfig = parseDatabaseUrl(resolvedDbUrl);

const dbConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'inventory_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'forus',
    ssl: false, // No SSL for local development
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || process.env.DB_NAME_TEST || 'inventory_db_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'forus',
    ssl: false, // No SSL for local testing
  },
  production: urlConfig || {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // SSL configuration for production (Railway, Heroku, etc.)
    ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost')
      ? { rejectUnauthorized: false } // Required for Railway/cloud providers
      : false,
  },
};

const env = process.env.NODE_ENV || 'development';

module.exports = {
  ...dbConfig[env],
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

