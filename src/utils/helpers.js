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
    
    // Find the header row by looking for "Product Category" in the first few rows
    let headerRow = 0; // Default: first row
    const maxSearchRows = 5;
    
    for (let i = 0; i < maxSearchRows; i++) {
      const cellA = worksheet[xlsx.utils.encode_cell({ r: i, c: 0 })];
      if (cellA && cellA.v) {
        const cellValue = cellA.v.toString().toLowerCase().trim();
        // Check if this row contains "Product Category" (likely the header row)
        if (cellValue.includes('product category')) {
          headerRow = i;
          break;
        }
      }
    }
    
    // Data starts from the row after headers
    const dataStartRow = headerRow + 1;
    
    // Parse using the detected header row
    return xlsx.utils.sheet_to_json(worksheet, {
      range: headerRow, // Use detected header row
      defval: null,
      blankrows: false,
    });
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

/**
 * Normalize search term by removing all spaces
 * Used for space-insensitive search matching
 */
const normalizeSearchTerm = (searchTerm) => {
  if (!searchTerm) return '';
  return searchTerm.replace(/\s+/g, '').trim();
};

module.exports = {
  parseExcelFile,
  parseExcelFileAllSheets,
  toCamelCase,
  transformKeys,
  normalizeSearchTerm,
};


