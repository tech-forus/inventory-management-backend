# Reports Feature Installation Guide

## Overview

The Reports feature allows users to generate and download reports in PDF and Excel formats for:
- Total SKUs
- IN/OUT Inventory
- Dead Inventory (Non-Movable SKUs)
- Most Selling SKUs
- Rejected Items

## Installation Steps

### 1. Install Required Packages

Run the following command in the `frontend1final` directory:

```bash
npm install jspdf jspdf-autotable xlsx
```

Or if using yarn:

```bash
yarn add jspdf jspdf-autotable xlsx
```

### 2. Verify Installation

After installation, verify that the packages are added to `package.json`:

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "xlsx": "^0.18.5"
  }
}
```

### 3. Access the Reports Page

Navigate to `/app/reports` in your application to access the Reports page.

## Features

### Date Range Filters

- **Quick Periods**: 1, 3, 6, or 12 months
- **Custom Dates**: Select custom start and end dates
- Date range is automatically calculated for period selections

### Report Types

1. **Total SKUs Report**
   - All SKUs with stock information
   - Includes: SKU ID, Item Name, Brand, Category, Stock levels, Prices

2. **IN/OUT Inventory Report**
   - Combined incoming and outgoing inventory transactions
   - Includes: Type, Invoice Number, Date, Vendor, Items, Values

3. **Dead Inventory Report**
   - Non-movable SKUs (no sales in selected period)
   - Includes: SKU details, Stock levels, Inventory value, Aging

4. **Most Selling SKUs Report**
   - Top selling SKUs ranked by units sold
   - Includes: Rank, SKU details, Units sold, Revenue

5. **Rejected Item Report**
   - All rejected item reports
   - Includes: Report Number, Inspection Date, SKU, Quantity, Status

### Export Formats

- **PDF Export**: Professional PDF documents with formatted tables
- **Excel Export**: Spreadsheet files (.xlsx) with proper formatting

## Usage

1. Select a report type from the available options
2. Choose a date range (period or custom dates)
3. Click "Download PDF" or "Download Excel"
4. The file will be automatically downloaded with a timestamped filename

## File Naming Convention

Files are named as: `{Report_Title}_{YYYY-MM-DD}.{extension}`

Example:
- `Total_SKUs_Report_2024-12-15.pdf`
- `IN_OUT_Inventory_Report_2024-12-15.xlsx`

## Troubleshooting

### Error: "PDF export library not installed"
- Run: `npm install jspdf jspdf-autotable`

### Error: "Excel export library not installed"
- Run: `npm install xlsx`

### Reports not loading
- Check browser console for API errors
- Verify backend services are running
- Ensure date ranges are valid

## Notes

- Reports are generated client-side using the current filtered data
- Large datasets may take a few seconds to process
- PDF files use landscape orientation for better table display
- Excel files include merged title cells for better formatting

