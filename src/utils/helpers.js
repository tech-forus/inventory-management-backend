const xlsx = require('xlsx');

/**
 * Parse Excel file buffer to JSON
 * Handles templates with section headers by detecting and skipping them
 */
const parseExcelFile = (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Check if first row contains section headers (like "Basic Information*", "Vendor & Brand Information*", etc.)
    const firstRowCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: 0 })];
    const hasSectionHeaders = firstRowCell && (
      firstRowCell.v && (
        firstRowCell.v.toString().includes('Basic Information') ||
        firstRowCell.v.toString().includes('Vendor & Brand') ||
        firstRowCell.v.toString().includes('Product Specifications') ||
        firstRowCell.v.toString().includes('Inventory Settings')
      )
    );
    
    // If section headers detected, skip first row and use second row as headers
    if (hasSectionHeaders) {
      return xlsx.utils.sheet_to_json(worksheet, {
        range: 1, // Start from row 2 (0-based index 1)
        defval: null,
        blankrows: false,
      });
    }
    
    // Otherwise, use default parsing (first row as headers)
    return xlsx.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error('Failed to parse Excel file: ' + error.message);
  }
};

/**
 * Parse Excel file buffer to JSON with all sheets
 * Returns an object with sheet names as keys and data arrays as values
 */
const parseExcelFileAllSheets = (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheets = {};
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      sheets[sheetName] = xlsx.utils.sheet_to_json(worksheet);
    });
    return sheets;
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
  parseExcelFileAllSheets,
  toCamelCase,
  transformKeys,
};


