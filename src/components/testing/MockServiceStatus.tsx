'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Globe,
  Database,
  Mail,
  MessageSquare,
  CreditCard,
  Camera,
  MapPin,
  Cloud,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Activity,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
} from 'lucide-react';

export interface MockService {
  id: string;
  name: string;
  type: ServiceType;
  description: string;
  status: ServiceStatus;
  isEnabled: boolean;
  endpoint: string;
  port?: number;
  configuration: MockConfiguration;
  responseTemplates: ResponseTemplate[];
  requestHistory: RequestRecord[];
  performance: ServicePerformance;
  healthCheck: HealthCheckConfig;
  weddingIntegration?: WeddingIntegrationConfig;
  lastUpdated: Date;
}

export interface MockConfiguration {
  latency: {
    min: number;
    max: number;
    distribution: 'uniform' | 'normal' | 'exponential';
  };
  reliability: {
    successRate: number;
    failureMode: 'random' | 'pattern' | 'timeout';
    errorResponses: ErrorResponse[];
  };
  capacity: {
    maxConcurrentRequests: number;
    rateLimitPerMinute: number;
    enableCircuitBreaker: boolean;
  };
  dataGeneration: {
    useRealData: boolean;
    dataSetSize: number;
    refreshInterval: number;
  };
}

export interface ResponseTemplate {
  id: string;
  name: string;
  scenario: string;
  httpStatus: number;
  headers: Record<string, string>;
  body: any;
  probability?: number;
  condition?: string;
  weddingContext?: string;
}

export interface RequestRecord {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  response: {
    status: number;
    duration: number;
    size: number;
  };
  testContext?: string;
}

export interface ServicePerformance {
  requestCount: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  peakLatency: number;
  uptime: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  endpoint: string;
  interval: number;
  timeout: number;
  expectedStatus: number;
  lastCheck?: Date;
  isHealthy: boolean;
}

export interface ErrorResponse {
  status: number;
  message: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface WeddingIntegrationConfig {
  supplierType?: SupplierType;
  testScenarios: string[];
  realDataSampling: boolean;
  seasonalVariations: boolean;
  guestCountImpact: boolean;
}

export type ServiceType =
  | 'http-api'
  | 'database'
  | 'email-service'
  | 'sms-service'
  | 'payment-gateway'
  | 'file-storage'
  | 'authentication'
  | 'webhook'
  | 'third-party';
export type ServiceStatus =
  | 'online'
  | 'offline'
  | 'degraded'
  | 'maintenance'
  | 'error';
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'transport'
  | 'other';

export interface MockServiceStatusProps {
  services: MockService[];
  onToggleService: (serviceId: string, enabled: boolean) => void;
  onUpdateConfiguration: (
    serviceId: string,
    config: Partial<MockConfiguration>,
  ) => void;
  onAddResponseTemplate: (
    serviceId: string,
    template: ResponseTemplate,
  ) => void;
  onRemoveResponseTemplate: (serviceId: string, templateId: string) => void;
  onRestartService: (serviceId: string) => void;
  onClearHistory: (serviceId: string) => void;
  className?: string;
}

const MockServiceStatus: React.FC<MockServiceStatusProps> = ({
  services,
  onToggleService,
  onUpdateConfiguration,
  onAddResponseTemplate,
  onRemoveResponseTemplate,
  onRestartService,
  onClearHistory,
  className,
}) => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<ResponseTemplate>>({});

