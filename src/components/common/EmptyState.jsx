import React from 'react';
import Button from './Button';

const EmptyState = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  // Default icon if none provided
  const defaultIcon = (
    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
  
  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <div className="inline-block">
        {icon || defaultIcon}
      </div>
      
      <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
      
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      
      {action && (
        <div className="mt-6">
          <Button
            variant="primary"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState; 