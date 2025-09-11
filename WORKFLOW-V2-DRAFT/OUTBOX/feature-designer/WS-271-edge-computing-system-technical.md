# WS-271: Edge Computing System Technical Specification

## 1. Feature Overview

### 1.1 Purpose
Implement a distributed edge computing system to optimize content delivery, reduce latency, and improve user experience for wedding planning applications by bringing computational resources closer to end users globally.

### 1.2 Business Value
- **Global Performance**: Reduce page load times by 40-60% for international users
- **Scalability**: Handle traffic spikes during peak wedding seasons
- **Cost Optimization**: Reduce bandwidth costs by caching content at edge locations
- **User Experience**: Improve responsiveness for real-time features like chat and collaborative planning
- **Compliance**: Enable data residency compliance for GDPR and regional regulations

### 1.3 User Stories

**Primary User Story**: As a couple planning a destination wedding in multiple time zones, I want fast access to wedding planning tools regardless of my location so that I can collaborate effectively with vendors and family members around the world.

**Secondary User Stories**:
- As a wedding vendor in Europe, I want my vendor dashboard to load quickly when serving couples from North America
- As a wedding planner, I want real-time synchronization when multiple team members are updating the same wedding timeline
- As a system administrator, I want intelligent edge routing to handle traffic spikes during wedding seasons

### 1.4 Success Criteria
- Page load times under 2 seconds globally
- 99.9% uptime across all edge locations
- Automatic failover between edge nodes
- Support for 100+ concurrent wedding planning sessions per edge location
- Cost reduction of 30% through optimized content delivery

## 2. Technical Architecture

### 2.1 System Components

#### 2.1.1 Edge Computing Infrastructure
```typescript
interface EdgeNode {
  id: string;
  location: string;
  region: string;
  capacity: {
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
  };
  services: EdgeService[];
  health_status: 'healthy' | 'degraded' | 'offline';
  load_metrics: LoadMetrics;
  created_at: Date;
  updated_at: Date;
}

interface EdgeService {
  id: string;
  name: string;
  type: 'compute' | 'storage' | 'cache' | 'proxy';
  configuration: Record<string, any>;
  resource_usage: ResourceUsage;
  performance_metrics: PerformanceMetrics;
}

interface LoadMetrics {
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  requests_per_second: number;
  response_time_avg: number;
  cache_hit_ratio: number;
}
```

#### 2.1.2 Content Distribution Network
```typescript
interface CDNConfiguration {
  id: string;
  domain: string;
  origin_servers: OriginServer[];
  edge_locations: EdgeLocation[];
  cache_policies: CachePolicy[];
  routing_rules: RoutingRule[];
  ssl_configuration: SSLConfig;
  compression_settings: CompressionConfig;
}

interface EdgeLocation {
  id: string;
  city: string;
  country: string;
  provider: 'cloudflare' | 'aws' | 'azure' | 'custom';
  pop_code: string;
  capabilities: string[];
  latency_zones: LatencyZone[];
}

interface CachePolicy {
  id: string;
  path_pattern: string;
  ttl: number;
  cache_key_policy: CacheKeyPolicy;
  origin_request_policy: OriginRequestPolicy;
  response_headers_policy: ResponseHeadersPolicy;
}
```

### 2.2 Database Schema

```sql
-- Edge Computing System Tables
CREATE TABLE edge_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    capacity_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'offline')),
    load_metrics JSONB DEFAULT '{}'::jsonb,
    configuration JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_node_id UUID REFERENCES edge_nodes(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('compute', 'storage', 'cache', 'proxy', 'function')),
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    resource_limits JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    health_check_url VARCHAR(500),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cdn_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    origin_servers JSONB NOT NULL DEFAULT '[]'::jsonb,
    cache_policies JSONB NOT NULL DEFAULT '[]'::jsonb,
    routing_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    ssl_configuration JSONB DEFAULT '{}'::jsonb,
    compression_settings JSONB DEFAULT '{}'::jsonb,
    security_headers JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge_cache_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_node_id UUID REFERENCES edge_nodes(id) ON DELETE CASCADE,
    cache_key VARCHAR(500) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    content_type VARCHAR(200),
    content_size BIGINT DEFAULT 0,
    ttl INTEGER DEFAULT 3600,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(edge_node_id, cache_key)
);

CREATE TABLE edge_routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(100),
    client_ip INET,
    user_agent TEXT,
    request_path VARCHAR(1000) NOT NULL,
    selected_edge_node_id UUID REFERENCES edge_nodes(id),
    routing_reason VARCHAR(200),
    latency_ms INTEGER,
    processing_time_ms INTEGER,
    cache_status VARCHAR(20) CHECK (cache_status IN ('hit', 'miss', 'bypass')),
    response_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_node_id UUID REFERENCES edge_nodes(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value NUMERIC(10,4) NOT NULL,
    tags JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge_deployment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    edge_function_code TEXT,
    environment_variables JSONB DEFAULT '{}'::jsonb,
    resource_requirements JSONB DEFAULT '{}'::jsonb,
    deployment_targets JSONB DEFAULT '[]'::jsonb,
    rollout_strategy JSONB DEFAULT '{}'::jsonb,
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_edge_nodes_location ON edge_nodes(location);
CREATE INDEX idx_edge_nodes_health_status ON edge_nodes(health_status) WHERE is_active = true;
CREATE INDEX idx_edge_services_node_type ON edge_services(edge_node_id, service_type);
CREATE INDEX idx_edge_cache_entries_expires ON edge_cache_entries(expires_at);
CREATE INDEX idx_edge_cache_entries_accessed ON edge_cache_entries(last_accessed);
CREATE INDEX idx_edge_routing_client_ip ON edge_routing_decisions(client_ip);
CREATE INDEX idx_edge_routing_created ON edge_routing_decisions(created_at);
CREATE INDEX idx_edge_metrics_node_timestamp ON edge_performance_metrics(edge_node_id, timestamp);

-- Row Level Security (RLS)
ALTER TABLE edge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdn_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_deployment_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "edge_nodes_admin_access" ON edge_nodes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system_admin')
        )
    );

CREATE POLICY "edge_routing_read_access" ON edge_routing_decisions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system_admin')
        )
    );
```

