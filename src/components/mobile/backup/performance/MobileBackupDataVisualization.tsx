'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion';
import { useBackupPerformanceMonitoring } from '@/hooks/useBackupPerformanceMonitoring';
import { useWeddingHaptics } from '@/hooks/mobile/useHapticFeedback';

// WS-258 Mobile-Optimized Data Visualization for Backup Metrics
// Wedding industry data visualizations optimized for small screens and touch interaction

interface BackupMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  history: number[];
  status: 'excellent' | 'good' | 'warning' | 'critical';
  category: 'performance' | 'storage' | 'network' | 'reliability';
  weddingCritical: boolean;
  lastUpdated: Date;
}

interface WeddingContext {
  isWeddingDay: boolean;
  hoursUntilWedding: number;
  clientName?: string;
  vendorType: 'photographer' | 'venue' | 'planner' | 'vendor';
  weddingSize: 'small' | 'medium' | 'large';
}

interface MobileBackupDataVisualizationProps {
  metrics: BackupMetric[];
  weddingContext: WeddingContext;
  isEmergencyMode?: boolean;
  compactMode?: boolean;
  theme?: 'light' | 'dark';
  onMetricSelect?: (metricId: string) => void;
  className?: string;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

type ChartType = 'sparkline' | 'donut' | 'bar' | 'heatmap' | 'gauge';
type ViewMode = 'overview' | 'detail' | 'trends' | 'alerts';

// Mobile-optimized chart configurations
const CHART_CONFIGS = {
  sparkline: {
    width: '100%',
    height: 40,
    strokeWidth: 2,
    touchTarget: 44, // Minimum 44x44px touch target
  },
  donut: {
    size: 120,
    strokeWidth: 8,
    centerSize: 60,
  },
  bar: {
    height: 140,
    barWidth: 24,
    spacing: 8,
  },
  gauge: {
    size: 100,
    strokeWidth: 10,
    needleLength: 35,
  },
  heatmap: {
    cellSize: 20,
    spacing: 2,
  },
};

// Wedding industry color schemes
const WEDDING_COLOR_SCHEMES = {
  photographer: {
    primary: '#3b82f6', // Blue
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    critical: '#ef4444', // Red
    background: '#f8fafc',
  },
  venue: {
    primary: '#8b5cf6', // Purple
    success: '#059669',
    warning: '#d97706',
    critical: '#dc2626',
    background: '#faf5ff',
  },
  planner: {
    primary: '#ec4899', // Pink
    success: '#047857',
    warning: '#ea580c',
    critical: '#b91c1c',
    background: '#fdf2f8',
  },
  vendor: {
    primary: '#6b7280', // Gray
    success: '#065f46',
    warning: '#92400e',
    critical: '#991b1b',
    background: '#f9fafb',
  },
};

export default function MobileBackupDataVisualization({
  metrics = [],
  weddingContext,
  isEmergencyMode = false,
  compactMode = false,
  theme = 'light',
  onMetricSelect,
  className = '',
}: MobileBackupDataVisualizationProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [touchInteraction, setTouchInteraction] = useState<{
    isActive: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const { measurePerformance } = useBackupPerformanceMonitoring(
    'MobileBackupDataVisualization',
  );
  const haptics = useWeddingHaptics();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Get wedding-specific color scheme
  const colorScheme = useMemo(() => {
    return WEDDING_COLOR_SCHEMES[weddingContext.vendorType];
  }, [weddingContext.vendorType]);

  // Filter metrics based on view mode and emergency status
  const filteredMetrics = useMemo(() => {
    let filtered = [...metrics];

    if (isEmergencyMode) {
      filtered = filtered.filter(
        (m) =>
          m.status === 'critical' ||
          m.status === 'warning' ||
          m.weddingCritical,
      );
    }

    if (compactMode) {
      filtered = filtered.filter(
        (m) => m.weddingCritical || m.status === 'critical',
      );
    }

    switch (viewMode) {
      case 'alerts':
        filtered = filtered.filter(
          (m) => m.status === 'critical' || m.status === 'warning',
        );
        break;
      case 'trends':
        filtered = filtered.filter((m) => m.trend !== 'stable');
        break;
      case 'detail':
        filtered = selectedMetric
          ? filtered.filter((m) => m.id === selectedMetric)
          : filtered.slice(0, 1);
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => {
      // Priority sort: emergency metrics first, then by status
      if (a.weddingCritical && !b.weddingCritical) return -1;
      if (!a.weddingCritical && b.weddingCritical) return 1;

      const statusPriority = { critical: 4, warning: 3, good: 2, excellent: 1 };
      return statusPriority[b.status] - statusPriority[a.status];
    });
  }, [metrics, viewMode, isEmergencyMode, compactMode, selectedMetric]);

  // Create sparkline path for metric history
  const createSparklinePath = useCallback(
    (data: number[], width: number, height: number): string => {
      if (data.length < 2) return '';

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

      return data
        .map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    },
    [],
  );

  // Create donut chart path
  const createDonutPath = useCallback(
    (
      value: number,
      max: number,
      radius: number,
      strokeWidth: number,
    ): string => {
      const percentage = Math.min(value / max, 1);
      const angle = percentage * 2 * Math.PI - Math.PI / 2; // Start from top
      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      const x1 = radius + Math.cos(-Math.PI / 2) * (radius - strokeWidth / 2);
      const y1 = radius + Math.sin(-Math.PI / 2) * (radius - strokeWidth / 2);
      const x2 = radius + Math.cos(angle) * (radius - strokeWidth / 2);
      const y2 = radius + Math.sin(angle) * (radius - strokeWidth / 2);

      if (percentage === 0) return '';
      if (percentage === 1) {
        return `M ${radius - strokeWidth / 2} ${strokeWidth / 2} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 1 1 ${radius - strokeWidth / 2 - 0.01} ${strokeWidth / 2}`;
      }

      return `M ${x1} ${y1} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    },
    [],
  );

  // Handle touch interactions
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, metricId?: string) => {
      const touch = e.touches[0];
      setTouchInteraction({
        isActive: true,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
      });

      if (metricId) {
        haptics.trigger('TOUCH_START');
      }
    },
    [haptics],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchInteraction.isActive) return;

      const touch = e.touches[0];
      setTouchInteraction((prev) => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
      }));
    },
    [touchInteraction.isActive],
  );

  const handleTouchEnd = useCallback(
    (metricId?: string) => {
      if (!touchInteraction.isActive) return;

      const deltaX = touchInteraction.currentX - touchInteraction.startX;
      const deltaY = touchInteraction.currentY - touchInteraction.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Tap detection (movement < 10px)
      if (distance < 10 && metricId) {
        setSelectedMetric(metricId);
        onMetricSelect?.(metricId);
        haptics.trigger('TOUCH_SUCCESS');

        const tapTime = performance.now();
        measurePerformance('metric-tap', tapTime);
      }

      setTouchInteraction({
        isActive: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    },
    [touchInteraction, onMetricSelect, haptics, measurePerformance],
  );

  // Render sparkline chart
  const renderSparkline = useCallback(
    (metric: BackupMetric, width: number = 200, height: number = 40) => {
      const path = createSparklinePath(metric.history, width, height);
      const color =
        colorScheme[
          metric.status === 'critical'
            ? 'critical'
            : metric.status === 'warning'
              ? 'warning'
              : metric.status === 'excellent'
                ? 'success'
                : 'primary'
        ];

      return (
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient
              id={`gradient-${metric.id}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Fill area under curve */}
          <path
            d={`${path} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#gradient-${metric.id})`}
          />

          {/* Line */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={CHART_CONFIGS.sparkline.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current value dot */}
          <circle
            cx={width}
            cy={
              height -
              ((metric.value - Math.min(...metric.history)) /
                (Math.max(...metric.history) - Math.min(...metric.history) ||
                  1)) *
                height
            }
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      );
    },
    [createSparklinePath, colorScheme],
  );

  // Render donut chart
  const renderDonut = useCallback(
    (metric: BackupMetric, size: number = 120) => {
      const { strokeWidth } = CHART_CONFIGS.donut;
      const radius = size / 2;
      const maxValue = 100; // Assuming percentage values
      const path = createDonutPath(metric.value, maxValue, radius, strokeWidth);

      const color =
        colorScheme[
          metric.status === 'critical'
            ? 'critical'
            : metric.status === 'warning'
              ? 'warning'
              : metric.status === 'excellent'
                ? 'success'
                : 'primary'
        ];

      return (
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={radius}
            cy={radius}
            r={radius - strokeWidth / 2}
            fill="none"
            stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Center text */}
          <text
            x={radius}
            y={radius - 5}
            textAnchor="middle"
            className="text-2xl font-bold fill-current"
            fill={theme === 'dark' ? 'white' : 'black'}
          >
            {Math.round(metric.value)}
          </text>
          <text
            x={radius}
            y={radius + 12}
            textAnchor="middle"
            className="text-xs fill-current opacity-60"
            fill={theme === 'dark' ? 'white' : 'black'}
          >
            {metric.unit}
          </text>
        </svg>
      );
    },
    [createDonutPath, colorScheme, theme],
  );

