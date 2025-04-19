import React, { forwardRef } from 'react';

const Input = forwardRef(
  (
    {
      label,
      helperText,
      error = false,
      errorText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    // Generate a random ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

    // Base classes
    const baseInputClasses = 'block px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0';

    // Error classes
    const errorClasses = error
      ? 'border-red-300 text-red-900 dark:text-red-400 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white';

    // Width classes
    const widthClasses = fullWidth ? 'w-full' : '';

    // Icon padding classes
    const iconPaddingClasses = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`${baseInputClasses} ${errorClasses} ${widthClasses} ${iconPaddingClasses}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...rest}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>

        {error && errorText ? (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errorText}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;