### 2.3 API Endpoints

#### 2.3.1 Edge Node Management
```typescript
// GET /api/edge/nodes - List edge nodes
interface EdgeNodesResponse {
  nodes: EdgeNode[];
  total_count: number;
  healthy_nodes: number;
  regions: string[];
}

// POST /api/edge/nodes - Create edge node
interface CreateEdgeNodeRequest {
  location: string;
  region: string;
  provider: string;
  endpoint_url: string;
  capacity_config: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    bandwidth_mbps: number;
  };
  configuration?: Record<string, any>;
}

// PUT /api/edge/nodes/:id - Update edge node
interface UpdateEdgeNodeRequest {
  capacity_config?: Partial<CapacityConfig>;
  configuration?: Record<string, any>;
  is_active?: boolean;
}

// GET /api/edge/nodes/:id/metrics - Node performance metrics
interface NodeMetricsResponse {
  node_id: string;
  current_metrics: LoadMetrics;
  historical_data: MetricDataPoint[];
  alerts: AlertInstance[];
  recommendations: PerformanceRecommendation[];
}
```

#### 2.3.2 CDN Configuration
```typescript
// GET /api/edge/cdn/configs - List CDN configurations
interface CDNConfigsResponse {
  configurations: CDNConfiguration[];
  active_domains: string[];
  total_bandwidth: number;
  cache_hit_ratio: number;
}

// POST /api/edge/cdn/configs - Create CDN configuration
interface CreateCDNConfigRequest {
  domain: string;
  origin_servers: OriginServer[];
  cache_policies: CachePolicy[];
  routing_rules?: RoutingRule[];
  ssl_configuration?: SSLConfig;
  compression_settings?: CompressionConfig;
}

// POST /api/edge/cdn/purge - Purge CDN cache
interface PurgeCacheRequest {
  domain: string;
  paths?: string[];
  tags?: string[];
  purge_everything?: boolean;
}
```

#### 2.3.3 Edge Routing
```typescript
// POST /api/edge/routing/optimize - Get optimal edge route
interface OptimizeRoutingRequest {
  client_ip: string;
  user_agent?: string;
  request_path: string;
  content_type?: string;
  cache_requirements?: CacheRequirements;
}

interface OptimizeRoutingResponse {
  selected_edge_node: EdgeNode;
  routing_reason: string;
  expected_latency_ms: number;
  cache_availability: boolean;
  alternative_nodes: EdgeNode[];
}

// GET /api/edge/routing/analytics - Routing analytics
interface RoutingAnalyticsResponse {
  total_requests: number;
  average_latency: number;
  cache_hit_ratio: number;
  top_routes: RouteStatistics[];
  geographic_distribution: GeoDistribution[];
  performance_trends: PerformanceTrend[];
}
```

### 2.4 Core Implementation

