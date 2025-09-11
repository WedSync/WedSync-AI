# WS-296: Infrastructure - Main Overview - Technical Specification

## Feature Overview

**Feature ID**: WS-296  
**Feature Name**: Infrastructure - Main Overview  
**Feature Type**: Core Infrastructure  
**Priority**: P0 (Critical Foundation)  
**Complexity**: High  
**Effort**: 3 weeks  

## Problem Statement

The WedSync/WedMe platform requires production-ready infrastructure that provides:
- Scalable deployment architecture supporting growth from 1,000 to 100,000+ users
- Global performance with <2s page load times and >99.9% uptime
- Cost-effective scaling plan from $500/month to $10,000+/month based on usage
- Comprehensive monitoring and alerting for proactive issue resolution
- Automated backup and disaster recovery procedures
- Security hardening with DDoS protection and WAF

**Current Pain Points:**
- No production deployment strategy with proper environment separation
- Missing monitoring and alerting infrastructure for incident response
- No backup and disaster recovery procedures
- Unclear scaling plan for viral growth scenarios
- Missing security hardening and threat protection
- No cost monitoring and optimization strategies

## Solution Architecture

### Core Components

#### 1. Vercel Deployment Platform
- **Multi-region deployment**: US-East (primary), EU-West (secondary) for global performance
- **Automatic scaling**: Serverless functions with 1024MB memory allocation
- **Edge optimization**: CDN caching, image optimization, and edge functions
- **Preview deployments**: Automatic PR previews with unique URLs for testing

#### 2. Supabase Database Infrastructure
- **Managed PostgreSQL**: Auto-scaling with connection pooling and read replicas
- **Realtime infrastructure**: WebSocket support for real-time collaboration
- **Built-in backups**: Automated daily backups with point-in-time recovery
- **Global distribution**: Multi-region setup for disaster recovery

#### 3. Monitoring and Observability Stack
- **Error tracking**: Sentry for exception monitoring and alerting
- **Performance monitoring**: Vercel Analytics + Core Web Vitals tracking
- **Uptime monitoring**: Better Uptime with global checkpoints
- **Log aggregation**: Structured logging with 30-day retention

#### 4. Security and Compliance
- **SSL/TLS**: Automatic certificate management with HSTS
- **DDoS protection**: Vercel's built-in DDoS mitigation
- **WAF integration**: Security headers and request filtering
- **Environment isolation**: Separate staging and production environments

#### 5. Scaling Strategy
- **Phase 1 (0-1K users)**: Basic Vercel Pro + Supabase Pro ($500/month)
- **Phase 2 (1K-5K users)**: Enhanced monitoring + Redis cache ($2K/month)
- **Phase 3 (5K-20K users)**: Enterprise plans + database optimization ($10K/month)
- **Phase 4 (20K+ users)**: Custom infrastructure + dedicated support

## User Stories

### Epic: Production Infrastructure Foundation
**As a** Platform Administrator  
**I want** Robust production infrastructure  
**So that** The platform can scale to 100,000+ users with 99.9% reliability

**Acceptance Criteria:**
- Global deployment with <2s page load times
- 99.9% uptime with automatic scaling
- Comprehensive monitoring with proactive alerts
- Automated backup and recovery procedures
- Cost-optimized scaling based on usage

### Story: Global Performance Deployment
**As a** Wedding Supplier (Sarah, photographer in London)  
**I want** Fast platform access regardless of my location  
**So that** I can work efficiently without waiting for slow page loads

**Scenario**: Sarah accesses WedSync dashboard from London during peak hours

**Acceptance Criteria:**
- London page loads complete in <2 seconds
- Images and assets served from European CDN
- API responses return in <200ms from EU region
- No performance degradation during US peak hours
- Dashboard remains responsive during file uploads

### Story: Reliability During Peak Usage
**As a** Wedding Couple (James & Emma)  
**I want** The platform to remain available during wedding season  
**So that** I can access my planning tools when I need them most

**Scenario**: September wedding season with 5x typical traffic

**Acceptance Criteria:**
- Platform maintains 99.9% uptime during traffic spikes
- Automatic scaling handles increased load without manual intervention
- No service degradation during peak planning periods
- Real-time features continue working under load
- Form submissions never fail due to capacity limits

### Story: Proactive Issue Detection
**As a** Platform Administrator  
**I want** Immediate alerts when system issues occur  
**So that** I can resolve problems before users are impacted

**Scenario**: Database query performance degrades due to missing index

**Acceptance Criteria:**
- Alert triggers within 5 minutes of performance degradation
- Alert includes specific query and performance metrics
- Suggested remediation steps provided in alert
- Incident automatically logged with severity level
- Recovery confirmed through automated health checks

### Story: Cost-Effective Scaling
**As a** Business Owner  
**I want** Infrastructure costs to scale proportionally with usage  
**So that** Unit economics remain healthy during growth

**Scenario**: Growing from 1,000 to 10,000 suppliers over 12 months

**Acceptance Criteria:**
- Infrastructure costs scale linearly with user growth
- Monthly cost reports show cost per active user
- Automatic optimization recommendations for cost reduction
- No unexpected billing spikes from usage overages
- Clear cost projections for next growth phase