  const getServiceIcon = (type: ServiceType) => {
    switch (type) {
      case 'http-api':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'database':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'email-service':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'sms-service':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'payment-gateway':
        return <CreditCard className="h-4 w-4 text-yellow-500" />;
      case 'file-storage':
        return <Cloud className="h-4 w-4 text-indigo-500" />;
      case 'authentication':
        return <Settings className="h-4 w-4 text-orange-500" />;
      case 'webhook':
        return <Zap className="h-4 w-4 text-pink-500" />;
      case 'third-party':
        return <Camera className="h-4 w-4 text-gray-500" />;
      default:
        return <Globe className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'maintenance':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ServiceStatus, enabled: boolean) => {
    if (!enabled) return 'border-gray-300 bg-gray-50';

    switch (status) {
      case 'online':
        return 'border-green-300 bg-green-50';
      case 'offline':
        return 'border-red-300 bg-red-50';
      case 'degraded':
        return 'border-yellow-300 bg-yellow-50';
      case 'maintenance':
        return 'border-blue-300 bg-blue-50';
      case 'error':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const formatLatency = (ms: number) => {
    return `${ms}ms`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getOverallStats = () => {
    const totalServices = services.length;
    const onlineServices = services.filter(
      (s) => s.isEnabled && s.status === 'online',
    ).length;
    const averageResponseTime =
      services.reduce((acc, s) => acc + s.performance.averageResponseTime, 0) /
      totalServices;
    const overallSuccessRate =
      services.reduce((acc, s) => acc + s.performance.successRate, 0) /
      totalServices;

    return {
      total: totalServices,
      online: onlineServices,
      averageResponseTime,
      successRate: overallSuccessRate,
    };
  };

  const stats = getOverallStats();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Mock Service Status
          </h3>
          <p className="text-sm text-gray-600">
            External service mock configuration and monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {stats.online}/{stats.total} Online
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfiguration(!showConfiguration)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showConfiguration ? 'Hide Config' : 'Show Config'}
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Services Online
                </p>
                <p className="text-xl font-bold text-green-600">
                  {stats.online}/{stats.total}
                </p>
              </div>
              <Wifi className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Avg Response
                </p>
                <p className="text-xl font-bold">
                  {formatLatency(Math.round(stats.averageResponseTime))}
                </p>
              </div>
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-xl font-bold text-green-600">
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Total Requests
                </p>
                <p className="text-xl font-bold">
                  {services.reduce(
                    (acc, s) => acc + s.performance.requestCount,
                    0,
                  )}
                </p>
              </div>
              <Globe className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            className={cn(
              'transition-all duration-200',
              getStatusColor(service.status, service.isEnabled),
              selectedService === service.id && 'ring-2 ring-blue-500',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getServiceIcon(service.type)}
                  <div>
                    <CardTitle className="text-sm">{service.name}</CardTitle>
                    <p className="text-xs text-gray-600">
                      {service.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={service.isEnabled}
                    onCheckedChange={(enabled) =>
                      onToggleService(service.id, enabled)
                    }
                  />
                  {getStatusIcon(service.status)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Service Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-600">Endpoint:</span>
                  <p className="font-mono text-xs break-all">
                    {service.endpoint}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Port:</span>
                  <p className="font-medium">{service.port || 'Default'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <p className="font-medium capitalize">
                    {service.type.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Last Updated:</span>
                  <p className="font-medium">
                    {service.lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 text-sm">
                  Performance
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-medium">
                      {formatLatency(service.performance.averageResponseTime)}
                    </div>
                    <div className="text-gray-500">Avg Response</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-medium">
                      {service.performance.successRate.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">Success Rate</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-medium">
                      {service.performance.requestCount}
                    </div>
                    <div className="text-gray-500">Requests</div>
                  </div>
                </div>
              </div>

              {/* Health Check Status */}
              {service.healthCheck.enabled && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Health Check:</span>
                    <div className="flex items-center space-x-1">
                      {service.healthCheck.isHealthy ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'text-xs',
                          service.healthCheck.isHealthy
                            ? 'text-green-600'
                            : 'text-red-600',
                        )}
                      >
                        {service.healthCheck.isHealthy
                          ? 'Healthy'
                          : 'Unhealthy'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Last check:{' '}
                    {service.healthCheck.lastCheck?.toLocaleTimeString() ||
                      'Never'}
                  </div>
                </div>
              )}

              {/* Wedding Integration */}
              {service.weddingIntegration && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                  <div className="flex items-center space-x-2 mb-1">
                    <MapPin className="h-3 w-3 text-rose-500" />
                    <span className="text-xs font-medium text-rose-700">
                      Wedding Integration
                    </span>
                  </div>
                  <div className="text-xs text-rose-600">
                    {service.weddingIntegration.supplierType && (
                      <div>
                        Supplier: {service.weddingIntegration.supplierType}
                      </div>
                    )}
                    <div>
                      Scenarios:{' '}
                      {service.weddingIntegration.testScenarios.length}
                    </div>
                  </div>
                </div>
              )}

              {/* Response Templates */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 text-sm">
                  Response Templates ({service.responseTemplates.length})
                </h4>
                {service.responseTemplates.length > 0 ? (
                  <div className="space-y-1">
                    {service.responseTemplates.slice(0, 3).map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between text-xs p-2 bg-white rounded border"
                      >
                        <div>
                          <span className="font-medium">{template.name}</span>
                          <span className="ml-2 text-gray-600">
                            ({template.scenario})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              template.httpStatus >= 200 &&
                              template.httpStatus < 300
                                ? 'default'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {template.httpStatus}
                          </Badge>
                          {template.probability && (
                            <span className="text-xs text-gray-500">
                              {template.probability}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {service.responseTemplates.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{service.responseTemplates.length - 3} more templates
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-2">
                    No response templates configured
                  </div>
                )}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedService(
                        selectedService === service.id ? null : service.id,
                      )
                    }
                    className="text-xs"
                  >
                    {selectedService === service.id
                      ? 'Hide Details'
                      : 'View Details'}
                  </Button>
                  {service.isEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestartService(service.id)}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Restart
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClearHistory(service.id)}
                  className="text-xs text-gray-600"
                >
                  Clear History
                </Button>
              </div>
            </CardContent>

            {/* Expanded Details */}
            {selectedService === service.id && (
              <CardContent className="pt-0 border-t">
                <div className="space-y-4">
                  {/* Configuration Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Configuration
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">Latency Range:</span>
                        <p>
                          {service.configuration.latency.min}-
                          {service.configuration.latency.max}ms
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Rate:</span>
                        <p>{service.configuration.reliability.successRate}%</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Max Concurrent:</span>
                        <p>
                          {service.configuration.capacity.maxConcurrentRequests}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Rate Limit:</span>
                        <p>
                          {service.configuration.capacity.rateLimitPerMinute}
                          /min
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Requests */}
                  {service.requestHistory.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Recent Requests
                      </h4>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1">
                          {service.requestHistory.slice(-10).map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                            >
                              <div>
                                <span className="font-medium">
                                  {request.method}
                                </span>
                                <span className="ml-2">{request.path}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={
                                    request.response.status >= 200 &&
                                    request.response.status < 300
                                      ? 'default'
                                      : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {request.response.status}
                                </Badge>
                                <span>{request.response.duration}ms</span>
                                <span>
                                  {formatBytes(request.response.size)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No mock services configured</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MockServiceStatus;
