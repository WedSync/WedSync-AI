/**
 * WS-155: Operational Dashboard Component
 * Team C - Batch 15 - Round 3
 * Real-time monitoring dashboard for guest communications integration
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  Database,
  Globe,
  Users,
} from 'lucide-react';

interface ProviderStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  uptime: number;
  lastHealthCheck: Date;
}

interface SLAViolation {
  provider: string;
  metric: string;
  expected: number;
  actual: number;
  violationTime: Date;
  severity: 'warning' | 'critical';
}

interface DashboardMetrics {
  totalMessages: number;
  messagesPerMinute: number;
  averageResponseTime: number;
  overallSuccessRate: number;
  activeConnections: number;
  queuedMessages: number;
}

const WS155OperationalDashboard: React.FC = () => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMessages: 0,
    messagesPerMinute: 0,
    averageResponseTime: 0,
    overallSuccessRate: 0,
    activeConnections: 0,
    queuedMessages: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL ||
        'ws://localhost:3000/api/ws/monitoring';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Monitoring WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'metrics:update':
            updateProviderMetrics(data.provider, data.metrics);
            break;
          case 'sla:violation':
            addSLAViolation(data.violation);
            break;
          case 'dashboard:metrics':
            setMetrics(data.metrics);
            break;
          default:
            console.log('Unknown message type:', data.type);
        }

        setLastUpdate(new Date());
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');

        // Reconnect after 5 seconds
        if (autoRefresh) {
          setTimeout(connectWebSocket, 5000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoRefresh]);

  // Fetch initial data
  useEffect(() => {
    fetchProviderStatuses();
    fetchSLAViolations();
    fetchDashboardMetrics();
  }, []);

  const updateProviderMetrics = (
    providerName: string,
    newMetrics: ProviderStatus,
  ) => {
    setProviders((prev) => {
      const existing = prev.find((p) => p.provider === providerName);
      if (existing) {
        return prev.map((p) => (p.provider === providerName ? newMetrics : p));
      } else {
        return [...prev, newMetrics];
      }
    });
  };

  const addSLAViolation = (violation: SLAViolation) => {
    setViolations((prev) => [violation, ...prev.slice(0, 9)]); // Keep last 10 violations
  };

  const fetchProviderStatuses = async () => {
    try {
      const response = await fetch('/api/monitoring/providers/status');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Failed to fetch provider statuses:', error);
    }
  };

  const fetchSLAViolations = async () => {
    try {
      const response = await fetch('/api/monitoring/sla/violations?limit=10');
      const data = await response.json();
      setViolations(data);
    } catch (error) {
      console.error('Failed to fetch SLA violations:', error);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/dashboard/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'twilio':
        return <Phone className="h-5 w-5" />;
      case 'sendgrid':
      case 'resend':
        return <Mail className="h-5 w-5" />;
      case 'slack':
        return <MessageSquare className="h-5 w-5" />;
      case 'whatsapp':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500 text-white';
      case 'degraded':
        return 'bg-yellow-500 text-white';
      case 'unhealthy':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatResponseTime = (time: number) => {
    return `${time.toFixed(0)}ms`;
  };

  const formatThroughput = (throughput: number) => {
    if (throughput > 1000) {
      return `${(throughput / 1000).toFixed(1)}k/hr`;
    }
    return `${throughput}/hr`;
  };

  return (
    <div className="p-6 space-y-6" data-testid="ws155-operational-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Guest Communications - Production Monitoring
          </h1>
          <p className="text-muted-foreground">
            WS-155 Integration Status Dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Disconnected</span>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {metrics.totalMessages.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Messages
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {metrics.messagesPerMinute}
                </div>
                <div className="text-sm text-muted-foreground">Msgs/Min</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatResponseTime(metrics.averageResponseTime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Response
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {metrics.overallSuccessRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Success Rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {metrics.activeConnections}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Conns
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {metrics.queuedMessages}
                </div>
                <div className="text-sm text-muted-foreground">Queued</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Status */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Provider Status
              </CardTitle>
              <CardDescription>
                Real-time health monitoring of communication providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div
                    key={provider.provider}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getProviderIcon(provider.provider)}
                        <div>
                          <h3 className="font-semibold capitalize">
                            {provider.provider}
                          </h3>
                          <Badge className={getStatusColor(provider.status)}>
                            {provider.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {provider.lastHealthCheck.toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Response Time</div>
                        <div
                          className={
                            provider.responseTime > 3000
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {formatResponseTime(provider.responseTime)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Success Rate</div>
                        <div
                          className={
                            provider.successRate < 95
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {provider.successRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Error Rate</div>
                        <div
                          className={
                            provider.errorRate > 5
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {provider.errorRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Throughput</div>
                        <div>{formatThroughput(provider.throughput)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Uptime</div>
                        <div
                          className={
                            provider.uptime < 99
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {formatUptime(provider.uptime)}
                        </div>
                      </div>
                    </div>

                    {/* Status indicators */}
                    <div className="flex gap-2 mt-3">
                      {provider.responseTime > 3000 && (
                        <Badge variant="destructive" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Slow Response
                        </Badge>
                      )}
                      {provider.successRate < 95 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low Success Rate
                        </Badge>
                      )}
                      {provider.uptime < 99 && (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Poor Uptime
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {providers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No provider data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SLA Violations */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                SLA Violations
              </CardTitle>
              <CardDescription>Recent service level violations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {violations.map((violation, index) => (
                  <Alert
                    key={index}
                    className={getSeverityColor(violation.severity)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">{violation.provider}</div>
                      <div className="text-sm">
                        {violation.metric}: {violation.actual}
                        {violation.metric.includes('Time') ? 'ms' : '%'}
                        (Expected: {violation.expected}
                        {violation.metric.includes('Time') ? 'ms' : '%'})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {violation.violationTime.toLocaleString()}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}

                {violations.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div>No SLA violations</div>
                    <div className="text-sm">
                      All providers meeting SLA requirements
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Overall Health</span>
                  <Badge
                    className={getStatusColor(
                      providers.every((p) => p.status === 'healthy')
                        ? 'healthy'
                        : providers.some((p) => p.status === 'unhealthy')
                          ? 'unhealthy'
                          : 'degraded',
                    )}
                  >
                    {providers.every((p) => p.status === 'healthy')
                      ? 'Healthy'
                      : providers.some((p) => p.status === 'unhealthy')
                        ? 'Unhealthy'
                        : 'Degraded'}
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span>WebSocket Connection</span>
                  <Badge
                    className={
                      isConnected
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span>Auto-refresh</span>
                  <Badge variant={autoRefresh ? 'default' : 'outline'}>
                    {autoRefresh ? 'On' : 'Off'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span>Active Providers</span>
                  <Badge variant="outline">
                    {providers.filter((p) => p.status !== 'unhealthy').length} /{' '}
                    {providers.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WS155OperationalDashboard;
