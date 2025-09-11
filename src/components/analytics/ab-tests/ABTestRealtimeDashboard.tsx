'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Crown,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Target,
  Activity,
} from 'lucide-react';
import StatisticalEngine, {
  type TestVariant,
  type StatisticalResult,
} from '@/lib/statistics/core-engine';

interface RealtimeTestData {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed';
  createdAt: string;
  variants: TestVariant[];
  metrics: string[];
  confidenceLevel: number;
  targetSampleSize?: number;
  estimatedDuration?: number;
  autoStopEnabled: boolean;
}

interface DashboardMetrics {
  totalExposures: number;
  totalConversions: number;
  overallConversionRate: number;
  significantTests: number;
  averageImprovement: number;
  runningDuration: number;
}

interface RealtimeUpdate {
  timestamp: string;
  testId: string;
  variantId: string;
  eventType: 'exposure' | 'conversion';
  metadata?: any;
}

interface Props {
  tests: RealtimeTestData[];
  onTestAction: (testId: string, action: 'start' | 'pause' | 'stop') => void;
  onRefresh: () => void;
  autoRefreshInterval?: number;
}

export default function ABTestRealtimeDashboard({
  tests,
  onTestAction,
  onRefresh,
  autoRefreshInterval = 30000,
}: Props) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealtimeUpdate[]>([]);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [visibilityState, setVisibilityState] = useState<'visible' | 'hidden'>(
    'visible',
  );

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Page visibility detection for optimized refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      setVisibilityState(document.hidden ? 'hidden' : 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-refresh logic with visibility optimization
  useEffect(() => {
    if (!isAutoRefreshEnabled || visibilityState === 'hidden') {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const startRefresh = () => {
      refreshIntervalRef.current = setInterval(() => {
        onRefresh();
        setLastUpdateTime(new Date());
      }, autoRefreshInterval);
    };

    startRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAutoRefreshEnabled, visibilityState, autoRefreshInterval, onRefresh]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connectWebSocket = () => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ab-testing/realtime`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);
          setRealtimeUpdates((prev) => [...prev.slice(-99), update]); // Keep last 100 updates
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const calculateDashboardMetrics = useCallback((): DashboardMetrics => {
    const runningTests = tests.filter((t) => t.status === 'running');

    const totals = runningTests.reduce(
      (acc, test) => {
        const testTotals = test.variants.reduce(
          (variantAcc, variant) => ({
            exposures: variantAcc.exposures + variant.totalExposures,
            conversions: variantAcc.conversions + variant.conversions,
          }),
          { exposures: 0, conversions: 0 },
        );

        return {
          exposures: acc.exposures + testTotals.exposures,
          conversions: acc.conversions + testTotals.conversions,
        };
      },
      { exposures: 0, conversions: 0 },
    );

    const significantTests = tests.filter((test) => {
      if (test.variants.length < 2) return false;
      const [control, variant] = test.variants;
      const result = StatisticalEngine.calculateABTestSignificance(
        control,
        variant,
      );
      return result.isSignificant;
    }).length;

    const improvements = tests
      .filter((test) => test.variants.length >= 2)
      .map((test) => {
        const [control, variant] = test.variants;
        const result = StatisticalEngine.calculateABTestSignificance(
          control,
          variant,
        );
        return result.relativeLift;
      })
      .filter((lift) => lift > 0);

    const averageImprovement =
      improvements.length > 0
        ? improvements.reduce((sum, lift) => sum + lift, 0) /
          improvements.length
        : 0;

    // Calculate average running duration
    const now = new Date();
    const durations = runningTests
      .filter((test) => test.createdAt)
      .map((test) => now.getTime() - new Date(test.createdAt).getTime());

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
        : 0;

    return {
      totalExposures: totals.exposures,
      totalConversions: totals.conversions,
      overallConversionRate:
        totals.exposures > 0 ? totals.conversions / totals.exposures : 0,
      significantTests,
      averageImprovement,
      runningDuration: averageDuration / (1000 * 60 * 60 * 24), // Convert to days
    };
  }, [tests]);

  const generateTimeSeriesData = useCallback((test: RealtimeTestData) => {
    // Generate last 24 hours of data points
    const now = new Date();
    const data = [];

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = timestamp.getHours();

      const dataPoint = {
        time: `${hour.toString().padStart(2, '0')}:00`,
        timestamp: timestamp.toISOString(),
        ...test.variants.reduce((acc, variant) => {
          // Simulate realistic conversion rate fluctuation
          const baseRate = variant.conversionRate;
          const noise = (Math.random() - 0.5) * 0.02; // ±1% noise
          const rate = Math.max(0, Math.min(1, baseRate + noise));

          return {
            ...acc,
            [`${variant.name}_rate`]: rate * 100,
            [`${variant.name}_exposures`]: Math.floor(
              variant.totalExposures * (Math.random() * 0.1 + 0.05),
            ),
          };
        }, {}),
      };

      data.push(dataPoint);
    }

    return data;
  }, []);

  const dashboardMetrics = calculateDashboardMetrics();
  const runningTests = tests.filter((t) => t.status === 'running');
  const completedTests = tests.filter((t) => t.status === 'completed');

  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: React.ReactNode,
    trend?: 'up' | 'down' | 'neutral',
    color: string = 'primary',
  ) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-100`}>{icon}</div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );

  const renderTestCard = (test: RealtimeTestData) => {
    if (test.variants.length < 2) return null;

    const [controlVariant, ...testVariants] = test.variants;
    const primaryVariant = testVariants[0];

    const result = StatisticalEngine.calculateABTestSignificance(
      controlVariant,
      primaryVariant,
      test.confidenceLevel / 100,
    );

    const totalExposures = test.variants.reduce(
      (sum, v) => sum + v.totalExposures,
      0,
    );
    const runningTime = test.createdAt
      ? Math.floor(
          (Date.now() - new Date(test.createdAt).getTime()) / (1000 * 60 * 60),
        )
      : 0;

    const progress = test.targetSampleSize
      ? Math.min(100, (totalExposures / test.targetSampleSize) * 100)
      : 0;

    const shouldAutoStop =
      test.autoStopEnabled && result.isSignificant && result.power > 0.8;

    return (
      <Card
        key={test.id}
        className="p-6 hover:shadow-lg transition-all duration-200"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={test.status === 'running' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {test.status === 'running' ? (
                  <Activity className="h-3 w-3 animate-pulse" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
              </Badge>
              {shouldAutoStop && (
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-200"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Auto-stop ready
                </Badge>
              )}
              <span className="text-sm text-gray-600">
                {runningTime}h running
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {test.status === 'running' && (
              <>
                <Button
                  onClick={() => onTestAction(test.id, 'pause')}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button
                  onClick={() => onTestAction(test.id, 'stop')}
                  size="sm"
                  variant={shouldAutoStop ? 'default' : 'outline'}
                  className="flex items-center gap-1"
                >
                  <Square className="h-4 w-4" />
                  {shouldAutoStop ? 'Declare Winner' : 'Stop'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress and Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Sample Progress
              </span>
              <span className="text-sm text-gray-600">
                {progress.toFixed(1)}%
              </span>
            </div>
            <Progress value={progress} className="mb-1" />
            <p className="text-xs text-gray-600">
              {totalExposures.toLocaleString()} /{' '}
              {test.targetSampleSize?.toLocaleString() || '∞'} exposures
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Statistical Power
              </span>
            </div>
            <p className="text-lg font-bold text-blue-600">
              {(result.power * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Power to detect effect</p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {result.isSignificant ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                Significance
              </span>
            </div>
            <p
              className={`text-lg font-bold ${result.isSignificant ? 'text-green-600' : 'text-yellow-600'}`}
            >
              {result.isSignificant ? 'Yes' : 'Testing'}
            </p>
            <p className="text-xs text-gray-600">
              p = {result.pValue.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Variant Performance */}
        <div className="space-y-3 mb-4">
          <h4 className="font-medium text-gray-900">Live Performance</h4>
          {test.variants.map((variant, index) => {
            const isWinner =
              result.isSignificant &&
              ((variant.conversionRate > controlVariant.conversionRate &&
                variant.id !== controlVariant.id) ||
                (variant.id === controlVariant.id &&
                  variant.conversionRate > primaryVariant.conversionRate));

            return (
              <div
                key={variant.id}
                className="p-4 border border-gray-200 rounded-lg relative"
              >
                {isWinner && (
                  <div className="absolute top-2 right-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{variant.name}</span>
                    {variant.isControl && (
                      <Badge variant="secondary" className="text-xs">
                        Control
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {(variant.conversionRate * 100).toFixed(2)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {variant.conversions}/{variant.totalExposures}
                    </p>
                  </div>
                </div>

                <Progress
                  value={variant.conversionRate * 100}
                  className="mb-2"
                />

                {variant.id !== controlVariant.id && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      {result.relativeLift > 0 ? '+' : ''}
                      {result.relativeLift.toFixed(1)}% vs control
                    </span>
                    <span>
                      CI: [{(result.confidenceInterval[0] * 100).toFixed(1)}%,{' '}
                      {(result.confidenceInterval[1] * 100).toFixed(1)}%]
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Real-time Chart Toggle */}
        <Button
          onClick={() =>
            setSelectedTest(selectedTest === test.id ? null : test.id)
          }
          variant="outline"
          className="w-full"
        >
          {selectedTest === test.id ? 'Hide' : 'Show'} Real-time Analytics
        </Button>

        {/* Detailed Analytics */}
        {selectedTest === test.id && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-4">24-Hour Conversion Rate Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={generateTimeSeriesData(test)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value.toFixed(2)}%`,
                    name.replace('_rate', ''),
                  ]}
                />
                {test.variants.map((variant, index) => (
                  <Line
                    key={variant.id}
                    type="monotone"
                    dataKey={`${variant.name}_rate`}
                    stroke={variant.isControl ? '#6B7280' : '#7F56D9'}
                    strokeWidth={variant.isControl ? 2 : 3}
                    dot={false}
                  />
                ))}
                {result.isSignificant && (
                  <ReferenceLine
                    y={controlVariant.conversionRate * 100}
                    stroke="#EF4444"
                    strokeDasharray="5 5"
                    label="Control baseline"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Real-time A/B Test Dashboard
          </h1>
          <p className="text-gray-600">
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
            variant={isAutoRefreshEnabled ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Zap
              className={`h-4 w-4 ${isAutoRefreshEnabled ? 'animate-pulse' : ''}`}
            />
            Auto-refresh {isAutoRefreshEnabled ? 'ON' : 'OFF'}
          </Button>

          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard(
          'Active Tests',
          runningTests.length,
          `${completedTests.length} completed`,
          <Activity className="h-6 w-6 text-green-600" />,
          undefined,
          'green',
        )}

        {renderMetricCard(
          'Total Exposures',
          dashboardMetrics.totalExposures,
          'across all tests',
          <Users className="h-6 w-6 text-blue-600" />,
          'up',
          'blue',
        )}

        {renderMetricCard(
          'Significant Results',
          dashboardMetrics.significantTests,
          `${((dashboardMetrics.significantTests / Math.max(tests.length, 1)) * 100).toFixed(0)}% success rate`,
          <Target className="h-6 w-6 text-purple-600" />,
          undefined,
          'purple',
        )}

        {renderMetricCard(
          'Avg. Improvement',
          `${dashboardMetrics.averageImprovement.toFixed(1)}%`,
          'from winning variants',
          <TrendingUp className="h-6 w-6 text-emerald-600" />,
          'up',
          'emerald',
        )}
      </div>

      {/* Real-time Updates Feed */}
      {realtimeUpdates.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Live Activity Feed</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {realtimeUpdates
              .slice(-5)
              .reverse()
              .map((update, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      update.eventType === 'conversion'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <span className="text-gray-600">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                  <span>
                    {update.eventType === 'conversion' ? '🎯' : '👀'}
                    {update.eventType === 'conversion'
                      ? 'Conversion'
                      : 'Exposure'}
                    in test {update.testId.slice(0, 8)}...
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Tests List */}
      <div className="space-y-6">
        {tests.length === 0 ? (
          <Card className="p-8 text-center">
            <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No active tests
            </h3>
            <p className="text-gray-600">
              Create your first A/B test to start monitoring real-time
              performance
            </p>
          </Card>
        ) : (
          tests.map(renderTestCard)
        )}
      </div>
    </div>
  );
}
