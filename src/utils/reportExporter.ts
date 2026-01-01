// Report Export Utilities for PDF and Excel
// Note: Install required packages: npm install jspdf jspdf-autotable xlsx

interface ReportData {
  headers: string[];
  rows: any[][];
  title: string;
  dateRange?: string;
}

/**
 * Export data to PDF format
 */
export const exportToPDF = async (data: ReportData) => {
  try {
    // Dynamic import to avoid SSR issues
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    
    const { jsPDF } = jsPDFModule;
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.text(data.title, 14, 15);
    
    // Add date range if provided
    if (data.dateRange) {
      doc.setFontSize(10);
      doc.text(data.dateRange, 14, 22);
    }
    
    // Add table
    autoTableModule.default(doc, {
      head: [data.headers],
      body: data.rows,
      startY: data.dateRange ? 28 : 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    
    // Save the PDF
    doc.save(`${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('PDF export library not installed. Please install: npm install jspdf jspdf-autotable');
  }
};

/**
 * Export data to Excel format
 */
export const exportToExcel = async (data: ReportData) => {
  try {
    const XLSX = await import('xlsx');
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare data with title
    const excelData: any[][] = [];
    
    // Add title row
    excelData.push([data.title]);
    if (data.dateRange) {
      excelData.push([data.dateRange]);
      excelData.push([]); // Empty row
    }
    
    // Add headers
    excelData.push(data.headers);
    
    // Add data rows
    data.rows.forEach(row => excelData.push(row));
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const colWidths = data.headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    
    // Merge title cells
    if (excelData.length > 0) {
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: data.headers.length - 1 } }
      ];
      if (data.dateRange) {
        ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: data.headers.length - 1 } });
      }
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Save file
    XLSX.writeFile(wb, `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Excel export library not installed. Please install: npm install xlsx');
  }
};

/**
 * Format date range string
 */
export const formatDateRange = (dateFrom: string, dateTo: string): string => {
  if (!dateFrom && !dateTo) return '';
  const from = dateFrom ? new Date(dateFrom).toLocaleDateString() : 'Start';
  const to = dateTo ? new Date(dateTo).toLocaleDateString() : 'End';
  return `Date Range: ${from} to ${to}`;
};

/**
 * Get date range based on months
 */
export const getDateRangeFromMonths = (months: number): { dateFrom: string; dateTo: string } => {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - months);
  
  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0],
  };
};

