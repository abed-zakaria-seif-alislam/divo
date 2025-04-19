import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon, CalendarIcon, CheckCircleIcon, XMarkIcon, DocumentTextIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const NotificationDropdown = ({ isOpen, onClose, notifications = [], onNotificationClick }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-4 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-200 dark:border-gray-700"
          style={{ top: '4rem' }}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-900 text-white flex justify-between items-center">
            <div className="flex items-center">
              <BellIcon className="h-5 w-5 mr-2" />
              <h3 className="text-base font-semibold">Notifications</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded transition-colors p-1"
            >
              <span className="sr-only">Close notifications</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3"
                >
                  <BellIcon className="h-8 w-8 text-gray-400 dark:text-gray-300" />
                </motion.div>
                <motion.h3 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-base font-medium text-gray-900 dark:text-white"
                >
                  No new notifications
                </motion.h3>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  You're all caught up!
                </motion.p>
              </div>
            ) : (
              <div>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onNotificationClick?.(notification.id)}
                    className={`px-5 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors duration-150 ${
                      notification.isNew ? 'bg-blue-50/70 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          notification.type === 'appointment' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                            : notification.type === 'medical' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}>
                          {notification.type === 'appointment' ? (
                            <CalendarIcon className="h-6 w-6" />
                          ) : notification.type === 'medical' ? (
                            <DocumentTextIcon className="h-6 w-6" />
                          ) : (
                            <CheckCircleIcon className="h-6 w-6" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {notification.title}
                          </h4>
                          {notification.isNew && (
                            <span className="ml-1.5 flex-shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="mt-1.5 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-3.5 w-3.5 mr-1" />
                          {notification.time}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Link */}
          <Link href="/notifications" legacyBehavior>
            <a
              onClick={onClose} // Close dropdown when link is clicked
              className="flex items-center justify-center px-5 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium transition-colors group"
            >
              View all notifications
              <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-150" />
            </a>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
