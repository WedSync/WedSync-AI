'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  RotateCcw,
  AlertCircle,
  Activity,
  Zap,
  Gauge,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import {
  comprehensiveSyncManager,
  type SyncManagerStatus,
  type ConflictAlert,
} from '@/lib/sync/comprehensive-sync-manager';
import { syncStatusMonitor } from '@/lib/sync/sync-status-monitor';

interface EnhancedSyncStatusProps {
  weddingId?: string;
  weddingDate?: string;
  userRole?: 'coordinator' | 'photographer' | 'vendor' | 'planner';
  isWeddingDay?: boolean;
  className?: string;
  variant?: 'compact' | 'full' | 'dashboard';
  showMetrics?: boolean;
}

export function EnhancedSyncStatus({
  weddingId,
  weddingDate,
  userRole = 'planner',
  isWeddingDay = false,
  className,
  variant = 'full',
  showMetrics = true,
}: EnhancedSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncManagerStatus>({
    isInitialized: false,
    isOnline: navigator?.onLine || true,
    isProcessing: false,
    lastSyncTime: null,
    pendingItems: 0,
    failedItems: 0,
    conflictItems: 0,
    queueHealth: 'good',
    estimatedSyncTime: 0,
  });

  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [syncProgress, setSyncProgress] = useState<{
    progress: number;
    message: string;
  }>({
    progress: 0,
    message: '',
  });
  const [showDetails, setShowDetails] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  // Initialize sync manager
  useEffect(() => {
    const initializeSyncManager = async () => {
      try {
        await comprehensiveSyncManager.initialize();

        // Set up event listeners
        comprehensiveSyncManager.onStatusChange(setSyncStatus);
        comprehensiveSyncManager.onConflictDetected((alert) => {
          setConflicts((prev) => [...prev.slice(-9), alert]); // Keep last 10
        });
        comprehensiveSyncManager.onProgress((progress, message) => {
          setSyncProgress({ progress, message });
        });

        // Configure for wedding context
        comprehensiveSyncManager.updateConfig({
          weddingId,
          weddingDate,
          userRole,
          weddingDayMode: isWeddingDay,
          isActiveCoordinator: userRole === 'coordinator' && isWeddingDay,
        });

        // Get initial status
        setSyncStatus(comprehensiveSyncManager.getSyncStatus());
        setConflicts(comprehensiveSyncManager.getPendingConflicts());
      } catch (error) {
        console.error('Failed to initialize sync manager:', error);
      }
    };

    initializeSyncManager();
  }, [weddingId, weddingDate, userRole, isWeddingDay]);

  // Handle manual sync
  const handleManualSync = useCallback(async () => {
    if (!syncStatus.isOnline) return;

    try {
      await comprehensiveSyncManager.performSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }, [syncStatus.isOnline]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(
    async (conflictId: string, resolution: 'local' | 'server') => {
      try {
        const success = await comprehensiveSyncManager.resolveConflict({
          conflictId,
          entityType: 'unknown', // Would be passed from conflict data
          entityId: 'unknown',
          userResolution: resolution,
        });

        if (success) {
          setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
        }
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
      }
    },
    [],
  );

  // Load metrics
  const loadMetrics = useCallback(() => {
    if (showMetrics && !metrics) {
      const stats = comprehensiveSyncManager.getStatistics();
      setMetrics(stats);
    }
  }, [showMetrics, metrics]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Get status display configuration
  const getStatusDisplay = () => {
    if (!syncStatus.isOnline) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: WifiOff,
        label: 'Offline',
        description: `${syncStatus.pendingItems} changes queued for sync`,
        severity: 'error' as const,
      };
    }

    if (syncStatus.isProcessing) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: RefreshCw,
        label: 'Syncing',
        description:
          syncProgress.message ||
          `${syncProgress.progress.toFixed(0)}% complete`,
        severity: 'info' as const,
      };
    }

    if (conflicts.length > 0) {
      const criticalConflicts = conflicts.filter(
        (c) => c.severity === 'critical',
      ).length;
      return {
        color: criticalConflicts > 0 ? 'text-red-600' : 'text-yellow-600',
        bgColor: criticalConflicts > 0 ? 'bg-red-50' : 'bg-yellow-50',
        borderColor:
          criticalConflicts > 0 ? 'border-red-200' : 'border-yellow-200',
        icon: AlertTriangle,
        label: criticalConflicts > 0 ? 'Critical Conflicts' : 'Conflicts',
        description: `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} need attention`,
        severity: (criticalConflicts > 0 ? 'error' : 'warning') as const,
      };
    }

    if (syncStatus.failedItems > 0) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: AlertCircle,
        label: 'Sync Issues',
        description: `${syncStatus.failedItems} failed sync${syncStatus.failedItems !== 1 ? 's' : ''}`,
        severity: 'warning' as const,
      };
    }

    if (syncStatus.pendingItems > 0) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Clock,
        label: 'Pending',
        description: `${syncStatus.pendingItems} change${syncStatus.pendingItems !== 1 ? 's' : ''} queued`,
        severity: 'info' as const,
      };
    }

    // Queue health indicator
    const healthColors = {
      excellent: {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
      },
      good: {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
      },
      warning: {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      },
      critical: {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
      },
    };

    const healthConfig = healthColors[syncStatus.queueHealth];

    return {
      color: healthConfig.color,
      bgColor: healthConfig.bg,
      borderColor: healthConfig.border,
      icon: CheckCircle2,
      label: 'Synced',
      description: syncStatus.lastSyncTime
        ? `Last sync ${formatDistanceToNow(new Date(syncStatus.lastSyncTime), { addSuffix: true })}`
        : 'All changes synchronized',
      severity: 'success' as const,
    };
  };

  const statusConfig = getStatusDisplay();
  const StatusIcon = statusConfig.icon;

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
            statusConfig.bgColor,
            statusConfig.color,
          )}
        >
          <StatusIcon
            className={cn('w-3 h-3', syncStatus.isProcessing && 'animate-spin')}
          />
          <span>{statusConfig.label}</span>
        </div>

        {(syncStatus.pendingItems > 0 || syncStatus.failedItems > 0) && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {syncStatus.pendingItems > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{syncStatus.pendingItems}</span>
              </div>
            )}
            {syncStatus.failedItems > 0 && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3 h-3" />
                <span>{syncStatus.failedItems}</span>
              </div>
            )}
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-600">
            <AlertTriangle className="w-3 h-3" />
            <span>{conflicts.length}</span>
          </div>
        )}
      </div>
    );
  }

  // Dashboard variant
  if (variant === 'dashboard') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
          className,
        )}
      >
        {/* Main Status Card */}
        <div
          className={cn(
            'p-4 rounded-lg border-2 transition-all',
            statusConfig.borderColor,
            statusConfig.bgColor,
          )}
        >
          <div className="flex items-center gap-3">
            <StatusIcon
              className={cn(
                'w-6 h-6',
                statusConfig.color,
                syncStatus.isProcessing && 'animate-spin',
              )}
            />
            <div>
              <div className={cn('font-semibold', statusConfig.color)}>
                {statusConfig.label}
              </div>
              <div className="text-sm text-gray-600">
                {statusConfig.description}
              </div>
            </div>
          </div>
        </div>

        {/* Queue Stats */}
        <div className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-500" />
            <div>
              <div className="font-semibold">Queue Status</div>
              <div className="text-sm text-gray-600">
                {syncStatus.pendingItems} pending, {syncStatus.failedItems}{' '}
                failed
              </div>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-3">
            <Gauge className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-semibold">Performance</div>
              <div className="text-sm text-gray-600">
                {syncStatus.queueHealth} health
                {syncStatus.estimatedSyncTime > 0 &&
                  ` • ${syncStatus.estimatedSyncTime}s est.`}
              </div>
            </div>
          </div>
        </div>

        {/* Wedding Day Status */}
        {isWeddingDay && (
          <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-semibold text-purple-700">
                  Wedding Day Mode
                </div>
                <div className="text-sm text-purple-600">
                  Enhanced monitoring active
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant (default)
  return (
    <div
      className={cn(
        'bg-white border rounded-lg shadow-sm',
        statusConfig.borderColor,
        className,
      )}
    >
      {/* Main Status Bar */}
      <div
        className={cn(
          'p-4 cursor-pointer transition-all hover:opacity-90',
          statusConfig.bgColor,
        )}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon
              className={cn(
                'w-5 h-5',
                statusConfig.color,
                syncStatus.isProcessing && 'animate-spin',
              )}
            />
            <div>
              <div className={cn('font-semibold', statusConfig.color)}>
                {statusConfig.label}
                {isWeddingDay && (
                  <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                    Wedding Day
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-700">
                {statusConfig.description}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress bar for active sync */}
            {syncStatus.isProcessing && syncProgress.progress > 0 && (
              <div className="w-32">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{syncProgress.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, syncProgress.progress))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Queue stats */}
            <div className="flex items-center gap-2 text-sm">
              {syncStatus.pendingItems > 0 && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>{syncStatus.pendingItems}</span>
                </div>
              )}
              {syncStatus.failedItems > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{syncStatus.failedItems}</span>
                </div>
              )}
              {conflicts.length > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{conflicts.length}</span>
                </div>
              )}
            </div>

            {/* Manual sync button */}
            {syncStatus.isOnline && !syncStatus.isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleManualSync();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Manual sync"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="border-t bg-gray-50">
          <div className="p-4 space-y-4">
            {/* System Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Connection:</span>
                <div className="flex items-center gap-1">
                  {syncStatus.isOnline ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-medium">Offline</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Queue Health:</span>
                <span
                  className={cn(
                    'font-medium capitalize',
                    syncStatus.queueHealth === 'excellent'
                      ? 'text-green-600'
                      : syncStatus.queueHealth === 'good'
                        ? 'text-blue-600'
                        : syncStatus.queueHealth === 'warning'
                          ? 'text-yellow-600'
                          : 'text-red-600',
                  )}
                >
                  {syncStatus.queueHealth}
                </span>
              </div>

              {syncStatus.estimatedSyncTime > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Est. Sync Time:</span>
                  <span className="text-gray-900 font-medium">
                    {syncStatus.estimatedSyncTime}s
                  </span>
                </div>
              )}
            </div>

            {/* Conflict Alerts */}
            {conflicts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Active Conflicts:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {conflicts.slice(0, 5).map((conflict) => (
                    <div
                      key={conflict.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded text-xs',
                        conflict.severity === 'critical'
                          ? 'bg-red-100 border border-red-200'
                          : conflict.severity === 'high'
                            ? 'bg-orange-100 border border-orange-200'
                            : 'bg-yellow-100 border border-yellow-200',
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <AlertTriangle
                          className={cn(
                            'w-3 h-3',
                            conflict.severity === 'critical'
                              ? 'text-red-600'
                              : conflict.severity === 'high'
                                ? 'text-orange-600'
                                : 'text-yellow-600',
                          )}
                        />
                        <span className="text-gray-700">
                          {conflict.message}
                        </span>
                        {conflict.isWeddingDayRelated && (
                          <span className="px-1 py-0.5 bg-purple-200 text-purple-700 rounded text-xs">
                            Wedding Day
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() =>
                            handleConflictResolve(conflict.id, 'local')
                          }
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Keep Local
                        </button>
                        <button
                          onClick={() =>
                            handleConflictResolve(conflict.id, 'server')
                          }
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Use Server
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Toggle */}
            {showMetrics && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Show Advanced Metrics
                </span>
                <button
                  onClick={() => setShowMetrics(!showMetrics)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showMetrics ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {/* Advanced Metrics */}
            {showMetrics && metrics && (
              <div className="bg-white rounded border p-3 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Advanced Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <div className="font-medium">
                      {(metrics.metrics.successRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Process Time:</span>
                    <div className="font-medium">
                      {metrics.metrics.averageProcessingTime.toFixed(0)}ms
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Network Quality:</span>
                    <div className="font-medium capitalize">
                      {metrics.networkQuality?.quality || 'Good'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Conflict Rate:</span>
                    <div className="font-medium">
                      {(metrics.metrics.conflictRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              {syncStatus.isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={syncStatus.isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4',
                      syncStatus.isProcessing && 'animate-spin',
                    )}
                  />
                  {syncStatus.isProcessing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}

              <button
                onClick={() => setShowDetails(false)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
