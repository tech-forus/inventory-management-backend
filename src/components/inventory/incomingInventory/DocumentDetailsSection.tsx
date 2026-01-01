import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { IncomingInventoryFormData } from './types';

interface DocumentDetailsSectionProps {
  formData: IncomingInventoryFormData;
  vendors: any[];
  customers: any[];
  brands: any[];
  onFormDataChange: (updates: Partial<IncomingInventoryFormData>) => void;
}

const DocumentDetailsSection: React.FC<DocumentDetailsSectionProps> = ({
  formData,
  vendors,
  customers,
  brands,
  onFormDataChange,
}) => {
  const navigate = useNavigate();

  const renderDocumentSubTypeDropdown = () => {
    if (formData.documentType === 'bill') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Type</label>
          <select
            value={formData.documentSubType}
            onChange={(e) => {
              const newSubType = e.target.value;
              if (newSubType === 'from_vendor') {
                onFormDataChange({ documentSubType: newSubType, vendorSubType: 'purchase_receipt', vendorId: '', brandId: '', destinationId: '' });
              } else {
                onFormDataChange({ documentSubType: newSubType, vendorSubType: '', vendorId: '', brandId: '', destinationId: '' });
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="from_vendor">From Vendor</option>
            <option value="from_customer">From Customer</option>
          </select>
        </div>
      );
    } else if (formData.documentType === 'delivery_challan') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Type</label>
          <select
            value={formData.documentSubType}
            onChange={(e) => onFormDataChange({ documentSubType: e.target.value, deliveryChallanSubType: '' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="sample">Sample</option>
            <option value="replace">Replace</option>
          </select>
        </div>
      );
    } else if (formData.documentType === 'transfer_note') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
          <input
            type="text"
            value="Factory to Store"
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        </div>
      );
    }
    return null;
  };

  const renderVendorSubTypeDropdown = () => {
    if (formData.documentType === 'bill' && formData.documentSubType === 'from_vendor') {
      return (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Document Subtype</label>
          <select
            value={formData.vendorSubType}
            onChange={(e) => onFormDataChange({ vendorSubType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="purchase_receipt">Purchase Receipt</option>
          </select>
        </div>
      );
    }
    return null;
  };

  const renderDeliveryChallanSampleDropdown = () => {
    if (formData.documentType === 'delivery_challan' && formData.documentSubType === 'sample') {
      return (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sample Type</label>
          <select
            value={formData.deliveryChallanSubType}
            onChange={(e) => onFormDataChange({ deliveryChallanSubType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="vendor">Vendor</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      );
    }
    return null;
  };

  const renderVendorBrandSection = () => {
    if (formData.documentType === 'bill' && formData.documentSubType === 'from_vendor') {
      return (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor & Brand</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={formData.vendorId}
                  onChange={(e) => onFormDataChange({ vendorId: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/app/library?tab=vendors')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={formData.brandId}
                  onChange={(e) => onFormDataChange({ brandId: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/app/library?tab=brands')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  value={formData.warranty}
                  onChange={(e) => onFormDataChange({ warranty: parseInt(e.target.value) || 0 })}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => onFormDataChange({ warrantyUnit: 'months' })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.warrantyUnit === 'months'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Months
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormDataChange({ warrantyUnit: 'year' })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.warrantyUnit === 'year'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Year
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomerDropdown = () => {
    if (formData.documentType === 'bill' && formData.documentSubType === 'from_customer') {
      return (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer <span className="text-red-500">*</span></label>
            <select
              value={formData.destinationId}
              onChange={(e) => onFormDataChange({ destinationId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerName || customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Details <span className="text-red-500">*</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <div className="space-y-2">
              <label 
                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => onFormDataChange({ documentType: 'bill' })}
              >
                <input
                  type="radio"
                  name="documentType"
                  value="bill"
                  checked={formData.documentType === 'bill'}
                  onChange={(e) => onFormDataChange({ documentType: e.target.value as any })}
                  className="text-blue-600 cursor-pointer"
                />
                <span className="cursor-pointer">Bill</span>
              </label>
              <label 
                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => onFormDataChange({ documentType: 'delivery_challan' })}
              >
                <input
                  type="radio"
                  name="documentType"
                  value="delivery_challan"
                  checked={formData.documentType === 'delivery_challan'}
                  onChange={(e) => onFormDataChange({ documentType: e.target.value as any })}
                  className="text-blue-600 cursor-pointer"
                />
                <span className="cursor-pointer">Delivery Challan</span>
              </label>
              <label 
                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => onFormDataChange({ documentType: 'transfer_note' })}
              >
                <input
                  type="radio"
                  name="documentType"
                  value="transfer_note"
                  checked={formData.documentType === 'transfer_note'}
                  onChange={(e) => onFormDataChange({ documentType: e.target.value as any })}
                  className="text-blue-600 cursor-pointer"
                />
                <span className="cursor-pointer">Transfer Note</span>
              </label>
            </div>
          </div>
          <div>
            {renderDocumentSubTypeDropdown()}
            {renderVendorSubTypeDropdown()}
            {renderDeliveryChallanSampleDropdown()}
          </div>
        </div>
      </div>
      {renderVendorBrandSection()}
      {renderCustomerDropdown()}
    </>
  );
};

export default DocumentDetailsSection;
