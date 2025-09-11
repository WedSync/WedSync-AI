import { useState, useEffect, useCallback, useMemo } from 'react';

interface AppleDevice {
  type: 'iPhone' | 'iPad' | 'Mac' | 'AppleWatch' | 'AppleTV';
  version?: string;
  capabilities: {
    siriShortcuts: boolean;
    appleWatchNotifications: boolean;
    carPlaySupport: boolean;
    deepLinking: boolean;
    nativeCalendarAccess: boolean;
    biometricAuth: boolean;
    keychainAccess: boolean;
  };
}

interface AppleCalendarConfig {
  deviceType: 'iPhone' | 'iPad' | 'Mac' | 'AppleWatch' | 'AppleTV';
  iOSVersion?: string;
  macOSVersion?: string;
  watchOSVersion?: string;
  capabilities: AppleDevice['capabilities'];
  syncPreferences: {
    syncToiOSCalendar: boolean;
    syncToMacCalendar: boolean;
    syncToAppleWatch: boolean;
    enableCarPlay: boolean;
    enableSiri: boolean;
    notificationSettings: {
      enabled: boolean;
      urgentOnly: boolean;
      quietHours: { start: string; end: string };
    };
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  color: 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'pink';
  allDay?: boolean;
  type?: 'wedding' | 'meeting' | 'consultation' | 'shoot';
}

export function useAppleCalendarMobile() {
  const [device, setDevice] = useState<AppleDevice | null>(null);
  const [config, setConfig] = useState<AppleCalendarConfig | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'error' | 'success'
  >('idle');
  const [permissions, setPermissions] = useState({
    calendar: false,
    notifications: false,
    location: false,
  });

  // Apple device detection
  const detectAppleDevice = useCallback((): AppleDevice => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // iOS device detection
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      const isIPad =
        /iPad/.test(userAgent) ||
        (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const deviceType = isIPad ? 'iPad' : 'iPhone';

      // iOS version extraction
      const iOSVersion = userAgent
        .match(/OS (\d+)_(\d+)/)?.[0]
        ?.replace('OS ', '')
        .replace('_', '.');

      return {
        type: deviceType,
        version: iOSVersion,
        capabilities: {
          siriShortcuts: true,
          appleWatchNotifications: true,
          carPlaySupport: deviceType === 'iPhone',
          deepLinking: true,
          nativeCalendarAccess: true,
          biometricAuth: true,
          keychainAccess: true,
        },
      };
    }

    // macOS detection
    if (platform.includes('Mac') && !('ontouchend' in document)) {
      const macOSVersion = userAgent
        .match(/Mac OS X (\d+_\d+)/)?.[1]
        ?.replace('_', '.');

      return {
        type: 'Mac',
        version: macOSVersion,
        capabilities: {
          siriShortcuts: true,
          appleWatchNotifications: false,
          carPlaySupport: false,
          deepLinking: true,
          nativeCalendarAccess: true,
          biometricAuth: false,
          keychainAccess: true,
        },
      };
    }

    // Apple Watch detection (limited)
    if (userAgent.includes('Watch')) {
      return {
        type: 'AppleWatch',
        capabilities: {
          siriShortcuts: true,
          appleWatchNotifications: true,
          carPlaySupport: false,
          deepLinking: false,
          nativeCalendarAccess: false,
          biometricAuth: false,
          keychainAccess: false,
        },
      };
    }

    // Default fallback
    return {
      type: 'iPhone',
      capabilities: {
        siriShortcuts: false,
        appleWatchNotifications: false,
        carPlaySupport: false,
        deepLinking: false,
        nativeCalendarAccess: false,
        biometricAuth: false,
        keychainAccess: false,
      },
    };
  }, []);

  // Initialize device detection
  useEffect(() => {
    const detectedDevice = detectAppleDevice();
    setDevice(detectedDevice);

    // Create default config based on detected device
    const defaultConfig: AppleCalendarConfig = {
      deviceType: detectedDevice.type,
      iOSVersion:
        detectedDevice.type === 'iPhone' || detectedDevice.type === 'iPad'
          ? detectedDevice.version
          : undefined,
      macOSVersion:
        detectedDevice.type === 'Mac' ? detectedDevice.version : undefined,
      capabilities: detectedDevice.capabilities,
      syncPreferences: {
        syncToiOSCalendar:
          detectedDevice.type === 'iPhone' || detectedDevice.type === 'iPad',
        syncToMacCalendar: detectedDevice.type === 'Mac',
        syncToAppleWatch: detectedDevice.capabilities.appleWatchNotifications,
        enableCarPlay: detectedDevice.capabilities.carPlaySupport,
        enableSiri: detectedDevice.capabilities.siriShortcuts,
        notificationSettings: {
          enabled: true,
          urgentOnly: false,
          quietHours: { start: '22:00', end: '07:00' },
        },
      },
    };

    setConfig(defaultConfig);
  }, [detectAppleDevice]);