### Story: Data Protection and Recovery
**As a** Platform Administrator  
**I want** Reliable backup and disaster recovery procedures  
**So that** Customer data is never lost regardless of incidents

**Scenario**: Primary database experiences hardware failure

**Acceptance Criteria:**
- Automatic failover to backup region within 2 minutes
- No data loss with point-in-time recovery capability
- All customer data restored from automated backups
- Service restored within 15 minutes of incident
- Post-incident report documents recovery process

## Database Design

### Infrastructure Monitoring Tables

```sql
-- Infrastructure health and performance tracking

CREATE TABLE IF NOT EXISTS infrastructure_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL, -- 'vercel', 'supabase', 'redis', etc.
    region VARCHAR(50) NOT NULL,
    metric_type VARCHAR(100) NOT NULL, -- 'response_time', 'error_rate', 'cpu_usage', etc.
    metric_value DECIMAL NOT NULL,
    metric_unit VARCHAR(20) NOT NULL, -- 'ms', 'percent', 'count', 'bytes'
    measurement_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes for performance analysis
    INDEX idx_infra_metrics_service_time (service_name, measurement_time DESC),
    INDEX idx_infra_metrics_type_time (metric_type, measurement_time DESC)
);

CREATE TABLE IF NOT EXISTS deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id VARCHAR(200) NOT NULL UNIQUE,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'staging', 'preview')),
    git_branch VARCHAR(200) NOT NULL,
    git_commit_hash VARCHAR(40) NOT NULL,
    deployed_by UUID REFERENCES auth.users(id),
    deployment_status VARCHAR(20) DEFAULT 'in_progress' CHECK (deployment_status IN ('in_progress', 'success', 'failed', 'rolled_back')),
    build_duration_ms INTEGER,
    deployment_url VARCHAR(500),
    error_message TEXT,
    deployed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Index for deployment tracking
    INDEX idx_deployments_env_time (environment, deployed_at DESC),
    INDEX idx_deployments_status_time (deployment_status, deployed_at DESC)
);

CREATE TABLE IF NOT EXISTS infrastructure_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(200) UNIQUE,
    alert_type VARCHAR(100) NOT NULL, -- 'error_rate_spike', 'response_time_degradation', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    service_name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    alert_title VARCHAR(500) NOT NULL,
    alert_description TEXT NOT NULL,
    metric_threshold DECIMAL,
    current_metric_value DECIMAL,
    alert_rule JSONB,
    notification_sent BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Index for alert management
    INDEX idx_alerts_severity_time (severity, triggered_at DESC),
    INDEX idx_alerts_service_unresolved (service_name, triggered_at DESC) WHERE resolved_at IS NULL,
    INDEX idx_alerts_active (severity, triggered_at DESC) WHERE resolved_at IS NULL
);

CREATE TABLE IF NOT EXISTS cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_provider VARCHAR(50) NOT NULL, -- 'vercel', 'supabase', 'openai', etc.
    service_category VARCHAR(50) NOT NULL, -- 'compute', 'database', 'storage', 'bandwidth'
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    usage_quantity DECIMAL NOT NULL,
    usage_unit VARCHAR(50) NOT NULL, -- 'gb_hours', 'function_invocations', 'api_requests'
    cost_usd DECIMAL NOT NULL,
    projected_monthly_cost DECIMAL,
    usage_tier VARCHAR(50), -- 'free', 'pro', 'enterprise'
    cost_notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for cost analysis
    INDEX idx_cost_provider_period (service_provider, billing_period_start DESC),
    INDEX idx_cost_category_period (service_category, billing_period_start DESC),
    UNIQUE(service_provider, service_category, billing_period_start, billing_period_end)
);

CREATE TABLE IF NOT EXISTS backup_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('database', 'files', 'configuration')),
    backup_target VARCHAR(200) NOT NULL, -- database name, file path, etc.
    backup_method VARCHAR(50) NOT NULL, -- 'supabase_automated', 'manual_export', etc.
    backup_size_bytes BIGINT,
    backup_location VARCHAR(500) NOT NULL,
    backup_retention_days INTEGER DEFAULT 30,
    backup_status VARCHAR(20) DEFAULT 'in_progress' CHECK (backup_status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ GENERATED ALWAYS AS (completed_at + (backup_retention_days || ' days')::INTERVAL) STORED,
    
    -- Index for backup management
    INDEX idx_backups_type_time (backup_type, started_at DESC),
    INDEX idx_backups_status_time (backup_status, started_at DESC),
    INDEX idx_backups_expiring (expires_at ASC) WHERE backup_status = 'completed'
);

CREATE TABLE IF NOT EXISTS scaling_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('scale_up', 'scale_down', 'configuration_change')),
    service_name VARCHAR(100) NOT NULL,
    trigger_reason VARCHAR(200) NOT NULL, -- 'cpu_threshold', 'user_growth', 'cost_optimization'
    previous_configuration JSONB,
    new_configuration JSONB,
    triggered_by VARCHAR(50) DEFAULT 'automatic', -- 'automatic', 'manual', 'scheduled'
    scaling_duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    cost_impact_usd DECIMAL,
    performance_impact_description TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Index for scaling analysis
    INDEX idx_scaling_service_time (service_name, triggered_at DESC),
    INDEX idx_scaling_type_time (event_type, triggered_at DESC)
);

-- Row Level Security Policies

-- Infrastructure metrics - Admin and service role access only
ALTER TABLE infrastructure_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to infrastructure metrics" ON infrastructure_metrics
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );

-- Deployment history - Admin access, developers can see their own deployments
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to deployments" ON deployment_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'developer'))
    );

CREATE POLICY "Users see own deployments" ON deployment_history
    FOR SELECT USING (deployed_by = auth.uid());

-- Infrastructure alerts - Admin and on-call team access
ALTER TABLE infrastructure_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operations team access to alerts" ON infrastructure_alerts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'developer', 'ops'))
    );

-- Cost tracking - Admin and finance team access only
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance team access to costs" ON cost_tracking
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'finance'))
    );

-- Backup status - Admin access only
ALTER TABLE backup_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to backup status" ON backup_status
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );

-- Scaling events - Admin access only
ALTER TABLE scaling_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to scaling events" ON scaling_events
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );
```

