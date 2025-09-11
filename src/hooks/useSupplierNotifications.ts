'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SupplierNotification } from '@/types/supplier';

export function useSupplierNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SupplierNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Set up real-time notifications if available
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setError(null);

      const response = await fetch('/api/supplier/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/supplier/notifications/${notificationId}/read`,
        {
          method: 'PUT',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true, read_at: new Date().toISOString() }
            : notification,
        ),
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to mark as read',
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        '/api/supplier/notifications/mark-all-read',
        {
          method: 'PUT',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
          read_at: notification.read_at || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to mark all as read',
      );
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/supplier/notifications/${notificationId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Update local state
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId,
      );
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to delete notification',
      );
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Register for push notifications
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });

          // Send subscription to backend
          await fetch('/api/supplier/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription),
          });

          return true;
        }
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
    return false;
  };

  const getNotificationsByType = (type: string) => {
    return notifications.filter((n) => n.type === type);
  };

  const getUrgentNotifications = () => {
    return notifications.filter((n) => n.priority === 'urgent' && !n.read);
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
    getNotificationsByType,
    getUrgentNotifications,
  };
}
