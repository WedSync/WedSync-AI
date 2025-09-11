# WS-267: API Gateway Enhancement System - Technical Specification

## Summary
A comprehensive API gateway enhancement system for WedSync providing advanced request routing, rate limiting, authentication management, API versioning, monitoring, and performance optimization. This system centralizes API traffic management, implements intelligent caching strategies, provides comprehensive analytics, and ensures secure, scalable API access across all wedding platform services.

## Technical Requirements

### Core Functionality
- **Intelligent Request Routing**: Dynamic routing based on API versions, user roles, geographic location, and load balancing
- **Advanced Rate Limiting**: Multi-tier rate limiting with burst protection, user-specific quotas, and API key management
- **Authentication & Authorization**: Centralized JWT validation, API key management, OAuth integration, and role-based access control
- **API Versioning**: Seamless API version management with backward compatibility and deprecation handling
- **Response Caching**: Intelligent response caching with cache invalidation, edge caching, and performance optimization
- **Request/Response Transformation**: Data transformation, field filtering, response formatting, and protocol translation
- **Comprehensive Monitoring**: Real-time API analytics, performance metrics, error tracking, and business intelligence

### Business Context
In the wedding industry, API reliability is crucial for seamless coordination between couples, vendors, and planners. This enhanced API gateway ensures all wedding-related services communicate efficiently, handles peak traffic during wedding seasons, provides secure access to sensitive wedding data, and maintains high performance across global wedding venues.

### User Stories

#### Wedding API Consumers (Mobile App, Vendor Systems)
> "When our mobile app makes API calls during a wedding day, the requests need to be lightning-fast and reliable. The API gateway should intelligently route requests to the nearest server, cache frequently accessed wedding data, and handle thousands of simultaneous requests from wedding guests using our RSVP system."

#### Wedding Vendors Integrating with WedSync
> "As a catering company integrating with WedSync, I need secure API access with proper rate limiting. The gateway should provide clear API documentation, handle authentication seamlessly, and give me detailed analytics about our API usage and integration health."

#### Development Teams
> "When we deploy new API versions, the gateway should handle version transitions smoothly without breaking existing vendor integrations. We need comprehensive monitoring, request/response logging, and the ability to gradually roll out new features to different user segments."

## Database Schema

```sql
-- API Gateway Configuration
CREATE TABLE api_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    base_url TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    load_balancing_strategy TEXT DEFAULT 'round_robin', -- 'round_robin', 'weighted', 'least_connections', 'geo_based'
    health_check_interval INTEGER DEFAULT 30, -- seconds
    timeout_config JSONB DEFAULT '{}', -- {connect: 5000, read: 30000, write: 10000}
    ssl_config JSONB DEFAULT '{}',
    cors_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backend Services Registration
CREATE TABLE backend_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES api_gateways(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    service_version TEXT DEFAULT '1.0.0',
    service_url TEXT NOT NULL,
    health_check_endpoint TEXT DEFAULT '/health',
    weight INTEGER DEFAULT 100, -- For weighted load balancing
    priority INTEGER DEFAULT 1, -- For failover routing
    is_healthy BOOLEAN DEFAULT true,
    max_connections INTEGER DEFAULT 100,
    timeout_ms INTEGER DEFAULT 30000,
    retry_attempts INTEGER DEFAULT 3,
    circuit_breaker_config JSONB DEFAULT '{}', -- {failure_threshold: 5, timeout: 60000, half_open_max_calls: 3}
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gateway_id, service_name, service_version)
);

-- API Route Definitions
CREATE TABLE api_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES api_gateways(id) ON DELETE CASCADE,
    route_path TEXT NOT NULL, -- e.g., '/api/v1/weddings/{weddingId}'
    route_method TEXT NOT NULL, -- GET, POST, PUT, DELETE, PATCH
    backend_service_id UUID REFERENCES backend_services(id),
    upstream_path TEXT, -- Path transformation for backend
    is_enabled BOOLEAN DEFAULT true,
    route_priority INTEGER DEFAULT 1, -- Higher priority routes checked first
    middleware_config JSONB DEFAULT '[]', -- Array of middleware configurations
    rate_limit_config JSONB DEFAULT '{}',
    auth_requirements JSONB DEFAULT '{}', -- {required: true, roles: ['admin'], scopes: ['read:weddings']}
    cache_config JSONB DEFAULT '{}', -- {enabled: true, ttl: 300, vary_by: ['user_id'], invalidate_on: ['POST', 'PUT']}
    transformation_config JSONB DEFAULT '{}', -- Request/response transformation rules
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gateway_id, route_path, route_method)
);

-- API Keys and Authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL UNIQUE,
    api_key_prefix TEXT NOT NULL, -- First 8 chars for identification
    owner_id UUID REFERENCES auth.users(id),
    owner_type TEXT DEFAULT 'user', -- 'user', 'service', 'vendor'
    scopes JSONB DEFAULT '[]', -- Array of allowed scopes
    allowed_origins JSONB DEFAULT '[]', -- CORS origins
    rate_limit_tier TEXT DEFAULT 'standard', -- 'basic', 'standard', 'premium', 'enterprise'
    usage_quota JSONB DEFAULT '{}', -- {daily: 10000, monthly: 300000}
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rate Limiting Configuration
CREATE TABLE rate_limit_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL, -- 'basic', 'standard', 'premium', 'enterprise'
    requests_per_second INTEGER NOT NULL DEFAULT 10,
    requests_per_minute INTEGER NOT NULL DEFAULT 100,
    requests_per_hour INTEGER NOT NULL DEFAULT 1000,
    requests_per_day INTEGER NOT NULL DEFAULT 10000,
    burst_limit INTEGER NOT NULL DEFAULT 20,
    quota_reset_strategy TEXT DEFAULT 'rolling_window', -- 'fixed_window', 'rolling_window'
    blocked_duration_seconds INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- API Request Logs
CREATE TABLE api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES api_gateways(id),
    route_id UUID REFERENCES api_routes(id),
    api_key_id UUID REFERENCES api_keys(id),
    user_id UUID REFERENCES auth.users(id),
    request_id TEXT NOT NULL UNIQUE, -- Correlation ID
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    query_params JSONB DEFAULT '{}',
    request_headers JSONB DEFAULT '{}',
    request_body_size INTEGER DEFAULT 0,
    response_status INTEGER,
    response_headers JSONB DEFAULT '{}',
    response_body_size INTEGER DEFAULT 0,
    backend_service_id UUID REFERENCES backend_services(id),
    backend_response_time_ms INTEGER,
    total_response_time_ms INTEGER NOT NULL,
    error_message TEXT,
    user_agent TEXT,
    ip_address INET,
    geo_location JSONB DEFAULT '{}', -- {country, city, lat, lng}
    cache_status TEXT, -- 'hit', 'miss', 'bypass', 'expired'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- API Metrics Aggregation
CREATE TABLE api_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES api_gateways(id),
    route_id UUID REFERENCES api_routes(id),
    api_key_id UUID REFERENCES api_keys(id),
    metric_type TEXT NOT NULL, -- 'requests', 'response_time', 'errors', 'cache_hit_rate'
    metric_value NUMERIC NOT NULL,
    time_bucket TIMESTAMPTZ NOT NULL, -- Rounded to minute/hour/day
    bucket_size TEXT NOT NULL, -- 'minute', 'hour', 'day'
    dimensions JSONB DEFAULT '{}', -- Additional dimensions like status_code, method, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Response Cache Storage
CREATE TABLE api_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    route_id UUID REFERENCES api_routes(id),
    request_hash TEXT NOT NULL, -- Hash of request parameters
    response_data JSONB NOT NULL,
    response_headers JSONB DEFAULT '{}',
    response_status INTEGER NOT NULL DEFAULT 200,
    content_type TEXT DEFAULT 'application/json',
    cache_tags JSONB DEFAULT '[]', -- Tags for cache invalidation
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- API Version Management
CREATE TABLE api_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_name TEXT NOT NULL, -- 'v1', 'v2', 'v3'
    version_number TEXT NOT NULL, -- '1.0.0', '2.1.0'
    gateway_id UUID REFERENCES api_gateways(id),
    is_default BOOLEAN DEFAULT false,
    is_deprecated BOOLEAN DEFAULT false,
    deprecation_date TIMESTAMPTZ,
    sunset_date TIMESTAMPTZ,
    changelog TEXT,
    migration_guide TEXT,
    supported_features JSONB DEFAULT '[]',
    breaking_changes JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gateway_id, version_name)
);

-- Circuit Breaker State Management
CREATE TABLE circuit_breaker_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backend_service_id UUID REFERENCES backend_services(id) ON DELETE CASCADE,
    current_state TEXT NOT NULL DEFAULT 'closed', -- 'closed', 'open', 'half_open'
    failure_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    success_count INTEGER DEFAULT 0, -- For half-open state
    state_changed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(backend_service_id)
);

-- API Documentation and Schema
CREATE TABLE api_documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES api_gateways(id),
    version_id UUID REFERENCES api_versions(id),
    openapi_spec JSONB NOT NULL, -- Complete OpenAPI 3.0 specification
    generated_docs TEXT, -- Rendered HTML documentation
    is_published BOOLEAN DEFAULT false,
    last_generated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX idx_api_routes_gateway_path ON api_routes(gateway_id, route_path);
CREATE INDEX idx_api_routes_method ON api_routes(route_method);
CREATE INDEX idx_api_keys_hash ON api_keys(api_key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(api_key_prefix);
CREATE INDEX idx_api_request_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_request_logs_gateway_route ON api_request_logs(gateway_id, route_id);
CREATE INDEX idx_api_request_logs_api_key ON api_request_logs(api_key_id);
CREATE INDEX idx_api_metrics_time_bucket ON api_metrics(time_bucket DESC);
CREATE INDEX idx_api_metrics_gateway_route ON api_metrics(gateway_id, route_id);
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);
CREATE INDEX idx_api_cache_cache_key ON api_cache(cache_key);
CREATE INDEX idx_backend_services_healthy ON backend_services(is_healthy, gateway_id);

-- Row Level Security policies
ALTER TABLE api_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE backend_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for system administrators and API consumers
CREATE POLICY "System admins can manage API gateways" ON api_gateways
    FOR ALL USING (auth.jwt() ->> 'role' IN ('system_admin', 'api_admin'));

CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (owner_id = auth.uid() OR auth.jwt() ->> 'role' IN ('system_admin', 'api_admin'));

CREATE POLICY "API consumers can view their own request logs" ON api_request_logs
    FOR SELECT USING (user_id = auth.uid() OR api_key_id IN (
        SELECT id FROM api_keys WHERE owner_id = auth.uid()
    ) OR auth.jwt() ->> 'role' IN ('system_admin', 'api_admin'));
```

