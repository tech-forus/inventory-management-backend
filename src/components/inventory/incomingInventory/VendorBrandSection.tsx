import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { IncomingInventoryFormData } from './types';

interface VendorBrandSectionProps {
  formData: IncomingInventoryFormData;
  vendors: any[];
  brands: any[];
  onFormDataChange: (updates: Partial<IncomingInventoryFormData>) => void;
}

const VendorBrandSection: React.FC<VendorBrandSectionProps> = ({
  formData,
  vendors,
  brands,
  onFormDataChange,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow p-6">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Warranty <span className="text-red-500">*</span></label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              value={formData.warranty}
              onChange={(e) => onFormDataChange({ warranty: parseInt(e.target.value) || 0 })}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              required
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
};

export default VendorBrandSection;
