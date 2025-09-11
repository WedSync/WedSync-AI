/**
 * WS-339 Performance Monitoring System - Performance Dashboard
 * Wedding-specific performance monitoring dashboard for vendors
 * Real-time monitoring with wedding day critical alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Heart,
  Camera,
  Zap,
  Globe,
  Server,
  AlertCircle,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardData {
  overview: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    serviceUptime: number;
    weddingDayPerformance: number;
    weddingReadiness: number;
    activeAlertsCount: number;
  };
  services: Array<{
    name: string;
    displayName: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown' | 'maintenance';
    responseTime: number;
    availability: number;
    errorRate: number;
    weddingCritical: boolean;
    lastCheck: string;
    statusHistory: Array<{ timestamp: string; status: string }>;
  }>;
  performanceByService: Array<{
    name: string;
    totalRequests: number;
    averageResponse: number;
    errorCount: number;
    errorRate: number;
    weddingDayRequests: number;
  }>;
  timeSeriesData: Array<{
    timestamp: string;
    averageResponseTime: number;
    errorRate: number;
    totalRequests: number;
    weddingDayRequests: number;
  }>;
  webVitals: {
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
    score: 'good' | 'needs-improvement' | 'poor';
  };
  cdnPerformance: {
    averageLoadTime: number;
    cacheHitRate: number;
    totalAssets: number;
    errorRate: number;
  };
  activeAlerts: Array<{
    id: string;
    alertName: string;
    severity: 'info' | 'warning' | 'critical' | 'emergency';
    triggeredAt: string;
    metricValue: number;
    threshold: number;
    isWeddingDay: boolean;
  }>;
  weddingCriticalServices: Array<{
    name: string;
    status: string;
    responseTime: number;
    availability: number;
  }>;
}

export function PerformanceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/monitoring/dashboard?timeRange=${timeRange}`,
      );
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const getStatusBadge = (status: string, isWeddingCritical = false) => {
    const baseClass = isWeddingCritical ? 'ring-2 ring-offset-1' : '';

    switch (status) {
      case 'healthy':
        return (
          <Badge
            className={`bg-green-100 text-green-800 hover:bg-green-200 ${baseClass} ${isWeddingCritical ? 'ring-green-300' : ''}`}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'warning':
        return (
          <Badge
            className={`bg-yellow-100 text-yellow-800 hover:bg-yellow-200 ${baseClass} ${isWeddingCritical ? 'ring-yellow-300' : ''}`}
          >
            <Clock className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      case 'critical':
        return (
          <Badge
            className={`bg-red-100 text-red-800 hover:bg-red-200 ${baseClass} ${isWeddingCritical ? 'ring-red-300' : ''}`}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Critical
          </Badge>
        );
      case 'maintenance':
        return (
          <Badge
            className={`bg-blue-100 text-blue-800 hover:bg-blue-200 ${baseClass} ${isWeddingCritical ? 'ring-blue-300' : ''}`}
          >
            <Server className="w-3 h-3 mr-1" />
            Maintenance
          </Badge>
        );
      default:
        return (
          <Badge
            className={`bg-gray-100 text-gray-800 hover:bg-gray-200 ${baseClass}`}
          >
            Unknown
          </Badge>
        );
    }
  };

  const getWebVitalsBadge = (score: string) => {
    switch (score) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800">Good</Badge>;
      case 'needs-improvement':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            Needs Improvement
          </Badge>
        );
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getTrendIcon = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return isGood ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading wedding performance data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
        Failed to load performance data
      </div>
    );
  }

  const isWeddingDay = new Date().getDay() === 6; // Saturday

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Performance Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">
            Wedding vendor performance dashboard with real-time monitoring
            {isWeddingDay && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Heart className="w-3 h-3 mr-1" />
                Wedding Day Active
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Wedding Day Alert */}
      {isWeddingDay && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-red-900">
                  Wedding Day Active
                </h3>
                <p className="text-sm text-red-700">
                  Enhanced monitoring is active. All thresholds are stricter and
                  alerts escalated immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.averageResponseTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Wedding day avg: {data.overview.weddingDayPerformance}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.totalRequests} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Service Uptime
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.serviceUptime}%
            </div>
            <p className="text-xs text-muted-foreground">
              All critical services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wedding Readiness
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.weddingReadiness}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.overview.activeAlertsCount} active alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString()
                      }
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString()
                      }
                      formatter={(value: any, name: string) => [
                        `${value}${name.includes('Rate') ? '%' : 'ms'}`,
                        name,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="averageResponseTime"
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Response Time"
                    />
                    <Line
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#dc2626"
                      strokeWidth={2}
                      name="Error Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Web Vitals
                  {getWebVitalsBadge(data.webVitals.score)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">
                      LCP (Largest Contentful Paint)
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(data.webVitals.lcp)}ms
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: &lt;2500ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      FID (First Input Delay)
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(data.webVitals.fid)}ms
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: &lt;100ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      CLS (Cumulative Layout Shift)
                    </div>
                    <div className="text-2xl font-bold">
                      {data.webVitals.cls.toFixed(3)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: &lt;0.1
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      TTFB (Time to First Byte)
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(data.webVitals.ttfb)}ms
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: &lt;600ms
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CDN Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  CDN Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Avg Load Time</div>
                    <div className="text-2xl font-bold">
                      {data.cdnPerformance.averageLoadTime}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Cache Hit Rate</div>
                    <div className="text-2xl font-bold">
                      {data.cdnPerformance.cacheHitRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Total Assets</div>
                    <div className="text-2xl font-bold">
                      {data.cdnPerformance.totalAssets.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Error Rate</div>
                    <div className="text-2xl font-bold">
                      {data.cdnPerformance.errorRate}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wedding Critical Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  Wedding Critical Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.weddingCriticalServices.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium">
                          {service.name
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                        {getStatusBadge(service.status, true)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {service.responseTime}ms • {service.availability}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4">
            {data.services.map((service) => (
              <Card
                key={service.name}
                className={service.weddingCritical ? 'border-red-200' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg">
                      {service.weddingCritical && (
                        <Heart className="w-4 h-4 mr-2 text-red-500" />
                      )}
                      {service.displayName}
                    </CardTitle>
                    {getStatusBadge(service.status, service.weddingCritical)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Response Time</div>
                      <div className="text-2xl font-bold">
                        {service.responseTime}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Availability</div>
                      <div className="text-2xl font-bold">
                        {service.availability}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Error Rate</div>
                      <div className="text-2xl font-bold">
                        {service.errorRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Last Check</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(service.lastCheck).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Service</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.performanceByService}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="averageResponse"
                    fill="#2563eb"
                    name="Avg Response (ms)"
                  />
                  <Bar
                    dataKey="errorRate"
                    fill="#dc2626"
                    name="Error Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {data.activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Active Alerts</h3>
                  <p className="text-muted-foreground">
                    All systems are operating normally
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.activeAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border-${alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'yellow' : 'blue'}-200`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {alert.alertName}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {alert.isWeddingDay && (
                          <Badge className="bg-red-100 text-red-800">
                            Wedding Day
                          </Badge>
                        )}
                        <Badge
                          className={`${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium">Current Value</div>
                        <div className="text-2xl font-bold">
                          {alert.metricValue}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Threshold</div>
                        <div className="text-2xl font-bold">
                          {alert.threshold}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Triggered</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
        <span className="mx-2">•</span>
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}
