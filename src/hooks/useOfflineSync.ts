'use client';

/**
 * WS-239: Offline Sync Hook
 * Mobile-optimized offline synchronization for wedding venues with poor connectivity
 * Handles action queuing, background sync, and connection monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OfflineSyncAPI } from '@/types/mobile-auto-population';

interface QueuedAction {
  id: string;
  type: string;
  action: () => Promise<void>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second initial delay

export function useOfflineSync(): OfflineSyncAPI {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isPending, setIsPending] = useState(false);
  const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Load persisted queue on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem('offline_action_queue');
      if (savedQueue) {
        const parsed = JSON.parse(savedQueue).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          action: () => Promise.resolve(), // Actions can't be serialized, will need to be re-queued
        }));
        setActionQueue(parsed);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }, []);

  // Persist queue changes
  useEffect(() => {
    try {
      const serializable = actionQueue.map(({ action, ...rest }) => rest);
      localStorage.setItem(
        'offline_action_queue',
        JSON.stringify(serializable),
      );
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }, [actionQueue]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored');
      setIsOnline(true);

      // Start processing queue when coming back online
      if (actionQueue.length > 0) {
        processQueue();
      }
    };

    const handleOffline = () => {
      console.log('Connection lost');
      setIsOnline(false);
    };

    // Network status event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Enhanced connectivity check using fetch
    const checkConnectivity = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          timeout: 5000,
        } as any);

        const newOnlineStatus = response.ok;
        if (newOnlineStatus !== isOnline) {
          setIsOnline(newOnlineStatus);
        }
      } catch {
        if (isOnline) {
          setIsOnline(false);
        }
      }
    };

    // Check connectivity every 30 seconds
    const connectivityInterval = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, actionQueue.length]);

  // Process queued actions
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !isOnline || actionQueue.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsPending(true);

    console.log(`Processing ${actionQueue.length} queued actions...`);

    const currentQueue = [...actionQueue];
    const successfulActions: string[] = [];
    const failedActions: QueuedAction[] = [];

    for (const queuedAction of currentQueue) {
      try {
        console.log(`Processing action: ${queuedAction.type}`);
        await queuedAction.action();
        successfulActions.push(queuedAction.id);
        console.log(`Action completed: ${queuedAction.type}`);
      } catch (error) {
        console.error(`Action failed: ${queuedAction.type}`, error);

        if (queuedAction.retryCount < queuedAction.maxRetries) {
          // Schedule for retry with exponential backoff
          const retryDelay = RETRY_DELAY * Math.pow(2, queuedAction.retryCount);

          setTimeout(() => {
            failedActions.push({
              ...queuedAction,
              retryCount: queuedAction.retryCount + 1,
            });
          }, retryDelay);
        } else {
          console.warn(
            `Action failed permanently after ${queuedAction.maxRetries} retries: ${queuedAction.type}`,
          );
        }
      }
    }

    // Update queue - remove successful, add failed retries
    setActionQueue((prev) => {
      const remaining = prev.filter(
        (action) => !successfulActions.includes(action.id),
      );
      return [...remaining, ...failedActions].slice(0, MAX_QUEUE_SIZE);
    });

    setIsPending(false);
    isProcessingRef.current = false;

    console.log(
      `Queue processing complete. ${successfulActions.length} succeeded, ${failedActions.length} will retry.`,
    );
  }, [isOnline, actionQueue]);

  // Queue an action for offline execution
  const queueAction = useCallback(
    async (type: string, action: () => Promise<void>): Promise<void> => {
      const queuedAction: QueuedAction = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        action,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: MAX_RETRIES,
      };

      if (isOnline) {
        // If online, try to execute immediately
        try {
          setIsPending(true);
          await action();
          setIsPending(false);
          console.log(`Action executed immediately: ${type}`);
          return;
        } catch (error) {
          console.error(
            `Immediate action failed, queueing for retry: ${type}`,
            error,
          );
          // Fall through to queue the action
        } finally {
          setIsPending(false);
        }
      }

      // Add to queue
      setActionQueue((prev) => {
        if (prev.length >= MAX_QUEUE_SIZE) {
          console.warn('Action queue is full, removing oldest action');
          return [...prev.slice(1), queuedAction];
        }
        return [...prev, queuedAction];
      });

      console.log(
        `Action queued: ${type} (${actionQueue.length + 1} in queue)`,
      );
    },
    [isOnline, actionQueue.length],
  );

  // Clear the entire queue
  const clearQueue = useCallback(() => {
    setActionQueue([]);
    console.log('Action queue cleared');
  }, []);

  // Retry processing the queue manually
  const retryQueue = useCallback(async (): Promise<void> => {
    if (actionQueue.length === 0) {
      console.log('No actions in queue to retry');
      return;
    }

    console.log('Manual queue retry requested');
    await processQueue();
  }, [actionQueue.length, processQueue]);

  // Auto-retry queue when connection is restored
  useEffect(() => {
    if (isOnline && actionQueue.length > 0 && !isProcessingRef.current) {
      const timeoutId = setTimeout(() => {
        processQueue();
      }, 1000); // Small delay to ensure connection is stable

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, actionQueue.length, processQueue]);

  return {
    isOnline,
    isPending,
    queueAction,
    clearQueue,
    retryQueue,
    queueSize: actionQueue.length,
  };
}
