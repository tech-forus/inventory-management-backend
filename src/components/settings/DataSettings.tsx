import React from 'react';
import { Database, FileText, Trash2 } from 'lucide-react';

interface DataSettingsProps {
  onReset: () => void;
}

const DataSettings: React.FC<DataSettingsProps> = ({ onReset }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <Database className="w-5 h-5 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Data Management</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Export Data</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Download your data in various formats</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export Data
          </button>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-5 h-5 text-yellow-600" />
            <h3 className="font-medium text-gray-900">Clear Cache</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Clear cached data to free up space</p>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            Clear Cache
          </button>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-gray-900">Reset Settings</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Reset all settings to default values</p>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataSettings;





