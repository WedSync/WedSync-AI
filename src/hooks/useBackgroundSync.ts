'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  backgroundSync,
  type SyncAction,
  type SyncStats,
} from '@/lib/services/background-sync-service';

export interface UseBackgroundSyncProps {
  enableAutoSync?: boolean;
  onSyncSuccess?: (action: SyncAction) => void;
  onSyncFailed?: (action: SyncAction, error: Error) => void;
}

export interface UseBackgroundSyncReturn {
  // Status
  isOnline: boolean;
  isSyncing: boolean;
  stats: SyncStats | null;

  // Actions
  queueAction: (
    action: Omit<SyncAction, 'id' | 'retryCount' | 'status' | 'timestamp'>,
  ) => Promise<string>;
  triggerSync: () => Promise<void>;
  clearAllActions: () => Promise<void>;
  retryFailedActions: () => Promise<void>;

  // Utilities
  getSyncStats: () => Promise<SyncStats>;

  // Queue helpers for common wedding actions
  queueVendorCheckIn: (
    weddingId: string,
    vendorId: string,
    data: any,
  ) => Promise<string>;
  queueTimelineUpdate: (
    weddingId: string,
    eventId: string,
    update: any,
  ) => Promise<string>;
  queueIssueReport: (weddingId: string, issue: any) => Promise<string>;
  queueStatusUpdate: (weddingId: string, status: any) => Promise<string>;
}

export function useBackgroundSync({
  enableAutoSync = true,
  onSyncSuccess,
  onSyncFailed,
}: UseBackgroundSyncProps = {}): UseBackgroundSyncReturn {
  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);

  // Refs for callbacks
  const onSyncSuccessRef = useRef(onSyncSuccess);
  const onSyncFailedRef = useRef(onSyncFailed);

  // Update refs when callbacks change
  useEffect(() => {
    onSyncSuccessRef.current = onSyncSuccess;
    onSyncFailedRef.current = onSyncFailed;
  }, [onSyncSuccess, onSyncFailed]);

  // =====================================================
  // STATUS MONITORING
  // =====================================================

  const updateStats = useCallback(async () => {
    try {
      const currentStats = await backgroundSync.getSyncStats();
      setStats(currentStats);
    } catch (error) {
      console.error('[Background Sync Hook] Failed to get stats:', error);
    }
  }, []);

  const updateSyncStatus = useCallback(() => {
    setIsOnline(backgroundSync.isOnlineStatus());
    setIsSyncing(backgroundSync.isSyncingStatus());
  }, []);

  // =====================================================
  // EVENT LISTENERS
  // =====================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateStats();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSyncResult = (event: CustomEvent) => {
      const { result, action, error } = event.detail;

      if (result === 'success') {
        onSyncSuccessRef.current?.(action);
      } else if (result === 'failed') {
        onSyncFailedRef.current?.(action, error);
      }

      // Update stats after sync result
      updateStats();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(
      'wedsync-sync-result',
      handleSyncResult as EventListener,
    );

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(
        'wedsync-sync-result',
        handleSyncResult as EventListener,
      );
    };
  }, [updateStats]);

  // =====================================================
  // SYNC ACTIONS
  // =====================================================

  const queueAction = useCallback(
    async (
      action: Omit<SyncAction, 'id' | 'retryCount' | 'status' | 'timestamp'>,
    ): Promise<string> => {
      try {
        const actionId = await backgroundSync.queueAction(action);
        await updateStats();
        return actionId;
      } catch (error) {
        console.error('[Background Sync Hook] Failed to queue action:', error);
        throw error;
      }
    },
    [updateStats],
  );

  const triggerSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      await backgroundSync.triggerSync();
      await updateStats();
    } catch (error) {
      console.error('[Background Sync Hook] Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [updateStats]);

  const clearAllActions = useCallback(async () => {
    try {
      await backgroundSync.clearAllActions();
      await updateStats();
    } catch (error) {
      console.error('[Background Sync Hook] Failed to clear actions:', error);
      throw error;
    }
  }, [updateStats]);

  const retryFailedActions = useCallback(async () => {
    try {
      await backgroundSync.retryFailedActions();
      await updateStats();
    } catch (error) {
      console.error('[Background Sync Hook] Failed to retry actions:', error);
      throw error;
    }
  }, [updateStats]);

  const getSyncStats = useCallback(async (): Promise<SyncStats> => {
    try {
      const currentStats = await backgroundSync.getSyncStats();
      setStats(currentStats);
      return currentStats;
    } catch (error) {
      console.error('[Background Sync Hook] Failed to get stats:', error);
      throw error;
    }
  }, []);

  // =====================================================
  // WEDDING-SPECIFIC QUEUE HELPERS
  // =====================================================

  const queueVendorCheckIn = useCallback(
    async (weddingId: string, vendorId: string, data: any): Promise<string> => {
      return queueAction({
        type: 'vendor_checkin',
        method: 'POST',
        url: `/api/vendors/${vendorId}/checkin`,
        data: { weddingId, ...data },
        priority: 'critical', // Wedding day vendor check-ins are critical
        weddingId,
        metadata: { vendorId },
      });
    },
    [queueAction],
  );

  const queueTimelineUpdate = useCallback(
    async (
      weddingId: string,
      eventId: string,
      update: any,
    ): Promise<string> => {
      return queueAction({
        type: 'timeline_update',
        method: 'PATCH',
        url: `/api/timeline/events/${eventId}`,
        data: update,
        priority: 'high', // Timeline updates are high priority
        weddingId,
        metadata: { eventId },
      });
    },
    [queueAction],
  );

  const queueIssueReport = useCallback(
    async (weddingId: string, issue: any): Promise<string> => {
      return queueAction({
        type: 'issue_create',
        method: 'POST',
        url: `/api/issues`,
        data: { weddingId, ...issue },
        priority: issue.severity === 'critical' ? 'critical' : 'high',
        weddingId,
        metadata: { severity: issue.severity },
      });
    },
    [queueAction],
  );

  const queueStatusUpdate = useCallback(
    async (weddingId: string, status: any): Promise<string> => {
      return queueAction({
        type: 'status_update',
        method: 'PATCH',
        url: `/api/weddings/${weddingId}/status`,
        data: status,
        priority: 'medium',
        weddingId,
      });
    },
    [queueAction],
  );

  // =====================================================
  // INITIALIZATION
  // =====================================================

  useEffect(() => {
    // Initial setup
    updateSyncStatus();
    updateStats();

    // Set up periodic stats updates
    const statsInterval = setInterval(updateStats, 30000); // Every 30 seconds

    return () => {
      clearInterval(statsInterval);
    };
  }, [updateStats, updateSyncStatus]);

  // =====================================================
  // AUTO-SYNC MANAGEMENT
  // =====================================================

  useEffect(() => {
    if (!enableAutoSync) return;

    // Trigger sync when coming back online
    if (isOnline && stats && stats.pendingActions > 0) {
      triggerSync();
    }
  }, [isOnline, enableAutoSync, stats, triggerSync]);

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    // Status
    isOnline,
    isSyncing,
    stats,

    // Actions
    queueAction,
    triggerSync,
    clearAllActions,
    retryFailedActions,

    // Utilities
    getSyncStats,

    // Wedding-specific helpers
    queueVendorCheckIn,
    queueTimelineUpdate,
    queueIssueReport,
    queueStatusUpdate,
  };
}

