import React from 'react';

interface TabsProps {
  activeTab: 'current' | 'all';
  onTabChange: (tab: 'current' | 'all') => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-slate-200">
      <button
        onClick={() => onTabChange('current')}
        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'current'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
      >
        Current Page
      </button>
      <button
        onClick={() => onTabChange('all')}
        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'all'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
      >
        All Issues
      </button>
    </div>
  );
};

export default Tabs;
