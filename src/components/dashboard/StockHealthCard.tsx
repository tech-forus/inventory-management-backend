import React from 'react';
import { formatNumber } from '../../utils/formatters';

interface StockHealthCardProps {
  nonMovable: number;
  slowSKUs: number;
  nonMovablePeriod: number;
  slowSKUsPeriod: number;
  onNonMovablePeriodChange: (period: number) => void;
  onSlowSKUsPeriodChange: (period: number) => void;
  onNonMovableClick?: () => void;
  onSlowSKUsClick?: () => void;
  loading?: boolean;
}

const StockHealthCard: React.FC<StockHealthCardProps> = ({
  nonMovable,
  slowSKUs,
  nonMovablePeriod,
  slowSKUsPeriod,
  onNonMovablePeriodChange,
  onSlowSKUsPeriodChange,
  onNonMovableClick,
  onSlowSKUsClick,
  loading = false,
}) => {
  const periods = [3, 6, 12];

  const MetricRow: React.FC<{
    label: string;
    value: number;
    period: number;
    onPeriodChange: (period: number) => void;
    dotColor: string;
    onClick?: () => void;
  }> = ({ label, value, period, onPeriodChange, dotColor, onClick }) => (
    <div
      className={`flex-1 flex items-center justify-between border-b border-slate-100 last:border-b-0 py-4 ${onClick ? 'cursor-pointer hover:bg-slate-50/40 transition-colors' : ''
        }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm`}></div>
        <span className="text-sm font-black text-slate-700 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${period === p
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {p}M
            </button>
          ))}
        </div>
      </div>
      <div className="ml-4">
        <span className="text-xl font-black text-slate-900">
          {loading ? (
            <span className="inline-block w-8 h-5 bg-slate-200 rounded animate-pulse"></span>
          ) : (
            formatNumber(value)
          )}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-wider">Stock Health</h3>
      </div>
      <div className="flex-1 flex flex-col">
        <MetricRow
          label="Slow SKUs"
          value={slowSKUs}
          period={slowSKUsPeriod}
          onPeriodChange={onSlowSKUsPeriodChange}
          dotColor="bg-amber-500"
          onClick={onSlowSKUsClick}
        />
        <MetricRow
          label="Non Movable"
          value={nonMovable}
          period={nonMovablePeriod}
          onPeriodChange={onNonMovablePeriodChange}
          dotColor="bg-rose-500"
          onClick={onNonMovableClick}
        />
      </div>
    </div>
  );
};

export default StockHealthCard;

