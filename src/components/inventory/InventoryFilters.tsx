import React from 'react';
import { Download, ChevronDown } from 'lucide-react';
import DateFilter from './DateFilter';

interface InventoryFiltersProps {
  search: string;
  productCategory: string;
  itemCategory: string;
  subCategory: string;
  brand: string;
  stockStatus: string;
  datePreset: string;
  customDateFrom: string;
  customDateTo: string;
  showCustomDatePicker: boolean;
  productCategories: any[];
  itemCategories: any[];
  subCategories: any[];
  brands: any[];
  onSearchChange: (value: string) => void;
  onProductCategoryChange: (value: string) => void;
  onItemCategoryChange: (value: string) => void;
  onSubCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onStockStatusChange: (value: string) => void;
  onDatePresetChange: (preset: string) => void;
  onCustomDateFromChange: (date: string) => void;
  onCustomDateToChange: (date: string) => void;
  onClearDateFilter: () => void;
  showExportDropdown?: boolean;
  onExportDropdownToggle?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  exportDropdownRef?: React.RefObject<HTMLDivElement>;
  loading?: boolean;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  search,
  productCategory,
  itemCategory,
  subCategory,
  brand,
  stockStatus,
  datePreset,
  customDateFrom,
  customDateTo,
  showCustomDatePicker,
  productCategories,
  itemCategories,
  subCategories,
  brands,
  onSearchChange,
  onProductCategoryChange,
  onItemCategoryChange,
  onSubCategoryChange,
  onBrandChange,
  onStockStatusChange,
  onDatePresetChange,
  onCustomDateFromChange,
  onCustomDateToChange,
  onClearDateFilter,
  showExportDropdown = false,
  onExportDropdownToggle,
  onExportPDF,
  onExportExcel,
  onExportCSV,
  exportDropdownRef,
  loading = false,
}) => {
  return (
    <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-sm p-[18px] space-y-3">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
        <div className="flex-1 min-w-[210px] relative group">
          <input
            type="text"
            placeholder="SEARCH SKU ID, ITEM NAME, MODEL NUMBER, HSN CODE, VENDOR, BRAND..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 text-[11.7px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[11.7px] placeholder:font-normal placeholder:tracking-[0.05em] text-slate-800 pl-3 pr-3 py-[9px] rounded-[1.125rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>
        <div className="w-full sm:w-auto lg:w-36 relative group">
          <select
            value={productCategory}
            onChange={(e) => onProductCategoryChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-[11.7px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">All Product Categories</option>
            {productCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <div className="w-full sm:w-auto lg:w-36 relative group">
          <select
            value={itemCategory}
            onChange={(e) => onItemCategoryChange(e.target.value)}
            disabled={!productCategory}
            className="appearance-none bg-white border border-slate-200 text-[11.7px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">All Item Categories</option>
            {itemCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <div className="w-full sm:w-auto lg:w-30 relative group">
          <select
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-[11.7px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <div className="w-full sm:w-auto lg:w-30 relative group">
          <select
            value={stockStatus}
            onChange={(e) => onStockStatusChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-[11.7px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full"
          >
            <option value="all">All Stock Status</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="in_stock">In Stock</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
        </div>
        {onExportDropdownToggle && (
          <div className="relative w-full sm:w-auto" ref={exportDropdownRef}>
            <button
              onClick={onExportDropdownToggle}
              className="w-full sm:w-auto px-[18px] py-[9px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-[6px] text-[11.7px] font-medium whitespace-nowrap transition-all shadow-sm hover:shadow-md"
            >
              <Download className="w-3 h-3" />
              Export
              <ChevronDown className={`w-3 h-3 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-[3px] w-[120px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <button
                  onClick={onExportPDF}
                  disabled={loading}
                  className="w-full px-3 py-[9px] text-left text-[11.7px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  PDF
                </button>
                <button
                  onClick={onExportExcel}
                  disabled={loading}
                  className="w-full px-3 py-[9px] text-left text-[11.7px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  XLSX
                </button>
                <button
                  onClick={onExportCSV}
                  disabled={loading}
                  className="w-full px-3 py-[9px] text-left text-[11.7px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  CSV
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DateFilter
        datePreset={datePreset}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        showCustomDatePicker={showCustomDatePicker}
        onDatePresetChange={onDatePresetChange}
        onCustomDateFromChange={onCustomDateFromChange}
        onCustomDateToChange={onCustomDateToChange}
        onClear={onClearDateFilter}
      />
    </div>
  );
};

export default InventoryFilters;

