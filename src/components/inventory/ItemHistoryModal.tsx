import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { X, Loader2, RefreshCw } from 'lucide-react';
import { formatNumber, formatDate } from '../../utils/formatters';
import { inventoryService } from '../../services/inventoryService';
import { IncomingInventoryItem } from './types';

interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: IncomingInventoryItem;
  itemName: string;
  skuCode: string;
}

export interface ItemHistoryModalRef {
  refresh: () => void;
}

interface HistoryRecord {
  id: number;
  itemId?: number;
  invoiceNumber: string;
  invoiceDate: string;
  receivingDate: string;
  itemName: string;
  skuId?: string;
  skuCode?: string;
  vendorName: string;
  totalQuantity: number;
  received: number;
  rejected: number;
  short: number;
  challanNumber?: string;
  challanDate?: string;
  updatedAt?: string;
  uniqueKey: string; // Unique identifier for deduplication
}

const ItemHistoryModal = forwardRef<ItemHistoryModalRef, ItemHistoryModalProps>(({
  isOpen,
  onClose,
  item: _item,
  itemName,
  skuCode,
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: loadHistory
  }));

  useEffect(() => {
    if (isOpen && skuCode) {
      // Load history when modal opens
      loadHistory();
    }
  }, [isOpen, skuCode]);
  
  // Reset history when SKU changes
  useEffect(() => {
    if (skuCode) {
      setHistory([]);
    }
  }, [skuCode]);
  
  // Auto-refresh history when item data changes (after updates)
  // Only refresh if modal is open and values actually changed
  const prevItemRef = useRef<IncomingInventoryItem | null>(null);
  useEffect(() => {
    if (isOpen && skuCode && _item) {
      const prevItem = prevItemRef.current;
      const itemChanged = !prevItem || 
        prevItem.rejected !== _item.rejected ||
        prevItem.short !== _item.short ||
        prevItem.received !== _item.received;
      
      if (itemChanged) {
        // Small delay to ensure backend has updated
        const timer = setTimeout(() => {
          console.log('🔄 Auto-refreshing history due to item change');
          loadHistory();
        }, 1000); // Increased delay to ensure backend has processed
        prevItemRef.current = _item;
        return () => clearTimeout(timer);
      }
    }
    prevItemRef.current = _item;
  }, [_item?.rejected, _item?.short, _item?.received, isOpen, skuCode]);

  const loadHistory = async () => {
    if (!skuCode) {
      setError('SKU Code is required to load history');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch history using SKU filter
      const response = await inventoryService.getIncomingHistory({
        sku: skuCode,
      });

      if (response.success && response.data) {
        // Transform the history data to include item-level details
        const historyData = response.data;
        
        // If the history is grouped by invoice, we need to fetch items for each record
        const detailedHistory: HistoryRecord[] = [];
        
        // Fetch items for all records in parallel (but limit concurrent requests)
        const batchSize = 10;
        for (let i = 0; i < historyData.length; i += batchSize) {
          const batch = historyData.slice(i, i + batchSize);
          const batchPromises = batch.map(async (record: any) => {
            try {
              // Fetch items for this record to get item-specific details
              const recordResponse = await inventoryService.getIncomingById(record.id);
              if (recordResponse.success && recordResponse.data.items) {
                // Find the specific item in this record
                const itemInRecord = recordResponse.data.items.find((item: IncomingInventoryItem) => {
                  const itemSku = item.skuCode || item.sku_code || item.skuId || item.sku_id;
                  return itemSku === skuCode;
                });

                if (itemInRecord) {
                  // Get the item's updated_at if available, otherwise use record's updated_at
                  const itemUpdatedAt = itemInRecord.updatedAt || itemInRecord.updated_at || record.updatedAt || record.updated_at;
                  const itemId = itemInRecord.itemId || itemInRecord.item_id || itemInRecord.id || 0;
                  // Create a unique key for each action/update
                  // Use timestamp in milliseconds + random to ensure each update gets a unique entry
                  const timestamp = itemUpdatedAt ? new Date(itemUpdatedAt).getTime() : Date.now();
                  const uniqueKey = `${record.id}-${itemId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
                  
                  return {
                    id: record.id,
                    itemId: itemId,
                    invoiceNumber: record.invoiceNumber || record.invoice_number || '',
                    invoiceDate: record.invoiceDate || record.invoice_date || '',
                    receivingDate: record.receivingDate || record.receiving_date || '',
                    itemName: itemInRecord.itemName || itemInRecord.item_name || itemName,
                    skuId: itemInRecord.skuId || itemInRecord.sku_id,
                    skuCode: itemInRecord.skuCode || itemInRecord.sku_code || skuCode,
                    vendorName: record.vendorName || record.vendor_name || '',
                    totalQuantity: itemInRecord.totalQuantity || itemInRecord.total_quantity || 0,
                    received: itemInRecord.received || 0,
                    rejected: itemInRecord.rejected || 0,
                    short: itemInRecord.short || 0,
                    challanNumber: itemInRecord.challanNumber || itemInRecord.challan_number,
                    challanDate: itemInRecord.challanDate || itemInRecord.challan_date,
                    updatedAt: itemUpdatedAt,
                    uniqueKey: uniqueKey,
                  };
                }
              }
            } catch (err) {
              console.error(`Error loading details for record ${record.id}:`, err);
            }
            return null;
          });

          const batchResults = await Promise.all(batchPromises);
          detailedHistory.push(...batchResults.filter((r): r is HistoryRecord => r !== null));
        }

        // Create a new entry for each action/update
        // Always create a new entry when data is fetched to track all changes
        const allHistoryEntries: HistoryRecord[] = [...history]; // Keep existing history
        
        detailedHistory.forEach(currentRecord => {
          const recordKey = `${currentRecord.id}-${currentRecord.itemId}`;
          
          // Find the last entry for this record+item in current history
          const entriesForRecord = allHistoryEntries.filter(entry => `${entry.id}-${entry.itemId}` === recordKey);
          const lastEntry = entriesForRecord.length > 0
            ? entriesForRecord.sort((a, b) => {
                const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return timeB - timeA; // Most recent first
              })[0]
            : null;
          
          // Check if this is a new state (different values or different timestamp)
          // Always create entry if no previous entry exists
          let isNewState = false;
          let changeReason = '';
          
          if (!lastEntry) {
            // No previous entry - always create first entry
            isNewState = true;
            changeReason = 'First entry';
          } else {
            // Compare values to detect changes
            const rejectedChanged = lastEntry.rejected !== currentRecord.rejected;
            const shortChanged = lastEntry.short !== currentRecord.short;
            const receivedChanged = lastEntry.received !== currentRecord.received;
            const totalQtyChanged = lastEntry.totalQuantity !== currentRecord.totalQuantity;
            
            // Compare timestamps (if both exist and are different)
            const lastTime = lastEntry.updatedAt ? new Date(lastEntry.updatedAt).getTime() : 0;
            const currentTime = currentRecord.updatedAt ? new Date(currentRecord.updatedAt).getTime() : 0;
            // Consider timestamp changed if difference is more than 1 second (to account for database precision)
            const timestampChanged = lastTime > 0 && currentTime > 0 && Math.abs(currentTime - lastTime) > 1000;
            
            const valuesChanged = rejectedChanged || shortChanged || receivedChanged || totalQtyChanged;
            
            // Create new entry if values changed OR timestamp changed significantly
            // This ensures each update action creates a new row
            if (valuesChanged) {
              isNewState = true;
              const changes = [];
              if (rejectedChanged) changes.push(`Rejected: ${lastEntry.rejected} → ${currentRecord.rejected}`);
              if (shortChanged) changes.push(`Short: ${lastEntry.short} → ${currentRecord.short}`);
              if (receivedChanged) changes.push(`Received: ${lastEntry.received} → ${currentRecord.received}`);
              if (totalQtyChanged) changes.push(`TotalQty: ${lastEntry.totalQuantity} → ${currentRecord.totalQuantity}`);
              changeReason = changes.join(', ');
            } else if (timestampChanged) {
              // Timestamp changed but values are same - still create entry to track the update action
              isNewState = true;
              changeReason = `Update action detected (timestamp: ${lastEntry.updatedAt} → ${currentRecord.updatedAt})`;
            } else {
              // Same values and same timestamp (within 1 second) - skip to avoid duplicates
              changeReason = 'No changes detected (same values and timestamp)';
            }
          }
          
          // Always create a new entry if it's a new state
          // This ensures each update creates a new row in the table
          if (isNewState) {
            // Create a new entry for this action/update with unique key
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const newEntry: HistoryRecord = {
              ...currentRecord,
              uniqueKey: `${currentRecord.id}-${currentRecord.itemId}-${timestamp}-${randomId}`
            };
            allHistoryEntries.push(newEntry);
            console.log('✅ Created new history entry:', {
              recordKey,
              changeReason,
              rejected: currentRecord.rejected,
              short: currentRecord.short,
              received: currentRecord.received,
              updatedAt: currentRecord.updatedAt,
              previousRejected: lastEntry?.rejected,
              previousShort: lastEntry?.short,
              previousUpdatedAt: lastEntry?.updatedAt
            });
          } else {
            console.log('⏭️ Skipped duplicate entry:', {
              recordKey,
              reason: changeReason,
              rejected: currentRecord.rejected,
              short: currentRecord.short,
              received: currentRecord.received,
              updatedAt: currentRecord.updatedAt
            });
          }
        });
        allHistoryEntries.sort((a, b) => {
          // First sort by updated_at (most recent changes first)
          const updatedA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const updatedB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          if (updatedB !== updatedA) {
            return updatedB - updatedA;
          }
          // Then by receiving date
          const dateA = new Date(a.receivingDate).getTime();
          const dateB = new Date(b.receivingDate).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          // Finally by invoice number
          return a.invoiceNumber.localeCompare(b.invoiceNumber);
        });

        setHistory(allHistoryEntries);
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      console.error('Error loading item history:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load item history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Item History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {itemName} - {skuCode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh History"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadHistory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No history found for this item</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Invoice/Challan Number
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Invoice/Challan Date
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Receiving Date
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      SKU ID
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Total Quantity
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Rejected
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Short
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Last Updated / Change Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((record) => (
                    <tr key={record.uniqueKey} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium text-center">
                        <div>
                          <div className="font-semibold">{record.invoiceNumber || '-'}</div>
                          {record.challanNumber && (
                            <div className="text-xs text-gray-600 mt-1">
                              Challan: {record.challanNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-center">
                        <div>
                          <div>{formatDate(record.invoiceDate)}</div>
                          {record.challanDate && (
                            <div className="text-xs text-gray-600 mt-1">
                              Challan: {formatDate(record.challanDate)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-center">
                        {formatDate(record.receivingDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-center">
                        {record.itemName}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs text-center">
                        {record.skuCode || record.skuId || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-center">
                        {record.vendorName}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold text-center">
                        {formatNumber(record.totalQuantity)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-700 font-semibold">
                          {formatNumber(record.received)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-red-700 font-semibold">
                          {formatNumber(record.rejected)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-orange-700 font-semibold">
                          {formatNumber(record.short)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs text-center">
                        {record.updatedAt ? (
                          <div>
                            <div className="font-medium">{formatDate(record.updatedAt)}</div>
                            <div className="text-gray-400 text-xs">
                              {new Date(record.updatedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total Records: <span className="font-semibold">{history.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

ItemHistoryModal.displayName = 'ItemHistoryModal';

export default ItemHistoryModal;

