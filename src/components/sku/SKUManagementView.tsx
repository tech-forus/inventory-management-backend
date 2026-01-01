import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ArrowUp, ArrowDown, ChevronsDown } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string | number; name: string }>;
  disabled?: boolean;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options, disabled = false }) => (
  <div className="relative group">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="appearance-none bg-white border border-slate-200 text-[11.7px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full min-w-[135px] disabled:bg-slate-100 disabled:cursor-not-allowed"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
    <ChevronDown size={13.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
  </div>
);

interface SKU {
  id: number;
  skuId: string;
  itemName: string;
  model?: string;
  hsnSacCode?: string;
  brand: string;
  currentStock: number;
  minStockLevel?: number;
  minStock?: number;
  totalStocks?: number;
  bookStocks?: number;
  usefulStocks?: number;
  // Optional specifications
  ratingSize?: string;
  series?: string;
  material?: string;
  insulation?: string;
  inputSupply?: string;
  color?: string;
  cri?: string;
  cct?: string;
  beamAngle?: string;
  ledType?: string;
  shape?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  gstRate?: number;
}

interface SKUManagementViewProps {
  // Header
  title?: string;
  description?: string;

  // Search and Filters
  search: string;
  onSearchChange: (value: string) => void;
  productCategory: string;
  onProductCategoryChange: (value: string) => void;
  itemCategory: string;
  onItemCategoryChange: (value: string) => void;
  subCategory: string;
  onSubCategoryChange: (value: string) => void;
  brand: string;
  onBrandChange: (value: string) => void;
  stockStatus: string;
  onStockStatusChange: (value: string) => void;
  onResetFilters: () => void;

  // Dropdown Options
  productCategories: Array<{ id: string | number; name: string }>;
  itemCategories: Array<{ id: string | number; name: string }>;
  subCategories: Array<{ id: string | number; name: string }>;
  brands: Array<{ id: string | number; name: string }>;

  // Table Data
  skus: SKU[];
  loading?: boolean;
  onSKUClick?: (skuId: string) => void;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const SKUManagementView: React.FC<SKUManagementViewProps> = ({
  title = 'SKU Management',
  description = 'Detailed tracking and administration of global product identifiers.',
  search,
  onSearchChange,
  productCategory,
  onProductCategoryChange,
  itemCategory,
  onItemCategoryChange,
  subCategory,
  onSubCategoryChange,
  brand,
  onBrandChange,
  stockStatus,
  onStockStatusChange,
  onResetFilters,
  productCategories,
  itemCategories,
  subCategories,
  brands,
  skus,
  loading = false,
  onSKUClick,
  sortBy,
  sortOrder = 'asc',
  onSort,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);

  // Close expanded rows when clicking outside
  useEffect(() => {
    if (expandedRows.size === 0) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setExpandedRows(new Set());
      }
    };

    // Attach the listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedRows]);

  const getStockStatus = (currentStock: number, minStockLevel: number): { label: string; color: string; bgColor: string; borderColor: string; dotColor: string } => {
    if (currentStock === 0) {
      return {
        label: 'Out of Stock',
        color: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100',
        dotColor: 'bg-rose-500',
      };
    } else if (currentStock <= minStockLevel) {
      return {
        label: 'Low Stock',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-100',
        dotColor: 'bg-yellow-400',
      };
    } else {
      return {
        label: 'In Stock',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-100',
        dotColor: 'bg-emerald-500',
      };
    }
  };

  const stockStatusOptions = [
    { id: 'all', name: 'All Stock Status' },
    { id: 'out_of_stock', name: 'Out of Stock' },
    { id: 'low_stock', name: 'Low Stock' },
    { id: 'in_stock', name: 'In Stock' },
  ];

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const SortIcon = ({ field }: { field: string }) => {
    if (!onSort || sortBy !== field) {
      return (
        <span className="inline-flex flex-col ml-[3px] text-slate-400">
          <ArrowUp className="w-[9px] h-[9px] -mb-[1.5px]" />
          <ArrowDown className="w-[9px] h-[9px]" />
        </span>
      );
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-[3px] text-indigo-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-[3px] text-indigo-600" />
    );
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="p-6 space-y-[30px] w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[18px]">
        <div className="space-y-1.5">
          <h1 className="text-[21.6px] font-semibold leading-[1.2] tracking-[-0.01em] text-slate-900">{title}</h1>
          <p className="text-[12.6px] font-normal leading-[1.5] text-slate-500">{description}</p>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="bg-white p-[18px] rounded-[1.875rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Main Search */}
          <div className="flex-1 min-w-[210px] relative group">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="SEARCH SKU ID, ITEM NAME..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 text-[11.7px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[11.7px] placeholder:font-normal placeholder:tracking-[0.05em] text-slate-800 pl-9 pr-3 py-[9px] rounded-[1.125rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <FilterSelect
            label="All Product Categories"
            value={productCategory}
            onChange={onProductCategoryChange}
            options={productCategories}
          />
          <FilterSelect
            label="All Item Categories"
            value={itemCategory}
            onChange={onItemCategoryChange}
            options={itemCategories}
            disabled={!productCategory}
          />
          <FilterSelect
            label="All Sub Categories"
            value={subCategory}
            onChange={onSubCategoryChange}
            options={subCategories}
            disabled={!itemCategory}
          />
          <FilterSelect
            label="All Brands"
            value={brand}
            onChange={onBrandChange}
            options={brands}
          />
          <FilterSelect
            label="All Stock Status"
            value={stockStatus}
            onChange={onStockStatusChange}
            options={stockStatusOptions}
          />

          <button
            onClick={onResetFilters}
            className="text-[11.7px] font-black text-indigo-600 uppercase tracking-[0.1em] hover:text-indigo-700 hover:underline px-3 py-[6px] transition-all whitespace-nowrap"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div ref={tableRef} className="bg-white rounded-[1.875rem] border border-slate-100 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center mx-auto">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th 
                  className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
                  onClick={() => onSort?.('skuId')}
                >
                  <div className="flex items-center justify-center gap-[6px]">
                    SKU ID
                    {onSort && <SortIcon field="skuId" />}
                  </div>
                </th>
                <th 
                  className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
                  onClick={() => onSort?.('itemName')}
                >
                  <div className="flex items-center justify-center gap-[6px]">
                    Item Name
                    {onSort && <SortIcon field="itemName" />}
                  </div>
                </th>
                <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">Model Number</th>
                <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">HSN Code</th>
                <th 
                  className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
                  onClick={() => onSort?.('brand')}
                >
                  <div className="flex items-center justify-center gap-[6px]">
                    Brand
                    {onSort && <SortIcon field="brand" />}
                  </div>
                </th>
                <th 
                  className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
                  onClick={() => onSort?.('usefulStocks')}
                >
                  <div className="flex items-center justify-center gap-[6px]">
                    Available Stocks
                    {onSort && <SortIcon field="usefulStocks" />}
                  </div>
                </th>
                <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">GST%</th>
                <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-[30px] py-9 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : skus.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-[30px] py-9 text-center text-slate-500 font-medium">
                    No SKUs found
                  </td>
                </tr>
              ) : (
                skus.map((sku) => {
                  const totalStocks = sku.totalStocks ?? sku.currentStock ?? 0;
                  const bookStocks = sku.bookStocks ?? 0;
                  const availableStocks = sku.usefulStocks ?? (totalStocks - bookStocks);
                  const currentStock = sku.currentStock ?? 0;
                  const minStockLevel = sku.minStockLevel ?? sku.minStock ?? 0;
                  const stockStatusInfo = getStockStatus(currentStock, minStockLevel);
                  const isExpanded = expandedRows.has(sku.id);

                  // Calculate stock percentage for progress bar
                  const maxStockForDisplay = Math.max(500, minStockLevel * 5);
                  const stockPercentage = currentStock === 0 ? 100 : Math.min(100, (currentStock / maxStockForDisplay) * 100);

                  const sliderColor =
                    stockStatusInfo.label === 'In Stock' ? 'bg-emerald-500' :
                      stockStatusInfo.label === 'Low Stock' ? 'bg-yellow-400' : 'bg-rose-500';

                  return (
                    <React.Fragment key={sku.id}>
                      <tr className="group hover:bg-slate-50/40 transition-all min-h-[42px]">
                        <td 
                          className="px-[30px] py-6 cursor-pointer text-center"
                          onClick={() => toggleRow(sku.id)}
                          title="Click to view details"
                        >
                          <span className="inline-block text-[11.7px] font-normal leading-[1.4] text-indigo-600 bg-indigo-50/50 px-3 py-[6px] rounded-lg border border-indigo-100/50">
                            {sku.skuId}
                          </span>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <span className="text-[12.6px] font-semibold leading-[1.4] text-slate-900 block group-hover:text-indigo-600 transition-colors">
                            {sku.itemName}
                          </span>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <span className="inline-block text-[11.7px] font-normal leading-[1.4] text-slate-500 bg-slate-100/50 px-[9px] py-[3px] rounded-lg">
                            {sku.model || '-'}
                          </span>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{sku.hsnSacCode || '-'}</span>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <span className="text-[11.7px] font-semibold leading-[1.4] tracking-[0.05em] uppercase text-slate-700">{sku.brand}</span>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <div className="flex flex-col items-center gap-[9px]">
                            <span className={`text-[13.5px] font-semibold leading-[1.3] ${stockStatusInfo.label === 'Out of Stock' ? 'text-rose-500' :
                                stockStatusInfo.label === 'Low Stock' ? 'text-yellow-600' : 'text-emerald-500'
                              }`}>
                              {formatNumber(availableStocks)}
                            </span>
                            <div className="w-24 h-[7.5px] bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 shadow-sm ${sliderColor}`}
                                style={{ width: `${stockStatusInfo.label === 'Out of Stock' ? 100 : stockPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <span className="text-[11.7px] font-semibold leading-[1.4] text-slate-700">
                            {sku.gstRate !== undefined && sku.gstRate !== null ? `${sku.gstRate}%` : '-'}
                          </span>
                        </td>
                        <td className="px-[30px] py-6 text-center">
                          <span className={`inline-flex items-center px-[15px] py-[6px] rounded-full text-[9.9px] font-semibold leading-[1.3] tracking-[0.08em] uppercase border ${stockStatusInfo.bgColor} ${stockStatusInfo.color} ${stockStatusInfo.borderColor}`}>
                            <span className={`w-[7.5px] h-[7.5px] rounded-full mr-[9px] animate-pulse shadow-sm ${stockStatusInfo.dotColor}`}></span>
                            {stockStatusInfo.label}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={8} className="px-[30px] py-[18px]">
                            <div className="space-y-3">
                              {/* Product Specifications */}
                              <div>
                                <h3 className="text-[10.5px] font-black leading-[1.4] text-slate-900 uppercase tracking-wider mb-[9px]">Product Specifications</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {sku.ratingSize && (
                                    <div>
                                      <span className="text-[9px] font-bold leading-[1.4] text-slate-500 uppercase tracking-wide">Rating/Size</span>
                                      <p className="text-[10.5px] leading-[1.4] text-slate-900 mt-[3px] font-medium">{sku.ratingSize}</p>
                                    </div>
                                  )}
                                  {sku.model && (
                                    <div>
                                      <span className="text-[9px] font-bold leading-[1.4] text-slate-500 uppercase tracking-wide">Model</span>
                                      <p className="text-[10.5px] leading-[1.4] text-slate-900 mt-[3px] font-medium">{sku.model}</p>
                                    </div>
                                  )}
                                  {sku.series && (
                                    <div>
                                      <span className="text-[9px] font-bold leading-[1.4] text-slate-500 uppercase tracking-wide">Series</span>
                                      <p className="text-[10.5px] leading-[1.4] text-slate-900 mt-[3px] font-medium">{sku.series}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Optional Specifications Dropdown */}
                              {(sku.material || sku.insulation || sku.inputSupply || sku.color || sku.cri || sku.cct ||
                                sku.beamAngle || sku.ledType || sku.shape ||
                                (sku.weight !== undefined && sku.weight !== null && sku.weight !== 0) ||
                                (sku.length !== undefined && sku.length !== null && sku.length !== 0) ||
                                (sku.width !== undefined && sku.width !== null && sku.width !== 0) ||
                                (sku.height !== undefined && sku.height !== null && sku.height !== 0)) && (
                                <details className="group">
                                  <summary className="flex items-center justify-between cursor-pointer text-[10.5px] font-black leading-[1.4] text-slate-900 uppercase tracking-wider hover:text-indigo-600 transition-colors">
                                    <span>Optional Specifications</span>
                                    <ChevronsDown className="w-3 h-3 text-slate-500 group-open:rotate-180 transition-transform" />
                                  </summary>
                                  <div className="mt-[9px] pt-[9px] border-t border-slate-200">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-[10.5px]">
                                      {sku.material && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Material:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.material}</p>
                                        </div>
                                      )}
                                      {sku.insulation && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Insulation:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.insulation}</p>
                                        </div>
                                      )}
                                      {sku.inputSupply && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Input Supply:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.inputSupply}</p>
                                        </div>
                                      )}
                                      {sku.color && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Color:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.color}</p>
                                        </div>
                                      )}
                                      {sku.cri && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">CRI:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.cri}</p>
                                        </div>
                                      )}
                                      {sku.cct && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">CCT:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.cct}</p>
                                        </div>
                                      )}
                                      {sku.beamAngle && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Beam Angle:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.beamAngle}</p>
                                        </div>
                                      )}
                                      {sku.ledType && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">LED Type:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.ledType}</p>
                                        </div>
                                      )}
                                      {sku.shape && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Shape:</span>
                                          <p className="text-slate-600 leading-[1.4]">{sku.shape}</p>
                                        </div>
                                      )}
                                      {sku.weight !== undefined && sku.weight !== null && sku.weight !== 0 && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Weight (Kg):</span>
                                          <p className="text-slate-600 leading-[1.4]">{formatNumber(sku.weight)}</p>
                                        </div>
                                      )}
                                      {sku.length !== undefined && sku.length !== null && sku.length !== 0 && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Length (cm):</span>
                                          <p className="text-slate-600 leading-[1.4]">{formatNumber(sku.length)}</p>
                                        </div>
                                      )}
                                      {sku.width !== undefined && sku.width !== null && sku.width !== 0 && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Width (cm):</span>
                                          <p className="text-slate-600 leading-[1.4]">{formatNumber(sku.width)}</p>
                                        </div>
                                      )}
                                      {sku.height !== undefined && sku.height !== null && sku.height !== 0 && (
                                        <div>
                                          <span className="font-bold leading-[1.4] text-slate-700">Height (cm):</span>
                                          <p className="text-slate-600 leading-[1.4]">{formatNumber(sku.height)}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </details>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[9.75px] font-black leading-[1.4] text-slate-400 uppercase tracking-[0.2em]">
            Showing {startIndex}-{endIndex} of {totalCount.toLocaleString()} results
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-[18px] py-[9px] text-[9px] font-black text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Previous
            </button>
            <div className="flex items-center gap-[6px]">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage === 1) {
                  pageNum = i + 1;
                } else if (currentPage === totalPages) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-[30px] h-[30px] rounded-lg text-[9.75px] font-black transition-all ${currentPage === pageNum
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-[18px] py-[9px] text-[9px] font-black text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SKUManagementView;

