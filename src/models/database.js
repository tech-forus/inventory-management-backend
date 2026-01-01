const { Pool } = require('pg');
const dbConfig = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Database connection pool
 * Singleton pattern to ensure single pool instance
 */
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unexpected error on idle database client');
  process.exit(-1);
});

module.exports = pool;


