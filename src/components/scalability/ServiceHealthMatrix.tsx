'use client';

import React, { useState, useMemo } from 'react';
import { ServiceInstance, AlertThreshold } from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Server,
  Database,
  Globe,
  Cog,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Cpu,
  MemoryStick,
  Network,
  Users,
} from 'lucide-react';

interface ServiceHealthMatrixProps {
  services: ServiceInstance[];
  healthThresholds: AlertThreshold[];
  onServiceDrilldown: (serviceName: string) => void;
}

export const ServiceHealthMatrix: React.FC<ServiceHealthMatrixProps> = ({
  services,
  healthThresholds,
  onServiceDrilldown,
}) => {
  const [sortBy, setSortBy] = useState<
    'name' | 'health' | 'cpu' | 'memory' | 'instances'
  >('health');
  const [filterBy, setFilterBy] = useState<
    'all' | 'healthy' | 'warning' | 'critical'
  >('all');

  // Calculate health scores and categorize services
  const enrichedServices = useMemo(() => {
    return services.map((service) => {
      const healthScore = calculateServiceHealth(service, healthThresholds);
      const alertLevel = getServiceAlertLevel(service, healthThresholds);
      const scalingTrend = getScalingTrend(service);

      return {
        ...service,
        healthScore,
        alertLevel,
        scalingTrend,
        utilizationAvg:
          (service.cpuUtilization + service.memoryUtilization) / 2,
      };
    });
  }, [services, healthThresholds]);

  // Filter and sort services
  const processedServices = useMemo(() => {
    let filtered = enrichedServices;

    if (filterBy !== 'all') {
      filtered = enrichedServices.filter(
        (service) => service.alertLevel === filterBy,
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'health':
          return b.healthScore - a.healthScore;
        case 'cpu':
          return b.cpuUtilization - a.cpuUtilization;
        case 'memory':
          return b.memoryUtilization - a.memoryUtilization;
        case 'instances':
          return b.instances.current - a.instances.current;
        default:
          return 0;
      }
    });
  }, [enrichedServices, sortBy, filterBy]);

  // Calculate summary statistics
  const healthSummary = useMemo(() => {
    const total = enrichedServices.length;
    const healthy = enrichedServices.filter(
      (s) => s.alertLevel === 'healthy',
    ).length;
    const warning = enrichedServices.filter(
      (s) => s.alertLevel === 'warning',
    ).length;
    const critical = enrichedServices.filter(
      (s) => s.alertLevel === 'critical',
    ).length;
    const avgHealth =
      enrichedServices.reduce((sum, s) => sum + s.healthScore, 0) / total;

    return { total, healthy, warning, critical, avgHealth };
  }, [enrichedServices]);

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="w-4 h-4" />;
      case 'api':
        return <Server className="w-4 h-4" />;
      case 'worker':
        return <Cog className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Card className="service-health-matrix">
      <div className="matrix-header p-6 pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Service Health Matrix
          </h3>

          <div className="header-controls flex items-center space-x-4">
            {/* Filter Controls */}
            <div className="filter-controls flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All', count: healthSummary.total },
                {
                  key: 'healthy',
                  label: 'Healthy',
                  count: healthSummary.healthy,
                },
                {
                  key: 'warning',
                  label: 'Warning',
                  count: healthSummary.warning,
                },
                {
                  key: 'critical',
                  label: 'Critical',
                  count: healthSummary.critical,
                },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={filterBy === filter.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterBy(filter.key as any)}
                  className="px-3 py-1 text-xs"
                >
                  <span>{filter.label}</span>
                  <Badge variant="secondary" className="text-xs ml-1">
                    {filter.count}
                  </Badge>
                </Button>
              ))}
            </div>

            {/* Sort Controls */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="health">Sort by Health</option>
              <option value="name">Sort by Name</option>
              <option value="cpu">Sort by CPU</option>
              <option value="memory">Sort by Memory</option>
              <option value="instances">Sort by Instances</option>
            </select>
          </div>
        </div>

        {/* Health Summary */}
        <div className="health-summary grid grid-cols-4 gap-4">
          <div className="summary-card bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {healthSummary.total}
            </div>
            <div className="text-sm text-blue-700">Total Services</div>
          </div>
          <div className="summary-card bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {healthSummary.healthy}
            </div>
            <div className="text-sm text-green-700">Healthy</div>
          </div>
          <div className="summary-card bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {healthSummary.warning}
            </div>
            <div className="text-sm text-yellow-700">Warning</div>
          </div>
          <div className="summary-card bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {healthSummary.critical}
            </div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
        </div>
      </div>

      <div className="matrix-content p-6">
        {processedServices.length === 0 ? (
          <div className="empty-matrix text-center py-12">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No services found
            </h4>
            <p className="text-gray-600">
              No services match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="services-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {processedServices.map((service) => (
              <ServiceHealthCard
                key={service.id}
                service={service}
                onDrilldown={() => onServiceDrilldown(service.name)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// Service Health Card Component
const ServiceHealthCard: React.FC<{
  service: any; // Extended ServiceInstance
  onDrilldown: () => void;
}> = ({ service, onDrilldown }) => {
  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="w-5 h-5" />;
      case 'api':
        return <Server className="w-5 h-5" />;
      case 'worker':
        return <Cog className="w-5 h-5" />;
      case 'database':
        return <Database className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScalingIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatLastScaling = (date?: Date): string => {
    if (!date) return 'Never';
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <Card
      className={`service-health-card cursor-pointer transition-all hover:shadow-lg border-l-4 ${getAlertLevelColor(
        service.alertLevel,
      )
        .split(' ')
        .slice(1)
        .join(' ')}`}
      onClick={onDrilldown}
    >
      <div className="p-4">
        {/* Service Header */}
        <div className="service-header flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`service-icon p-2 rounded-lg ${getAlertLevelColor(
                service.alertLevel,
              )
                .split(' ')
                .slice(1)
                .join(' ')}`}
            >
              {getServiceIcon(service.type)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{service.name}</h4>
              <p className="text-sm text-gray-600 capitalize">
                {service.type} Service
              </p>
            </div>
          </div>

          <div className="service-status text-right">
            <div className="flex items-center space-x-1 mb-1">
              {service.alertLevel === 'healthy' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              <Badge className={getAlertLevelColor(service.alertLevel)}>
                {service.alertLevel.toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs text-gray-500">
              Health: {service.healthScore}/100
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid grid grid-cols-2 gap-4 mb-4">
          <div className="metric-item">
            <div className="flex items-center space-x-2 mb-1">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">CPU</span>
            </div>
            <div className="metric-value">
              <div className="text-lg font-bold text-gray-900">
                {service.cpuUtilization.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    service.cpuUtilization > 80
                      ? 'bg-red-500'
                      : service.cpuUtilization > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(service.cpuUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="metric-item">
            <div className="flex items-center space-x-2 mb-1">
              <MemoryStick className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Memory</span>
            </div>
            <div className="metric-value">
              <div className="text-lg font-bold text-gray-900">
                {service.memoryUtilization.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    service.memoryUtilization > 85
                      ? 'bg-red-500'
                      : service.memoryUtilization > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(service.memoryUtilization, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="metric-item">
            <div className="flex items-center space-x-2 mb-1">
              <Network className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600">Requests</span>
            </div>
            <div className="metric-value">
              <div className="text-lg font-bold text-gray-900">
                {service.requestRate > 1000
                  ? `${(service.requestRate / 1000).toFixed(1)}K/s`
                  : `${service.requestRate.toFixed(0)}/s`}
              </div>
            </div>
          </div>

          <div className="metric-item">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">Response</span>
            </div>
            <div className="metric-value">
              <div className="text-lg font-bold text-gray-900">
                {service.responseTime.toFixed(0)}ms
              </div>
            </div>
          </div>
        </div>

        {/* Instances Status */}
        <div className="instances-status mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Instances
              </span>
            </div>
            {getScalingIcon(service.scalingTrend)}
          </div>

          <div className="instances-breakdown">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Current / Target</span>
              <span className="font-mono">
                {service.instances.current} / {service.instances.target}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Range</span>
              <span className="font-mono text-gray-600">
                {service.instances.min} - {service.instances.max}
              </span>
            </div>
          </div>
        </div>

        {/* Service Footer */}
        <div className="service-footer flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <span>Region:</span>
            <Badge variant="outline" className="text-xs">
              {service.region}
            </Badge>
          </div>

          <div className="last-scaling">
            <span>
              Last scaled: {formatLastScaling(service.lastScalingEvent)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Helper functions
const calculateServiceHealth = (
  service: ServiceInstance,
  thresholds: AlertThreshold[],
): number => {
  const cpuScore = Math.max(0, 100 - service.cpuUtilization);
  const memoryScore = Math.max(0, 100 - service.memoryUtilization);
  const responseTimeScore = Math.max(0, 100 - service.responseTime / 10); // Assuming 1000ms = 0 score

  // Factor in instance availability
  const instanceScore =
    service.instances.current >= service.instances.target
      ? 100
      : service.instances.current >= service.instances.min
        ? 75
        : 0;

  return Math.round(
    (cpuScore + memoryScore + responseTimeScore + instanceScore) / 4,
  );
};

const getServiceAlertLevel = (
  service: ServiceInstance,
  thresholds: AlertThreshold[],
): 'healthy' | 'warning' | 'critical' => {
  // Critical conditions
  if (
    service.cpuUtilization > 90 ||
    service.memoryUtilization > 95 ||
    service.responseTime > 1000
  ) {
    return 'critical';
  }

  // Warning conditions
  if (
    service.cpuUtilization > 75 ||
    service.memoryUtilization > 80 ||
    service.responseTime > 500
  ) {
    return 'warning';
  }

  // Check against custom thresholds
  const serviceThresholds = thresholds.filter(
    (t) => t.service === service.name || t.service === 'all',
  );
  for (const threshold of serviceThresholds) {
    const metricValue = getMetricValue(service, threshold.metric);
    if (metricValue !== null) {
      if (metricValue >= threshold.critical) return 'critical';
      if (metricValue >= threshold.warning) return 'warning';
    }
  }

  return 'healthy';
};

const getScalingTrend = (
  service: ServiceInstance,
): 'up' | 'down' | 'stable' => {
  if (service.instances.current > service.instances.target) return 'down';
  if (service.instances.current < service.instances.target) return 'up';
  return 'stable';
};

const getMetricValue = (
  service: ServiceInstance,
  metric: string,
): number | null => {
  switch (metric) {
    case 'cpu':
      return service.cpuUtilization;
    case 'memory':
      return service.memoryUtilization;
    case 'requests':
      return service.requestRate;
    case 'response_time':
      return service.responseTime;
    default:
      return null;
  }
};

export default ServiceHealthMatrix;
