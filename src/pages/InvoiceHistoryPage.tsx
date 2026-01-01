import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatNumber, formatDate } from '../utils/formatters';
import { inventoryService } from '../services/inventoryService';

interface InvoiceHistoryRecord {
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
  uniqueKey: string;
}

// Safe value converter - handles null/undefined to prevent false positives
function safe(v: any): any {
  return v ?? "";
}

// Hash function to compare records - detects ANY change in record fields
function hashRecord(record: InvoiceHistoryRecord): string {
  return JSON.stringify({
    invoiceNumber: safe(record.invoiceNumber),
    totalQuantity: safe(record.totalQuantity),
    received: safe(record.received),
    rejected: safe(record.rejected),
    short: safe(record.short),
    challanNumber: safe(record.challanNumber),
    challanDate: safe(record.challanDate),
    invoiceDate: safe(record.invoiceDate),
    receivingDate: safe(record.receivingDate),
    vendorName: safe(record.vendorName),
    itemName: safe(record.itemName),
    skuCode: safe(record.skuCode),
    skuId: safe(record.skuId),
    updatedAt: safe(record.updatedAt),
  });
}

const InvoiceHistoryPage: React.FC = () => {
  const { invoiceNumber: invoiceParam, skuCode: skuParam } = useParams<{ 
    invoiceNumber: string;
    skuCode: string;
  }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<InvoiceHistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [skuCode, setSkuCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');

  useEffect(() => {
    if (invoiceParam && skuParam) {
      loadInvoiceHistory();
      
      // Set up auto-refresh every 3 seconds to detect changes
      const interval = setInterval(() => {
        loadInvoiceHistory();
      }, 3000);

      // Cleanup interval on unmount
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceParam, skuParam]);

  const loadInvoiceHistory = async () => {
    if (!invoiceParam || !skuParam) return;

    try {
      setLoading(true);
      setError(null);

      // Decode URL parameters
      const decodedInvoiceNumber = decodeURIComponent(invoiceParam);
      const decodedSkuCode = decodeURIComponent(skuParam);
      
      setInvoiceNumber(decodedInvoiceNumber);
      setSkuCode(decodedSkuCode);

      // Fetch history using SKU filter
      const historyResponse = await inventoryService.getIncomingHistory({
        sku: decodedSkuCode,
      });

      if (historyResponse.success && historyResponse.data) {
        const historyData = historyResponse.data;
        const detailedHistory: InvoiceHistoryRecord[] = [];

        // Fetch items for all records in parallel
        const batchSize = 10;
        for (let i = 0; i < historyData.length; i += batchSize) {
          const batch = historyData.slice(i, i + batchSize);
          const batchPromises = batch.map(async (record: any) => {
            try {
              const recordResponse = await inventoryService.getIncomingById(record.id);
              if (recordResponse.success && recordResponse.data.items) {
                const itemInRecord = recordResponse.data.items.find((item: any) => {
                  const itemSku = item.skuCode || item.sku_code || item.skuId || item.sku_id;
                  return itemSku === decodedSkuCode;
                });

                if (itemInRecord && (record.invoiceNumber || record.invoice_number) === decodedInvoiceNumber) {
                  const itemUpdatedAt = itemInRecord.updatedAt || itemInRecord.updated_at || record.updatedAt || record.updated_at;
                  const itemId = itemInRecord.itemId || itemInRecord.item_id || itemInRecord.id || 0;
                  const timestamp = itemUpdatedAt ? new Date(itemUpdatedAt).getTime() : Date.now();
                  const uniqueKey = `${record.id}-${itemId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
                  
                  const itemNameValue = itemInRecord.itemName || itemInRecord.item_name || '';
                  if (!itemName) {
                    setItemName(itemNameValue);
                  }
                  
                  return {
                    id: record.id,
                    itemId: itemId,
                    invoiceNumber: record.invoiceNumber || record.invoice_number || '',
                    invoiceDate: record.invoiceDate || record.invoice_date || '',
                    receivingDate: record.receivingDate || record.receiving_date || '',
                    itemName: itemNameValue,
                    skuId: itemInRecord.skuId || itemInRecord.sku_id,
                    skuCode: itemInRecord.skuCode || itemInRecord.sku_code || decodedSkuCode,
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
          detailedHistory.push(...batchResults.filter((r): r is InvoiceHistoryRecord => r !== null));
        }

        // Create new rows when values change - compare with last known state
        // Keep old history and add new rows only for actual changes
        const allHistoryEntries: InvoiceHistoryRecord[] = structuredClone(history); // Deep clone to prevent mutation
        const fetchTimestamp = Date.now();
        let fetchCounter = 0;

        detailedHistory.forEach((currentRecord, index) => {
          // Find the most recent entry for this record+item combination
          const recordKey = `${currentRecord.id}-${currentRecord.itemId}`;
          const entriesForRecord = allHistoryEntries.filter(entry => `${entry.id}-${entry.itemId}` === recordKey);
          
          // Find latest entry without sorting (more efficient)
          const lastEntry = entriesForRecord.reduce((latest, entry) => {
            const entryTime = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
            const latestTime = latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0;
            return entryTime > latestTime ? entry : latest;
          }, null as InvoiceHistoryRecord | null);

          // Check if values have changed using hash comparison
          let hasChanged = false;
          
          if (!lastEntry) {
            // No previous entry - always create first entry
            hasChanged = true;
          } else {
            // Compare records using hash - detects ANY change in any field
            const lastHash = hashRecord(lastEntry);
            const currentHash = hashRecord(currentRecord);

            if (lastHash !== currentHash) {
              hasChanged = true;
            }
          }

          // Create a new entry if values have changed
          if (hasChanged) {
            fetchCounter++;
            const microsecondTimestamp = performance.now();
            
            // Create a truly unique key that includes multiple timestamps and counters
            // Timestamp, microsecond timestamp, fetchCounter, and index guarantee uniqueness
            const entryTimestamp = Date.now();
            const newEntry: InvoiceHistoryRecord = {
              ...currentRecord,
              uniqueKey: `invoice-${currentRecord.invoiceNumber}-${currentRecord.id}-${currentRecord.itemId}-${fetchTimestamp}-${entryTimestamp}-${microsecondTimestamp}-${fetchCounter}-${index}`
            };
            allHistoryEntries.push(newEntry); // Add new row when values changed
          }
        });

        // Sort by updated_at (most recent first), then by uniqueKey for stable ordering
        allHistoryEntries.sort((a, b) => {
          const updatedA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const updatedB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

          // Primary sort: updatedAt
          if (updatedB !== updatedA) return updatedB - updatedA;

          // Secondary sort: uniqueKey (ensures stable ordering)
          return b.uniqueKey.localeCompare(a.uniqueKey);
        });

        setHistory(allHistoryEntries);
      } else {
        // Don't clear history if API returns no data - keep existing history
        // Only clear on initial load
        if (history.length === 0) {
          setHistory([]);
        }
      }
    } catch (err: any) {
      console.error('Error loading invoice history:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load invoice history');
      // Don't clear history on error - keep existing history visible
      // Only clear on initial load
      if (history.length === 0) {
        setHistory([]);
      }
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
            onClick={() => navigate(-1)}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            title="Back"
          >
              <ArrowLeft className="w-6 h-6" />
          </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Invoice History</h1>
          </div>
            {invoiceNumber && (
              <div className="mt-2 space-y-1">
              <p className="text-base text-slate-500 font-medium">
                <span className="font-black text-slate-700">Invoice Number:</span> {invoiceNumber}
                </p>
                {skuCode && (
                <p className="text-base text-slate-500 font-medium">
                  <span className="font-black text-slate-700">SKU ID:</span> <span className="font-mono text-indigo-600">{skuCode}</span>
                  </p>
                )}
                {itemName && (
                <p className="text-base text-slate-500 font-medium">
                  <span className="font-black text-slate-700">Item Name:</span> {itemName}
                  </p>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading invoice history...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadInvoiceHistory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No history found for this invoice</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider w-16">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Invoice/Challan Date
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Receiving Date
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
                {history.map((record, index) => (
                  <tr key={record.uniqueKey} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold">
                      {index + 1}
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

      {/* Footer Info */}
      {history.length > 0 && (
        <div className="text-sm text-gray-600">
          Total Records: <span className="font-semibold">{history.length}</span>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistoryPage;

