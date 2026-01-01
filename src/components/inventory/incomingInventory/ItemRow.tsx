import React from 'react';
import { Trash2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { InvoiceItem } from './types';
import SKUSearchInput from './SKUSearchInput';

interface ItemRowProps {
  item: InvoiceItem;
  index: number;
  skus: any[];
  canRemove: boolean;
  isAdmin: boolean;
  hasPriceHistory: boolean;
  onRemove: () => void;
  onItemChange: (field: keyof InvoiceItem, value: any) => void;
  onPriceHistoryClick: () => void;
  validateTotalQuantity: (item: InvoiceItem) => boolean;
}

const ItemRow: React.FC<ItemRowProps> = ({
  item,
  index,
  skus,
  canRemove,
  isAdmin,
  hasPriceHistory,
  onRemove,
  onItemChange,
  onPriceHistoryClick,
  validateTotalQuantity,
}) => {
  const isValid = validateTotalQuantity(item);

  return (
    <>
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="grid grid-cols-[auto_2fr_auto_1fr_1fr_1fr_auto_1fr_auto_1fr_1fr_1fr_1fr_auto_1fr_1fr_auto] gap-3 items-end min-w-0 w-full">
        {/* Item Number */}
        <div className="flex items-center pb-1">
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">#{index + 1}</span>
        </div>

        {/* SKU Field - 2x weight */}
        <div className="min-w-0">
          <SKUSearchInput
            itemId={item.id}
            skuId={item.skuId}
            skus={skus}
            onSkuChange={(skuId) => {
              const sku = skus.find((s) => s.id.toString() === skuId);
              onItemChange('skuId', skuId);
              onItemChange('itemName', sku?.itemName || '');
              // Set GST rate from SKU if available (check both camelCase and snake_case)
              if (sku) {
                const gstRate = sku.gstRate ?? sku.gst_rate ?? sku.gstRatePercentage ?? sku.gst_rate_percentage;
                if (gstRate !== undefined && gstRate !== null) {
                  onItemChange('gstRate', parseFloat(gstRate) || 0);
                }
              }
            }}
            onClear={() => {
              onItemChange('skuId', '');
              onItemChange('itemName', '');
              onItemChange('gstRate', 0);
            }}
          />
        </div>

        {/* Separator */}
        <div className="w-px h-12 bg-gray-300"></div>

        {/* Ordered Qty */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Ordered Qty
          </label>
          <input
            type="number"
            min="0"
            max="100000000"
            value={item.orderedQuantity}
            onChange={(e) => {
              const orderedQty = parseInt(e.target.value) || 0;
              const clampedQty = Math.min(orderedQty, 100000000);
              onItemChange('orderedQuantity', clampedQty);
              onItemChange('totalQuantity', clampedQty);
              // Auto-calculate short
              const short = Math.max(0, clampedQty - (item.received || 0));
              onItemChange('short', short);
              onItemChange('total', clampedQty);
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            placeholder="0"
            required
          />
        </div>

        {/* Rec. Qty */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Rec. Qty</label>
          <input
            type="number"
            min="0"
            max={item.orderedQuantity || 0}
            value={item.received}
            onChange={(e) => {
              const received = parseInt(e.target.value) || 0;
              const maxReceived = item.orderedQuantity || 0;
              const clampedReceived = Math.min(received, maxReceived);
              onItemChange('received', clampedReceived);
              // Auto-calculate short
              const short = Math.max(0, (item.orderedQuantity || 0) - clampedReceived);
              onItemChange('short', short);
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            placeholder="0"
            required
          />
        </div>

        {/* Short Qty */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Short Qty</label>
          <input
            type="number"
            value={item.short}
            readOnly
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50"
            required
          />
        </div>

        {/* Separator */}
        <div className="w-px h-12 bg-gray-300"></div>

        {/* Unit Price (Excl GST) */}
        <div className="min-w-0">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
            Unit Price (Excl GST)
            {isAdmin && item.skuId && hasPriceHistory && (
              <button
                type="button"
                onClick={onPriceHistoryClick}
                className="text-blue-600 hover:text-blue-800"
                title="View price history"
              >
                <Info className="w-3 h-3" />
              </button>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100000000"
            value={item.unitPrice}
            onChange={(e) => {
              const unitPrice = parseFloat(e.target.value) || 0;
              const clampedPrice = Math.min(unitPrice, 100000000);
              onItemChange('unitPrice', clampedPrice);
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            placeholder="0"
            required
          />
        </div>

        {/* Separator */}
        <div className="w-px h-12 bg-gray-300"></div>

        {/* GST %} */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={item.gstRate}
            onChange={(e) => {
              const gstRate = parseFloat(e.target.value) || 0;
              onItemChange('gstRate', gstRate);
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        {/* Total (Excl GST) */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Total (Excl GST)</label>
          <input
            type="text"
            value={item.totalExclGst.toFixed(2)}
            readOnly
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50"
          />
        </div>

        {/* GST Amount */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">GST Amount</label>
          <input
            type="text"
            value={item.gstAmount.toFixed(2)}
            readOnly
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50"
          />
        </div>

        {/* Total (Incl GST) */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Total (Incl GST)</label>
          <input
            type="text"
            value={item.totalInclGst.toFixed(2)}
            readOnly
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 font-semibold"
            required
          />
        </div>

        {/* Separator */}
        <div className="w-px h-12 bg-gray-300"></div>

        {/* Boxes Ord */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Boxes Ord</label>
          <input
            type="number"
            min="0"
            max="1000000"
            value={item.numberOfBoxes}
            onChange={(e) => {
              const boxes = parseInt(e.target.value) || 0;
              const clampedBoxes = Math.min(boxes, 1000000);
              onItemChange('numberOfBoxes', clampedBoxes);
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        {/* Boxes Rec */}
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Boxes Rec</label>
          <input
            type="number"
            min="0"
            max={item.numberOfBoxes || 0}
            value={item.receivedBoxes}
            onChange={(e) => {
              const receivedBoxes = parseInt(e.target.value) || 0;
              const maxReceivedBoxes = item.numberOfBoxes || 0;
              const clampedReceivedBoxes = Math.min(receivedBoxes, maxReceivedBoxes);
              onItemChange('receivedBoxes', clampedReceivedBoxes);
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        {/* Validation & Remove */}
        <div className="flex items-center justify-center pb-1">
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-600 hover:text-red-800 transition-colors"
              title="Remove Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <>
              {item.orderedQuantity > 0 && !isValid && (
                <div className="flex flex-col items-center gap-0.5" title="Ordered Quantity must equal sum">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-500 text-[10px]">Invalid</span>
                </div>
              )}
              {item.orderedQuantity > 0 && isValid && (
                <div className="flex flex-col items-center gap-0.5" title="Validation passed">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 text-[10px]">Valid</span>
                </div>
              )}
              {item.orderedQuantity === 0 && (
                <span className="text-xs text-gray-400">Exp: {(item.received || 0) + (item.short || 0)}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ItemRow;
