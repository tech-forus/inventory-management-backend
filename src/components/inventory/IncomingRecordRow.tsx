import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Eye, Download, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatNumber, formatDate } from '../../utils/formatters';
import { IncomingInventoryRecord } from './types';
import IncomingRecordItems from './IncomingRecordItems';
import { IncomingInventoryItem } from './types';
import { inventoryService } from '../../services/inventoryService';
import jsPDF from 'jspdf';

interface IncomingRecordRowProps {
  record: IncomingInventoryRecord;
  item: IncomingInventoryItem;
  itemKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEditRejectedShort: (record: IncomingInventoryRecord, item: IncomingInventoryItem) => void;
  onItemsUpdate: (recordId?: number) => void;
}

const IncomingRecordRow: React.FC<IncomingRecordRowProps> = ({
  record,
  item,
  itemKey,
  isExpanded,
  onToggle,
  onEditRejectedShort,
  onItemsUpdate,
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedRejected, setEditedRejected] = useState(item.rejected || 0);
  const [editedShort, setEditedShort] = useState(item.short || 0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const rejectedDropdownRef = useRef<HTMLDivElement>(null);

  // Get item name
  const itemName = item.itemName || item.item_name || 'N/A';
  const skuCode = item.skuCode || item.sku_code || item.skuId || item.sku_id || '-';
  
  // Use item-level quantities instead of record-level
  const itemReceived = item.received || 0;
  const itemRejected = item.rejected || 0;
  const itemShort = item.short || 0;
  const itemTotalQuantity = item.totalQuantity || item.total_quantity || 0;

  // Calculate available quantity:
  // Initially: Available = Received (when rejected = 0, short = initialShort)
  // After rejected is updated: Available = Received - Rejected
  // When short items arrive (short decreases): Available = Received - Rejected + (arrived short items)
  // arrived short items = initialShort - currentShort = (totalQuantity - received) - currentShort
  const initialShort = itemTotalQuantity - itemReceived; // Initial short at creation
  const arrivedShort = Math.max(0, initialShort - itemShort); // Items that arrived from short
  
  const acceptedQuantity = isEditing 
    ? (() => {
        const editingInitialShort = itemTotalQuantity - itemReceived;
        const editingArrivedShort = Math.max(0, editingInitialShort - editedShort);
        return editedRejected > 0 
          ? itemReceived - editedRejected + editingArrivedShort
          : itemReceived + editingArrivedShort;
      })()
    : (itemRejected > 0 
        ? itemReceived - itemRejected + arrivedShort
        : itemReceived + arrivedShort);

  // Sync local state when item prop changes (after updates)
  useEffect(() => {
    if (!isEditing) {
      setEditedRejected(itemRejected);
      setEditedShort(itemShort);
    }
  }, [itemRejected, itemShort, isEditing]);


  const handleOpenRejectedDropdown = () => {
    // Open the expanded section to show item details
    if (!isExpanded) {
      onToggle();
    }
  };

  const handleCancelEdit = () => {
    setEditedRejected(itemRejected);
    setEditedShort(itemShort);
    setIsEditing(false);
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      
      // Get full invoice data with items
      const invoiceData = await inventoryService.getIncomingById(record.id);
      
      if (!invoiceData.success || !invoiceData.data) {
        alert('Failed to fetch invoice data');
        return;
      }

      const invoice = invoiceData.data;
      
      // Get items if not included in response
      let items = invoice.items || [];
      if (items.length === 0) {
        const itemsData = await inventoryService.getIncomingItems(record.id);
        items = itemsData.data || [];
      }

      // Create PDF in A4 format (210mm x 297mm)
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

      // Helper function to add text with word wrap
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, fontStyle: string = 'normal', align: 'left' | 'center' | 'right' = 'left') => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y, { align });
        return lines.length * (fontSize * 0.35); // Approximate line height
      };

      // Header - Centered
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Invoice Details - Two columns layout
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || record.invoiceNumber || `INV-${record.id}`;
      const invoiceDate = formatDate(invoice.invoiceDate || invoice.invoice_date || record.invoiceDate);
      const receivingDate = formatDate(invoice.receivingDate || invoice.receiving_date || record.receivingDate);
      const vendorName = invoice.vendorName || invoice.vendor_name || record.vendorName;
      const brandName = invoice.brandName || invoice.brand_name || record.brandName;
      const receivedBy = invoice.receivedByName || invoice.received_by_name || record.receivedByName || 'N/A';
      const docketNumber = invoice.docketNumber || invoice.docket_number;
      const transportorName = invoice.transportorName || invoice.transportor_name;

      // Left column
      const leftColX = margin;
      const rightColX = margin + contentWidth / 2 + 5;
      let leftY = yPosition;
      let rightY = yPosition;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      pdf.text(`Invoice Number: ${invoiceNumber}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Invoice Date: ${invoiceDate}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Receiving Date: ${receivingDate}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Vendor: ${vendorName}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Brand: ${brandName}`, leftColX, leftY);
      leftY += 6;
      
      pdf.text(`Received By: ${receivedBy}`, leftColX, leftY);
      leftY += 6;

      // Right column (if docket or transportor exists)
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

      // Table headers with better spacing
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const colWidths = [12, 60, 18, 18, 18, 18, 28]; // Adjusted widths for better fit
      const colHeaders = ['S.No', 'Item Name / SKU', 'Total Qty', 'Received', 'Short', 'Rejected', 'Total Value'];
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

      // Items rows with better formatting
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      items.forEach((invItem: any, index: number) => {
        checkNewPage(12);
        
        const itemName = (invItem.item_name || invItem.itemName || 'N/A');
        const skuCode = (invItem.sku_code || invItem.skuCode || invItem.sku_id || 'N/A');
        const totalQty = invItem.total_quantity || invItem.totalQuantity || 0;
        const received = invItem.received || 0;
        const short = invItem.short || 0;
        const rejected = invItem.rejected || 0;
        const totalValue = parseFloat(invItem.total_value || invItem.totalValue || 0) || 0;

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
        
        // Total Qty
        pdf.text(String(totalQty), xPos, yPosition);
        xPos += colWidths[2];
        
        // Received
        pdf.text(String(received), xPos, yPosition);
        xPos += colWidths[3];
        
        // Short
        pdf.text(String(short), xPos, yPosition);
        xPos += colWidths[4];
        
        // Rejected
        pdf.text(String(rejected), xPos, yPosition);
        xPos += colWidths[5];
        
        // Total Value - Bold and larger font
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        const priceText = `₹${totalValue.toFixed(2)}`;
        pdf.text(priceText, xPos, yPosition);
        // Reset font for next row
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        // Move to next row - account for multi-line item names
        yPosition += Math.max(8, itemNameLines.length * 4 + 4);
      });

      yPosition += 8;

      // Summary section with better formatting
      checkNewPage(35);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SUMMARY', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const totalQuantity = invoice.totalQuantity || invoice.total_quantity || record.totalQuantity || 0;
      const totalReceived = invoice.received || record.received || 0;
      const totalShort = invoice.short || record.short || 0;
      const totalRejected = invoice.rejected || record.rejected || 0;
      const totalValue = parseFloat(invoice.totalValue || invoice.total_value || record.totalValue || 0) || 0;

      // Summary items with consistent spacing
      pdf.text(`Total Quantity: ${totalQuantity}`, margin, yPosition);
      yPosition += 7;
      
      pdf.text(`Total Received: ${totalReceived}`, margin, yPosition);
      yPosition += 7;
      
      pdf.text(`Total Short: ${totalShort}`, margin, yPosition);
      yPosition += 7;
      
      pdf.text(`Total Rejected: ${totalRejected}`, margin, yPosition);
      yPosition += 7;
      
      // Total Value - Bold and larger
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`Total Value: ₹${totalValue.toFixed(2)}`, margin, yPosition);
      yPosition += 10;
      
      // Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128); // Gray color
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 10);
      pdf.setTextColor(0, 0, 0); // Reset to black

      // Download PDF
      const invoiceNumberClean = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Invoice_${invoiceNumberClean}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate rejected doesn't exceed received
      if (editedRejected > itemReceived) {
        alert(`Rejected quantity cannot exceed received quantity (${itemReceived})`);
        setLoading(false);
        return;
      }
      
      // Validate that available >= 0
      // Available = Received - Rejected + (arrived short items)
      const initialShort = itemTotalQuantity - itemReceived;
      const arrivedShort = Math.max(0, initialShort - editedShort);
      const available = editedRejected > 0 
        ? itemReceived - editedRejected + arrivedShort
        : itemReceived + arrivedShort;
      if (available < 0) {
        alert(`Invalid quantities: Available (${available}) cannot be negative. Received: ${itemReceived}, Rejected: ${editedRejected}, Arrived Short: ${arrivedShort}`);
        setLoading(false);
        return;
      }
      
      // Get item ID
      const itemId = item.itemId || item.item_id || item.id;
      if (!itemId) {
        alert('Item ID not found');
        setLoading(false);
        return;
      }
      
      // Use item-level update endpoint
      await inventoryService.updateRejectedShort(record.id, {
        itemId: itemId,
        rejected: editedRejected,
        short: editedShort
      });
      
      setIsEditing(false);
      // Refresh items for this record and update parent records list
      await onItemsUpdate(record.id);
      alert('Quantities updated successfully');
    } catch (error: any) {
      console.error('Error updating quantities:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to update quantities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <tr className="group hover:bg-slate-50/40 transition-all min-h-[56px]">
        <td className="px-[30px] py-6 text-center">
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-medium leading-[1.4] text-slate-900">{record.invoiceNumber}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{formatDate(record.invoiceDate)}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{formatDate(record.receivingDate)}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[12.6px] font-semibold leading-[1.4] text-slate-900 block group-hover:text-indigo-600 transition-colors max-w-xs truncate mx-auto" title={itemName}>
            {itemName}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="inline-block text-[11.7px] font-normal leading-[1.4] text-indigo-600 bg-indigo-50/50 px-3 py-[6px] rounded-xl border border-indigo-100/50">
            {skuCode}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{record.vendorName}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[13.5px] font-semibold leading-[1.3] text-slate-900">
          {formatNumber(itemTotalQuantity)}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          {isEditing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-medium text-emerald-700">Accepted:</span>
                <span className="text-[11.7px] font-semibold text-emerald-700">{formatNumber(acceptedQuantity)}</span>
              </div>
              <span className="text-slate-400">|</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-medium text-rose-700">Rejected:</span>
                <input
                  type="number"
                  min="0"
                  max={Math.min(itemReceived, itemTotalQuantity - editedShort)}
                  value={editedRejected}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const maxRejected = itemReceived;
                    if (value >= 0 && value <= maxRejected) {
                      setEditedRejected(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const maxRejected = itemReceived;
                    if (value > maxRejected) {
                      setEditedRejected(maxRejected);
                    } else if (value < 0) {
                      setEditedRejected(0);
                    }
                  }}
                  className="w-20 px-2 py-1 text-[11.7px] border border-rose-300 rounded-lg text-rose-700 font-semibold focus:ring-2 focus:ring-rose-500 mx-auto"
                  title={`Max: ${itemReceived} (Received: ${itemReceived})`}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 relative">
              <div className="flex items-center gap-1">
                <span className="text-[13.5px] font-semibold leading-[1.3] text-emerald-700">{formatNumber(acceptedQuantity)}</span>
              </div>
              <span className="text-slate-400">|</span>
              <div className="flex items-center gap-1 relative" ref={rejectedDropdownRef}>
                <button
                  onClick={handleOpenRejectedDropdown}
                  className="text-[13.5px] font-semibold leading-[1.3] text-rose-700 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="View Item Details"
                >
                  {formatNumber(itemRejected)}
                </button>
              </div>
            </div>
          )}
        </td>
        <td className="px-[30px] py-6 text-center">
          {isEditing ? (
            <input
              type="number"
              min="0"
              max={itemTotalQuantity - editedRejected}
              value={editedShort}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (value >= 0) {
                  setEditedShort(value);
                }
              }}
              onBlur={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (value < 0) {
                  setEditedShort(0);
                }
              }}
              className="w-20 px-2 py-1 text-[11.7px] border border-yellow-300 rounded-lg text-yellow-700 font-semibold focus:ring-2 focus:ring-yellow-500 mx-auto"
              title={`Short quantity (items not yet received). When items arrive, reduce short to update stock.`}
            />
          ) : (
            <span className="text-[13.5px] font-semibold leading-[1.3] text-yellow-700">
              {formatNumber(itemShort)}
            </span>
          )}
        </td>
        <td className="px-[30px] py-6 text-center">
          {isEditing ? (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                title="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onEditRejectedShort(record, item)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Item"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownloadInvoice}
                disabled={downloading}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                title="Download Invoice"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/30">
          <td colSpan={11} className="px-[30px] py-[18px]">
            <IncomingRecordItems
              record={record}
              items={[item]}
              onItemsUpdate={onItemsUpdate}
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default IncomingRecordRow;