### Monitoring and Alerting Functions

```sql
-- Function to automatically create alerts based on metric thresholds
CREATE OR REPLACE FUNCTION check_infrastructure_thresholds()
RETURNS void AS $$
DECLARE
    alert_rule RECORD;
    current_value DECIMAL;
    should_alert BOOLEAN := false;
BEGIN
    -- Check response time thresholds
    SELECT AVG(metric_value) INTO current_value
    FROM infrastructure_metrics
    WHERE metric_type = 'response_time_ms'
    AND measurement_time >= NOW() - INTERVAL '5 minutes';
    
    IF current_value > 3000 THEN -- 3 second threshold
        INSERT INTO infrastructure_alerts (
            alert_type,
            severity,
            service_name,
            alert_title,
            alert_description,
            metric_threshold,
            current_metric_value
        ) VALUES (
            'response_time_degradation',
            CASE WHEN current_value > 5000 THEN 'critical' ELSE 'warning' END,
            'api',
            'Response Time Degradation',
            'API response time is ' || current_value || 'ms, exceeding threshold',
            3000,
            current_value
        )
        ON CONFLICT (alert_id) DO NOTHING;
    END IF;
    
    -- Check error rate thresholds
    SELECT AVG(metric_value) INTO current_value
    FROM infrastructure_metrics
    WHERE metric_type = 'error_rate_percent'
    AND measurement_time >= NOW() - INTERVAL '5 minutes';
    
    IF current_value > 1 THEN -- 1% error rate threshold
        INSERT INTO infrastructure_alerts (
            alert_type,
            severity,
            service_name,
            alert_title,
            alert_description,
            metric_threshold,
            current_metric_value
        ) VALUES (
            'error_rate_spike',
            CASE WHEN current_value > 5 THEN 'critical' ELSE 'error' END,
            'api',
            'Error Rate Spike',
            'Error rate is ' || current_value || '%, exceeding threshold',
            1,
            current_value
        )
        ON CONFLICT (alert_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the threshold check function to run every minute
SELECT cron.schedule('infrastructure-monitoring', '* * * * *', 'SELECT check_infrastructure_thresholds();');
```

## API Endpoints

### Infrastructure Management APIs

