import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDateRange } from '../../utils/formatters';

interface DateFilterProps {
  datePreset: string;
  customDateFrom: string;
  customDateTo: string;
  showCustomDatePicker: boolean;
  onDatePresetChange: (preset: string) => void;
  onCustomDateFromChange: (date: string) => void;
  onCustomDateToChange: (date: string) => void;
  onClear: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  datePreset,
  customDateFrom,
  customDateTo,
  showCustomDatePicker,
  onDatePresetChange,
  onCustomDateFromChange,
  onCustomDateToChange,
  onClear,
}) => {
  const handlePresetChange = (preset: string) => {
    onDatePresetChange(preset);
    if (preset === 'custom') {
      // Custom date picker will be shown
    } else {
      onClear();
    }
  };

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-[15px] h-[15px] text-slate-500" />
          <span className="text-[14.625px] font-medium leading-[1.4] text-slate-700">Filter by Date:</span>
        </div>
        <div className="relative group">
          <select
            value={datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-[14.625px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full min-w-[135px]"
          >
            <option value="">All Dates</option>
            <option value="1month">1 Month</option>
            <option value="3months">3 Months</option>
            <option value="6months">6 Months</option>
            <option value="1year">1 Year</option>
            <option value="thisFinancialYear">This Financial Year</option>
            <option value="previousFinancialYear">Previous Financial Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
        </div>
        
        {showCustomDatePicker && (
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => onCustomDateFromChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-[14.625px] font-medium leading-[1.4] text-slate-800 px-[15px] py-[9px] rounded-[1.125rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              placeholder="From Date"
            />
            <span className="text-[14.625px] font-medium text-slate-500">to</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => onCustomDateToChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-[14.625px] font-medium leading-[1.4] text-slate-800 px-[15px] py-[9px] rounded-[1.125rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              placeholder="To Date"
            />
            <button
              onClick={onClear}
              className="text-[14.625px] font-black text-indigo-600 uppercase tracking-[0.1em] hover:text-indigo-700 hover:underline px-3 py-[6px] transition-all whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateFilter;