#### 2.4.1 Edge Computing Service
```typescript
import { createClient } from '@supabase/supabase-js';

export class EdgeComputingService {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  async registerEdgeNode(nodeConfig: CreateEdgeNodeRequest): Promise<EdgeNode> {
    try {
      // Validate node endpoint
      const isHealthy = await this.healthCheckNode(nodeConfig.endpoint_url);
      
      const { data: node, error } = await this.supabase
        .from('edge_nodes')
        .insert({
          ...nodeConfig,
          health_status: isHealthy ? 'healthy' : 'offline',
          load_metrics: {
            cpu_usage: 0,
            memory_usage: 0,
            active_connections: 0,
            requests_per_second: 0,
            response_time_avg: 0,
            cache_hit_ratio: 0
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize default services
      await this.initializeDefaultServices(node.id);
      
      return node;
    } catch (error) {
      console.error('Failed to register edge node:', error);
      throw new Error('Edge node registration failed');
    }
  }

  async getOptimalEdgeNode(
    clientIp: string, 
    requestPath: string, 
    requirements?: EdgeRequirements
  ): Promise<EdgeNode> {
    try {
      // Get client geo location
      const clientLocation = await this.getClientLocation(clientIp);
      
      // Get healthy nodes
      const { data: healthyNodes } = await this.supabase
        .from('edge_nodes')
        .select(`
          *,
          edge_services!inner(*)
        `)
        .eq('health_status', 'healthy')
        .eq('is_active', true);

      if (!healthyNodes?.length) {
        throw new Error('No healthy edge nodes available');
      }

      // Calculate optimal node based on multiple factors
      const scoredNodes = await Promise.all(
        healthyNodes.map(async (node) => {
          const score = await this.calculateNodeScore(node, clientLocation, requirements);
          return { node, score };
        })
      );

      // Sort by score (higher is better)
      scoredNodes.sort((a, b) => b.score - a.score);
      
      const selectedNode = scoredNodes[0].node;
      
      // Log routing decision
      await this.logRoutingDecision({
        client_ip: clientIp,
        request_path: requestPath,
        selected_edge_node_id: selectedNode.id,
        routing_reason: 'optimal_latency_score',
        latency_ms: await this.estimateLatency(selectedNode, clientLocation)
      });

      return selectedNode;
    } catch (error) {
      console.error('Failed to get optimal edge node:', error);
      throw new Error('Edge node routing failed');
    }
  }

  async deployEdgeFunction(deploymentConfig: EdgeDeploymentConfig): Promise<DeploymentResult> {
    try {
      // Validate function code
      const validationResult = await this.validateEdgeFunction(deploymentConfig.edge_function_code);
      if (!validationResult.isValid) {
        throw new Error(`Function validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get target edge nodes
      const targetNodes = await this.getDeploymentTargets(deploymentConfig.deployment_targets);
      
      // Deploy to each target node
      const deploymentResults = await Promise.all(
        targetNodes.map(async (node) => {
          try {
            return await this.deployToNode(node, deploymentConfig);
          } catch (error) {
            return { node_id: node.id, success: false, error: error.message };
          }
        })
      );

      const successCount = deploymentResults.filter(r => r.success).length;
      const totalCount = deploymentResults.length;

      // Update deployment config
      const { error } = await this.supabase
        .from('edge_deployment_configs')
        .update({
          is_active: successCount === totalCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', deploymentConfig.id);

      if (error) throw error;

      return {
        deployment_id: deploymentConfig.id,
        success_count: successCount,
        total_count: totalCount,
        results: deploymentResults,
        is_fully_deployed: successCount === totalCount
      };
    } catch (error) {
      console.error('Failed to deploy edge function:', error);
      throw new Error('Edge function deployment failed');
    }
  }

  async monitorEdgePerformance(): Promise<void> {
    try {
      const { data: nodes } = await this.supabase
        .from('edge_nodes')
        .select('*')
        .eq('is_active', true);

      if (!nodes?.length) return;

      // Monitor each node
      await Promise.all(
        nodes.map(async (node) => {
          try {
            const metrics = await this.collectNodeMetrics(node);
            
            // Update node metrics
            await this.supabase
              .from('edge_nodes')
              .update({
                load_metrics: metrics,
                health_status: this.determineHealthStatus(metrics),
                updated_at: new Date().toISOString()
              })
              .eq('id', node.id);

            // Store detailed metrics
            await this.storeDetailedMetrics(node.id, metrics);
            
            // Check for alerts
            await this.checkPerformanceAlerts(node, metrics);
          } catch (error) {
            console.error(`Failed to monitor node ${node.id}:`, error);
            
            // Mark node as degraded
            await this.supabase
              .from('edge_nodes')
              .update({
                health_status: 'degraded',
                updated_at: new Date().toISOString()
              })
              .eq('id', node.id);
          }
        })
      );
    } catch (error) {
      console.error('Failed to monitor edge performance:', error);
      throw error;
    }
  }

  private async calculateNodeScore(
    node: EdgeNode, 
    clientLocation: GeoLocation, 
    requirements?: EdgeRequirements
  ): Promise<number> {
    let score = 0;
    
    // Geographic proximity (40% of score)
    const distance = this.calculateDistance(node.location, clientLocation);
    score += (1 / (1 + distance / 1000)) * 40;
    
    // Current load (30% of score)
    const loadScore = 100 - (node.load_metrics.cpu_usage + node.load_metrics.memory_usage) / 2;
    score += loadScore * 0.3;
    
    // Historical performance (20% of score)
    const performanceScore = await this.getHistoricalPerformanceScore(node.id);
    score += performanceScore * 0.2;
    
    // Service availability (10% of score)
    const serviceScore = await this.getServiceAvailabilityScore(node, requirements);
    score += serviceScore * 0.1;
    
    return score;
  }

  private async healthCheckNode(endpointUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpointUrl}/health`, {
        timeout: 5000,
        headers: { 'User-Agent': 'WedSync-EdgeMonitor/1.0' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

#### 2.4.2 CDN Management Service
```typescript
export class CDNManagementService {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  async configureCDN(config: CreateCDNConfigRequest): Promise<CDNConfiguration> {
    try {
      // Validate domain and SSL certificate
      const sslValidation = await this.validateSSLConfiguration(config.domain);
      
      const { data: cdnConfig, error } = await this.supabase
        .from('cdn_configurations')
        .insert({
          ...config,
          ssl_configuration: {
            ...config.ssl_configuration,
            validation_status: sslValidation.isValid ? 'valid' : 'invalid',
            expires_at: sslValidation.expiresAt
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Deploy configuration to edge nodes
      await this.deployCDNConfiguration(cdnConfig);
      
      return cdnConfig;
    } catch (error) {
      console.error('Failed to configure CDN:', error);
      throw new Error('CDN configuration failed');
    }
  }

  async purgeCDNCache(request: PurgeCacheRequest): Promise<PurgeResult> {
    try {
      const { data: config } = await this.supabase
        .from('cdn_configurations')
        .select('*')
        .eq('domain', request.domain)
        .eq('is_active', true)
        .single();

      if (!config) {
        throw new Error(`CDN configuration not found for domain: ${request.domain}`);
      }

      // Get affected edge nodes
      const { data: edgeNodes } = await this.supabase
        .from('edge_nodes')
        .select('*')
        .eq('health_status', 'healthy')
        .eq('is_active', true);

      if (!edgeNodes?.length) {
        throw new Error('No healthy edge nodes available');
      }

      // Execute purge on all edge nodes
      const purgeResults = await Promise.all(
        edgeNodes.map(async (node) => {
          try {
            if (request.purge_everything) {
              return await this.purgeAllCache(node);
            } else if (request.paths?.length) {
              return await this.purgeCachePaths(node, request.paths);
            } else if (request.tags?.length) {
              return await this.purgeCacheTags(node, request.tags);
            }
            return { node_id: node.id, success: false, error: 'No purge criteria specified' };
          } catch (error) {
            return { node_id: node.id, success: false, error: error.message };
          }
        })
      );

      const successCount = purgeResults.filter(r => r.success).length;
      
      return {
        domain: request.domain,
        purged_nodes: successCount,
        total_nodes: edgeNodes.length,
        results: purgeResults,
        completed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to purge CDN cache:', error);
      throw new Error('CDN cache purge failed');
    }
  }

  async getCDNAnalytics(domain: string, timeRange: TimeRange): Promise<CDNAnalytics> {
    try {
      const { data: routingData } = await this.supabase
        .from('edge_routing_decisions')
        .select('*')
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end);

      if (!routingData?.length) {
        return {
          domain,
          total_requests: 0,
          cache_hit_ratio: 0,
          average_response_time: 0,
          bandwidth_saved: 0,
          geographic_breakdown: [],
          performance_timeline: []
        };
      }

      // Calculate analytics
      const totalRequests = routingData.length;
      const cacheHits = routingData.filter(r => r.cache_status === 'hit').length;
      const averageLatency = routingData.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / totalRequests;
      const totalBandwidth = routingData.reduce((sum, r) => sum + (r.response_size || 0), 0);
      const cachedBandwidth = routingData
        .filter(r => r.cache_status === 'hit')
        .reduce((sum, r) => sum + (r.response_size || 0), 0);

      return {
        domain,
        total_requests: totalRequests,
        cache_hit_ratio: (cacheHits / totalRequests) * 100,
        average_response_time: averageLatency,
        bandwidth_saved: cachedBandwidth,
        geographic_breakdown: this.calculateGeographicBreakdown(routingData),
        performance_timeline: this.calculatePerformanceTimeline(routingData, timeRange)
      };
    } catch (error) {
      console.error('Failed to get CDN analytics:', error);
      throw new Error('CDN analytics retrieval failed');
    }
  }

  private async deployCDNConfiguration(config: CDNConfiguration): Promise<void> {
    const { data: edgeNodes } = await this.supabase
      .from('edge_nodes')
      .select('*')
      .eq('health_status', 'healthy')
      .eq('is_active', true);

    if (!edgeNodes?.length) {
      throw new Error('No healthy edge nodes available for CDN deployment');
    }

    // Deploy to each edge node
    await Promise.all(
      edgeNodes.map(async (node) => {
        try {
          await this.deployConfigToNode(node, config);
        } catch (error) {
          console.error(`Failed to deploy CDN config to node ${node.id}:`, error);
          // Continue with other nodes even if one fails
        }
      })
    );
  }
}
```

## 3. React Components

### 3.1 Edge Computing Dashboard
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Server, Globe, Zap, TrendingUp, MapPin } from 'lucide-react';

interface EdgeComputingDashboardProps {
  onNodeSelect?: (nodeId: string) => void;
  showMetrics?: boolean;
}

export const EdgeComputingDashboard: React.FC<EdgeComputingDashboardProps> = ({
  onNodeSelect,
  showMetrics = true
}) => {
  const [edgeNodes, setEdgeNodes] = useState<EdgeNode[]>([]);
  const [analytics, setAnalytics] = useState<EdgeAnalytics | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEdgeData();
    const interval = setInterval(loadEdgeData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [selectedRegion]);

  const loadEdgeData = async () => {
    try {
      setLoading(true);
      
      const [nodesResponse, analyticsResponse] = await Promise.all([
        fetch('/api/edge/nodes'),
        fetch('/api/edge/analytics')
      ]);

      if (!nodesResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to load edge data');
      }

      const nodesData = await nodesResponse.json();
      const analyticsData = await analyticsResponse.json();

      setEdgeNodes(nodesData.nodes);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load edge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRegionNodes = (region: string) => {
    if (region === 'all') return edgeNodes;
    return edgeNodes.filter(node => node.region === region);
  };

  const regions = ['all', ...Array.from(new Set(edgeNodes.map(node => node.region)))];
  const filteredNodes = getRegionNodes(selectedRegion);
  const healthyNodes = filteredNodes.filter(node => node.health_status === 'healthy').length;
  const totalNodes = filteredNodes.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Edge Computing Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage global edge infrastructure</p>
        </div>
        
        <div className="flex gap-4">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {regions.map(region => (
              <option key={region} value={region}>
                {region === 'all' ? 'All Regions' : region}
              </option>
            ))}
          </select>
          
          <Button onClick={loadEdgeData} variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Metrics */}
      {showMetrics && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Requests</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_requests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics.requests_growth}% from last hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Ratio</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.cache_hit_ratio.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Bandwidth saved: {(analytics.bandwidth_saved / 1024 / 1024).toFixed(1)} MB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.average_latency}ms</div>
              <p className="text-xs text-muted-foreground">
                {analytics.latency_trend > 0 ? '+' : ''}{analytics.latency_trend}ms vs yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy Nodes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthyNodes}/{totalNodes}</div>
              <p className="text-xs text-muted-foreground">
                {((healthyNodes / totalNodes) * 100).toFixed(1)}% operational
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edge Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNodes.map((node) => (
          <Card 
            key={node.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNodeSelect?.(node.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{node.location}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getHealthStatusColor(node.health_status)}`}></div>
                  <Badge variant={node.health_status === 'healthy' ? 'default' : 'destructive'}>
                    {node.health_status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                {node.region} • {node.provider}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* Load Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">CPU Usage</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${node.load_metrics.cpu_usage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{node.load_metrics.cpu_usage}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Memory</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${node.load_metrics.memory_usage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{node.load_metrics.memory_usage}%</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <div className="text-sm text-gray-600">Response Time</div>
                    <div className="text-lg font-medium">{node.load_metrics.response_time_avg}ms</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Cache Hit</div>
                    <div className="text-lg font-medium">{node.load_metrics.cache_hit_ratio}%</div>
                  </div>
                </div>

                {/* Active Connections */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Connections</span>
                    <span className="font-medium">{node.load_metrics.active_connections}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Requests/sec</span>
                    <span className="font-medium">{node.load_metrics.requests_per_second}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No nodes message */}
      {filteredNodes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Edge Nodes</h3>
            <p className="text-gray-600 text-center max-w-md">
              {selectedRegion === 'all' 
                ? 'No edge nodes are currently configured. Deploy your first node to get started.'
                : `No edge nodes found in the ${selectedRegion} region.`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EdgeComputingDashboard;
```

### 3.2 CDN Configuration Component
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Globe, Shield, Zap, Settings } from 'lucide-react';

interface CDNConfigurationProps {
  onConfigurationSave?: (config: CDNConfiguration) => void;
  existingConfig?: CDNConfiguration;
}

export const CDNConfiguration: React.FC<CDNConfigurationProps> = ({
  onConfigurationSave,
  existingConfig
}) => {
  const [config, setConfig] = useState<Partial<CreateCDNConfigRequest>>({
    domain: '',
    origin_servers: [{ url: '', priority: 1, weight: 100 }],
    cache_policies: [],
    routing_rules: [],
    ssl_configuration: { enabled: true, force_https: true },
    compression_settings: { enabled: true, types: ['text', 'application'] }
  });
  
  const [analytics, setAnalytics] = useState<CDNAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig);
      loadAnalytics(existingConfig.domain);
    }
  }, [existingConfig]);

  const loadAnalytics = async (domain: string) => {
    try {
      const response = await fetch(`/api/edge/cdn/analytics?domain=${domain}&range=24h`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load CDN analytics:', error);
    }
  };

  const validateConfiguration = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.domain) {
      newErrors.domain = 'Domain is required';
    } else if (!/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/.test(config.domain)) {
      newErrors.domain = 'Invalid domain format';
    }

    if (!config.origin_servers?.length) {
      newErrors.origin_servers = 'At least one origin server is required';
    } else {
      config.origin_servers.forEach((server, index) => {
        if (!server.url) {
          newErrors[`origin_${index}`] = 'Origin server URL is required';
        } else if (!/^https?:\/\/.+/.test(server.url)) {
          newErrors[`origin_${index}`] = 'Invalid origin server URL';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfiguration()) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/edge/cdn/configs', {
        method: existingConfig ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to save CDN configuration');
      }

      const savedConfig = await response.json();
      onConfigurationSave?.(savedConfig);
      
      if (savedConfig.domain) {
        await loadAnalytics(savedConfig.domain);
      }
    } catch (error) {
      console.error('Failed to save CDN configuration:', error);
      setErrors({ general: 'Failed to save configuration. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!config.domain) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/edge/cdn/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: config.domain,
          purge_everything: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to purge CDN cache');
      }

      // Reload analytics after purge
      setTimeout(() => loadAnalytics(config.domain!), 2000);
    } catch (error) {
      console.error('Failed to purge CDN cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const addOriginServer = () => {
    setConfig(prev => ({
      ...prev,
      origin_servers: [
        ...(prev.origin_servers || []),
        { url: '', priority: 1, weight: 100 }
      ]
    }));
  };

  const removeOriginServer = (index: number) => {
    setConfig(prev => ({
      ...prev,
      origin_servers: prev.origin_servers?.filter((_, i) => i !== index) || []
    }));
  };

  const updateOriginServer = (index: number, field: keyof OriginServer, value: any) => {
    setConfig(prev => ({
      ...prev,
      origin_servers: prev.origin_servers?.map((server, i) => 
        i === index ? { ...server, [field]: value } : server
      ) || []
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">CDN Configuration</h2>
          <p className="text-gray-600 mt-1">Configure content delivery and caching settings</p>
        </div>
        
        <div className="flex gap-3">
          {config.domain && (
            <Button onClick={handlePurgeCache} variant="outline" disabled={loading}>
              <Zap className="h-4 w-4 mr-2" />
              Purge Cache
            </Button>
          )}
          
          <Button onClick={handleSave} disabled={loading}>
            <Settings className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{errors.general}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Basic Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Domain</label>
                <Input
                  value={config.domain || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                  className={errors.domain ? 'border-red-500' : ''}
                />
                {errors.domain && (
                  <p className="text-red-500 text-sm mt-1">{errors.domain}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Origin Servers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Origin Servers</CardTitle>
              <Button onClick={addOriginServer} size="sm" variant="outline">
                Add Server
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.origin_servers?.map((server, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Server URL</label>
                    <Input
                      value={server.url}
                      onChange={(e) => updateOriginServer(index, 'url', e.target.value)}
                      placeholder="https://origin.example.com"
                      className={errors[`origin_${index}`] ? 'border-red-500' : ''}
                    />
                    {errors[`origin_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`origin_${index}`]}</p>
                    )}
                  </div>
                  
