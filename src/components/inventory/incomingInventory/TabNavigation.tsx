import React from 'react';

interface TabNavigationProps {
  activeTab: 'add' | 'history';
  onTabChange: (tab: 'add' | 'history') => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        <button
          onClick={() => onTabChange('add')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'add'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Add New
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'history'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          History
        </button>
      </nav>
    </div>
  );
};

export default TabNavigation;
