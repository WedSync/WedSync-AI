'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'wedding' | 'consultation' | 'venue_visit' | 'other';
  status: 'confirmed' | 'pending' | 'cancelled';
  client?: string;
  venue?: string;
  conflictsWith?: string[];
}

interface SyncStatus {
  isOnline: boolean;
  batteryLevel?: number;
  syncInProgress: boolean;
  lastSync?: Date;
  error?: string;
  conflictsFound: number;
  eventsUpdated: number;
}

interface MobileGestureHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPullDown: () => void;
  onLongPress: (event: CalendarEvent) => void;
}

interface UseOutlookMobileSyncOptions {
  calendarId: string;
  autoSyncEnabled?: boolean;
  syncInterval?: number;
  enableGestures?: boolean;
  enableHapticFeedback?: boolean;
}

interface UseOutlookMobileSyncReturn {
  events: CalendarEvent[];
  syncStatus: SyncStatus;
  syncCalendar: () => Promise<void>;
  setAutoSync: (enabled: boolean) => void;
  gestureHandlers: MobileGestureHandlers;
  isLoading: boolean;
  error: string | null;
}

export const useOutlookMobileSync = (
  options: UseOutlookMobileSyncOptions,
): UseOutlookMobileSyncReturn => {
  const {
    calendarId,
    autoSyncEnabled = true,
    syncInterval = 300000, // 5 minutes
    enableGestures = true,
    enableHapticFeedback = true,
  } = options;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(autoSyncEnabled);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    syncInProgress: false,
    conflictsFound: 0,
    eventsUpdated: 0,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Battery API monitoring
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setSyncStatus((prev) => ({
          ...prev,
          batteryLevel: battery.level,
        }));

        const updateBattery = () => {
          setSyncStatus((prev) => ({
            ...prev,
            batteryLevel: battery.level,
          }));
        };

        battery.addEventListener('levelchange', updateBattery);
        return () => battery.removeEventListener('levelchange', updateBattery);
      });
    }
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
      if (autoSync) {
        syncCalendar();
      }
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync]);

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!enableHapticFeedback) return;

      if ('vibrate' in navigator) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 25 : 50;
        navigator.vibrate(duration);
      }
    },
    [enableHapticFeedback],
  );

  // Main sync function
  const syncCalendar = useCallback(async () => {
    if (isLoading || syncStatus.syncInProgress) return;

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setSyncStatus((prev) => ({
      ...prev,
      syncInProgress: true,
      error: undefined,
    }));
    setError(null);

    try {
      const response = await fetch(`/api/outlook/calendar/${calendarId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          lastSync: syncStatus.lastSync?.toISOString(),
          batteryLevel: syncStatus.batteryLevel,
          isOnline: syncStatus.isOnline,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Sync failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Update events with new data
      setEvents(data.events || []);

      // Update sync status
      setSyncStatus((prev) => ({
        ...prev,
        syncInProgress: false,
        lastSync: new Date(),
        conflictsFound: data.conflictsFound || 0,
        eventsUpdated: data.eventsUpdated || 0,
        error: undefined,
      }));

      // Trigger success haptic feedback
      triggerHapticFeedback('light');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';

      if (errorMessage.includes('AbortError')) {
        return; // Don't show error for aborted requests
      }

      setError(errorMessage);
      setSyncStatus((prev) => ({
        ...prev,
        syncInProgress: false,
        error: errorMessage,
      }));

      // Trigger error haptic feedback
      triggerHapticFeedback('heavy');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    calendarId,
    isLoading,
    syncStatus.syncInProgress,
    syncStatus.lastSync,
    syncStatus.batteryLevel,
    syncStatus.isOnline,
    triggerHapticFeedback,
  ]);

  // Auto-sync setup with battery awareness
  useEffect(() => {
    if (!autoSync || !syncStatus.isOnline) return;

    const scheduleNextSync = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Adjust sync interval based on battery level
      let adjustedInterval = syncInterval;
      if (syncStatus.batteryLevel !== undefined) {
        if (syncStatus.batteryLevel < 0.1) {
          adjustedInterval *= 8; // Very low battery: sync every 40 minutes
        } else if (syncStatus.batteryLevel < 0.2) {
          adjustedInterval *= 4; // Low battery: sync every 20 minutes
        } else if (syncStatus.batteryLevel < 0.5) {
          adjustedInterval *= 2; // Medium battery: sync every 10 minutes
        }
      }

      syncTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          syncCalendar().then(scheduleNextSync);
        } else {
          scheduleNextSync(); // Reschedule without syncing
        }
      }, adjustedInterval);
    };

    scheduleNextSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [
    autoSync,
    syncStatus.isOnline,
    syncStatus.batteryLevel,
    syncInterval,
    syncCalendar,
  ]);

  // Gesture handlers
  const gestureHandlers: MobileGestureHandlers = {
    onSwipeLeft: useCallback(() => {
      triggerHapticFeedback('light');
      // Navigate to next month/week
    }, [triggerHapticFeedback]),

    onSwipeRight: useCallback(() => {
      triggerHapticFeedback('light');
      // Navigate to previous month/week
    }, [triggerHapticFeedback]),

    onPullDown: useCallback(() => {
      triggerHapticFeedback('medium');
      syncCalendar();
    }, [triggerHapticFeedback, syncCalendar]),

    onLongPress: useCallback(
      (event: CalendarEvent) => {
        triggerHapticFeedback('heavy');
        // Show context menu or event details
      },
      [triggerHapticFeedback],
    ),
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initial sync on mount
  useEffect(() => {
    if (syncStatus.isOnline && events.length === 0) {
      syncCalendar();
    }
  }, [syncStatus.isOnline, events.length, syncCalendar]);

  return {
    events,
    syncStatus,
    syncCalendar,
    setAutoSync,
    gestureHandlers: enableGestures
      ? gestureHandlers
      : ({} as MobileGestureHandlers),
    isLoading,
    error,
  };
};
