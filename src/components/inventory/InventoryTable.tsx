import React from 'react';
import { InventoryItem } from './types';
import InventoryRow from './InventoryRow';

interface InventoryTableProps {
  inventory: InventoryItem[];
  loading: boolean;
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
  onDeleteItem?: (id: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  SortIcon?: ({ field }: { field: string }) => React.ReactNode;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory,
  loading,
  expandedRows,
  onToggleRow,
  onDeleteItem,
  sortBy,
  sortOrder,
  onSort,
  SortIcon,
}) => {
  return (
    <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-center mx-auto">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center w-[30px]"></th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                SKU ID
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('productCategory')}
              >
                <div className="flex items-center justify-center gap-2">
                  Product Category
                  {SortIcon && <SortIcon field="productCategory" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('itemCategory')}
              >
                <div className="flex items-center justify-center gap-2">
                  Item Category
                  {SortIcon && <SortIcon field="itemCategory" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('subCategory')}
              >
                <div className="flex items-center justify-center gap-2">
                  Sub Category
                  {SortIcon && <SortIcon field="subCategory" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('itemName')}
              >
                <div className="flex items-center justify-center gap-2">
                  Item Name
                  {SortIcon && <SortIcon field="itemName" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('brand')}
              >
                <div className="flex items-center justify-center gap-2">
                  Brand
                  {SortIcon && <SortIcon field="brand" />}
                </div>
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('vendor')}
              >
                <div className="flex items-center justify-center gap-2">
                  Vendor
                  {SortIcon && <SortIcon field="vendor" />}
                </div>
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Model Number
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                HSN Code
              </th>
              <th 
                className={`px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center ${
                  onSort ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                }`}
                onClick={() => onSort && onSort('currentStock')}
              >
                <div className="flex items-center justify-center gap-2">
                  Current Stock
                  {SortIcon && <SortIcon field="currentStock" />}
                </div>
              </th>
              <th className="px-[30px] py-[21px] text-[10.8px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={12} className="px-10 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-10 py-12 text-center text-slate-500 font-medium">
                  No inventory items found
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  isExpanded={expandedRows.has(item.id)}
                  onToggle={() => onToggleRow(item.id)}
                  onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;

