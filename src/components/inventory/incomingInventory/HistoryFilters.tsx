import React from 'react';

interface HistoryFiltersProps {
  dateFrom: string;
  dateTo: string;
  filterVendor: string;
  filterSKU: string;
  vendors: any[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onFilterVendorChange: (value: string) => void;
  onFilterSKUChange: (value: string) => void;
}

const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  dateFrom,
  dateTo,
  filterVendor,
  filterSKU,
  vendors,
  onDateFromChange,
  onDateToChange,
  onFilterVendorChange,
  onFilterSKUChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <select
            value={filterVendor}
            onChange={(e) => onFilterVendorChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input
            type="text"
            value={filterSKU}
            onChange={(e) => onFilterSKUChange(e.target.value)}
            placeholder="Search SKU"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default HistoryFilters;