## API Endpoints

### Gateway Configuration Management
```typescript
// GET /api/gateway/config
interface GetGatewayConfigResponse {
  gateways: {
    id: string;
    name: string;
    description: string;
    base_url: string;
    is_enabled: boolean;
    load_balancing_strategy: string;
    health_check_interval: number;
    backend_services: {
      id: string;
      service_name: string;
      service_version: string;
      service_url: string;
      is_healthy: boolean;
      weight: number;
    }[];
    total_routes: number;
    total_requests_today: number;
    average_response_time: number;
  }[];
}

// POST /api/gateway/config
interface CreateGatewayConfigRequest {
  name: string;
  description?: string;
  base_url: string;
  load_balancing_strategy?: string;
  health_check_interval?: number;
  timeout_config?: {
    connect: number;
    read: number;
    write: number;
  };
  ssl_config?: {
    enabled: boolean;
    certificate_path?: string;
    private_key_path?: string;
  };
  cors_config?: {
    allowed_origins: string[];
    allowed_methods: string[];
    allowed_headers: string[];
    credentials: boolean;
  };
}

// PUT /api/gateway/config/{gateway_id}
interface UpdateGatewayConfigRequest extends Partial<CreateGatewayConfigRequest> {}

// GET /api/gateway/{gateway_id}/health
interface GetGatewayHealthResponse {
  gateway_health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    total_services: number;
    healthy_services: number;
    response_time_p95: number;
    error_rate_5min: number;
  };
  backend_services: Array<{
    service_name: string;
    service_url: string;
    status: 'healthy' | 'unhealthy';
    last_check: string;
    response_time: number;
    circuit_breaker_state: string;
  }>;
}
```

