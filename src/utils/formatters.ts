/**
 * Format currency to Indian Rupee format
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Format number with Indian number system
 */
export const formatNumber = (num: number | string): string => {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0';
  return new Intl.NumberFormat('en-IN').format(number);
};

/**
 * Format date to DD/MM/YYYY
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(d);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format phone number
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  return phone;
};

/**
 * Format GST number
 */
export const formatGST = (gst: string): string => {
  if (!gst) return '';
  // GST format: 15 characters (2 state + 10 PAN + 3)
  if (gst.length === 15) {
    return `${gst.substring(0, 2)}${gst.substring(2, 12)}${gst.substring(12)}`;
  }
  return gst;
};

/**
 * Get date range for preset filters
 */
export const getDateRange = (preset: string): { dateFrom: string; dateTo: string } | null => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  let dateFrom: Date;
  let dateTo: Date = today;

  switch (preset) {
    case '1month':
      dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      break;
    case '3months':
      dateFrom = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      break;
    case '6months':
      dateFrom = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      break;
    case '1year':
      dateFrom = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      break;
    case 'thisFinancialYear': {
      // Financial year in India: April 1 to March 31
      const currentMonth = today.getMonth(); // 0-11
      const currentYear = today.getFullYear();
      if (currentMonth >= 3) {
        // April (3) to December (11) - current financial year
        dateFrom = new Date(currentYear, 3, 1); // April 1
        dateTo = new Date(currentYear + 1, 2, 31); // March 31
      } else {
        // January (0) to March (2) - current financial year started last year
        dateFrom = new Date(currentYear - 1, 3, 1); // April 1 of previous year
        dateTo = new Date(currentYear, 2, 31); // March 31 of current year
      }
      return {
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
      };
    }
    case 'previousFinancialYear': {
      // Previous financial year
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      if (currentMonth >= 3) {
        // Current FY started this year, previous FY was last year
        dateFrom = new Date(currentYear - 1, 3, 1); // April 1 of previous year
        dateTo = new Date(currentYear, 2, 31); // March 31 of current year
      } else {
        // Current FY started last year, previous FY was year before
        dateFrom = new Date(currentYear - 2, 3, 1); // April 1 of year before
        dateTo = new Date(currentYear - 1, 2, 31); // March 31 of last year
      }
      return {
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
      };
    }
    case 'custom':
      return null; // Custom dates handled separately
    default:
      return null;
  }

  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: todayStr,
  };
};

