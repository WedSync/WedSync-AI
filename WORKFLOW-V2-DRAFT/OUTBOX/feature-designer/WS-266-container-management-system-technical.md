# WS-266: Container Management System - Technical Specification

## Summary
A comprehensive container orchestration and management system for WedSync's containerized infrastructure, providing Docker container lifecycle management, health monitoring, resource optimization, automated scaling, and deployment coordination across development, staging, and production environments.

## Technical Requirements

### Core Functionality
- **Container Lifecycle Management**: Create, start, stop, restart, and destroy containers with state tracking
- **Health Monitoring**: Real-time container health checks, resource usage monitoring, and performance metrics
- **Resource Optimization**: Automated resource allocation, scaling policies, and cost optimization
- **Multi-Environment Support**: Separate container orchestration for dev, staging, and production
- **Service Discovery**: Automatic service registration and discovery within container networks
- **Load Balancing**: Dynamic load balancing and traffic routing between container instances
- **Rollback Capabilities**: Automated rollback to previous container versions on deployment failures

### Business Context
In the wedding industry, system reliability is crucial during high-stress periods like wedding days. This container management system ensures WedSync's services remain available and performant, automatically scaling during peak usage periods (wedding seasons, last-minute planning rushes) and maintaining cost efficiency during quieter periods.

### User Stories

#### Wedding Planners during Peak Season
> "During wedding season, our system needs to handle 10x more traffic. The container management system should automatically scale our services up when couples are frantically planning, and scale down during off-peak hours to keep costs manageable."

#### Development Team
> "When deploying new features, I need confidence that containers will start correctly, health checks will pass, and if something goes wrong, the system will automatically rollback to the previous working version without affecting live weddings."

#### System Administrators
> "I need real-time visibility into container performance, resource usage, and costs across all environments. The system should proactively alert me about issues and automatically resolve common problems like container crashes or resource exhaustion."

## Database Schema

```sql
-- Container Definitions and Templates
CREATE TABLE container_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    service_name TEXT NOT NULL,
    image_name TEXT NOT NULL,
    image_tag TEXT NOT NULL DEFAULT 'latest',
    registry_url TEXT,
    environment_config JSONB DEFAULT '{}',
    resource_limits JSONB DEFAULT '{}', -- {cpu: "1000m", memory: "2Gi", storage: "10Gi"}
    health_check_config JSONB DEFAULT '{}', -- {endpoint: "/health", interval: 30, timeout: 10, retries: 3}
    scaling_config JSONB DEFAULT '{}', -- {min_replicas: 1, max_replicas: 10, target_cpu: 70, target_memory: 80}
    network_config JSONB DEFAULT '{}', -- {ports: [3000, 8080], internal_networks: ["app"], external_networks: []}
    volume_mounts JSONB DEFAULT '[]', -- [{source: "/data", target: "/app/data", read_only: false}]
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Container Instances and Runtime State
CREATE TABLE container_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID REFERENCES container_definitions(id) ON DELETE CASCADE,
    environment TEXT NOT NULL, -- 'development', 'staging', 'production'
    container_id TEXT UNIQUE, -- Docker container ID
    instance_name TEXT NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'stopped', 'failed', 'terminated'
    desired_status TEXT NOT NULL DEFAULT 'running',
    replica_number INTEGER DEFAULT 1,
    node_name TEXT,
    ip_address INET,
    port_mappings JSONB DEFAULT '{}', -- {internal_port: external_port}
    resource_usage JSONB DEFAULT '{}', -- {cpu_percent: 45.2, memory_mb: 512, disk_mb: 1024}
    health_status TEXT DEFAULT 'unknown', -- 'healthy', 'unhealthy', 'unknown'
    health_checks JSONB DEFAULT '[]', -- [{timestamp, status, response_time, details}]
    last_health_check TIMESTAMPTZ,
    restart_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Container Events and Audit Log
CREATE TABLE container_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES container_instances(id) ON DELETE CASCADE,
    definition_id UUID REFERENCES container_definitions(id),
    event_type TEXT NOT NULL, -- 'created', 'started', 'stopped', 'health_check', 'scaled', 'failed', 'terminated'
    event_source TEXT NOT NULL, -- 'system', 'user', 'scheduler', 'health_monitor'
    event_data JSONB DEFAULT '{}',
    error_message TEXT,
    stack_trace TEXT,
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Resource Metrics Collection
CREATE TABLE container_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES container_instances(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- 'cpu', 'memory', 'disk', 'network', 'custom'
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT, -- '%', 'mb', 'gb', 'requests/sec'
    labels JSONB DEFAULT '{}', -- Additional metric labels
    collected_at TIMESTAMPTZ DEFAULT now()
);

-- Service Discovery Registry
CREATE TABLE service_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    instance_id UUID REFERENCES container_instances(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    health_check_url TEXT,
    is_healthy BOOLEAN DEFAULT true,
    load_balancer_weight INTEGER DEFAULT 100,
    metadata JSONB DEFAULT '{}', -- Service-specific metadata
    registered_at TIMESTAMPTZ DEFAULT now(),
    last_heartbeat TIMESTAMPTZ DEFAULT now(),
    UNIQUE(service_name, instance_id, environment)
);

-- Deployment History and Rollbacks
CREATE TABLE deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID REFERENCES container_definitions(id),
    environment TEXT NOT NULL,
    deployment_type TEXT NOT NULL, -- 'deploy', 'rollback', 'scale', 'restart'
    image_tag TEXT NOT NULL,
    config_snapshot JSONB NOT NULL, -- Complete configuration at deployment time
    instances_before INTEGER DEFAULT 0,
    instances_after INTEGER DEFAULT 0,
    deployment_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'rolled_back'
    deployment_strategy TEXT DEFAULT 'rolling_update', -- 'rolling_update', 'blue_green', 'canary'
    rollback_target_id UUID REFERENCES deployment_history(id),
    started_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    deployment_notes TEXT
);

-- Auto-scaling Policies and Rules
CREATE TABLE scaling_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID REFERENCES container_definitions(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    scaling_type TEXT NOT NULL, -- 'horizontal', 'vertical'
    trigger_metric TEXT NOT NULL, -- 'cpu', 'memory', 'request_rate', 'response_time'
    scale_up_threshold NUMERIC NOT NULL,
    scale_down_threshold NUMERIC NOT NULL,
    scale_up_adjustment INTEGER NOT NULL, -- Number of instances to add
    scale_down_adjustment INTEGER NOT NULL, -- Number of instances to remove
    cooldown_period INTEGER DEFAULT 300, -- Seconds between scaling actions
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Container Network Management
CREATE TABLE container_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_name TEXT NOT NULL UNIQUE,
    network_type TEXT NOT NULL, -- 'internal', 'external', 'overlay'
    environment TEXT NOT NULL,
    subnet CIDR,
    gateway INET,
    dns_config JSONB DEFAULT '{}',
    network_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX idx_container_instances_definition ON container_instances(definition_id);
CREATE INDEX idx_container_instances_environment ON container_instances(environment);
CREATE INDEX idx_container_instances_status ON container_instances(current_status);
CREATE INDEX idx_container_events_instance ON container_events(instance_id);
CREATE INDEX idx_container_events_timestamp ON container_events(timestamp DESC);
CREATE INDEX idx_container_metrics_instance ON container_metrics(instance_id);
CREATE INDEX idx_container_metrics_collected_at ON container_metrics(collected_at DESC);
CREATE INDEX idx_service_registry_service_env ON service_registry(service_name, environment);
CREATE INDEX idx_deployment_history_definition ON deployment_history(definition_id);
CREATE INDEX idx_deployment_history_started_at ON deployment_history(started_at DESC);

-- Row Level Security policies
ALTER TABLE container_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_networks ENABLE ROW LEVEL SECURITY;

-- RLS policies for system administrators and developers
CREATE POLICY "System admins can manage containers" ON container_definitions
    FOR ALL USING (auth.jwt() ->> 'role' IN ('system_admin', 'devops_engineer'));

CREATE POLICY "Developers can read container state" ON container_instances
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('system_admin', 'devops_engineer', 'developer'));

CREATE POLICY "System monitoring can write metrics" ON container_metrics
    FOR INSERT USING (auth.jwt() ->> 'role' IN ('system_admin', 'monitoring_system'));
```