```typescript
// /api/infrastructure/health - GET
interface InfrastructureHealthResponse {
  overall_status: 'healthy' | 'degraded' | 'critical' | 'maintenance';
  services: {
    vercel: ServiceHealth;
    supabase: ServiceHealth;
    redis: ServiceHealth;
    external_apis: ServiceHealth;
  };
  performance_metrics: {
    global_response_time_ms: number;
    error_rate_percent: number;
    uptime_percent: number;
    active_users: number;
  };
  recent_deployments: Array<{
    environment: string;
    status: string;
    deployed_at: string;
    git_branch: string;
  }>;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  response_time_ms: number;
  error_rate_percent: number;
  last_check: string;
  region_status: Record<string, {
    status: string;
    response_time_ms: number;
  }>;
}

// /api/infrastructure/metrics - GET
interface InfrastructureMetricsRequest {
  service?: string;
  metric_type?: string;
  start_time?: string;
  end_time?: string;
  aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'p95' | 'p99';
  interval?: '1m' | '5m' | '1h' | '1d';
}

interface InfrastructureMetricsResponse {
  metrics: Array<{
    timestamp: string;
    service_name: string;
    metric_type: string;
    value: number;
    unit: string;
  }>;
  summary: {
    avg_value: number;
    max_value: number;
    min_value: number;
    data_points: number;
  };
  comparison: {
    vs_previous_period: {
      change_percent: number;
      direction: 'up' | 'down' | 'stable';
    };
  };
}

// /api/infrastructure/alerts - GET, POST, PUT
interface CreateAlertRequest {
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  service_name: string;
  alert_title: string;
  alert_description: string;
  metric_threshold?: number;
  alert_rule?: Record<string, any>;
}

interface AlertsResponse {
  active_alerts: Array<{
    id: string;
    alert_type: string;
    severity: string;
    service_name: string;
    alert_title: string;
    current_metric_value?: number;
    triggered_at: string;
    duration_minutes: number;
  }>;
  alert_summary: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
  recent_resolutions: Array<{
    alert_type: string;
    resolution_time_minutes: number;
    resolved_at: string;
  }>;
}

// /api/infrastructure/deployments - GET, POST
interface DeploymentRequest {
  environment: 'production' | 'staging' | 'preview';
  git_branch: string;
  git_commit_hash?: string;
  deployment_config?: Record<string, any>;
}

interface DeploymentResponse {
  deployment_id: string;
  deployment_url?: string;
  estimated_duration_minutes: number;
  deployment_status: 'queued' | 'building' | 'deploying' | 'ready' | 'error';
  build_logs_url?: string;
}

// /api/infrastructure/costs - GET
interface CostAnalysisResponse {
  current_month: {
    total_cost_usd: number;
    projected_monthly_cost_usd: number;
    cost_breakdown: Array<{
      service_provider: string;
      service_category: string;
      cost_usd: number;
      usage_quantity: number;
      usage_unit: string;
      cost_per_unit: number;
    }>;
  };
  trends: {
    cost_growth_percent_mom: number; // month over month
    usage_growth_percent_mom: number;
    efficiency_metrics: {
      cost_per_active_user: number;
      cost_per_api_request: number;
      cost_per_gb_storage: number;
    };
  };
  optimization_recommendations: Array<{
    service: string;
    recommendation: string;
    potential_savings_usd: number;
    effort_level: 'low' | 'medium' | 'high';
  }>;
}

// /api/infrastructure/scaling - POST
interface ScalingRequest {
  service_name: string;
  scaling_action: 'scale_up' | 'scale_down' | 'optimize';
  target_configuration?: Record<string, any>;
  reason?: string;
}

interface ScalingResponse {
  scaling_event_id: string;
  estimated_completion_minutes: number;
  cost_impact_usd?: number;
  performance_impact: string;
  rollback_available: boolean;
}
```

### Backup and Recovery APIs

```typescript
// /api/infrastructure/backups - GET, POST
interface CreateBackupRequest {
  backup_type: 'database' | 'files' | 'configuration';
  backup_target?: string;
  retention_days?: number;
  backup_notes?: string;
}

interface BackupResponse {
  backup_id: string;
  estimated_duration_minutes: number;
  backup_size_estimate_mb?: number;
  backup_location?: string;
}

interface BackupsListResponse {
  backups: Array<{
    id: string;
    backup_type: string;
    backup_target: string;
    backup_size_bytes?: number;
    backup_status: string;
    started_at: string;
    completed_at?: string;
    expires_at: string;
  }>;
  backup_summary: {
    total_backups: number;
    total_size_gb: number;
    oldest_backup_days: number;
    backup_success_rate_percent: number;
  };
  retention_policy: {
    database_retention_days: number;
    files_retention_days: number;
    configuration_retention_days: number;
  };
}

// /api/infrastructure/disaster-recovery - POST
interface DisasterRecoveryRequest {
  recovery_type: 'point_in_time' | 'backup_restore' | 'failover';
  target_time?: string; // ISO timestamp for point-in-time recovery
  backup_id?: string; // for backup restore
  recovery_scope: 'full' | 'database_only' | 'files_only';
  dry_run?: boolean;
}

interface DisasterRecoveryResponse {
  recovery_id: string;
  recovery_plan: {
    estimated_duration_minutes: number;
    steps: Array<{
      step_name: string;
      estimated_duration_minutes: number;
      dependencies: string[];
    }>;
    data_loss_risk: 'none' | 'minimal' | 'moderate' | 'significant';
  };
  rollback_available: boolean;
  contact_support: boolean;
}
```

## Frontend Components

### Infrastructure Dashboard