// =====================================================
// SPECIALIZED HOOKS
// =====================================================

// Hook for wedding day coordination with enhanced sync
export function useWeddingDaySync(weddingId: string) {
  const {
    isOnline,
    isSyncing,
    stats,
    queueVendorCheckIn,
    queueTimelineUpdate,
    queueIssueReport,
    queueStatusUpdate,
    triggerSync,
  } = useBackgroundSync({
    enableAutoSync: true,
    onSyncSuccess: (action) => {
      console.log(
        `[Wedding Day Sync] ${action.type} synced successfully:`,
        action.id,
      );
    },
    onSyncFailed: (action, error) => {
      console.error(`[Wedding Day Sync] ${action.type} sync failed:`, error);
    },
  });

  // Wedding-specific stats
  const weddingStats = {
    ...stats,
    weddingActions: stats ? stats.totalActions : 0, // Could filter by weddingId if needed
    criticalPending: stats ? stats.pendingActions : 0, // Could filter by priority if needed
  };

  return {
    isOnline,
    isSyncing,
    stats: weddingStats,

    // Wedding day specific actions
    checkInVendor: (vendorId: string, data: any) =>
      queueVendorCheckIn(weddingId, vendorId, data),
    updateTimelineEvent: (eventId: string, update: any) =>
      queueTimelineUpdate(weddingId, eventId, update),
    reportIssue: (issue: any) => queueIssueReport(weddingId, issue),
    updateStatus: (status: any) => queueStatusUpdate(weddingId, status),

    // Force sync for critical situations
    forceSyncNow: triggerSync,
  };
}

// Hook for form submissions with retry logic
export function useFormSync() {
  const { queueAction, stats, isOnline } = useBackgroundSync();

  const submitForm = useCallback(
    async (
      formData: any,
      endpoint: string,
      priority: SyncAction['priority'] = 'medium',
    ) => {
      return queueAction({
        type: 'form_submission',
        method: 'POST',
        url: endpoint,
        data: formData,
        priority,
        metadata: { formType: endpoint.split('/').pop() },
      });
    },
    [queueAction],
  );

  return {
    submitForm,
    isOnline,
    pendingSubmissions: stats?.pendingActions || 0,
    failedSubmissions: stats?.failedActions || 0,
  };
}
