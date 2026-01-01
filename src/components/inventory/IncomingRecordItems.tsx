import React, { useState } from 'react';
import { formatNumber, formatDate } from '../../utils/formatters';
import { IncomingInventoryItem, IncomingInventoryRecord } from './types';
import { inventoryService } from '../../services/inventoryService';

interface IncomingRecordItemsProps {
  record: IncomingInventoryRecord;
  items: IncomingInventoryItem[];
  onItemsUpdate: () => void;
}

const IncomingRecordItems: React.FC<IncomingRecordItemsProps> = ({
  record,
  items,
  onItemsUpdate,
}) => {
  const [moveToRejectedQty, setMoveToRejectedQty] = useState<Record<string, number>>({});
  const [inspectionDates, setInspectionDates] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [rejectedDetailsOpen, setRejectedDetailsOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const handleMoveToRejected = async (item: IncomingInventoryItem, qty: number) => {
    if (qty <= 0) {
      alert('Please enter a quantity greater than 0');
      return;
    }
    const itemId = item.itemId || item.item_id || item.id;
    if (!itemId) {
      alert('Item ID not found');
      return;
    }
    const reasonKey = `${record.id}-${itemId}`;
    const reason = rejectionReasons[reasonKey]?.trim() || '';
    
    // Validate reason is mandatory
    if (!reason) {
      alert('Reason is required (max 30 characters)');
      return;
    }
    if (reason.length > 30) {
      alert('Reason must be maximum 30 characters');
      return;
    }
    
    const received = item.received || 0;
    const currentRejected = item.rejected || 0;
    const totalRejectedAfterMove = currentRejected + qty;
    
    // Validate that total rejected (current + new) doesn't exceed received
    if (totalRejectedAfterMove > received) {
      const maxCanMove = received - currentRejected;
      alert(`Cannot move ${qty}. Total rejected (${currentRejected} + ${qty} = ${totalRejectedAfterMove}) would exceed received quantity (${received}). Maximum you can move is ${maxCanMove}.`);
      return;
    }
    if (!confirm(`Move ${qty} from received to rejected (defective items)? This will reduce stock by ${qty}.`)) {
      return;
    }

    try {
      setLoading(true);
      const inspectionDate = inspectionDates[reasonKey] || new Date().toISOString().split('T')[0];
      const response = await inventoryService.moveReceivedToRejected(record.id, itemId, qty, inspectionDate, reason);
      
      // Check for warnings or errors in response
      if (response?.warning) {
        console.warn('[IncomingRecordItems] Backend warning:', response.warning);
        alert(`Warning: ${response.warning}`);
      }
      
      if (response?.reportCreated === false) {
        console.error('[IncomingRecordItems] Report creation failed');
        alert('Items moved to rejected, but report creation failed. Please check the rejected items page manually.');
      }
      
      // Reload items
      await inventoryService.getIncomingItems(record.id);
      onItemsUpdate();
      
      // Clear inputs
      setMoveToRejectedQty(prev => {
        const newState = { ...prev };
        delete newState[reasonKey];
        return newState;
      });
      setInspectionDates(prev => {
        const newState = { ...prev };
        delete newState[reasonKey];
        return newState;
      });
      setRejectionReasons(prev => {
        const newState = { ...prev };
        delete newState[reasonKey];
        return newState;
      });
      
      // Open rejected details
      setRejectedDetailsOpen(prev => ({
        ...prev,
        [`${record.id}-${itemId}`]: true
      }));
      
      alert(`Successfully moved ${qty} to rejected. Stock reduced by ${qty}.`);
    } catch (error: any) {
      console.error('Error moving to rejected:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to move to rejected');
    } finally {
      setLoading(false);
    }
  }; 

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Item Details with Invoice Information</h4>
      {items && items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-300">Item Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-300">SKU ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-300">Rejected Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-300">Short Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-300">Received Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-300">Invoice Number</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item) => {
                const itemId = item.itemId || item.item_id || item.id || 0;
                const itemName = item.itemName || item.item_name || '-';
                const skuCode = item.skuCode || item.sku_code || item.skuId || item.sku_id || '-';
                const received = item.received || 0;
                const short = item.short || 0;
                const rejected = item.rejected || 0;

                return (
                  <tr key={itemId} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-900 border-r border-gray-200">{itemName}</td>
                    <td className="px-3 py-3 text-gray-700 font-mono text-xs border-r border-gray-200">{skuCode}</td>
                    <td className="px-3 py-3 border-r border-gray-200">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-red-700 font-semibold">
                            Rejected Quantity: {formatNumber(rejected)}
                          </span>
                          {received > 0 && (
                            <>
                              <input
                                type="number"
                                min="1"
                                max={received - rejected}
                                value={moveToRejectedQty[`${record.id}-${itemId}`] || ''}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  const maxCanMove = received - rejected;
                                  if (value >= 0 && value <= maxCanMove) {
                                    setMoveToRejectedQty(prev => ({
                                      ...prev,
                                      [`${record.id}-${itemId}`]: value
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  const maxCanMove = received - rejected;
                                  if (value > maxCanMove) {
                                    setMoveToRejectedQty(prev => ({
                                      ...prev,
                                      [`${record.id}-${itemId}`]: maxCanMove
                                    }));
                                  } else if (value < 0) {
                                    setMoveToRejectedQty(prev => ({
                                      ...prev,
                                      [`${record.id}-${itemId}`]: 0
                                    }));
                                  }
                                }}
                                placeholder="Qty"
                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                title={`Max: ${received - rejected} (Received: ${received} - Already Rejected: ${rejected})`}
                              />
                              <input
                                type="date"
                                value={inspectionDates[`${record.id}-${itemId}`] || new Date().toISOString().split('T')[0]}
                                onChange={(e) => {
                                  setInspectionDates(prev => ({
                                    ...prev,
                                    [`${record.id}-${itemId}`]: e.target.value
                                  }));
                                }}
                                className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                title="Inspection Date"
                              />
                              <input
                                type="text"
                                maxLength={30}
                                value={rejectionReasons[`${record.id}-${itemId}`] || ''}
                                onChange={(e) => {
                                  const value = e.target.value.substring(0, 30);
                                  setRejectionReasons(prev => ({
                                    ...prev,
                                    [`${record.id}-${itemId}`]: value
                                  }));
                                }}
                                placeholder="Reason (required, max 30)"
                                className="w-40 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                title="Reason for rejection (required, max 30 characters)"
                                required
                              />
                              <button
                                onClick={() => handleMoveToRejected(item, moveToRejectedQty[`${record.id}-${itemId}`] || 0)}
                                disabled={loading || !moveToRejectedQty[`${record.id}-${itemId}`] || !rejectionReasons[`${record.id}-${itemId}`]?.trim()}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                title="Move Received to Rejected"
                              >
                                Move to Rejected
                              </button>
                            </>
                          )}
                        </div>
                        {rejectedDetailsOpen[`${record.id}-${itemId}`] && rejected > 0 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <div className="font-semibold text-red-800 mb-1">Rejected Items Details:</div>
                            <div className="space-y-1 text-red-700">
                              <div>Quantity: {formatNumber(rejected)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200">
                      <span className="text-orange-700 font-semibold">
                        Short Quantity: {formatNumber(short)}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200 bg-gray-50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-green-700 font-semibold">
                            Received Quantity: {formatNumber(received)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded"></div>
                        <span className="text-gray-900 font-medium">{record.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded"></div>
                        <span className="text-gray-700">{formatDate(record.invoiceDate)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded"></div>
            <span>Invoice and Date are linked to the rejected/short quantities above</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 text-sm py-4">
          Loading items...
        </div>
      )}
    </div>
  );
}; 

export default IncomingRecordItems;

