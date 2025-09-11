'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  comprehensiveSyncManager,
  type SyncManagerConfig,
  type SyncManagerStatus,
  type ConflictAlert,
  type ConflictResolutionRequest,
} from '@/lib/sync/comprehensive-sync-manager';
import { syncStatusMonitor } from '@/lib/sync/sync-status-monitor';

export interface UseSyncOptions extends SyncManagerConfig {
  enableAutoSync?: boolean;
  enableRealTimeUpdates?: boolean;
  conflictNotifications?: boolean;
  debugMode?: boolean;
}

export interface SyncHookReturn {
  // Status
  status: SyncManagerStatus;
  isInitialized: boolean;
  conflicts: ConflictAlert[];

  // Progress tracking
  syncProgress: {
    isActive: boolean;
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining: number; // seconds
  };

  // Actions
  sync: () => Promise<void>;
  queueItem: (item: SyncQueueItemInput) => Promise<string>;
  resolveConflict: (request: ConflictResolutionRequest) => Promise<boolean>;
  dismissConflict: (conflictId: string) => void;

  // Configuration
  updateConfig: (config: Partial<SyncManagerConfig>) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;

  // Advanced
  getMetrics: () => any;
  exportSyncLog: () => SyncLogEntry[];
  clearSyncHistory: () => void;

  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export interface SyncQueueItemInput {
  type:
    | 'form_submission'
    | 'form_draft'
    | 'client_update'
    | 'note_create'
    | 'viral_action'
    | 'vendor_checkin'
    | 'timeline_update'
    | 'issue_create'
    | 'issue_update'
    | 'status_update';
  action: 'create' | 'update' | 'delete';
  data: any;
  entityType?: string;
  entityId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: {
    userRole?: string;
    isWeddingDay?: boolean;
    requiresConfirmation?: boolean;
  };
}

export interface SyncLogEntry {
  timestamp: string;
  type: 'sync' | 'conflict' | 'error' | 'config' | 'user_action';
  message: string;
  details?: any;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export function useComprehensiveSync(
  options: UseSyncOptions = {},
): SyncHookReturn {
  // State management
  const [status, setStatus] = useState<SyncManagerStatus>({
    isInitialized: false,
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isProcessing: false,
    lastSyncTime: null,
    pendingItems: 0,
    failedItems: 0,
    conflictItems: 0,
    queueHealth: 'good',
    estimatedSyncTime: 0,
  });

  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [syncProgress, setSyncProgress] = useState({
    isActive: false,
    progress: 0,
    message: '',
    estimatedTimeRemaining: 0,
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);

  // Refs for cleanup
  const initializationRef = useRef(false);
  const listenersSetupRef = useRef(false);

  // Logging utility
  const addLogEntry = useCallback(
    (entry: Omit<SyncLogEntry, 'timestamp'>) => {
      const logEntry: SyncLogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      };

      setSyncLog((prev) => [...prev.slice(-99), logEntry]); // Keep last 100 entries

      if (options.debugMode) {
        console.log(
          `[useComprehensiveSync] ${entry.type.toUpperCase()}: ${entry.message}`,
          entry.details,
        );
      }
    },
    [options.debugMode],
  );

  // Error handling
  const handleError = useCallback(
    (error: string | Error, context?: string) => {
      const errorMessage = error instanceof Error ? error.message : error;
      setLastError(errorMessage);

      addLogEntry({
        type: 'error',
        severity: 'error',
        message: context ? `${context}: ${errorMessage}` : errorMessage,
        details: { context, error },
      });
    },
    [addLogEntry],
  );

  // Initialize sync manager
  const initialize = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      addLogEntry({
        type: 'config',
        severity: 'info',
        message: 'Initializing comprehensive sync manager',
        details: options,
      });

      await comprehensiveSyncManager.initialize();

      // Configure sync manager
      comprehensiveSyncManager.updateConfig({
        autoSyncEnabled: options.enableAutoSync !== false,
        conflictResolutionMode: options.weddingDayMode ? 'manual' : 'smart',
        ...options,
      });

      addLogEntry({
        type: 'sync',
        severity: 'success',
        message: 'Sync manager initialized successfully',
      });
    } catch (error) {
      handleError(error as Error, 'Sync manager initialization');
    }
  }, [options, addLogEntry, handleError]);

  // Set up event listeners
  const setupListeners = useCallback(() => {
    if (listenersSetupRef.current) return;
    listenersSetupRef.current = true;

    // Status updates
    comprehensiveSyncManager.onStatusChange((newStatus) => {
      setStatus(newStatus);

      if (newStatus.isProcessing !== status.isProcessing) {
        addLogEntry({
          type: 'sync',
          severity: 'info',
          message: newStatus.isProcessing ? 'Sync started' : 'Sync completed',
          details: newStatus,
        });
      }
    });

    // Conflict detection
    comprehensiveSyncManager.onConflictDetected((alert) => {
      setConflicts((prev) => {
        // Avoid duplicates
        const exists = prev.some((c) => c.id === alert.id);
        if (exists) return prev;

        const updated = [...prev, alert].slice(-20); // Keep last 20 conflicts

        addLogEntry({
          type: 'conflict',
          severity: alert.severity === 'critical' ? 'error' : 'warning',
          message: `Conflict detected: ${alert.message}`,
          details: alert,
        });

        // Show notification if enabled
        if (options.conflictNotifications && alert.requiresImmediateAttention) {
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('WedSync Conflict', {
              body: alert.message,
              icon: '/favicon.ico',
              tag: `conflict-${alert.id}`,
            });
          }
        }

        return updated;
      });
    });

    // Progress updates
    comprehensiveSyncManager.onProgress((progress, message) => {
      setSyncProgress((prev) => ({
        ...prev,
        isActive: progress > 0 && progress < 100,
        progress,
        message,
        estimatedTimeRemaining: Math.max(0, (100 - progress) * 0.1), // Rough estimate
      }));
    });

    // Status monitor events
    syncStatusMonitor.on('conflictAlert', (alert: ConflictAlert) => {
      if (!conflicts.some((c) => c.id === alert.id)) {
        setConflicts((prev) => [...prev, alert].slice(-20));
      }
    });

    syncStatusMonitor.on('networkStatusChanged', (data: any) => {
      addLogEntry({
        type: 'sync',
        severity: data.isOnline ? 'success' : 'warning',
        message: `Network ${data.isOnline ? 'connected' : 'disconnected'}`,
        details: data,
      });
    });
  }, [
    status.isProcessing,
    conflicts,
    options.conflictNotifications,
    addLogEntry,
  ]);

  // Initialize on mount
  useEffect(() => {
    initialize();
    setupListeners();
  }, [initialize, setupListeners]);

  // Queue sync item
  const queueItem = useCallback(
    async (item: SyncQueueItemInput): Promise<string> => {
      try {
        const itemId = await comprehensiveSyncManager.queueSyncItem({
          type: item.type,
          action: item.action,
          data: item.data,
          entityType: item.entityType,
          entityId: item.entityId,
        });

        addLogEntry({
          type: 'user_action',
          severity: 'info',
          message: `Queued ${item.type} for sync`,
          details: { itemId, type: item.type, action: item.action },
        });

        return itemId;
      } catch (error) {
        handleError(error as Error, 'Queue sync item');
        throw error;
      }
    },
    [addLogEntry, handleError],
  );

  // Perform manual sync
  const sync = useCallback(async (): Promise<void> => {
    try {
      addLogEntry({
        type: 'user_action',
        severity: 'info',
        message: 'Manual sync initiated',
      });

      const result = await comprehensiveSyncManager.performSync();

      addLogEntry({
        type: 'sync',
        severity: 'success',
        message: `Sync completed: ${result.successful} successful, ${result.failed} failed`,
        details: result,
      });
    } catch (error) {
      handleError(error as Error, 'Manual sync');
      throw error;
    }
  }, [addLogEntry, handleError]);

  // Resolve conflict
  const resolveConflict = useCallback(
    async (request: ConflictResolutionRequest): Promise<boolean> => {
      try {
        const success = await comprehensiveSyncManager.resolveConflict(request);

        if (success) {
          // Remove from local conflicts list
          setConflicts((prev) =>
            prev.filter((c) => c.id !== request.conflictId),
          );

          addLogEntry({
            type: 'user_action',
            severity: 'success',
            message: `Conflict resolved: ${request.userResolution}`,
            details: request,
          });
        }

        return success;
      } catch (error) {
        handleError(error as Error, 'Resolve conflict');
        return false;
      }
    },
    [addLogEntry, handleError],
  );

  // Dismiss conflict alert
  const dismissConflict = useCallback(
    (conflictId: string) => {
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      syncStatusMonitor.dismissConflictAlert(conflictId);

      addLogEntry({
        type: 'user_action',
        severity: 'info',
        message: 'Conflict alert dismissed',
        details: { conflictId },
      });
    },
    [addLogEntry],
  );

  // Update configuration
  const updateConfig = useCallback(
    (config: Partial<SyncManagerConfig>) => {
      comprehensiveSyncManager.updateConfig(config);

      addLogEntry({
        type: 'config',
        severity: 'info',
        message: 'Sync configuration updated',
        details: config,
      });
    },
    [addLogEntry],
  );

  // Set auto-sync enabled
  const setAutoSyncEnabled = useCallback(
    (enabled: boolean) => {
      comprehensiveSyncManager.setAutoSyncEnabled(enabled);

      addLogEntry({
        type: 'config',
        severity: 'info',
        message: `Auto-sync ${enabled ? 'enabled' : 'disabled'}`,
      });
    },
    [addLogEntry],
  );

  // Get metrics
  const getMetrics = useCallback(() => {
    return comprehensiveSyncManager.getStatistics();
  }, []);

  // Export sync log
  const exportSyncLog = useCallback((): SyncLogEntry[] => {
    return [...syncLog];
  }, [syncLog]);

  // Clear sync history
  const clearSyncHistory = useCallback(() => {
    setSyncLog([]);
    addLogEntry({
      type: 'user_action',
      severity: 'info',
      message: 'Sync history cleared',
    });
  }, [addLogEntry]);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Request notification permission if conflicts notifications enabled
  useEffect(() => {
    if (
      options.conflictNotifications &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }
  }, [options.conflictNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up listeners and resources when component unmounts
      comprehensiveSyncManager.destroy();
    };
  }, []);

  return {
    // Status
    status,
    isInitialized: status.isInitialized,
    conflicts,

    // Progress
    syncProgress,

    // Actions
    sync,
    queueItem,
    resolveConflict,
    dismissConflict,

    // Configuration
    updateConfig,
    setAutoSyncEnabled,

    // Advanced
    getMetrics,
    exportSyncLog,
    clearSyncHistory,

    // Error handling
    lastError,
    clearError,
  };
}

