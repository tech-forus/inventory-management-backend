import React from 'react';
import { Palette } from 'lucide-react';

interface DisplaySettingsProps {
  settingsData: {
    theme: string;
    itemsPerPage: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  onInputChange: (field: keyof DisplaySettingsProps['settingsData'], value: string | number | boolean) => void;
}

const DisplaySettings: React.FC<DisplaySettingsProps> = ({ settingsData, onInputChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Palette className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Display Settings</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <select
            value={settingsData.theme}
            onChange={(e) => onInputChange('theme', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Items Per Page
          </label>
          <select
            value={settingsData.itemsPerPage}
            onChange={(e) => onInputChange('itemsPerPage', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Auto Refresh</p>
            <p className="text-sm text-gray-500">Automatically refresh data</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.autoRefresh}
              onChange={(e) => onInputChange('autoRefresh', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settingsData.autoRefresh && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refresh Interval (seconds)
            </label>
            <input
              type="number"
              value={settingsData.refreshInterval}
              onChange={(e) => onInputChange('refreshInterval', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="5"
              max="300"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplaySettings;

