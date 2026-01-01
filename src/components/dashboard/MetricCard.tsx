import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  bgColor: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, iconColor, bgColor, onClick }) => {
  return (
    <div
      className={`bg-white rounded-[1.5rem] border border-slate-100 shadow-sm py-[30px] px-6 hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-black leading-[1.4] text-slate-900 uppercase mb-1.5" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>{label}</p>
          <p className="text-[22.5px] font-black leading-[1.2] text-slate-900 tracking-tight">{value}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-xl`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;

