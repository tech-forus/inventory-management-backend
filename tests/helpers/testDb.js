const db = require('../../src/models/database');

/**
 * Test Database Helper
 * Provides transaction-based isolation for tests
 */
exports.begin = async () => {
  await db.query('BEGIN;');
};

exports.rollback = async () => {
  await db.query('ROLLBACK;');
};

exports.commit = async () => {
  await db.query('COMMIT;');
};

/**
 * Generate unique GST number for tests
 * Format: 29TEST{random}Z5 (15 chars max)
 * GST format: 2 chars state + 10 chars PAN + 1 char entity + 1 char blank + 1 char check digit
 * For tests: 29TEST{6 random digits/letters}Z5 = 15 chars
 */
exports.uniqueGST = () => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, '0');
  return `29TEST${random}Z5`;
};

