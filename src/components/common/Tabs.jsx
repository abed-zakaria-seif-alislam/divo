import React, { useState } from 'react';

const Tabs = ({
  tabs = [],
  defaultTabId,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  // Fix: Only attempt to access tabs[0]?.id if the tabs array has items
  const [activeTabId, setActiveTabId] = useState(defaultTabId || (tabs.length > 0 ? tabs[0]?.id : null));
  
  const handleTabClick = (tabId) => {
    setActiveTabId(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };
  
  // Get the active tab content
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  
  // Variant classes
  const getTabClasses = (tab) => {
    const isActive = tab.id === activeTabId;
    const isDisabled = tab.disabled;
    
    const baseClasses = 'flex items-center px-3 py-2 text-sm font-medium';
    const disabledClasses = 'cursor-not-allowed opacity-50';
    
    if (variant === 'underline') {
      return `${baseClasses} ${
        isActive
          ? 'border-b-2 border-primary-500 text-primary-600'
          : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${isDisabled ? disabledClasses : ''}`;
    }
    
    if (variant === 'pills') {
      return `${baseClasses} rounded-md ${
        isActive
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      } ${isDisabled ? disabledClasses : ''}`;
    }
    
    if (variant === 'boxed') {
      return `${baseClasses} ${
        isActive
          ? 'bg-white text-gray-900 rounded-t-md border-t border-l border-r border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      } ${isDisabled ? disabledClasses : ''}`;
    }
    
    return '';
  };
  
  // Wrapper classes
  const getWrapperClasses = () => {
    if (variant === 'underline') {
      return 'border-b border-gray-200';
    }
    
    if (variant === 'boxed') {
      return 'border-b border-gray-200';
    }
    
    return '';
  };
  
  return (
    <div className={className}>
      <div className={getWrapperClasses()}>
        <nav className="flex space-x-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              className={getTabClasses(tab)}
              aria-current={tab.id === activeTabId ? 'page' : undefined}
              disabled={tab.disabled}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-4">
        {activeTab?.content}
      </div>
    </div>
  );
};

export default Tabs;