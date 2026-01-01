import React from 'react';
import { Shield, Lock } from 'lucide-react';

interface SecuritySettingsProps {
  settingsData: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordExpiry: number;
  };
  onInputChange: (field: keyof SecuritySettingsProps['settingsData'], value: string | number | boolean) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settingsData, onInputChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Security Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Two-Factor Authentication</p>
            <p className="text-sm text-gray-500">Add an extra layer of security</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.twoFactorAuth}
              onChange={(e) => onInputChange('twoFactorAuth', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            value={settingsData.sessionTimeout}
            onChange={(e) => onInputChange('sessionTimeout', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="5"
            max="120"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password Expiry (days)
          </label>
          <input
            type="number"
            value={settingsData.passwordExpiry}
            onChange={(e) => onInputChange('passwordExpiry', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="30"
            max="365"
          />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <Lock className="w-5 h-5" />
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;

