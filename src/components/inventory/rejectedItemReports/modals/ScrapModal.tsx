import React from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../../../utils/formatters';
import { RejectedItemReport, ActionFormData } from '../types';

interface ScrapModalProps {
  report: RejectedItemReport;
  formData: ActionFormData;
  teams: any[];
  processing: boolean;
  onClose: () => void;
  onFormChange: (data: Partial<ActionFormData>) => void;
  onSubmit: () => void;
}

const ScrapModal: React.FC<ScrapModalProps> = ({
  report,
  formData,
  teams,
  processing,
  onClose,
  onFormChange,
  onSubmit,
}) => {
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
            <h2 className="text-2xl font-bold text-gray-900">Scrap Items</h2>
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

            {/* Already Scrapped (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Already Scrapped</label>
              <input
                type="text"
                value={formatNumber(report.scrapped || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                readOnly
                disabled
              />
            </div>

            {/* Scrap Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scrap Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={maxQuantity}
                value={formData.quantity}
                onChange={(e) => onFormChange({ quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={processing}
                required
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scrapReason"
                    value="beyond-repair"
                    checked={formData.scrapReason === 'beyond-repair'}
                    onChange={(e) => onFormChange({ scrapReason: e.target.value as any, scrapReasonOther: '' })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700">Beyond repair</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scrapReason"
                    value="not-worth-return"
                    checked={formData.scrapReason === 'not-worth-return'}
                    onChange={(e) => onFormChange({ scrapReason: e.target.value as any, scrapReasonOther: '' })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700">Not worth return cost</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scrapReason"
                    value="expired-obsolete"
                    checked={formData.scrapReason === 'expired-obsolete'}
                    onChange={(e) => onFormChange({ scrapReason: e.target.value as any, scrapReasonOther: '' })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700">Expired/obsolete</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scrapReason"
                    value="other"
                    checked={formData.scrapReason === 'other'}
                    onChange={(e) => onFormChange({ scrapReason: e.target.value as any })}
                    className="mr-2"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-700 mr-2">Other:</span>
                  {formData.scrapReason === 'other' && (
                    <input
                      type="text"
                      value={formData.scrapReasonOther}
                      onChange={(e) => onFormChange({ scrapReasonOther: e.target.value })}
                      placeholder="Specify reason"
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={processing}
                    />
                  )}
                </label>
              </div>
            </div>

            {/* Approved By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved By <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.approvedBy}
                onChange={(e) => onFormChange({ approvedBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={processing}
                required
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => onFormChange({ remarks: e.target.value })}
                placeholder="Additional notes or comments"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                disabled={processing}
              />
            </div>

            {/* Warning Message */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <span className="text-yellow-600 font-bold">⚠️</span>
                This action cannot be undone
              </p>
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
              disabled={processing || formData.quantity <= 0 || !formData.date || !formData.approvedBy || (formData.scrapReason === 'other' && !formData.scrapReasonOther.trim())}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Confirm Scrap'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrapModal;

