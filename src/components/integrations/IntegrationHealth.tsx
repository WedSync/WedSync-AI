/**
 * WS-165: Integration Health Monitoring Dashboard
 * Real-time monitoring of payment calendar integration services
 * Team C Integration Implementation
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Mail,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
  errorRate: number;
  throughput: number;
  version: string;
}

interface IntegrationMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  activeConnections: number;
  dataSync: {
    lastSync: Date;
    syncSuccess: boolean;
    recordsProcessed: number;
  };
  notifications: {
    emailsSent: number;
    smsDelivered: number;
    deliveryRate: number;
  };
}

interface HealthAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export default function IntegrationHealth({
  weddingId,
}: {
  weddingId?: string;
}) {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealthData();
    // Set up real-time updates
    const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [weddingId]);

  const loadHealthData = async () => {
    try {
      setRefreshing(true);

      // Mock data - in production, fetch from actual health endpoints
      const mockServices: ServiceHealth[] = [
        {
          name: 'Budget Integration Service',
          status: 'healthy',
          uptime: 99.5,
          responseTime: 120,
          lastCheck: new Date(),
          errorRate: 0.2,
          throughput: 450,
          version: '1.2.3',
        },
        {
          name: 'Notification Service',
          status: 'healthy',
          uptime: 98.8,
          responseTime: 89,
          lastCheck: new Date(),
          errorRate: 1.1,
          throughput: 2100,
          version: '2.1.0',
        },
        {
          name: 'Vendor Payment Sync',
          status: 'degraded',
          uptime: 97.2,
          responseTime: 340,
          lastCheck: new Date(),
          errorRate: 3.5,
          throughput: 180,
          version: '1.0.8',
        },
        {
          name: 'Cash Flow Calculator',
          status: 'healthy',
          uptime: 99.9,
          responseTime: 65,
          lastCheck: new Date(),
          errorRate: 0.1,
          throughput: 320,
          version: '1.4.2',
        },
        {
          name: 'Real-time Sync Engine',
          status: 'healthy',
          uptime: 99.1,
          responseTime: 45,
          lastCheck: new Date(),
          errorRate: 0.8,
          throughput: 1800,
          version: '3.0.1',
        },
      ];

      const mockMetrics: IntegrationMetrics = {
        totalRequests: 45628,
        successRate: 98.3,
        averageResponseTime: 142,
        activeConnections: 234,
        dataSync: {
          lastSync: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          syncSuccess: true,
          recordsProcessed: 1247,
        },
        notifications: {
          emailsSent: 3456,
          smsDelivered: 892,
          deliveryRate: 97.8,
        },
      };

      const mockAlerts: HealthAlert[] = [
        {
          id: '1',
          type: 'warning',
          service: 'Vendor Payment Sync',
          message:
            'High response time detected - average 340ms over last 10 minutes',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          resolved: false,
        },
        {
          id: '2',
          type: 'info',
          service: 'Notification Service',
          message: 'Successfully processed 500 payment reminders',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          resolved: true,
        },
      ];

      setServices(mockServices);
      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const overallHealth =
    services.length > 0
      ? (services.filter((s) => s.status === 'healthy').length /
          services.length) *
        100
      : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Integration Health
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time monitoring of payment calendar integration services
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadHealthData}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Overall Health
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallHealth.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress value={overallHealth} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Services
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {services.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.successRate}%
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Response
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.averageResponseTime}ms
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.filter((a) => !a.resolved).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
          {alerts
            .filter((a) => !a.resolved)
            .map((alert) => (
              <Alert
                key={alert.id}
                className={
                  alert.type === 'error'
                    ? 'border-red-200 bg-red-50'
                    : alert.type === 'warning'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-blue-200 bg-blue-50'
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{alert.service}</strong>: {alert.message}
                  <span className="ml-2 text-xs text-gray-500">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </AlertDescription>
              </Alert>
            ))}
        </div>
      )}

      {/* Service Details Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alert History</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <Badge
                      className={`gap-1 ${getStatusColor(service.status)}`}
                    >
                      {getStatusIcon(service.status)}
                      {service.status}
                    </Badge>
                  </div>
                  <CardDescription>v{service.version}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-600">Uptime</p>
                      <p className="text-lg font-semibold">{service.uptime}%</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Response Time</p>
                      <p className="text-lg font-semibold">
                        {service.responseTime}ms
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Error Rate</p>
                      <p className="text-lg font-semibold">
                        {service.errorRate}%
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Throughput</p>
                      <p className="text-lg font-semibold">
                        {service.throughput}/min
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      Last checked: {service.lastCheck.toLocaleTimeString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Synchronization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Sync</span>
                    <span className="text-sm text-gray-600">
                      {metrics.dataSync.lastSync.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge
                      className={
                        metrics.dataSync.syncSuccess
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {metrics.dataSync.syncSuccess ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Records Processed
                    </span>
                    <span className="text-sm font-semibold">
                      {metrics.dataSync.recordsProcessed.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Emails Sent</span>
                    <span className="text-sm font-semibold">
                      {metrics.notifications.emailsSent.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SMS Delivered</span>
                    <span className="text-sm font-semibold">
                      {metrics.notifications.smsDelivered.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Delivery Rate</span>
                    <span className="text-sm font-semibold">
                      {metrics.notifications.deliveryRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Request Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Requests</span>
                    <span className="text-sm font-semibold">
                      {metrics.totalRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm font-semibold">
                      {metrics.successRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Active Connections
                    </span>
                    <span className="text-sm font-semibold">
                      {metrics.activeConnections}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Syncs</span>
                    <span className="text-sm font-semibold">247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Reminder Accuracy
                    </span>
                    <span className="text-sm font-semibold">99.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Budget Calculations
                    </span>
                    <span className="text-sm font-semibold">1,456</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                className={
                  alert.resolved
                    ? 'bg-gray-50 border-gray-200'
                    : alert.type === 'error'
                      ? 'border-red-200 bg-red-50'
                      : alert.type === 'warning'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {alert.type === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-sm">{alert.service}</strong>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-xs">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
