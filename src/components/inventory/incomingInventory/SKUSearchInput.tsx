import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface SKUSearchInputProps {
  itemId: string;
  skuId: string;
  skus: any[];
  onSkuChange: (skuId: string) => void;
  onClear: () => void;
}

const SKUSearchInput: React.FC<SKUSearchInputProps> = ({
  itemId,
  skuId,
  skus,
  onSkuChange,
  onClear,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both container and dropdown
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideContainer && isOutsideDropdown) {
        setShowDropdown(false);
        setIsTyping(false);
        // Only clear search term if no SKU is selected
        if (!skuId) {
          setSearchTerm('');
        } else {
          // Reset to show selected SKU code
          const selectedSku = skus.find((s) => s.id.toString() === skuId);
          setSearchTerm(selectedSku?.skuId || '');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [skuId, skus]);



  const selectedSku = skus.find((s) => s.id.toString() === skuId);
  const displayValue = searchTerm || (selectedSku?.skuId || '');

  const filteredSkus = searchTerm
    ? skus.filter(
        (sku) =>
          sku.skuId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sku.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : skus;

  return (
    <div ref={containerRef} className="relative sku-dropdown-container w-full min-w-0">
      <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
      <div className="flex gap-1.5 items-start">
        <div className="flex-1 relative min-w-0">
          <div className="flex gap-0.5">
            <div className="flex-1 relative min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={displayValue}
                onChange={(e) => {
                  setIsTyping(true);
                  setSearchTerm(e.target.value);
                  setShowDropdown(false);
                  if (!e.target.value) {
                    onClear();
                    setIsTyping(false);
                  }
                }}
                onFocus={() => {
                  // Don't auto-show dropdown on focus
                  // Only show selected SKU code in the input, but don't trigger dropdown
                }}
                onBlur={(e) => {
                  // Check if the focus is moving to the dropdown
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  const isMovingToDropdown = dropdownRef.current && (
                    dropdownRef.current.contains(relatedTarget) ||
                    relatedTarget === dropdownRef.current
                  );
                  
                  // Add delay to allow click events to fire first
                  setTimeout(() => {
                    // Only close if not moving to dropdown
                    if (!isMovingToDropdown) {
                      setIsTyping(false);
                    }
                  }, 200);
                }}
                placeholder="Search SKU..."
                className="w-full px-2.5 py-1.5 pr-8 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
              {(searchTerm || skuId) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                    onClear();
                    setShowDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown((prev) => !prev);
                setSearchTerm('');
                setIsTyping(false);
              }}
              className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-300"
              title="Show all SKUs"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {/* Search results dropdown - only show when user is actively typing */}
          {isTyping && searchTerm && searchTerm.length > 0 && !showDropdown && (
            <div 
              ref={dropdownRef}
              className="absolute z-[100] top-full left-0 mt-1 w-full min-w-[200px] max-w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto"
              style={{ position: 'absolute' }}
            >
              {filteredSkus.slice(0, 50).map((sku) => (
                <div
                  key={sku.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkuChange(sku.id.toString());
                    setSearchTerm('');
                    setShowDropdown(false);
                    setIsTyping(false);
                  }}
                  className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium">{sku.skuId}</div>
                  {sku.itemName && (
                    <div className="text-gray-500 text-xs">{sku.itemName}</div>
                  )}
                </div>
              ))}
              {filteredSkus.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500">No SKUs found</div>
              )}
            </div>
          )}
          {/* Full dropdown list */}
          {showDropdown && (
            <div 
              ref={dropdownRef}
              className="absolute z-[100] top-full left-0 mt-1 w-full min-w-[200px] max-w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto"
              style={{ position: 'absolute' }}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between z-10">
                <div className="text-xs font-semibold text-gray-700">Select SKU</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[calc(192px-40px)] overflow-y-auto">
                {skus.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No SKUs available</div>
                ) : (
                  skus.map((sku) => (
                    <div
                      key={sku.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkuChange(sku.id.toString());
                        setSearchTerm('');
                        setShowDropdown(false);
                        setIsTyping(false);
                      }}
                      className={`px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        skuId === sku.id.toString() ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium">{sku.skuId}</div>
                      {sku.itemName && (
                        <div className="text-gray-500 text-xs">{sku.itemName}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SKUSearchInput;
