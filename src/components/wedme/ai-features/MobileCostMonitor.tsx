'use client';

/**
 * WS-239: Mobile Cost Monitor
 * Real-time cost tracking and budget management for mobile AI usage
 * Wedding industry optimized with seasonal projections
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Heart,
  Zap,
  Settings,
  RefreshCw,
  Bell,
  BellOff,
  Pause,
  Play,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff,
  Timer,
} from 'lucide-react';

import type {
  MobileCostMonitorProps,
  PlatformType,
  CostMonitorView,
  BudgetAlert,
  CostAlertLevel,
  UsageMetrics,
  CostProjection,
  FeatureUsage,
  QueuedCostItem,
  AIFeatureType,
} from '@/types/wedme-ai';

import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useOfflineSync } from '@/hooks/useOfflineSync';

// Feature colors for usage visualization
const FEATURE_COLORS: Record<AIFeatureType, string> = {
  'photo-tagging': '#8B5CF6', // Purple
  'description-generation': '#06B6D4', // Cyan
  'menu-ai': '#F59E0B', // Amber
  'timeline-optimization': '#EF4444', // Red
  'chat-bot': '#10B981', // Emerald
};

// Alert level styling
const ALERT_STYLES = {
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    icon: 'text-orange-600',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
} as const;

const MobileCostMonitor: React.FC<MobileCostMonitorProps> = ({
  mode,
  refreshInterval = 30000,
  showProjections = true,
  enableAlerts = true,
  onBudgetExceeded,
  offlineData = [],
  compactView = false,
  className = '',
}) => {
  // State management
  const [costData, setCostData] = useState<CostMonitorView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(!compactView);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'today' | 'week' | 'month'
  >('today');
  const [alertsEnabled, setAlertsEnabled] = useState(enableAlerts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Mobile hooks
  const { triggerHaptic, isSupported: hapticSupported } = useHapticFeedback();
  const { isOnline, queueAction, isPending, queueSize } = useOfflineSync();

  // Calculate wedding season multiplier (peak season = higher usage)
  const weddingSeasonMultiplier = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();

    // Peak wedding season: May-October
    if (month >= 4 && month <= 9) {
      return 1.5; // 50% increase during peak season
    }
    // Holiday season: November-December
    if (month >= 10) {
      return 1.2; // 20% increase during holidays
    }
    // Off season: January-April
    return 0.8; // 20% decrease during off season
  }, []);

  // Fetch cost data
  const fetchCostData = useCallback(
    async (showLoader = false) => {
      if (mode === 'platform') {
        // Platform AI costs are included in subscription
        setCostData({
          currentSpend: 0,
          budget: 0,
          alerts: [],
          projections: {
            daily: 0,
            weekly: 0,
            monthly: 0,
            seasonalMultiplier: weddingSeasonMultiplier,
            confidence: 1,
            scenarios: [],
          },
          offlineQueue: offlineData,
        });
        setIsLoading(false);
        return;
      }

      if (showLoader) setIsRefreshing(true);
      setError(null);

      try {
        if (!isOnline) {
          // Use offline data if available
          const cachedData = localStorage.getItem('ai_cost_data');
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setCostData({
              ...parsed,
              offlineQueue: offlineData,
            });
          }
          return;
        }

        const response = await fetch('/api/ai-features/costs/realtime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            timeframe: selectedTimeframe,
            includeProjections: showProjections,
            seasonalMultiplier: weddingSeasonMultiplier,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cost data');
        }

        const data: CostMonitorView = await response.json();

        // Add offline queue and seasonal adjustments
        const enhancedData = {
          ...data,
          offlineQueue: offlineData,
          projections: {
            ...data.projections,
            seasonalMultiplier: weddingSeasonMultiplier,
            daily: data.projections.daily * weddingSeasonMultiplier,
            weekly: data.projections.weekly * weddingSeasonMultiplier,
            monthly: data.projections.monthly * weddingSeasonMultiplier,
          },
        };

        setCostData(enhancedData);
        setLastUpdate(new Date());

        // Cache for offline use
        localStorage.setItem('ai_cost_data', JSON.stringify(enhancedData));

        // Check for budget alerts
        if (alertsEnabled && enhancedData.alerts.length > 0) {
          const criticalAlerts = enhancedData.alerts.filter(
            (alert) => alert.level === 'critical',
          );
          if (criticalAlerts.length > 0) {
            criticalAlerts.forEach((alert) => onBudgetExceeded?.(alert));
            if (hapticSupported) {
              triggerHaptic('notification', 1.0);
            }
          }
        }
      } catch (error) {
        console.error('Cost data fetch failed:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to load cost data',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      mode,
      selectedTimeframe,
      showProjections,
      weddingSeasonMultiplier,
      offlineData,
      isOnline,
      alertsEnabled,
      onBudgetExceeded,
      hapticSupported,
      triggerHaptic,
    ],
  );

  // Auto-refresh cost data
  useEffect(() => {
    fetchCostData(true);

    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchCostData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchCostData, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    if (hapticSupported) {
      triggerHaptic('selection');
    }

    const refreshAction = () => fetchCostData(true);

    if (!isOnline) {
      await queueAction('refresh-cost-data', refreshAction);
    } else {
      await refreshAction();
    }
  }, [hapticSupported, triggerHaptic, isOnline, queueAction, fetchCostData]);

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!costData || costData.budget === 0) return 0;
    return Math.min((costData.currentSpend / costData.budget) * 100, 100);
  }, [costData]);

  // Get usage status color
  const getUsageStatusColor = useCallback((percentage: number) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'orange';
    if (percentage >= 50) return 'yellow';
    return 'green';
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: amount < 1 ? 3 : 2,
    }).format(amount);
  }, []);

  // Render budget alerts
  const renderBudgetAlerts = () => {
    if (!costData?.alerts.length || !alertsEnabled) return null;

    return (
      <div className="space-y-2 mb-4">
        <AnimatePresence>
          {costData.alerts.map((alert, index) => {
            const style = ALERT_STYLES[alert.level];

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`${style.bg} ${style.border} border rounded-lg p-3`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 ${style.icon} mt-0.5`} />
                    <div>
                      <div className={`font-medium text-sm ${style.text}`}>
                        {alert.message}
                      </div>
                      {alert.actionRequired && (
                        <div
                          className={`text-xs ${style.text} opacity-80 mt-1`}
                        >
                          {alert.actionRequired}
                        </div>
                      )}
                    </div>
                  </div>
                  {alert.dismissable && (
                    <button
                      onClick={() => {
                        if (hapticSupported) triggerHaptic('selection');
                        // Handle alert dismissal
                      }}
                      className={`${style.icon} hover:opacity-70 transition-opacity`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  // Render usage chart
  const renderUsageChart = () => {
    if (!costData) return null;

    const statusColor = getUsageStatusColor(usagePercentage);

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Current Usage
          </h3>
          <div className="flex items-center gap-2">
            {!isOnline && <WifiOff className="w-4 h-4 text-amber-500" />}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isPending}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Usage progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {formatCurrency(costData.currentSpend)} of{' '}
              {formatCurrency(costData.budget)}
            </span>
            <span className={`text-sm font-medium text-${statusColor}-600`}>
              {usagePercentage.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
              className={`bg-gradient-to-r h-3 rounded-full transition-all duration-500 ${
                statusColor === 'green'
                  ? 'from-green-400 to-green-500'
                  : statusColor === 'yellow'
                    ? 'from-yellow-400 to-yellow-500'
                    : statusColor === 'orange'
                      ? 'from-orange-400 to-orange-500'
                      : 'from-red-400 to-red-500'
              }`}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Started: {selectedTimeframe}</span>
            <span>
              Remaining:{' '}
              {formatCurrency(
                Math.max(0, costData.budget - costData.currentSpend),
              )}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">
              {costData.projections.daily.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Daily Avg</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(costData.projections.monthly)}
            </div>
            <div className="text-xs text-gray-600">Monthly Est.</div>
          </div>
        </div>
      </div>
    );
  };

  // Render feature usage breakdown
  const renderFeatureBreakdown = () => {
    if (!costData || !showDetails) return null;

    // Mock feature usage data - in real implementation, this would come from the API
    const mockFeatureUsage: FeatureUsage[] = [
      { feature: 'photo-tagging', requests: 150, cost: 12.5, percentage: 45 },
      {
        feature: 'description-generation',
        requests: 80,
        cost: 8.2,
        percentage: 30,
      },
      { feature: 'menu-ai', requests: 45, cost: 4.15, percentage: 15 },
      {
        feature: 'timeline-optimization',
        requests: 25,
        cost: 2.75,
        percentage: 10,
      },
    ];

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Feature Breakdown
          </h3>
          <button
            onClick={() => {
              if (hapticSupported) triggerHaptic('selection');
              setShowDetails(!showDetails);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        <div className="space-y-3">
          {mockFeatureUsage.map((usage, index) => (
            <motion.div
              key={usage.feature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: FEATURE_COLORS[usage.feature] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {usage.feature.replace('-', ' ')}
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {formatCurrency(usage.cost)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${usage.percentage}%`,
                        backgroundColor: FEATURE_COLORS[usage.feature],
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {usage.requests} requests
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // Render projections
  const renderProjections = () => {
    if (!costData?.projections || !showProjections) return null;

    const { projections } = costData;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Cost Projections
          </h3>
          {projections.seasonalMultiplier !== 1 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Heart className="w-3 h-3" />
              <span>Wedding Season</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(projections.daily)}
            </div>
            <div className="text-xs text-gray-600">Daily</div>
            <div className="flex items-center justify-center mt-1">
              {projections.daily > costData.currentSpend / 7 ? (
                <ArrowUp className="w-3 h-3 text-red-500" />
              ) : (
                <ArrowDown className="w-3 h-3 text-green-500" />
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(projections.weekly)}
            </div>
            <div className="text-xs text-gray-600">Weekly</div>
            <div className="flex items-center justify-center mt-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(projections.monthly)}
            </div>
            <div className="text-xs text-gray-600">Monthly</div>
            <div className="flex items-center justify-center mt-1">
              <BarChart3 className="w-3 h-3 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">
              Wedding Season Impact
            </span>
          </div>
          <div className="text-xs text-purple-700">
            {projections.seasonalMultiplier > 1
              ? `Peak season: ${((projections.seasonalMultiplier - 1) * 100).toFixed(0)}% higher usage expected`
              : projections.seasonalMultiplier < 1
                ? `Off season: ${((1 - projections.seasonalMultiplier) * 100).toFixed(0)}% lower usage expected`
                : 'Normal season usage patterns'}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Confidence: {(projections.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    );
  };

  // Render offline queue
  const renderOfflineQueue = () => {
    if (!offlineData.length) return null;

    const totalQueuedCost = offlineData.reduce(
      (sum, item) => sum + item.estimatedCost,
      0,
    );

    return (
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Offline Queue
          </h3>
          <span className="text-sm font-medium text-amber-700">
            {formatCurrency(totalQueuedCost)}
          </span>
        </div>

        <div className="text-sm text-amber-800">
          {offlineData.length} requests queued for sync
        </div>
        <div className="text-xs text-amber-700 mt-1">
          Will be processed when connection is restored
        </div>

        {isOnline && (
          <button
            onClick={() => {
              if (hapticSupported) triggerHaptic('selection');
              // Trigger sync
            }}
            className="mt-2 w-full bg-amber-500 text-white rounded-lg p-2 text-sm font-medium hover:bg-amber-600 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            Sync Now
          </button>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading && !costData) {
    return (
      <div className={`mobile-cost-monitor ${className}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-gray-600">Loading cost data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Platform mode (no costs)
  if (mode === 'platform') {
    return (
      <div className={`mobile-cost-monitor ${className}`}>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Platform AI</h3>
              <p className="text-sm text-green-700">
                Included with your subscription
              </p>
            </div>
          </div>
          <div className="text-sm text-green-800">
            All AI features are included in your WedSync plan. No additional
            usage costs apply.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mobile-cost-monitor space-y-4 ${className}`}>
      {/* Budget alerts */}
      {renderBudgetAlerts()}

      {/* Usage chart */}
      {renderUsageChart()}

      {/* Feature breakdown */}
      {renderFeatureBreakdown()}

      {/* Projections */}
      {renderProjections()}

      {/* Offline queue */}
      {renderOfflineQueue()}

      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAlertsEnabled(!alertsEnabled);
              if (hapticSupported) triggerHaptic('selection');
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            {alertsEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
            <span>Alerts {alertsEnabled ? 'On' : 'Off'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {lastUpdate && <span>Updated {lastUpdate.toLocaleTimeString()}</span>}
          {!isOnline && <span className="text-amber-600">Offline</span>}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">
                Failed to load cost data
              </div>
              <div className="text-sm text-red-700">{error}</div>
              <button
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                style={{ touchAction: 'manipulation' }}
              >
                Try again
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MobileCostMonitor;
