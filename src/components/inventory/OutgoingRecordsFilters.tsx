import React from 'react';
import { ChevronDown } from 'lucide-react';
import DateFilter from './DateFilter';

interface OutgoingRecordsFiltersProps {
  destination: string;
  status: string;
  datePreset: string;
  customDateFrom: string;
  customDateTo: string;
  showCustomDatePicker: boolean;
  customers: any[];
  vendors: any[];
  onDestinationChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDatePresetChange: (preset: string) => void;
  onCustomDateFromChange: (date: string) => void;
  onCustomDateToChange: (date: string) => void;
  onClearDateFilter: () => void;
}

const OutgoingRecordsFilters: React.FC<OutgoingRecordsFiltersProps> = ({
  destination,
  status,
  datePreset,
  customDateFrom,
  customDateTo,
  showCustomDatePicker,
  customers,
  vendors,
  onDestinationChange,
  onStatusChange,
  onDatePresetChange,
  onCustomDateFromChange,
  onCustomDateToChange,
  onClearDateFilter,
}) => {
  return (
    <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-sm p-[18px] space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[210px] relative group">
          <input
            type="text"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            placeholder="SEARCH CUSTOMER/VENDOR"
            className="w-full bg-slate-50 border border-slate-100 text-[14.625px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[14.625px] placeholder:font-normal placeholder:tracking-[0.05em] text-slate-800 pl-3 pr-3 py-[9px] rounded-[1.125rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>
        <div className="relative group">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-[14.625px] font-medium leading-[1.4] text-slate-700 px-[15px] py-[9px] pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full min-w-[135px]"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
        </div>
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

export default OutgoingRecordsFilters;






