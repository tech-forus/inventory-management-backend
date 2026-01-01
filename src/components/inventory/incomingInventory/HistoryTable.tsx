import React from 'react';
import { ChevronDown, ChevronRight, Eye, Download, Edit, Save, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface HistoryTableProps {
  loading: boolean;
  history: any[];
  expandedRows: { [key: number]: boolean };
  rowItems: { [key: number]: any[] };
  editingItem: { inventoryId: number; itemId: number } | null;
  editFormData: { received: number; short: number; challanNumber: string; challanDate: string };
  onToggleRow: (inventoryId: number) => void;
  onEditShort: (inventoryId: number, item: any) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onMoveToRejected: (inventoryId: number, itemId: number) => void;
  onEditFormDataChange: (updates: Partial<{ received: number; short: number; challanNumber: string; challanDate: string }>) => void;
  getChallanCount: (items: any[]) => number;
}

const HistoryTable: React.FC<HistoryTableProps> = ({
  loading,
  history,
  expandedRows,
  rowItems,
  editingItem,
  editFormData,
  onToggleRow,
  onEditShort,
  onSaveEdit,
  onCancelEdit,
  onMoveToRejected,
  onEditFormDataChange,
  getChallanCount,
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Invoice Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Invoice Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Total Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Received Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Receiving Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Received By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  No history found
                </td>
              </tr>
            ) : (
              history.map((record) => {
                const isExpanded = expandedRows[record.id];
                const items = rowItems[record.id] || [];
                const challanCount = getChallanCount(items);

                return (
                  <React.Fragment key={record.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onToggleRow(record.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(record.invoice_date || record.date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {record.invoice_number || record.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.total_quantity || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.received_quantity || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {record.vendor_name || record.vendor || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(record.receiving_date || record.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {record.received_by_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        {formatCurrency(record.total_value || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'Pending' || (record.total_short > 0)
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {record.status === 'Pending' || (record.total_short > 0) ? 'Pending' : 'Complete'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleRow(record.id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Items ({items.length}) - Challans: {challanCount}
                              </h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">SKU ID</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Item Name</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Received</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Short</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Challan Number</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {items.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                                        Loading items...
                                      </td>
                                    </tr>
                                  ) : (
                                    items.map((item) => {
                                      const isEditing = editingItem?.inventoryId === record.id && editingItem?.itemId === (item.itemId || item.item_id);

                                      return (
                                        <tr key={item.itemId || item.item_id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 text-gray-900">{item.skuCode || item.sku_code || item.skuId || 'N/A'}</td>
                                          <td className="px-3 py-2 text-gray-700">{item.itemName || item.item_name || 'N/A'}</td>
                                          {isEditing ? (
                                            <>
                                              <td className="px-3 py-2">
                                                <input
                                                  type="number"
                                                  value={editFormData.received}
                                                  onChange={(e) => onEditFormDataChange({ received: parseInt(e.target.value) || 0 })}
                                                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                                                  min="0"
                                                />
                                              </td>
                                              <td className="px-3 py-2">
                                                <input
                                                  type="number"
                                                  value={editFormData.short}
                                                  onChange={(e) => onEditFormDataChange({ short: parseInt(e.target.value) || 0 })}
                                                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                                                  min="0"
                                                />
                                              </td>
                                              <td className="px-3 py-2">
                                                <input
                                                  type="date"
                                                  value={editFormData.challanDate}
                                                  onChange={(e) => onEditFormDataChange({ challanDate: e.target.value })}
                                                  className="w-32 px-2 py-1 border border-gray-300 rounded"
                                                />
                                              </td>
                                              <td className="px-3 py-2">
                                                <input
                                                  type="text"
                                                  value={editFormData.challanNumber}
                                                  onChange={(e) => onEditFormDataChange({ challanNumber: e.target.value })}
                                                  className="w-32 px-2 py-1 border border-gray-300 rounded"
                                                  placeholder="Challan Number"
                                                />
                                              </td>
                                              <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={onSaveEdit}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Save"
                                                  >
                                                    <Save className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={onCancelEdit}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Cancel"
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              <td className="px-3 py-2 text-gray-900">{item.received || 0}</td>
                                              <td className="px-3 py-2 text-gray-900">{item.short || 0}</td>
                                              <td className="px-3 py-2 text-gray-700">
                                                {item.challanDate || item.challan_date ? formatDate(item.challanDate || item.challan_date) : 'N/A'}
                                              </td>
                                              <td className="px-3 py-2 text-gray-700">
                                                {item.challanNumber || item.challan_number || 'N/A'}
                                              </td>
                                              <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                  {(item.short || 0) > 0 && (
                                                    <button
                                                      onClick={() => onMoveToRejected(record.id, item.itemId || item.item_id)}
                                                      className="text-orange-600 hover:text-orange-800 text-xs px-2 py-1 border border-orange-300 rounded hover:bg-orange-50"
                                                      title="Move to Rejected"
                                                    >
                                                      Move to Rejected
                                                    </button>
                                                  )}
                                                  {(item.short || 0) > 0 && (
                                                    <button
                                                      onClick={() => onEditShort(record.id, item)}
                                                      className="text-blue-600 hover:text-blue-800"
                                                      title="Edit"
                                                    >
                                                      <Edit className="w-4 h-4" />
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </>
                                          )}
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
