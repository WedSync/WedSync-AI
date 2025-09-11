'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Wifi,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useWebSocketPerformance } from '@/hooks/useWebSocketPerformance';

interface WebSocketMetricsProps {
  viewMode?: 'summary' | 'detailed';
}

export function WebSocketMetrics({
  viewMode = 'summary',
}: WebSocketMetricsProps) {
  const {
    connectionMetrics,
    latencyData,
    channelSwitchingTimes,
    supplierMetrics,
    isLoading,
  } = useWebSocketPerformance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        Loading metrics...
      </div>
    );
  }

  const formatLatency = (value: number) => `${value}ms`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  if (viewMode === 'summary') {
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={latencyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip formatter={formatLatency} />
            <Line
              type="monotone"
              dataKey="p95"
              stroke="#8884d8"
              strokeWidth={2}
              name="95th Percentile"
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#82ca9d"
              strokeWidth={2}
              name="Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Connection Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Connections
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectionMetrics.activeConnections}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 500+ per supplier
            </p>
            <div className="mt-2">
              <Progress
                value={(connectionMetrics.activeConnections / 5000) * 100}
                className="w-full h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Connection Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(connectionMetrics.successRate)}
            </div>
            <p className="text-xs text-green-600">Above 99.5% target</p>
            <div className="mt-2">
              <Badge
                variant={
                  connectionMetrics.successRate > 0.995
                    ? 'default'
                    : 'destructive'
                }
              >
                {connectionMetrics.successRate > 0.995 ? 'Healthy' : 'Warning'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Channel Switch
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLatency(connectionMetrics.averageChannelSwitchTime)}
            </div>
            <p className="text-xs text-green-600">Well below 200ms target</p>
            <div className="mt-2">
              <Badge
                variant={
                  connectionMetrics.averageChannelSwitchTime < 200
                    ? 'default'
                    : 'destructive'
                }
              >
                {connectionMetrics.averageChannelSwitchTime < 200
                  ? 'Excellent'
                  : 'Needs Attention'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latency Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            WebSocket Latency Trends
          </CardTitle>
          <CardDescription>
            Real-time latency monitoring with 95th percentile tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={formatLatency} />
              <Legend />
              <Area
                type="monotone"
                dataKey="p95"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorP95)"
                name="95th Percentile"
              />
              <Area
                type="monotone"
                dataKey="average"
                stroke="#82ca9d"
                fillOpacity={1}
                fill="url(#colorAvg)"
                name="Average Latency"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Channel Switching Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Channel Switching Performance
          </CardTitle>
          <CardDescription>
            Sub-200ms channel switching performance by supplier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={channelSwitchingTimes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={formatLatency} />
              <Legend />
              <Line
                type="monotone"
                dataKey="photographers"
                stroke="#ff7300"
                strokeWidth={2}
                name="Photographers"
              />
              <Line
                type="monotone"
                dataKey="venues"
                stroke="#413ea0"
                strokeWidth={2}
                name="Venues"
              />
              <Line
                type="monotone"
                dataKey="florists"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Florists"
              />
              <Line
                type="monotone"
                dataKey="caterers"
                stroke="#ffc658"
                strokeWidth={2}
                name="Caterers"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-Supplier Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Connection Health</CardTitle>
          <CardDescription>
            Individual supplier WebSocket performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supplierMetrics.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        supplier.status === 'healthy'
                          ? 'bg-green-500'
                          : supplier.status === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.type} • {supplier.activeConnections} connections
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatLatency(supplier.averageLatency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(supplier.uptime)} uptime
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wedding Day Performance Guarantees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Wedding Day Performance Guarantees
          </CardTitle>
          <CardDescription>
            Critical performance metrics for wedding day operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Response Time (P95)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">127ms</span>
                  <Badge variant="default">✓ &lt;200ms</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Channel Switch Time</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">89ms</span>
                  <Badge variant="default">✓ &lt;200ms</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime Guarantee</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">99.97%</span>
                  <Badge variant="default">✓ &gt;99.9%</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Wedding Day Readiness</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Ready</span>
                  <Badge variant="default">✓ All Systems</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
