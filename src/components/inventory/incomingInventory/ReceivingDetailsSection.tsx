import React from 'react';
import { IncomingInventoryFormData } from './types';

interface ReceivingDetailsSectionProps {
  formData: IncomingInventoryFormData;
  onFormDataChange: (updates: Partial<IncomingInventoryFormData>) => void;
}

const ReceivingDetailsSection: React.FC<ReceivingDetailsSectionProps> = ({
  formData,
  onFormDataChange,
}) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Receiving Details <span className="text-red-500">*</span></h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Receiving Date <span className="text-red-500">*</span></label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.useCurrentDate}
                onChange={() => onFormDataChange({ useCurrentDate: true })}
                className="text-blue-600"
                required
              />
              <span>Current Date</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!formData.useCurrentDate}
                onChange={() => onFormDataChange({ useCurrentDate: false })}
                className="text-blue-600"
                required
              />
              <span>Select Date:</span>
            </label>
            {!formData.useCurrentDate && (
              <input
                type="date"
                value={formData.receivingDate}
                max={today}
                onChange={(e) => onFormDataChange({ receivingDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivingDetailsSection;
