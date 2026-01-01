import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface PriceHistoryModalProps {
  isOpen: boolean;
  loading: boolean;
  data: any;
  onClose: () => void;
}

const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  loading,
  data,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-900">Buying Price History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Current Buying Price */}
              {data.current && (
                <div className="rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: '#E8F0FE' }}>
                  <div className="flex">
                    <div className="w-1" style={{ backgroundColor: '#1A73E8' }}></div>
                    <div className="flex-1 px-5 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A73E8' }}>
                        Current Buying Price
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#1A1A1A' }}>
                        <span className="font-semibold">{formatCurrency(data.current.price)}</span> from <span className="font-medium">{data.current.vendorName}</span> on <span className="font-medium">{formatDate(data.current.buyingDate)}</span> (Invoice: <span className="font-medium">{data.current.invoiceNumber}</span>)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Buying Price */}
              {data.previous && (
                <div className="rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: '#F5F5F5' }}>
                  <div className="flex">
                    <div className="w-1" style={{ backgroundColor: '#9E9E9E' }}></div>
                    <div className="flex-1 px-5 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9E9E9E' }}>
                        Previously Buying Price
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#1A1A1A' }}>
                        <span className="font-semibold">{formatCurrency(data.previous.price)}</span> from <span className="font-medium">{data.previous.vendorName}</span> on <span className="font-medium">{formatDate(data.previous.buyingDate)}</span> (Invoice: <span className="font-medium">{data.previous.invoiceNumber}</span>)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lowest Buying Price */}
              {data.lowest && (
                <div className="rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: '#E8F5E9' }}>
                  <div className="flex">
                    <div className="w-1" style={{ backgroundColor: '#43A047' }}></div>
                    <div className="flex-1 px-5 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#43A047' }}>
                        Lowest Buying Price
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#1A1A1A' }}>
                        <span className="font-semibold">{formatCurrency(data.lowest.price)}</span> from <span className="font-medium">{data.lowest.vendorName}</span> on <span className="font-medium">{formatDate(data.lowest.buyingDate)}</span> (Invoice: <span className="font-medium">{data.lowest.invoiceNumber}</span>)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!data.current && !data.previous && !data.lowest && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">No buying price history found for this SKU.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Failed to load price history.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryModal;
