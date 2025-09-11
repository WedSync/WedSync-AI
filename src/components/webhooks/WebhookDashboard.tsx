'use client';

// WS-201 Team A - WebhookDashboard Main Component
// Production-ready webhook management dashboard for wedding suppliers
// Location: /wedsync/src/components/webhooks/WebhookDashboard.tsx

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  WebhookEndpoint,
  DeliveryMetrics,
  WebhookDelivery,
  getEndpointHealthStatus,
} from '@/types/webhooks';
import { EndpointConfiguration } from './EndpointConfiguration';
import { DeliveryMonitor } from './DeliveryMonitor';
import { EventSubscriptionManager } from './EventSubscriptionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Webhook,
  Activity,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  BarChart3,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WebhookDashboardProps {
  className?: string;
  refreshInterval?: number;
}

// Real-time webhook data fetching
const useWebhookData = (refreshInterval: number = 30000) => {
  const queryClient = useQueryClient();

  const {
    data: endpoints,
    isLoading: endpointsLoading,
    error: endpointsError,
  } = useQuery({
    queryKey: ['webhook-endpoints'],
    queryFn: async (): Promise<WebhookEndpoint[]> => {
      const response = await fetch('/api/webhooks/endpoints');
      if (!response.ok) {
        throw new Error('Failed to fetch webhook endpoints');
      }
      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 30000,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['webhook-metrics'],
    queryFn: async (): Promise<DeliveryMetrics[]> => {
      const response = await fetch('/api/webhooks/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch webhook metrics');
      }
      return response.json();
    },
    refetchInterval: refreshInterval,
    enabled: !!endpoints?.length,
  });

  const { data: recentDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['webhook-deliveries-recent'],
    queryFn: async (): Promise<WebhookDelivery[]> => {
      const response = await fetch(
        '/api/webhooks/deliveries?limit=10&recent=true',
      );
      if (!response.ok) {
        throw new Error('Failed to fetch recent deliveries');
      }
      return response.json();
    },
    refetchInterval: refreshInterval,
    enabled: !!endpoints?.length,
  });

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] });
    queryClient.invalidateQueries({ queryKey: ['webhook-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['webhook-deliveries-recent'] });
  };

  return {
    endpoints: endpoints || [],
    metrics: metrics || [],
    recentDeliveries: recentDeliveries || [],
    isLoading: endpointsLoading || metricsLoading || deliveriesLoading,
    error: endpointsError,
    refreshData,
  };
};

export function WebhookDashboard({
  className,
  refreshInterval = 30000,
}: WebhookDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<WebhookEndpoint | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    endpoints,
    metrics,
    recentDeliveries,
    isLoading,
    error,
    refreshData,
  } = useWebhookData(autoRefresh ? refreshInterval : 0);

  // Calculate overview statistics
  const overviewStats = {
    totalEndpoints: endpoints.length,
    activeEndpoints: endpoints.filter((e) => e.isActive).length,
    healthyEndpoints: metrics.filter(
      (m) => getEndpointHealthStatus(m) === 'healthy',
    ).length,
    totalDeliveries: metrics.reduce((sum, m) => sum + m.totalDeliveries, 0),
    successfulDeliveries: metrics.reduce(
      (sum, m) => sum + (m.totalDeliveries - m.failedDeliveries),
      0,
    ),
    averageSuccessRate:
      metrics.length > 0
        ? Math.round(
            metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length,
          )
        : 0,
  };

  const handleCreateEndpoint = () => {
    setSelectedEndpoint(null);
    setActiveTab('configuration');
  };

  const handleEditEndpoint = (endpoint: WebhookEndpoint) => {
    setSelectedEndpoint(endpoint);
    setActiveTab('configuration');
  };

  const handleEndpointSaved = () => {
    refreshData();
    setActiveTab('overview');
    toast.success('Webhook endpoint saved successfully');
  };

  const handleEndpointDeleted = () => {
    refreshData();
    setActiveTab('overview');
    toast.success('Webhook endpoint deleted');
  };

  if (error) {
    return (
      <div className={cn('p-6', className)}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
            <CardTitle className="text-red-800">
              Error Loading Webhook Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-4">
              Unable to load webhook data. Please check your connection and try
              again.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Webhook className="mr-3 h-8 w-8 text-primary-600" />
            Webhook Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage real-time integrations with your photography CRM and booking
            systems
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')}
            />
            Refresh
          </Button>

          <Button
            onClick={handleCreateEndpoint}
            className="flex items-center bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center">
            <Activity className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Deliveries</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center">
            <Zap className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Endpoints
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? '...' : overviewStats.totalEndpoints}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Webhook className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Endpoints
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {isLoading ? '...' : overviewStats.activeEndpoints}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
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
                      {isLoading
                        ? '...'
                        : `${overviewStats.averageSuccessRate}%`}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
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
                      Total Deliveries
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading
                        ? '...'
                        : overviewStats.totalDeliveries.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <Activity className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Endpoints List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Webhook Endpoints
                {isLoading && (
                  <Clock className="h-5 w-5 animate-pulse text-gray-400" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {endpoints.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    No webhook endpoints configured yet
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Create your first webhook to receive real-time notifications
                    from your wedding platform
                  </p>
                  <Button onClick={handleCreateEndpoint}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Webhook
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {endpoints.map((endpoint) => {
                    const endpointMetrics = metrics.find(
                      (m) => m.endpointId === endpoint.id,
                    );
                    const healthStatus = endpointMetrics
                      ? getEndpointHealthStatus(endpointMetrics)
                      : 'inactive';

                    return (
                      <div
                        key={endpoint.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant={
                                endpoint.isActive ? 'default' : 'secondary'
                              }
                              className={cn(
                                'text-xs',
                                endpoint.isActive
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800',
                              )}
                            >
                              {endpoint.isActive ? 'Active' : 'Inactive'}
                            </Badge>

                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                healthStatus === 'healthy' &&
                                  'border-green-300 text-green-700',
                                healthStatus === 'degraded' &&
                                  'border-yellow-300 text-yellow-700',
                                healthStatus === 'failing' &&
                                  'border-red-300 text-red-700',
                                healthStatus === 'inactive' &&
                                  'border-gray-300 text-gray-700',
                              )}
                            >
                              {healthStatus}
                            </Badge>
                          </div>

                          <p
                            className="font-medium text-gray-900 mt-2 truncate"
                            title={endpoint.url}
                          >
                            {endpoint.url}
                          </p>

                          {endpoint.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {endpoint.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{endpoint.events.length} events</span>
                            {endpointMetrics && (
                              <>
                                <span>•</span>
                                <span>
                                  {endpointMetrics.totalDeliveries} deliveries
                                </span>
                                <span>•</span>
                                <span>
                                  {endpointMetrics.successRate}% success
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEndpoint(endpoint)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Deliveries */}
          {recentDeliveries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentDeliveries.slice(0, 5).map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            delivery.status === 'success' &&
                              'border-green-300 text-green-700 bg-green-50',
                            delivery.status === 'failed' &&
                              'border-red-300 text-red-700 bg-red-50',
                            delivery.status === 'pending' &&
                              'border-yellow-300 text-yellow-700 bg-yellow-50',
                          )}
                        >
                          {delivery.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {delivery.eventType}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(delivery.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
                {recentDeliveries.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('deliveries')}
                    >
                      View All Deliveries
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <EndpointConfiguration
            endpoint={selectedEndpoint}
            onSave={handleEndpointSaved}
            onDelete={handleEndpointDeleted}
            onCancel={() => {
              setSelectedEndpoint(null);
              setActiveTab('overview');
            }}
          />
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          <DeliveryMonitor endpoints={endpoints} onRefresh={refreshData} />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <EventSubscriptionManager
            endpoints={endpoints}
            onUpdate={refreshData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