  // Request calendar permissions
  const requestCalendarPermission = useCallback(async () => {
    try {
      // For iOS Safari, we check if calendar API is available
      if ('calendar' in navigator) {
        const permission = await (navigator as any).permissions.query({
          name: 'calendar',
        });
        setPermissions((prev) => ({
          ...prev,
          calendar: permission.state === 'granted',
        }));
        return permission.state === 'granted';
      }

      // Fallback: assume granted if iOS Calendar deep links work
      if (device?.capabilities.nativeCalendarAccess) {
        setPermissions((prev) => ({ ...prev, calendar: true }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Calendar permission request failed:', error);
      return false;
    }
  }, [device]);

  // Request notification permissions
  const requestNotificationPermission = useCallback(async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissions((prev) => ({
          ...prev,
          notifications: permission === 'granted',
        }));
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }, []);

  // iOS Calendar deep linking
  const openInNativeCalendar = useCallback(
    (event: CalendarEvent) => {
      if (!device?.capabilities.deepLinking) return;

      if (device.type === 'iPhone' || device.type === 'iPad') {
        // iOS Calendar deep link
        const eventUrl = `calshow:${event.id}`;
        window.location.href = eventUrl;
      } else if (device.type === 'Mac') {
        // macOS Calendar deep link
        const dateParam = `?date=${event.startDate.toISOString()}`;
        window.location.href = `calendar://${dateParam}`;
      }
    },
    [device],
  );

  // Create calendar event in native iOS/macOS Calendar
  const createNativeCalendarEvent = useCallback(
    (event: Omit<CalendarEvent, 'id'>) => {
      if (!device?.capabilities.nativeCalendarAccess) return;

      const eventData = {
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location || '',
        notes: `Created via WedSync - Wedding Management Platform`,
      };

      if (device.type === 'iPhone' || device.type === 'iPad') {
        // iOS Calendar event creation URL
        const params = new URLSearchParams({
          title: eventData.title,
          startdate: eventData.startDate,
          enddate: eventData.endDate,
          location: eventData.location,
          notes: eventData.notes,
        });

        window.location.href = `calshow://event?${params.toString()}`;
      } else if (device.type === 'Mac') {
        // macOS Calendar event creation
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//WedSync//Wedding Calendar//EN
BEGIN:VEVENT
UID:wedsync-${Date.now()}@wedsync.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${eventData.title}
LOCATION:${eventData.location}
DESCRIPTION:${eventData.notes}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    },
    [device],
  );

  // Siri shortcuts integration
  const createSiriShortcut = useCallback(
    (phrase: string, action: string, parameters: any) => {
      if (!device?.capabilities.siriShortcuts) return;

      const shortcutData = {
        phrase,
        action,
        parameters,
        appBundleId: 'com.wedsync.wedding-management',
      };

      if (device.type === 'iPhone' || device.type === 'iPad') {
        // iOS Shortcuts app integration
        const shortcutsUrl = `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(phrase)}`;

        // Store shortcut configuration for later use
        localStorage.setItem(
          `siri-shortcut-${phrase}`,
          JSON.stringify(shortcutData),
        );

        // Try to open Shortcuts app
        window.location.href = shortcutsUrl;
      }
    },
    [device],
  );

  // Apple Watch notification
  const sendAppleWatchNotification = useCallback(
    (title: string, message: string, urgent = false) => {
      if (
        !device?.capabilities.appleWatchNotifications ||
        !permissions.notifications
      )
        return;

      const notification = new Notification(title, {
        body: message,
        badge: '/apple-touch-icon.png',
        tag: urgent ? 'urgent-wedding' : 'wedding-update',
        requireInteraction: urgent,
        vibrate: urgent ? [200, 100, 200] : [100],
      });

      // Auto-close non-urgent notifications after 5 seconds
      if (!urgent) {
        setTimeout(() => notification.close(), 5000);
      }

      return notification;
    },
    [device, permissions.notifications],
  );

  // Sync calendar events
  const syncCalendarEvents = useCallback(
    async (newEvents: CalendarEvent[]) => {
      if (!config?.syncPreferences.syncToiOSCalendar) return;

      setSyncStatus('syncing');

      try {
        // Simulate sync with delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setEvents(newEvents);
        setSyncStatus('success');

        // Reset status after 2 seconds
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (error) {
        console.error('Calendar sync failed:', error);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    },
    [config],
  );

  // Check if device is Apple ecosystem
  const isAppleEcosystem = useMemo(() => {
    return (
      device?.type === 'iPhone' ||
      device?.type === 'iPad' ||
      device?.type === 'Mac' ||
      device?.type === 'AppleWatch'
    );
  }, [device]);

  // Check if CarPlay is available
  const isCarPlayAvailable = useMemo(() => {
    return (
      device?.capabilities.carPlaySupport &&
      'standalone' in navigator &&
      (navigator as any).standalone
    );
  }, [device]);

  return {
    // Device information
    device,
    config,
    isAppleEcosystem,
    isCarPlayAvailable,

    // Permissions
    permissions,
    requestCalendarPermission,
    requestNotificationPermission,

    // Calendar events
    events,
    syncStatus,
    syncCalendarEvents,

    // Apple ecosystem features
    openInNativeCalendar,
    createNativeCalendarEvent,
    createSiriShortcut,
    sendAppleWatchNotification,

    // Utilities
    updateConfig: setConfig,
  };
}
