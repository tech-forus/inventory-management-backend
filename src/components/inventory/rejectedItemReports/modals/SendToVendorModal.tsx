import React from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../../../utils/formatters';
import { RejectedItemReport, ActionFormData } from '../types';

interface SendToVendorModalProps {
  report: RejectedItemReport;
  formData: ActionFormData;
  vendors: any[];
  brands: any[];
  processing: boolean;
  onClose: () => void;
  onFormChange: (data: Partial<ActionFormData>) => void;
  onSubmit: () => void;
}

const SendToVendorModal: React.FC<SendToVendorModalProps> = ({
  report,
  formData,
  vendors,
  brands,
  processing,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const availableQty = report.quantity - (report.sentToVendor || 0) - (report.receivedBack || 0) - (report.scrapped || 0);
  const maxQuantity = report.quantity - (report.sentToVendor || 0) - (report.receivedBack || 0) - (report.scrapped || 0);

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
            <h2 className="text-2xl font-bold text-gray-900">Send to Vendor</h2>
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

            {/* Rejected Quantity (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejected Quantity</label>
              <input
                type="text"
                value={formatNumber(report.quantity)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                readOnly
                disabled
              />
            </div>

            {/* Already Sent (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Already Sent</label>
              <input
                type="text"
                value={formatNumber(report.sentToVendor || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                readOnly
                disabled
              />
            </div>

            {/* Send Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send Quantity <span className="text-red-500">*</span>
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

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice !== undefined ? formData.unitPrice : ''}
                onChange={(e) => onFormChange({ unitPrice: parseFloat(e.target.value) || 0 })}
                placeholder="Enter unit price"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the unit price for this item
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

            {/* Docket/Tracking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Docket/Tracking</label>
              <input
                type="text"
                value={formData.docketTracking}
                onChange={(e) => onFormChange({ docketTracking: e.target.value })}
                placeholder="Enter docket or tracking number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
              />
            </div>

            {/* Transporter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transporter</label>
              <input
                type="text"
                value={formData.transporter}
                onChange={(e) => onFormChange({ transporter: e.target.value })}
                placeholder="Enter transporter name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => onFormChange({ reason: e.target.value })}
                placeholder="Quality defect, wrong specs, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={processing}
                required
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
              disabled={processing || formData.quantity <= 0 || !formData.vendorId || !formData.brandId || !formData.reason || !formData.date || !formData.unitPrice || formData.unitPrice < 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Send to Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendToVendorModal;

