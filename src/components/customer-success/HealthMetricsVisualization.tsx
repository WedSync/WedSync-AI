'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface HealthMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
  color: string;
  icon: React.ReactNode;
  target?: number;
  description: string;
}

interface HealthSegment {
  name: string;
  value: number;
  count: number;
  color: string;
  description: string;
}

interface TrendDataPoint {
  date: string;
  healthScore: number;
  engagement: number;
  adoption: number;
  activity: number;
  satisfaction: number;
}

interface HealthMetricsVisualizationProps {
  className?: string;
  organizationData?: any[];
  timeframe?: '7d' | '30d' | '90d';
  onTimeframeChange?: (timeframe: '7d' | '30d' | '90d') => void;
}

export function HealthMetricsVisualization({
  className = '',
  organizationData = [],
  timeframe = '30d',
  onTimeframeChange,
}: HealthMetricsVisualizationProps) {
  const [activeView, setActiveView] = useState<
    'overview' | 'trends' | 'segments' | 'detailed'
  >('overview');
  const [isAnimating, setIsAnimating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Generate mock trend data
  const trendData = useMemo<TrendDataPoint[]>(() => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data: TrendDataPoint[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Generate realistic trending data
      const baseScore = 72 + Math.sin(i / 10) * 8 + Math.random() * 6;
      data.push({
        date: date.toLocaleDateString(),
        healthScore: Math.round(baseScore),
        engagement: Math.round(baseScore + Math.random() * 10 - 5),
        adoption: Math.round(baseScore - 5 + Math.random() * 8),
        activity: Math.round(baseScore + 3 + Math.random() * 6),
        satisfaction: Math.round(baseScore - 2 + Math.random() * 7),
      });
    }

    return data;
  }, [timeframe]);

  // Calculate key metrics
  const healthMetrics = useMemo<HealthMetric[]>(() => {
    const currentData = trendData[trendData.length - 1];
    const previousData = trendData[trendData.length - 8]; // Week ago

    if (!currentData || !previousData) return [];

    return [
      {
        id: 'health',
        name: 'Overall Health',
        value: currentData.healthScore,
        change: currentData.healthScore - previousData.healthScore,
        changeType:
          currentData.healthScore > previousData.healthScore
            ? 'increase'
            : 'decrease',
        trend: trendData.map((d) => d.healthScore),
        color: '#10b981',
        icon: <Activity className="h-4 w-4" />,
        target: 85,
        description: 'Composite health score across all factors',
      },
      {
        id: 'engagement',
        name: 'Engagement',
        value: currentData.engagement,
        change: currentData.engagement - previousData.engagement,
        changeType:
          currentData.engagement > previousData.engagement
            ? 'increase'
            : 'decrease',
        trend: trendData.map((d) => d.engagement),
        color: '#3b82f6',
        icon: <Users className="h-4 w-4" />,
        target: 80,
        description: 'Platform engagement and activity levels',
      },
      {
        id: 'adoption',
        name: 'Feature Adoption',
        value: currentData.adoption,
        change: currentData.adoption - previousData.adoption,
        changeType:
          currentData.adoption > previousData.adoption
            ? 'increase'
            : 'decrease',
        trend: trendData.map((d) => d.adoption),
        color: '#8b5cf6',
        icon: <Target className="h-4 w-4" />,
        target: 75,
        description: 'Adoption of key platform features',
      },
      {
        id: 'satisfaction',
        name: 'Satisfaction',
        value: currentData.satisfaction,
        change: currentData.satisfaction - previousData.satisfaction,
        changeType:
          currentData.satisfaction > previousData.satisfaction
            ? 'increase'
            : 'decrease',
        trend: trendData.map((d) => d.satisfaction),
        color: '#f59e0b',
        icon: <CheckCircle2 className="h-4 w-4" />,
        target: 90,
        description: 'Customer satisfaction and NPS scores',
      },
    ];
  }, [trendData]);

  // Calculate health segments
  const healthSegments = useMemo<HealthSegment[]>(() => {
    // Mock data based on typical customer health distributions
    return [
      {
        name: 'Healthy',
        value: 65,
        count: 156,
        color: '#10b981',
        description: 'High engagement, good adoption',
      },
      {
        name: 'At Risk',
        value: 25,
        count: 60,
        color: '#f59e0b',
        description: 'Declining usage, needs attention',
      },
      {
        name: 'Critical',
        value: 10,
        count: 24,
        color: '#ef4444',
        description: 'Low engagement, churn risk',
      },
    ];
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setIsAnimating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setRefreshing(false);
    setIsAnimating(false);
  };

  const MetricCard = ({
    metric,
    index,
  }: {
    metric: HealthMetric;
    index: number;
  }) => (
    <motion.div
      key={metric.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${metric.color}20` }}
              >
                <div style={{ color: metric.color }}>{metric.icon}</div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{metric.name}</h3>
                <p className="text-sm text-gray-600">{metric.description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Current Value */}
            <div className="flex items-end justify-between">
              <div>
                <motion.div
                  className="text-3xl font-bold text-gray-900"
                  animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {metric.value}
                </motion.div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      metric.changeType === 'increase'
                        ? 'text-green-600'
                        : metric.changeType === 'decrease'
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {metric.changeType === 'increase' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change).toFixed(1)}
                  </div>
                  <span className="text-xs text-gray-500">vs last week</span>
                </div>
              </div>

              {/* Mini trend chart */}
              <div className="w-20 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metric.trend.slice(-7).map((value, i) => ({ value }))}
                  >
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Progress to target */}
            {metric.target && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Target: {metric.target}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: metric.color }}
                  >
                    {Math.round((metric.value / metric.target) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: metric.color }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                    }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Health Metrics Dashboard
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Real-time customer health insights and trends
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Timeframe selector */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {['7d', '30d', '90d'].map((period) => (
                  <Button
                    key={period}
                    variant={timeframe === period ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() =>
                      onTimeframeChange?.(period as '7d' | '30d' | '90d')
                    }
                    className="h-8"
                  >
                    {period}
                  </Button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* View selector */}
          <div className="flex items-center gap-2 mt-4">
            {[
              {
                id: 'overview',
                label: 'Overview',
                icon: <Activity className="h-4 w-4" />,
              },
              {
                id: 'trends',
                label: 'Trends',
                icon: <LineChart className="h-4 w-4" />,
              },
              {
                id: 'segments',
                label: 'Segments',
                icon: <PieChart className="h-4 w-4" />,
              },
            ].map((view) => (
              <Button
                key={view.id}
                variant={activeView === view.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView(view.id as any)}
                className="flex items-center gap-2"
              >
                {view.icon}
                {view.label}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <AnimatePresence mode="wait">
        {/* Overview View */}
        {activeView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {healthMetrics.map((metric, index) => (
                <MetricCard key={metric.id} metric={metric} index={index} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Trends View */}
        {activeView === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Health Score Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Health Score Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[50, 100]} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="healthScore"
                          stroke="#10b981"
                          fill="#10b98120"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-metric Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Component Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[50, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="engagement"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="adoption"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="satisfaction"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Segments View */}
        {activeView === 'segments' && (
          <motion.div
            key="segments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Health Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Health Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Tooltip />
                        <Legend />
                        <pie
                          data={healthSegments}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {healthSegments.map((segment, index) => (
                            <Cell key={index} fill={segment.color} />
                          ))}
                        </pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Segment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Segment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {healthSegments.map((segment, index) => (
                      <motion.div
                        key={segment.name}
                        className="flex items-center justify-between p-4 rounded-lg border"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: segment.color }}
                          />
                          <div>
                            <div className="font-medium">{segment.name}</div>
                            <div className="text-sm text-gray-600">
                              {segment.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {segment.count}
                          </div>
                          <div className="text-sm text-gray-500">
                            {segment.value}%
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-green-900">
                  Strong Engagement
                </div>
                <div className="text-sm text-green-700">
                  65% of customers show high engagement levels
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-900">
                  Feature Adoption Gap
                </div>
                <div className="text-sm text-yellow-700">
                  25% haven't adopted core features yet
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">Positive Trend</div>
                <div className="text-sm text-blue-700">
                  Overall health improved by 3.2% this month
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HealthMetricsVisualization;
