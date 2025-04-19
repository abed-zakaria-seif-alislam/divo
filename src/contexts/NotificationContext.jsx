import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationToastContainer } from '../components/notifications/NotificationToast';

// Create context
const NotificationContext = createContext();

// Generate a unique ID for notifications
const generateUniqueId = () => `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  // Add a new notification toast
  const addToast = (notification) => {
    const id = notification.id || generateUniqueId();
    const newToast = { ...notification, id };
    setToasts(prev => [newToast, ...prev]);
    return id;
  };
  
  // Remove a notification toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  // Handle notification actions
  const handleAction = (action, notification) => {
    console.log(`Action ${action} for notification ${notification.id}`);
    // Here you would implement the actual action handlers
    // e.g., confirm an appointment, reschedule, etc.
    
    // Remove the toast after action
    removeToast(notification.id);
  };

  return (
    <NotificationContext.Provider value={{ addToast, removeToast }}>
      {children}
      <NotificationToastContainer 
        notifications={toasts} 
        onClose={removeToast}
        onAction={handleAction}
      />
    </NotificationContext.Provider>
  );
};

// Custom hook for using notifications
export const useNotificationToast = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationToast must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;