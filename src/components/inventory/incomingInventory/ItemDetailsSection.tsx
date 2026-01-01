import React from 'react';
import { Plus } from 'lucide-react';
import { InvoiceItem } from './types';
import ItemRow from './ItemRow';

interface ItemDetailsSectionProps {
  items: InvoiceItem[];
  skus: any[];
  isAdmin: boolean;
  priceHistoryMap: { [key: string]: boolean };
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onItemChange: (id: string, field: keyof InvoiceItem, value: any) => void;
  onPriceHistoryClick: (item: InvoiceItem) => void;
  validateTotalQuantity: (item: InvoiceItem) => boolean;
}

const ItemDetailsSection: React.FC<ItemDetailsSectionProps> = ({
  items,
  skus,
  isAdmin,
  priceHistoryMap,
  onAddItem,
  onRemoveItem,
  onItemChange,
  onPriceHistoryClick,
  validateTotalQuantity,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Item Details <span className="text-red-500">*</span></h2>
        <button
          type="button"
          onClick={onAddItem}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            skus={skus}
            canRemove={items.length > 1}
            isAdmin={isAdmin}
            hasPriceHistory={priceHistoryMap[item.skuId] || false}
            onRemove={() => onRemoveItem(item.id)}
            onItemChange={(field, value) => onItemChange(item.id, field, value)}
            onPriceHistoryClick={() => onPriceHistoryClick(item)}
            validateTotalQuantity={validateTotalQuantity}
          />
        ))}

        {/* Monetary Summary Panel */}
        {items.length > 0 && (() => {
          // Calculate totals with proper rounding
          const subtotalExclGst = items.reduce((sum, item) => {
            return sum + (parseFloat((item.totalExclGst || 0).toFixed(2)));
          }, 0);
          
          const totalGstAmount = items.reduce((sum, item) => {
            return sum + (parseFloat((item.gstAmount || 0).toFixed(2)));
          }, 0);
          
          const grandTotalInclGst = items.reduce((sum, item) => {
            return sum + (parseFloat((item.totalInclGst || 0).toFixed(2)));
          }, 0);
          
          return (
            <div className="mt-6 mb-4 flex justify-end">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm min-w-[300px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Subtotal (Excl GST)</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₹{subtotalExclGst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total GST Amount</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₹{totalGstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-4 mt-3">
                    <div className="flex justify-between items-center gap-8">
                      <span className="text-base font-semibold text-gray-900">Grand Total (Incl GST)</span>
                      <span className="text-base font-bold text-gray-900">
                        ₹{grandTotalInclGst.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ItemDetailsSection;
