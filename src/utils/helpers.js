const xlsx = require('xlsx');

/**
 * Parse Excel file buffer to JSON
 */
const parseExcelFile = (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error('Failed to parse Excel file: ' + error.message);
  }
};

/**
 * Transform snake_case object to camelCase
 */
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Transform object keys from snake_case to camelCase
 */
const transformKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const transformed = {};
    for (const key in obj) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = typeof obj[key] === 'object' ? transformKeys(obj[key]) : obj[key];
    }
    return transformed;
  }
  
  return obj;
};

module.exports = {
  parseExcelFile,
  toCamelCase,
  transformKeys,
};


