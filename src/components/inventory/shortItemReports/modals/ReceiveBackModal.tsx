import React from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../../../utils/formatters';
import { ShortItemReport, ShortItemActionFormData } from '../types';

interface ReceiveBackModalProps {
  report: ShortItemReport;
  formData: ShortItemActionFormData;
  vendors: any[];
  brands: any[];
  teams: any[];
  processing: boolean;
  onClose: () => void;
  onFormChange: (data: Partial<ShortItemActionFormData>) => void;
  onSubmit: () => void;
}

const ReceiveBackModal: React.FC<ReceiveBackModalProps> = ({
  report,
  formData,
  vendors,
  brands,
  teams,
  processing,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const availableShortQty = report.shortQuantity - (report.receivedBack || 0);
  const maxQuantity = availableShortQty;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Receive Back</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={processing}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Item Info */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm">
                <span className="font-medium text-gray-700">Item:</span>{' '}
                <span className="text-gray-900">{report.itemName} ({report.skuCode || `SKU-${report.skuId}`})</span>
              </p>
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vendorId}
                onChange={(e) => onFormChange({ vendorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.brandId}
                onChange={(e) => onFormChange({ brandId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shorted Value (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shorted Value</label>
              <input
                type="text"
                value={formatNumber(report.shortQuantity)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                readOnly
                disabled
              />
            </div>

            {/* Receive Shorted Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receive Shorted Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={maxQuantity}
                value={formData.quantity}
                onChange={(e) => onFormChange({ quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: {formatNumber(maxQuantity)}
              </p>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => onFormChange({ date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.invoiceChallan}
                onChange={(e) => onFormChange({ invoiceChallan: e.target.value })}
                placeholder="Enter invoice number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              />
            </div>

            {/* Received By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received By <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.receivedBy || ''}
                onChange={(e) => onFormChange({ receivedBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              >
                <option value="">Select Team Member</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={processing || formData.quantity <= 0 || !formData.vendorId || !formData.brandId || !formData.date || !formData.invoiceChallan || !formData.receivedBy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Receive Back'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveBackModal;
