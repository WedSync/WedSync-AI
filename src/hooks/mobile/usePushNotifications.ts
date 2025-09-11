// WS-254 Team D: Push Notifications Hook for Dietary Alerts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PWANotification } from '@/types/dietary-management';

interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
  subscribed: boolean;
  subscription: PushSubscription | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<NotificationPermissionState>({
    permission: 'default',
    supported: false,
    subscribed: false,
    subscription: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    if (supported) {
      setState((prev) => ({
        ...prev,
        supported: true,
        permission: Notification.permission,
      }));

      // Get existing subscription
      getSubscription();
    }
  }, []);

  const getSubscription = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setState((prev) => ({
          ...prev,
          subscribed: !!subscription,
          subscription,
        }));
      }
    } catch (error) {
      console.error('Failed to get push subscription:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.supported) {
      return false;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();

      setState((prev) => ({
        ...prev,
        permission,
      }));

      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state.supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported || state.permission !== 'granted') {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      // VAPID public key - in a real app, this would come from environment variables
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BNKc-X0MfRQQ9G4PJq6wV3PGI6FYkE4J_dQYnCUb-7RH9xF8VGw3t1YKPaL6wZV2_qWg';

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({
          subscription,
          userId: getUserId(),
        }),
      });

      setState((prev) => ({
        ...prev,
        subscribed: true,
        subscription,
      }));

      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state.supported, state.permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) {
      return true;
    }

    setIsLoading(true);

    try {
      await state.subscription.unsubscribe();

      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint,
          userId: getUserId(),
        }),
      });

      setState((prev) => ({
        ...prev,
        subscribed: false,
        subscription: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state.subscription]);

  const sendNotification = useCallback(
    async (notification: PWANotification) => {
      if (!state.supported || state.permission !== 'granted') {
        console.warn('Notifications not supported or permission not granted');
        return false;
      }

      try {
        // For local notifications (immediate display)
        if (!state.subscribed) {
          new Notification(notification.title, {
            body: notification.body,
            icon: notification.icon || '/icons/icon-192x192.png',
            badge: notification.badge || '/icons/badge-72x72.png',
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
            data: notification.data,
          });
          return true;
        }

        // For push notifications (via server)
        const response = await fetch('/api/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          },
          body: JSON.stringify({
            notification,
            userId: getUserId(),
          }),
        });

        return response.ok;
      } catch (error) {
        console.error('Failed to send notification:', error);
        return false;
      }
    },
    [state.supported, state.permission, state.subscribed],
  );

  const sendDietaryAlert = useCallback(
    async (
      guestName: string,
      requirement: string,
      severity: 'high' | 'critical' = 'high',
      emergencyContact?: string,
    ) => {
      const notification: PWANotification = {
        title:
          severity === 'critical'
            ? '🚨 Critical Dietary Alert'
            : '⚠️ High Priority Dietary Alert',
        body: `${guestName} has a ${severity} dietary requirement: ${requirement}`,
        tag: 'dietary-high-risk',
        requireInteraction: severity === 'critical',
        icon: '/icons/dietary-alert-icon.png',
        badge: '/icons/dietary-badge.png',
        data: {
          type: 'dietary_alert',
          guestName,
          requirement,
          severity,
          emergencyContact,
          timestamp: Date.now(),
        },
        actions: emergencyContact
          ? [
              {
                action: 'emergency_call',
                title: 'Emergency Call',
              },
              {
                action: 'view_details',
                title: 'View Details',
              },
            ]
          : [
              {
                action: 'view_details',
                title: 'View Details',
              },
              {
                action: 'dismiss',
                title: 'Dismiss',
              },
            ],
      };

      return sendNotification(notification);
    },
    [sendNotification],
  );

  const sendMenuAlert = useCallback(
    async (menuName: string, complianceScore: number, warnings: string[]) => {
      const isLowCompliance = complianceScore < 0.7;

      const notification: PWANotification = {
        title: isLowCompliance
          ? '⚠️ Menu Compliance Alert'
          : '✅ Menu Generated',
        body: `${menuName} generated with ${Math.round(complianceScore * 100)}% dietary compliance`,
        tag: 'menu-generation',
        requireInteraction: isLowCompliance,
        icon: '/icons/menu-icon.png',
        data: {
          type: 'menu_alert',
          menuName,
          complianceScore,
          warnings,
          timestamp: Date.now(),
        },
        actions: [
          {
            action: 'view_menu',
            title: 'View Menu',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
          },
        ],
      };

      return sendNotification(notification);
    },
    [sendNotification],
  );

  return {
    ...state,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendNotification,
    sendDietaryAlert,
    sendMenuAlert,
    refresh: getSubscription,
  };
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getUserId(): string {
  // In a real app, this would get the user ID from auth context
  return localStorage.getItem('userId') || 'anonymous';
}

// Hook for notification click handling
export function useNotificationHandlers() {
  useEffect(() => {
    const handleNotificationClick = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { action, data } = customEvent.detail;

      switch (data.type) {
        case 'dietary_alert':
          if (action === 'emergency_call' && data.emergencyContact) {
            window.location.href = `tel:${data.emergencyContact}`;
          } else if (action === 'view_details') {
            window.location.href = `/weddings/${data.weddingId}/dietary`;
          }
          break;

        case 'menu_alert':
          if (action === 'view_menu') {
            window.location.href = `/weddings/${data.weddingId}/menu`;
          }
          break;

        default:
          console.log('Unknown notification type:', data.type);
      }
    };

    // Listen for notification click events from service worker
    window.addEventListener('notificationclick', handleNotificationClick);

    return () => {
      window.removeEventListener('notificationclick', handleNotificationClick);
    };
  }, []);

  const handleNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }, []);

  return {
    handleNotificationPermission,
  };
}
