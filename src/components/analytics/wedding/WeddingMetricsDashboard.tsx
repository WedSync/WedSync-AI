'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';

// Lazy load chart components for better performance
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const PieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
  { ssr: false },
);
const Pie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);
const Legend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend })),
  { ssr: false },
);
const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);

import {
  WeddingDashboardMetrics,
  VendorPerformanceAnalytics,
  BudgetVarianceAlert,
  TimelineMilestone,
  BudgetCategory,
  calculateWeddingEfficiencyScore,
  getWeddingStatus,
} from '@/lib/analytics/wedding-metrics-client';

interface WeddingMetricsDashboardProps {
  weddingId: string;
  weddingName?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds, default 30
}

interface WeddingAnalyticsData {
  dashboard: WeddingDashboardMetrics;
  vendors: VendorPerformanceAnalytics[];
  budget: {
    categories: BudgetCategory[];
    alerts: BudgetVarianceAlert[];
  };
  timeline: TimelineMilestone[];
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#6B7280',
  success: '#059669',
  info: '#0EA5E9',
};

const WeddingMetricsDashboard: React.FC<WeddingMetricsDashboardProps> = ({
  weddingId,
  weddingName,
  autoRefresh = true,
  refreshInterval = 30,
}) => {
  const [data, setData] = useState<WeddingAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [view, setView] = useState<
    'overview' | 'vendors' | 'budget' | 'timeline'
  >('overview');
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate derived metrics
  const weddingStatus = useMemo(() => {
    if (!data?.dashboard) return null;
    return getWeddingStatus(data.dashboard);
  }, [data?.dashboard]);

  const efficiencyScore = useMemo(() => {
    if (!data?.dashboard) return 0;
    return calculateWeddingEfficiencyScore(data.dashboard);
  }, [data?.dashboard]);

  // Fetch comprehensive analytics data
  const fetchAnalytics = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analytics/wedding/${weddingId}?type=comprehensive`,
        );
        if (!response.ok) throw new Error('Failed to fetch wedding analytics');

        const result = await response.json();
        setData(result.data);
        setLastUpdated(result.timestamp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [weddingId],
  );

  // Auto-refresh functionality
  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(
        () => fetchAnalytics(false),
        refreshInterval * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, autoRefresh, refreshInterval]);

  // Export wedding analytics
  const handleExport = useCallback(
    async (format: 'json' | 'csv' = 'csv') => {
      setIsExporting(true);
      setExportProgress(0);

      try {
        const response = await fetch(
          `/api/analytics/wedding/${weddingId}/export?format=${format}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ include_all: true }),
          },
        );

        if (!response.ok) throw new Error('Export failed');

        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
          setExportProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const blob = await response.blob();
        clearInterval(progressInterval);
        setExportProgress(100);

        // Download file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wedding_analytics_${weddingName || 'report'}_${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);

        setTimeout(() => setExportProgress(0), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setIsExporting(false);
      }
    },
    [weddingId, weddingName],
  );

  // Chart data transformations
  const budgetChartData = useMemo(() => {
    if (!data?.budget.categories) return [];

    return data.budget.categories
      .map((cat) => ({
        name: cat.category_name,
        allocated: cat.allocated_amount,
        spent: cat.spent_amount,
        remaining: cat.allocated_amount - cat.spent_amount,
        utilization: cat.budget_utilization,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);
  }, [data?.budget.categories]);

  const vendorRatingData = useMemo(() => {
    if (!data?.vendors) return [];

    return data.vendors.map((vendor) => ({
      category: vendor.vendor_category,
      reliability: vendor.avg_reliability_score,
      communication: vendor.avg_communication_rating,
      quality: vendor.avg_quality_rating,
      count: vendor.vendor_count,
    }));
  }, [data?.vendors]);

  const timelineProgressData = useMemo(() => {
    if (!data?.timeline) return [];

    const milestonesByMonth = data.timeline.reduce(
      (acc, milestone) => {
        const month = new Date(milestone.target_completion_date)
          .toISOString()
          .slice(0, 7);
        if (!acc[month]) {
          acc[month] = { month, total: 0, completed: 0 };
        }
        acc[month].total++;
        if (milestone.is_completed) acc[month].completed++;
        return acc;
      },
      {} as Record<string, { month: string; total: number; completed: number }>,
    );

    return Object.values(milestonesByMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        month: new Date(item.month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        completion: Math.round((item.completed / item.total) * 100),
        total: item.total,
        completed: item.completed,
      }));
  }, [data?.timeline]);

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics()}
          className="ml-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading wedding analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="wedding-analytics-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {weddingName || 'Wedding'} Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights and performance metrics
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(value: any) => setView(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="vendors">Vendors</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button
            onClick={() => handleExport('csv')}
            disabled={isExporting || !data}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Exporting analytics data...
          </div>
          <Progress value={exportProgress} className="w-full" />
        </div>
      )}

      {/* Wedding Status Alert */}
      {data?.dashboard && weddingStatus && weddingStatus.urgency !== 'low' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{weddingStatus.message}</span>
              <Badge
                variant={
                  weddingStatus.urgency === 'high' ? 'destructive' : 'secondary'
                }
              >
                {weddingStatus.urgency.toUpperCase()}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      {data?.dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Days Until Wedding
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.dashboard.wedding_info.days_until}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(
                  data.dashboard.wedding_info.date,
                ).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Planning Progress
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.dashboard.wedding_info.completion_percentage}%
              </div>
              <Progress
                value={data.dashboard.wedding_info.completion_percentage}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Budget Utilization
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.dashboard.budget_summary.utilization_percentage.toFixed(
                  1,
                )}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                ${data.dashboard.budget_summary.total_spent.toLocaleString()} /
                ${data.dashboard.budget_summary.total_budget.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Efficiency Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{efficiencyScore}/100</div>
              <Badge
                variant={
                  efficiencyScore > 80
                    ? 'default'
                    : efficiencyScore > 60
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {efficiencyScore > 80
                  ? 'Excellent'
                  : efficiencyScore > 60
                    ? 'Good'
                    : 'Needs Attention'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overview View */}
      {view === 'overview' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation vs. Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => `$${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="allocated"
                    fill={COLORS.primary}
                    name="Allocated"
                  />
                  <Bar dataKey="spent" fill={COLORS.secondary} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Timeline Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Milestone Completion by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: any, name: string) =>
                      name === 'completion' ? `${value}%` : value
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completion"
                    stroke={COLORS.success}
                    strokeWidth={3}
                    name="Completion %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vendor Performance View */}
      {view === 'vendors' && data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={vendorRatingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="reliability"
                    fill={COLORS.primary}
                    name="Reliability"
                  />
                  <Bar
                    dataKey="communication"
                    fill={COLORS.secondary}
                    name="Communication"
                  />
                  <Bar dataKey="quality" fill={COLORS.warning} name="Quality" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Variance Alerts */}
      {data?.budget.alerts && data.budget.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Variance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.budget.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {alert.alert_level === 'CRITICAL' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {alert.alert_level === 'WARNING' && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    {alert.alert_level === 'UNDER_BUDGET' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">{alert.category_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Variance: {alert.variance_percentage > 0 ? '+' : ''}
                        {alert.variance_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${Math.abs(alert.variance_amount).toLocaleString()}
                    </p>
                    <Badge
                      variant={
                        alert.alert_level === 'CRITICAL'
                          ? 'destructive'
                          : alert.alert_level === 'WARNING'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {alert.alert_level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeddingMetricsDashboard;
