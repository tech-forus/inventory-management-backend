import React from 'react';
import { X } from 'lucide-react';
import { IncomingInventoryRecord, IncomingInventoryItem } from './types';
import { formatDate, formatNumber, formatCurrency } from '../../utils/formatters';

interface EditRejectedShortFormData {
  rejected: number;
  short: number;
  invoiceNumber: string;
  invoiceDate: string;
}

interface EditRejectedShortModalProps {
  isOpen: boolean;
  record: IncomingInventoryRecord | null;
  items: IncomingInventoryItem[];
  selectedItemId: number | null;
  formData: EditRejectedShortFormData;
  updating: boolean;
  onClose: () => void;
  onItemSelect: (itemId: number) => void;
  onFormDataChange: (data: Partial<EditRejectedShortFormData>) => void;
  onUpdate: () => void;
}

const EditRejectedShortModal: React.FC<EditRejectedShortModalProps> = ({
  isOpen,
  record,
  items,
  selectedItemId: _selectedItemId,
  formData: _formData,
  updating: _updating,
  onClose,
  onItemSelect: _onItemSelect,
  onFormDataChange: _onFormDataChange,
  onUpdate: _onUpdate,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">DETAILS</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice/Challan Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice/Challan Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Invoice/Challan Date</label>
                <p className="text-sm text-gray-900">{formatDate(record.invoiceDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Invoice/Challan Number</label>
                <p className="text-sm text-gray-900">{record.invoiceNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Docket Number</label>
                <p className="text-sm text-gray-900">{(record as any).docketNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Transportor Name</label>
                <p className="text-sm text-gray-900">{(record as any).transportorName || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vendor & Brand */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor & Brand</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                <p className="text-sm text-gray-900">{record.vendorName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Brand</label>
                <p className="text-sm text-gray-900">{record.brandName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Warranty</label>
                <p className="text-sm text-gray-900">{(record as any).warranty ? `${(record as any).warranty} ${(record as any).warrantyUnit || 'months'}` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Receiving Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receiving Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Receiving Date</label>
                <p className="text-sm text-gray-900">{formatDate(record.receivingDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Received By</label>
                <p className="text-sm text-gray-900">{record.receivedByName || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Item Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">SKU ID</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Total Quantity</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Received</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Short</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Rejected</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Unit Price</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Total Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-gray-500">No items found</td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const itemId = item.itemId || item.item_id || item.id || 0;
                      const itemName = item.itemName || item.item_name || 'N/A';
                      const skuCode = item.skuCode || item.sku_code || item.skuId || item.sku_id || 'N/A';
                      const totalQty = item.totalQuantity || item.total_quantity || 0;
                      const received = item.received || 0;
                      const short = item.short || 0;
                      const rejected = item.rejected || 0;
                      const unitPrice = item.unitPrice || item.unit_price || 0;
                      const totalValue = item.totalValue || item.total_value || (totalQty * unitPrice);

                      return (
                        <tr key={itemId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">{itemName}</td>
                          <td className="px-3 py-2 text-gray-700 font-mono text-xs">{skuCode}</td>
                          <td className="px-3 py-2 text-center text-gray-900">{formatNumber(totalQty)}</td>
                          <td className="px-3 py-2 text-center text-gray-900">{formatNumber(received)}</td>
                          <td className="px-3 py-2 text-center text-orange-700 font-semibold">{formatNumber(short)}</td>
                          <td className="px-3 py-2 text-center text-red-700 font-semibold">{formatNumber(rejected)}</td>
                          <td className="px-3 py-2 text-center text-gray-900">{formatCurrency(unitPrice)}</td>
                          <td className="px-3 py-2 text-center text-gray-900 font-semibold">{formatCurrency(totalValue)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-sm font-semibold text-gray-900">Total</td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                      {formatNumber(items.reduce((sum, item) => sum + (item.totalQuantity || item.total_quantity || 0), 0))}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                      {formatNumber(items.reduce((sum, item) => sum + (item.received || 0), 0))}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-orange-700">
                      {formatNumber(items.reduce((sum, item) => sum + (item.short || 0), 0))}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-red-700">
                      {formatNumber(items.reduce((sum, item) => sum + (item.rejected || 0), 0))}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">-</td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                      {formatCurrency(items.reduce((sum, item) => sum + ((item.totalValue || item.total_value || ((item.totalQuantity || item.total_quantity || 0) * (item.unitPrice || item.unit_price || 0)))), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Total Quantity</label>
                <p className="text-lg font-bold text-gray-900">{formatNumber(record.totalQuantity || 0)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Total Received</label>
                <p className="text-lg font-bold text-green-700">{formatNumber(record.received || 0)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Total Short</label>
                <p className="text-lg font-bold text-orange-700">{formatNumber(record.short || 0)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Total Rejected</label>
                <p className="text-lg font-bold text-red-700">{formatNumber(record.rejected || 0)}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Total Value</label>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(record.totalValue || 0)}</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Reason for Receipt</label>
                <p className="text-sm text-gray-900">{(record as any).reason || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRejectedShortModal;
