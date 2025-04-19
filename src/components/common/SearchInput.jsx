import React, { useState, useEffect, useRef } from 'react';

const SearchInput = ({
  placeholder = 'Search...',
  value: propValue,
  onChange,
  onSearch,
  debounceTime = 300,
  className = '',
  autoFocus = false,
  clearable = true,
}) => {
  const [value, setValue] = useState(propValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  
  // Sync with prop value
  useEffect(() => {
    if (propValue !== undefined && propValue !== value) {
      setValue(propValue);
    }
  }, [propValue]);
  
  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
    
    if (onSearch) {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        onSearch(newValue);
      }, debounceTime);
    }
  };
  
  // Handle search on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearch(value);
    }
  };
  
  // Handle clear button click
  const handleClear = () => {
    setValue('');
    
    if (onChange) {
      onChange('');
    }
    
    if (onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearch('');
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder={placeholder}
      />
      
      {clearable && value && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
          onClick={handleClear}
        >
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchInput; 