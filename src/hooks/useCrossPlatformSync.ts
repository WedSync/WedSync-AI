'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WeddingCrossPlatformSyncManager } from '@/lib/platform/cross-platform-sync';
import type {
  SyncStatus,
  ConflictResolution,
  OfflineOperation,
  SyncMetrics,
  PlatformSyncConfig,
} from '@/types/platform-scaling';

export interface CrossPlatformSyncState {
  isLoading: boolean;
  syncStatus: SyncStatus;
  pendingOperations: OfflineOperation[];
  conflicts: ConflictResolution[];
  metrics: SyncMetrics | null;
  lastSyncTime: string | null;
  platforms: Array<{
    platform: 'web' | 'mobile' | 'pwa';
    status: 'online' | 'offline' | 'syncing';
    lastSeen: string;
  }>;
  error: string | null;
}

export interface CrossPlatformSyncActions {
  startSync: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => Promise<void>;
  resolveConflict: (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
  ) => Promise<void>;
  queueOfflineOperation: (
    operation: Omit<OfflineOperation, 'id' | 'timestamp'>,
  ) => void;
  clearPendingOperations: () => void;
  refreshStatus: () => Promise<void>;
  resetError: () => void;
}

export function useCrossPlatformSync(): CrossPlatformSyncState &
  CrossPlatformSyncActions {
  const [state, setState] = useState<CrossPlatformSyncState>({
    isLoading: true,
    syncStatus: 'idle',
    pendingOperations: [],
    conflicts: [],
    metrics: null,
    lastSyncTime: null,
    platforms: [],
    error: null,
  });

  const syncManagerRef = useRef<WeddingCrossPlatformSyncManager | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Initialize sync manager
  useEffect(() => {
    const initializeSyncManager = async () => {
      try {
        if (!syncManagerRef.current) {
          const config: PlatformSyncConfig = {
            userId: crypto.randomUUID(), // Would get from auth context
            syncIntervalMs: 30000, // 30 seconds
            conflictResolutionStrategy: 'timestamp',
            enableRealTimeSync: true,
            offlineQueueSize: 1000,
            batchSize: 50,
            retryAttempts: 3,
            weddingDayPriority: true,
          };

          syncManagerRef.current = new WeddingCrossPlatformSyncManager(config);
          await syncManagerRef.current.initialize();
        }
      } catch (error) {
        console.error('Failed to initialize cross-platform sync:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize cross-platform sync',
        }));
      }
    };

    initializeSyncManager();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Monitor sync status and load initial data
  useEffect(() => {
    if (!syncManagerRef.current) return;

    const loadInitialData = async () => {
      try {
        const [status, operations, conflicts, metrics] = await Promise.all([
          syncManagerRef.current!.getSyncStatus(),
          syncManagerRef.current!.getPendingOperations(),
          syncManagerRef.current!.getConflicts(),
          syncManagerRef.current!.getSyncMetrics(),
        ]);

        // Load platform status from localStorage and real-time data
        const platforms = await loadPlatformStatus();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: status,
          pendingOperations: operations,
          conflicts,
          metrics,
          platforms,
          lastSyncTime: metrics?.lastSuccessfulSync || null,
        }));
      } catch (error) {
        console.error('Failed to load sync data:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load sync status',
        }));
      }
    };

    loadInitialData();
  }, [syncManagerRef.current]);

  // Helper function to load platform status
  const loadPlatformStatus = useCallback(async () => {
    try {
      // Get platform presence from Supabase realtime
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('platform, status, last_seen')
        .eq('user_id', 'current-user-id'); // Would get from auth

      const platforms = [
        {
          platform: 'web' as const,
          status: navigator.onLine ? ('online' as const) : ('offline' as const),
          lastSeen: new Date().toISOString(),
        },
      ];

      // Add presence data for other platforms
      if (presenceData) {
        presenceData.forEach((presence) => {
          if (presence.platform !== 'web') {
            platforms.push({
              platform: presence.platform,
              status: presence.status,
              lastSeen: presence.last_seen,
            });
          }
        });
      }

      return platforms;
    } catch (error) {
      console.error('Failed to load platform status:', error);
      return [];
    }
  }, [supabase]);

  // Set up real-time sync event listeners
  useEffect(() => {
    const syncChannel = supabase
      .channel('cross-platform-sync')
      .on('broadcast', { event: 'sync-started' }, (payload) => {
        setState((prev) => ({
          ...prev,
          syncStatus: 'syncing',
          platforms: prev.platforms.map((p) =>
            p.platform === payload.platform ? { ...p, status: 'syncing' } : p,
          ),
        }));
      })
      .on('broadcast', { event: 'sync-completed' }, (payload) => {
        setState((prev) => ({
          ...prev,
          syncStatus: 'completed',
          lastSyncTime: new Date().toISOString(),
          platforms: prev.platforms.map((p) =>
            p.platform === payload.platform ? { ...p, status: 'online' } : p,
          ),
        }));
      })
      .on('broadcast', { event: 'conflict-detected' }, (payload) => {
        const conflict: ConflictResolution = {
          id: payload.conflict_id,
          type: payload.conflict_type,
          localData: payload.local_data,
          remoteData: payload.remote_data,
          timestamp: new Date().toISOString(),
          tableName: payload.table_name,
          recordId: payload.record_id,
          status: 'pending',
        };

        setState((prev) => ({
          ...prev,
          conflicts: [...prev.conflicts, conflict],
        }));
      })
      .on('broadcast', { event: 'platform-presence' }, (payload) => {
        setState((prev) => ({
          ...prev,
          platforms: prev.platforms.map((p) =>
            p.platform === payload.platform
              ? { ...p, status: payload.status, lastSeen: payload.timestamp }
              : p,
          ),
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
    };
  }, [supabase]);

  // Automatic sync interval
  useEffect(() => {
    if (!syncManagerRef.current || state.syncStatus === 'paused') return;

    syncIntervalRef.current = setInterval(async () => {
      try {
        if (state.syncStatus === 'idle') {
          await startSync();
        }
      } catch (error) {
        console.error('Automatic sync failed:', error);
      }
    }, 30000); // Sync every 30 seconds

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.syncStatus, syncManagerRef.current]);

  // Platform heartbeat to track presence
  useEffect(() => {
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        // Update presence in database
        await supabase.from('user_presence').upsert({
          user_id: 'current-user-id', // Would get from auth
          platform: 'web',
          status: navigator.onLine ? 'online' : 'offline',
          last_seen: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });

        // Broadcast presence to other platforms
        await supabase.channel('cross-platform-sync').send({
          type: 'broadcast',
          event: 'platform-presence',
          payload: {
            platform: 'web',
            status: navigator.onLine ? 'online' : 'offline',
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }, 60000); // Every minute

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [supabase]);

  const startSync = useCallback(async () => {
    if (!syncManagerRef.current) return;

    try {
      setState((prev) => ({ ...prev, syncStatus: 'syncing', error: null }));

      const result = await syncManagerRef.current.performSync();

      setState((prev) => ({
        ...prev,
        syncStatus: result.success ? 'completed' : 'failed',
        pendingOperations: result.remainingOperations || [],
        conflicts: [...prev.conflicts, ...(result.conflicts || [])],
        metrics: result.metrics || prev.metrics,
        lastSyncTime: result.success
          ? new Date().toISOString()
          : prev.lastSyncTime,
      }));

      // Broadcast sync completion
      await supabase.channel('cross-platform-sync').send({
        type: 'broadcast',
        event: 'sync-completed',
        payload: {
          platform: 'web',
          timestamp: new Date().toISOString(),
          operationsProcessed: result.operationsProcessed || 0,
        },
      });
    } catch (error) {
      console.error('Failed to perform sync:', error);
      setState((prev) => ({
        ...prev,
        syncStatus: 'failed',
        error: 'Sync operation failed',
      }));
    }
  }, [supabase]);

  const pauseSync = useCallback(() => {
    setState((prev) => ({ ...prev, syncStatus: 'paused' }));

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
  }, []);

  const resumeSync = useCallback(async () => {
    setState((prev) => ({ ...prev, syncStatus: 'idle' }));
    await startSync();
  }, [startSync]);

  const resolveConflict = useCallback(
    async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
      if (!syncManagerRef.current) return;

      try {
        const conflict = state.conflicts.find((c) => c.id === conflictId);
        if (!conflict) return;

        await syncManagerRef.current.resolveConflict({
          conflictId,
          resolution,
          conflictData: conflict,
        });

        // Update conflict status
        setState((prev) => ({
          ...prev,
          conflicts: prev.conflicts.map((c) =>
            c.id === conflictId ? { ...c, status: 'resolved', resolution } : c,
          ),
        }));

        // Log conflict resolution
        await supabase.from('sync_conflict_log').insert({
          conflict_id: conflictId,
          resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: 'current-user-id', // Would get from auth
        });
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to resolve sync conflict',
        }));
      }
    },
    [state.conflicts, supabase],
  );

  const queueOfflineOperation = useCallback(
    (operation: Omit<OfflineOperation, 'id' | 'timestamp'>) => {
      const offlineOperation: OfflineOperation = {
        ...operation,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        pendingOperations: [...prev.pendingOperations, offlineOperation],
      }));

      // Persist to localStorage for offline persistence
      const storedOps = JSON.parse(
        localStorage.getItem('pending-sync-operations') || '[]',
      );
      storedOps.push(offlineOperation);
      localStorage.setItem(
        'pending-sync-operations',
        JSON.stringify(storedOps),
      );
    },
    [],
  );

  const clearPendingOperations = useCallback(() => {
    setState((prev) => ({ ...prev, pendingOperations: [] }));
    localStorage.removeItem('pending-sync-operations');
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!syncManagerRef.current) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const [status, operations, conflicts, metrics, platforms] =
        await Promise.all([
          syncManagerRef.current.getSyncStatus(),
          syncManagerRef.current.getPendingOperations(),
          syncManagerRef.current.getConflicts(),
          syncManagerRef.current.getSyncMetrics(),
          loadPlatformStatus(),
        ]);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        syncStatus: status,
        pendingOperations: operations,
        conflicts,
        metrics,
        platforms,
        lastSyncTime: metrics?.lastSuccessfulSync || prev.lastSyncTime,
      }));
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh sync status',
      }));
    }
  }, [loadPlatformStatus]);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startSync,
    pauseSync,
    resumeSync,
    resolveConflict,
    queueOfflineOperation,
    clearPendingOperations,
    refreshStatus,
    resetError,
  };
}