## API Endpoints

### Container Definition Management
```typescript
// GET /api/containers/definitions
interface GetContainerDefinitionsResponse {
  definitions: {
    id: string;
    name: string;
    service_name: string;
    image_name: string;
    image_tag: string;
    resource_limits: {
      cpu: string;
      memory: string;
      storage: string;
    };
    scaling_config: {
      min_replicas: number;
      max_replicas: number;
      target_cpu: number;
      target_memory: number;
    };
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }[];
  total_count: number;
}

// POST /api/containers/definitions
interface CreateContainerDefinitionRequest {
  name: string;
  service_name: string;
  image_name: string;
  image_tag?: string;
  registry_url?: string;
  environment_config?: Record<string, any>;
  resource_limits: {
    cpu: string;
    memory: string;
    storage?: string;
  };
  health_check_config?: {
    endpoint: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  scaling_config: {
    min_replicas: number;
    max_replicas: number;
    target_cpu: number;
    target_memory: number;
  };
  network_config?: {
    ports: number[];
    internal_networks: string[];
    external_networks: string[];
  };
  volume_mounts?: Array<{
    source: string;
    target: string;
    read_only: boolean;
  }>;
}

// PUT /api/containers/definitions/{definition_id}
interface UpdateContainerDefinitionRequest extends Partial<CreateContainerDefinitionRequest> {}

// DELETE /api/containers/definitions/{definition_id}
```

### Container Instance Management
```typescript
// GET /api/containers/instances
interface GetContainerInstancesResponse {
  instances: {
    id: string;
    definition_id: string;
    definition_name: string;
    service_name: string;
    environment: string;
    container_id: string;
    instance_name: string;
    current_status: string;
    desired_status: string;
    replica_number: number;
    node_name: string;
    ip_address: string;
    port_mappings: Record<string, number>;
    resource_usage: {
      cpu_percent: number;
      memory_mb: number;
      disk_mb: number;
    };
    health_status: string;
    last_health_check: string;
    restart_count: number;
    started_at: string;
    created_at: string;
  }[];
  total_count: number;
}

// POST /api/containers/instances/{definition_id}/deploy
interface DeployContainerRequest {
  environment: string;
  replica_count?: number;
  deployment_strategy?: 'rolling_update' | 'blue_green' | 'canary';
  deployment_notes?: string;
}

// POST /api/containers/instances/{instance_id}/action
interface ContainerActionRequest {
  action: 'start' | 'stop' | 'restart' | 'terminate';
  force?: boolean;
  reason?: string;
}

// GET /api/containers/instances/{instance_id}/logs
interface GetContainerLogsResponse {
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    source: string;
  }>;
  has_more: boolean;
  next_cursor?: string;
}

// GET /api/containers/instances/{instance_id}/metrics
interface GetInstanceMetricsResponse {
  metrics: {
    cpu: Array<{
      timestamp: string;
      value: number;
      unit: string;
    }>;
    memory: Array<{
      timestamp: string;
      value: number;
      unit: string;
    }>;
    disk: Array<{
      timestamp: string;
      value: number;
      unit: string;
    }>;
    network: Array<{
      timestamp: string;
      rx_bytes: number;
      tx_bytes: number;
    }>;
  };
  time_range: {
    from: string;
    to: string;
  };
}
```

