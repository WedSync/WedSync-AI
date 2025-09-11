'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  syncManager,
  SyncStatus,
  SyncManagerUtils,
} from '@/lib/offline/sync-manager';
import SyncStatusIndicator from './SyncStatusIndicator';
import { useSyncToasts } from './SyncToastProvider';
import {
  Activity,
  BarChart3,
  RefreshCw,
  Settings,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Calendar,
  Users,
  FileText,
  Shield,
  Signal,
  Wifi,
  WifiOff,
  Play,
  Pause,
  SkipForward,
  Trash2,
  Eye,
} from 'lucide-react';

interface SyncDashboardProps {
  className?: string;
  refreshInterval?: number;
  showAdvancedControls?: boolean;
  showPerformanceMetrics?: boolean;
  onSyncComplete?: (syncedCount: number) => void;
}

interface QueueItem {
  id: string;
  type: string;
  priority: number;
  status: string;
  timestamp: string;
  attempts: number;
  weddingContext?: {
    weddingId: string;
    weddingDate: string;
    isWeddingDay: boolean;
  };
  size?: number;
}

const SyncDashboard: React.FC<SyncDashboardProps> = ({
  className = '',
  refreshInterval = 3000,
  showAdvancedControls = true,
  showPerformanceMetrics = true,
  onSyncComplete,
}) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<
    'overview' | 'queue' | 'performance'
  >('overview');
  const [sortBy, setSortBy] = useState<'priority' | 'timestamp' | 'attempts'>(
    'priority',
  );
  const [filterBy, setFilterBy] = useState<
    'all' | 'wedding' | 'emergency' | 'failed'
  >('all');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const { addToast } = useSyncToasts();

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [currentStatus, healthScoreValue, syncStats, estimatedSyncTime] =
        await Promise.all([
          syncManager.getStatus(),
          SyncManagerUtils.getQueueHealthScore(),
          syncManager.getProcessingStats(),
          SyncManagerUtils.estimateSyncTime(),
        ]);

      setStatus(currentStatus);
      setHealthScore(healthScoreValue);
      setProcessingStats(syncStats);
      setEstimatedTime(estimatedSyncTime);

      // Load queue items (mock - in real implementation would come from IndexedDB)
      const mockQueueItems: QueueItem[] =
        currentStatus.pendingItems?.map((item, index) => ({
          id: item.id,
          type: item.type,
          priority: item.priority,
          status: 'pending',
          timestamp: item.timestamp,
          attempts: 0,
          weddingContext:
            index % 3 === 0
              ? {
                  weddingId: 'wedding-123',
                  weddingDate: '2024-08-15',
                  isWeddingDay: index % 2 === 0,
                }
              : undefined,
          size: Math.floor(Math.random() * 50000) + 1000,
        })) || [];

      setQueueItems(mockQueueItems);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      addToast({
        type: 'error',
        title: 'Dashboard Error',
        message: 'Failed to load sync dashboard data',
        priority: 'medium',
      });
    }
  }, [addToast]);

  // Auto-refresh effect
  useEffect(() => {
    loadDashboardData();

    let refreshTimer: NodeJS.Timeout | null = null;

    if (isAutoRefresh) {
      refreshTimer = setInterval(loadDashboardData, refreshInterval);
    }

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [loadDashboardData, isAutoRefresh, refreshInterval]);

  // Sync operations
  const handleForceSync = async (expedite = false) => {
    try {
      await syncManager.forceSync({ expedite });

      addToast({
        type: 'info',
        title: 'Sync Started',
        message: expedite ? 'Priority sync initiated' : 'Manual sync initiated',
        priority: 'medium',
      });

      // Refresh data after a short delay
      setTimeout(loadDashboardData, 1000);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to start sync operation',
        priority: 'high',
      });
    }
  };

  const handleClearFailed = async () => {
    try {
      await syncManager.clearFailedItems();
      addToast({
        type: 'success',
        title: 'Failed Items Cleared',
        message: 'All failed sync items have been removed',
        priority: 'medium',
      });
      loadDashboardData();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Clear Failed',
        message: 'Failed to clear failed items',
        priority: 'medium',
      });
    }
  };

  const handleExpediteSelected = async () => {
    if (selectedItems.size === 0) return;

    try {
      await syncManager.expediteItems(Array.from(selectedItems));
      addToast({
        type: 'success',
        title: 'Items Expedited',
        message: `${selectedItems.size} items moved to high priority`,
        priority: 'medium',
      });
      setSelectedItems(new Set());
      loadDashboardData();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Expedite Failed',
        message: 'Failed to expedite selected items',
        priority: 'medium',
      });
    }
  };

  const handleClearSelected = async () => {
    if (selectedItems.size === 0) return;

    try {
      await syncManager.clearQueueItems(Array.from(selectedItems));
      addToast({
        type: 'success',
        title: 'Items Removed',
        message: `${selectedItems.size} items removed from queue`,
        priority: 'medium',
      });
      setSelectedItems(new Set());
      loadDashboardData();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Remove Failed',
        message: 'Failed to remove selected items',
        priority: 'medium',
      });
    }
  };

  // Filter and sort queue items
  const getFilteredAndSortedItems = () => {
    let filtered = queueItems;

    // Apply filters
    switch (filterBy) {
      case 'wedding':
        filtered = filtered.filter((item) => item.weddingContext?.isWeddingDay);
        break;
      case 'emergency':
        filtered = filtered.filter((item) => item.priority >= 9);
        break;
      case 'failed':
        filtered = filtered.filter((item) => item.status === 'failed');
        break;
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'timestamp':
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        case 'attempts':
          return b.attempts - a.attempts;
        default:
          return 0;
      }
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 9) return 'text-red-600 bg-red-100';
    if (priority >= 7) return 'text-orange-600 bg-orange-100';
    if (priority >= 5) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 9) return 'EMERGENCY';
    if (priority >= 7) return 'HIGH';
    if (priority >= 5) return 'MEDIUM';
    return 'LOW';
  };

  // Render overview section
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Items</p>
              <p className="text-2xl font-bold text-orange-600">
                {status?.pendingCount || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Emergency Items
              </p>
              <p className="text-2xl font-bold text-red-600">
                {status?.priorityBreakdown?.emergency || 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Wedding Day Items
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {status?.weddingDayItems || 0}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queue Health</p>
              <p className="text-2xl font-bold text-green-600">
                {healthScore}/100
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <SyncStatusIndicator
        variant="dashboard"
        showProgress={true}
        showPriorityBreakdown={true}
        showHealthScore={true}
      />

      {/* Quick Actions */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleForceSync(false)}
            disabled={status?.isSyncing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Now</span>
          </button>

          <button
            onClick={() => handleForceSync(true)}
            disabled={status?.isSyncing}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>Priority Sync</span>
          </button>

          {(status?.failedCount || 0) > 0 && (
            <button
              onClick={handleClearFailed}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Failed</span>
            </button>
          )}

          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              isAutoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isAutoRefresh ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{isAutoRefresh ? 'Pause' : 'Resume'} Auto-refresh</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render queue section
  const renderQueue = () => {
    const filteredItems = getFilteredAndSortedItems();

    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Filter:
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="all">All Items</option>
                  <option value="wedding">Wedding Day</option>
                  <option value="emergency">Emergency</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Sort:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="priority">Priority</option>
                  <option value="timestamp">Timestamp</option>
                  <option value="attempts">Attempts</option>
                </select>
              </div>
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedItems.size} selected
                </span>
                <button
                  onClick={handleExpediteSelected}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                >
                  Expedite
                </button>
                <button
                  onClick={handleClearSelected}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Queue Items */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.size === filteredItems.length &&
                        filteredItems.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(
                            new Set(filteredItems.map((item) => item.id)),
                          );
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedItems);
                          if (e.target.checked) {
                            newSelected.add(item.id);
                          } else {
                            newSelected.delete(item.id);
                          }
                          setSelectedItems(newSelected);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}
                      >
                        {getPriorityLabel(item.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {item.status}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {item.size ? formatFileSize(item.size) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.weddingContext?.isWeddingDay && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Calendar className="w-3 h-3 mr-1" />
                          Wedding Day
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No items match the current filter
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sync Dashboard</h2>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {status?.isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600 font-medium">
                  Online
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-600 font-medium">
                  Offline
                </span>
              </>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['overview', 'queue', 'performance'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'queue' && renderQueue()}
      {viewMode === 'performance' && showPerformanceMetrics && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Metrics
          </h3>
          {processingStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {processingStats.totalProcessed}
                </p>
                <p className="text-sm text-gray-600">Total Processed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {processingStats.successCount}
                </p>
                <p className="text-sm text-gray-600">Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {processingStats.failureCount}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(processingStats.averageProcessingTime)}ms
                </p>
                <p className="text-sm text-gray-600">Avg Time</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncDashboard;
