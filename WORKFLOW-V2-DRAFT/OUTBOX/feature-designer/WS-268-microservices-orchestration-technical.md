# WS-268: Microservices Orchestration System - Technical Specification

## Summary
A comprehensive microservices orchestration platform for WedSync providing service mesh management, intelligent service discovery, distributed workflow orchestration, inter-service communication optimization, failure handling, and comprehensive observability. This system coordinates complex wedding workflows across multiple services while ensuring resilience, scalability, and maintainability.

## Technical Requirements

### Core Functionality
- **Service Mesh Management**: Istio-based service mesh with traffic management, security policies, and observability
- **Intelligent Service Discovery**: Dynamic service registration, health checking, and load balancing with consul integration
- **Workflow Orchestration**: Distributed saga pattern implementation for complex wedding workflows
- **Message Bus Integration**: Event-driven architecture with reliable message delivery and dead letter queues
- **Circuit Breaker Management**: Automatic failure detection, isolation, and recovery for service resilience
- **Configuration Management**: Centralized configuration with dynamic updates and environment-specific overrides
- **Distributed Tracing**: End-to-end request tracing across all microservices with performance analytics

### Business Context
In the wedding industry, coordination involves complex workflows spanning multiple services (booking, payments, vendor management, guest coordination). This orchestration system ensures seamless communication between services, handles failures gracefully during critical wedding events, and provides visibility into complex multi-service operations.

### User Stories

#### Wedding Planners Managing Complex Events
> "When a couple books a full-service wedding package, the system should automatically coordinate between venue booking, catering orders, photographer scheduling, and payment processing. If any service fails during this process, I need the system to handle it gracefully and notify me of what needs manual intervention."

#### Development Teams
> "When deploying new microservices, the orchestration system should automatically register them, apply security policies, and begin health monitoring. We need detailed tracing to debug issues that span multiple services, and the ability to roll back problematic deployments without affecting other services."

#### System Operations
> "During peak wedding season, our system needs to automatically scale services based on demand, reroute traffic away from unhealthy instances, and provide real-time visibility into service performance. I need alerts when cascading failures might impact wedding day operations."

## Database Schema

```sql
-- Service Registry and Discovery
CREATE TABLE microservices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL UNIQUE,
    service_version TEXT NOT NULL DEFAULT '1.0.0',
    service_description TEXT,
    service_type TEXT NOT NULL, -- 'api', 'worker', 'scheduler', 'gateway'
    deployment_environment TEXT NOT NULL, -- 'development', 'staging', 'production'
    base_url TEXT,
    health_check_endpoint TEXT DEFAULT '/health',
    metrics_endpoint TEXT DEFAULT '/metrics',
    documentation_url TEXT,
    owner_team TEXT,
    dependencies JSONB DEFAULT '[]', -- Array of service dependencies
    configuration_schema JSONB DEFAULT '{}', -- JSON schema for service config
    resource_requirements JSONB DEFAULT '{}', -- CPU, memory, storage requirements
    scaling_config JSONB DEFAULT '{}', -- Min/max replicas, scaling triggers
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service Instances and Runtime State
CREATE TABLE service_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microservice_id UUID REFERENCES microservices(id) ON DELETE CASCADE,
    instance_id TEXT NOT NULL UNIQUE, -- Container/pod ID
    node_name TEXT,
    ip_address INET NOT NULL,
    port INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'starting', -- 'starting', 'healthy', 'unhealthy', 'terminating'
    version TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Instance-specific metadata
    resource_usage JSONB DEFAULT '{}', -- Current resource consumption
    last_health_check TIMESTAMPTZ,
    health_check_failures INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service Mesh Configuration
CREATE TABLE service_mesh_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL UNIQUE,
    policy_type TEXT NOT NULL, -- 'traffic', 'security', 'observability', 'resilience'
    source_services JSONB DEFAULT '[]', -- Services this policy applies to
    target_services JSONB DEFAULT '[]', -- Target services for the policy
    policy_config JSONB NOT NULL, -- Istio/Envoy configuration
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority policies applied first
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Orchestration (Saga Pattern)
CREATE TABLE distributed_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    workflow_version TEXT DEFAULT '1.0.0',
    workflow_definition JSONB NOT NULL, -- Complete workflow definition
    correlation_id TEXT UNIQUE, -- Business correlation ID
    wedding_id UUID, -- Link to wedding if applicable
    initiating_service TEXT NOT NULL,
    current_status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'compensating'
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    context_data JSONB DEFAULT '{}', -- Workflow context and variables
    compensation_stack JSONB DEFAULT '[]', -- Stack of compensation actions
    error_details JSONB, -- Error information if failed
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Steps Execution
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES distributed_workflows(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL, -- 'service_call', 'compensation', 'decision', 'parallel', 'delay'
    step_order INTEGER NOT NULL,
    service_name TEXT, -- Target service for this step
    service_endpoint TEXT, -- Specific endpoint to call
    input_data JSONB DEFAULT '{}', -- Input parameters for this step
    output_data JSONB, -- Output from step execution
    compensation_action JSONB, -- Compensation action definition
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'compensated'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inter-Service Communication Events
CREATE TABLE service_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'request', 'response', 'error', 'timeout'
    trace_id TEXT NOT NULL, -- Distributed tracing ID
    span_id TEXT NOT NULL,
    parent_span_id TEXT,
    source_service TEXT NOT NULL,
    target_service TEXT,
    method TEXT, -- HTTP method or event type
    endpoint TEXT, -- Endpoint or event name
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    duration_ms INTEGER,
    error_message TEXT,
    correlation_id TEXT, -- Business correlation ID
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    headers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Circuit Breaker State Management
CREATE TABLE circuit_breakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    target_service TEXT NOT NULL,
    endpoint_pattern TEXT DEFAULT '*', -- Specific endpoint or wildcard
    current_state TEXT DEFAULT 'closed', -- 'closed', 'open', 'half_open'
    failure_threshold INTEGER DEFAULT 5,
    success_threshold INTEGER DEFAULT 3, -- For half-open state
    timeout_duration INTEGER DEFAULT 60, -- Seconds before attempting half-open
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0, -- In half-open state
    last_failure_at TIMESTAMPTZ,
    state_changed_at TIMESTAMPTZ DEFAULT now(),
    next_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(service_name, target_service, endpoint_pattern)
);

-- Service Configuration Management
CREATE TABLE service_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microservice_id UUID REFERENCES microservices(id) ON DELETE CASCADE,
    environment TEXT NOT NULL, -- 'development', 'staging', 'production'
    config_version TEXT NOT NULL,
    configuration JSONB NOT NULL, -- Complete service configuration
    secrets_refs JSONB DEFAULT '[]', -- References to secret values
    is_active BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,
    checksum TEXT, -- Configuration integrity check
    applied_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(microservice_id, environment, config_version)
);

-- Service Dependency Graph
CREATE TABLE service_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_service_id UUID REFERENCES microservices(id) ON DELETE CASCADE,
    target_service_id UUID REFERENCES microservices(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL, -- 'synchronous', 'asynchronous', 'database', 'cache'
    is_critical BOOLEAN DEFAULT false, -- Critical dependency that affects service health
    circuit_breaker_enabled BOOLEAN DEFAULT true,
    timeout_ms INTEGER DEFAULT 5000,
    retry_policy JSONB DEFAULT '{}', -- Retry configuration
    fallback_strategy TEXT, -- 'fail_fast', 'default_response', 'circuit_breaker'
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_service_id, target_service_id)
);

-- Message Queue and Event Bus
CREATE TABLE message_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL UNIQUE,
    queue_type TEXT NOT NULL, -- 'topic', 'queue', 'dead_letter'
    message_pattern TEXT, -- Routing pattern for messages
    producer_services JSONB DEFAULT '[]', -- Services that publish to this queue
    consumer_services JSONB DEFAULT '[]', -- Services that consume from this queue
    retention_hours INTEGER DEFAULT 168, -- 7 days default
    max_message_size INTEGER DEFAULT 1048576, -- 1MB default
    dlq_enabled BOOLEAN DEFAULT true,
    dlq_max_retries INTEGER DEFAULT 3,
    monitoring_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Message Processing Logs
CREATE TABLE message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    correlation_id TEXT,
    trace_id TEXT,
    producer_service TEXT NOT NULL,
    consumer_service TEXT,
    message_type TEXT NOT NULL,
    message_payload JSONB,
    headers JSONB DEFAULT '{}',
    status TEXT DEFAULT 'produced', -- 'produced', 'delivered', 'consumed', 'failed', 'dead_letter'
    retry_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    error_message TEXT,
    produced_at TIMESTAMPTZ DEFAULT now(),
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Service Metrics and Observability
CREATE TABLE service_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    instance_id UUID REFERENCES service_instances(id),
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- 'counter', 'gauge', 'histogram', 'summary'
    metric_value NUMERIC NOT NULL,
    metric_labels JSONB DEFAULT '{}', -- Prometheus-style labels
    time_bucket TIMESTAMPTZ NOT NULL,
    bucket_size TEXT NOT NULL, -- 'second', 'minute', 'hour'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Distributed Tracing
CREATE TABLE distributed_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    parent_span_id TEXT,
    operation_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    span_kind TEXT DEFAULT 'internal', -- 'client', 'server', 'producer', 'consumer', 'internal'
    status_code TEXT DEFAULT 'ok', -- 'ok', 'error', 'timeout'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_microseconds INTEGER,
    tags JSONB DEFAULT '{}', -- Span tags for filtering and analysis
    logs JSONB DEFAULT '[]', -- Span logs for debugging
    baggage JSONB DEFAULT '{}', -- Cross-process baggage
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX(trace_id),
    INDEX(service_name, start_time)
);

-- Indexes for performance optimization
CREATE INDEX idx_service_instances_microservice ON service_instances(microservice_id);
CREATE INDEX idx_service_instances_status ON service_instances(status);
CREATE INDEX idx_service_events_trace_id ON service_events(trace_id);
CREATE INDEX idx_service_events_source_service ON service_events(source_service);
CREATE INDEX idx_service_events_created_at ON service_events(created_at DESC);
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX idx_circuit_breakers_service_target ON circuit_breakers(service_name, target_service);
CREATE INDEX idx_service_metrics_service_time ON service_metrics(service_name, time_bucket DESC);
CREATE INDEX idx_message_logs_queue_status ON message_logs(queue_name, status);
CREATE INDEX idx_distributed_traces_trace_service ON distributed_traces(trace_id, service_name);

-- Row Level Security policies
ALTER TABLE microservices ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_mesh_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributed_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for system administrators and service mesh
CREATE POLICY "System admins can manage microservices" ON microservices
    FOR ALL USING (auth.jwt() ->> 'role' IN ('system_admin', 'platform_engineer'));

CREATE POLICY "Services can register themselves" ON service_instances
    FOR INSERT USING (auth.jwt() ->> 'service_name' = 
        (SELECT service_name FROM microservices WHERE id = microservice_id));

CREATE POLICY "System monitoring can read all events" ON service_events
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('system_admin', 'monitoring_system', 'platform_engineer'));
```

