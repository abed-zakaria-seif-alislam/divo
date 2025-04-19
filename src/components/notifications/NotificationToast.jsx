import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CalendarIcon, DocumentTextIcon, BellIcon, ClockIcon } from '@heroicons/react/24/outline';

// Individual notification toast
export const NotificationToast = ({ notification, onClose, onAction }) => {
  const { id, title, message, type, time } = notification;

  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'appointment':
        return <CalendarIcon className="h-6 w-6 text-blue-500" />;
      case 'medical':
        return <DocumentTextIcon className="h-6 w-6 text-green-500" />;
      case 'system':
        return <BellIcon className="h-6 w-6 text-purple-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  // Get background color based on notification type
  const getBgColor = () => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
      case 'medical':
        return 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'system':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };
  
  // Get action buttons based on notification type
  const getActionButtons = () => {
    if (!onAction) return null;
    
    switch (type) {
      case 'appointment':
        return (
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => onAction('confirm', notification)}
              className="px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded"
            >
              Confirm
            </button>
            <button
              onClick={() => onAction('reschedule', notification)}
              className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded"
            >
              Reschedule
            </button>
          </div>
        );
      case 'medical':
        return (
          <button
            onClick={() => onAction('view', notification)}
            className="px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded mt-2"
          >
            View Details
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      className={`w-full max-w-sm rounded-lg border shadow-lg overflow-hidden ${getBgColor()}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="p-2 rounded-full bg-white dark:bg-gray-700 shadow">
              {getIcon()}
            </div>
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {title}
              </p>
              <button
                onClick={() => onClose(id)}
                className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {message}
            </p>
            
            <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
              <ClockIcon className="h-3 w-3 mr-1" />
              {time || 'Just now'}
            </div>
            
            {getActionButtons()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Container for all notification toasts
export const NotificationToastContainer = ({ notifications = [], onClose, onAction }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onClose={onClose}
              onAction={onAction}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};