const pool = require('../models/database');
const { logger } = require('./logger');

/**
 * Executes a function within a database transaction
 * @param {Function} fn - Async function to execute, receives the database client
 * @param {string} label - Context label for logging/observability
 */
async function withTx(fn, label = 'unlabeled') {
    const client = await pool.connect();
    const start = Date.now();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');

        const duration = Date.now() - start;
        logger.info({
            msg: '[DB TRANSACTION SUCCESS]',
            label,
            ms: duration
        });

        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        const duration = Date.now() - start;
        logger.error({
            msg: '[DB TRANSACTION FAILED]',
            label,
            ms: duration,
            error: e.message
        });
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Measure query duration helper
 */
async function measure(label, fn) {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.info({ msg: '[DB QUERY]', label, ms: duration });
        return result;
    } catch (e) {
        const duration = Date.now() - start;
        logger.error({ msg: '[DB QUERY FAILED]', label, ms: duration, error: e.message });
        throw e;
    }
}

module.exports = {
    withTx,
    measure
};
