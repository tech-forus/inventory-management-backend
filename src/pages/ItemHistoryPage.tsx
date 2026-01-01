import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatNumber, formatDate } from '../utils/formatters';
import { inventoryService } from '../services/inventoryService';
import { skuService } from '../services/skuService';

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

const ItemHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [skuCode, setSkuCode] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadItemAndHistory();
    }
  }, [id]);

  const loadItemAndHistory = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // First, get the SKU/item details
      const skuResponse = await skuService.getById(parseInt(id));
      if (skuResponse.success && skuResponse.data) {
        const item = skuResponse.data;
        const itemSkuCode = item.skuId || item.sku_id || '';
        const itemNameValue = item.itemName || item.item_name || '';
        setItemName(itemNameValue);
        setSkuCode(itemSkuCode);

        if (!itemSkuCode) {
          setError('SKU Code not found for this item');
          setLoading(false);
          return;
        }

        // Fetch history using SKU filter
        const historyResponse = await inventoryService.getIncomingHistory({
          sku: itemSkuCode,
        });

        if (historyResponse.success && historyResponse.data) {
          const historyData = historyResponse.data;
          const detailedHistory: HistoryRecord[] = [];

          // Fetch items for all records in parallel (but limit concurrent requests)
          const batchSize = 10;
          for (let i = 0; i < historyData.length; i += batchSize) {
            const batch = historyData.slice(i, i + batchSize);
            const batchPromises = batch.map(async (record: any) => {
              try {
                const recordResponse = await inventoryService.getIncomingById(record.id);
                if (recordResponse.success && recordResponse.data.items) {
                  const itemInRecord = recordResponse.data.items.find((item: any) => {
                    const itemSku = item.skuCode || item.sku_code || item.skuId || item.sku_id;
                    return itemSku === itemSkuCode;
                  });

                  if (itemInRecord) {
                    // Get the item's updated_at if available, otherwise use record's updated_at
                    const itemUpdatedAt = itemInRecord.updatedAt || itemInRecord.updated_at || record.updatedAt || record.updated_at;
                    const itemId = itemInRecord.itemId || itemInRecord.item_id || itemInRecord.id || 0;
                    
                    // Don't generate uniqueKey here - it will be generated when adding to history
                    // This ensures each fetch creates a truly unique entry
                    return {
                      id: record.id,
                      itemId: itemId,
                      invoiceNumber: record.invoiceNumber || record.invoice_number || '',
                      invoiceDate: record.invoiceDate || record.invoice_date || '',
                      receivingDate: record.receivingDate || record.receiving_date || '',
                      itemName: itemInRecord.itemName || itemInRecord.item_name || itemNameValue || '',
                      skuId: itemInRecord.skuId || itemInRecord.sku_id,
                      skuCode: itemInRecord.skuCode || itemInRecord.sku_code || itemSkuCode,
                      vendorName: record.vendorName || record.vendor_name || '',
                      totalQuantity: itemInRecord.totalQuantity || itemInRecord.total_quantity || 0,
                      received: itemInRecord.received || 0,
                      rejected: itemInRecord.rejected || 0,
                      short: itemInRecord.short || 0,
                      challanNumber: itemInRecord.challanNumber || itemInRecord.challan_number,
                      challanDate: itemInRecord.challanDate || itemInRecord.challan_date,
                      updatedAt: itemUpdatedAt,
                      uniqueKey: '', // Will be set when adding to history
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

          // Create a new row only when values actually change (rejected, short, received, totalQuantity)
          // Keep existing history AND create new rows only for actual changes
          const allHistoryEntries: HistoryRecord[] = [...history]; // Keep old history data
          
          // Use a fetch timestamp to ensure all entries from this fetch are unique
          const fetchTimestamp = Date.now();
          let fetchCounter = 0;
          
          detailedHistory.forEach((currentRecord, index) => {
            // Find the last entry for this record+item combination
            const recordKey = `${currentRecord.id}-${currentRecord.itemId}`;
            const entriesForRecord = allHistoryEntries.filter(entry => `${entry.id}-${entry.itemId}` === recordKey);
            const lastEntry = entriesForRecord.length > 0
              ? entriesForRecord.sort((a, b) => {
                  const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                  const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                  return timeB - timeA; // Most recent first
                })[0]
              : null;
            
            // Check if values have changed (rejected, short, received, or totalQuantity)
            let hasChanged = false;
            
            if (!lastEntry) {
              // No previous entry - always create first entry
              hasChanged = true;
            } else {
              // Compare values to detect changes
              const rejectedChanged = lastEntry.rejected !== currentRecord.rejected;
              const shortChanged = lastEntry.short !== currentRecord.short;
              const receivedChanged = lastEntry.received !== currentRecord.received;
              const totalQuantityChanged = lastEntry.totalQuantity !== currentRecord.totalQuantity;
              
              // Create new row only if any value changed
              hasChanged = rejectedChanged || shortChanged || receivedChanged || totalQuantityChanged;
            }
            
            // Only create a new entry if values have changed
            if (hasChanged) {
              fetchCounter++;
              const randomId = Math.random().toString(36).substr(2, 9);
              const microsecondTimestamp = performance.now(); // More precise than Date.now()
              
              const newEntry: HistoryRecord = {
                ...currentRecord,
                uniqueKey: `fetch-${fetchTimestamp}-${microsecondTimestamp}-${fetchCounter}-${index}-${currentRecord.id}-${currentRecord.itemId}-${randomId}`
              };
              allHistoryEntries.push(newEntry); // Add new row only when values changed
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
      } else {
        setError('Item not found');
      }
    } catch (err: any) {
      console.error('Error loading item history:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load item history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/inventory')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            title="Back to Inventory"
          >
              <ArrowLeft className="w-6 h-6" />
          </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Item History</h1>
          </div>
            {itemName && skuCode && (
            <p className="text-lg text-slate-500 font-medium">
              {itemName} - <span className="font-mono text-indigo-600">{skuCode}</span>
              </p>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading history...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadItemAndHistory}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Invoice/Challan Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Invoice/Challan Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Receiving Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SKU ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rejected
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Short
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Updated / Change Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((record) => (
                  <tr key={record.uniqueKey} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      <div>
                        <button
                          onClick={() => {
                            const encodedInvoice = encodeURIComponent(record.invoiceNumber || '');
                            const encodedSku = encodeURIComponent(record.skuCode || record.skuId || '');
                            navigate(`/app/invoice/${encodedInvoice}/${encodedSku}/history`);
                          }}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                          title="Click to view all changes for this invoice"
                        >
                          {record.invoiceNumber || '-'}
                        </button>
                        {record.challanNumber && (
                          <div className="text-xs text-gray-600 mt-1">
                            Challan: {record.challanNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>
                        <div>{formatDate(record.invoiceDate)}</div>
                        {record.challanDate && (
                          <div className="text-xs text-gray-600 mt-1">
                            Challan: {formatDate(record.challanDate)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(record.receivingDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.itemName}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {record.skuCode || record.skuId || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.vendorName}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {formatNumber(record.totalQuantity)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-700 font-semibold">
                        {formatNumber(record.received)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-700 font-semibold">
                        {formatNumber(record.rejected)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-orange-700 font-semibold">
                        {formatNumber(record.short)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
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

      {/* Footer Info */}
      {history.length > 0 && (
        <div className="text-sm text-gray-600">
          Total Records: <span className="font-semibold">{history.length}</span>
        </div>
      )}
    </div>
  );
};

export default ItemHistoryPage;

