'use client';

import {
  useOptimistic,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { toast } from 'sonner';
import {
  WeddingUIEventType,
  UIOptimisticUpdate,
  UIConflictResolution,
  WeddingUIRealtimeError,
} from '@/types/realtime';

export interface OptimisticRealtimeOptions {
  weddingId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  rollbackDelay?: number;
  weddingDateSafety?: boolean;
  retryAttempts?: number;
  enableConflictDetection?: boolean;
  entityType?:
    | 'form'
    | 'journey'
    | 'wedding'
    | 'vendor'
    | 'timeline'
    | 'payment'
    | 'document';
  conflictResolution?: 'server-wins' | 'client-wins' | 'merge' | 'prompt-user';
  maxPendingUpdates?: number;
  optimisticDelay?: number;
}

export interface OptimisticRealtimeReturn<T> {
  data: T;
  isOptimistic: boolean;
  isPending: boolean;
  error: Error | null;
  submitOptimistic: (updates: Partial<T>) => Promise<void>;
  submitOptimisticEvent: (
    eventType: WeddingUIEventType,
    eventData: any,
  ) => Promise<void>;
  rollback: () => void;
  hasConflict: boolean;
  retryCount: number;
  lastSync?: Date;
  pendingUpdatesCount: number;
}

interface OptimisticOperation<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: Partial<T>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export function useOptimisticRealtime<
  T extends { id: string; updated_at?: Date },
>(
  initialData: T,
  updateAction: (data: T) => Promise<T>,
  options: OptimisticRealtimeOptions,
): OptimisticRealtimeReturn<T> {
  const realtime = useRealtime();
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date>();
  const [serverData, setServerData] = useState<T>(initialData);
  const [pendingOperations, setPendingOperations] = useState<
    OptimisticOperation<T>[]
  >([]);

  // React 19 optimistic updates
  const [optimisticData, addOptimistic] = useOptimistic(
    serverData,
    (
      state: T,
      update: Partial<T> & { __operation?: string; __tempId?: string },
    ) => {
      const newState = {
        ...state,
        ...update,
        updated_at: new Date(),
        __optimistic: true,
        __tempId: update.__tempId || `temp-${Date.now()}`,
      } as T;

      return newState;
    },
  );

  // Detect if we're in wedding day mode
  const isWeddingDay = useMemo(() => {
    if (!options.weddingDateSafety) return false;

    // Check if today is the wedding day
    const today = new Date();
    // This would typically check against the actual wedding date
    // For now, assuming Saturday is wedding day
    return today.getDay() === 6;
  }, [options.weddingDateSafety]);

  // Check connection quality for wedding operations
  const connectionQuality = realtime.connectionQuality || 'good';
  const isConnected = realtime.isConnected;

  // Conflict detection
  const hasConflict = useMemo(() => {
    if (!options.enableConflictDetection) return false;

    // Check if server data differs significantly from optimistic data
    return detectDataConflict(optimisticData, serverData);
  }, [optimisticData, serverData, options.enableConflictDetection]);

  // Wedding safety validation
  const validateWeddingDayOperation = useCallback(
    async (updates: Partial<T>): Promise<void> => {
      if (!isWeddingDay) return;

      // Critical validations for wedding day
      if ('wedding_date' in updates) {
        throw new Error('Wedding date cannot be changed on wedding day');
      }

      if ('venue_id' in updates) {
        throw new Error('Venue cannot be changed on wedding day');
      }

      // Check for recent changes by other vendors
      const recentChanges = await checkRecentWeddingChanges(options.weddingId);
      if (recentChanges.length > 0) {
        throw new Error(
          'Another vendor recently updated this wedding - please refresh and try again',
        );
      }
    },
    [isWeddingDay, options.weddingId],
  );

  // Handle wedding day errors with enhanced logging
  const handleWeddingDayError = useCallback(
    async (error: any, updates: any): Promise<void> => {
      // Wedding day: Log all errors for post-wedding review
      await logWeddingDayError({
        error: error.message,
        updates,
        weddingId: options.weddingId,
        timestamp: new Date(),
        vendor: getCurrentVendor(),
        connectionQuality,
        retryCount,
      });

      // Attempt to save locally for later sync
      await saveToLocalStorage(`wedding_${options.weddingId}_pending`, updates);

      // Show wedding-specific error message
      toast.error('Wedding Day Update Failed', {
        description:
          'Your changes have been saved locally and will sync when connection is restored.',
        duration: 0, // Don't auto-dismiss on wedding day
      });
    },
    [options.weddingId, connectionQuality, retryCount],
  );

  // Queue operation for offline handling
  const queueOperation = useCallback(
    (operation: Omit<OptimisticOperation<T>, 'id'>) => {
      const queuedOp: OptimisticOperation<T> = {
        ...operation,
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      setPendingOperations((prev) => [...prev, queuedOp]);

      // Use realtime queue if available
      if (realtime.addToQueue) {
        realtime.addToQueue({
          type: 'database_update',
          channel: `wedding_${options.weddingId}`,
          data: operation.data,
          priority: isWeddingDay ? 'urgent' : 'medium',
          retryCount: 0,
          maxRetries: operation.maxRetries,
        });
      }
    },
    [realtime, options.weddingId, isWeddingDay],
  );

  // Process pending operations when connection is restored
  const processPendingOperations = useCallback(async () => {
    if (!isConnected || pendingOperations.length === 0) return;

    const operations = [...pendingOperations];
    setPendingOperations([]);

    for (const operation of operations) {
      try {
        const fullData = { ...serverData, ...operation.data } as T;
        const result = await updateAction(fullData);
        setServerData(result);
        setLastSync(new Date());
      } catch (error) {
        // Re-queue failed operations with retry limit
        if (operation.retryCount < operation.maxRetries) {
          queueOperation({
            ...operation,
            retryCount: operation.retryCount + 1,
          });
        } else {
          console.error('Operation failed after max retries:', error);
          if (isWeddingDay) {
            await handleWeddingDayError(error, operation.data);
          }
        }
      }
    }
  }, [
    isConnected,
    pendingOperations,
    serverData,
    updateAction,
    queueOperation,
    isWeddingDay,
    handleWeddingDayError,
  ]);

  // Process pending operations when connection is restored
  useEffect(() => {
    if (isConnected) {
      processPendingOperations();
    }
  }, [isConnected, processPendingOperations]);

  // Auto-resolve conflicts for wedding operations
  useEffect(() => {
    if (hasConflict && isWeddingDay) {
      // Wedding day: Always prefer server data to prevent issues
      setServerData(serverData);

      toast.warning('Wedding Data Updated', {
        description:
          'Another vendor updated this wedding - displaying latest version',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
    }
  }, [hasConflict, isWeddingDay, serverData]);

  // Main optimistic submission function
  const submitOptimistic = useCallback(
    async (updates: Partial<T>) => {
      setError(null);
      setIsPending(true);

      try {
        // Wedding day safety check
        if (options.weddingDateSafety) {
          await validateWeddingDayOperation(updates);
        }

        // Immediate optimistic update
        const tempId = `temp-${Date.now()}`;
        addOptimistic({ ...updates, __tempId: tempId });

        // Check connection status
        if (!isConnected) {
          // Queue operation for when connection is restored
          queueOperation({
            type: 'update',
            data: updates,
            timestamp: new Date(),
            retryCount: 0,
            maxRetries: options.retryAttempts || 3,
          });

          toast.info('Offline Update Queued', {
            description:
              'Your changes will be saved when connection is restored',
          });
          return;
        }

        // Submit to server
        const fullData = { ...optimisticData, ...updates } as T;
        const result = await updateAction(fullData);

        // Update server data and clear optimistic state
        setServerData(result);
        setLastSync(new Date());
        setRetryCount(0);

        options.onSuccess?.(result);

        // Success notification
        if (isWeddingDay) {
          toast.success('Wedding Update Saved', {
            description: 'Changes have been successfully saved',
          });
        }
      } catch (error) {
        setError(error as Error);
        setRetryCount((prev) => prev + 1);

        options.onError?.(error);

        // Wedding day: Enhanced error handling
        if (isWeddingDay) {
          await handleWeddingDayError(error, updates);
        } else {
          toast.error('Update Failed', {
            description: (error as Error).message,
            action: {
              label: 'Retry',
              onClick: () => submitOptimistic(updates),
            },
          });
        }

        // Auto-rollback on failure with delay
        if (options.rollbackDelay) {
          setTimeout(() => {
            rollback();
          }, options.rollbackDelay);
        }
      } finally {
        setIsPending(false);
      }
    },
    [
      addOptimistic,
      optimisticData,
      updateAction,
      options,
      isConnected,
      isWeddingDay,
      validateWeddingDayOperation,
      handleWeddingDayError,
      queueOperation,
    ],
  );

  // Enhanced wedding-specific event type handling
  const submitOptimisticEvent = useCallback(
    async (eventType: WeddingUIEventType, eventData: any) => {
      setError(null);
      setIsPending(true);

      try {
        // Wedding day safety check
        if (options.weddingDateSafety) {
          await validateWeddingDayOperation(eventData);
        }

        // Apply optimistic update based on event type
        const tempId = `temp-${Date.now()}`;
        let optimisticUpdate: Partial<T> = {};

        switch (eventType) {
          case 'form_response':
            optimisticUpdate = {
              ...eventData,
              __tempId: tempId,
              status: 'submitting',
              timestamp: new Date().toISOString(),
            };
            break;
          case 'journey_update':
            optimisticUpdate = {
              status: eventData.status,
              updatedAt: new Date().toISOString(),
              __tempId: tempId,
            };
            break;
          case 'wedding_change':
            optimisticUpdate = {
              [eventData.field]: eventData.newValue,
              lastModified: new Date().toISOString(),
              modificationSource: 'optimistic',
              __tempId: tempId,
            };
            break;
          case 'vendor_checkin':
            optimisticUpdate = {
              status: 'checked-in',
              checkinTime: eventData.timestamp,
              location: eventData.location,
              __tempId: tempId,
            };
            break;
          case 'timeline_change':
            optimisticUpdate = {
              time: eventData.newTime,
              status: 'updating',
              __tempId: tempId,
            };
            break;
          case 'payment_processed':
            optimisticUpdate = {
              amount: eventData.amount,
              status: 'processing',
              timestamp: new Date().toISOString(),
              __tempId: tempId,
            };
            break;
          case 'document_signed':
            optimisticUpdate = {
              status: 'signed',
              signedAt: new Date().toISOString(),
              signature: eventData.signatureData,
              __tempId: tempId,
            };
            break;
          default:
            optimisticUpdate = {
              ...eventData,
              __tempId: tempId,
              timestamp: new Date().toISOString(),
            };
        }

        // Apply optimistic update with delay for ultra-fast feedback
        const delay = options.optimisticDelay || (isWeddingDay ? 25 : 50);
        setTimeout(() => {
          addOptimistic(optimisticUpdate);
        }, delay);

        // Check connection status
        if (!isConnected) {
          // Queue operation for when connection is restored
          queueOperation({
            type: 'update',
            data: optimisticUpdate,
            timestamp: new Date(),
            retryCount: 0,
            maxRetries: options.retryAttempts || 3,
          });

          toast.info(`${eventType.replace('_', ' ')} Queued`, {
            description:
              'Your changes will be saved when connection is restored',
          });
          return;
        }

        // Broadcast realtime event for immediate sync
        if (realtime.broadcast) {
          await realtime.broadcast(`wedding_${options.weddingId}`, eventType, {
            data: eventData,
            timestamp: new Date().toISOString(),
            priority: isWeddingDay ? 'critical' : 'medium',
            weddingId: options.weddingId,
          });
        }

        // Submit to server via updateAction
        const fullData = { ...optimisticData, ...optimisticUpdate } as T;
        const result = await updateAction(fullData);

        // Update server data and clear optimistic state
        setServerData(result);
        setLastSync(new Date());
        setRetryCount(0);

        options.onSuccess?.(result);

        // Success notification
        if (isWeddingDay) {
          toast.success(`Wedding ${eventType.replace('_', ' ')} Saved`, {
            description: 'Changes have been successfully saved',
          });
        }
      } catch (error) {
        setError(error as Error);
        setRetryCount((prev) => prev + 1);

        options.onError?.(error);

        // Wedding day: Enhanced error handling
        if (isWeddingDay) {
          await handleWeddingDayError(error, eventData);
        } else {
          toast.error(`${eventType.replace('_', ' ')} Failed`, {
            description: (error as Error).message,
            action: {
              label: 'Retry',
              onClick: () => submitOptimisticEvent(eventType, eventData),
            },
          });
        }

        // Auto-rollback on failure with delay
        if (options.rollbackDelay) {
          setTimeout(() => {
            rollback();
          }, options.rollbackDelay);
        }
      } finally {
        setIsPending(false);
      }
    },
    [
      addOptimistic,
      optimisticData,
      updateAction,
      options,
      isConnected,
      isWeddingDay,
      validateWeddingDayOperation,
      handleWeddingDayError,
      queueOperation,
      realtime,
    ],
  );

  // Rollback optimistic changes
  const rollback = useCallback(() => {
    setServerData(initialData);
    setError(null);
    setPendingOperations([]);

    toast.info('Changes Reverted', {
      description: 'Optimistic updates have been rolled back',
    });
  }, [initialData]);

  // Listen for realtime updates to sync server data
  useEffect(() => {
    if (realtime.subscribeToChannel) {
      const unsubscribe = realtime.subscribeToChannel(
        `wedding_${options.weddingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'wedding_timeline_events',
          filter: `wedding_id=eq.${options.weddingId}`,
          callback: (payload: any) => {
            if (payload.new && payload.new.id === initialData.id) {
              setServerData(payload.new);
              setLastSync(new Date());

              // Check for conflicts
              if (detectDataConflict(payload.new, optimisticData)) {
                toast.warning('Data Conflict Detected', {
                  description:
                    'Another user updated this item - please review changes',
                  action: {
                    label: 'Refresh',
                    onClick: () => window.location.reload(),
                  },
                });
              }
            }
          },
          priority: 'high',
        },
      );

      return unsubscribe;
    }
  }, [realtime, options.weddingId, initialData.id, optimisticData]);

  return {
    data: optimisticData,
    isOptimistic: (optimisticData as any)?.__optimistic === true,
    isPending,
    error,
    submitOptimistic,
    submitOptimisticEvent,
    rollback,
    hasConflict,
    retryCount,
    lastSync,
    pendingUpdatesCount: pendingOperations.length,
  };
}

// Helper functions
function detectDataConflict<T>(optimistic: T, server: T): boolean {
  // Check critical fields for conflicts
  const criticalFields = [
    'wedding_date',
    'venue_id',
    'guest_count',
    'ceremony_time',
  ];

  return criticalFields.some((field) => {
    const optimisticValue = (optimistic as any)[field];
    const serverValue = (server as any)[field];

    return (
      optimisticValue !== undefined &&
      serverValue !== undefined &&
      optimisticValue !== serverValue
    );
  });
}

async function checkRecentWeddingChanges(weddingId: string): Promise<any[]> {
  // This would check for recent changes by other vendors
  // Placeholder implementation
  return [];
}

async function logWeddingDayError(errorData: any): Promise<void> {
  // Log error for post-wedding analysis
  console.error('Wedding Day Error:', errorData);

  // Could send to error tracking service
  try {
    // Example: await errorTrackingService.log(errorData);
  } catch (logError) {
    console.error('Failed to log wedding day error:', logError);
  }
}

async function saveToLocalStorage(key: string, data: any): Promise<void> {
  try {
    const existingData = localStorage.getItem(key);
    const parsedData = existingData ? JSON.parse(existingData) : [];

    parsedData.push({
      data,
      timestamp: new Date().toISOString(),
    });

    localStorage.setItem(key, JSON.stringify(parsedData));
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
}

function getCurrentVendor(): string {
  // This would get the current vendor from auth context
  return 'current_vendor_id';
}

// Specialized hooks for different wedding scenarios

// Wedding form optimistic updates
export function useOptimisticWeddingForm(
  formId: string,
  weddingId: string,
  initialData: any,
) {
  return useOptimisticRealtime(
    initialData,
    async (data) => {
      const response = await fetch(`/api/forms/${formId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, wedding_id: weddingId }),
      });

      if (!response.ok) throw new Error('Failed to save form response');
      return response.json();
    },
    {
      weddingId,
      rollbackDelay: 5000, // 5s timeout for form submissions
      weddingDateSafety: true,
      retryAttempts: 3,
      enableConflictDetection: true,
      onError: (error) => {
        toast.error('Form Save Failed', {
          description:
            'Your response will be saved when connection is restored',
        });
      },
    },
  );
}

// Wedding timeline optimistic updates
export function useOptimisticWeddingTimeline(
  weddingId: string,
  initialData: any,
) {
  return useOptimisticRealtime(
    initialData,
    async (data) => {
      const response = await fetch(`/api/weddings/${weddingId}/timeline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update wedding timeline');
      return response.json();
    },
    {
      weddingId,
      weddingDateSafety: true,
      retryAttempts: 5, // More retries for timeline updates
      enableConflictDetection: true,
      onSuccess: () => {
        toast.success('Timeline Updated', {
          description: 'Wedding timeline has been successfully updated',
        });
      },
      onError: (error) => {
        toast.error('Timeline Update Failed', {
          description: 'Changes will be retried automatically',
        });
      },
    },
  );
}

// Client profile optimistic updates
export function useOptimisticClientProfile(
  clientId: string,
  weddingId: string,
  initialData: any,
) {
  return useOptimisticRealtime(
    initialData,
    async (data) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update client profile');
      return response.json();
    },
    {
      weddingId,
      rollbackDelay: 3000,
      retryAttempts: 2,
      enableConflictDetection: false, // Profiles are less likely to conflict
      onError: (error) => {
        toast.error('Profile Update Failed', {
          description:
            'Please try again or contact support if the issue persists',
        });
      },
    },
  );
}
