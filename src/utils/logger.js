const pino = require('pino');

/**
 * Create logger instance
 * In production, logs are JSON formatted for easy parsing
 * In development, logs are pretty printed for readability
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV === 'production' 
    ? undefined // Use default JSON output in production
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Generate a unique request ID
 */
const generateRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  logger,
  generateRequestId,
};

