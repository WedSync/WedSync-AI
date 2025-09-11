'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  syncManager,
  SyncStatus,
  SyncManagerUtils,
} from '@/lib/offline/sync-manager';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  Download,
  Signal,
  Loader2,
  TrendingUp,
  AlertCircle,
  Zap,
  Calendar,
  Users,
  FileText,
  Shield,
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  variant?: 'minimal' | 'compact' | 'detailed' | 'dashboard';
  position?: 'fixed' | 'relative' | 'sticky';
  className?: string;
  showProgress?: boolean;
  showPriorityBreakdown?: boolean;
  showHealthScore?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatusChange?: (status: SyncStatus) => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  variant = 'compact',
  position = 'relative',
  className = '',
  showProgress = true,
  showPriorityBreakdown = false,
  showHealthScore = false,
  autoRefresh = true,
  refreshInterval = 5000,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Load initial status and start monitoring
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout | null = null;

    const loadStatus = async () => {
      try {
        const currentStatus = await syncManager.getStatus();
        setStatus(currentStatus);
        setLastUpdateTime(new Date());

        if (showHealthScore) {
          const score = await SyncManagerUtils.getQueueHealthScore();
          setHealthScore(score);
        }

        if (showProgress) {
          const estimatedSyncTime = await SyncManagerUtils.estimateSyncTime();
          setEstimatedTime(estimatedSyncTime);
        }

        if (onStatusChange) {
          onStatusChange(currentStatus);
        }
      } catch (error) {
        console.error('Error loading sync status:', error);
      }
    };

    // Initial load
    loadStatus();

    // Set up auto-refresh
    if (autoRefresh) {
      refreshTimer = setInterval(loadStatus, refreshInterval);
    }

    // Listen for status changes
    const handleStatusChange = (newStatus: SyncStatus) => {
      setStatus(newStatus);
      setLastUpdateTime(new Date());

      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    };

    syncManager.onStatusChange(handleStatusChange);

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      syncManager.removeStatusListener(handleStatusChange);
    };
  }, [
    autoRefresh,
    refreshInterval,
    showHealthScore,
    showProgress,
    onStatusChange,
  ]);

  const getStatusIcon = useCallback(() => {
    if (!status)
      return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

    if (status.isSyncing) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }

    if (!status.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    if (status.priorityBreakdown.emergency > 0) {
      return <AlertTriangle className="w-4 h-4 animate-pulse text-red-600" />;
    }

    if (status.failedCount > 0) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }

    if (status.pendingCount > 0) {
      return <Upload className="w-4 h-4 text-orange-500" />;
    }

    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }, [status]);

  const getStatusText = useCallback(() => {
    if (!status) return 'Loading...';

    if (status.isSyncing) {
      if (status.batchProgress) {
        const percentage = Math.round(
          (status.batchProgress.current / status.batchProgress.total) * 100,
        );
        return `Syncing ${status.batchProgress.current}/${status.batchProgress.total} (${percentage}%)`;
      }
      return 'Syncing...';
    }

    if (!status.isOnline) {
      return `Offline - ${status.pendingCount} items queued`;
    }

    if (status.priorityBreakdown.emergency > 0) {
      return `${status.priorityBreakdown.emergency} emergency items pending`;
    }

    if (status.failedCount > 0) {
      return `${status.failedCount} failed, ${status.pendingCount} pending`;
    }

    if (status.pendingCount > 0) {
      if (status.weddingDayItems > 0) {
        return `${status.pendingCount} pending (${status.weddingDayItems} wedding day)`;
      }
      return `${status.pendingCount} items pending`;
    }

    return 'All synced';
  }, [status]);

  const getStatusColor = useCallback(() => {
    if (!status) return 'text-gray-500';

    if (status.priorityBreakdown.emergency > 0) return 'text-red-600';
    if (status.isSyncing) return 'text-blue-600';
    if (!status.isOnline) return 'text-red-500';
    if (status.failedCount > 0) return 'text-yellow-600';
    if (status.pendingCount > 0) return 'text-orange-600';
    return 'text-green-600';
  }, [status]);

  const renderProgressBar = () => {
    if (!showProgress || !status?.isSyncing || !status.batchProgress)
      return null;

    const percentage = Math.round(
      (status.batchProgress.current / status.batchProgress.total) * 100,
    );

    return (
      <div className="w-full mt-2">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Sync Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {estimatedTime > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            Est. {Math.ceil(estimatedTime / 1000)}s remaining
          </div>
        )}
      </div>
    );
  };

  const renderPriorityBreakdown = () => {
    if (!showPriorityBreakdown || !status) return null;

    const { emergency, high, medium, low } = status.priorityBreakdown;
    const total = emergency + high + medium + low;

    if (total === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Queue Breakdown</span>
          <span>{total} total</span>
        </div>

        {emergency > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-red-700">Emergency</span>
            </div>
            <span className="font-medium text-red-700">{emergency}</span>
          </div>
        )}

        {high > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-orange-500" />
              <span className="text-orange-700">High Priority</span>
            </div>
            <span className="font-medium text-orange-700">{high}</span>
          </div>
        )}

        {medium > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-blue-500" />
              <span className="text-blue-700">Medium</span>
            </div>
            <span className="font-medium text-blue-700">{medium}</span>
          </div>
        )}

        {low > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <FileText className="w-3 h-3 text-gray-500" />
              <span className="text-gray-700">Low Priority</span>
            </div>
            <span className="font-medium text-gray-700">{low}</span>
          </div>
        )}

        {status.weddingDayItems > 0 && (
          <div className="flex items-center justify-between text-xs border-t pt-2 mt-2">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-purple-500" />
              <span className="text-purple-700 font-medium">Wedding Day</span>
            </div>
            <span className="font-bold text-purple-700">
              {status.weddingDayItems}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderHealthScore = () => {
    if (!showHealthScore) return null;

    const getHealthColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getHealthIcon = (score: number) => {
      if (score >= 80) return <Shield className="w-4 h-4 text-green-500" />;
      if (score >= 60)
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    };

    return (
      <div className="mt-3 p-2 bg-gray-50 rounded">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getHealthIcon(healthScore)}
            <span className="text-xs font-medium text-gray-700">
              Queue Health
            </span>
          </div>
          <span className={`text-xs font-bold ${getHealthColor(healthScore)}`}>
            {healthScore}/100
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              healthScore >= 80
                ? 'bg-green-500'
                : healthScore >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    if (!status || variant === 'minimal') return null;

    return (
      <div className="flex space-x-2 mt-3">
        {status.isOnline && !status.isSyncing && status.pendingCount > 0 && (
          <button
            onClick={() => syncManager.forceSync({ expedite: true })}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            Sync Now
          </button>
        )}

        {status.failedCount > 0 && (
          <button
            onClick={() => syncManager.clearFailedItems()}
            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs px-3 py-1.5 rounded transition-colors"
          >
            Clear Failed
          </button>
        )}

        {variant === 'detailed' || variant === 'dashboard' ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded transition-colors"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        ) : null}
      </div>
    );
  };

  const renderExpandedDetails = () => {
    if (!isExpanded || !status) return null;

    return (
      <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
        {/* Last sync time */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Last Updated:</span>
          <span className="text-gray-800">
            {lastUpdateTime.toLocaleTimeString()}
          </span>
        </div>

        {/* Pending items preview */}
        {status.pendingItems && status.pendingItems.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-700">
              Recent Items:
            </span>
            {status.pendingItems.slice(0, 3).map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.priority >= 9
                        ? 'bg-red-500'
                        : item.priority >= 7
                          ? 'bg-orange-500'
                          : item.priority >= 5
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-gray-700">{item.type}</span>
                </div>
                <span className="text-gray-500">Priority {item.priority}</span>
              </div>
            ))}
            {status.pendingItems.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{status.pendingItems.length - 3} more items
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render variants
  const renderMinimalVariant = () => (
    <div
      className={`inline-flex items-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {getStatusIcon()}
    </div>
  );

  const renderCompactVariant = () => (
    <div
      className={`
      inline-flex items-center gap-2 px-3 py-1.5 
      bg-white border border-gray-200 rounded-lg shadow-sm
      ${position === 'fixed' ? 'fixed top-4 right-4 z-50' : ''}
      ${status?.priorityBreakdown?.emergency > 0 ? 'border-red-200 bg-red-50' : ''}
      ${className}
    `}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${getStatusText()}`}
    >
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {renderProgressBar()}
    </div>
  );

  const renderDetailedVariant = () => (
    <div
      className={`
      bg-white border border-gray-200 rounded-xl shadow-sm p-4
      ${position === 'fixed' ? 'fixed top-4 right-4 z-50 min-w-[320px]' : ''}
      ${status?.priorityBreakdown?.emergency > 0 ? 'border-red-200 bg-red-50' : ''}
      ${className}
    `}
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {status?.isOnline && (
          <div className="flex items-center text-xs text-gray-500">
            <Signal className="w-3 h-3 mr-1" />
            Online
          </div>
        )}
      </div>

      {renderProgressBar()}
      {renderPriorityBreakdown()}
      {renderHealthScore()}
      {renderActionButtons()}
      {renderExpandedDetails()}
    </div>
  );

  const renderDashboardVariant = () => (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
        {getStatusIcon()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {status?.pendingCount || 0}
          </div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-green-600">
            {status?.totalCount
              ? status.totalCount - status.pendingCount - status.failedCount
              : 0}
          </div>
          <div className="text-xs text-gray-600">Synced</div>
        </div>
      </div>

      {renderProgressBar()}
      {renderPriorityBreakdown()}
      {renderHealthScore()}
      {renderActionButtons()}
    </div>
  );

  // Return appropriate variant
  switch (variant) {
    case 'minimal':
      return renderMinimalVariant();
    case 'detailed':
      return renderDetailedVariant();
    case 'dashboard':
      return renderDashboardVariant();
    default:
      return renderCompactVariant();
  }
};

export default SyncStatusIndicator;
