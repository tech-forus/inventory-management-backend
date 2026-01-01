import React from 'react';
import { Save, X } from 'lucide-react';

interface SettingsActionButtonsProps {
  hasChanges: boolean;
  loading: boolean;
  onCancel: () => void;
  onSave: () => void;
}

const SettingsActionButtons: React.FC<SettingsActionButtonsProps> = ({
  hasChanges,
  loading,
  onCancel,
  onSave,
}) => {
  return (
    <div className="flex items-center justify-end gap-[9.6px]">
      <button
        onClick={onCancel}
        disabled={!hasChanges || loading}
        className="px-[19.2px] py-[9.6px] border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10.4px] font-black uppercase tracking-wider"
      >
        <X className="w-[12.8px] h-[12.8px] inline mr-[6.4px]" />
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={!hasChanges || loading}
        className="px-[19.2px] py-[9.6px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-[6.4px] text-[10.4px] font-black uppercase tracking-wider shadow-sm"
      >
        <Save className="w-[12.8px] h-[12.8px]" />
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

export default SettingsActionButtons;




