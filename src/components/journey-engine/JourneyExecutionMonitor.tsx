'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/untitled-ui/button';
import { Badge } from '@/components/untitled-ui/badge';
import {
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Zap,
  TrendingUp,
  RefreshCw,
  Settings,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

interface JourneyInstance {
  id: string;
  journey_id: string;
  journey_name: string;
  client_id: string;
  client_name: string;
  vendor_id: string;
  state: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  current_node_id?: string;
  current_node_name?: string;
  current_step: number;
  total_steps: number;
  variables: Record<string, any>;
  entry_source?: string;
  entry_trigger?: string;
  started_at: string;
  completed_at?: string;
  failed_at?: string;
  last_error?: string;
  error_count: number;
  retry_count: number;
  execution_path?: string[];
  progress_percentage: number;
}

interface JourneyExecutionMetrics {
  total_instances: number;
  active_instances: number;
  completed_today: number;
  failed_today: number;
  avg_completion_time: number;
  success_rate: number;
  queue_depth: number;
  processing_rate: number;
}

interface JourneyExecution {
  id: string;
  instance_id: string;
  journey_id: string;
  node_id: string;
  node_name: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  output_data?: any;
}

const stateColors = {
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
};

const executionStatusColors = {
  pending: 'bg-gray-50 text-gray-700 border-gray-200',
  executing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export default function JourneyExecutionMonitor() {
  const [instances, setInstances] = useState<JourneyInstance[]>([]);
  const [metrics, setMetrics] = useState<JourneyExecutionMetrics | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<JourneyExecution[]>(
    [],
  );
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'instances' | 'executions' | 'errors'
  >('overview');
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time updates for instances
  useSupabaseRealtime({
    channel: 'journey-instances',
    table: 'journey_instances',
    onUpdate: (payload) => {
      setInstances((prev) =>
        prev.map((instance) =>
          instance.id === payload.new.id
            ? { ...instance, ...payload.new }
            : instance,
        ),
      );
    },
    onInsert: (payload) => {
      setInstances((prev) => [payload.new as JourneyInstance, ...prev]);
    },
  });

  // Real-time updates for executions
  useSupabaseRealtime({
    channel: 'journey-executions',
    table: 'journey_node_executions',
    onUpdate: (payload) => {
      setRecentExecutions((prev) => {
        const updated = prev.filter((exec) => exec.id !== payload.new.id);
        return [payload.new as JourneyExecution, ...updated].slice(0, 50);
      });
    },
    onInsert: (payload) => {
      setRecentExecutions((prev) => {
        const updated = prev.filter((exec) => exec.id !== payload.new.id);
        return [payload.new as JourneyExecution, ...updated].slice(0, 50);
      });
    },
  });

  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchMonitoringData = async () => {
    try {
      const [instancesRes, metricsRes, executionsRes, performanceRes] =
        await Promise.all([
          fetch('/api/journey-engine/instances'),
          fetch('/api/journey-engine/metrics'),
          fetch('/api/journey-engine/executions'),
          fetch('/api/journey-engine/performance'),
        ]);

      const [instancesData, metricsData, executionsData, performanceData] =
        await Promise.all([
          instancesRes.json(),
          metricsRes.json(),
          executionsRes.json(),
          performanceRes.json(),
        ]);

      setInstances(instancesData.instances || []);
      setMetrics(metricsData.metrics || null);
      setRecentExecutions(executionsData.executions || []);
      setPerformanceData(performanceData.data || []);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstanceAction = async (
    instanceId: string,
    action: 'pause' | 'resume' | 'cancel',
  ) => {
    try {
      const response = await fetch(
        `/api/journey-engine/instances/${instanceId}/${action}`,
        {
          method: 'POST',
        },
      );

      if (response.ok) {
        await fetchMonitoringData();
      }
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Active Instances
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {metrics?.active_instances || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">
                  Completed Today
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {metrics?.completed_today || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Failed Today</p>
                <p className="text-2xl font-bold text-red-900">
                  {metrics?.failed_today || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {metrics?.success_rate
                    ? `${(metrics.success_rate * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Execution Rate (Last 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Instance States
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Active',
                      value: metrics?.active_instances || 0,
                      color: '#3b82f6',
                    },
                    {
                      name: 'Completed',
                      value: metrics?.completed_today || 0,
                      color: '#10b981',
                    },
                    {
                      name: 'Failed',
                      value: metrics?.failed_today || 0,
                      color: '#ef4444',
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    {
                      name: 'Active',
                      value: metrics?.active_instances || 0,
                      color: '#3b82f6',
                    },
                    {
                      name: 'Completed',
                      value: metrics?.completed_today || 0,
                      color: '#10b981',
                    },
                    {
                      name: 'Failed',
                      value: metrics?.failed_today || 0,
                      color: '#ef4444',
                    },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderInstances = () => (
    <div className="space-y-4">
      {instances.map((instance) => (
        <Card
          key={instance.id}
          className="transition-all duration-200 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-gray-900">
                    {instance.journey_name}
                  </h3>
                  <Badge className={stateColors[instance.state]}>
                    {instance.state}
                  </Badge>
                  {instance.state === 'failed' && instance.error_count > 0 && (
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      {instance.error_count} errors
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-medium">{instance.client_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Step</p>
                    <p className="font-medium">
                      {instance.current_node_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Progress</p>
                    <p className="font-medium">
                      {instance.progress_percentage}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Started</p>
                    <p className="font-medium">
                      {new Date(instance.started_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${instance.progress_percentage}%` }}
                  />
                </div>

                {instance.last_error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {instance.last_error}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {instance.state === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstanceAction(instance.id, 'pause')}
                    className="flex items-center space-x-1"
                  >
                    <Pause className="h-3 w-3" />
                    <span>Pause</span>
                  </Button>
                )}

                {instance.state === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstanceAction(instance.id, 'resume')}
                    className="flex items-center space-x-1"
                  >
                    <Play className="h-3 w-3" />
                    <span>Resume</span>
                  </Button>
                )}

                {['active', 'paused'].includes(instance.state) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstanceAction(instance.id, 'cancel')}
                    className="flex items-center space-x-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Square className="h-3 w-3" />
                    <span>Cancel</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInstance(instance.id)}
                  className="flex items-center space-x-1"
                >
                  <Settings className="h-3 w-3" />
                  <span>Details</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {instances.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Active Instances
            </h3>
            <p className="text-gray-500">
              No journey instances are currently running. Instances will appear
              here when journeys are executed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderExecutions = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent Node Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentExecutions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Badge className={executionStatusColors[execution.status]}>
                      {execution.status}
                    </Badge>
                    <span className="font-medium text-gray-900">
                      {execution.node_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(execution.started_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {execution.duration_ms && (
                    <p className="text-sm text-gray-500 mt-1">
                      Duration: {execution.duration_ms}ms
                    </p>
                  )}

                  {execution.error_message && (
                    <p className="text-sm text-red-600 mt-1">
                      Error: {execution.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {recentExecutions.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No recent executions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderErrors = () => {
    const failedInstances = instances.filter(
      (i) => i.state === 'failed' || i.error_count > 0,
    );
    const failedExecutions = recentExecutions.filter(
      (e) => e.status === 'failed',
    );

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Failed Instances</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-red-900">
                        {instance.journey_name}
                      </h4>
                      <p className="text-sm text-red-700">
                        Client: {instance.client_name}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {instance.last_error}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        {instance.error_count} errors
                      </Badge>
                      <p className="text-xs text-red-600 mt-1">
                        Failed:{' '}
                        {instance.failed_at
                          ? new Date(instance.failed_at).toLocaleString()
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {failedInstances.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No failed instances</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Failed Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedExecutions.map((execution) => (
                <div
                  key={execution.id}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-red-900">
                        {execution.node_name}
                      </h5>
                      <p className="text-sm text-red-600">
                        {execution.error_message}
                      </p>
                    </div>
                    <div className="text-right text-xs text-red-600">
                      {new Date(execution.started_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {failedExecutions.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No failed executions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Journey Execution Monitor
          </h1>
          <p className="text-gray-600">
            Real-time monitoring and control of wedding automation workflows
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant={autoRefresh ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`}
            />
            <span>Auto Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'instances', label: 'Active Instances', icon: Activity },
          { key: 'executions', label: 'Executions', icon: Zap },
          { key: 'errors', label: 'Errors', icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={selectedView === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView(key as any)}
            className="flex items-center space-x-2"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'instances' && renderInstances()}
      {selectedView === 'executions' && renderExecutions()}
      {selectedView === 'errors' && renderErrors()}
    </div>
  );
}