## API Endpoints

### Service Registry and Discovery
```typescript
// GET /api/orchestration/services
interface GetServicesResponse {
  services: {
    id: string;
    service_name: string;
    service_version: string;
    service_type: string;
    deployment_environment: string;
    health_status: 'healthy' | 'degraded' | 'unhealthy';
    instance_count: number;
    healthy_instances: number;
    dependencies: string[];
    resource_usage: {
      cpu_percent: number;
      memory_mb: number;
      requests_per_minute: number;
    };
    last_deployment: string;
  }[];
  total_services: number;
  healthy_services: number;
}

// POST /api/orchestration/services
interface RegisterServiceRequest {
  service_name: string;
  service_version: string;
  service_type: string;
  service_description?: string;
  deployment_environment: string;
  base_url?: string;
  health_check_endpoint?: string;
  metrics_endpoint?: string;
  dependencies: string[];
  configuration_schema?: Record<string, any>;
  resource_requirements: {
    cpu_limit: string;
    memory_limit: string;
    storage_limit?: string;
  };
  scaling_config: {
    min_replicas: number;
    max_replicas: number;
    target_cpu_percent: number;
  };
}

// PUT /api/orchestration/services/{service_id}
interface UpdateServiceRequest extends Partial<RegisterServiceRequest> {}

// GET /api/orchestration/services/{service_id}/instances
interface GetServiceInstancesResponse {
  instances: {
    id: string;
    instance_id: string;
    node_name: string;
    ip_address: string;
    port: number;
    status: string;
    version: string;
    resource_usage: {
      cpu_percent: number;
      memory_mb: number;
      disk_mb: number;
    };
    health_check_failures: number;
    started_at: string;
    last_seen_at: string;
  }[];
  total_count: number;
}

// POST /api/orchestration/services/{service_id}/instances
interface RegisterInstanceRequest {
  instance_id: string;
  node_name: string;
  ip_address: string;
  port: number;
  version: string;
  metadata?: Record<string, any>;
}

// DELETE /api/orchestration/services/{service_id}/instances/{instance_id}
```

### Workflow Orchestration
```typescript
// GET /api/orchestration/workflows
interface GetWorkflowsResponse {
  workflows: {
    id: string;
    workflow_name: string;
    workflow_version: string;
    correlation_id: string;
    wedding_id?: string;
    initiating_service: string;
    current_status: string;
    current_step: number;
    total_steps: number;
    progress_percentage: number;
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
  }[];
  status_summary: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    compensating: number;
  };
}

// POST /api/orchestration/workflows
interface StartWorkflowRequest {
  workflow_name: string;
  workflow_version?: string;
  correlation_id?: string;
  wedding_id?: string;
  initiating_service: string;
  context_data: Record<string, any>;
  timeout_minutes?: number;
}

interface StartWorkflowResponse {
  workflow_id: string;
  correlation_id: string;
  status: string;
  estimated_duration_minutes: number;
}

// GET /api/orchestration/workflows/{workflow_id}/status
interface GetWorkflowStatusResponse {
  workflow: {
    id: string;
    workflow_name: string;
    current_status: string;
    current_step: number;
    total_steps: number;
    context_data: Record<string, any>;
    started_at: string;
    completed_at?: string;
    timeout_at: string;
    error_details?: {
      step_name: string;
      error_message: string;
      retry_count: number;
    };
  };
  steps: Array<{
    id: string;
    step_name: string;
    step_type: string;
    step_order: number;
    service_name: string;
    status: string;
    input_data: Record<string, any>;
    output_data?: Record<string, any>;
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    retry_count: number;
    error_message?: string;
  }>;
  execution_timeline: Array<{
    timestamp: string;
    event: string;
    step_name: string;
    details: Record<string, any>;
  }>;
}

// POST /api/orchestration/workflows/{workflow_id}/compensate
interface CompensateWorkflowRequest {
  reason: string;
  compensation_strategy?: 'all' | 'partial' | 'custom';
  custom_steps?: string[]; // Specific steps to compensate
}

// POST /api/orchestration/workflows/{workflow_id}/retry
interface RetryWorkflowRequest {
  retry_strategy: 'current_step' | 'failed_steps' | 'from_step';
  from_step?: number;
  max_retries?: number;
}
```

