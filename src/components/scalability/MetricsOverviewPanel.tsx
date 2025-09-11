'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ScalingMetrics,
  TimeRange,
  ChartView,
  MetricTimeSeries,
  ServiceInstance,
} from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  LineChart,
  Map,
  TrendingUp,
  TrendingDown,
  Minus,
  Cpu,
  MemoryStick,
  Network,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface MetricsOverviewPanelProps {
  metrics?: ScalingMetrics;
  timeRange: TimeRange;
  selectedService: string;
  onServiceSelect: (service: string) => void;
}

/**
 * MetricsOverviewPanel
 * Comprehensive metrics visualization with multiple view modes
 * - Time series charts with real-time updates
 * - Service heatmaps for quick health assessment
 * - Infrastructure topology view
 * - Metric cards with sparklines and trend indicators
 */
export const MetricsOverviewPanel: React.FC<MetricsOverviewPanelProps> = ({
  metrics,
  timeRange,
  selectedService,
  onServiceSelect,
}) => {
  const [chartView, setChartView] = useState<ChartView>('timeseries');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'cpu',
    'memory',
    'requests',
    'response_time',
  ]);

  // Process metrics data for visualization
  const processedData = useMemo(() => {
    if (!metrics)
      return {
        timeSeries: [],
        services: [],
        serviceConnections: [],
        healthStatus: {},
      };

    // Convert time series data for charts
    const timeSeries =
      metrics.cpuUtilization?.history?.map((point, index) => ({
        timestamp: point.timestamp.toISOString(),
        timeLabel: point.timestamp.toLocaleTimeString(),
        cpu: point.value,
        memory: metrics.memoryUtilization?.history?.[index]?.value || 0,
        requests: metrics.requestRate?.history?.[index]?.value || 0,
        response_time: metrics.responseTime?.history?.[index]?.value || 0,
        error_rate: metrics.errorRate?.history?.[index]?.value || 0,
        queue_depth: metrics.queueDepth?.history?.[index]?.value || 0,
      })) || [];

    // Process service data
    const services = metrics.currentInstances.map((service) => ({
      ...service,
      healthScore: calculateHealthScore(service),
      alertLevel: getServiceAlertLevel(service),
    }));

    // Mock service connections for topology view
    const serviceConnections = generateServiceConnections(services);

    // Health status mapping
    const healthStatus = services.reduce(
      (acc, service) => {
        acc[service.name] = {
          status: service.status,
          healthScore: calculateHealthScore(service),
          lastUpdate: new Date(),
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    return { timeSeries, services, serviceConnections, healthStatus };
  }, [metrics]);

  // Utility functions
  const calculateHealthScore = (service: ServiceInstance): number => {
    const cpuScore = Math.max(0, 100 - service.cpuUtilization);
    const memoryScore = Math.max(0, 100 - service.memoryUtilization);
    const responseTimeScore = Math.max(0, 100 - service.responseTime / 10); // Assuming 1000ms = 0 score

    return Math.round((cpuScore + memoryScore + responseTimeScore) / 3);
  };

  const getServiceAlertLevel = (
    service: ServiceInstance,
  ): 'healthy' | 'warning' | 'critical' => {
    if (
      service.cpuUtilization > 90 ||
      service.memoryUtilization > 95 ||
      service.responseTime > 1000
    ) {
      return 'critical';
    }
    if (
      service.cpuUtilization > 75 ||
      service.memoryUtilization > 80 ||
      service.responseTime > 500
    ) {
      return 'warning';
    }
    return 'healthy';
  };

  const generateServiceConnections = (services: any[]) => {
    // Mock connections for demonstration
    return services.slice(0, -1).map((service, index) => ({
      from: service.name,
      to: services[index + 1]?.name || services[0].name,
      type: 'api_call' as const,
      requestRate: Math.random() * 1000,
      latency: Math.random() * 100,
      errorRate: Math.random() * 5,
      status: 'healthy' as const,
    }));
  };

  const getUniqueServices = (metrics?: ScalingMetrics): string[] => {
    if (!metrics?.currentInstances) return ['all'];
    return ['all', ...metrics.currentInstances.map((service) => service.name)];
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatMetricValue = (value: number, unit: string): string => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'ms') return `${value.toFixed(0)}ms`;
    if (unit === 'req/s') {
      if (value > 1000) return `${(value / 1000).toFixed(1)}K/s`;
      return `${value.toFixed(0)}/s`;
    }
    return `${value.toFixed(2)}${unit}`;
  };

  const getMetricThresholdStatus = (
    value: number,
    threshold?: number,
  ): 'healthy' | 'warning' | 'critical' => {
    if (!threshold) return 'healthy';
    if (value >= threshold * 1.2) return 'critical';
    if (value >= threshold) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (
    status: 'healthy' | 'warning' | 'critical',
  ): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  // Event handlers
  const handleChartZoom = useCallback((domain: any) => {
    console.log('[MetricsOverview] Chart zoom:', domain);
    // Would update timeRange based on zoom
  }, []);

  const handleMetricToggle = useCallback((metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric],
    );
  }, []);

  return (
    <Card className="metrics-overview-panel">
      <div className="panel-header p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Infrastructure Metrics
          </h3>

          <div className="view-controls flex items-center space-x-4">
            {/* Service Selector */}
            <div className="service-selector">
              <label className="text-sm text-gray-600 mr-2">Service:</label>
              <select
                value={selectedService}
                onChange={(e) => onServiceSelect(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getUniqueServices(metrics).map((service) => (
                  <option key={service} value={service}>
                    {service === 'all' ? 'All Services' : service}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Type Toggle */}
            <div className="chart-type-toggle flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={chartView === 'timeseries' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartView('timeseries')}
                className="px-3 py-1"
              >
                <LineChart className="w-4 h-4 mr-1" />
                Time Series
              </Button>
              <Button
                variant={chartView === 'heatmap' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartView('heatmap')}
                className="px-3 py-1"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Heatmap
              </Button>
              <Button
                variant={chartView === 'topology' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartView('topology')}
                className="px-3 py-1"
              >
                <Map className="w-4 h-4 mr-1" />
                Topology
              </Button>
            </div>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="metric-toggles flex items-center space-x-2 mt-4">
          <span className="text-sm text-gray-600">Metrics:</span>
          {[
            {
              key: 'cpu',
              label: 'CPU',
              icon: <Cpu className="w-3 h-3" />,
              color: 'blue',
            },
            {
              key: 'memory',
              label: 'Memory',
              icon: <MemoryStick className="w-3 h-3" />,
              color: 'green',
            },
            {
              key: 'requests',
              label: 'Requests',
              icon: <Network className="w-3 h-3" />,
              color: 'purple',
            },
            {
              key: 'response_time',
              label: 'Response Time',
              icon: <Clock className="w-3 h-3" />,
              color: 'orange',
            },
          ].map((metric) => (
            <Button
              key={metric.key}
              variant={
                selectedMetrics.includes(metric.key) ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => handleMetricToggle(metric.key)}
              className={`px-2 py-1 text-xs ${
                selectedMetrics.includes(metric.key)
                  ? `bg-${metric.color}-500 text-white`
                  : `text-${metric.color}-600 border-${metric.color}-200`
              }`}
            >
              {metric.icon}
              <span className="ml-1">{metric.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 pb-4">
        <MetricCard
          title="CPU Utilization"
          current={metrics?.cpuUtilization.current || 0}
          trend={metrics?.cpuUtilization.trend || 'stable'}
          threshold={80}
          unit="%"
          sparkline={metrics?.cpuUtilization.history || []}
          icon={<Cpu className="w-5 h-5" />}
        />

        <MetricCard
          title="Memory Usage"
          current={metrics?.memoryUtilization.current || 0}
          trend={metrics?.memoryUtilization.trend || 'stable'}
          threshold={85}
          unit="%"
          sparkline={metrics?.memoryUtilization.history || []}
          icon={<MemoryStick className="w-5 h-5" />}
        />

        <MetricCard
          title="Request Rate"
          current={metrics?.requestRate.current || 0}
          trend={metrics?.requestRate.trend || 'stable'}
          threshold={10000}
          unit="req/s"
          sparkline={metrics?.requestRate.history || []}
          icon={<Network className="w-5 h-5" />}
        />

        <MetricCard
          title="Response Time"
          current={metrics?.responseTime.current || 0}
          trend={metrics?.responseTime.trend || 'stable'}
          threshold={200}
          unit="ms"
          sparkline={metrics?.responseTime.history || []}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Chart Visualization */}
      <div className="chart-container p-6 pt-0">
        {chartView === 'timeseries' && (
          <TimeSeriesChart
            data={processedData.timeSeries}
            selectedMetrics={selectedMetrics}
            timeRange={timeRange}
            onZoom={handleChartZoom}
          />
        )}

        {chartView === 'heatmap' && (
          <ServiceHeatmap
            services={processedData.services}
            metric="cpu_utilization"
            timeRange={timeRange}
            onServiceClick={onServiceSelect}
          />
        )}

        {chartView === 'topology' && (
          <InfrastructureTopology
            services={processedData.services}
            connections={processedData.serviceConnections}
            healthStatus={processedData.healthStatus}
            onNodeClick={onServiceSelect}
          />
        )}
      </div>
    </Card>
  );
};

// MetricCard Component
const MetricCard: React.FC<{
  title: string;
  current: number;
  trend: 'up' | 'down' | 'stable';
  threshold?: number;
  unit: string;
  sparkline: any[];
  icon: React.ReactNode;
}> = ({ title, current, trend, threshold, unit, sparkline, icon }) => {
  const status = threshold
    ? getMetricThresholdStatus(current, threshold)
    : 'healthy';
  const statusColor = getStatusColor(status);

  return (
    <Card
      className={`metric-card border-2 ${statusColor.split(' ').slice(1).join(' ')}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          {getTrendIcon(trend)}
        </div>

        <div className="metric-value">
          <div className={`text-2xl font-bold ${statusColor.split(' ')[0]}`}>
            {formatMetricValue(current, unit)}
          </div>
          {threshold && (
            <div className="text-xs text-gray-500 mt-1">
              Threshold: {formatMetricValue(threshold, unit)}
            </div>
          )}
        </div>

        {/* Mini Sparkline */}
        <div className="sparkline mt-3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline.slice(-20)}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={
                  status === 'critical'
                    ? '#ef4444'
                    : status === 'warning'
                      ? '#f59e0b'
                      : '#10b981'
                }
                fill={
                  status === 'critical'
                    ? '#fee2e2'
                    : status === 'warning'
                      ? '#fef3c7'
                      : '#d1fae5'
                }
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

// TimeSeriesChart Component
const TimeSeriesChart: React.FC<{
  data: any[];
  selectedMetrics: string[];
  timeRange: TimeRange;
  onZoom: (domain: any) => void;
}> = ({ data, selectedMetrics, timeRange, onZoom }) => {
  const metricColors = {
    cpu: '#3b82f6',
    memory: '#10b981',
    requests: '#8b5cf6',
    response_time: '#f59e0b',
    error_rate: '#ef4444',
    queue_depth: '#6b7280',
  };

  return (
    <div className="time-series-chart h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="timeLabel"
            stroke="#64748b"
            fontSize={12}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#374151' }}
          />
          <Legend />

          {selectedMetrics.map((metric) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={metricColors[metric as keyof typeof metricColors]}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              name={metric.replace('_', ' ').toUpperCase()}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ServiceHeatmap Component
const ServiceHeatmap: React.FC<{
  services: any[];
  metric: string;
  timeRange: TimeRange;
  onServiceClick: (service: string) => void;
}> = ({ services, metric, timeRange, onServiceClick }) => {
  return (
    <div className="service-heatmap">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {services.map((service) => (
          <Card
            key={service.name}
            className={`service-heatmap-card cursor-pointer transition-all hover:shadow-md ${getStatusColor(
              service.alertLevel,
            )}`}
            onClick={() => onServiceClick(service.name)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{service.name}</span>
                {service.alertLevel === 'healthy' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : service.alertLevel === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>CPU:</span>
                  <span className="font-mono">
                    {service.cpuUtilization.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Memory:</span>
                  <span className="font-mono">
                    {service.memoryUtilization.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Instances:</span>
                  <span className="font-mono">
                    {service.instances.current}/{service.instances.target}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between items-center text-xs">
                  <span>Health Score:</span>
                  <Badge
                    variant={
                      service.healthScore > 80
                        ? 'default'
                        : service.healthScore > 60
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {service.healthScore}/100
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// InfrastructureTopology Component
const InfrastructureTopology: React.FC<{
  services: any[];
  connections: any[];
  healthStatus: Record<string, any>;
  onNodeClick: (service: string) => void;
}> = ({ services, connections, healthStatus, onNodeClick }) => {
  return (
    <div className="infrastructure-topology">
      <div className="topology-container relative h-80 bg-gray-50 rounded-lg p-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Infrastructure Topology View</p>
            <p className="text-sm text-gray-500 mt-2">
              Interactive service map with real-time connections
            </p>

            {/* Simple service layout for now */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
              {services.slice(0, 6).map((service, index) => (
                <div
                  key={service.name}
                  className="service-node relative cursor-pointer"
                  onClick={() => onNodeClick(service.name)}
                >
                  <Card
                    className={`p-3 text-center border-2 ${getStatusColor(service.alertLevel)}`}
                  >
                    <div className="text-sm font-medium">{service.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {service.instances.current} instances
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full mx-auto mt-2 ${
                        service.status === 'healthy'
                          ? 'bg-green-500'
                          : service.status === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                  </Card>

                  {/* Connection lines would be drawn with SVG in a full implementation */}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function implementations
const getMetricThresholdStatus = (
  value: number,
  threshold: number,
): 'healthy' | 'warning' | 'critical' => {
  if (value >= threshold * 1.2) return 'critical';
  if (value >= threshold) return 'warning';
  return 'healthy';
};

const getStatusColor = (status: 'healthy' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
  }
};

const formatMetricValue = (value: number, unit: string): string => {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'ms') return `${value.toFixed(0)}ms`;
  if (unit === 'req/s') {
    if (value > 1000) return `${(value / 1000).toFixed(1)}K/s`;
    return `${value.toFixed(0)}/s`;
  }
  return `${value.toFixed(2)}${unit}`;
};

export default MetricsOverviewPanel;
