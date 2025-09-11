'use client';

// APIAnalyticsDashboard.tsx
// WS-072: API Analytics and Monitoring Dashboard
// Real-time monitoring and analytics for API key usage

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Globe,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface APIUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  dataTransferred: number;
  uniqueEndpoints: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  hourlyUsage: Array<{ hour: string; requests: number; errors: number }>;
  recentErrors: Array<{
    endpoint: string;
    error: string;
    timestamp: string;
    statusCode: number;
  }>;
}

interface RateLimitMetrics {
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
  limits: {
    minute: number;
    hour: number;
    day: number;
  };
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
}

export function APIAnalyticsDashboard() {
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [metrics, setMetrics] = useState<APIUsageMetrics | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitMetrics | null>(null);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [selectedKey, timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAPIKeys(), loadMetrics(), loadRateLimits()]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAPIKeys = async () => {
    const response = await fetch('/api/api-keys');
    if (response.ok) {
      const { data } = await response.json();
      setApiKeys(data.map((key: any) => ({ id: key.id, name: key.name })));
    }
  };

  const loadMetrics = async () => {
    const params = new URLSearchParams({
      timeRange,
      ...(selectedKey !== 'all' && { keyId: selectedKey }),
    });

    const response = await fetch(`/api/api-keys/analytics?${params}`);
    if (response.ok) {
      const { data } = await response.json();
      setMetrics(data);
    }
  };

  const loadRateLimits = async () => {
    if (selectedKey === 'all') return;

    const response = await fetch(`/api/api-keys/${selectedKey}/rate-limits`);
    if (response.ok) {
      const { data } = await response.json();
      setRateLimits(data);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRateLimitColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRateLimitProgress = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">API Analytics</h2>
          <p className="text-gray-600">
            Monitor API usage, performance, and integration health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select API Key" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All API Keys</SelectItem>
              {apiKeys.map((key) => (
                <SelectItem key={key.id} value={key.id}>
                  {key.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-gray-500">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics ? formatNumber(metrics.totalRequests) : '0'}
            </div>
            <p className="text-xs text-gray-600">
              {timeRange === '1h'
                ? 'in the last hour'
                : timeRange === '24h'
                  ? 'in the last 24 hours'
                  : timeRange === '7d'
                    ? 'in the last 7 days'
                    : 'in the last 30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics && metrics.totalRequests > 0
                ? (
                    (metrics.successfulRequests / metrics.totalRequests) *
                    100
                  ).toFixed(1)
                : '0'}
              %
            </div>
            <p className="text-xs text-gray-600">
              {metrics ? formatNumber(metrics.successfulRequests) : '0'}{' '}
              successful requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics ? Math.round(metrics.avgResponseTime) : '0'}ms
            </div>
            <p className="text-xs text-gray-600">
              Average across all endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics ? metrics.errorRate.toFixed(1) : '0'}%
            </div>
            <p className="text-xs text-gray-600">
              {metrics ? formatNumber(metrics.failedRequests) : '0'} failed
              requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limits (for individual keys) */}
      {selectedKey !== 'all' && rateLimits && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Rate Limits
            </CardTitle>
            <CardDescription>
              Current usage against configured limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Per Minute</span>
                  <span
                    className={`text-sm font-bold ${getRateLimitColor(rateLimits.currentUsage.minute, rateLimits.limits.minute)}`}
                  >
                    {rateLimits.currentUsage.minute} /{' '}
                    {rateLimits.limits.minute}
                  </span>
                </div>
                <Progress
                  value={getRateLimitProgress(
                    rateLimits.currentUsage.minute,
                    rateLimits.limits.minute,
                  )}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rateLimits.remaining.minute} remaining
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Per Hour</span>
                  <span
                    className={`text-sm font-bold ${getRateLimitColor(rateLimits.currentUsage.hour, rateLimits.limits.hour)}`}
                  >
                    {rateLimits.currentUsage.hour} / {rateLimits.limits.hour}
                  </span>
                </div>
                <Progress
                  value={getRateLimitProgress(
                    rateLimits.currentUsage.hour,
                    rateLimits.limits.hour,
                  )}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rateLimits.remaining.hour} remaining
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Per Day</span>
                  <span
                    className={`text-sm font-bold ${getRateLimitColor(rateLimits.currentUsage.day, rateLimits.limits.day)}`}
                  >
                    {rateLimits.currentUsage.day} / {rateLimits.limits.day}
                  </span>
                </div>
                <Progress
                  value={getRateLimitProgress(
                    rateLimits.currentUsage.day,
                    rateLimits.limits.day,
                  )}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rateLimits.remaining.day} remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Endpoints & Recent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Top Endpoints
            </CardTitle>
            <CardDescription>
              Most frequently accessed API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && metrics.topEndpoints.length > 0 ? (
              <div className="space-y-3">
                {metrics.topEndpoints.map((endpoint, index) => (
                  <div
                    key={endpoint.endpoint}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium truncate">
                        {endpoint.endpoint}
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg: {Math.round(endpoint.avgTime)}ms
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {formatNumber(endpoint.count)}
                      </div>
                      <div className="text-xs text-gray-500">requests</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No endpoint data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Recent Errors
            </CardTitle>
            <CardDescription>Latest API errors and issues</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && metrics.recentErrors.length > 0 ? (
              <div className="space-y-3">
                {metrics.recentErrors.map((error, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono text-sm truncate">
                        {error.endpoint}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {error.statusCode}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 truncate">
                      {error.error}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                No recent errors
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Usage Trends
          </CardTitle>
          <CardDescription>
            Request volume and error rates over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && metrics.hourlyUsage.length > 0 ? (
            <div className="space-y-2">
              {metrics.hourlyUsage.map((hour, index) => (
                <div key={hour.hour} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-gray-600">{hour.hour}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min((hour.requests / Math.max(...metrics.hourlyUsage.map((h) => h.requests))) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {hour.requests}
                      </span>
                      {hour.errors > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {hour.errors} errors
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No usage data available for the selected time range
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