### Service Mesh and Traffic Management
```typescript
// GET /api/orchestration/mesh/policies
interface GetMeshPoliciesResponse {
  policies: {
    id: string;
    policy_name: string;
    policy_type: string;
    source_services: string[];
    target_services: string[];
    is_enabled: boolean;
    priority: number;
    created_at: string;
    applied_instances: number;
    policy_summary: string;
  }[];
  policy_types: Array<{
    type: string;
    count: number;
    enabled_count: number;
  }>;
}

// POST /api/orchestration/mesh/policies
interface CreateMeshPolicyRequest {
  policy_name: string;
  policy_type: 'traffic' | 'security' | 'observability' | 'resilience';
  source_services: string[];
  target_services: string[];
  policy_config: {
    // Traffic Management
    load_balancing?: {
      algorithm: 'round_robin' | 'least_connections' | 'weighted';
      weights?: Record<string, number>;
    };
    traffic_splitting?: {
      routes: Array<{
        destination: string;
        weight: number;
        conditions?: Record<string, any>;
      }>;
    };
    rate_limiting?: {
      requests_per_second: number;
      burst_size: number;
    };
    // Security
    mutual_tls?: {
      mode: 'strict' | 'permissive' | 'disabled';
    };
    authorization?: {
      rules: Array<{
        from: string[];
        to: string[];
        when: Record<string, any>;
      }>;
    };
    // Resilience
    circuit_breaker?: {
      failure_threshold: number;
      timeout_duration: number;
    };
    retry_policy?: {
      max_attempts: number;
      timeout_per_attempt: number;
      retry_conditions: string[];
    };
    // Observability
    tracing?: {
      sampling_rate: number;
      custom_tags: Record<string, string>;
    };
    metrics?: {
      enabled: boolean;
      custom_metrics: string[];
    };
  };
  priority?: number;
}

// PUT /api/orchestration/mesh/policies/{policy_id}
interface UpdateMeshPolicyRequest extends Partial<CreateMeshPolicyRequest> {}

// POST /api/orchestration/mesh/policies/{policy_id}/apply
interface ApplyPolicyResponse {
  policy_id: string;
  applied_to_services: string[];
  applied_to_instances: number;
  application_status: 'success' | 'partial' | 'failed';
  errors?: Array<{
    service: string;
    instance: string;
    error: string;
  }>;
}
```

### Circuit Breaker Management
```typescript
// GET /api/orchestration/circuit-breakers
interface GetCircuitBreakersResponse {
  circuit_breakers: {
    id: string;
    service_name: string;
    target_service: string;
    endpoint_pattern: string;
    current_state: string;
    failure_count: number;
    success_count: number;
    failure_threshold: number;
    last_failure_at?: string;
    state_changed_at: string;
    next_attempt_at?: string;
    state_duration_seconds: number;
  }[];
  state_summary: {
    closed: number;
    open: number;
    half_open: number;
  };
}

// POST /api/orchestration/circuit-breakers
interface CreateCircuitBreakerRequest {
  service_name: string;
  target_service: string;
  endpoint_pattern?: string;
  failure_threshold: number;
  success_threshold: number;
  timeout_duration: number;
}

// PUT /api/orchestration/circuit-breakers/{breaker_id}/reset
interface ResetCircuitBreakerRequest {
  reason: string;
  force?: boolean;
}

// GET /api/orchestration/circuit-breakers/{breaker_id}/metrics
interface GetCircuitBreakerMetricsResponse {
  metrics: {
    total_requests_24h: number;
    failed_requests_24h: number;
    success_rate_24h: number;
    state_changes_24h: number;
    average_failure_duration_minutes: number;
  };
  state_history: Array<{
    timestamp: string;
    from_state: string;
    to_state: string;
    trigger: string;
  }>;
  failure_patterns: Array<{
    hour: number;
    failure_count: number;
    total_requests: number;
    failure_rate: number;
  }>;
}
```

### Distributed Tracing and Observability
```typescript
// GET /api/orchestration/traces
interface GetTracesResponse {
  traces: {
    trace_id: string;
    root_service: string;
    operation_name: string;
    start_time: string;
    duration_ms: number;
    span_count: number;
    service_count: number;
    error_count: number;
    status: string;
    tags: Record<string, string>;
  }[];
  trace_stats: {
    total_traces: number;
    avg_duration_ms: number;
    error_rate: number;
    services_involved: string[];
  };
}

// GET /api/orchestration/traces/{trace_id}
interface GetTraceDetailsResponse {
  trace: {
    trace_id: string;
    total_duration_ms: number;
    span_count: number;
    service_count: number;
    start_time: string;
    end_time: string;
    root_operation: string;
    status: string;
    error_message?: string;
  };
  spans: Array<{
    span_id: string;
    parent_span_id?: string;
    operation_name: string;
    service_name: string;
    span_kind: string;
    start_time: string;
    duration_microseconds: number;
    status_code: string;
    tags: Record<string, string>;
    logs: Array<{
      timestamp: string;
      level: string;
      message: string;
      fields: Record<string, any>;
    }>;
    children: string[]; // Child span IDs
  }>;
  service_map: Array<{
    source_service: string;
    target_service: string;
    request_count: number;
    error_count: number;
    avg_duration_ms: number;
  }>;
}

// GET /api/orchestration/traces/search
interface SearchTracesRequest {
  service_name?: string;
  operation_name?: string;
  tags?: Record<string, string>;
  duration_min_ms?: number;
  duration_max_ms?: number;
  start_time?: string;
  end_time?: string;
  has_errors?: boolean;
  limit?: number;
  offset?: number;
}

// GET /api/orchestration/observability/service-map
interface GetServiceMapResponse {
  services: Array<{
    service_name: string;
    service_type: string;
    instance_count: number;
    health_status: string;
    request_rate_per_minute: number;
    error_rate: number;
    avg_response_time_ms: number;
    position?: { x: number; y: number }; // For visualization
  }>;
  connections: Array<{
    source_service: string;
    target_service: string;
    request_count_1h: number;
    error_count_1h: number;
    avg_latency_ms: number;
    connection_strength: number; // 1-100 for visualization thickness
    protocol: string;
  }>;
  dependency_graph: {
    critical_paths: Array<{
      path: string[];
      failure_impact_score: number;
    }>;
    circular_dependencies: string[][];
  };
}
```

### Message Queue and Event Management
```typescript
// GET /api/orchestration/messages/queues
interface GetMessageQueuesResponse {
  queues: {
    id: string;
    queue_name: string;
    queue_type: string;
    message_count: number;
    consumer_count: number;
    producer_count: number;
    messages_per_minute: number;
    avg_processing_time_ms: number;
    dlq_message_count: number;
    retention_hours: number;
    is_active: boolean;
  }[];
  queue_stats: {
    total_queues: number;
    total_messages_processed_1h: number;
    avg_processing_time_ms: number;
    failed_message_rate: number;
  };
}

// POST /api/orchestration/messages/queues
interface CreateMessageQueueRequest {
  queue_name: string;
  queue_type: 'topic' | 'queue' | 'dead_letter';
  message_pattern?: string;
  producer_services: string[];
  consumer_services: string[];
  retention_hours?: number;
  max_message_size?: number;
  dlq_enabled?: boolean;
  dlq_max_retries?: number;
  monitoring_config?: {
    alert_on_backlog: number;
    alert_on_processing_time: number;
  };
}

// GET /api/orchestration/messages/queues/{queue_name}/messages
interface GetQueueMessagesResponse {
  messages: {
    id: string;
    message_id: string;
    correlation_id?: string;
    producer_service: string;
    consumer_service?: string;
    message_type: string;
    message_size_bytes: number;
    status: string;
    retry_count: number;
    processing_time_ms?: number;
    error_message?: string;
    produced_at: string;
    consumed_at?: string;
    headers: Record<string, string>;
  }[];
  queue_metrics: {
    total_messages: number;
    pending_messages: number;
    processing_messages: number;
    failed_messages: number;
    average_age_seconds: number;
  };
}

// POST /api/orchestration/messages/send
interface SendMessageRequest {
  queue_name: string;
  message_type: string;
  message_payload: Record<string, any>;
  correlation_id?: string;
  headers?: Record<string, string>;
  delay_seconds?: number;
  ttl_seconds?: number;
}

interface SendMessageResponse {
  message_id: string;
  queue_name: string;
  status: 'queued' | 'delayed' | 'failed';
  estimated_processing_time?: string;
}
```