```typescript
// components/admin/InfrastructureDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InfrastructureDashboardProps {
  refreshInterval?: number;
}

export function InfrastructureDashboard({ refreshInterval = 30000 }: InfrastructureDashboardProps) {
  const [healthData, setHealthData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInfrastructureData = async () => {
    try {
      const [healthResponse, alertsResponse, metricsResponse] = await Promise.all([
        fetch('/api/infrastructure/health'),
        fetch('/api/infrastructure/alerts'),
        fetch('/api/infrastructure/metrics?interval=1h&start_time=' + new Date(Date.now() - 24*60*60*1000).toISOString())
      ]);

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setHealthData(health);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.active_alerts || []);
      }

      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        setMetricsData(metrics.metrics || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch infrastructure data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfrastructureData();
    const interval = setInterval(fetchInfrastructureData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      case 'offline': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with overall status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(healthData?.overall_status || 'unknown')}>
            {healthData?.overall_status || 'Unknown'}
          </Badge>
          <Button onClick={fetchInfrastructureData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical alerts */}
      {alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="font-semibold mb-2">Critical Alerts Requiring Immediate Attention:</div>
            {alerts.filter(alert => alert.severity === 'critical').map(alert => (
              <div key={alert.id} className="mb-1">
                • {alert.alert_title} ({alert.service_name})
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Service health cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {healthData && Object.entries(healthData.services).map(([serviceName, serviceData]: [string, any]) => (
          <Card key={serviceName}>
            <CardHeader>
              <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                {serviceName.replace('_', ' ')}
                <Badge className={getStatusColor(serviceData.status)}>
                  {serviceData.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Response Time:</span>
                  <span className="font-mono">{serviceData.response_time_ms}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Error Rate:</span>
                  <span className="font-mono">{serviceData.error_rate_percent.toFixed(2)}%</span>
                </div>
                {serviceData.region_status && (
                  <div className="text-xs text-muted-foreground">
                    Regions: {Object.keys(serviceData.region_status).length} active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance metrics */}
      {healthData?.performance_metrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Global Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData.performance_metrics.global_response_time_ms}ms
              </div>
              <p className="text-xs text-muted-foreground">Average across all regions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData.performance_metrics.error_rate_percent.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData.performance_metrics.uptime_percent.toFixed(3)}%
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData.performance_metrics.active_users.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="deployments">Recent Deployments</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No active alerts</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{alert.alert_title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {alert.service_name}
                        </span>
                      </div>
                    </div>
                    <CardDescription>
                      Active for {alert.duration_minutes} minutes
                    </CardDescription>
                  </CardHeader>
                  {alert.current_metric_value && (
                    <CardContent>
                      <div className="text-sm">
                        Current value: <span className="font-mono">{alert.current_metric_value}</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="metrics" className="space-y-4">
          {metricsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend (24 hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData.filter(m => m.metric_type === 'response_time_ms')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="deployments" className="space-y-4">
          {healthData?.recent_deployments && (
            <div className="space-y-4">
              {healthData.recent_deployments.map((deployment: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {deployment.environment}
                      </CardTitle>
                      <Badge variant={deployment.status === 'success' ? 'default' : 'destructive'}>
                        {deployment.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Branch: {deployment.git_branch} • 
                      Deployed: {new Date(deployment.deployed_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Cost analysis dashboard would be implemented here with charts showing:
              </p>
              <ul className="mt-4 text-left space-y-2 max-w-md mx-auto">
                <li>• Monthly cost breakdown by service</li>
                <li>• Cost per user trends</li>
                <li>• Optimization recommendations</li>
                <li>• Budget alerts and forecasts</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Cost Monitoring Component

```typescript
// components/admin/CostMonitoringDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function CostMonitoringDashboard() {
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCostData = async () => {
      try {
        const response = await fetch('/api/infrastructure/costs');
        if (response.ok) {
          const data = await response.json();
          setCostData(data);
        }
      } catch (error) {
        console.error('Failed to fetch cost data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCostData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <Alert>
        <AlertDescription>
          Cost data is not available. Please check your billing integration.
        </AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cost Monitoring</h2>
        <p className="text-muted-foreground">
          Track infrastructure costs and optimization opportunities
        </p>
      </div>

      {/* Current month overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costData.current_month.total_cost_usd.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Actual spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Projected Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costData.current_month.projected_monthly_cost_usd.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">End of month projection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costData.trends.cost_growth_percent_mom > 0 ? '+' : ''}
              {costData.trends.cost_growth_percent_mom.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Month over month</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Current month spending by service</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costData.current_month.cost_breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost_usd"
                  nameKey="service_provider"
                >
                  {costData.current_month.cost_breakdown.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Efficiency Metrics</CardTitle>
            <CardDescription>Cost per unit metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per Active User</span>
              <span className="font-mono text-sm">
                ${costData.trends.efficiency_metrics.cost_per_active_user.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per API Request</span>
              <span className="font-mono text-sm">
                ${(costData.trends.efficiency_metrics.cost_per_api_request * 1000).toFixed(3)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per GB Storage</span>
              <span className="font-mono text-sm">
                ${costData.trends.efficiency_metrics.cost_per_gb_storage.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Recommendations</CardTitle>
          <CardDescription>Potential cost savings opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costData.optimization_recommendations.map((rec: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{rec.service}</div>
                  <div className="text-sm text-muted-foreground">{rec.recommendation}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rec.effort_level === 'low' ? 'default' : rec.effort_level === 'medium' ? 'secondary' : 'outline'}>
                    {rec.effort_level} effort
                  </Badge>
                  <span className="font-mono text-sm font-medium">
                    ${rec.potential_savings_usd}/month
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Integration Requirements

### MCP Server Usage

This feature requires extensive MCP server integration for comprehensive infrastructure management:

#### Vercel MCP Server
```typescript
// Deploy and manage Vercel applications
await mcp_vercel.deploy({
  projectId: 'wedsync-app',
  gitBranch: 'main',
  environment: 'production'
});

// Get deployment status and metrics
const deploymentStats = await mcp_vercel.getDeployments({
  projectId: 'wedsync-app',
  limit: 10
});

// Configure custom domains and SSL
await mcp_vercel.addDomain({
  projectId: 'wedsync-app',
  domain: 'wedsync.app'
});
```

#### Supabase MCP Server
```typescript
// Monitor database performance and health
const dbMetrics = await mcp_supabase.execute_sql(`
  SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as changes_per_hour,
    n_dead_tup,
    last_vacuum,
    last_analyze
  FROM pg_stat_user_tables 
  ORDER BY changes_per_hour DESC;
`);

// Manage backups and recovery
const backupStatus = await mcp_supabase.createBackup({
  type: 'full',
  retentionDays: 30
});

// Get real-time connection metrics
const connectionStats = await mcp_supabase.execute_sql(`
  SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
  FROM pg_stat_activity;
`);
```

#### Context7 MCP Server
```typescript
// Get latest infrastructure patterns and best practices
const vercelDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '/vercel/vercel',
  topic: 'deployment optimization'
});

// Get monitoring and observability patterns
const sentryDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '@sentry/nextjs',
  topic: 'performance monitoring'
});

// Get cost optimization strategies
const awsDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '/aws/aws-sdk',
  topic: 'cost optimization'
});
```

#### GitHub MCP Server
```typescript
// Automate deployment workflows
await mcp_github.runWorkflow({
  owner: 'wedsync',
  repo: 'platform',
  workflowId: 'deploy-production.yml',
  ref: 'main'
});

// Monitor deployment status
const workflowRuns = await mcp_github.listWorkflowRuns({
  owner: 'wedsync',
  repo: 'platform',
  workflowId: 'deploy-production.yml'
});

// Create deployment notifications
await mcp_github.createIssue({
  owner: 'wedsync',
  repo: 'platform',
  title: 'Production Deployment Failed',
  body: 'Deployment failed with error...',
  labels: ['deployment', 'critical']
});
```

#### Slack MCP Server
```typescript
// Send infrastructure alerts to team
await mcp_slack.sendMessage({
  channel: '#ops-alerts',
  message: '🚨 Critical Alert: Response time degradation detected',
  attachments: [{
    color: 'danger',
    fields: [{
      title: 'Current Response Time',
      value: '3.2 seconds',
      short: true
    }, {
      title: 'Threshold',
      value: '2.0 seconds',
      short: true
    }]
  }]
});

// Send deployment notifications
await mcp_slack.sendMessage({
  channel: '#deployments',
  message: '✅ Production deployment completed successfully',
  attachments: [{
    color: 'good',
    fields: [{
      title: 'Environment',
      value: 'production',
      short: true
    }, {
      title: 'Version',
      value: 'v1.2.3',
      short: true
    }]
  }]
});
```

## Technical Specifications

### Infrastructure Architecture

```typescript
interface InfrastructureArchitecture {
  deployment_strategy: {
    platform: 'vercel';
    regions: ['us-east-1', 'eu-west-1'];
    cdn: 'vercel_edge_network';
    auto_scaling: true;
  };
  
  database_architecture: {
    primary: 'supabase_postgresql';
    connection_pooling: 'pgbouncer';
    read_replicas: 'auto_scaling';
    backup_strategy: 'automated_daily_pitr';
  };
  
  monitoring_stack: {
    error_tracking: 'sentry';
    performance: 'vercel_analytics';
    uptime: 'better_uptime';
    logging: 'structured_json';
  };
  
  security_measures: {
    ssl_tls: 'automatic_lets_encrypt';
    ddos_protection: 'vercel_built_in';
    waf: 'security_headers';
    compliance: ['soc2', 'gdpr'];
  };
}
```

### Performance Targets

```typescript
interface InfrastructurePerformanceTargets {
  availability: {
    uptime_sla: 99.9; // 99.9%
    planned_maintenance_window: 4; // hours per month
    unplanned_downtime_max: 8.76; // hours per year
  };
  
  performance: {
    global_response_time: {
      p50: 500; // 500ms
      p95: 2000; // 2 seconds
      p99: 5000; // 5 seconds
    };
    cdn_performance: {
      cache_hit_rate: 95; // 95%
      edge_response_time: 50; // 50ms
    };
    database_performance: {
      query_response_time_p95: 200; // 200ms
      connection_pool_utilization: 80; // 80% max
    };
  };
  
  scalability: {
    concurrent_users: 50000;
    requests_per_second: 5000;
    data_storage_growth: '100GB/month';
    bandwidth_capacity: '10TB/month';
  };
}
```

### Cost Optimization Strategy

```typescript
interface CostOptimizationStrategy {
  cost_phases: {
    phase_1: {
      user_range: '0-1000';
      monthly_budget: 500;
      services: ['vercel_pro', 'supabase_pro'];
    };
    phase_2: {
      user_range: '1000-5000';
      monthly_budget: 2000;
      services: ['vercel_pro', 'supabase_team', 'redis_cloud'];
    };
    phase_3: {
      user_range: '5000-20000';
      monthly_budget: 10000;
      services: ['vercel_enterprise', 'supabase_business'];
    };
  };
  
  optimization_triggers: {
    cost_per_user_threshold: 2.0; // $2.00 per active user
    cost_growth_rate_threshold: 50; // 50% month-over-month
    resource_utilization_threshold: 85; // 85% utilization
  };
  
  cost_controls: {
    spending_alerts: ['50%', '80%', '100%'];
    auto_scaling_limits: true;
    resource_right_sizing: 'weekly_review';
    unused_resource_cleanup: 'automated';
  };
}
```

## Testing Requirements

### Unit Tests
```typescript
// Infrastructure monitoring tests
describe('InfrastructureMonitoring', () => {
  test('should detect service health degradation', async () => {
    const monitor = new InfrastructureMonitor();
    
    // Simulate degraded service response times
    mockServiceResponse('api', { response_time: 3000, status: 'degraded' });
    
    const healthCheck = await monitor.checkServiceHealth('api');
    
    expect(healthCheck.status).toBe('degraded');
    expect(healthCheck.alerts_triggered).toContain('response_time_degradation');
  });

  test('should calculate cost efficiency metrics correctly', async () => {
    const costAnalyzer = new CostAnalyzer();
    
    const metrics = await costAnalyzer.calculateEfficiencyMetrics({
      total_cost: 1000,
      active_users: 500,
      api_requests: 100000,
      storage_gb: 50
    });
    
    expect(metrics.cost_per_user).toBe(2.0);
    expect(metrics.cost_per_api_request).toBe(0.01);
    expect(metrics.cost_per_gb_storage).toBe(20.0);
  });

  test('should trigger scaling events based on thresholds', async () => {
    const scaler = new AutoScaler();
    
    // Simulate high resource utilization
    mockResourceMetrics({
      cpu_utilization: 85,
      memory_utilization: 90,
      connection_pool_utilization: 75
    });
    
    const scalingDecision = await scaler.evaluateScalingNeed();
    
    expect(scalingDecision.action).toBe('scale_up');
    expect(scalingDecision.reason).toContain('memory_threshold_exceeded');
  });
});
```

### Integration Tests
```typescript
// Full infrastructure deployment tests
describe('Infrastructure Deployment', () => {
  test('should deploy to production with zero downtime', async () => {
    const deployer = new ProductionDeployer();
    const startTime = Date.now();
    
    // Monitor service availability during deployment
    const availabilityMonitor = new AvailabilityMonitor();
    availabilityMonitor.start();
    
    const deployment = await deployer.deployToProduction({
      version: 'v1.2.3',
      strategy: 'blue_green'
    });
    
    const deploymentTime = Date.now() - startTime;
    const downtimeSeconds = availabilityMonitor.getTotalDowntime();
    
    expect(deployment.status).toBe('success');
    expect(downtimeSeconds).toBeLessThan(5); // Less than 5 seconds downtime
    expect(deploymentTime).toBeLessThan(300000); // Less than 5 minutes
  });

  test('should handle database failover correctly', async () => {
    const drManager = new DisasterRecoveryManager();
    
    // Simulate primary database failure
    mockDatabaseFailure('primary');
    
    const failoverResult = await drManager.handleDatabaseFailover();
    
    expect(failoverResult.success).toBe(true);
    expect(failoverResult.recovery_time_seconds).toBeLessThan(120); // 2 minutes
    expect(failoverResult.data_loss).toBe(false);
    
    // Verify application functionality after failover
    const healthCheck = await testApplicationHealth();
    expect(healthCheck.database_connectivity).toBe(true);
    expect(healthCheck.data_integrity).toBe(true);
  });
});
```

### Load Tests
```typescript
// Infrastructure load testing
describe('Infrastructure Load Testing', () => {
  test('should handle peak traffic without degradation', async () => {
    const loadTester = new LoadTester();
    
    const testConfig = {
      concurrent_users: 10000,
      duration_minutes: 30,
      ramp_up_time_minutes: 5,
      user_scenarios: ['signup', 'login', 'form_creation', 'form_submission']
    };
    
    const results = await loadTester.runLoadTest(testConfig);
    
    expect(results.success_rate).toBeGreaterThan(99.5); // 99.5% success rate
    expect(results.avg_response_time_ms).toBeLessThan(2000); // 2 second average
    expect(results.p95_response_time_ms).toBeLessThan(5000); // 5 second P95
    expect(results.errors.database_timeouts).toBe(0);
    expect(results.errors.service_unavailable).toBe(0);
  });

  test('should auto-scale under sustained load', async () => {
    const scaleMonitor = new ScalingMonitor();
    const loadGenerator = new SustainedLoadGenerator();
    
    // Generate 3x normal traffic for 1 hour
    await loadGenerator.start({
      traffic_multiplier: 3,
      duration_minutes: 60
    });
    
    const scalingEvents = await scaleMonitor.getScalingEvents();
    
    expect(scalingEvents.scale_up_events).toBeGreaterThan(0);
    expect(scalingEvents.total_scaling_time_minutes).toBeLessThan(5);
    expect(scalingEvents.scaling_effectiveness).toBeGreaterThan(0.9); // 90% effective
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Multi-region Vercel deployment with automatic scaling
- [ ] Supabase database with automated backups and replication
- [ ] Comprehensive monitoring stack with error tracking and performance metrics
- [ ] Infrastructure-as-code configuration with version control
- [ ] Automated deployment pipeline with rollback capabilities
- [ ] Cost monitoring and optimization recommendations
- [ ] Disaster recovery procedures with <2 minute RTO
- [ ] Security hardening with SSL, DDoS protection, and WAF

### Performance Requirements
- [ ] 99.9% uptime SLA with global availability
- [ ] <2 second page load times (P95) from all regions
- [ ] <500ms API response times (P50) globally
- [ ] Support for 50,000+ concurrent users
- [ ] Database query response times <200ms (P95)
- [ ] CDN cache hit rate >95% for static assets
- [ ] Auto-scaling response time <5 minutes

### Cost Requirements
- [ ] Cost-effective scaling from $500 to $10,000/month based on usage
- [ ] Cost per active user remains <$2.00 across all growth phases
- [ ] Automated cost optimization recommendations
- [ ] Monthly cost reports with efficiency metrics
- [ ] Spending alerts at 50%, 80%, and 100% of budget
- [ ] Resource right-sizing automation

### Security Requirements
- [ ] Automatic SSL certificate management with HSTS
- [ ] DDoS protection and rate limiting
- [ ] Security headers and WAF implementation
- [ ] Environment separation (staging/production)
- [ ] Encrypted data at rest and in transit
- [ ] Compliance with SOC2 and GDPR requirements
- [ ] Regular security audits and vulnerability scanning

### Monitoring Requirements
- [ ] Real-time infrastructure health dashboard
- [ ] Proactive alerting with severity-based escalation
- [ ] Structured logging with 30-day retention
- [ ] Performance metrics tracking and trending
- [ ] Automated incident response workflows
- [ ] SLA reporting and availability tracking
- [ ] Cost monitoring and budget alerts

## Implementation Notes

### Phase 1: Core Infrastructure (Week 1)
- Vercel deployment setup with multi-region configuration
- Supabase database configuration with backups
- Basic monitoring with Sentry and Vercel Analytics
- SSL and security hardening implementation

### Phase 2: Advanced Monitoring (Week 2)
- Comprehensive alerting and notification system
- Infrastructure metrics collection and dashboards
- Cost tracking and optimization tools
- Load testing and performance validation

### Phase 3: Automation & Optimization (Week 3)  
- Auto-scaling configuration and testing
- Disaster recovery procedures and testing
- Cost optimization automation
- Documentation and runbook creation

### Critical Dependencies
- Vercel Pro/Enterprise account with multi-region support
- Supabase Pro/Business account with backup features
- Sentry account for error tracking
- Better Uptime or similar service for monitoring
- Slack integration for alerting
- GitHub Actions for deployment automation

## Business Impact

### Direct Value
- **Reliability**: 99.9% uptime ensures customer trust and satisfaction
- **Performance**: <2s load times improve user experience and conversion rates
- **Scalability**: Infrastructure scales from 1K to 100K+ users without manual intervention  
- **Cost Efficiency**: Linear cost scaling maintains healthy unit economics

### Viral Growth Enablement
- **Global Performance**: Fast access worldwide supports international viral spread
- **Reliability**: High uptime ensures viral sharing moments aren't lost to outages
- **Scale Readiness**: Auto-scaling handles viral traffic spikes without degradation
- **Mobile Optimization**: CDN and edge functions enable smooth mobile sharing

### Risk Mitigation
- **Downtime Prevention**: Monitoring and alerting catch issues before user impact
- **Data Protection**: Automated backups prevent catastrophic data loss
- **Security**: DDoS protection and WAF prevent service disruption attacks
- **Cost Control**: Budget alerts and optimization prevent unexpected expenses

### Competitive Advantage
- **Professional Reliability**: 99.9% uptime differentiates from amateur competitors
- **Global Scale**: Multi-region deployment enables international market expansion
- **Cost Leadership**: Optimized infrastructure enables competitive pricing
- **Technical Confidence**: Solid infrastructure allows focus on product innovation

## Effort Estimation

**Total Effort**: 3 weeks (120 hours)

### Team Breakdown:
- **DevOps Engineer**: 2.5 weeks - Infrastructure setup, monitoring, automation
- **Backend Developer**: 1 week - API integrations, monitoring dashboards
- **Frontend Developer**: 0.5 weeks - Admin dashboard components
- **QA Engineer**: 1 week - Load testing, disaster recovery testing

### Critical Path:
1. Vercel and Supabase production setup
2. Monitoring and alerting infrastructure  
3. Backup and disaster recovery procedures
4. Auto-scaling configuration and testing
5. Cost monitoring and optimization tools

**Success Metrics:**
- 99.9% uptime achieved in production
- <2 second page load times globally
- Auto-scaling responds within 5 minutes
- All monitoring and alerting systems operational

---

*This specification establishes the production-ready infrastructure foundation that enables WedSync/WedMe to scale reliably from startup to enterprise while maintaining cost efficiency and exceptional user experience globally.*