### Route Management
```typescript
// GET /api/gateway/{gateway_id}/routes
interface GetRoutesResponse {
  routes: {
    id: string;
    route_path: string;
    route_method: string;
    backend_service: {
      service_name: string;
      service_url: string;
      is_healthy: boolean;
    };
    upstream_path: string;
    is_enabled: boolean;
    middleware_config: Array<{
      name: string;
      config: Record<string, any>;
    }>;
    rate_limit_config: {
      requests_per_second: number;
      burst_limit: number;
    };
    auth_requirements: {
      required: boolean;
      roles: string[];
      scopes: string[];
    };
    cache_config: {
      enabled: boolean;
      ttl: number;
      cache_key_pattern: string;
    };
    performance_stats: {
      total_requests_24h: number;
      average_response_time: number;
      error_rate: number;
      cache_hit_rate: number;
    };
  }[];
  total_count: number;
}

// POST /api/gateway/{gateway_id}/routes
interface CreateRouteRequest {
  route_path: string;
  route_method: string;
  backend_service_id: string;
  upstream_path?: string;
  middleware_config?: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  rate_limit_config?: {
    requests_per_second: number;
    requests_per_minute: number;
    burst_limit: number;
  };
  auth_requirements?: {
    required: boolean;
    roles?: string[];
    scopes?: string[];
  };
  cache_config?: {
    enabled: boolean;
    ttl: number;
    vary_by: string[];
    invalidate_on: string[];
  };
  transformation_config?: {
    request_transforms: Array<{
      type: string;
      config: Record<string, any>;
    }>;
    response_transforms: Array<{
      type: string;
      config: Record<string, any>;
    }>;
  };
}

// PUT /api/gateway/routes/{route_id}
interface UpdateRouteRequest extends Partial<CreateRouteRequest> {}

// DELETE /api/gateway/routes/{route_id}

// POST /api/gateway/routes/{route_id}/test
interface TestRouteRequest {
  method: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: any;
}

interface TestRouteResponse {
  status_code: number;
  response_headers: Record<string, string>;
  response_body: any;
  response_time_ms: number;
  cache_status: string;
  backend_service_used: string;
  errors?: string[];
}
```

### API Key Management
```typescript
// GET /api/gateway/api-keys
interface GetAPIKeysResponse {
  api_keys: {
    id: string;
    key_name: string;
    api_key_prefix: string;
    owner_id: string;
    owner_type: string;
    scopes: string[];
    rate_limit_tier: string;
    usage_quota: {
      daily: number;
      monthly: number;
      used_today: number;
      used_this_month: number;
    };
    is_active: boolean;
    expires_at: string | null;
    last_used_at: string | null;
    created_at: string;
  }[];
  total_count: number;
}

// POST /api/gateway/api-keys
interface CreateAPIKeyRequest {
  key_name: string;
  owner_type?: string;
  scopes: string[];
  allowed_origins?: string[];
  rate_limit_tier: string;
  usage_quota?: {
    daily: number;
    monthly: number;
  };
  expires_at?: string;
  metadata?: Record<string, any>;
}

interface CreateAPIKeyResponse {
  api_key: {
    id: string;
    key_name: string;
    api_key: string; // Only returned once during creation
    api_key_prefix: string;
    scopes: string[];
    rate_limit_tier: string;
    expires_at: string | null;
  };
}

// PUT /api/gateway/api-keys/{key_id}
interface UpdateAPIKeyRequest {
  key_name?: string;
  scopes?: string[];
  allowed_origins?: string[];
  rate_limit_tier?: string;
  usage_quota?: {
    daily: number;
    monthly: number;
  };
  is_active?: boolean;
  expires_at?: string | null;
}

// POST /api/gateway/api-keys/{key_id}/rotate
interface RotateAPIKeyResponse {
  new_api_key: string;
  api_key_prefix: string;
  rotated_at: string;
}

// GET /api/gateway/api-keys/{key_id}/usage
interface GetAPIKeyUsageResponse {
  usage_stats: {
    requests_today: number;
    requests_this_month: number;
    quota_remaining_today: number;
    quota_remaining_month: number;
    last_request_at: string;
  };
  usage_history: Array<{
    date: string;
    requests: number;
    errors: number;
    average_response_time: number;
  }>;
}
```

### Analytics and Monitoring
```typescript
// GET /api/gateway/analytics/overview
interface GetAnalyticsOverviewResponse {
  time_range: {
    from: string;
    to: string;
  };
  metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number;
    p95_response_time: number;
    cache_hit_rate: number;
    unique_api_consumers: number;
    top_endpoints: Array<{
      path: string;
      method: string;
      requests: number;
      avg_response_time: number;
    }>;
    error_breakdown: Array<{
      status_code: number;
      count: number;
      percentage: number;
    }>;
  };
  trends: {
    requests_per_hour: Array<{
      hour: string;
      requests: number;
    }>;
    response_times: Array<{
      timestamp: string;
      avg_response_time: number;
      p95_response_time: number;
    }>;
    error_rates: Array<{
      timestamp: string;
      error_rate: number;
    }>;
  };
}

// GET /api/gateway/analytics/routes/{route_id}
interface GetRouteAnalyticsResponse {
  route_info: {
    path: string;
    method: string;
    backend_service: string;
  };
  performance_metrics: {
    total_requests: number;
    average_response_time: number;
    p50_response_time: number;
    p95_response_time: number;
    p99_response_time: number;
    error_rate: number;
    cache_hit_rate: number;
  };
  request_patterns: {
    requests_by_hour: Array<{
      hour: number;
      count: number;
    }>;
    requests_by_status: Array<{
      status_code: number;
      count: number;
    }>;
    requests_by_geo: Array<{
      country: string;
      city: string;
      count: number;
    }>;
  };
  top_consumers: Array<{
    api_key_prefix: string;
    requests: number;
    error_rate: number;
  }>;
}

// GET /api/gateway/analytics/errors
interface GetErrorAnalyticsResponse {
  error_summary: {
    total_errors: number;
    error_rate: number;
    most_common_errors: Array<{
      status_code: number;
      error_message: string;
      count: number;
      first_seen: string;
      last_seen: string;
    }>;
  };
  error_trends: Array<{
    timestamp: string;
    error_count: number;
    error_rate: number;
    breakdown: Record<string, number>; // status_code -> count
  }>;
  affected_routes: Array<{
    route_path: string;
    method: string;
    error_count: number;
    error_rate: number;
  }>;
}
```