                  <div className="w-24">
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <Input
                      type="number"
                      value={server.priority}
                      onChange={(e) => updateOriginServer(index, 'priority', parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div className="w-24">
                    <label className="block text-sm font-medium mb-2">Weight</label>
                    <Input
                      type="number"
                      value={server.weight}
                      onChange={(e) => updateOriginServer(index, 'weight', parseInt(e.target.value))}
                      min="1"
                      max="100"
                    />
                  </div>
                  
                  {config.origin_servers!.length > 1 && (
                    <Button
                      onClick={() => removeOriginServer(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SSL Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                SSL & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ssl_configuration?.enabled || false}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      ssl_configuration: {
                        ...prev.ssl_configuration,
                        enabled: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  Enable SSL
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ssl_configuration?.force_https || false}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      ssl_configuration: {
                        ...prev.ssl_configuration,
                        force_https: e.target.checked
                      }
                    }))}
                    className="mr-2"
                    disabled={!config.ssl_configuration?.enabled}
                  />
                  Force HTTPS
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Compression Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Compression & Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.compression_settings?.enabled || false}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    compression_settings: {
                      ...prev.compression_settings,
                      enabled: e.target.checked
                    }
                  }))}
                  className="mr-2"
                />
                Enable Compression
              </label>
              
              {config.compression_settings?.enabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">Compression Types</label>
                  <div className="flex flex-wrap gap-2">
                    {['text', 'application', 'image', 'font'].map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.compression_settings?.types?.includes(type) || false}
                          onChange={(e) => {
                            const types = config.compression_settings?.types || [];
                            const newTypes = e.target.checked
                              ? [...types, type]
                              : types.filter(t => t !== type);
                            
                            setConfig(prev => ({
                              ...prev,
                              compression_settings: {
                                ...prev.compression_settings,
                                types: newTypes
                              }
                            }));
                          }}
                          className="mr-1"
                        />
                        <Badge variant="outline">{type}</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Panel */}
        <div className="space-y-6">
          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Requests (24h)</div>
                    <div className="text-2xl font-bold">{analytics.total_requests.toLocaleString()}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Cache Hit Ratio</div>
                    <div className="text-2xl font-bold text-green-600">{analytics.cache_hit_ratio.toFixed(1)}%</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                    <div className="text-2xl font-bold">{analytics.average_response_time}ms</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Bandwidth Saved</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(analytics.bandwidth_saved / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geographic Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.geographic_breakdown.map((geo) => (
                      <div key={geo.region} className="flex justify-between items-center">
                        <span className="text-sm">{geo.region}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(geo.requests / analytics.total_requests) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {((geo.requests / analytics.total_requests) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!analytics && config.domain && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CDNConfiguration;
```

## 4. Integration Requirements

### 4.1 MCP Server Usage
```typescript
// Use Supabase MCP for database operations
await supabase_mcp.execute_sql(`
  SELECT * FROM edge_nodes 
  WHERE health_status = 'healthy' 
  AND region = $1
`, [selectedRegion]);

// Use Context7 MCP for CDN provider documentation
await context7_mcp.get_documentation('cloudflare-api-edge-functions');

// Use Browser MCP for edge endpoint testing
await browser_mcp.navigate(edgeEndpoint);
await browser_mcp.take_screenshot('edge-health-check.png');
```

### 4.2 Navigation Integration
```typescript
// Add to existing navigation structure
const navigationItems = [
  // ... existing items
  {
    label: 'Edge Computing',
    icon: Server,
    href: '/dashboard/edge',
    children: [
      { label: 'Node Management', href: '/dashboard/edge/nodes' },
      { label: 'CDN Configuration', href: '/dashboard/edge/cdn' },
      { label: 'Performance Analytics', href: '/dashboard/edge/analytics' },
      { label: 'Cache Management', href: '/dashboard/edge/cache' },
      { label: 'Edge Functions', href: '/dashboard/edge/functions' }
    ]
  }
];
```

## 5. Testing Requirements

### 5.1 Unit Tests
```typescript
describe('EdgeComputingService', () => {
  test('should select optimal edge node based on latency', async () => {
    const service = new EdgeComputingService();
    const optimalNode = await service.getOptimalEdgeNode('192.168.1.1', '/api/wedding/123');
    
    expect(optimalNode).toBeDefined();
    expect(optimalNode.health_status).toBe('healthy');
  });

  test('should handle edge node failure gracefully', async () => {
    const service = new EdgeComputingService();
    
    // Mock node failure
    jest.spyOn(service as any, 'healthCheckNode').mockResolvedValue(false);
    
    const result = await service.registerEdgeNode({
      location: 'Test Location',
      region: 'test',
      provider: 'test',
      endpoint_url: 'https://test.example.com',
      capacity_config: { cpu_cores: 4, memory_gb: 8, storage_gb: 100, bandwidth_mbps: 1000 }
    });
    
    expect(result.health_status).toBe('offline');
  });
});
```

### 5.2 Integration Tests
```typescript
describe('Edge Computing Integration', () => {
  test('should deploy CDN configuration to all healthy nodes', async () => {
    const cdnService = new CDNManagementService();
    
    const config: CreateCDNConfigRequest = {
      domain: 'test.wedsync.io',
      origin_servers: [{ url: 'https://origin.wedsync.io', priority: 1, weight: 100 }],
      cache_policies: [
        { path_pattern: '/static/*', ttl: 86400 },
        { path_pattern: '/api/*', ttl: 300 }
      ]
    };
    
    const result = await cdnService.configureCDN(config);
    
    expect(result).toBeDefined();
    expect(result.domain).toBe('test.wedsync.io');
  });

  test('should purge cache across all edge locations', async () => {
    const cdnService = new CDNManagementService();
    
    const purgeResult = await cdnService.purgeCDNCache({
      domain: 'test.wedsync.io',
      purge_everything: true
    });
    
    expect(purgeResult.purged_nodes).toBeGreaterThan(0);
    expect(purgeResult.results.every(r => r.success)).toBe(true);
  });
});
```

### 5.3 Performance Tests
```typescript
describe('Edge Performance Tests', () => {
  test('should handle 1000+ concurrent routing requests', async () => {
    const service = new EdgeComputingService();
    const requests = Array.from({ length: 1000 }, (_, i) => 
      service.getOptimalEdgeNode(`192.168.1.${i % 255}`, '/api/test')
    );
    
    const results = await Promise.all(requests);
    
    expect(results).toHaveLength(1000);
    expect(results.every(r => r.health_status === 'healthy')).toBe(true);
  });

  test('should maintain sub-100ms routing decision time', async () => {
    const service = new EdgeComputingService();
    
    const startTime = Date.now();
    const result = await service.getOptimalEdgeNode('8.8.8.8', '/api/wedding/456');
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(100);
    expect(result).toBeDefined();
  });
});
```

### 5.4 Browser Tests (Playwright MCP)
```typescript
// Test edge endpoint response times
await mcp_playwright.browser_navigate('https://edge-us-east.wedsync.io/health');
const response = await mcp_playwright.browser_evaluate(() => {
  return {
    status: document.body.textContent,
    responseTime: performance.getEntriesByType('navigation')[0].responseEnd
  };
});

expect(response.status).toContain('healthy');
expect(response.responseTime).toBeLessThan(2000);

// Test CDN cache headers
await mcp_playwright.browser_navigate('https://cdn.wedsync.io/static/logo.png');
const cacheHeaders = await mcp_playwright.browser_evaluate(() => {
  return {
    cacheControl: document.headers?.['cache-control'],
    cdnHit: document.headers?.['cf-cache-status']
  };
});

expect(cacheHeaders.cacheControl).toContain('max-age');
```

## 6. Security Considerations

### 6.1 Edge Security
- **SSL/TLS Termination**: All edge nodes require valid SSL certificates
- **DDoS Protection**: Implement rate limiting and traffic analysis at edge
- **Access Controls**: Restrict edge management APIs to authorized personnel
- **Certificate Management**: Automated SSL certificate renewal and validation

### 6.2 Data Protection
- **Regional Compliance**: Data residency rules enforced at edge locations
- **Encryption**: All data in transit encrypted with TLS 1.3
- **Access Logging**: Comprehensive logging of all edge access and modifications
- **Audit Trails**: Full audit trail for configuration changes and deployments

## 7. Performance Optimization

### 7.1 Caching Strategy
- **Multi-tier Caching**: Browser → Edge → CDN → Origin
- **Intelligent TTL**: Dynamic TTL based on content type and update frequency
- **Cache Warming**: Proactive cache population for popular content
- **Smart Invalidation**: Granular cache invalidation with tag-based purging

### 7.2 Load Balancing
- **Geographic Routing**: Route users to nearest healthy edge node
- **Health-based Routing**: Avoid overloaded or degraded nodes
- **Failover**: Automatic failover to backup edge locations
- **Load Prediction**: AI-based load prediction for proactive scaling

## 8. Deployment Strategy

### 8.1 Edge Node Deployment
1. **Infrastructure Provisioning**: Automated edge node setup via infrastructure-as-code
2. **Service Deployment**: Container-based service deployment with health checks
3. **Configuration Sync**: Centralized configuration management with edge synchronization
4. **Monitoring Setup**: Comprehensive monitoring and alerting configuration

### 8.2 CDN Rollout
1. **Staging Environment**: Test CDN configuration in staging
2. **Gradual Rollout**: Phase deployment across edge locations
3. **Performance Validation**: Continuous performance monitoring during rollout
4. **Rollback Plan**: Instant rollback capabilities for configuration issues

## 9. Monitoring and Alerts

### 9.1 Key Metrics
- **Availability**: Edge node uptime and health status
- **Performance**: Response times and throughput across locations
- **Cache Efficiency**: Hit ratios and bandwidth savings
- **Error Rates**: 4xx/5xx error tracking and alerting

### 9.2 Alert Conditions
- Edge node health degradation
- Cache hit ratio below 70%
- Response times above 2 seconds
- SSL certificate expiration within 30 days
- Bandwidth usage exceeding 80% capacity

## 10. Business Impact

### 10.1 Performance Improvements
- **Global Latency**: 40-60% reduction in page load times worldwide
- **User Experience**: Improved responsiveness for real-time features
- **Scalability**: Handle 10x traffic spikes without performance degradation
- **Availability**: 99.9% uptime with automatic failover

### 10.2 Cost Benefits
- **Bandwidth Savings**: 30% reduction in origin bandwidth costs
- **Infrastructure Efficiency**: Optimized resource utilization across edge locations
- **Operational Savings**: Reduced support tickets from performance issues
- **Revenue Protection**: Minimize revenue loss from slow page loads

## 11. Future Enhancements

### 11.1 Advanced Features
- **Edge Computing Functions**: Serverless function execution at edge
- **AI-Powered Routing**: Machine learning for optimal routing decisions
- **Real-time Analytics**: Live performance dashboard with global metrics
- **Auto-scaling**: Dynamic edge capacity scaling based on demand

### 11.2 Integration Opportunities
- **Wedding Venue APIs**: Cache venue availability and pricing data
- **Vendor Integrations**: Edge-cached vendor catalogs and real-time inventory
- **Payment Processing**: Secure payment processing at regional edge locations
- **Media Optimization**: Automatic image and video optimization for different devices

## 12. Maintenance and Support

### 12.1 Routine Maintenance
- **Health Monitoring**: Continuous monitoring with automated remediation
- **Performance Tuning**: Regular optimization based on usage patterns
- **Security Updates**: Automated security patching and certificate renewal
- **Capacity Planning**: Proactive scaling based on growth projections

### 12.2 Incident Response
- **24/7 Monitoring**: Round-the-clock monitoring with alert escalation
- **Automated Recovery**: Self-healing capabilities for common issues
- **Incident Management**: Structured incident response with root cause analysis
- **Communication Plan**: Customer communication during service issues

## 13. Success Metrics

### 13.1 Technical Metrics
- **Global P95 Response Time**: < 2 seconds
- **Edge Node Availability**: > 99.9%
- **Cache Hit Ratio**: > 85%
- **Bandwidth Optimization**: > 30% savings

### 13.2 Business Metrics
- **User Satisfaction**: Improved page speed scores
- **Conversion Rates**: Increased due to better performance
- **Support Tickets**: 50% reduction in performance-related issues
- **Cost Efficiency**: 25% reduction in infrastructure costs

## 14. Risk Assessment

### 14.1 Technical Risks
- **Edge Node Failures**: Mitigated by multi-region deployment and failover
- **CDN Misconfigurations**: Addressed by staged rollouts and automated testing
- **Performance Degradation**: Monitored with automatic rollback capabilities
- **Security Vulnerabilities**: Regular security audits and automated patching

### 14.2 Business Risks
- **Service Disruption**: Impact minimized by geographic distribution
- **Cost Overruns**: Controlled by automated scaling limits and monitoring
- **Compliance Issues**: Addressed by regional data residency controls
- **Vendor Dependencies**: Mitigated by multi-provider CDN strategy

## 15. Effort Estimation

### 15.1 Development Phases
**Phase 1: Core Infrastructure (15 days)**
- Edge node management system
- Basic CDN configuration
- Health monitoring and routing

**Phase 2: Advanced Features (12 days)**
- Performance analytics dashboard
- Cache management and purging
- SSL certificate automation

**Phase 3: Optimization and Monitoring (8 days)**
- Load balancing algorithms
- Advanced monitoring and alerting
- Performance optimization

**Phase 4: Testing and Deployment (10 days)**
- Comprehensive testing suite
- Deployment automation
- Documentation and training

**Total Estimated Effort: 45 days**

### 15.2 Resource Requirements
- **Senior Full-Stack Developer**: 25 days
- **DevOps Engineer**: 15 days  
- **QA Engineer**: 10 days
- **UI/UX Designer**: 3 days

This comprehensive edge computing system will significantly improve WedSync's global performance, reduce operational costs, and provide a scalable foundation for international expansion while maintaining high availability and security standards.