require('dotenv').config();
const app = require('./app');
const pool = require('./models/database');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info({ signal }, 'Graceful shutdown initiated');
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info({}, 'HTTP server closed');
    
    try {
      // Close database pool
      await pool.end();
      logger.info({}, 'Database pool closed');
      
      logger.info({}, 'Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error: error.message }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error({}, 'Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, async () => {
  logger.info(
    {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      apiUrl: `http://localhost:${PORT}`,
    },
    'Server started'
  );

  // Log CORS env for debugging
  logger.info(
    {
      corsOriginsEnv: process.env.CORS_ORIGINS || null,
    },
    'CORS_ORIGINS environment value'
  );
  
  // Check database connection
  try {
    await pool.query('SELECT 1 as test');
    logger.info({}, 'Database connection established');
  } catch (error) {
    logger.error({ error: error.message }, 'Database connection failed');
    process.exit(1);
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
  gracefulShutdown('unhandledRejection');
});
