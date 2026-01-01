import React from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../../../utils/formatters';
import { RejectedItemReport, ActionFormData } from '../types';

interface ReceiveFromVendorModalProps {
  report: RejectedItemReport;
  formData: ActionFormData;
  vendors: any[];
  brands: any[];
  processing: boolean;
  onClose: () => void;
  onFormChange: (data: Partial<ActionFormData>) => void;
  onSubmit: () => void;
}

const ReceiveFromVendorModal: React.FC<ReceiveFromVendorModalProps> = ({
  report,
  formData,
  vendors,
  brands,
  processing,
  onClose,
  onFormChange,
  onSubmit,
}) => {
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
            <h2 className="text-2xl font-bold text-gray-900">Receive from Vendor</h2>
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

            {/* Originally Sent (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Originally Sent</label>
              <input
                type="text"
                value={formatNumber(report.sentToVendor || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                readOnly
                disabled
              />
            </div>

            {/* Already Received (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Already Received</label>
              <input
                type="text"
                value={formatNumber(report.receivedBack || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                readOnly
                disabled
              />
            </div>

            {/* Receive Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receive Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={report.sentToVendor || 0}
                value={formData.quantity}
                onChange={(e) => onFormChange({ quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: {formatNumber(report.sentToVendor || 0)}
              </p>
            </div>

            {/* Short Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Item
              </label>
              <input
                type="number"
                min="0"
                max={formData.quantity || 0}
                value={formData.shortItem !== undefined ? formData.shortItem : ''}
                onChange={(e) => onFormChange({ shortItem: parseInt(e.target.value) || 0 })}
                placeholder="Enter short item quantity (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the quantity of short items (if any). Max: {formatNumber(formData.quantity || 0)}
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

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="condition"
                    value="replaced"
                    checked={formData.condition === 'replaced'}
                    onChange={(e) => onFormChange({ condition: e.target.value as any })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700">Replaced</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="condition"
                    value="repaired"
                    checked={formData.condition === 'repaired'}
                    onChange={(e) => onFormChange({ condition: e.target.value as any })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700">Repaired</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="condition"
                    value="as-is"
                    checked={formData.condition === 'as-is'}
                    onChange={(e) => onFormChange({ condition: e.target.value as any })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700">As-is (accepted)</span>
                </label>
              </div>
            </div>

            {/* Invoice/Challan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice/Challan</label>
              <input
                type="text"
                value={formData.invoiceChallan}
                onChange={(e) => onFormChange({ invoiceChallan: e.target.value })}
                placeholder="Enter invoice or challan number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => onFormChange({ remarks: e.target.value })}
                placeholder="Additional notes or comments"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={processing}
              />
            </div>

            {/* Add to Stock Info (Always Mandatory) */}
            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <label className="text-sm font-medium text-gray-700">
                  Items will be automatically added to available stock
                </label>
              </div>
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
              disabled={processing || formData.quantity <= 0 || !formData.vendorId || !formData.brandId || !formData.date}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Receive & Add to Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveFromVendorModal;

