'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion';
import { useBackupPerformanceMonitoring } from '@/hooks/useBackupPerformanceMonitoring';
import { useWeddingHaptics } from '@/hooks/mobile/useHapticFeedback';

// WS-258 Real-Time Performance Tracking and Monitoring
// Wedding industry performance monitoring with <100ms latency requirements

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  history: number[];
  category: 'backup' | 'network' | 'ui' | 'system';
  lastUpdated: Date;
  weddingCritical: boolean;
}

interface WeddingContext {
  isWeddingDay: boolean;
  hoursUntilWedding: number;
  criticalPeriod: boolean; // Within 4 hours of wedding
  clientName?: string;
  weddingType: 'photographer' | 'venue' | 'planner' | 'vendor';
}

interface RealTimePerformanceMonitorProps {
  weddingContext: WeddingContext;
  isEmergencyMode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showAlerts?: boolean;
  compactMode?: boolean;
  className?: string;
}

interface PerformanceAlert {
  id: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  weddingImpact: string;
  recommendedAction: string;
}

const WEDDING_PERFORMANCE_THRESHOLDS = {
  // Core backup performance (WS-258 requirements)
  backup_sync_latency: {
    excellent: 50,
    good: 100,
    warning: 200,
    critical: 500,
  }, // ms
  dashboard_load_time: {
    excellent: 400,
    good: 800,
    warning: 1500,
    critical: 3000,
  }, // ms
  emergency_response: {
    excellent: 100,
    good: 200,
    warning: 500,
    critical: 1000,
  }, // ms
  offline_cache_lookup: {
    excellent: 25,
    good: 50,
    warning: 100,
    critical: 200,
  }, // ms

  // Wedding day specific thresholds
  touch_response: { excellent: 8, good: 16, warning: 32, critical: 100 }, // ms (60fps = 16ms)
  haptic_feedback: { excellent: 5, good: 10, warning: 25, critical: 50 }, // ms

  // Network and connectivity
  network_latency: { excellent: 100, good: 200, warning: 500, critical: 1000 }, // ms
  api_response: { excellent: 200, good: 500, warning: 1000, critical: 2000 }, // ms

  // System performance
  memory_usage: { excellent: 60, good: 75, warning: 85, critical: 95 }, // %
  cpu_usage: { excellent: 50, good: 70, warning: 85, critical: 95 }, // %
  battery_level: { excellent: 50, good: 30, warning: 15, critical: 10 }, // %
};

