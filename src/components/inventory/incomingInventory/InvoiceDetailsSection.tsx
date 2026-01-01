import React from 'react';
import { IncomingInventoryFormData } from './types';

interface InvoiceDetailsSectionProps {
  formData: IncomingInventoryFormData;
  onFormDataChange: (updates: Partial<IncomingInventoryFormData>) => void;
}

const InvoiceDetailsSection: React.FC<InvoiceDetailsSectionProps> = ({
  formData,
  onFormDataChange,
}) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Invoice/Challan Details <span className="text-red-500">*</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice/Challan Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.invoiceDate}
            max={today}
            onChange={(e) => onFormDataChange({ invoiceDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice/Challan Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.invoiceNumber}
            onChange={(e) => onFormDataChange({ invoiceNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter invoice number"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Docket Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.docketNumber}
            onChange={(e) => onFormDataChange({ docketNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter docket number"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transportor Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.transportorName}
            onChange={(e) => onFormDataChange({ transportorName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter transportor name"
            required
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsSection;