  // Render performance gauge
  const renderGauge = useCallback(
    (metric: BackupMetric, size: number = 100) => {
      const { strokeWidth, needleLength } = CHART_CONFIGS.gauge;
      const radius = size / 2;
      const percentage = Math.min(metric.value / 100, 1); // Assuming 0-100 scale
      const angle = percentage * Math.PI - Math.PI / 2; // -90 to +90 degrees

      const needleX = radius + Math.cos(angle) * needleLength;
      const needleY = radius + Math.sin(angle) * needleLength;

      const color =
        colorScheme[
          metric.status === 'critical'
            ? 'critical'
            : metric.status === 'warning'
              ? 'warning'
              : metric.status === 'excellent'
                ? 'success'
                : 'primary'
        ];

      return (
        <svg width={size} height={size * 0.7}>
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 0 1 ${size - strokeWidth / 2} ${radius}`}
            fill="none"
            stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 0 1 ${radius + Math.cos(angle) * (radius - strokeWidth / 2)} ${radius + Math.sin(angle) * (radius - strokeWidth / 2)}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Needle */}
          <line
            x1={radius}
            y1={radius}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle cx={radius} cy={radius} r="4" fill={color} />

          {/* Value text */}
          <text
            x={radius}
            y={radius + 25}
            textAnchor="middle"
            className="text-sm font-semibold fill-current"
            fill={theme === 'dark' ? 'white' : 'black'}
          >
            {metric.value.toFixed(1)}
            {metric.unit}
          </text>
        </svg>
      );
    },
    [colorScheme, theme],
  );

  return (
    <div
      className={`mobile-backup-data-visualization ${className}`}
      ref={containerRef}
    >
      {/* Header with view mode controls */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center">
            📊 Backup Metrics
            {weddingContext.isWeddingDay && (
              <span className="ml-2 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                Wedding Day
              </span>
            )}
          </h2>

          {isEmergencyMode && (
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
              🚨 EMERGENCY
            </div>
          )}
        </div>

        {/* View mode selector */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['overview', 'detail', 'trends', 'alerts'] as ViewMode[]).map(
            (mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  haptics.trigger('TOUCH_START');
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? `bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white`
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                style={{ minHeight: CHART_CONFIGS.sparkline.touchTarget }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Emergency context banner */}
      {weddingContext.hoursUntilWedding <= 4 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-red-800 font-semibold">
                ⚠️ Critical Wedding Period
              </span>
              <p className="text-red-700 text-sm">
                {weddingContext.clientName}'s wedding in{' '}
                {weddingContext.hoursUntilWedding}h - monitoring critical
                metrics
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Metrics visualization grid */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {filteredMetrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className={`metric-card bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border-l-4 ${
                selectedMetric === metric.id ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                borderLeftColor:
                  colorScheme[
                    metric.status === 'critical'
                      ? 'critical'
                      : metric.status === 'warning'
                        ? 'warning'
                        : metric.status === 'excellent'
                          ? 'success'
                          : 'primary'
                  ],
              }}
              onTouchStart={(e) => handleTouchStart(e, metric.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(metric.id)}
            >
              {/* Metric header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {metric.name.replace('_', ' ').toUpperCase()}
                  </h3>
                  {metric.weddingCritical && (
                    <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
                      💒
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Trend indicator */}
                  <span
                    className={`text-sm ${
                      metric.trend === 'up'
                        ? 'text-green-600'
                        : metric.trend === 'down'
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {metric.trend === 'up'
                      ? '📈'
                      : metric.trend === 'down'
                        ? '📉'
                        : '➡️'}
                  </span>

                  {/* Status indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      metric.status === 'critical'
                        ? 'bg-red-500'
                        : metric.status === 'warning'
                          ? 'bg-yellow-500'
                          : metric.status === 'excellent'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Metric visualization based on view mode and metric type */}
              <div className="mb-3">
                {viewMode === 'detail' || compactMode ? (
                  // Detailed view with gauge or donut
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                        <span className="text-lg text-gray-500 ml-1">
                          {metric.unit}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Last updated: {metric.lastUpdated.toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {metric.unit === '%'
                        ? renderGauge(metric, 80)
                        : renderDonut(metric, 80)}
                    </div>
                  </div>
                ) : (
                  // Overview with sparkline
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                        <span className="text-sm text-gray-500 ml-1">
                          {metric.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 ml-4">
                      {renderSparkline(metric, 120, 30)}
                    </div>
                  </div>
                )}
              </div>

              {/* Wedding context information */}
              {metric.weddingCritical && weddingContext.isWeddingDay && (
                <div className="text-xs text-pink-700 bg-pink-50 px-2 py-1 rounded">
                  Critical for {weddingContext.vendorType} operations during
                  wedding
                </div>
              )}

              {/* Emergency mode details */}
              {isEmergencyMode && metric.status === 'critical' && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                  🚨 Immediate attention required - affects wedding operations
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Wedding day summary footer */}
      {weddingContext.isWeddingDay && (
        <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-200">
          <h3 className="font-semibold text-pink-800 mb-2">
            💒 Wedding Day Performance Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-pink-700">Critical Metrics</div>
              <div className="font-bold text-pink-900">
                {filteredMetrics.filter((m) => m.weddingCritical).length}/
                {metrics.length}
              </div>
            </div>
            <div>
              <div className="text-pink-700">Issues</div>
              <div className="font-bold text-pink-900">
                {
                  filteredMetrics.filter(
                    (m) => m.status === 'critical' || m.status === 'warning',
                  ).length
                }
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-pink-700">
                Client: {weddingContext.clientName || 'Wedding Event'}
              </div>
              <div className="text-pink-700">
                Size: {weddingContext.weddingSize} • Type:{' '}
                {weddingContext.vendorType}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No data state */}
      {filteredMetrics.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="text-lg font-medium mb-2">No Metrics Available</h3>
          <p className="text-sm">
            {viewMode === 'alerts'
              ? 'No performance alerts detected'
              : viewMode === 'trends'
                ? 'No significant trends detected'
                : 'Waiting for backup performance data...'}
          </p>
        </div>
      )}
    </div>
  );
}
