import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { IncomingInventoryRecord, IncomingInventoryItem } from './types';
import IncomingRecordRow from './IncomingRecordRow';

interface IncomingRecordsTableProps {
  records: IncomingInventoryRecord[];
  loading: boolean;
  expandedRows: Set<string>;
  recordItems: Record<number, IncomingInventoryItem[]>;
  onToggleRow: (itemKey: string) => void;
  onEditRejectedShort: (record: IncomingInventoryRecord, item: IncomingInventoryItem) => void;
  onItemsUpdate: (recordId?: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  SortIcon?: ({ field }: { field: string }) => React.ReactNode;
  search?: string;
}

interface FlattenedItem {
  record: IncomingInventoryRecord;
  item: IncomingInventoryItem;
  itemKey: string;
}

const IncomingRecordsTable: React.FC<IncomingRecordsTableProps> = ({
  records,
  loading,
  expandedRows,
  recordItems,
  onToggleRow,
  onEditRejectedShort,
  onItemsUpdate,
  sortBy,
  sortOrder,
  onSort,
  SortIcon,
  search: searchProp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const search = searchProp !== undefined ? searchProp : searchTerm;

  // Flatten records and items into individual rows
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    
    records.forEach((record) => {
      const itemsForRecord = recordItems[record.id] || [];
      
      if (itemsForRecord.length > 0) {
        // If items are loaded, create a row for each item
        itemsForRecord.forEach((item) => {
          const itemId = item.itemId || item.item_id || item.id || 0;
          items.push({
            record,
            item,
            itemKey: `${record.id}-${itemId}`,
          });
        });
      } else {
        // If no items loaded yet, create a placeholder row with record data
        // This will be replaced once items are loaded
        items.push({
          record,
          item: {
            id: 0,
            itemName: 'Loading...',
            received: record.received || 0,
            short: record.short || 0,
            rejected: record.rejected || 0,
            totalQuantity: record.totalQuantity || 0,
          },
          itemKey: `${record.id}-0`,
        });
      }
    });
    
    // Apply sorting if sortBy is provided
    if (sortBy && sortOrder && items.length > 0) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (sortBy) {
          case 'invoiceDate':
            aValue = new Date(a.record.invoiceDate || a.record.invoice_date || 0).getTime();
            bValue = new Date(b.record.invoiceDate || b.record.invoice_date || 0).getTime();
            break;
          case 'receivingDate':
            aValue = new Date(a.record.receivingDate || a.record.receiving_date || 0).getTime();
            bValue = new Date(b.record.receivingDate || b.record.receiving_date || 0).getTime();
            break;
          case 'itemName':
            aValue = (a.item.itemName || a.item.item_name || '').toLowerCase();
            bValue = (b.item.itemName || b.item.item_name || '').toLowerCase();
            break;
          case 'vendor':
            aValue = (a.record.vendorName || a.record.vendor_name || '').toLowerCase();
            bValue = (b.record.vendorName || b.record.vendor_name || '').toLowerCase();
            break;
          case 'totalQuantity':
            aValue = a.item.totalQuantity || a.item.total_quantity || 0;
            bValue = b.item.totalQuantity || b.item.total_quantity || 0;
            break;
          case 'available':
            const aReceived = a.item.received || 0;
            const aRejected = a.item.rejected || 0;
            const aTotalQty = a.item.totalQuantity || a.item.total_quantity || 0;
            const aInitialShort = aTotalQty - aReceived;
            const aArrivedShort = Math.max(0, aInitialShort - (a.item.short || 0));
            aValue = aRejected > 0 ? aReceived - aRejected + aArrivedShort : aReceived + aArrivedShort;
            
            const bReceived = b.item.received || 0;
            const bRejected = b.item.rejected || 0;
            const bTotalQty = b.item.totalQuantity || b.item.total_quantity || 0;
            const bInitialShort = bTotalQty - bReceived;
            const bArrivedShort = Math.max(0, bInitialShort - (b.item.short || 0));
            bValue = bRejected > 0 ? bReceived - bRejected + bArrivedShort : bReceived + bArrivedShort;
            break;
          case 'rejected':
            aValue = a.item.rejected || 0;
            bValue = b.item.rejected || 0;
            break;
          case 'short':
            aValue = a.item.short || 0;
            bValue = b.item.short || 0;
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortOrder === 'asc' 
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
        }
      });
    }
    
    // Apply search filter if search is provided
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      return items.filter((item) => {
        const invoiceNumber = (item.record.invoiceNumber || item.record.invoice_number || '').toLowerCase();
        const invoiceDate = (item.record.invoiceDate || item.record.invoice_date || '').toLowerCase();
        const receivingDate = (item.record.receivingDate || item.record.receiving_date || '').toLowerCase();
        const itemName = (item.item.itemName || item.item.item_name || '').toLowerCase();
        const skuId = (item.item.skuId?.toString() || item.item.sku_id?.toString() || item.item.skuCode || item.item.sku_code || '').toLowerCase();
        const vendorName = (item.record.vendorName || item.record.vendor_name || '').toLowerCase();
        const brandName = (item.record.brandName || item.record.brand_name || '').toLowerCase();
        const challanNumber = (item.item.challanNumber || item.item.challan_number || '').toLowerCase();
        
        return (
          invoiceNumber.includes(searchLower) ||
          invoiceDate.includes(searchLower) ||
          receivingDate.includes(searchLower) ||
          itemName.includes(searchLower) ||
          skuId.includes(searchLower) ||
          vendorName.includes(searchLower) ||
          brandName.includes(searchLower) ||
          challanNumber.includes(searchLower)
        );
      });
    }
    
    return items;
  }, [records, recordItems, sortBy, sortOrder, search]);

  return (
    <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-lg overflow-hidden">
      {/* Search Bar - Only show if search prop is not provided (internal search) */}
      {searchProp === undefined && (
        <div className="p-[18px] border-b border-slate-100">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="SEARCH BY INVOICE NUMBER, ITEM NAME, SKU ID, VENDOR, BRAND..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 text-[11.7px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[11.7px] placeholder:font-normal placeholder:tracking-[0.05em] text-slate-800 pl-9 pr-3 py-[9px] rounded-[1.125rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-center mx-auto">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center w-9"></th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Invoice Number
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('invoiceDate')}
              >
                <div className="flex items-center justify-center gap-2">
                  Invoice Date
                  {SortIcon && <SortIcon field="invoiceDate" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('receivingDate')}
              >
                <div className="flex items-center justify-center gap-2">
                  Receiving Date
                  {SortIcon && <SortIcon field="receivingDate" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('itemName')}
              >
                <div className="flex items-center justify-center gap-2">
                  Item Name
                  {SortIcon && <SortIcon field="itemName" />}
                </div>
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                SKU ID
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('vendor')}
              >
                <div className="flex items-center justify-center gap-2">
                  Vendor
                  {SortIcon && <SortIcon field="vendor" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('totalQuantity')}
              >
                <div className="flex items-center justify-center gap-2">
                  Total Quantity
                  {SortIcon && <SortIcon field="totalQuantity" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('available')}
              >
                <div className="flex items-center justify-center gap-2">
                  Available | Rejected
                  {SortIcon && <SortIcon field="available" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('short')}
              >
                <div className="flex items-center justify-center gap-2">
                  Short
                  {SortIcon && <SortIcon field="short" />}
                </div>
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
                  No incoming inventory records found
                </td>
              </tr>
            ) : (
              flattenedItems.map((flattenedItem) => (
                <IncomingRecordRow
                  key={flattenedItem.itemKey}
                  record={flattenedItem.record}
                  item={flattenedItem.item}
                  itemKey={flattenedItem.itemKey}
                  isExpanded={expandedRows.has(flattenedItem.itemKey)}
                  onToggle={() => onToggleRow(flattenedItem.itemKey)}
                  onEditRejectedShort={onEditRejectedShort}
                  onItemsUpdate={onItemsUpdate}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncomingRecordsTable;

