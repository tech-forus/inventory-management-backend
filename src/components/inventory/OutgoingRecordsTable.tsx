import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { OutgoingInventoryRecord, OutgoingInventoryItem } from './types';
import OutgoingRecordRow from './OutgoingRecordRow';
import { inventoryService } from '../../services/inventoryService';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import jsPDF from 'jspdf';

interface OutgoingRecordsTableProps {
  records: OutgoingInventoryRecord[];
  loading: boolean;
  expandedRows: Set<string>;
  recordItems: Record<number, OutgoingInventoryItem[]>;
  onToggleRow: (itemKey: string) => void;
}

interface FlattenedItem {
  record: OutgoingInventoryRecord;
  item: OutgoingInventoryItem;
  itemKey: string;
}

const OutgoingRecordsTable: React.FC<OutgoingRecordsTableProps> = ({
  records,
  loading,
  expandedRows,
  recordItems,
  onToggleRow,
}) => {
  // View details modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OutgoingInventoryRecord | null>(null);
  const [selectedRecordItems, setSelectedRecordItems] = useState<OutgoingInventoryItem[]>([]);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleViewDetails = async (recordId: number) => {
    try {
      setLoadingRecord(true);
      const response = await inventoryService.getOutgoingById(recordId);
      
      if (response?.success && response.data) {
        setSelectedRecord(response.data);
        setSelectedRecordItems(response.data.items || []);
        setViewModalOpen(true);
      } else if (response?.data) {
        setSelectedRecord(response.data);
        setSelectedRecordItems(response.data.items || []);
        setViewModalOpen(true);
      } else {
        alert('Failed to load record details');
      }
    } catch (error) {
      console.error('Error loading record details:', error);
      alert('Failed to load record details');
    } finally {
      setLoadingRecord(false);
    }
  };

  const getDocumentTypeLabel = (documentType: string, documentSubType?: string, vendorSubType?: string, deliveryChallanSubType?: string) => {
    let label = documentType?.replace(/_/g, ' ') || '';
    if (documentSubType) {
      label += ` - ${documentSubType.replace(/_/g, ' ')}`;
    }
    if (vendorSubType) {
      label += ` - ${vendorSubType.replace(/_/g, ' ')}`;
    }
    if (deliveryChallanSubType) {
      label += ` - ${deliveryChallanSubType.replace(/_/g, ' ')}`;
    }
    return label;
  };

  const handleDownloadInvoice = async (recordId: number) => {
    try {
      setDownloading(true);
      
      // Get full record data with items
      const response = await inventoryService.getOutgoingById(recordId);
      
      if (!response?.success || !response.data) {
        if (!response?.data) {
          alert('Failed to fetch invoice data');
          return;
        }
      }

      const record = response.data || response?.data;
      const items = record.items || [];
      
      if (items.length === 0) {
        alert('No items found in this record');
        return;
      }

      // Create PDF in A4 format
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkNewPage = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header - Centered
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const documentTypeLabel = getDocumentTypeLabel(
        record.documentType || '',
        record.documentSubType,
        record.vendorSubType,
        record.deliveryChallanSubType
      );
      pdf.text(documentTypeLabel.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Document Details - Two columns layout
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const invoiceChallanNumber = record.invoiceChallanNumber || (record as any).invoice_challan_number || `DOC-${record.id}`;
      const invoiceChallanDate = formatDate(record.invoiceChallanDate || (record as any).invoice_challan_date);
      const docketNumber = record.docketNumber || (record as any).docket_number || '';
      const transportorName = record.transportorName || (record as any).transportor_name || '';
      const destinationName = record.destinationName || (record as any).destination_name || 'N/A';
      const destinationType = record.destinationType || (record as any).destination_type || '';
      const dispatchedByName = record.dispatchedByName || (record as any).dispatched_by_name || 'N/A';
      const remarks = record.remarks || '';

      // Left column
      const leftColX = margin;
      const rightColX = margin + contentWidth / 2 + 5;
      let leftY = yPosition;
      let rightY = yPosition;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      pdf.text(`Document Number: ${invoiceChallanNumber}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Date: ${invoiceChallanDate}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Destination Type: ${destinationType.replace(/_/g, ' ')}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Destination: ${destinationName}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Dispatched By: ${dispatchedByName}`, leftColX, leftY);
      leftY += 6;

      // Right column
      if (docketNumber) {
        pdf.text(`Docket Number: ${docketNumber}`, rightColX, rightY);
        rightY += 6;
      }
      if (transportorName) {
        pdf.text(`Transporter: ${transportorName}`, rightColX, rightY);
        rightY += 6;
      }

      // Use the maximum Y position from both columns
      yPosition = Math.max(leftY, rightY) + 8;

      // Items Table Header
      checkNewPage(20);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ITEMS', margin, yPosition);
      yPosition += 8;

      // Table headers
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const colWidths = [12, 60, 25, 25, 28];
      const colHeaders = ['S.No', 'Item Name / SKU', 'Quantity', 'Unit Price', 'Total Value'];
      let xPos = margin;
      
      colHeaders.forEach((header, index) => {
        pdf.text(header, xPos, yPosition);
        xPos += colWidths[index];
      });
      
      yPosition += 5;
      
      // Draw line under header
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
      yPosition += 4;

      // Items rows
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      items.forEach((item: any, index: number) => {
        checkNewPage(12);
        
        const itemName = item.itemName || item.item_name || 'N/A';
        const skuCode = item.skuCode || item.sku_code || item.skuId || item.sku_id || 'N/A';
        const quantity = item.outgoingQuantity || item.outgoing_quantity || 0;
        const unitPrice = parseFloat(item.unitPrice || item.unit_price || 0) || 0;
        const totalValue = parseFloat(item.totalValue || item.total_value || 0) || 0;

        xPos = margin;
        // S.No
        pdf.text(String(index + 1), xPos, yPosition);
        xPos += colWidths[0];
        
        // Item Name and SKU
        const itemNameLines = pdf.splitTextToSize(itemName, colWidths[1] - 2);
        pdf.text(itemNameLines, xPos, yPosition);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`SKU: ${skuCode}`, xPos, yPosition + (itemNameLines.length * 4) + 2);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        xPos += colWidths[1];
        
        // Quantity
        pdf.text(String(quantity), xPos, yPosition);
        xPos += colWidths[2];
        
        // Unit Price - Bold and larger font
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        const unitPriceText = `₹${unitPrice.toFixed(2)}`;
        pdf.text(unitPriceText, xPos, yPosition);
        xPos += colWidths[3];
        
        // Total Value - Bold and larger font (font already set)
        const totalValueText = `₹${totalValue.toFixed(2)}`;
        pdf.text(totalValueText, xPos, yPosition);
        // Reset font for next row
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        // Move to next row
        yPosition += Math.max(8, itemNameLines.length * 4 + 4);
      });

      yPosition += 8;

      // Summary section
      checkNewPage(30);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SUMMARY', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const totalQuantity = record.totalQuantity || items.reduce((sum: number, item: any) => sum + (item.outgoingQuantity || item.outgoing_quantity || 0), 0);
      const totalValue = parseFloat(record.totalValue || items.reduce((sum: number, item: any) => sum + (item.totalValue || item.total_value || 0), 0)) || 0;

      pdf.text(`Total Quantity: ${totalQuantity}`, margin, yPosition);
      yPosition += 7;
      
      // Total Value - Bold and larger
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`Total Value: ₹${totalValue.toFixed(2)}`, margin, yPosition);
      yPosition += 10;

      // Remarks if available
      if (remarks) {
        checkNewPage(15);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('Remarks:', margin, yPosition);
        yPosition += 6;
        pdf.setFontSize(9);
        const remarksLines = pdf.splitTextToSize(remarks, contentWidth);
        pdf.text(remarksLines, margin, yPosition);
        yPosition += remarksLines.length * 4 + 5;
      }
      
      // Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 10);
      pdf.setTextColor(0, 0, 0);

      // Download PDF
      const documentNumberClean = invoiceChallanNumber.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${documentTypeLabel.replace(/\s+/g, '_')}_${documentNumberClean}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  // Flatten records and items into individual rows
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    
    records.forEach((record) => {
      const itemsForRecord = recordItems[record.id] || [];
      
      if (itemsForRecord.length > 0) {
        // If items are loaded, create a row for each item
        itemsForRecord.forEach((item) => {
          const itemId = item.id || 0;
          items.push({
            record,
            item,
            itemKey: `${record.id}-${itemId}`,
          });
        });
      } else {
        // If no items loaded yet, create a placeholder row with record summary
        items.push({
          record,
          item: {
            id: 0,
            skuId: 0,
            skuCode: '-',
            itemName: 'Loading items...',
            outgoingQuantity: record.totalQuantity || 0,
            unitPrice: 0,
            totalValue: record.totalValue || 0,
          },
          itemKey: `${record.id}-0`,
        });
      }
    });
    
    return items;
  }, [records, recordItems]);

  return (
    <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-center mx-auto">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center w-9"></th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Invoice/Challan Number
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Date
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Document Type
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Item Name
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                SKU ID
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Customer
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Quantity
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Total Value
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Status
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-10 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : flattenedItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-10 py-12 text-center text-slate-500 font-medium">
                  No outgoing inventory records found
                </td>
              </tr>
            ) : (
              flattenedItems.map((flattenedItem) => (
                <OutgoingRecordRow
                  key={flattenedItem.itemKey}
                  record={flattenedItem.record}
                  item={flattenedItem.item}
                  itemKey={flattenedItem.itemKey}
                  isExpanded={expandedRows.has(flattenedItem.itemKey)}
                  onToggle={() => onToggleRow(flattenedItem.itemKey)}
                  onViewDetails={() => handleViewDetails(flattenedItem.record.id)}
                  onDownloadInvoice={() => handleDownloadInvoice(flattenedItem.record.id)}
                  downloading={downloading}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {viewModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Outgoing Record Details</h2>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedRecord(null);
                  setSelectedRecordItems([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Document Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Document Type</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {getDocumentTypeLabel(
                        selectedRecord.documentType || '',
                        selectedRecord.documentSubType,
                        selectedRecord.vendorSubType,
                        selectedRecord.deliveryChallanSubType
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedRecord.status || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Document Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Invoice/Challan Date</label>
                    <p className="text-sm text-gray-900">
                      {selectedRecord.invoiceChallanDate ? formatDate(selectedRecord.invoiceChallanDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Invoice/Challan Number</label>
                    <p className="text-sm text-gray-900">
                      {selectedRecord.invoiceChallanNumber || 
                       (selectedRecord as any).invoice_challan_number || 
                       '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Docket Number</label>
                    <p className="text-sm text-gray-900">
                      {selectedRecord.docketNumber || 
                       (selectedRecord as any).docket_number || 
                       '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Transportor Name</label>
                    <p className="text-sm text-gray-900">
                      {selectedRecord.transportorName || 
                       (selectedRecord as any).transportor_name || 
                       '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Destination</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Destination Type</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {selectedRecord.destinationType?.replace(/_/g, ' ') || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Destination Name</label>
                    <p className="text-sm text-gray-900">{selectedRecord.destinationName || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h3>
                {selectedRecordItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No items found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Outgoing Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedRecordItems.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{item.itemName || item.item_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{item.skuCode || item.sku_code || item.skuId || item.sku_id || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(item.outgoingQuantity || item.outgoing_quantity || 0)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unitPrice || item.unit_price || 0)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                              {formatCurrency(item.totalValue || item.total_value || 0)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">Total</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatNumber(selectedRecordItems.reduce((sum, item) => sum + (item.outgoingQuantity || item.outgoing_quantity || 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">-</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(selectedRecordItems.reduce((sum, item) => sum + (item.totalValue || item.total_value || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Dispatched By</label>
                    <p className="text-sm text-gray-900">{selectedRecord.dispatchedByName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Remarks</label>
                    <p className="text-sm text-gray-900">{selectedRecord.remarks || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Total Quantity</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatNumber(selectedRecord.totalQuantity || selectedRecordItems.reduce((sum, item) => sum + (item.outgoingQuantity || item.outgoing_quantity || 0), 0))}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Total Value</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(selectedRecord.totalValue || selectedRecordItems.reduce((sum, item) => sum + (item.totalValue || item.total_value || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedRecord(null);
                  setSelectedRecordItems([]);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutgoingRecordsTable;

