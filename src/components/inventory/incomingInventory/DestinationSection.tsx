import React from 'react';
import { IncomingInventoryFormData } from './types';

interface DestinationSectionProps {
  formData: IncomingInventoryFormData;
  vendors: any[];
  customers: any[];
  onFormDataChange: (updates: Partial<IncomingInventoryFormData>) => void;
}

const DestinationSection: React.FC<DestinationSectionProps> = ({
  formData,
  vendors,
  customers,
  onFormDataChange,
}) => {
  const renderDestinationDropdown = () => {
    // For Transfer Note, skip destination dropdown
    if (formData.documentType === 'transfer_note') {
      return null;
    }

    // For Delivery Challan > Replace, auto-select customer
    if (formData.documentType === 'delivery_challan' && formData.documentSubType === 'replace') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          <select
            value={formData.destinationId}
            onChange={(e) => onFormDataChange({ destinationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerName || customer.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // For other cases, show appropriate dropdown
    if (formData.destinationType === 'customer') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          <select
            value={formData.destinationId}
            onChange={(e) => onFormDataChange({ destinationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerName || customer.name}
              </option>
            ))}
          </select>
        </div>
      );
    } else if (formData.destinationType === 'vendor') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
          <select
            value={formData.destinationId}
            onChange={(e) => onFormDataChange({ destinationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name || vendor.vendorName}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return null;
  };

  const destinationDropdown = renderDestinationDropdown();

  if (!destinationDropdown) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Destination</h2>
      {destinationDropdown}
    </div>
  );
};

export default DestinationSection;
