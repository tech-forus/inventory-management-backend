import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon,
  Bell, 
  Shield, 
  Database,
  Palette,
  Sliders
} from 'lucide-react';
import SettingsHeader from '../components/settings/SettingsHeader';
import SettingsSidebar from '../components/settings/SettingsSidebar';
import GeneralSettings from '../components/settings/GeneralSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import DisplaySettings from '../components/settings/DisplaySettings';
import DataSettings from '../components/settings/DataSettings';
import PlanningSettings from '../components/settings/PlanningSettings';
import SettingsActionButtons from '../components/settings/SettingsActionButtons';

import { PlanningThresholds, getDefaultPlanningThresholds } from '../utils/skuClassification';

interface SettingsData {
  // General Settings
  language: string;
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  currency: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlerts: boolean;
  orderAlerts: boolean;
  reportAlerts: boolean;
  
  // Security Settings
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  
  // Display Settings
  theme: string;
  itemsPerPage: number;
  autoRefresh: boolean;
  refreshInterval: number;
  
  // Planning Settings
  planningThresholds: PlanningThresholds;
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'display' | 'data' | 'planning'>('general');
  const [planningSubTab, setPlanningSubTab] = useState<'slowMoving' | 'nonMovable'>('slowMoving');
  
  const [settingsData, setSettingsData] = useState<SettingsData>({
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    timeZone: 'GMT+5:30',
    currency: 'INR',
    emailNotifications: true,
    pushNotifications: false,
    lowStockAlerts: true,
    orderAlerts: true,
    reportAlerts: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    theme: 'light',
    itemsPerPage: 25,
    autoRefresh: false,
    refreshInterval: 5,
    planningThresholds: getDefaultPlanningThresholds(),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        // Ensure planningThresholds exists, use defaults if not
        if (!settings.planningThresholds) {
          settings.planningThresholds = getDefaultPlanningThresholds();
        }
        setSettingsData(prev => ({ ...prev, ...settings }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  };

  const handleInputChange = (field: keyof SettingsData, value: string | number | boolean) => {
    setSettingsData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Save settings to localStorage
      localStorage.setItem('appSettings', JSON.stringify(settingsData));
      
      // TODO: Call API to update settings
      // await settingsService.updateSettings(settingsData);
      
      setHasChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    loadSettings();
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      localStorage.removeItem('appSettings');
      loadSettings();
      setHasChanges(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'planning', label: 'Planning', icon: Sliders },
  ];

  return (
    <div className="p-[25.6px] space-y-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SettingsHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-[19.2px]">
        <SettingsSidebar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as any)}
        />

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            {activeTab === 'general' && (
              <GeneralSettings
                settingsData={settingsData}
                onInputChange={(field, value) => handleInputChange(field as keyof SettingsData, value)}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationSettings
                settingsData={settingsData}
                onInputChange={(field, value) => handleInputChange(field as keyof SettingsData, value)}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySettings
                settingsData={settingsData}
                onInputChange={(field, value) => handleInputChange(field as keyof SettingsData, value)}
              />
            )}

            {activeTab === 'display' && (
              <DisplaySettings
                settingsData={settingsData}
                onInputChange={(field, value) => handleInputChange(field as keyof SettingsData, value)}
              />
            )}

            {activeTab === 'data' && (
              <DataSettings
                onReset={handleReset}
              />
            )}

            {activeTab === 'planning' && (
              <PlanningSettings
                planningSubTab={planningSubTab}
                onSubTabChange={setPlanningSubTab}
                planningThresholds={settingsData.planningThresholds}
                onPlanningThresholdsChange={(thresholds) => {
                  setSettingsData(prev => ({
                    ...prev,
                    planningThresholds: thresholds
                  }));
                  setHasChanges(true);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <SettingsActionButtons
        hasChanges={hasChanges}
        loading={loading}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </div>
  );
};

export default SettingsPage;