### Service Discovery and Load Balancing
```typescript
// GET /api/containers/services
interface GetServicesResponse {
  services: {
    service_name: string;
    environment: string;
    instances: Array<{
      instance_id: string;
      endpoint_url: string;
      health_check_url: string;
      is_healthy: boolean;
      load_balancer_weight: number;
      last_heartbeat: string;
    }>;
    total_instances: number;
    healthy_instances: number;
  }[];
}

// POST /api/containers/services/{service_name}/discover
interface ServiceDiscoveryRequest {
  environment: string;
  filters?: Record<string, any>;
}

// PUT /api/containers/services/{service_name}/instances/{instance_id}/weight
interface UpdateLoadBalancerWeightRequest {
  weight: number; // 0-100
  reason?: string;
}
```

### Deployment and Rollback Management
```typescript
// GET /api/containers/deployments
interface GetDeploymentsResponse {
  deployments: {
    id: string;
    definition_id: string;
    definition_name: string;
    environment: string;
    deployment_type: string;
    image_tag: string;
    instances_before: number;
    instances_after: number;
    deployment_status: string;
    deployment_strategy: string;
    started_by: string;
    started_at: string;
    completed_at: string;
    deployment_notes: string;
  }[];
  total_count: number;
}

// POST /api/containers/deployments/{deployment_id}/rollback
interface RollbackDeploymentRequest {
  target_deployment_id?: string; // If not provided, rollback to previous
  reason: string;
  force?: boolean;
}

// GET /api/containers/deployments/{deployment_id}/status
interface GetDeploymentStatusResponse {
  deployment: {
    id: string;
    status: string;
    progress: {
      total_steps: number;
      completed_steps: number;
      current_step: string;
      errors: string[];
    };
    instances: Array<{
      instance_id: string;
      status: string;
      health_status: string;
      started_at: string;
    }>;
  };
}
```

### Auto-scaling Management
```typescript
// GET /api/containers/scaling/policies
interface GetScalingPoliciesResponse {
  policies: {
    id: string;
    definition_id: string;
    definition_name: string;
    environment: string;
    policy_name: string;
    scaling_type: string;
    trigger_metric: string;
    scale_up_threshold: number;
    scale_down_threshold: number;
    scale_up_adjustment: number;
    scale_down_adjustment: number;
    cooldown_period: number;
    is_enabled: boolean;
    created_at: string;
  }[];
}

// POST /api/containers/scaling/policies
interface CreateScalingPolicyRequest {
  definition_id: string;
  environment: string;
  policy_name: string;
  scaling_type: 'horizontal' | 'vertical';
  trigger_metric: 'cpu' | 'memory' | 'request_rate' | 'response_time';
  scale_up_threshold: number;
  scale_down_threshold: number;
  scale_up_adjustment: number;
  scale_down_adjustment: number;
  cooldown_period?: number;
}

// POST /api/containers/scaling/manual
interface ManualScaleRequest {
  definition_id: string;
  environment: string;
  target_replicas: number;
  reason?: string;
}
```

## React Components

### Container Management Dashboard
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Container as ContainerIcon, 
  Server, 
  TrendingUp, 
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Settings,
  Eye,
  BarChart3
} from 'lucide-react';

interface ContainerInstance {
  id: string;
  definition_name: string;
  service_name: string;
  environment: string;
  current_status: string;
  health_status: string;
  resource_usage: {
    cpu_percent: number;
    memory_mb: number;
    disk_mb: number;
  };
  replica_number: number;
  node_name: string;
  restart_count: number;
  started_at: string;
}

interface ContainerDefinition {
  id: string;
  name: string;
  service_name: string;
  image_name: string;
  image_tag: string;
  resource_limits: {
    cpu: string;
    memory: string;
  };
  scaling_config: {
    min_replicas: number;
    max_replicas: number;
    target_cpu: number;
  };
  is_active: boolean;
}

