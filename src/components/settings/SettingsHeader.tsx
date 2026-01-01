import React from 'react';

const SettingsHeader: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[19.2px]">
      <div className="space-y-[6.4px]">
        <h1 className="text-[28.8px] font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-[14.4px] text-slate-500 font-medium">Configure your application preferences and system settings.</p>
      </div>
    </div>
  );
};

export default SettingsHeader;