import React, { forwardRef } from 'react';

const Select = forwardRef(
  (
    {
      options = [],  // Add default empty array for options
      label,
      helperText,
      error = false,
      errorText,
      onChange,
      fullWidth = true,
      className = '',
      id,
      children,
      ...rest
    },
    ref
  ) => {
    // Generate a random ID if not provided
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
    
    // Handle change
    const handleChange = (e) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };
    
    // Base classes
    const baseSelectClasses = 'block w-full rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0';
    
    // Error classes
    const errorClasses = error
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500';
    
    // Width classes
    const widthClasses = fullWidth ? 'w-full' : '';
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            onChange={handleChange}
            className={`${baseSelectClasses} ${errorClasses} ${widthClasses} py-2 pl-3 pr-10 text-base text-gray-900 dark:text-gray-100 dark:bg-gray-800 appearance-none`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...rest}
          >
            {children || (options && options.length > 0) ? (
              children || options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            ) : null}
          </select>
          
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {error && errorText ? (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errorText}
          </p>
        ) : helperText ? (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;