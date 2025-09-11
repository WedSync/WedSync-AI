'use client';

/**
 * OfflineCollaborationManager - Offline-capable collaborative editing for mobile
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 *
 * Features:
 * - Y.js IndexedDB persistence for offline document editing
 * - Conflict resolution when reconnecting from offline state
 * - Visual offline/online indicators with smooth transitions
 * - Battery-optimized sync intervals and background operations
 * - Queue management for pending collaborative operations
 * - Mobile-specific network awareness and data conservation
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Pause,
  Play,
  Battery,
  Smartphone,
  Server,
} from 'lucide-react';

interface SyncState {
  status: 'connected' | 'syncing' | 'offline' | 'error' | 'paused';
  lastSync: Date | null;
  pendingOperations: number;
  error?: string;
  conflictsDetected: number;
}

interface ConflictResolution {
  id: string;
  type: 'text' | 'structure' | 'user_presence';
  localChange: string;
  remoteChange: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merged';
}

interface NetworkQuality {
  type: 'wifi' | '4g' | '3g' | '2g' | 'slow' | 'offline';
  speed: 'fast' | 'medium' | 'slow' | 'offline';
  strength: number; // 0-100
  isMetered: boolean;
}

interface OfflineCollaborationManagerProps {
  documentId: string;
  weddingId: string;
  userId: string;
  yDoc?: Y.Doc;
  enableOfflineEditing?: boolean;
  syncInterval?: number; // milliseconds
  batteryOptimization?: boolean;
  onSyncStateChange?: (state: SyncState) => void;
  onConflictDetected?: (conflicts: ConflictResolution[]) => void;
  onOfflineToggle?: (offline: boolean) => void;
  className?: string;
}

export function OfflineCollaborationManager({
  documentId,
  weddingId,
  userId,
  yDoc,
  enableOfflineEditing = true,
  syncInterval = 5000,
  batteryOptimization = true,
  onSyncStateChange,
  onConflictDetected,
  onOfflineToggle,
  className,
}: OfflineCollaborationManagerProps) {
  // State
  const [syncState, setSyncState] = useState<SyncState>({
    status: navigator.onLine ? 'connected' : 'offline',
    lastSync: null,
    pendingOperations: 0,
    conflictsDetected: 0,
  });

  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>({
    type: 'wifi',
    speed: 'fast',
    strength: 100,
    isMetered: false,
  });

  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [syncPaused, setSyncPaused] = useState(false);
  const [manualOfflineMode, setManualOfflineMode] = useState(false);

  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conflictResolutionRef = useRef<Map<string, ConflictResolution>>(
    new Map(),
  );
  const pendingOperationsRef = useRef<
    Array<{ type: string; data: any; timestamp: Date }>
  >([]);
  const indexedDbProviderRef = useRef<IndexeddbPersistence | null>(null);

  // Initialize IndexedDB provider
  useEffect(() => {
    if (!enableOfflineEditing || !yDoc) return;

    const provider = new IndexeddbPersistence(
      `wedsync-collab-${documentId}`,
      yDoc,
    );
    indexedDbProviderRef.current = provider;

    // Handle persistence events
    provider.on('synced', () => {
      setSyncState((prev) => ({
        ...prev,
        status: isOnline ? 'connected' : 'offline',
        lastSync: new Date(),
      }));
    });

    provider.on('error', (error: Error) => {
      setSyncState((prev) => ({
        ...prev,
        status: 'error',
        error: error.message,
      }));
    });

    return () => {
      provider.destroy();
      indexedDbProviderRef.current = null;
    };
  }, [documentId, yDoc, enableOfflineEditing, isOnline]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!manualOfflineMode) {
        setSyncState((prev) => ({ ...prev, status: 'connected' }));
        handleSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState((prev) => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [manualOfflineMode]);

  // Monitor battery level and power state
  useEffect(() => {
    if (!batteryOptimization) return;

    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(battery.level * 100);

          const isLowBattery = battery.level < 0.2;
          setLowPowerMode(isLowBattery);

          // Adjust sync frequency based on battery level
          if (isLowBattery && syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            startSyncInterval(syncInterval * 3); // Reduce sync frequency when battery is low
          }
        } catch (error) {
          console.warn('Battery API not supported');
        }
      }
    };

    checkBattery();
  }, [batteryOptimization, syncInterval]);

  // Detect network quality
  useEffect(() => {
    const updateNetworkQuality = () => {
      const connection = (navigator as any).connection;
      if (!connection) return;

      const networkType = connection.effectiveType || 'unknown';
      const downlink = connection.downlink || 0;
      const isMetered = connection.saveData || false;

      let speed: NetworkQuality['speed'] = 'fast';
      let type: NetworkQuality['type'] = 'wifi';

      switch (networkType) {
        case '4g':
          type = '4g';
          speed = downlink > 1 ? 'fast' : 'medium';
          break;
        case '3g':
          type = '3g';
          speed = 'medium';
          break;
        case '2g':
          type = '2g';
          speed = 'slow';
          break;
        case 'slow-2g':
          type = '2g';
          speed = 'slow';
          break;
      }

      setNetworkQuality({
        type,
        speed,
        strength: Math.round((downlink / 10) * 100),
        isMetered,
      });
    };

    if ('connection' in navigator) {
      updateNetworkQuality();
      (navigator as any).connection.addEventListener(
        'change',
        updateNetworkQuality,
      );

      return () => {
        (navigator as any).connection?.removeEventListener(
          'change',
          updateNetworkQuality,
        );
      };
    }
  }, []);

  // Handle app visibility changes (mobile background/foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setSyncPaused(true);
        setSyncState((prev) => ({ ...prev, status: 'paused' }));
      } else {
        setSyncPaused(false);
        if (isOnline && !manualOfflineMode) {
          setSyncState((prev) => ({ ...prev, status: 'connected' }));
          handleSync();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOnline, manualOfflineMode]);

  // Start sync interval
  const startSyncInterval = useCallback(
    (interval: number) => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        if (!syncPaused && isOnline && !manualOfflineMode) {
          handleSync();
        }
      }, interval);
    },
    [syncPaused, isOnline, manualOfflineMode],
  );

  // Handle manual sync
  const handleSync = useCallback(async () => {
    if (!isOnline || manualOfflineMode || syncPaused) return;

    setSyncState((prev) => ({ ...prev, status: 'syncing' }));

    try {
      // Sync pending operations
      const operations = [...pendingOperationsRef.current];
      pendingOperationsRef.current = [];

      for (const operation of operations) {
        const response = await fetch('/api/collaboration/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: 'current-doc',
            weddingId,
            userId,
            operation,
            localState: yDoc ? Y.encodeStateAsUpdate(yDoc) : null,
            lastSync: syncState.lastSync?.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Handle conflicts
        if (result.conflicts && result.conflicts.length > 0) {
          handleConflicts(result.conflicts);
        }
      }

      setSyncState((prev) => ({
        ...prev,
        status: 'connected',
        lastSync: new Date(),
        pendingOperations: 0,
        error: undefined,
      }));
    } catch (error) {
      setSyncState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [
    isOnline,
    manualOfflineMode,
    syncPaused,
    weddingId,
    userId,
    yDoc,
    syncState.lastSync,
  ]);

  // Handle conflicts
  const handleConflicts = useCallback(
    (conflictData: any[]) => {
      const newConflicts: ConflictResolution[] = conflictData.map(
        (conflict) => ({
          id: crypto.randomUUID(),
          type: conflict.type,
          localChange: conflict.local,
          remoteChange: conflict.remote,
          timestamp: new Date(conflict.timestamp),
          resolved: false,
        }),
      );

      setConflicts((prev) => [...prev, ...newConflicts]);
      setSyncState((prev) => ({
        ...prev,
        conflictsDetected: prev.conflictsDetected + newConflicts.length,
      }));
      setShowConflictDialog(true);

      onConflictDetected?.(newConflicts);
    },
    [onConflictDetected],
  );

  // Resolve conflict
  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'local' | 'remote' | 'merged') => {
      setConflicts((prev) =>
        prev.map((conflict) =>
          conflict.id === conflictId
            ? { ...conflict, resolved: true, resolution }
            : conflict,
        ),
      );

      // If all conflicts resolved, hide dialog
      const unresolvedCount = conflicts.filter(
        (c) => !c.resolved && c.id !== conflictId,
      ).length;
      if (unresolvedCount === 0) {
        setShowConflictDialog(false);
      }
    },
    [conflicts],
  );

  // Toggle manual offline mode
  const toggleOfflineMode = useCallback(() => {
    const newOfflineMode = !manualOfflineMode;
    setManualOfflineMode(newOfflineMode);

    if (newOfflineMode) {
      setSyncState((prev) => ({ ...prev, status: 'offline' }));
    } else if (isOnline) {
      setSyncState((prev) => ({ ...prev, status: 'connected' }));
      handleSync();
    }

    onOfflineToggle?.(newOfflineMode);
  }, [manualOfflineMode, isOnline, handleSync, onOfflineToggle]);

  // Start sync interval when component mounts
  useEffect(() => {
    startSyncInterval(syncInterval);
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [startSyncInterval, syncInterval]);

  // Notify state changes
  useEffect(() => {
    onSyncStateChange?.(syncState);
  }, [syncState, onSyncStateChange]);

  // Get status display info
  const statusDisplay = useMemo(() => {
    switch (syncState.status) {
      case 'connected':
        return {
          icon: isOnline ? Wifi : WifiOff,
          text: isOnline ? 'All changes synced' : 'Connected (cached)',
          color: 'text-success-600',
          bgColor: 'bg-success-50',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          text: 'Syncing changes...',
          color: 'text-primary-600',
          bgColor: 'bg-primary-50',
        };
      case 'offline':
        return {
          icon: manualOfflineMode ? CloudOff : WifiOff,
          text: manualOfflineMode
            ? 'Working offline'
            : 'Offline - Changes saved locally',
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: syncState.error || 'Sync error',
          color: 'text-error-600',
          bgColor: 'bg-error-50',
        };
      case 'paused':
        return {
          icon: Pause,
          text: 'Collaboration paused',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
      default:
        return {
          icon: Clock,
          text: 'Connecting...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
    }
  }, [syncState, isOnline, manualOfflineMode]);

  const StatusIcon = statusDisplay.icon;

  return (
    <div
      className={cn('offline-collaboration-manager', className)}
      data-testid="offline-collaboration-manager"
    >
      {/* Status indicator */}
      <motion.div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border transition-colors',
          statusDisplay.bgColor,
          'border-gray-200',
        )}
        animate={syncState.status === 'syncing' ? { scale: [1, 1.02, 1] } : {}}
        transition={{
          duration: 1,
          repeat: syncState.status === 'syncing' ? Infinity : 0,
        }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={syncState.status === 'syncing' ? { rotate: 360 } : {}}
            transition={
              syncState.status === 'syncing'
                ? { duration: 2, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            <StatusIcon className={cn('w-4 h-4', statusDisplay.color)} />
          </motion.div>

          <span className={cn('text-sm font-medium', statusDisplay.color)}>
            {statusDisplay.text}
          </span>

          {syncState.pendingOperations > 0 && (
            <span className="px-2 py-0.5 bg-warning-100 text-warning-800 text-xs rounded-full">
              {syncState.pendingOperations} pending
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Manual sync button */}
          <button
            onClick={handleSync}
            disabled={!isOnline || syncState.status === 'syncing'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            title="Manual sync"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>

          {/* Offline toggle */}
          <button
            onClick={toggleOfflineMode}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              manualOfflineMode
                ? 'bg-warning-100 text-warning-700'
                : 'hover:bg-gray-100 text-gray-600',
            )}
            title={manualOfflineMode ? 'Go online' : 'Work offline'}
          >
            {manualOfflineMode ? (
              <CloudOff className="w-4 h-4" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Network quality indicator (mobile specific) */}
      {networkQuality.type !== 'wifi' && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>{networkQuality.type.toUpperCase()}</span>
            <span>({networkQuality.speed})</span>
            {networkQuality.isMetered && (
              <span className="text-warning-600">(metered)</span>
            )}
          </div>

          {batteryLevel !== null && batteryOptimization && (
            <div className="flex items-center gap-1">
              <Battery
                className={cn(
                  'w-3 h-3',
                  batteryLevel > 20 ? 'text-success-600' : 'text-error-600',
                )}
              />
              <span>{Math.round(batteryLevel)}%</span>
              {lowPowerMode && (
                <span className="text-warning-600">(power saving)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Last sync info */}
      {syncState.lastSync && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Last synced: {syncState.lastSync.toLocaleTimeString()}
        </div>
      )}

      {/* Conflict resolution dialog */}
      <AnimatePresence>
        {showConflictDialog && conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-4 max-w-sm w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning-600" />
                <h3 className="font-semibold text-gray-900">
                  Resolve Conflicts
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Changes were made offline and online. Please choose how to
                resolve:
              </p>

              <div className="space-y-3">
                {conflicts
                  .filter((c) => !c.resolved)
                  .map((conflict) => (
                    <div
                      key={conflict.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {conflict.type} conflict
                      </div>

                      <div className="text-xs text-gray-600 space-y-2">
                        <div>
                          <span className="font-medium">Local:</span>{' '}
                          {conflict.localChange}
                        </div>
                        <div>
                          <span className="font-medium">Remote:</span>{' '}
                          {conflict.remoteChange}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => resolveConflict(conflict.id, 'local')}
                          className="flex-1 px-3 py-1.5 bg-primary-50 text-primary-700 text-xs rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          Keep Local
                        </button>
                        <button
                          onClick={() => resolveConflict(conflict.id, 'remote')}
                          className="flex-1 px-3 py-1.5 bg-success-50 text-success-700 text-xs rounded-lg hover:bg-success-100 transition-colors"
                        >
                          Keep Remote
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