export default function RealTimePerformanceMonitor({
  weddingContext,
  isEmergencyMode = false,
  autoRefresh = true,
  refreshInterval = 1000,
  showAlerts = true,
  compactMode = false,
  className = '',
}: RealTimePerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [performanceScore, setPerformanceScore] = useState(100);
  const [criticalIssues, setCriticalIssues] = useState(0);

  const { measurePerformance, getAverageDuration, getLastDuration } =
    useBackupPerformanceMonitoring('RealTimePerformanceMonitor');
  const haptics = useWeddingHaptics();

  const wsRef = useRef<WebSocket | null>(null);
  const metricsHistoryRef = useRef<Map<string, number[]>>(new Map());
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const connectWebSocket = () => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/performance/realtime`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('Performance monitor WebSocket connected');
          setIsConnected(true);

          // Send wedding context for personalized monitoring
          wsRef.current?.send(
            JSON.stringify({
              type: 'WEDDING_CONTEXT',
              data: weddingContext,
            }),
          );
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeData(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('Performance monitor WebSocket disconnected');
          setIsConnected(false);

          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [autoRefresh, weddingContext]);

  // Handle real-time performance data
  const handleRealtimeData = useCallback((data: any) => {
    const { type, payload } = data;

    switch (type) {
      case 'PERFORMANCE_METRICS':
        updateMetrics(payload);
        break;

      case 'PERFORMANCE_ALERT':
        addAlert(payload);
        break;

      case 'WEDDING_DAY_CRITICAL':
        handleWeddingDayCritical(payload);
        break;

      case 'SYSTEM_HEALTH':
        updateSystemHealth(payload);
        break;

      default:
        console.log('Unknown real-time message:', type);
    }

    setLastUpdate(new Date());
  }, []);

  // Update performance metrics with trend analysis
  const updateMetrics = useCallback(
    (newMetrics: any[]) => {
      const startTime = performance.now();

      setMetrics((currentMetrics) => {
        const updatedMetrics = newMetrics.map((newMetric) => {
          const existing = currentMetrics.find((m) => m.id === newMetric.id);
          const history = existing?.history || [];
          const updatedHistory = [...history.slice(-29), newMetric.value]; // Keep last 30 values

          // Store history in ref for trend analysis
          metricsHistoryRef.current.set(newMetric.id, updatedHistory);

          // Calculate trend
          const trend = calculateTrend(updatedHistory);
          const status = calculateStatus(
            newMetric.name,
            newMetric.value,
            weddingContext,
          );

          return {
            ...newMetric,
            history: updatedHistory,
            trend,
            status,
            lastUpdated: new Date(),
            weddingCritical: isWeddingCriticalMetric(
              newMetric.name,
              weddingContext,
            ),
          };
        });

        return updatedMetrics;
      });

      const updateTime = performance.now() - startTime;
      measurePerformance('metrics-update', updateTime);

      // Update overall performance score
      updatePerformanceScore(newMetrics);
    },
    [weddingContext, measurePerformance],
  );

  // Calculate metric status based on wedding context
  const calculateStatus = useCallback(
    (
      metricName: string,
      value: number,
      context: WeddingContext,
    ): PerformanceMetric['status'] => {
      const thresholds =
        WEDDING_PERFORMANCE_THRESHOLDS[
          metricName as keyof typeof WEDDING_PERFORMANCE_THRESHOLDS
        ];
      if (!thresholds) return 'good';

      // Apply stricter thresholds during wedding critical periods
      const multiplier = context.criticalPeriod ? 0.8 : 1.0;

      const adjustedThresholds = {
        excellent: thresholds.excellent * multiplier,
        good: thresholds.good * multiplier,
        warning: thresholds.warning * multiplier,
        critical: thresholds.critical * multiplier,
      };

      if (value <= adjustedThresholds.excellent) return 'excellent';
      if (value <= adjustedThresholds.good) return 'good';
      if (value <= adjustedThresholds.warning) return 'warning';
      return 'critical';
    },
    [],
  );

  // Calculate trend from historical data
  const calculateTrend = useCallback(
    (history: number[]): 'up' | 'down' | 'stable' => {
      if (history.length < 5) return 'stable';

      const recent = history.slice(-5);
      const older = history.slice(-10, -5);

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (changePercent > 5) return 'up';
      if (changePercent < -5) return 'down';
      return 'stable';
    },
    [],
  );

  // Check if metric is critical for wedding operations
  const isWeddingCriticalMetric = useCallback(
    (metricName: string, context: WeddingContext): boolean => {
      const criticalMetrics = {
        photographer: ['backup_sync_latency', 'touch_response', 'api_response'],
        venue: ['network_latency', 'system_performance', 'emergency_response'],
        planner: [
          'dashboard_load_time',
          'offline_cache_lookup',
          'haptic_feedback',
        ],
        vendor: ['backup_sync_latency', 'network_latency', 'touch_response'],
      };

      return (
        criticalMetrics[context.weddingType]?.includes(metricName) || false
      );
    },
    [],
  );

  // Add performance alert with haptic feedback
  const addAlert = useCallback(
    (alertData: any) => {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}`,
        ...alertData,
        timestamp: new Date(),
        acknowledged: false,
      };

      setAlerts((currentAlerts) => {
        const updatedAlerts = [alert, ...currentAlerts.slice(0, 49)]; // Keep last 50 alerts

        // Count critical issues
        const critical = updatedAlerts.filter(
          (a) => a.severity === 'critical' && !a.acknowledged,
        ).length;
        setCriticalIssues(critical);

        return updatedAlerts;
      });

      // Trigger appropriate haptic feedback
      switch (alert.severity) {
        case 'critical':
          haptics.emergencyMode();
          break;
        case 'high':
          haptics.weddingDayAlert();
          break;
        case 'medium':
          haptics.plannerReminder();
          break;
        default:
          haptics.trigger('ERROR_MINOR');
      }

      // Clear alert timeout and set new one
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }

      if (alert.severity === 'critical') {
        alertTimeoutRef.current = setTimeout(() => {
          haptics.emergencyMode();
        }, 30000); // Remind every 30 seconds for critical issues
      }
    },
    [haptics],
  );

  // Handle wedding day critical events
  const handleWeddingDayCritical = useCallback(
    (payload: any) => {
      haptics.weddingDayAlert();

      // Show critical notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Wedding Day Critical Alert', {
          body: payload.message,
          icon: '/icons/backup-192x192.png',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
        });
      }
    },
    [haptics],
  );

  // Update system health indicators
  const updateSystemHealth = useCallback((healthData: any) => {
    // Update system-wide performance indicators
    console.log('System health updated:', healthData);
  }, []);

  // Calculate overall performance score
  const updatePerformanceScore = useCallback(
    (metricsData: any[]) => {
      const weights = {
        backup_sync_latency: weddingContext.isWeddingDay ? 0.3 : 0.2,
        dashboard_load_time: 0.2,
        emergency_response: isEmergencyMode ? 0.3 : 0.1,
        touch_response: 0.15,
        network_latency: 0.1,
        system_performance: 0.05,
      };

      let weightedScore = 0;
      let totalWeight = 0;

      metricsData.forEach((metric) => {
        const weight = weights[metric.name as keyof typeof weights] || 0.05;
        let score = 100;

        switch (metric.status) {
          case 'excellent':
            score = 100;
            break;
          case 'good':
            score = 80;
            break;
          case 'warning':
            score = 60;
            break;
          case 'critical':
            score = 20;
            break;
        }

        weightedScore += score * weight;
        totalWeight += weight;
      });

      const finalScore =
        totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;
      setPerformanceScore(finalScore);
    },
    [weddingContext.isWeddingDay, isEmergencyMode],
  );

  // Acknowledge alert
  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      setAlerts((currentAlerts) =>
        currentAlerts.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert,
        ),
      );

      haptics.trigger('TOUCH_SUCCESS');
    },
    [haptics],
  );

  // Filter metrics for display
  const displayMetrics = useMemo(() => {
    return metrics
      .filter((metric) => {
        if (compactMode) {
          return (
            metric.weddingCritical ||
            metric.status === 'critical' ||
            metric.status === 'warning'
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Priority sort: critical wedding metrics first, then by status severity
        if (a.weddingCritical && !b.weddingCritical) return -1;
        if (!a.weddingCritical && b.weddingCritical) return 1;

        const statusPriority = {
          critical: 4,
          warning: 3,
          good: 2,
          excellent: 1,
        };
        return statusPriority[b.status] - statusPriority[a.status];
      });
  }, [metrics, compactMode]);

  // Recent unacknowledged alerts
  const recentAlerts = useMemo(() => {
    return alerts.filter((alert) => !alert.acknowledged).slice(0, 5);
  }, [alerts]);

  return (
    <div className={`real-time-performance-monitor ${className}`}>
      {/* Header with connection status and performance score */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold">⚡ Live Performance Monitor</h2>
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${
                  isConnected ? 'animate-pulse' : ''
                }`}
              />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </div>

          {/* Performance Score */}
          <div className="text-right">
            <div
              className={`text-2xl font-bold ${
                performanceScore >= 90
                  ? 'text-green-600'
                  : performanceScore >= 70
                    ? 'text-yellow-600'
                    : performanceScore >= 50
                      ? 'text-orange-600'
                      : 'text-red-600'
              }`}
            >
              {performanceScore}%
            </div>
            <div className="text-xs text-gray-500">Performance Score</div>
          </div>
        </div>

        {weddingContext.isWeddingDay && (
          <div className="mt-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <div className="flex items-center justify-between">
              <span className="text-pink-800 font-medium">
                💒 Wedding Day Mode Active
              </span>
              {weddingContext.criticalPeriod && (
                <span className="text-red-600 font-bold text-sm">
                  🚨 CRITICAL PERIOD
                </span>
              )}
            </div>
            {weddingContext.clientName && (
              <div className="text-sm text-pink-700 mt-1">
                Client: {weddingContext.clientName} •{' '}
                {weddingContext.hoursUntilWedding}h until wedding
              </div>
            )}
          </div>
        )}
      </div>

      {/* Critical Alerts Banner */}
      {criticalIssues > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-600 text-white rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🚨</span>
              <span className="font-bold">
                {criticalIssues} Critical Performance Issue
                {criticalIssues > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => haptics.emergencyMode()}
              className="bg-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-800"
            >
              Alert Team
            </button>
          </div>
        </motion.div>
      )}

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AnimatePresence>
          {displayMetrics.map((metric) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`metric-card p-4 rounded-xl border-2 ${
                metric.status === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : metric.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : metric.status === 'excellent'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-sm">
                    {metric.name.replace('_', ' ').toUpperCase()}
                  </h3>
                  {metric.weddingCritical && (
                    <span className="text-xs">💒</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-xs ${
                      metric.trend === 'up'
                        ? 'text-red-500'
                        : metric.trend === 'down'
                          ? 'text-green-500'
                          : 'text-gray-500'
                    }`}
                  >
                    {metric.trend === 'up'
                      ? '📈'
                      : metric.trend === 'down'
                        ? '📉'
                        : '➡️'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline space-x-2 mb-2">
                <span
                  className={`text-2xl font-bold ${
                    metric.status === 'critical'
                      ? 'text-red-600'
                      : metric.status === 'warning'
                        ? 'text-yellow-600'
                        : metric.status === 'excellent'
                          ? 'text-green-600'
                          : 'text-gray-700'
                  }`}
                >
                  {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                </span>
                <span className="text-sm text-gray-500">{metric.unit}</span>
              </div>

              {/* Mini trend chart */}
              <div className="h-8 flex items-end space-x-1 mb-2">
                {metric.history.slice(-10).map((value, index) => (
                  <div
                    key={index}
                    className={`flex-1 rounded-sm ${
                      metric.status === 'critical'
                        ? 'bg-red-200'
                        : metric.status === 'warning'
                          ? 'bg-yellow-200'
                          : metric.status === 'excellent'
                            ? 'bg-green-200'
                            : 'bg-gray-200'
                    }`}
                    style={{
                      height: `${Math.max(10, (value / Math.max(...metric.history)) * 100)}%`,
                    }}
                  />
                ))}
              </div>

              <div className="text-xs text-gray-500">
                Updated {metric.lastUpdated.toLocaleTimeString()}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Recent Alerts */}
      {showAlerts && recentAlerts.length > 0 && (
        <div className="alerts-section">
          <h3 className="font-semibold mb-3 flex items-center">
            🔔 Recent Performance Alerts
            {criticalIssues > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {criticalIssues} critical
              </span>
            )}
          </h3>

          <div className="space-y-2">
            {recentAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`alert-item p-3 rounded-lg border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'high'
                      ? 'bg-orange-50 border-orange-500'
                      : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {alert.metric}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          alert.severity === 'critical'
                            ? 'bg-red-200 text-red-800'
                            : alert.severity === 'high'
                              ? 'bg-orange-200 text-orange-800'
                              : alert.severity === 'medium'
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-blue-200 text-blue-800'
                        }`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Wedding Impact: {alert.weddingImpact}
                    </p>
                    <p className="text-xs font-medium text-blue-600">
                      Recommended: {alert.recommendedAction}
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="ml-3 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    Ack
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {alert.timestamp.toLocaleTimeString()}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          <span>Refresh: {refreshInterval}ms</span>
          <span>{weddingContext.weddingType} mode</span>
        </div>
      </div>
    </div>
  );
}