const ContainerManagementDashboard: React.FC = () => {
  const [instances, setInstances] = useState<ContainerInstance[]>([]);
  const [definitions, setDefinitions] = useState<ContainerDefinition[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('production');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContainerData();
    const interval = setInterval(loadContainerData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedEnvironment]);

  const loadContainerData = async () => {
    try {
      const [instancesRes, definitionsRes] = await Promise.all([
        fetch(`/api/containers/instances?environment=${selectedEnvironment}`),
        fetch('/api/containers/definitions')
      ]);

      if (!instancesRes.ok || !definitionsRes.ok) {
        throw new Error('Failed to load container data');
      }

      const instancesData = await instancesRes.json();
      const definitionsData = await definitionsRes.json();

      setInstances(instancesData.instances);
      setDefinitions(definitionsData.definitions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceAction = async (instanceId: string, action: string) => {
    try {
      const response = await fetch(`/api/containers/instances/${instanceId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: `Manual ${action} from dashboard` })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} container`);
      }

      await loadContainerData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const formatResourceUsage = (usage: number, unit: string = '%'): string => {
    return `${usage.toFixed(1)}${unit}`;
  };

  const calculateTotalResources = () => {
    return instances.reduce((totals, instance) => {
      if (instance.current_status === 'running') {
        totals.cpu += instance.resource_usage.cpu_percent;
        totals.memory += instance.resource_usage.memory_mb;
        totals.disk += instance.resource_usage.disk_mb;
      }
      return totals;
    }, { cpu: 0, memory: 0, disk: 0 });
  };

  const runningInstances = instances.filter(i => i.current_status === 'running');
  const unhealthyInstances = instances.filter(i => i.health_status === 'unhealthy');
  const totalResources = calculateTotalResources();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading container data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Container Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage containerized services across environments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
          <Button onClick={loadContainerData} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Containers</CardTitle>
            <ContainerIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{runningInstances.length}</div>
            <p className="text-xs text-gray-600">
              {instances.length} total containers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unhealthy Services</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unhealthyInstances.length}</div>
            <p className="text-xs text-gray-600">
              {unhealthyInstances.length > 0 ? 'Requires attention' : 'All services healthy'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResourceUsage(totalResources.cpu / runningInstances.length || 0)}</div>
            <Progress value={totalResources.cpu / runningInstances.length || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Server className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalResources.memory / 1024)}GB</div>
            <p className="text-xs text-gray-600">
              {runningInstances.length} containers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="instances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="instances">Container Instances</TabsTrigger>
          <TabsTrigger value="definitions">Container Definitions</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="scaling">Auto-scaling</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4">
          <div className="grid gap-4">
            {instances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{instance.definition_name}</CardTitle>
                      <CardDescription>
                        {instance.service_name} • Replica {instance.replica_number} • {instance.node_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${getStatusColor(instance.current_status)} text-white`}
                      >
                        {instance.current_status}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={getHealthColor(instance.health_status)}
                      >
                        {instance.health_status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">CPU Usage</label>
                      <div className="flex items-center gap-2">
                        <Progress value={instance.resource_usage.cpu_percent} className="flex-1" />
                        <span className="text-sm font-medium">
                          {formatResourceUsage(instance.resource_usage.cpu_percent)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Memory Usage</label>
                      <div className="text-sm">
                        {Math.round(instance.resource_usage.memory_mb)} MB
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Restart Count</label>
                      <div className="text-sm">{instance.restart_count}</div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/containers/${instance.id}/logs`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Logs
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/containers/${instance.id}/metrics`, '_blank')}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Metrics
                    </Button>
                    {instance.current_status === 'running' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInstanceAction(instance.id, 'restart')}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restart
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInstanceAction(instance.id, 'stop')}
                        >
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInstanceAction(instance.id, 'start')}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleInstanceAction(instance.id, 'terminate')}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Terminate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="definitions">
          <div className="text-center py-12">
            <ContainerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Container definitions management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="deployments">
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Deployment history and rollback management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="scaling">
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Auto-scaling policies management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContainerManagementDashboard;
```

## Implementation

### Core Container Management Service
```typescript
// src/lib/containers/ContainerService.ts
import { createClient } from '@supabase/supabase-js';
import { Docker } from 'dockerode';

export interface ContainerConfig {
  image: string;
  tag: string;
  environment: Record<string, string>;
  ports: Record<string, number>;
  volumes: Array<{
    source: string;
    target: string;
    readOnly?: boolean;
  }>;
  resources: {
    cpuLimit: string;
    memoryLimit: string;
    storageLimit?: string;
  };
  healthCheck: {
    endpoint: string;
    interval: number;
    timeout: number;
    retries: number;
  };
}

export interface ScalingPolicy {
  minReplicas: number;
  maxReplicas: number;
  targetCpuPercent: number;
  targetMemoryPercent: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

export class ContainerService {
  private docker: Docker;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.docker = new Docker();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async createContainerDefinition(definition: {
    name: string;
    serviceName: string;
    imageName: string;
    imageTag: string;
    config: ContainerConfig;
    scalingConfig: ScalingPolicy;
  }): Promise<{ id: string }> {
    try {
      const { data, error } = await this.supabase
        .from('container_definitions')
        .insert({
          name: definition.name,
          service_name: definition.serviceName,
          image_name: definition.imageName,
          image_tag: definition.imageTag,
          environment_config: definition.config.environment,
          resource_limits: {
            cpu: definition.config.resources.cpuLimit,
            memory: definition.config.resources.memoryLimit,
            storage: definition.config.resources.storageLimit
          },
          health_check_config: definition.config.healthCheck,
          scaling_config: {
            min_replicas: definition.scalingConfig.minReplicas,
            max_replicas: definition.scalingConfig.maxReplicas,
            target_cpu: definition.scalingConfig.targetCpuPercent,
            target_memory: definition.scalingConfig.targetMemoryPercent
          },
          network_config: {
            ports: Object.keys(definition.config.ports).map(p => parseInt(p)),
            internal_networks: ['app'],
            external_networks: []
          },
          volume_mounts: definition.config.volumes
        })
        .select()
        .single();

      if (error) throw error;

      await this.logContainerEvent({
        definitionId: data.id,
        eventType: 'definition_created',
        eventSource: 'system',
        eventData: { definition: definition.name }
      });

      return { id: data.id };
    } catch (error) {
      throw new Error(`Failed to create container definition: ${error}`);
    }
  }

  async deployContainer(definitionId: string, environment: string, options: {
    replicaCount?: number;
    deploymentStrategy?: 'rolling_update' | 'blue_green' | 'canary';
    deploymentNotes?: string;
  } = {}): Promise<{ deploymentId: string }> {
    try {
      // Get container definition
      const { data: definition, error: definitionError } = await this.supabase
        .from('container_definitions')
        .select('*')
        .eq('id', definitionId)
        .single();

      if (definitionError) throw definitionError;

      // Create deployment record
      const { data: deployment, error: deploymentError } = await this.supabase
        .from('deployment_history')
        .insert({
          definition_id: definitionId,
          environment,
          deployment_type: 'deploy',
          image_tag: definition.image_tag,
          config_snapshot: definition,
          instances_after: options.replicaCount || definition.scaling_config.min_replicas,
          deployment_strategy: options.deploymentStrategy || 'rolling_update',
          deployment_notes: options.deploymentNotes,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (deploymentError) throw deploymentError;

      // Start deployment process
      await this.executeDeployment(deployment.id, definition, environment, 
        options.replicaCount || definition.scaling_config.min_replicas);

      return { deploymentId: deployment.id };
    } catch (error) {
      throw new Error(`Failed to deploy container: ${error}`);
    }
  }

  private async executeDeployment(deploymentId: string, definition: any, 
                                  environment: string, replicaCount: number): Promise<void> {
    try {
      // Update deployment status
      await this.supabase
        .from('deployment_history')
        .update({ deployment_status: 'in_progress' })
        .eq('id', deploymentId);

      const createdInstances = [];

      // Create container instances
      for (let i = 1; i <= replicaCount; i++) {
        const containerName = `${definition.name}-${environment}-${i}`;
        
        // Create Docker container
        const container = await this.docker.createContainer({
          Image: `${definition.image_name}:${definition.image_tag}`,
          name: containerName,
          Env: Object.entries(definition.environment_config || {}).map(
            ([key, value]) => `${key}=${value}`
          ),
          HostConfig: {
            Memory: this.parseMemoryLimit(definition.resource_limits.memory),
            CpuShares: this.parseCpuLimit(definition.resource_limits.cpu),
            RestartPolicy: {
              Name: 'unless-stopped'
            },
            PortBindings: this.createPortBindings(definition.network_config.ports),
            Binds: (definition.volume_mounts || []).map((vol: any) => 
              `${vol.source}:${vol.target}${vol.read_only ? ':ro' : ''}`
            )
          },
          Labels: {
            'wedsync.service': definition.service_name,
            'wedsync.environment': environment,
            'wedsync.definition': definition.id,
            'wedsync.replica': i.toString()
          }
        });

        // Start container
        await container.start();
        const containerInfo = await container.inspect();

        // Create database record
        const { data: instance, error } = await this.supabase
          .from('container_instances')
          .insert({
            definition_id: definition.id,
            environment,
            container_id: container.id,
            instance_name: containerName,
            current_status: 'running',
            desired_status: 'running',
            replica_number: i,
            node_name: 'local', // In production, this would be the actual node
            ip_address: containerInfo.NetworkSettings.IPAddress,
            port_mappings: this.extractPortMappings(containerInfo.NetworkSettings.Ports),
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create instance record:', error);
          continue;
        }

        createdInstances.push(instance);

        // Register service for discovery
        await this.registerService({
          serviceName: definition.service_name,
          instanceId: instance.id,
          environment,
          endpointUrl: `http://${containerInfo.NetworkSettings.IPAddress}:${definition.network_config.ports[0]}`,
          healthCheckUrl: definition.health_check_config?.endpoint ? 
            `http://${containerInfo.NetworkSettings.IPAddress}:${definition.network_config.ports[0]}${definition.health_check_config.endpoint}` : 
            undefined
        });

        // Log event
        await this.logContainerEvent({
          instanceId: instance.id,
          definitionId: definition.id,
          eventType: 'started',
          eventSource: 'deployment',
          eventData: { deployment_id: deploymentId, replica_number: i }
        });
      }

      // Update deployment status
      await this.supabase
        .from('deployment_history')
        .update({ 
          deployment_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', deploymentId);

      // Start health monitoring for new instances
      for (const instance of createdInstances) {
        this.startHealthMonitoring(instance.id);
      }

    } catch (error) {
      // Mark deployment as failed
      await this.supabase
        .from('deployment_history')
        .update({ 
          deployment_status: 'failed',
          error_details: { error: error.toString() },
          completed_at: new Date().toISOString()
        })
        .eq('id', deploymentId);

      throw error;
    }
  }

  async manageContainerInstance(instanceId: string, action: 'start' | 'stop' | 'restart' | 'terminate'): Promise<void> {
    try {
      // Get instance data
      const { data: instance, error } = await this.supabase
        .from('container_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (error) throw error;

      const container = this.docker.getContainer(instance.container_id);

      switch (action) {
        case 'start':
          await container.start();
          await this.updateInstanceStatus(instanceId, 'running');
          break;
        case 'stop':
          await container.stop();
          await this.updateInstanceStatus(instanceId, 'stopped');
          break;
        case 'restart':
          await container.restart();
          await this.updateInstanceStatus(instanceId, 'running');
          // Increment restart count
          await this.supabase
            .from('container_instances')
            .update({ restart_count: instance.restart_count + 1 })
            .eq('id', instanceId);
          break;
        case 'terminate':
          await container.stop();
          await container.remove();
          await this.updateInstanceStatus(instanceId, 'terminated');
          await this.unregisterService(instance.service_name, instanceId, instance.environment);
          break;
      }

      // Log the action
      await this.logContainerEvent({
        instanceId,
        definitionId: instance.definition_id,
        eventType: action,
        eventSource: 'user',
        eventData: { action, timestamp: new Date().toISOString() }
      });

    } catch (error) {
      throw new Error(`Failed to ${action} container: ${error}`);
    }
  }

  private async startHealthMonitoring(instanceId: string): Promise<void> {
    // This would typically be handled by a separate monitoring service
    // Here's a simplified version for demonstration
    const checkHealth = async () => {
      try {
        const { data: instance } = await this.supabase
          .from('container_instances')
          .select('*')
          .eq('id', instanceId)
          .single();

        if (!instance || instance.current_status !== 'running') return;

        // Get container definition for health check config
        const { data: definition } = await this.supabase
          .from('container_definitions')
          .select('health_check_config')
          .eq('id', instance.definition_id)
          .single();

        if (!definition?.health_check_config?.endpoint) return;

        // Perform health check
        const healthCheckUrl = `http://${instance.ip_address}:${Object.keys(definition.network_config?.ports || {})[0]}${definition.health_check_config.endpoint}`;
        
        const startTime = Date.now();
        try {
          const response = await fetch(healthCheckUrl, {
            timeout: definition.health_check_config.timeout * 1000
          });
          
          const responseTime = Date.now() - startTime;
          const isHealthy = response.ok;

          // Update health status
          await this.supabase
            .from('container_instances')
            .update({
              health_status: isHealthy ? 'healthy' : 'unhealthy',
              last_health_check: new Date().toISOString()
            })
            .eq('id', instanceId);

          // Log health check result
          await this.logContainerEvent({
            instanceId,
            definitionId: instance.definition_id,
            eventType: 'health_check',
            eventSource: 'health_monitor',
            eventData: {
              status: isHealthy ? 'healthy' : 'unhealthy',
              response_time: responseTime,
              status_code: response.status
            }
          });

        } catch (healthError) {
          // Health check failed
          await this.supabase
            .from('container_instances')
            .update({
              health_status: 'unhealthy',
              last_health_check: new Date().toISOString()
            })
            .eq('id', instanceId);

          await this.logContainerEvent({
            instanceId,
            definitionId: instance.definition_id,
            eventType: 'health_check',
            eventSource: 'health_monitor',
            eventData: {
              status: 'unhealthy',
              error: healthError.toString()
            }
          });
        }

      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    };

    // Start periodic health checks
    setInterval(checkHealth, 30000); // Every 30 seconds
    checkHealth(); // Initial check
  }

  private async registerService(serviceData: {
    serviceName: string;
    instanceId: string;
    environment: string;
    endpointUrl: string;
    healthCheckUrl?: string;
  }): Promise<void> {
    await this.supabase
      .from('service_registry')
      .insert({
        service_name: serviceData.serviceName,
        instance_id: serviceData.instanceId,
        environment: serviceData.environment,
        endpoint_url: serviceData.endpointUrl,
        health_check_url: serviceData.healthCheckUrl,
        is_healthy: true,
        registered_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString()
      });
  }

  private async unregisterService(serviceName: string, instanceId: string, environment: string): Promise<void> {
    await this.supabase
      .from('service_registry')
      .delete()
      .eq('service_name', serviceName)
      .eq('instance_id', instanceId)
      .eq('environment', environment);
  }

  private async updateInstanceStatus(instanceId: string, status: string): Promise<void> {
    await this.supabase
      .from('container_instances')
      .update({ 
        current_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);
  }

  private async logContainerEvent(event: {
    instanceId?: string;
    definitionId: string;
    eventType: string;
    eventSource: string;
    eventData: any;
    errorMessage?: string;
    userId?: string;
  }): Promise<void> {
    await this.supabase
      .from('container_events')
      .insert({
        instance_id: event.instanceId,
        definition_id: event.definitionId,
        event_type: event.eventType,
        event_source: event.eventSource,
        event_data: event.eventData,
        error_message: event.errorMessage,
        user_id: event.userId,
        timestamp: new Date().toISOString()
      });
  }

  private parseMemoryLimit(memoryString: string): number {
    const match = memoryString.match(/^(\d+)(.*)?$/);
    if (!match) return 512 * 1024 * 1024; // Default 512MB

    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || 'mb';

    switch (unit) {
      case 'gb': case 'g': return value * 1024 * 1024 * 1024;
      case 'mb': case 'm': return value * 1024 * 1024;
      case 'kb': case 'k': return value * 1024;
      default: return value;
    }
  }

  private parseCpuLimit(cpuString: string): number {
    // Convert CPU limit (e.g., "1000m" = 1 CPU) to Docker CPU shares
    const match = cpuString.match(/^(\d+)(.*)?$/);
    if (!match) return 1024; // Default shares

    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || 'm';

    return unit === 'm' ? Math.round((value / 1000) * 1024) : value * 1024;
  }

  private createPortBindings(ports: number[]): Record<string, any> {
    const bindings: Record<string, any> = {};
    
    ports.forEach((port, index) => {
      const hostPort = port + index; // Simple port mapping strategy
      bindings[`${port}/tcp`] = [{ HostPort: hostPort.toString() }];
    });
    
    return bindings;
  }

  private extractPortMappings(dockerPorts: any): Record<string, number> {
    const mappings: Record<string, number> = {};
    
    Object.entries(dockerPorts || {}).forEach(([containerPort, hostBindings]: [string, any]) => {
      if (hostBindings && hostBindings[0]) {
        const containerPortNum = containerPort.split('/')[0];
        mappings[containerPortNum] = parseInt(hostBindings[0].HostPort);
      }
    });
    
    return mappings;
  }

  async getContainerMetrics(instanceId: string, timeRange: { from: Date; to: Date }): Promise<{
    cpu: Array<{ timestamp: string; value: number; unit: string }>;
    memory: Array<{ timestamp: string; value: number; unit: string }>;
    disk: Array<{ timestamp: string; value: number; unit: string }>;
    network: Array<{ timestamp: string; rx_bytes: number; tx_bytes: number }>;
  }> {
    try {
      const { data: metrics, error } = await this.supabase
        .from('container_metrics')
        .select('*')
        .eq('instance_id', instanceId)
        .gte('collected_at', timeRange.from.toISOString())
        .lte('collected_at', timeRange.to.toISOString())
        .order('collected_at', { ascending: true });

      if (error) throw error;

      // Group metrics by type
      const groupedMetrics = {
        cpu: [] as Array<{ timestamp: string; value: number; unit: string }>,
        memory: [] as Array<{ timestamp: string; value: number; unit: string }>,
        disk: [] as Array<{ timestamp: string; value: number; unit: string }>,
        network: [] as Array<{ timestamp: string; rx_bytes: number; tx_bytes: number }>
      };

      metrics.forEach(metric => {
        const dataPoint = {
          timestamp: metric.collected_at,
          value: metric.metric_value,
          unit: metric.metric_unit
        };

        switch (metric.metric_type) {
          case 'cpu':
            groupedMetrics.cpu.push(dataPoint);
            break;
          case 'memory':
            groupedMetrics.memory.push(dataPoint);
            break;
          case 'disk':
            groupedMetrics.disk.push(dataPoint);
            break;
          case 'network':
            // Handle network metrics differently as they have rx/tx
            if (metric.metric_name === 'rx_bytes') {
              const existing = groupedMetrics.network.find(n => n.timestamp === metric.collected_at);
              if (existing) {
                existing.rx_bytes = metric.metric_value;
              } else {
                groupedMetrics.network.push({
                  timestamp: metric.collected_at,
                  rx_bytes: metric.metric_value,
                  tx_bytes: 0
                });
              }
            } else if (metric.metric_name === 'tx_bytes') {
              const existing = groupedMetrics.network.find(n => n.timestamp === metric.collected_at);
              if (existing) {
                existing.tx_bytes = metric.metric_value;
              } else {
                groupedMetrics.network.push({
                  timestamp: metric.collected_at,
                  rx_bytes: 0,
                  tx_bytes: metric.metric_value
                });
              }
            }
            break;
        }
      });

      return groupedMetrics;
    } catch (error) {
      throw new Error(`Failed to get container metrics: ${error}`);
    }
  }
}
```

## Integration Requirements

### MCP Server Usage
- **PostgreSQL MCP**: Execute container management queries, migrations, and data analysis
- **Supabase MCP**: Manage environment-specific deployments and monitor system health
- **Browser MCP**: Test container health endpoints and validate service discovery
- **Ref MCP**: Access Docker API documentation and containerization best practices

### Navigation Integration
```typescript
// Add to src/lib/navigation/navigationConfig.ts
{
  id: 'container-management',
  label: 'Container Management',
  href: '/admin/containers',
  icon: 'Container',
  roles: ['system_admin', 'devops_engineer'],
  subItems: [
    {
      id: 'container-instances',
      label: 'Container Instances',
      href: '/admin/containers/instances',
      icon: 'Server'
    },
    {
      id: 'container-definitions',
      label: 'Container Definitions',
      href: '/admin/containers/definitions',
      icon: 'Settings'
    },
    {
      id: 'deployments',
      label: 'Deployments',
      href: '/admin/containers/deployments',
      icon: 'Upload'
    },
    {
      id: 'scaling-policies',
      label: 'Auto-scaling',
      href: '/admin/containers/scaling',
      icon: 'TrendingUp'
    },
    {
      id: 'service-discovery',
      label: 'Service Discovery',
      href: '/admin/containers/services',
      icon: 'Network'
    }
  ]
}
```

## Testing Strategy

### Unit Testing
```typescript
// __tests__/ContainerService.test.ts
import { ContainerService } from '@/lib/containers/ContainerService';

describe('ContainerService', () => {
  let containerService: ContainerService;

  beforeEach(() => {
    containerService = new ContainerService();
  });

  test('should create container definition with valid configuration', async () => {
    const definition = {
      name: 'test-service',
      serviceName: 'wedding-api',
      imageName: 'wedsync/api',
      imageTag: 'v1.0.0',
      config: {
        image: 'wedsync/api',
        tag: 'v1.0.0',
        environment: { NODE_ENV: 'production' },
        ports: { '3000': 3000 },
        volumes: [],
        resources: {
          cpuLimit: '1000m',
          memoryLimit: '2Gi'
        },
        healthCheck: {
          endpoint: '/health',
          interval: 30,
          timeout: 10,
          retries: 3
        }
      },
      scalingConfig: {
        minReplicas: 1,
        maxReplicas: 5,
        targetCpuPercent: 70,
        targetMemoryPercent: 80,
        scaleUpCooldown: 300,
        scaleDownCooldown: 600
      }
    };

    const result = await containerService.createContainerDefinition(definition);
    expect(result.id).toBeDefined();
  });

  test('should deploy container with correct configuration', async () => {
    // Mock container definition exists
    const result = await containerService.deployContainer('test-definition-id', 'staging', {
      replicaCount: 2,
      deploymentStrategy: 'rolling_update'
    });
    
    expect(result.deploymentId).toBeDefined();
  });
});
```

### Integration Testing with Browser MCP
```typescript
// __tests__/integration/container-dashboard.test.ts
import { mcp_playwright } from '@/lib/testing/mcp-helpers';

describe('Container Management Dashboard', () => {
  test('should display running containers', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/containers' 
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('Running Containers');
    expect(snapshot).toContain('Container Instances');
  });

  test('should allow container restart action', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/containers' 
    });

    // Find running container and restart it
    const restartButton = await mcp_playwright.browser_click({
      element: 'Restart button for test-service container',
      ref: '[data-testid="restart-test-service-1"]'
    });

    // Verify status update
    await mcp_playwright.browser_wait_for({ text: 'Container restarted successfully' });
    
    const screenshot = await mcp_playwright.browser_take_screenshot({
      filename: 'container-restart-success.png'
    });
  });
});
```

### Performance Testing
```typescript
// __tests__/performance/container-scaling.test.ts
describe('Container Auto-scaling Performance', () => {
  test('should scale up under load', async () => {
    // Simulate high CPU load
    const loadTest = await fetch('/api/containers/instances/test-instance-id/metrics', {
      method: 'POST',
      body: JSON.stringify({
        metric_type: 'cpu',
        metric_name: 'cpu_percent',
        metric_value: 85 // Above scale-up threshold
      })
    });

    // Wait for scaling decision
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute

    // Verify new instances created
    const instances = await fetch('/api/containers/instances?environment=production');
    const data = await instances.json();
    
    expect(data.instances.filter(i => i.service_name === 'test-service').length).toBeGreaterThan(1);
  });
});
```

## Security Considerations

### Access Control
- **Role-based permissions**: Only system administrators and DevOps engineers can manage containers
- **Environment isolation**: Strict separation between dev/staging/production environments
- **Audit logging**: All container actions logged with user attribution
- **Resource limits**: Enforce container resource quotas to prevent resource exhaustion

### Container Security
- **Image scanning**: Automated vulnerability scanning for container images
- **Secret management**: Secure handling of environment variables and secrets
- **Network isolation**: Proper container networking and firewall rules
- **Non-root execution**: Containers run with non-privileged users where possible

## Performance Optimization

### Resource Management
- **Intelligent scaling**: CPU and memory-based auto-scaling with configurable thresholds
- **Health monitoring**: Continuous container health checks with automatic recovery
- **Resource optimization**: Dynamic resource allocation based on usage patterns
- **Load balancing**: Distribute traffic across healthy container instances

### Monitoring and Alerting
- **Real-time metrics**: Container performance metrics collection every 30 seconds
- **Proactive alerts**: Automated notifications for container failures or performance issues
- **Capacity planning**: Historical resource usage analysis for capacity planning
- **Cost optimization**: Automatic scaling down during low-usage periods

## Business Impact

### Operational Excellence
- **99.9% uptime**: Improved service availability through automated container management
- **Faster deployments**: Reduced deployment time from hours to minutes
- **Cost savings**: 30% reduction in infrastructure costs through optimal resource utilization
- **Developer productivity**: Self-service container deployment capabilities

### Wedding Industry Benefits
- **Peak season handling**: Automatic scaling during busy wedding seasons
- **Disaster recovery**: Quick service recovery with automated container restart
- **Global performance**: Optimized container placement for worldwide wedding venues
- **Vendor reliability**: Consistent service availability for wedding vendor integrations

## Maintenance and Monitoring

### Automated Maintenance
- **Health monitoring**: Continuous container health checks every 30 seconds
- **Auto-recovery**: Automatic restart of failed containers
- **Log rotation**: Automated container log management and archival
- **Security updates**: Automated base image updates with vulnerability patches

### Performance Monitoring
- **Resource tracking**: Real-time CPU, memory, and storage utilization
- **Service discovery**: Automatic service registration and health status updates
- **Deployment tracking**: Complete audit trail of all container deployments and changes
- **Cost monitoring**: Resource cost tracking and optimization recommendations

## Documentation

### API Documentation
- **OpenAPI specification**: Complete API documentation with examples
- **SDK examples**: Code examples for common container management operations
- **Integration guides**: Step-by-step integration documentation
- **Troubleshooting**: Common issues and resolution procedures

### Operational Runbooks
- **Deployment procedures**: Standardized container deployment workflows
- **Incident response**: Container failure response and recovery procedures
- **Scaling policies**: Guidelines for configuring auto-scaling policies
- **Security procedures**: Container security hardening and compliance checks

## Effort Estimation

### Development: 16-20 days
- **Database design and setup**: 2 days
- **Core container service implementation**: 5 days
- **API endpoints development**: 3 days
- **React dashboard components**: 4 days
- **Auto-scaling and health monitoring**: 3 days
- **Docker integration and deployment logic**: 2-3 days
- **Service discovery implementation**: 1-2 days

### Testing: 8-10 days
- **Unit tests for container service**: 3 days
- **Integration tests with Docker**: 2 days
- **Browser MCP dashboard testing**: 2 days
- **Performance and load testing**: 2 days
- **Security and access control testing**: 1-2 days

### Documentation and Deployment: 4-5 days
- **API documentation**: 1 day
- **User guides and runbooks**: 2 days
- **Production deployment and configuration**: 1-2 days

**Total Estimated Effort: 28-35 days**

This comprehensive container management system provides WedSync with enterprise-grade container orchestration capabilities, ensuring high availability, optimal performance, and cost-effective scaling for the wedding coordination platform.