### Cache Management
```typescript
// GET /api/gateway/cache/stats
interface GetCacheStatsResponse {
  cache_overview: {
    total_cached_responses: number;
    cache_size_bytes: number;
    hit_rate_24h: number;
    miss_rate_24h: number;
    eviction_rate_24h: number;
  };
  cache_performance: Array<{
    route_path: string;
    method: string;
    hit_rate: number;
    cache_size: number;
    avg_response_time_cached: number;
    avg_response_time_uncached: number;
    savings_ms: number;
  }>;
  cache_distribution: {
    by_ttl: Array<{
      ttl_range: string;
      count: number;
      size_bytes: number;
    }>;
    by_content_type: Array<{
      content_type: string;
      count: number;
      size_bytes: number;
    }>;
  };
}

// POST /api/gateway/cache/invalidate
interface InvalidateCacheRequest {
  cache_keys?: string[]; // Specific cache keys to invalidate
  routes?: Array<{
    path: string;
    method: string;
  }>; // Invalidate all cache for specific routes
  tags?: string[]; // Invalidate by cache tags
  pattern?: string; // Invalidate by key pattern (regex)
  force?: boolean; // Force invalidation even if not expired
}

interface InvalidateCacheResponse {
  invalidated_count: number;
  cache_keys_invalidated: string[];
  bytes_freed: number;
}

// POST /api/gateway/cache/preload
interface PreloadCacheRequest {
  routes: Array<{
    path: string;
    method: string;
    request_params?: Record<string, any>;
    auth_context?: {
      user_id?: string;
      api_key?: string;
    };
  }>;
}

interface PreloadCacheResponse {
  preload_results: Array<{
    route_path: string;
    method: string;
    status: 'success' | 'error';
    cache_key: string;
    response_time_ms: number;
    error_message?: string;
  }>;
}
```

## React Components

### API Gateway Management Dashboard
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
  Shield, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Key,
  Route,
  Database,
  Globe
} from 'lucide-react';

interface GatewayConfig {
  id: string;
  name: string;
  description: string;
  base_url: string;
  is_enabled: boolean;
  load_balancing_strategy: string;
  backend_services: Array<{
    id: string;
    service_name: string;
    service_version: string;
    service_url: string;
    is_healthy: boolean;
    weight: number;
  }>;
  total_routes: number;
  total_requests_today: number;
  average_response_time: number;
}

interface AnalyticsOverview {
  metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number;
    p95_response_time: number;
    cache_hit_rate: number;
    unique_api_consumers: number;
    top_endpoints: Array<{
      path: string;
      method: string;
      requests: number;
      avg_response_time: number;
    }>;
    error_breakdown: Array<{
      status_code: number;
      count: number;
      percentage: number;
    }>;
  };
  trends: {
    requests_per_hour: Array<{
      hour: string;
      requests: number;
    }>;
    response_times: Array<{
      timestamp: string;
      avg_response_time: number;
      p95_response_time: number;
    }>;
  };
}

