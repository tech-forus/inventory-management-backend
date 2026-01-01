import React from 'react';
import { ChevronDown, ChevronUp, Eye, Trash2, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatNumber, formatDate } from '../../utils/formatters';
import { InventoryItem } from './types';

interface InventoryRowProps {
  item: InventoryItem;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}

const InventoryRow: React.FC<InventoryRowProps> = ({ item, isExpanded, onToggle, onDelete }) => {
  const navigate = useNavigate();

  const getStockColor = (current: number, min: number): string => {
    const minStockLevel = (item as any).minStockLevel ?? min;
    if (current === 0) return 'text-red-600 font-semibold';
    if (current <= minStockLevel) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  return (
    <>
      <tr className="group hover:bg-slate-50/40 transition-all min-h-[56px]">
        <td className="px-[30px] py-6 text-center">
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="inline-block text-[11.7px] font-normal leading-[1.4] text-indigo-600 bg-indigo-50/50 px-3 py-[6px] rounded-xl border border-indigo-100/50">
            {item.skuId}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{item.productCategory}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{item.itemCategory}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{item.subCategory || '-'}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[12.6px] font-semibold leading-[1.4] text-slate-900 block group-hover:text-indigo-600 transition-colors">
            {item.itemName}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-semibold leading-[1.4] tracking-[0.05em] uppercase text-slate-700">{item.brand}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{item.vendor}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="inline-block text-[11.7px] font-normal leading-[1.4] text-slate-500 bg-slate-100/50 px-[9px] py-[3px] rounded-lg">
            {item.model || '-'}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{item.hsnSacCode || '-'}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span 
            className={`text-[13.5px] font-semibold leading-[1.3] ${getStockColor(item.currentStock, (item as any).minStockLevel ?? item.minStock)}`}
          >
            {formatNumber(item.currentStock)}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => navigate(`/app/sku/${item.id}`)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => navigate(`/app/inventory/${item.id}/history`)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="History"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/30">
          <td colSpan={12} className="px-[30px] py-[18px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Item Details:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.itemDetails || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Vendor Item Code:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.vendorItemCode || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Rating/Size:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.ratingSize || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Model:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.model || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Series:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.series || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">HSN/SAC Code:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.hsnSacCode || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Unit:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.unit}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Minimum Stock Level:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.minStock || '-'}</p>
              </div>
              {(item.material || item.color || item.weight) && (
                <>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Material:</span>
                    <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.material || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Color:</span>
                    <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.color || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Weight:</span>
                    <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{item.weight ? `${item.weight} Kg` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Dimensions:</span>
                    <p className="text-[10.5px] text-slate-900 mt-1 font-medium">
                      {item.length && item.width && item.height
                        ? `${item.length} × ${item.width} × ${item.height} cm`
                        : '-'}
                    </p>
                  </div>
                </>
              )}
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Last Updated:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{formatDate(item.lastUpdated)}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default InventoryRow;

