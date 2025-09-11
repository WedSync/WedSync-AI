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
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';

// Lazy load chart components for better performance
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
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
  };
  summary: {
    total_responses: number;
    avg_response_time: number;
    overall_success_rate: number;
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
    }));
  }, [data]);

  // Optimized data fetching with caching
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
        setData(result.data);

        // Show cache status for debugging
        if (result.cached) {
          console.log(
            'Analytics data served from cache, TTL:',
            result.cache_ttl,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [clientId, dateRange, granularity],
  );

  // Optimized export with progress tracking
  const handleExport = useCallback(
    async (format: 'json' | 'csv' = 'csv') => {
      setIsExporting(true);
      setExportProgress(0);

      try {
        // Get export metadata first
        const metadataResponse = await fetch(
          `/api/analytics/export?client_id=${clientId}&start_date=${dateRange.start}&end_date=${dateRange.end}`,
        );
        const metadata = await metadataResponse.json();

        if (metadata.estimated_records > 100000) {
          const confirmed = confirm(
            `This export will contain approximately ${metadata.estimated_records.toLocaleString()} records ` +
              `and take about ${metadata.estimated_time_seconds} seconds. Continue?`,
          );
          if (!confirmed) {
            setIsExporting(false);
            return;
          }
        }

        // Start streaming export
        const response = await fetch('/api/analytics/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            start_date: dateRange.start,
            end_date: dateRange.end,
            format,
            batch_size: metadata.recommended_batch_size,
          }),
        });

        if (!response.ok) throw new Error('Export failed');

        // Handle streaming download with progress
        const reader = response.body?.getReader();
        const contentLength = metadata.estimated_size_kb * 1024;
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            setExportProgress(
              Math.min((receivedLength / contentLength) * 100, 95),
            );
          }
        }

        // Create and download file
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
    [clientId, dateRange],
  );

  // Auto-refresh for real-time data
  useEffect(() => {
    fetchAnalytics();

    // Set up auto-refresh based on date range
    const now = new Date();
    const endDate = new Date(dateRange.end);
    const isRecentData =
      now.getTime() - endDate.getTime() < 24 * 60 * 60 * 1000;

    if (isRecentData) {
      const interval = setInterval(() => fetchAnalytics(), 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics]);

  if (error) {
    return (
      <Alert data-testid="error-alert">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics(false)}
          data-testid="retry-button"
          className="ml-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
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
            data-testid="export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            disabled={isExporting || !data}
            variant="outline"
            size="sm"
            data-testid="export-json"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-2" data-testid="export-progress">
          <div className="text-sm text-muted-foreground">Exporting data...</div>
          <Progress value={exportProgress} className="w-full" />
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="summary-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Responses
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-responses">
                {data.summary.total_responses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="summary-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid="avg-response-time"
              >
                {data.summary.avg_response_time.toFixed(2)}s
              </div>
            </CardContent>
          </Card>

          <Card data-testid="summary-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold text-green-600"
                data-testid="completion-rate"
              >
                {data.summary.overall_success_rate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card data-testid="summary-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold text-red-600"
                data-testid="performance-score"
              >
                {(100 - data.summary.overall_success_rate).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {data && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Response Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} data-testid="response-chart">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="responses"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Response Times</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `${value}s`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgTime"
                    stroke="#82ca9d"
                    name="Average"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="p95Time"
                    stroke="#ffc658"
                    name="95th Percentile"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Success Rate Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Success & Error Rates</CardTitle>
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
                    stroke="#22c55e"
                    name="Success Rate"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    stroke="#ef4444"
                    name="Error Rate"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div
          className="flex items-center justify-center h-64"
          data-testid="analytics-skeleton"
        >
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading analytics data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseAnalyticsDashboard;