const APIGatewayDashboard: React.FC = () => {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [gatewaysRes, analyticsRes] = await Promise.all([
        fetch('/api/gateway/config'),
        fetch('/api/gateway/analytics/overview')
      ]);

      if (!gatewaysRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to load gateway data');
      }

      const gatewaysData = await gatewaysRes.json();
      const analyticsData = await analyticsRes.json();

      setGateways(gatewaysData.gateways);
      setAnalytics(analyticsData);
      
      if (!selectedGateway && gatewaysData.gateways.length > 0) {
        setSelectedGateway(gatewaysData.gateways[0].id);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatResponseTime = (ms: number): string => {
    return `${ms.toFixed(0)}ms`;
  };

  const getHealthStatus = (gateway: GatewayConfig) => {
    const healthyServices = gateway.backend_services.filter(s => s.is_healthy).length;
    const totalServices = gateway.backend_services.length;
    
    if (healthyServices === totalServices) return { status: 'healthy', color: 'text-green-600' };
    if (healthyServices > totalServices / 2) return { status: 'degraded', color: 'text-yellow-600' };
    return { status: 'unhealthy', color: 'text-red-600' };
  };

  const calculateSuccessRate = (): number => {
    if (!analytics?.metrics) return 0;
    const total = analytics.metrics.total_requests;
    if (total === 0) return 100;
    return (analytics.metrics.successful_requests / total) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading gateway data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Gateway Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and configure API gateway routing, security, and performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedGateway}
            onChange={(e) => setSelectedGateway(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {gateways.map((gateway) => (
              <option key={gateway.id} value={gateway.id}>
                {gateway.name}
              </option>
            ))}
          </select>
          <Button onClick={loadDashboardData} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
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
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analytics ? formatNumber(analytics.metrics.total_requests) : '0'}
            </div>
            <p className="text-xs text-gray-600">
              Past 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {calculateSuccessRate().toFixed(1)}%
            </div>
            <Progress value={calculateSuccessRate()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {analytics ? formatResponseTime(analytics.metrics.average_response_time) : '0ms'}
            </div>
            <p className="text-xs text-gray-600">
              P95: {analytics ? formatResponseTime(analytics.metrics.p95_response_time) : '0ms'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analytics ? `${analytics.metrics.cache_hit_rate.toFixed(1)}%` : '0%'}
            </div>
            <Progress value={analytics?.metrics.cache_hit_rate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Gateway Status Cards */}
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Gateway Health Status</CardTitle>
                <CardDescription>Current status of all API gateways and backend services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {gateways.map((gateway) => {
                    const health = getHealthStatus(gateway);
                    return (
                      <div key={gateway.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <h3 className="font-semibold">{gateway.name}</h3>
                            <p className="text-sm text-gray-600">{gateway.base_url}</p>
                          </div>
                          <Badge className={`${health.status === 'healthy' ? 'bg-green-500' : 
                                           health.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                            {health.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="font-medium">{gateway.backend_services.filter(s => s.is_healthy).length}</span>
                            <span className="text-gray-600">/{gateway.backend_services.length} healthy</span>
                          </div>
                          <div>
                            <span className="font-medium">{formatNumber(gateway.total_requests_today)}</span>
                            <span className="text-gray-600"> requests today</span>
                          </div>
                          <div>
                            <span className="font-medium">{formatResponseTime(gateway.average_response_time)}</span>
                            <span className="text-gray-600"> avg</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Endpoints */}
            {analytics && (
              <Card>
                <CardHeader>
                  <CardTitle>Top API Endpoints</CardTitle>
                  <CardDescription>Most requested endpoints in the past 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.metrics.top_endpoints.map((endpoint, index) => (
                      <div key={`${endpoint.method}-${endpoint.path}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{formatNumber(endpoint.requests)} requests</span>
                          <span className="text-gray-600">{formatResponseTime(endpoint.avg_response_time)} avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gateways" className="space-y-4">
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Gateway configuration management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <div className="text-center py-12">
            <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Route management interface coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">API key management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Advanced analytics dashboard coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Cache management interface coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIGatewayDashboard;
```

## Implementation

### Core API Gateway Service
```typescript
// src/lib/gateway/APIGatewayService.ts
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export interface RouteConfig {
  path: string;
  method: string;
  backendServiceId: string;
  upstreamPath?: string;
  middlewareConfig: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    burstLimit: number;
  };
  authRequirements: {
    required: boolean;
    roles?: string[];
    scopes?: string[];
  };
  cacheConfig: {
    enabled: boolean;
    ttl: number;
    varyBy: string[];
    invalidateOn: string[];
  };
}

export interface BackendService {
  id: string;
  serviceName: string;
  serviceVersion: string;
  serviceUrl: string;
  isHealthy: boolean;
  weight: number;
  circuitBreakerState: 'closed' | 'open' | 'half_open';
}

export class APIGatewayService {
  private supabase: ReturnType<typeof createClient>;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async handleRequest(request: NextRequest, gatewayId: string): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Find matching route
      const route = await this.findMatchingRoute(gatewayId, request.method, request.nextUrl.pathname);
      
      if (!route) {
        return this.createErrorResponse(404, 'Route not found', requestId);
      }

      // Apply authentication middleware
      const authResult = await this.authenticateRequest(request, route.authRequirements);
      if (!authResult.success) {
        return this.createErrorResponse(401, authResult.error!, requestId);
      }

      // Apply rate limiting
      const rateLimitResult = await this.checkRateLimit(request, route, authResult.apiKeyId);
      if (!rateLimitResult.allowed) {
        return this.createErrorResponse(429, 'Rate limit exceeded', requestId);
      }

      // Check cache
      if (route.cacheConfig.enabled && request.method === 'GET') {
        const cachedResponse = await this.getCachedResponse(route, request);
        if (cachedResponse) {
          await this.logRequest(request, route, 200, Date.now() - startTime, requestId, authResult.apiKeyId, 'hit');
          return cachedResponse;
        }
      }

      // Get healthy backend service
      const backendService = await this.selectBackendService(route.backendServiceId);
      if (!backendService) {
        return this.createErrorResponse(503, 'Service unavailable', requestId);
      }

      // Proxy request to backend
      const backendResponse = await this.proxyToBackend(request, route, backendService);
      
      // Cache response if applicable
      if (route.cacheConfig.enabled && backendResponse.status === 200) {
        await this.cacheResponse(route, request, backendResponse);
      }

      // Log request
      await this.logRequest(
        request, 
        route, 
        backendResponse.status, 
        Date.now() - startTime, 
        requestId, 
        authResult.apiKeyId,
        'miss'
      );

      return backendResponse;

    } catch (error) {
      console.error('Gateway request error:', error);
      await this.logRequest(request, null, 500, Date.now() - startTime, requestId, null, 'error');
      return this.createErrorResponse(500, 'Internal server error', requestId);
    }
  }

  private async findMatchingRoute(gatewayId: string, method: string, path: string): Promise<RouteConfig | null> {
    try {
      const { data: routes, error } = await this.supabase
        .from('api_routes')
        .select(`
          *,
          backend_services (*)
        `)
        .eq('gateway_id', gatewayId)
        .eq('route_method', method)
        .eq('is_enabled', true)
        .order('route_priority', { ascending: false });

      if (error) throw error;

      // Find first matching route using path patterns
      for (const route of routes) {
        if (this.matchesPath(route.route_path, path)) {
          return {
            path: route.route_path,
            method: route.route_method,
            backendServiceId: route.backend_service_id,
            upstreamPath: route.upstream_path || path,
            middlewareConfig: route.middleware_config || [],
            rateLimit: route.rate_limit_config || {
              requestsPerSecond: 10,
              requestsPerMinute: 100,
              burstLimit: 20
            },
            authRequirements: route.auth_requirements || { required: false },
            cacheConfig: route.cache_config || {
              enabled: false,
              ttl: 300,
              varyBy: [],
              invalidateOn: []
            }
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding route:', error);
      return null;
    }
  }

  private matchesPath(routePath: string, requestPath: string): boolean {
    // Convert route path pattern to regex
    // e.g., '/api/v1/weddings/{weddingId}' -> '/api/v1/weddings/([^/]+)'
    const pattern = routePath
      .replace(/\{[^}]+\}/g, '([^/]+)')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requestPath);
  }

  private async authenticateRequest(request: NextRequest, authRequirements: RouteConfig['authRequirements']): 
    Promise<{ success: boolean; error?: string; userId?: string; apiKeyId?: string }> {
    
    if (!authRequirements.required) {
      return { success: true };
    }

    // Check for API key
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return { success: false, error: 'API key required' };
    }

    try {
      // Hash the API key for lookup
      const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
      
      const { data: keyData, error } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('api_key_hash', apiKeyHash)
        .eq('is_active', true)
        .single();

      if (error || !keyData) {
        return { success: false, error: 'Invalid API key' };
      }

      // Check expiration
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return { success: false, error: 'API key expired' };
      }

      // Check scopes
      if (authRequirements.scopes && authRequirements.scopes.length > 0) {
        const hasRequiredScopes = authRequirements.scopes.every(scope => 
          keyData.scopes.includes(scope)
        );
        
        if (!hasRequiredScopes) {
          return { success: false, error: 'Insufficient permissions' };
        }
      }

      // Update last used timestamp
      await this.supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);

      return { 
        success: true, 
        userId: keyData.owner_id,
        apiKeyId: keyData.id
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  private async checkRateLimit(request: NextRequest, route: RouteConfig, apiKeyId?: string): 
    Promise<{ allowed: boolean; remaining?: number }> {
    
    const identifier = apiKeyId || this.getClientIP(request);
    const now = Date.now();
    const windowKey = `${identifier}:${route.path}:${Math.floor(now / 60000)}`; // 1-minute window
    
    const current = this.rateLimitStore.get(windowKey) || { count: 0, resetTime: now + 60000 };
    
    if (now > current.resetTime) {
      // Reset window
      current.count = 0;
      current.resetTime = now + 60000;
    }
    
    if (current.count >= route.rateLimit.requestsPerMinute) {
      return { allowed: false };
    }
    
    current.count++;
    this.rateLimitStore.set(windowKey, current);
    
    return { 
      allowed: true, 
      remaining: route.rateLimit.requestsPerMinute - current.count 
    };
  }

  private async getCachedResponse(route: RouteConfig, request: NextRequest): Promise<NextResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(route, request);
      
      const { data: cached, error } = await this.supabase
        .from('api_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !cached) return null;

      return new NextResponse(JSON.stringify(cached.response_data), {
        status: cached.response_status,
        headers: {
          'Content-Type': cached.content_type,
          'X-Cache': 'HIT',
          ...cached.response_headers
        }
      });

    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async selectBackendService(backendServiceId: string): Promise<BackendService | null> {
    try {
      const { data: service, error } = await this.supabase
        .from('backend_services')
        .select(`
          *,
          circuit_breaker_states (*)
        `)
        .eq('id', backendServiceId)
        .eq('is_healthy', true)
        .single();

      if (error || !service) return null;

      // Check circuit breaker state
      const circuitBreaker = service.circuit_breaker_states?.[0];
      if (circuitBreaker?.current_state === 'open') {
        // Check if we can attempt half-open
        if (circuitBreaker.next_attempt_at && new Date(circuitBreaker.next_attempt_at) > new Date()) {
          return null; // Still in open state
        }
      }

      return {
        id: service.id,
        serviceName: service.service_name,
        serviceVersion: service.service_version,
        serviceUrl: service.service_url,
        isHealthy: service.is_healthy,
        weight: service.weight,
        circuitBreakerState: circuitBreaker?.current_state || 'closed'
      };

    } catch (error) {
      console.error('Backend service selection error:', error);
      return null;
    }
  }

  private async proxyToBackend(request: NextRequest, route: RouteConfig, backend: BackendService): Promise<NextResponse> {
    try {
      const url = new URL(route.upstreamPath || request.nextUrl.pathname, backend.serviceUrl);
      url.search = request.nextUrl.search;

      const backendRequest = new Request(url.toString(), {
        method: request.method,
        headers: this.prepareBackendHeaders(request.headers),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
      });

      const backendResponse = await fetch(backendRequest, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      // Update circuit breaker on success
      if (backendResponse.ok) {
        await this.updateCircuitBreakerSuccess(backend.id);
      } else {
        await this.updateCircuitBreakerFailure(backend.id);
      }

      const responseBody = await backendResponse.arrayBuffer();
      
      return new NextResponse(responseBody, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: {
          ...Object.fromEntries(backendResponse.headers.entries()),
          'X-Gateway': 'wedsync-api-gateway',
          'X-Backend-Service': backend.serviceName,
          'X-Cache': 'MISS'
        }
      });

    } catch (error) {
      console.error('Backend proxy error:', error);
      await this.updateCircuitBreakerFailure(backend.id);
      throw error;
    }
  }

  private async cacheResponse(route: RouteConfig, request: NextRequest, response: NextResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(route, request);
      const responseBody = await response.clone().json();
      
      await this.supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          route_id: route.path, // In real implementation, this would be the route ID
          request_hash: this.generateRequestHash(request),
          response_data: responseBody,
          response_headers: Object.fromEntries(response.headers.entries()),
          response_status: response.status,
          content_type: response.headers.get('content-type') || 'application/json',
          expires_at: new Date(Date.now() + route.cacheConfig.ttl * 1000).toISOString()
        });

    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  private async logRequest(
    request: NextRequest, 
    route: RouteConfig | null, 
    status: number, 
    responseTime: number,
    requestId: string,
    apiKeyId?: string,
    cacheStatus?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('api_request_logs')
        .insert({
          gateway_id: 'default', // In real implementation, this would be dynamic
          route_id: route?.path, // In real implementation, this would be the route ID
          api_key_id: apiKeyId,
          request_id: requestId,
          method: request.method,
          path: request.nextUrl.pathname,
          query_params: Object.fromEntries(request.nextUrl.searchParams.entries()),
          request_headers: Object.fromEntries(request.headers.entries()),
          response_status: status,
          total_response_time_ms: responseTime,
          ip_address: this.getClientIP(request),
          user_agent: request.headers.get('user-agent'),
          cache_status: cacheStatus || 'none',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Request logging error:', error);
    }
  }

  private async updateCircuitBreakerSuccess(backendServiceId: string): Promise<void> {
    try {
      await this.supabase
        .from('circuit_breaker_states')
        .upsert({
          backend_service_id: backendServiceId,
          current_state: 'closed',
          failure_count: 0,
          success_count: 0,
          state_changed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Circuit breaker update error:', error);
    }
  }

  private async updateCircuitBreakerFailure(backendServiceId: string): Promise<void> {
    try {
      const { data: current } = await this.supabase
        .from('circuit_breaker_states')
        .select('*')
        .eq('backend_service_id', backendServiceId)
        .single();

      const failureCount = (current?.failure_count || 0) + 1;
      const shouldOpen = failureCount >= 5; // Configurable threshold
      
      await this.supabase
        .from('circuit_breaker_states')
        .upsert({
          backend_service_id: backendServiceId,
          current_state: shouldOpen ? 'open' : (current?.current_state || 'closed'),
          failure_count: failureCount,
          last_failure_at: new Date().toISOString(),
          next_attempt_at: shouldOpen ? 
            new Date(Date.now() + 60000).toISOString() : // 1 minute timeout
            current?.next_attempt_at,
          state_changed_at: shouldOpen ? new Date().toISOString() : current?.state_changed_at
        });
    } catch (error) {
      console.error('Circuit breaker failure update error:', error);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(route: RouteConfig, request: NextRequest): string {
    const keyParts = [
      route.path,
      request.method,
      request.nextUrl.search
    ];

    // Add vary-by parameters
    route.cacheConfig.varyBy.forEach(header => {
      keyParts.push(request.headers.get(header) || '');
    });

    return createHash('sha256').update(keyParts.join('|')).digest('hex');
  }

  private generateRequestHash(request: NextRequest): string {
    return createHash('md5').update(
      `${request.method}${request.nextUrl.pathname}${request.nextUrl.search}`
    ).digest('hex');
  }

  private prepareBackendHeaders(requestHeaders: Headers): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Forward most headers, but exclude gateway-specific ones
    const excludeHeaders = new Set([
      'host',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host',
      'connection'
    ]);

    requestHeaders.forEach((value, key) => {
      if (!excludeHeaders.has(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Add gateway identification
    headers['X-Forwarded-By'] = 'wedsync-api-gateway';
    headers['X-Gateway-Version'] = '1.0.0';

    return headers;
  }

  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }

  private createErrorResponse(status: number, message: string, requestId: string): NextResponse {
    return NextResponse.json(
      { 
        error: message, 
        request_id: requestId,
        timestamp: new Date().toISOString()
      },
      { 
        status,
        headers: {
          'X-Gateway': 'wedsync-api-gateway',
          'X-Request-ID': requestId
        }
      }
    );
  }

  async getAnalytics(gatewayId: string, timeRange: { from: Date; to: Date }) {
    try {
      const [metricsResult, trendsResult] = await Promise.all([
        this.supabase
          .from('api_request_logs')
          .select('*')
          .eq('gateway_id', gatewayId)
          .gte('created_at', timeRange.from.toISOString())
          .lte('created_at', timeRange.to.toISOString()),
        
        this.supabase
          .from('api_metrics')
          .select('*')
          .eq('gateway_id', gatewayId)
          .gte('time_bucket', timeRange.from.toISOString())
          .lte('time_bucket', timeRange.to.toISOString())
      ]);

      if (metricsResult.error || trendsResult.error) {
        throw new Error('Failed to fetch analytics data');
      }

      const requests = metricsResult.data;
      const metrics = trendsResult.data;

      // Calculate overview metrics
      const totalRequests = requests.length;
      const successfulRequests = requests.filter(r => r.response_status >= 200 && r.response_status < 300).length;
      const averageResponseTime = requests.reduce((sum, r) => sum + r.total_response_time_ms, 0) / totalRequests;
      const cacheHits = requests.filter(r => r.cache_status === 'hit').length;
      const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

      // Calculate P95 response time
      const sortedResponseTimes = requests.map(r => r.total_response_time_ms).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
      const p95ResponseTime = sortedResponseTimes[p95Index] || 0;

      // Get top endpoints
      const endpointStats = new Map<string, { requests: number; totalTime: number }>();
      requests.forEach(request => {
        const key = `${request.method} ${request.path}`;
        const current = endpointStats.get(key) || { requests: 0, totalTime: 0 };
        endpointStats.set(key, {
          requests: current.requests + 1,
          totalTime: current.totalTime + request.total_response_time_ms
        });
      });

      const topEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, stats]) => ({
          path: endpoint.split(' ')[1],
          method: endpoint.split(' ')[0],
          requests: stats.requests,
          avg_response_time: stats.totalTime / stats.requests
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      // Error breakdown
      const errorBreakdown = new Map<number, number>();
      requests.forEach(request => {
        if (request.response_status >= 400) {
          errorBreakdown.set(
            request.response_status,
            (errorBreakdown.get(request.response_status) || 0) + 1
          );
        }
      });

      return {
        metrics: {
          total_requests: totalRequests,
          successful_requests: successfulRequests,
          failed_requests: totalRequests - successfulRequests,
          average_response_time: averageResponseTime,
          p95_response_time: p95ResponseTime,
          cache_hit_rate: cacheHitRate,
          unique_api_consumers: new Set(requests.map(r => r.api_key_id).filter(Boolean)).size,
          top_endpoints: topEndpoints,
          error_breakdown: Array.from(errorBreakdown.entries()).map(([status_code, count]) => ({
            status_code,
            count,
            percentage: (count / totalRequests) * 100
          }))
        },
        trends: {
          requests_per_hour: this.calculateHourlyTrends(requests),
          response_times: this.calculateResponseTimeTrends(metrics)
        }
      };

    } catch (error) {
      throw new Error(`Failed to get analytics: ${error}`);
    }
  }

  private calculateHourlyTrends(requests: any[]): Array<{ hour: string; requests: number }> {
    const hourlyStats = new Map<string, number>();
    
    requests.forEach(request => {
      const hour = new Date(request.created_at).toISOString().substr(0, 13) + ':00:00.000Z';
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
    });

    return Array.from(hourlyStats.entries())
      .map(([hour, requests]) => ({ hour, requests }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  private calculateResponseTimeTrends(metrics: any[]): Array<{ timestamp: string; avg_response_time: number; p95_response_time: number }> {
    const responseTimeMetrics = metrics.filter(m => m.metric_type === 'response_time');
    
    return responseTimeMetrics.map(metric => ({
      timestamp: metric.time_bucket,
      avg_response_time: metric.metric_value,
      p95_response_time: metric.dimensions?.p95 || metric.metric_value
    }));
  }
}
```

## Integration Requirements

### MCP Server Usage
- **PostgreSQL MCP**: Execute gateway configuration queries, request log analysis, and performance metrics storage
- **Supabase MCP**: Manage API key authentication, rate limiting state, and real-time monitoring
- **Browser MCP**: Test API endpoints, validate response caching, and monitor gateway dashboard
- **Ref MCP**: Access latest API gateway best practices and middleware documentation

### Navigation Integration
```typescript
// Add to src/lib/navigation/navigationConfig.ts
{
  id: 'api-gateway',
  label: 'API Gateway',
  href: '/admin/gateway',
  icon: 'Globe',
  roles: ['system_admin', 'api_admin'],
  subItems: [
    {
      id: 'gateway-overview',
      label: 'Gateway Overview',
      href: '/admin/gateway/overview',
      icon: 'BarChart3'
    },
    {
      id: 'gateway-config',
      label: 'Gateway Configuration',
      href: '/admin/gateway/config',
      icon: 'Settings'
    },
    {
      id: 'api-routes',
      label: 'API Routes',
      href: '/admin/gateway/routes',
      icon: 'Route'
    },
    {
      id: 'api-keys',
      label: 'API Keys',
      href: '/admin/gateway/keys',
      icon: 'Key'
    },
    {
      id: 'gateway-analytics',
      label: 'Analytics',
      href: '/admin/gateway/analytics',
      icon: 'BarChart3'
    },
    {
      id: 'gateway-cache',
      label: 'Cache Management',
      href: '/admin/gateway/cache',
      icon: 'Database'
    }
  ]
}
```

## Testing Strategy

### Unit Testing
```typescript
// __tests__/APIGatewayService.test.ts
import { APIGatewayService } from '@/lib/gateway/APIGatewayService';
import { NextRequest } from 'next/server';

describe('APIGatewayService', () => {
  let gatewayService: APIGatewayService;

  beforeEach(() => {
    gatewayService = new APIGatewayService();
  });

  test('should route request to correct backend service', async () => {
    const request = new NextRequest('https://api.wedsync.com/api/v1/weddings/123');
    
    const response = await gatewayService.handleRequest(request, 'test-gateway-id');
    
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Gateway')).toBe('wedsync-api-gateway');
  });

  test('should enforce rate limiting', async () => {
    const request = new NextRequest('https://api.wedsync.com/api/v1/weddings', {
      headers: { 'X-API-Key': 'test-key' }
    });
    
    // Make multiple requests rapidly
    const promises = Array(150).fill(null).map(() => 
      gatewayService.handleRequest(request, 'test-gateway-id')
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('should cache GET responses', async () => {
    const request = new NextRequest('https://api.wedsync.com/api/v1/weddings/123');
    
    // First request
    const response1 = await gatewayService.handleRequest(request, 'test-gateway-id');
    expect(response1.headers.get('X-Cache')).toBe('MISS');
    
    // Second request should be cached
    const response2 = await gatewayService.handleRequest(request, 'test-gateway-id');
    expect(response2.headers.get('X-Cache')).toBe('HIT');
  });
});
```

### Integration Testing with Browser MCP
```typescript
// __tests__/integration/api-gateway-dashboard.test.ts
import { mcp_playwright } from '@/lib/testing/mcp-helpers';

describe('API Gateway Dashboard', () => {
  test('should display gateway health status', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/gateway' 
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('Gateway Health Status');
    expect(snapshot).toContain('Total Requests');
  });

  test('should allow API key creation', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/gateway/keys' 
    });

    // Create new API key
    await mcp_playwright.browser_click({
      element: 'Create API Key button',
      ref: '[data-testid="create-api-key"]'
    });

    await mcp_playwright.browser_fill_form({
      fields: [
        {
          name: 'Key Name',
          type: 'textbox',
          ref: '[data-testid="key-name"]',
          value: 'Test Wedding Integration'
        },
        {
          name: 'Rate Limit Tier',
          type: 'combobox',
          ref: '[data-testid="rate-limit-tier"]',
          value: 'premium'
        }
      ]
    });

    await mcp_playwright.browser_click({
      element: 'Create button',
      ref: '[data-testid="create-key-submit"]'
    });

    // Verify success message
    await mcp_playwright.browser_wait_for({ text: 'API key created successfully' });
  });
});
```

### Performance Testing
```typescript
// __tests__/performance/gateway-load-test.test.ts
describe('Gateway Load Testing', () => {
  test('should handle 1000 concurrent requests', async () => {
    const requests = Array(1000).fill(null).map((_, i) => 
      fetch(`http://localhost:3000/api/v1/weddings?page=${i}`, {
        headers: { 'X-API-Key': 'test-premium-key' }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    const successfulResponses = responses.filter(r => r.ok);
    const responseTime = endTime - startTime;

    expect(successfulResponses.length).toBeGreaterThan(950); // 95% success rate
    expect(responseTime).toBeLessThan(10000); // Under 10 seconds
  });

  test('should maintain response times under load', async () => {
    // Simulate sustained load
    const loadDuration = 30000; // 30 seconds
    const requestsPerSecond = 50;
    const responseTimes: number[] = [];

    const startTime = Date.now();
    
    while (Date.now() - startTime < loadDuration) {
      const batchPromises = Array(requestsPerSecond).fill(null).map(async () => {
        const reqStart = Date.now();
        const response = await fetch('http://localhost:3000/api/v1/weddings', {
          headers: { 'X-API-Key': 'test-premium-key' }
        });
        const reqEnd = Date.now();
        
        if (response.ok) {
          responseTimes.push(reqEnd - reqStart);
        }
      });
      
      await Promise.all(batchPromises);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

    expect(averageResponseTime).toBeLessThan(500); // Under 500ms average
    expect(p95ResponseTime).toBeLessThan(1000); // Under 1s for P95
  });
});
```

## Security Considerations

### Authentication and Authorization
- **Multi-tier API authentication**: Support for API keys, JWT tokens, and OAuth 2.0
- **Role-based access control**: Fine-grained permissions based on user roles and scopes
- **API key management**: Secure key generation, rotation, and revocation
- **Request signing**: Optional request signature validation for enhanced security

### Security Monitoring
- **Anomaly detection**: Automated detection of unusual API usage patterns
- **Rate limiting**: Multi-level rate limiting with burst protection
- **IP-based filtering**: Geographic and IP-based access control
- **Security headers**: Automatic injection of security headers (HSTS, CSP, etc.)

## Performance Optimization

### Intelligent Routing
- **Load balancing**: Multiple algorithms including round-robin, weighted, and geo-based routing
- **Circuit breakers**: Automatic failover and service health management
- **Connection pooling**: Efficient backend connection management
- **Request multiplexing**: HTTP/2 support for improved performance

### Caching Strategy
- **Multi-tier caching**: Edge caching, gateway caching, and backend caching
- **Intelligent invalidation**: Smart cache invalidation based on content changes
- **Compression**: Automatic response compression for bandwidth optimization
- **CDN integration**: Seamless integration with content delivery networks

## Business Impact

### Developer Experience
- **API documentation**: Auto-generated OpenAPI documentation with examples
- **Developer portal**: Self-service API key management and analytics
- **SDK generation**: Automatic client SDK generation for multiple languages
- **Testing tools**: Built-in API testing and debugging capabilities

### Wedding Industry Benefits
- **Vendor integration**: Simplified API access for wedding vendors and partners
- **Mobile optimization**: Optimized API responses for mobile wedding apps
- **Real-time features**: Support for WebSocket and Server-Sent Events
- **Global performance**: Edge deployment for worldwide wedding venues

## Maintenance and Monitoring

### Automated Operations
- **Health monitoring**: Continuous backend service health checks
- **Auto-scaling**: Automatic gateway scaling based on traffic patterns
- **Log aggregation**: Centralized logging with structured query capabilities
- **Alerting**: Proactive alerts for performance degradation and errors

### Analytics and Insights
- **Real-time metrics**: Live API performance and usage dashboards
- **Business intelligence**: API usage analytics for business decision making
- **Cost tracking**: Detailed cost analysis and optimization recommendations
- **Capacity planning**: Predictive scaling based on usage trends

## Documentation

### API Documentation
- **Interactive documentation**: Swagger/OpenAPI-based interactive API docs
- **Code examples**: Multi-language code examples for all endpoints
- **Authentication guides**: Step-by-step authentication setup guides
- **Integration tutorials**: Comprehensive integration tutorials for common use cases

### Operational Documentation
- **Deployment guides**: Gateway deployment and configuration procedures
- **Troubleshooting**: Common issues and resolution procedures
- **Performance tuning**: Gateway optimization and tuning guidelines
- **Security best practices**: Security configuration and hardening guides

## Effort Estimation

### Development: 18-22 days
- **Database design and setup**: 2 days
- **Core gateway service implementation**: 6 days
- **Authentication and authorization**: 3 days
- **Rate limiting and caching**: 3 days
- **API endpoints development**: 3 days
- **React dashboard components**: 3-4 days
- **Analytics and monitoring**: 2-3 days

### Testing: 10-12 days
- **Unit tests for gateway service**: 4 days
- **Integration tests with backend services**: 3 days
- **Performance and load testing**: 2 days
- **Security testing**: 2 days
- **Browser MCP dashboard testing**: 1-2 days

### Documentation and Deployment: 5-6 days
- **API documentation**: 2 days
- **Operational documentation**: 2 days
- **Production deployment and configuration**: 1-2 days

**Total Estimated Effort: 33-40 days**

This comprehensive API Gateway Enhancement System provides WedSync with enterprise-grade API management capabilities, ensuring secure, scalable, and high-performance API access for all wedding platform services while providing detailed analytics and developer-friendly tools for integration partners.