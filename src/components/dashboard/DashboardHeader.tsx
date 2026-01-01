import React from 'react';
import { PanelLeftOpen, PanelLeftClose, Calendar } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  activeTabLabel?: string;
}

const DashboardHeader: React.FC<HeaderProps> = ({ onMenuClick, isSidebarOpen, activeTabLabel = 'Dashboard' }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-2xl border-b border-slate-100 px-6 py-[15px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[18px]">
          <button 
            onClick={onMenuClick}
            className="p-[9px] bg-slate-50 hover:bg-white rounded-xl transition-all active:scale-90 text-slate-600 border border-slate-200 shadow-sm hover:shadow-md"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={16.5} /> : <PanelLeftOpen size={16.5} />}
          </button>
          
          <div>
            <h2 className="text-[18px] font-black leading-[1.2] text-slate-900 tracking-tight">{activeTabLabel}</h2>
            <div className="flex items-center gap-[9px] mt-[7.5px] hidden sm:flex">
              <div className="flex items-center gap-[4.5px]">
                <div className="w-[4.5px] h-[4.5px] rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
                <span className="text-[7.5px] leading-[1.4] text-emerald-600 font-black uppercase tracking-[0.2em]">System Live</span>
              </div>
              <div className="w-[1px] h-[9px] bg-slate-200"></div>
              <div className="flex items-center gap-[4.5px]">
                <Calendar size={7.5} className="text-slate-400" />
                <span className="text-[7.5px] leading-[1.4] text-slate-500 font-black uppercase tracking-[0.2em]">{currentDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[18px]">
          {/* Right side controls or profile removed as requested */}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

