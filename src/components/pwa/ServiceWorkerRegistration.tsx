'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ServiceWorkerRegistration() {
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Working offline - changes will sync when reconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerServiceWorker();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration =
        await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration);
      setSwRegistration(registration);

      // Check if there's an update
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setHasUpdate(true);
              toast.info('New version available! Click to update.', {
                action: {
                  label: 'Update',
                  onClick: () => handleUpdate(),
                },
                duration: Infinity,
              });
            }
          });
        }
      });

      // Check notification permission
      const permission = Notification.permission;
      setNotificationPermission(permission);

      // Check if already subscribed
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const handleSwMessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case 'sync-complete':
        toast.success('Timeline data synced successfully!');
        break;
      case 'notification-click':
        // Handle notification click
        console.log('Notification clicked:', data);
        break;
      case 'notification-action':
        // Handle notification action
        console.log('Notification action:', data);
        break;
    }
  };

  const handleUpdate = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'skip-waiting' });
      window.location.reload();
    }
  };

  const subscribeToPushNotifications = async () => {
    if (!swRegistration) {
      toast.error('Service Worker not registered');
      return;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // Get VAPID public key from server
      const response = await fetch('/api/push-notifications/vapid-key');
      const { publicKey } = await response.json();

      // Subscribe to push notifications
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      await fetch('/api/push-notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!swRegistration) return;

    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from server
        await fetch('/api/push-notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });

        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const testNotification = () => {
    if (notificationPermission === 'granted') {
      new Notification('WedSync Test', {
        body: 'Timeline notifications are working!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
      });
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="mb-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          Offline Mode
        </div>
      )}

      {/* Update available */}
      {hasUpdate && (
        <Button
          onClick={handleUpdate}
          size="sm"
          className="mb-2 w-full"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Update Available
        </Button>
      )}

      {/* Push notification toggle */}
      {notificationPermission !== 'default' && (
        <Button
          onClick={
            isSubscribed
              ? unsubscribeFromPushNotifications
              : subscribeToPushNotifications
          }
          size="sm"
          variant={isSubscribed ? 'outline' : 'default'}
          className="w-full"
        >
          {isSubscribed ? (
            <>
              <BellOff className="w-4 h-4 mr-2" />
              Disable Notifications
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </>
          )}
        </Button>
      )}

      {/* Test notification (dev only) */}
      {process.env.NODE_ENV === 'development' &&
        notificationPermission === 'granted' && (
          <Button
            onClick={testNotification}
            size="sm"
            variant="ghost"
            className="mt-2 w-full"
          >
            Test Notification
          </Button>
        )}
    </div>
  );
}