// Utility hooks for specific use cases

/**
 * Hook for wedding day coordinators with enhanced priorities
 */
export function useWeddingDaySync(weddingId: string, weddingDate: string) {
  return useComprehensiveSync({
    weddingId,
    weddingDate,
    userRole: 'coordinator',
    weddingDayMode: true,
    isActiveCoordinator: true,
    autoSyncInterval: 10, // Faster sync during wedding day
    conflictResolutionMode: 'manual', // Manual resolution for safety
    conflictNotifications: true,
    debugMode: process.env.NODE_ENV === 'development',
  });
}

/**
 * Hook for vendors with appropriate priorities
 */
export function useVendorSync(weddingId?: string, vendorType?: string) {
  return useComprehensiveSync({
    weddingId,
    userRole: 'vendor',
    autoSyncInterval: 30,
    conflictResolutionMode: 'smart',
    enableAutoSync: true,
  });
}

/**
 * Hook for photographers with media-focused priorities
 */
export function usePhotographerSync(weddingId?: string) {
  return useComprehensiveSync({
    weddingId,
    userRole: 'photographer',
    autoSyncInterval: 20,
    conflictResolutionMode: 'smart',
    enableAutoSync: true,
  });
}

/**
 * Hook for planners with comprehensive access
 */
export function usePlannerSync(options: Partial<UseSyncOptions> = {}) {
  return useComprehensiveSync({
    userRole: 'planner',
    autoSyncInterval: 30,
    conflictResolutionMode: 'smart',
    enableAutoSync: true,
    enableRealTimeUpdates: true,
    ...options,
  });
}
