import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { CalendarIcon, DocumentTextIcon, BellIcon, ClockIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getRelativeTime } from '../../utils/formatters';

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onAction,
  detailed = false,
  withActions = false,
  icon,
  className = '',
}) => {
  const { id, title, message, type, read, date, time, isNew, link } = notification;
  
  const getTypeIcon = () => {
    // Use passed icon if provided
    if (icon) return icon;
    
    switch (type) {
      case 'appointment':
        return (
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
            <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case 'medical':
        return (
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
            <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        );
      case 'system':
        return (
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
            <BellIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };
  
  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(id);
    }
  };
  
  const handleAction = (action) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAction) {
      onAction(action, notification);
    }
  };
  
  // Get action buttons based on notification type
  const getActionButtons = () => {
    if (!withActions) return null;
    
    switch (type) {
      case 'appointment':
        return (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleAction('confirm')}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
            >
              <CheckIcon className="h-3.5 w-3.5 mr-1" />
              Confirm
            </button>
            <button
              onClick={handleAction('reschedule')}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
            >
              <ClockIcon className="h-3.5 w-3.5 mr-1" />
              Reschedule
            </button>
          </div>
        );
      case 'medical':
        return (
          <div className="mt-3">
            <button
              onClick={handleAction('view')}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
            >
              View Details
            </button>
          </div>
        );
      default:
        return (
          <div className="mt-3">
            <button
              onClick={handleAction('mark_read')}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
            >
              Mark as read
            </button>
          </div>
        );
    }
  };
  
  const relativeTime = time || (date && getRelativeTime(date)) || 'Just now';
  
  const content = (
    <div className={`flex items-start p-4 ${!read && !isNew ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''} ${isNew ? 'bg-blue-50/80 dark:bg-primary-900/20' : ''} rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {getTypeIcon()}
      
      <div className="ml-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          {(isNew || !read) && (
            <span className="inline-flex items-center rounded-full bg-primary-100 dark:bg-primary-900/40 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-300">
              New
            </span>
          )}
        </div>
        
        <p className={`mt-1 text-sm text-gray-600 dark:text-gray-300 ${detailed ? '' : 'line-clamp-2'}`}>{message}</p>
        
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-3 w-3 mr-1" />
          {relativeTime}
        </div>
        
        {getActionButtons()}
      </div>
      
      {withActions && !getActionButtons() && (
        <button
          onClick={handleAction('dismiss')}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        >
          <XMarkIcon className="h-5 w-5" />
          <span className="sr-only">Dismiss notification</span>
        </button>
      )}
    </div>
  );
  
  if (link && !withActions) {
    return (
      <Link href={link} className="block hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={handleClick}>
        {content}
      </Link>
    );
  }
  
  return (
    <div className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={handleClick}>
      {content}
    </div>
  );
};

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['appointment', 'medical', 'system', 'message', 'reminder']).isRequired,
    read: PropTypes.bool,
    isRead: PropTypes.bool,
    date: PropTypes.string,
    createdAt: PropTypes.string,
    time: PropTypes.string,
    isNew: PropTypes.bool,
    link: PropTypes.string,
  }).isRequired,
  onMarkAsRead: PropTypes.func,
  onAction: PropTypes.func,
  detailed: PropTypes.bool,
  withActions: PropTypes.bool,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default NotificationItem;