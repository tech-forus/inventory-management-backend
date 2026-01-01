import React from 'react';
import { ChevronDown, Package, History } from 'lucide-react';
import { ShortItemReport } from './types';

interface ShortItemReportActionsProps {
  report: ShortItemReport;
  isOpen: boolean;
  onToggle: () => void;
  onReceiveBack: (report: ShortItemReport) => void;
  onViewHistory: (report: ShortItemReport) => void;
  dropdownRef: (el: HTMLDivElement | null) => void;
}

const ShortItemReportActions: React.FC<ShortItemReportActionsProps> = ({
  report,
  isOpen,
  onToggle,
  onReceiveBack,
  onViewHistory,
  dropdownRef,
}) => {
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        title="Actions"
      >
        Actions
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => onReceiveBack(report)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Receive Back
            </button>
            <button
              onClick={() => onViewHistory(report)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortItemReportActions;




