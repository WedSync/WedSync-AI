'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Clock,
  Key,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Shield,
  Database,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface APIMetrics {
  currentHourRequests: number;
  currentDayRequests: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: { endpoint: string; requests: number }[];
}

interface APIUsageAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  topEndpoints: { endpoint: string; count: number; avgResponseTime: number }[];
  errorBreakdown: { error: string; count: number }[];
  tierUsageBreakdown: { tier: string; requests: number; percentage: number }[];
  peakHours: { hour: number; requests: number }[];
}

interface APIAlert {
  id: string;
  type:
    | 'rate_limit_exceeded'
    | 'unusual_activity'
    | 'error_spike'
    | 'performance_degradation'
    | 'quota_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  supplierId?: string;
  userId?: string;
  endpoint?: string;
  threshold: number;
  actualValue: number;
  triggeredAt: Date;
  acknowledged: boolean;
}

interface APIKey {
  id: string;
  name: string;
  scopes: string[];
  rateLimitTier: string;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  requestCount: number;
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function APIAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<APIMetrics | null>(null);
  const [analytics, setAnalytics] = useState<APIUsageAnalytics | null>(null);
  const [alerts, setAlerts] = useState<APIAlert[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'hour' | 'day' | 'week' | 'month'
  >('day');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/api-analytics/realtime');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
    }
  };

  const fetchAnalytics = async (period: 'hour' | 'day' | 'week' | 'month') => {
    try {
      const response = await fetch(`/api/admin/api-analytics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/api-analytics/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchAPIKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMetrics(),
        fetchAnalytics(selectedPeriod),
        fetchAlerts(),
        fetchAPIKeys(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [selectedPeriod]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchMetrics();
    fetchAnalytics(selectedPeriod);
    fetchAlerts();
    fetchAPIKeys();
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/admin/api-analytics/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      setAlerts(
        alerts.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert,
        ),
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return '#8b5cf6';
      case 'premium':
        return '#3b82f6';
      case 'basic':
        return '#10b981';
      case 'free':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
    return ms + 'ms';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading API analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            API Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor API usage, performance, and security across your WedSync
            platform
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter((alert) => !alert.acknowledged).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts
                .filter((alert) => !alert.acknowledged)
                .map((alert) => (
                  <Alert
                    key={alert.id}
                    className={getSeverityColor(alert.severity)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{alert.type.replace(/_/g, ' ').toUpperCase()}</span>
                      <Badge variant="outline">{alert.severity}</Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>{alert.message}</p>
                      {alert.endpoint && (
                        <p className="text-sm font-mono mt-1">
                          Endpoint: {alert.endpoint}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-muted-foreground">
                          Triggered:{' '}
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Hour Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics?.currentHourRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.currentDayRequests
                ? `${((metrics.currentHourRequests / metrics.currentDayRequests) * 100).toFixed(1)}% of daily`
                : 'No daily data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatResponseTime(metrics?.averageResponseTime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(metrics?.averageResponseTime || 0) < 500 ? (
                <span className="text-green-600">✓ Excellent</span>
              ) : (metrics?.averageResponseTime || 0) < 1000 ? (
                <span className="text-yellow-600">⚠ Good</span>
              ) : (
                <span className="text-red-600">⚠ Needs attention</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.errorRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {(metrics?.errorRate || 0) < 1 ? (
                <span className="text-green-600">✓ Excellent</span>
              ) : (metrics?.errorRate || 0) < 5 ? (
                <span className="text-yellow-600">⚠ Acceptable</span>
              ) : (
                <span className="text-red-600">⚠ High error rate</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter((key) => key.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {apiKeys.length} total keys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="tiers">Usage by Tier</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm font-medium">Time Period:</span>
            {(['hour', 'day', 'week', 'month'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.totalRequests || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalRequests
                    ? (
                        (analytics.successfulRequests /
                          analytics.totalRequests) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rate Limited</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.rateLimitedRequests || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">P95 Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatResponseTime(analytics?.p95ResponseTime || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Peak Hours Chart */}
          {analytics?.peakHours && analytics.peakHours.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Hours</CardTitle>
                <CardDescription>Request volume by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="requests" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top API Endpoints</CardTitle>
              <CardDescription>
                Most frequently accessed endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.topEndpoints
                  ?.slice(0, 10)
                  .map((endpoint, index) => (
                    <div
                      key={endpoint.endpoint}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <code className="text-sm font-mono">
                          {endpoint.endpoint}
                        </code>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span>{formatNumber(endpoint.count)} requests</span>
                        <span className="text-muted-foreground">
                          {formatResponseTime(endpoint.avgResponseTime)} avg
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage by Tier Tab */}
        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Subscription Tier</CardTitle>
              <CardDescription>
                API usage breakdown by plan type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.tierUsageBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ tier, percentage }) => `${tier}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="requests"
                  >
                    {(analytics?.tierUsageBreakdown || []).map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getTierColor(entry.tier)}
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Breakdown</CardTitle>
              <CardDescription>Types of errors encountered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.errorBreakdown?.map((error, index) => (
                  <div
                    key={error.error}
                    className="flex items-center justify-between p-2 bg-red-50 rounded"
                  >
                    <span className="font-mono text-sm">{error.error}</span>
                    <Badge variant="destructive">{error.count}</Badge>
                  </div>
                ))}
                {(!analytics?.errorBreakdown ||
                  analytics.errorBreakdown.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No errors detected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Overview of active API keys and their usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{key.name}</h3>
                        <Badge variant={key.isActive ? 'default' : 'secondary'}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">{key.rateLimitTier}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatNumber(key.requestCount)} requests
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Hourly Limit:
                        </span>
                        <div className="font-mono">
                          {formatNumber(key.maxRequestsPerHour)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Daily Limit:
                        </span>
                        <div className="font-mono">
                          {formatNumber(key.maxRequestsPerDay)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <div>
                          {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Last Used:
                        </span>
                        <div>
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleDateString()
                            : 'Never'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-muted-foreground text-sm">
                        Scopes:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {key.scopes.map((scope) => (
                          <Badge
                            key={scope}
                            variant="outline"
                            className="text-xs"
                          >
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No API keys found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
