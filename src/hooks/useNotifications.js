import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications,
  fetchNotificationsSuccess,
  addNotification
} from '../store/slices/notificationSlice';
import { useNotificationToast } from '../contexts/NotificationContext';

// Move sample data to a separate file
import { initialNotifications } from '../data/sampleNotifications';

const useNotifications = (userId) => {
  const dispatch = useDispatch();
  const { addToast } = useNotificationToast();
  const { notifications, loading, error, unreadCount } = useSelector(state => state.notifications);
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch notifications on mount
  useEffect(() => {
    if (notifications.length === 0 && !loading && !error) {
      try {
        // In a real app, replace with actual API call
        const fetchData = async () => {
          dispatch(fetchNotificationsSuccess(initialNotifications));
        };
        fetchData();
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    }
  }, [dispatch, notifications.length, loading, error]);
  
  const toggleNotifications = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  const markNotificationAsRead = useCallback((id) => {
    if (!id) return;
    dispatch(markAsRead(id));
  }, [dispatch]);
  
  const markAllNotificationsAsRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);
  
  const deleteNotificationById = useCallback((id) => {
    if (!id) return;
    dispatch(deleteNotification(id));
  }, [dispatch]);
  
  const handleClearNotifications = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);
  
  const createNotification = useCallback((notification) => {
    if (!notification?.title || !notification?.message) {
      console.error('Invalid notification data');
      return null;
    }

    const newNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      date: new Date().toISOString(),
      time: 'Just now',
      isNew: true,
      type: notification.type || 'system',
      ...notification
    };
    
    // Add to Redux store
    dispatch(addNotification(newNotification));
    
    // Show toast notification
    addToast(newNotification);
    
    return newNotification;
  }, [dispatch, addToast]);
  
  const getNotificationsByType = useCallback((type) => {
    if (!type) return [];
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);
  
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notification => !notification.read);
  }, [notifications]);
  
  const getRecentNotifications = useCallback((count = 5) => {
    return [...notifications]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, count);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isOpen,
    toggleNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteNotificationById,
    clearNotifications: handleClearNotifications,
    createNotification,
    getNotificationsByType,
    getUnreadNotifications,
    getRecentNotifications
  };
};

export default useNotifications;