## React Components

### Microservices Orchestration Dashboard
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
  Server, 
  GitBranch, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Network,
  MessageSquare,
  Shield,
  Eye,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface MicroserviceInfo {
  id: string;
  service_name: string;
  service_version: string;
  service_type: string;
  deployment_environment: string;
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  instance_count: number;
  healthy_instances: number;
  dependencies: string[];
  resource_usage: {
    cpu_percent: number;
    memory_mb: number;
    requests_per_minute: number;
  };
  last_deployment: string;
}

interface WorkflowInfo {
  id: string;
  workflow_name: string;
  correlation_id: string;
  wedding_id?: string;
  current_status: string;
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  started_at: string;
  duration_ms?: number;
}

interface CircuitBreakerInfo {
  id: string;
  service_name: string;
  target_service: string;
  current_state: string;
  failure_count: number;
  failure_threshold: number;
  state_duration_seconds: number;
}

const MicroservicesOrchestrationDashboard: React.FC = () => {
  const [services, setServices] = useState<MicroserviceInfo[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerInfo[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('production');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [selectedEnvironment]);

  const loadDashboardData = async () => {
    try {
      const [servicesRes, workflowsRes, circuitBreakersRes] = await Promise.all([
        fetch(`/api/orchestration/services?environment=${selectedEnvironment}`),
        fetch('/api/orchestration/workflows?limit=20'),
        fetch('/api/orchestration/circuit-breakers')
      ]);

      if (!servicesRes.ok || !workflowsRes.ok || !circuitBreakersRes.ok) {
        throw new Error('Failed to load orchestration data');
      }

      const [servicesData, workflowsData, circuitBreakersData] = await Promise.all([
        servicesRes.json(),
        workflowsRes.json(),
        circuitBreakersRes.json()
      ]);

      setServices(servicesData.services);
      setWorkflows(workflowsData.workflows);
      setCircuitBreakers(circuitBreakersData.circuit_breakers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'compensating': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'closed': return 'text-green-600';
      case 'half_open': return 'text-yellow-600';
      case 'open': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const calculateSystemHealth = () => {
    if (services.length === 0) return { status: 'unknown', percentage: 0 };
    
    const healthyServices = services.filter(s => s.health_status === 'healthy').length;
    const percentage = (healthyServices / services.length) * 100;
    
    if (percentage >= 90) return { status: 'healthy', percentage };
    if (percentage >= 70) return { status: 'degraded', percentage };
    return { status: 'unhealthy', percentage };
  };

  const systemHealth = calculateSystemHealth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading orchestration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Microservices Orchestration</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage distributed services, workflows, and system health
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
          <Button onClick={loadDashboardData} variant="outline">
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

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className={`h-4 w-4 ${getHealthStatusColor(systemHealth.status)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthStatusColor(systemHealth.status)}`}>
              {systemHealth.percentage.toFixed(0)}%
            </div>
            <Progress value={systemHealth.percentage} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">
              {services.filter(s => s.health_status === 'healthy').length}/{services.length} services healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <GitBranch className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {workflows.filter(w => w.current_status === 'running').length}
            </div>
            <p className="text-xs text-gray-600">
              {workflows.length} total workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Circuit Breakers</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {circuitBreakers.filter(cb => cb.current_state === 'open').length}
            </div>
            <p className="text-xs text-gray-600">
              {circuitBreakers.length} total breakers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(services.reduce((sum, s) => sum + s.resource_usage.requests_per_minute, 0))}
            </div>
            <p className="text-xs text-gray-600">requests/min</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="mesh">Service Mesh</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="tracing">Tracing</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{service.service_name}</CardTitle>
                      <CardDescription>
                        {service.service_type} • v{service.service_version} • {service.deployment_environment}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getHealthStatusColor(service.health_status)}>
                        {service.health_status}
                      </Badge>
                      <Badge variant="outline">
                        {service.healthy_instances}/{service.instance_count} instances
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">CPU Usage</label>
                      <div className="flex items-center gap-2">
                        <Progress value={service.resource_usage.cpu_percent} className="flex-1" />
                        <span className="text-sm font-medium">
                          {service.resource_usage.cpu_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Memory</label>
                      <div className="text-sm font-medium">
                        {Math.round(service.resource_usage.memory_mb)} MB
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Request Rate</label>
                      <div className="text-sm font-medium">
                        {formatNumber(service.resource_usage.requests_per_minute)}/min
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Dependencies</label>
                      <div className="text-sm">
                        {service.dependencies.length} services
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {service.dependencies.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Depends on: {service.dependencies.slice(0, 3).join(', ')}
                          {service.dependencies.length > 3 && ` +${service.dependencies.length - 3} more`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Metrics
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="w-4 h-4 mr-1" />
                        Config
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{workflow.workflow_name}</CardTitle>
                      <CardDescription>
                        {workflow.correlation_id}
                        {workflow.wedding_id && ` • Wedding ${workflow.wedding_id.slice(0, 8)}`}
                      </CardDescription>
                    </div>
                    <Badge className={`${getWorkflowStatusColor(workflow.current_status)} text-white`}>
                      {workflow.current_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{workflow.current_step}/{workflow.total_steps} steps</span>
                      </div>
                      <Progress value={workflow.progress_percentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-600">Started</label>
                        <div>{new Date(workflow.started_at).toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Duration</label>
                        <div>
                          {workflow.duration_ms ? 
                            formatDuration(workflow.duration_ms) : 
                            formatDuration(Date.now() - new Date(workflow.started_at).getTime())
                          }
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Current Step</label>
                        <div>{workflow.current_step} of {workflow.total_steps}</div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Status</label>
                        <div className="capitalize">{workflow.current_status}</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      {workflow.current_status === 'running' && (
                        <Button size="sm" variant="outline">
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      {workflow.current_status === 'failed' && (
                        <Button size="sm" variant="outline">
                          <Play className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mesh">
          <div className="text-center py-12">
            <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Service mesh policies and traffic management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="circuit-breakers" className="space-y-4">
          <div className="grid gap-4">
            {circuitBreakers.map((breaker) => (
              <Card key={breaker.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {breaker.service_name} → {breaker.target_service}
                      </CardTitle>
                      <CardDescription>
                        Circuit breaker monitoring service communication
                      </CardDescription>
                    </div>
                    <Badge className={getCircuitBreakerColor(breaker.current_state)}>
                      {breaker.current_state}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Current State</label>
                      <div className={`font-medium ${getCircuitBreakerColor(breaker.current_state)}`}>
                        {breaker.current_state.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Failure Count</label>
                      <div className="font-medium">
                        {breaker.failure_count}/{breaker.failure_threshold}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">State Duration</label>
                      <div className="font-medium">
                        {formatDuration(breaker.state_duration_seconds * 1000)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Health</label>
                      <div className="font-medium">
                        {breaker.current_state === 'closed' ? 'Healthy' : 
                         breaker.current_state === 'open' ? 'Failing' : 'Testing'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Metrics
                      </Button>
                      <Button size="sm" variant="outline">
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tracing">
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Distributed tracing and observability coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Message queue management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MicroservicesOrchestrationDashboard;
```

## Implementation

### Core Orchestration Service
```typescript
// src/lib/orchestration/OrchestrationService.ts
import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

export interface WorkflowDefinition {
  name: string;
  version: string;
  steps: WorkflowStep[];
  timeoutMinutes: number;
  compensationStrategy: 'all' | 'partial' | 'none';
}

export interface WorkflowStep {
  name: string;
  type: 'service_call' | 'compensation' | 'decision' | 'parallel' | 'delay';
  order: number;
  serviceName: string;
  endpoint: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  compensationAction?: {
    serviceName: string;
    endpoint: string;
    inputMapping: Record<string, string>;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  timeoutSeconds: number;
  conditions?: Record<string, any>;
}

export interface ServiceRegistration {
  serviceName: string;
  serviceVersion: string;
  serviceType: string;
  baseUrl: string;
  healthCheckEndpoint: string;
  dependencies: string[];
  resourceRequirements: {
    cpuLimit: string;
    memoryLimit: string;
  };
}

export class OrchestrationService extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;
  private activeWorkflows: Map<string, any> = new Map();
  private circuitBreakers: Map<string, any> = new Map();

  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.startHealthMonitoring();
    this.startWorkflowProcessing();
  }

  async registerService(registration: ServiceRegistration): Promise<{ serviceId: string }> {
    try {
      const { data, error } = await this.supabase
        .from('microservices')
        .insert({
          service_name: registration.serviceName,
          service_version: registration.serviceVersion,
          service_type: registration.serviceType,
          deployment_environment: process.env.NODE_ENV || 'development',
          base_url: registration.baseUrl,
          health_check_endpoint: registration.healthCheckEndpoint,
          dependencies: registration.dependencies,
          resource_requirements: {
            cpu_limit: registration.resourceRequirements.cpuLimit,
            memory_limit: registration.resourceRequirements.memoryLimit
          },
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Register service dependencies
      if (registration.dependencies.length > 0) {
        await this.registerDependencies(data.id, registration.dependencies);
      }

      // Initialize circuit breakers for dependencies
      await this.initializeCircuitBreakers(data.id, registration.dependencies);

      this.emit('serviceRegistered', { serviceId: data.id, serviceName: registration.serviceName });
      
      return { serviceId: data.id };
    } catch (error) {
      throw new Error(`Failed to register service: ${error}`);
    }
  }

  async registerServiceInstance(serviceId: string, instance: {
    instanceId: string;
    nodeName: string;
    ipAddress: string;
    port: number;
    version: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('service_instances')
        .insert({
          microservice_id: serviceId,
          instance_id: instance.instanceId,
          node_name: instance.nodeName,
          ip_address: instance.ipAddress,
          port: instance.port,
          status: 'starting',
          version: instance.version,
          metadata: instance.metadata || {},
          started_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        });

      if (error) throw error;

      // Start health monitoring for this instance
      this.startInstanceHealthCheck(serviceId, instance.instanceId);
      
      this.emit('instanceRegistered', { serviceId, instanceId: instance.instanceId });
    } catch (error) {
      throw new Error(`Failed to register service instance: ${error}`);
    }
  }

  async startWorkflow(definition: WorkflowDefinition, context: {
    correlationId?: string;
    weddingId?: string;
    initiatingService: string;
    contextData: Record<string, any>;
  }): Promise<{ workflowId: string; correlationId: string }> {
    try {
      const correlationId = context.correlationId || this.generateCorrelationId();
      
      const { data: workflow, error } = await this.supabase
        .from('distributed_workflows')
        .insert({
          workflow_name: definition.name,
          workflow_version: definition.version,
          workflow_definition: definition,
          correlation_id: correlationId,
          wedding_id: context.weddingId,
          initiating_service: context.initiatingService,
          current_status: 'pending',
          current_step: 0,
          total_steps: definition.steps.length,
          context_data: context.contextData,
          timeout_at: new Date(Date.now() + definition.timeoutMinutes * 60000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create workflow steps
      for (const step of definition.steps) {
        await this.supabase
          .from('workflow_steps')
          .insert({
            workflow_id: workflow.id,
            step_name: step.name,
            step_type: step.type,
            step_order: step.order,
            service_name: step.serviceName,
            service_endpoint: step.endpoint,
            input_data: step.inputMapping,
            compensation_action: step.compensationAction,
            max_retries: step.retryPolicy.maxRetries,
            timeout_seconds: step.timeoutSeconds
          });
      }

      // Start workflow execution
      this.activeWorkflows.set(workflow.id, workflow);
      this.executeWorkflow(workflow.id);
      
      this.emit('workflowStarted', { workflowId: workflow.id, correlationId });
      
      return { workflowId: workflow.id, correlationId };
    } catch (error) {
      throw new Error(`Failed to start workflow: ${error}`);
    }
  }

  private async executeWorkflow(workflowId: string): Promise<void> {
    try {
      // Get workflow and current step
      const { data: workflow, error: workflowError } = await this.supabase
        .from('distributed_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;

      // Check if workflow has timed out
      if (new Date(workflow.timeout_at) < new Date()) {
        await this.timeoutWorkflow(workflowId);
        return;
      }

      // Get next pending step
      const { data: nextStep, error: stepError } = await this.supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('status', 'pending')
        .order('step_order', { ascending: true })
        .limit(1)
        .single();

      if (stepError || !nextStep) {
        // No more steps, complete workflow
        await this.completeWorkflow(workflowId);
        return;
      }

      // Execute the step
      await this.executeWorkflowStep(workflowId, nextStep);
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      await this.failWorkflow(workflowId, error.toString());
    }
  }

  private async executeWorkflowStep(workflowId: string, step: any): Promise<void> {
    try {
      // Update step status to running
      await this.supabase
        .from('workflow_steps')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', step.id);

      // Get workflow context
      const { data: workflow } = await this.supabase
        .from('distributed_workflows')
        .select('context_data')
        .eq('id', workflowId)
        .single();

      let stepResult;
      
      switch (step.step_type) {
        case 'service_call':
          stepResult = await this.executeServiceCall(step, workflow.context_data);
          break;
        case 'decision':
          stepResult = await this.executeDecision(step, workflow.context_data);
          break;
        case 'parallel':
          stepResult = await this.executeParallelSteps(step, workflow.context_data);
          break;
        case 'delay':
          stepResult = await this.executeDelay(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.step_type}`);
      }

      // Update step with results
      await this.supabase
        .from('workflow_steps')
        .update({
          status: 'completed',
          output_data: stepResult,
          completed_at: new Date().toISOString()
        })
        .eq('id', step.id);

      // Update workflow context with step output
      if (stepResult && step.outputMapping) {
        const updatedContext = { ...workflow.context_data };
        Object.entries(step.outputMapping).forEach(([key, value]) => {
          if (stepResult[value]) {
            updatedContext[key] = stepResult[value];
          }
        });

        await this.supabase
          .from('distributed_workflows')
          .update({
            context_data: updatedContext,
            current_step: step.step_order + 1
          })
          .eq('id', workflowId);
      }

      // Continue with next step
      setTimeout(() => this.executeWorkflow(workflowId), 100);
      
    } catch (error) {
      console.error('Step execution error:', error);
      await this.failWorkflowStep(workflowId, step.id, error.toString());
    }
  }

  private async executeServiceCall(step: any, context: Record<string, any>): Promise<any> {
    const circuitBreakerKey = `${step.service_name}:${step.service_endpoint}`;
    const circuitBreaker = await this.getCircuitBreaker(circuitBreakerKey);
    
    // Check circuit breaker state
    if (circuitBreaker.current_state === 'open') {
      if (new Date(circuitBreaker.next_attempt_at) > new Date()) {
        throw new Error('Circuit breaker is open');
      } else {
        // Try half-open
        await this.updateCircuitBreakerState(circuitBreakerKey, 'half_open');
      }
    }

    try {
      // Get service instance
      const serviceInstance = await this.getHealthyServiceInstance(step.service_name);
      if (!serviceInstance) {
        throw new Error(`No healthy instances available for service: ${step.service_name}`);
      }

      // Prepare request
      const requestPayload = this.mapStepInput(step.input_data, context);
      const serviceUrl = `${serviceInstance.base_url}${step.service_endpoint}`;
      
      const startTime = Date.now();
      
      // Make service call
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': context.correlationId,
          'X-Service-Call': 'workflow-orchestration'
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(step.timeout_seconds * 1000)
      });

      const duration = Date.now() - startTime;

      // Log service event
      await this.logServiceEvent({
        eventType: 'request',
        sourceService: 'orchestration-service',
        targetService: step.service_name,
        method: 'POST',
        endpoint: step.service_endpoint,
        requestData: requestPayload,
        statusCode: response.status,
        duration: duration,
        correlationId: context.correlationId
      });

      if (!response.ok) {
        throw new Error(`Service call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Update circuit breaker on success
      await this.recordCircuitBreakerSuccess(circuitBreakerKey);
      
      return result;

    } catch (error) {
      // Update circuit breaker on failure
      await this.recordCircuitBreakerFailure(circuitBreakerKey);
      throw error;
    }
  }

  private async executeDecision(step: any, context: Record<string, any>): Promise<any> {
    // Evaluate decision conditions against context
    const conditions = step.conditions || {};
    
    for (const [conditionKey, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getContextValue(context, conditionKey);
      
      if (actualValue !== expectedValue) {
        return { decision: false, reason: `Condition ${conditionKey} not met` };
      }
    }
    
    return { decision: true, conditions: conditions };
  }

  private async executeParallelSteps(step: any, context: Record<string, any>): Promise<any> {
    // This would execute multiple steps in parallel
    // For now, return a simple result
    return { parallel: true, executed: step.parallelSteps || [] };
  }

  private async executeDelay(step: any): Promise<any> {
    const delayMs = step.delaySeconds * 1000 || 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return { delayed: delayMs };
  }

  private async getHealthyServiceInstance(serviceName: string): Promise<any> {
    const { data: instances, error } = await this.supabase
      .from('service_instances')
      .select(`
        *,
        microservices (base_url)
      `)
      .eq('microservices.service_name', serviceName)
      .eq('status', 'healthy')
      .limit(1);

    if (error || !instances || instances.length === 0) {
      return null;
    }

    return {
      ...instances[0],
      base_url: instances[0].microservices.base_url
    };
  }

  private async getCircuitBreaker(key: string): Promise<any> {
    if (this.circuitBreakers.has(key)) {
      return this.circuitBreakers.get(key);
    }

    const [serviceName, endpoint] = key.split(':');
    
    const { data: breaker } = await this.supabase
      .from('circuit_breakers')
      .select('*')
      .eq('service_name', 'orchestration-service')
      .eq('target_service', serviceName)
      .eq('endpoint_pattern', endpoint)
      .single();

    if (breaker) {
      this.circuitBreakers.set(key, breaker);
      return breaker;
    }

    // Create default circuit breaker
    const defaultBreaker = {
      current_state: 'closed',
      failure_count: 0,
      success_count: 0,
      next_attempt_at: null
    };
    
    this.circuitBreakers.set(key, defaultBreaker);
    return defaultBreaker;
  }

  private async updateCircuitBreakerState(key: string, state: string): Promise<void> {
    const [serviceName, endpoint] = key.split(':');
    
    await this.supabase
      .from('circuit_breakers')
      .upsert({
        service_name: 'orchestration-service',
        target_service: serviceName,
        endpoint_pattern: endpoint,
        current_state: state,
        state_changed_at: new Date().toISOString(),
        next_attempt_at: state === 'open' ? 
          new Date(Date.now() + 60000).toISOString() : // 1 minute timeout
          null
      });

    // Update local cache
    const breaker = this.circuitBreakers.get(key) || {};
    breaker.current_state = state;
    this.circuitBreakers.set(key, breaker);
  }

  private async recordCircuitBreakerSuccess(key: string): Promise<void> {
    const breaker = await this.getCircuitBreaker(key);
    
    if (breaker.current_state === 'half_open') {
      breaker.success_count += 1;
      
      if (breaker.success_count >= 3) { // Configurable threshold
        await this.updateCircuitBreakerState(key, 'closed');
      }
    }
    
    // Reset failure count on success
    breaker.failure_count = 0;
  }

  private async recordCircuitBreakerFailure(key: string): Promise<void> {
    const breaker = await this.getCircuitBreaker(key);
    breaker.failure_count += 1;
    
    const [serviceName, endpoint] = key.split(':');
    
    await this.supabase
      .from('circuit_breakers')
      .upsert({
        service_name: 'orchestration-service',
        target_service: serviceName,
        endpoint_pattern: endpoint,
        current_state: breaker.failure_count >= 5 ? 'open' : breaker.current_state,
        failure_count: breaker.failure_count,
        last_failure_at: new Date().toISOString(),
        state_changed_at: breaker.failure_count >= 5 ? new Date().toISOString() : undefined,
        next_attempt_at: breaker.failure_count >= 5 ? 
          new Date(Date.now() + 60000).toISOString() : 
          undefined
      });

    if (breaker.failure_count >= 5) {
      breaker.current_state = 'open';
    }
    
    this.circuitBreakers.set(key, breaker);
  }

  private async logServiceEvent(event: {
    eventType: string;
    sourceService: string;
    targetService: string;
    method: string;
    endpoint: string;
    requestData?: any;
    statusCode?: number;
    duration?: number;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('service_events')
        .insert({
          event_type: event.eventType,
          trace_id: event.correlationId,
          span_id: this.generateSpanId(),
          source_service: event.sourceService,
          target_service: event.targetService,
          method: event.method,
          endpoint: event.endpoint,
          request_data: event.requestData,
          status_code: event.statusCode,
          duration_ms: event.duration,
          correlation_id: event.correlationId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log service event:', error);
    }
  }

  private mapStepInput(inputMapping: Record<string, string>, context: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    Object.entries(inputMapping).forEach(([outputKey, contextKey]) => {
      result[outputKey] = this.getContextValue(context, contextKey);
    });
    
    return result;
  }

  private getContextValue(context: Record<string, any>, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], context);
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async completeWorkflow(workflowId: string): Promise<void> {
    await this.supabase
      .from('distributed_workflows')
      .update({
        current_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    this.activeWorkflows.delete(workflowId);
    this.emit('workflowCompleted', { workflowId });
  }

  private async failWorkflow(workflowId: string, error: string): Promise<void> {
    await this.supabase
      .from('distributed_workflows')
      .update({
        current_status: 'failed',
        error_details: { error, timestamp: new Date().toISOString() },
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    this.activeWorkflows.delete(workflowId);
    this.emit('workflowFailed', { workflowId, error });
  }

  private async failWorkflowStep(workflowId: string, stepId: string, error: string): Promise<void> {
    await this.supabase
      .from('workflow_steps')
      .update({
        status: 'failed',
        error_message: error,
        completed_at: new Date().toISOString()
      })
      .eq('id', stepId);

    // Check if we should retry or fail the workflow
    const { data: step } = await this.supabase
      .from('workflow_steps')
      .select('retry_count, max_retries')
      .eq('id', stepId)
      .single();

    if (step && step.retry_count < step.max_retries) {
      // Retry the step
      await this.supabase
        .from('workflow_steps')
        .update({
          status: 'pending',
          retry_count: step.retry_count + 1,
          error_message: null
        })
        .eq('id', stepId);

      // Re-execute workflow after delay
      setTimeout(() => this.executeWorkflow(workflowId), 5000);
    } else {
      // Fail the workflow
      await this.failWorkflow(workflowId, `Step failed: ${error}`);
    }
  }

  private async timeoutWorkflow(workflowId: string): Promise<void> {
    await this.supabase
      .from('distributed_workflows')
      .update({
        current_status: 'failed',
        error_details: { error: 'Workflow timeout', timestamp: new Date().toISOString() },
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    this.activeWorkflows.delete(workflowId);
    this.emit('workflowTimeout', { workflowId });
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const { data: instances } = await this.supabase
          .from('service_instances')
          .select(`
            *,
            microservices (base_url, health_check_endpoint)
          `)
          .eq('status', 'healthy');

        if (instances) {
          for (const instance of instances) {
            this.checkInstanceHealth(instance);
          }
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async checkInstanceHealth(instance: any): Promise<void> {
    try {
      const healthUrl = `${instance.microservices.base_url}${instance.microservices.health_check_endpoint}`;
      
      const response = await fetch(healthUrl, {
        timeout: 5000,
        headers: { 'X-Health-Check': 'orchestration-service' }
      });

      const isHealthy = response.ok;
      const newStatus = isHealthy ? 'healthy' : 'unhealthy';
      
      if (instance.status !== newStatus) {
        await this.supabase
          .from('service_instances')
          .update({
            status: newStatus,
            health_check_failures: isHealthy ? 0 : instance.health_check_failures + 1,
            last_health_check: new Date().toISOString()
          })
          .eq('id', instance.id);

        this.emit('instanceHealthChanged', {
          instanceId: instance.id,
          serviceName: instance.microservices.service_name,
          oldStatus: instance.status,
          newStatus
        });
      }

    } catch (error) {
      // Health check failed
      await this.supabase
        .from('service_instances')
        .update({
          status: 'unhealthy',
          health_check_failures: instance.health_check_failures + 1,
          last_health_check: new Date().toISOString()
        })
        .eq('id', instance.id);
    }
  }

  private startInstanceHealthCheck(serviceId: string, instanceId: string): void {
    // Individual instance health checking would be implemented here
    // This is a placeholder for the actual implementation
  }

  private async registerDependencies(serviceId: string, dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      const { data: targetService } = await this.supabase
        .from('microservices')
        .select('id')
        .eq('service_name', dependency)
        .single();

      if (targetService) {
        await this.supabase
          .from('service_dependencies')
          .insert({
            source_service_id: serviceId,
            target_service_id: targetService.id,
            dependency_type: 'synchronous',
            is_critical: true,
            circuit_breaker_enabled: true,
            timeout_ms: 5000
          });
      }
    }
  }

  private async initializeCircuitBreakers(serviceId: string, dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      const circuitBreakerKey = `${serviceId}:${dependency}`;
      await this.supabase
        .from('circuit_breakers')
        .insert({
          service_name: serviceId,
          target_service: dependency,
          endpoint_pattern: '*',
          current_state: 'closed',
          failure_threshold: 5,
          success_threshold: 3,
          timeout_duration: 60
        });
    }
  }

  private startWorkflowProcessing(): void {
    // Process active workflows every 5 seconds
    setInterval(async () => {
      try {
        const { data: pendingWorkflows } = await this.supabase
          .from('distributed_workflows')
          .select('id')
          .eq('current_status', 'pending')
          .limit(10);

        if (pendingWorkflows) {
          for (const workflow of pendingWorkflows) {
            if (!this.activeWorkflows.has(workflow.id)) {
              this.activeWorkflows.set(workflow.id, workflow);
              this.executeWorkflow(workflow.id);
            }
          }
        }
      } catch (error) {
        console.error('Workflow processing error:', error);
      }
    }, 5000);
  }

  async getServiceMap(): Promise<{
    services: Array<{ service_name: string; health_status: string; request_rate: number }>;
    connections: Array<{ source: string; target: string; request_count: number; error_rate: number }>;
  }> {
    try {
      // Get services with health status
      const { data: services } = await this.supabase
        .from('microservices')
        .select(`
          service_name,
          service_instances (status)
        `);

      // Get service communication patterns
      const { data: communications } = await this.supabase
        .from('service_events')
        .select('source_service, target_service, status_code')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      const serviceMap = services?.map(service => ({
        service_name: service.service_name,
        health_status: service.service_instances.every((i: any) => i.status === 'healthy') ? 'healthy' : 'degraded',
        request_rate: communications?.filter(c => c.source_service === service.service_name).length || 0
      })) || [];

      const connections = Object.entries(
        communications?.reduce((acc: any, comm) => {
          const key = `${comm.source_service}->${comm.target_service}`;
          if (!acc[key]) {
            acc[key] = { requests: 0, errors: 0 };
          }
          acc[key].requests += 1;
          if (comm.status_code >= 400) {
            acc[key].errors += 1;
          }
          return acc;
        }, {}) || {}
      ).map(([key, stats]: [string, any]) => {
        const [source, target] = key.split('->');
        return {
          source,
          target,
          request_count: stats.requests,
          error_rate: stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0
        };
      });

      return { services: serviceMap, connections };
    } catch (error) {
      throw new Error(`Failed to get service map: ${error}`);
    }
  }
}
```

## Integration Requirements

### MCP Server Usage
- **PostgreSQL MCP**: Execute orchestration queries, workflow state management, and service registry operations
- **Supabase MCP**: Manage real-time service discovery, workflow events, and distributed tracing
- **Browser MCP**: Test service endpoints, validate orchestration workflows, and monitor dashboard interactions
- **Ref MCP**: Access microservices architecture patterns and distributed systems documentation

### Navigation Integration
```typescript
// Add to src/lib/navigation/navigationConfig.ts
{
  id: 'microservices-orchestration',
  label: 'Microservices',
  href: '/admin/orchestration',
  icon: 'Network',
  roles: ['system_admin', 'platform_engineer'],
  subItems: [
    {
      id: 'orchestration-overview',
      label: 'Overview',
      href: '/admin/orchestration/overview',
      icon: 'BarChart3'
    },
    {
      id: 'service-registry',
      label: 'Service Registry',
      href: '/admin/orchestration/services',
      icon: 'Server'
    },
    {
      id: 'workflow-orchestration',
      label: 'Workflows',
      href: '/admin/orchestration/workflows',
      icon: 'GitBranch'
    },
    {
      id: 'service-mesh',
      label: 'Service Mesh',
      href: '/admin/orchestration/mesh',
      icon: 'Network'
    },
    {
      id: 'circuit-breakers',
      label: 'Circuit Breakers',
      href: '/admin/orchestration/circuit-breakers',
      icon: 'Shield'
    },
    {
      id: 'distributed-tracing',
      label: 'Distributed Tracing',
      href: '/admin/orchestration/tracing',
      icon: 'Eye'
    },
    {
      id: 'message-queues',
      label: 'Message Queues',
      href: '/admin/orchestration/messages',
      icon: 'MessageSquare'
    }
  ]
}
```

## Testing Strategy

### Unit Testing
```typescript
// __tests__/OrchestrationService.test.ts
import { OrchestrationService } from '@/lib/orchestration/OrchestrationService';

describe('OrchestrationService', () => {
  let orchestrationService: OrchestrationService;

  beforeEach(() => {
    orchestrationService = new OrchestrationService();
  });

  test('should register service with dependencies', async () => {
    const registration = {
      serviceName: 'wedding-booking-service',
      serviceVersion: '1.0.0',
      serviceType: 'api',
      baseUrl: 'http://booking-service:3000',
      healthCheckEndpoint: '/health',
      dependencies: ['payment-service', 'notification-service'],
      resourceRequirements: {
        cpuLimit: '500m',
        memoryLimit: '1Gi'
      }
    };

    const result = await orchestrationService.registerService(registration);
    expect(result.serviceId).toBeDefined();
  });

  test('should start and execute workflow', async () => {
    const workflowDefinition = {
      name: 'book-wedding-venue',
      version: '1.0.0',
      steps: [
        {
          name: 'check-availability',
          type: 'service_call' as const,
          order: 1,
          serviceName: 'venue-service',
          endpoint: '/check-availability',
          inputMapping: { venueId: 'venueId', date: 'weddingDate' },
          outputMapping: { available: 'availability' },
          compensationAction: {
            serviceName: 'venue-service',
            endpoint: '/release-hold',
            inputMapping: { holdId: 'holdId' }
          },
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
          },
          timeoutSeconds: 30
        }
      ],
      timeoutMinutes: 30,
      compensationStrategy: 'all' as const
    };

    const result = await orchestrationService.startWorkflow(workflowDefinition, {
      initiatingService: 'wedding-api',
      contextData: {
        venueId: 'venue-123',
        weddingDate: '2024-06-15',
        customerId: 'customer-456'
      }
    });

    expect(result.workflowId).toBeDefined();
    expect(result.correlationId).toBeDefined();
  });

  test('should handle circuit breaker states', async () => {
    // Mock service failures
    for (let i = 0; i < 6; i++) {
      try {
        await orchestrationService.executeServiceCall({
          service_name: 'failing-service',
          service_endpoint: '/api/test'
        }, {});
      } catch (error) {
        // Expected to fail
      }
    }

    const circuitBreaker = await orchestrationService.getCircuitBreaker('failing-service:/api/test');
    expect(circuitBreaker.current_state).toBe('open');
  });
});
```

### Integration Testing with Browser MCP
```typescript
// __tests__/integration/orchestration-dashboard.test.ts
import { mcp_playwright } from '@/lib/testing/mcp-helpers';

describe('Microservices Orchestration Dashboard', () => {
  test('should display service health overview', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/orchestration' 
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('System Health');
    expect(snapshot).toContain('Active Workflows');
    expect(snapshot).toContain('Circuit Breakers');
  });

  test('should show workflow execution details', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/orchestration/workflows' 
    });

    // Click on workflow details
    await mcp_playwright.browser_click({
      element: 'Workflow details button',
      ref: '[data-testid="workflow-details-btn"]'
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('Progress');
    expect(snapshot).toContain('steps');
    expect(snapshot).toContain('Duration');
  });

  test('should visualize service map', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/orchestration/services' 
    });

    const screenshot = await mcp_playwright.browser_take_screenshot({
      filename: 'service-map-visualization.png'
    });

    // Verify service connections are displayed
    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('service_name');
    expect(snapshot).toContain('health_status');
  });
});
```

### Performance Testing
```typescript
// __tests__/performance/orchestration-load.test.ts
describe('Orchestration Performance', () => {
  test('should handle multiple concurrent workflows', async () => {
    const orchestrationService = new OrchestrationService();
    
    const workflowPromises = Array(50).fill(null).map((_, i) => 
      orchestrationService.startWorkflow({
        name: 'performance-test-workflow',
        version: '1.0.0',
        steps: [
          {
            name: 'test-step',
            type: 'service_call',
            order: 1,
            serviceName: 'test-service',
            endpoint: '/api/test',
            inputMapping: { testId: 'testId' },
            outputMapping: { result: 'testResult' },
            retryPolicy: { maxRetries: 1, backoffMultiplier: 1, initialDelay: 100 },
            timeoutSeconds: 5
          }
        ],
        timeoutMinutes: 5,
        compensationStrategy: 'none'
      }, {
        initiatingService: 'performance-test',
        contextData: { testId: `test-${i}` }
      })
    );

    const results = await Promise.all(workflowPromises);
    
    expect(results.length).toBe(50);
    expect(results.every(r => r.workflowId)).toBe(true);
  });

  test('should maintain response times under service mesh load', async () => {
    // Test service discovery and routing performance
    const responseTimes: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      
      const serviceInstance = await orchestrationService.getHealthyServiceInstance('test-service');
      
      const end = Date.now();
      responseTimes.push(end - start);
    }
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
    
    expect(averageResponseTime).toBeLessThan(50); // Under 50ms average
    expect(p95ResponseTime).toBeLessThan(100); // Under 100ms for P95
  });
});
```

## Security Considerations

### Service Communication Security
- **Mutual TLS (mTLS)**: Automatic certificate management and rotation for service-to-service communication
- **Service authentication**: JWT-based service identity validation
- **Network policies**: Kubernetes/Istio network policies for traffic isolation
- **Secrets management**: Secure handling of service credentials and API keys

### Workflow Security
- **Input validation**: Comprehensive validation of workflow inputs and step parameters
- **Context isolation**: Secure isolation of workflow context data between different workflows
- **Audit logging**: Complete audit trail of all workflow executions and service calls
- **Permission boundaries**: Role-based access control for workflow initiation and monitoring

## Performance Optimization

### Service Discovery Optimization
- **Caching strategies**: Multi-level caching of service registry data
- **Connection pooling**: Efficient connection reuse for service-to-service calls
- **Load balancing**: Intelligent load balancing with health-aware routing
- **Geographic routing**: Location-based service routing for global deployments

### Workflow Execution Optimization
- **Parallel execution**: Concurrent execution of independent workflow steps
- **Resource management**: Dynamic resource allocation based on workflow requirements
- **Failure handling**: Fast failure detection and intelligent retry mechanisms
- **Compensation optimization**: Efficient rollback and compensation operations

## Business Impact

### Wedding Operations Excellence
- **Seamless coordination**: Automated coordination between booking, payment, and vendor services
- **Failure resilience**: Graceful handling of service failures during critical wedding operations
- **Scalability**: Automatic scaling of services during peak wedding seasons
- **Vendor integration**: Standardized integration patterns for wedding vendors

### Development Productivity
- **Service autonomy**: Independent development and deployment of microservices
- **Debugging capabilities**: Comprehensive distributed tracing and logging
- **Testing infrastructure**: Integrated testing tools for microservices workflows
- **Documentation**: Auto-generated service documentation and API specifications

## Maintenance and Monitoring

### Automated Operations
- **Health monitoring**: Continuous health checks and automated recovery
- **Performance monitoring**: Real-time performance metrics and alerting
- **Capacity management**: Automatic scaling and resource optimization
- **Configuration management**: Centralized configuration with zero-downtime updates

### Observability and Analytics
- **Distributed tracing**: Complete request tracing across all microservices
- **Metrics collection**: Comprehensive metrics collection and analysis
- **Log aggregation**: Centralized logging with advanced search capabilities
- **Business metrics**: Wedding-specific business metrics and KPIs

## Documentation

### Service Documentation
- **API documentation**: Auto-generated OpenAPI specifications for all services
- **Service contracts**: Clear service interface definitions and contracts
- **Integration guides**: Step-by-step integration guides for new services
- **Troubleshooting guides**: Common issues and resolution procedures

### Operational Documentation
- **Deployment procedures**: Service deployment and orchestration procedures
- **Monitoring runbooks**: Service monitoring and alerting runbooks
- **Disaster recovery**: Service recovery and business continuity procedures
- **Performance optimization**: Service performance tuning and optimization guides

## Effort Estimation

### Development: 20-25 days
- **Database design and setup**: 3 days
- **Service registry and discovery**: 4 days
- **Workflow orchestration engine**: 5 days
- **Circuit breaker implementation**: 2 days
- **Service mesh integration**: 3 days
- **API endpoints development**: 2 days
- **React dashboard components**: 3-4 days

### Testing: 12-15 days
- **Unit tests for orchestration service**: 5 days
- **Integration tests with microservices**: 4 days
- **Performance and load testing**: 2 days
- **Browser MCP dashboard testing**: 1-2 days
- **End-to-end workflow testing**: 2 days

### Documentation and Deployment: 6-8 days
- **Service documentation**: 2 days
- **Operational documentation**: 2 days
- **Integration guides**: 1 day
- **Production deployment and configuration**: 2-3 days

**Total Estimated Effort: 38-48 days**

This comprehensive Microservices Orchestration System provides WedSync with enterprise-grade service coordination capabilities, ensuring reliable, scalable, and maintainable distributed wedding operations while providing complete visibility into complex multi-service workflows.