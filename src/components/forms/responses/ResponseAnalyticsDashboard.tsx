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
import {
  AlertCircle,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

// Lazy load chart components for performance
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
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
const Area = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Area })),
  { ssr: false },
);
const Pie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie })),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
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

interface AnalyticsData {
  periods: string[];
  metrics: {
    total_responses: number[];
    avg_response_time: number[];
    p95_response_time: number[];
    success_rate: number[];
    error_rate: number[];
    completion_rate: number[];
  };
  summary: {
    total_responses: number;
    avg_response_time: number;
    overall_success_rate: number;
    completion_rate: number;
    peak_hour: string;
    most_common_device: string;
  };
  insights: {
    trending_fields: string[];
    abandonment_points: string[];
    performance_score: number;
    recommendations: string[];
  };
}

interface ResponseAnalyticsDashboardProps {
  clientId: string;
  defaultDateRange?: {
    start: string;
    end: string;
  };
}

const ResponseAnalyticsDashboard: React.FC<ResponseAnalyticsDashboardProps> = ({
  clientId,
  defaultDateRange,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(
    defaultDateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
  );
  const [granularity, setGranularity] = useState<
    'hour' | 'day' | 'week' | 'month'
  >('day');
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Wedding-themed color palette
  const colors = {
    primary: '#9E77ED', // Primary purple
    secondary: '#F9F5FF', // Light purple
    success: '#12B76A', // Green
    error: '#F04438', // Red
    warning: '#F79009', // Amber
    wedding: {
      blush: '#FFE4E1',
      champagne: '#F7E7CE',
      sage: '#9CAF88',
      dustyRose: '#D4A5A5',
      lavender: '#E6E6FA',
    },
  };

  // Memoized chart data transformation
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.periods.map((period, index) => ({
      period: new Date(period).toLocaleDateString(),
      responses: data.metrics.total_responses[index],
      avgTime: Math.round(data.metrics.avg_response_time[index] * 100) / 100,
      p95Time: Math.round(data.metrics.p95_response_time[index] * 100) / 100,
      successRate: Math.round(data.metrics.success_rate[index] * 10) / 10,
      errorRate: Math.round(data.metrics.error_rate[index] * 10) / 10,
      completionRate: Math.round(data.metrics.completion_rate[index] * 10) / 10,
    }));
  }, [data]);

  // Completion funnel data
  const funnelData = useMemo(() => {
    if (!data) return [];

    const totalVisits = data.summary.total_responses * 1.3; // Estimate visits
    const started = data.summary.total_responses;
    const completed = Math.round(
      started * (data.summary.completion_rate / 100),
    );

    return [
      { stage: 'Visits', count: Math.round(totalVisits), percentage: 100 },
      {
        stage: 'Started',
        count: started,
        percentage: Math.round((started / totalVisits) * 100),
      },
      {
        stage: 'Completed',
        count: completed,
        percentage: Math.round((completed / totalVisits) * 100),
      },
    ];
  }, [data]);

  // Optimized data fetching
  const fetchAnalytics = useCallback(
    async (useCache = true) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          client_id: clientId,
          start_date: dateRange.start,
          end_date: dateRange.end,
          granularity,
          use_cache: useCache.toString(),
        });

        const response = await fetch(`/api/analytics/responses?${params}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');

        const result = await response.json();

        // Mock additional insights data (would come from actual API)
        const enhancedData = {
          ...result.data,
          insights: {
            trending_fields: ['email', 'venue_date', 'guest_count'],
            abandonment_points: ['Step 3: Vendor Selection', 'Step 5: Payment'],
            performance_score: Math.round(
              result.data.summary.overall_success_rate,
            ),
            recommendations: [
              'Consider simplifying Step 3 to reduce abandonment',
              'Add progress indicators to improve completion rates',
              'Optimize for mobile devices based on traffic patterns',
            ],
          },
        };

        setData(enhancedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [clientId, dateRange, granularity],
  );

  // Export functionality
  const handleExport = useCallback(
    async (format: 'json' | 'csv' = 'csv') => {
      setIsExporting(true);
      setExportProgress(0);

      try {
        const response = await fetch('/api/analytics/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            start_date: dateRange.start,
            end_date: dateRange.end,
            format,
            filters: { status: filterStatus, search: searchTerm },
          }),
        });

        if (!response.ok) throw new Error('Export failed');

        // Handle streaming download
        const reader = response.body?.getReader();
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            setExportProgress(Math.min((receivedLength / 1000000) * 100, 95)); // Rough estimate
          }
        }

        const blob = new Blob(chunks, {
          type: format === 'csv' ? 'text/csv' : 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `response_analytics_${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);

        setExportProgress(100);
        setTimeout(() => setExportProgress(0), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setIsExporting(false);
      }
    },
    [clientId, dateRange, filterStatus, searchTerm],
  );

  // Auto-refresh
  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(() => fetchAnalytics(), 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select
            value={granularity}
            onValueChange={(value: any) => setGranularity(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Hourly</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-48"
            />
          </div>

          <Button
            onClick={() => fetchAnalytics(false)}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('csv')}
            disabled={isExporting || !data}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            disabled={isExporting || !data}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Exporting data...</div>
          <Progress value={exportProgress} className="w-full" />
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="border-l-4"
            style={{ borderLeftColor: colors.primary }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Responses
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.summary.total_responses.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Peak: {data.summary.peak_hour}
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4"
            style={{ borderLeftColor: colors.success }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data.summary.completion_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.summary.most_common_device} traffic
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4"
            style={{ borderLeftColor: colors.warning }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.summary.avg_response_time.toFixed(2)}s
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                95th percentile: {data.metrics.p95_response_time[0]?.toFixed(2)}
                s
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4"
            style={{ borderLeftColor: colors.wedding.dustyRose }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Performance Score
              </CardTitle>
              <CheckCircle
                className="h-4 w-4"
                style={{ color: colors.wedding.dustyRose }}
              />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                style={{ color: colors.wedding.dustyRose }}
              >
                {data.insights.performance_score}/100
              </div>
              <div className="flex gap-1 mt-1">
                {data.insights.trending_fields.map((field, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      {data && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Response Volume Over Time
                <Badge variant="outline">Live</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="responseGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={colors.primary}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={colors.primary}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="responses"
                    stroke={colors.primary}
                    fillOpacity={1}
                    fill="url(#responseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Completion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((stage, index) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: `hsl(${260 - index * 30}, 70%, 60%)`,
                        }}
                      />
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {stage.count.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stage.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Conversion Rate: {funnelData[2]?.percentage}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success & Error Rates */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Success & Error Rates Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `${value}%`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="successRate"
                    stroke={colors.success}
                    name="Success Rate"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke={colors.wedding.sage}
                    name="Completion Rate"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    stroke={colors.error}
                    name="Error Rate"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights & Recommendations */}
      {data?.insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Trending Fields</h4>
                <div className="flex flex-wrap gap-2">
                  {data.insights.trending_fields.map((field, index) => (
                    <Badge
                      key={index}
                      style={{ backgroundColor: colors.wedding.lavender }}
                    >
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Abandonment Points</h4>
                <div className="space-y-1">
                  {data.insights.abandonment_points.map((point, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <XCircle className="h-3 w-3 text-red-500" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: colors.wedding.champagne }}
                  >
                    <div className="text-sm">{rec}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw
              className="h-6 w-6 animate-spin"
              style={{ color: colors.primary }}
            />
            <span>Loading analytics data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseAnalyticsDashboard;
