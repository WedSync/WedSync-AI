# WS-257: Cloud Infrastructure Management System - Team C (Database Schema & Integration)

## 🎯 Team C Focus: Database Schema Design & Multi-Cloud Integration

### 📋 Your Assignment
Design and implement the comprehensive database schema and integration layer for the Cloud Infrastructure Management System, ensuring efficient storage of multi-cloud resource data, cost tracking, disaster recovery configurations, and real-time monitoring metrics.

### 🎪 Wedding Industry Context
Wedding suppliers require infrastructure that spans multiple cloud providers to ensure geographic redundancy and cost optimization. The database must efficiently track resources across AWS, Azure, Google Cloud, and other providers while maintaining real-time visibility into costs, performance metrics, and disaster recovery status. During peak wedding seasons, the system must handle rapid scaling across providers without data consistency issues or performance degradation.

### 🎯 Specific Requirements

#### Core Database Schema (MUST IMPLEMENT)

1. **Cloud Provider Management Schema**
   ```sql
   -- Cloud provider configurations and credentials
   CREATE TABLE cloud_providers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     provider_name VARCHAR(50) NOT NULL CHECK (provider_name IN ('aws', 'azure', 'gcp', 'digitalocean', 'linode', 'vultr')),
     provider_type VARCHAR(30) NOT NULL CHECK (provider_type IN ('primary', 'secondary', 'backup', 'edge', 'development')),
     display_name VARCHAR(200) NOT NULL,
     description TEXT,
     regions JSONB NOT NULL DEFAULT '[]', -- Available regions for this provider
     credentials_config JSONB NOT NULL, -- Encrypted credentials
     capabilities JSONB NOT NULL DEFAULT '{
       "compute": true,
       "storage": true,
       "database": true,
       "networking": true,
       "monitoring": true,
       "cdn": false,
       "serverless": false,
       "kubernetes": false
     }',
     quota_limits JSONB DEFAULT '{}', -- Provider-specific quotas
     cost_budget DECIMAL(12,2), -- Monthly budget limit
     billing_account_id VARCHAR(255), -- Provider billing account
     is_active BOOLEAN DEFAULT true,
     health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'critical', 'unknown')),
     last_health_check TIMESTAMP WITH TIME ZONE,
     last_sync_at TIMESTAMP WITH TIME ZONE,
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(organization_id, provider_name)
   );

   -- Cloud regions and availability zones
   CREATE TABLE cloud_regions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     provider_id UUID NOT NULL REFERENCES cloud_providers(id),
     region_code VARCHAR(50) NOT NULL,
     region_name VARCHAR(200) NOT NULL,
     geographic_location JSONB NOT NULL DEFAULT '{
       "continent": "",
       "country": "",
       "city": "",
       "coordinates": {"lat": 0, "lng": 0}
     }',
     availability_zones JSONB DEFAULT '[]',
     services_available JSONB DEFAULT '[]',
     pricing_tier VARCHAR(50) DEFAULT 'standard',
     compliance_certifications JSONB DEFAULT '[]',
     network_latency JSONB DEFAULT '{}', -- Latency to other regions
     is_active BOOLEAN DEFAULT true,
     capacity_status VARCHAR(20) DEFAULT 'available' CHECK (capacity_status IN ('available', 'limited', 'unavailable')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(provider_id, region_code)
   );

   -- Cloud services catalog
   CREATE TABLE cloud_services (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     provider_id UUID NOT NULL REFERENCES cloud_providers(id),
     service_name VARCHAR(100) NOT NULL,
     service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('compute', 'storage', 'database', 'network', 'analytics', 'ai_ml')),
     service_category VARCHAR(100),
     pricing_model VARCHAR(30) DEFAULT 'pay_per_use' CHECK (pricing_model IN ('pay_per_use', 'reserved', 'spot', 'subscription')),
     base_cost DECIMAL(10,4),
     cost_unit VARCHAR(20), -- per hour, per GB, per request, etc.
     supported_regions JSONB DEFAULT '[]',
     configuration_options JSONB DEFAULT '{}',
     is_available BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Cloud Resource Management Schema**
   ```sql
   -- Main cloud resources table
   CREATE TABLE cloud_resources (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     provider_id UUID NOT NULL REFERENCES cloud_providers(id),
     region_id UUID NOT NULL REFERENCES cloud_regions(id),
     resource_id VARCHAR(200) NOT NULL, -- Provider-specific resource ID
     resource_name VARCHAR(200) NOT NULL,
     resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('compute', 'storage', 'database', 'network', 'load_balancer', 'cdn', 'analytics')),
     resource_subtype VARCHAR(100), -- ec2_instance, s3_bucket, rds_mysql, etc.
     size_category VARCHAR(20) DEFAULT 'small' CHECK (size_category IN ('nano', 'micro', 'small', 'medium', 'large', 'xlarge', 'custom')),
     configuration JSONB NOT NULL,
     resource_status VARCHAR(20) DEFAULT 'provisioning' CHECK (resource_status IN ('provisioning', 'running', 'stopped', 'stopping', 'starting', 'error', 'terminated')),
     health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'critical', 'unknown')),
     cost_tracking JSONB DEFAULT '{
       "hourly_cost": 0,
       "daily_cost": 0,
       "monthly_cost": 0,
       "total_cost": 0,
       "currency": "USD",
       "last_updated": null
     }',
     performance_metrics JSONB DEFAULT '{}',
     tags JSONB DEFAULT '{}',
     deployment_id UUID, -- Reference to deployment that created this
     environment VARCHAR(50) DEFAULT 'development' CHECK (environment IN ('development', 'testing', 'staging', 'production')),
     is_wedding_critical BOOLEAN DEFAULT false, -- Critical for wedding operations
     auto_scaling_enabled BOOLEAN DEFAULT false,
     backup_enabled BOOLEAN DEFAULT false,
     monitoring_enabled BOOLEAN DEFAULT true,
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     terminated_at TIMESTAMP WITH TIME ZONE,
     INDEX idx_cloud_resources_provider_region (provider_id, region_id),
     INDEX idx_cloud_resources_status (resource_status),
     INDEX idx_cloud_resources_type (resource_type),
     INDEX idx_cloud_resources_org_env (organization_id, environment),
     INDEX idx_cloud_resources_wedding_critical (is_wedding_critical, resource_status)
   );

   -- Resource scaling history
   CREATE TABLE resource_scaling_history (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     resource_id UUID NOT NULL REFERENCES cloud_resources(id),
     scaling_action VARCHAR(20) NOT NULL CHECK (scaling_action IN ('scale_up', 'scale_down', 'scale_out', 'scale_in')),
     previous_configuration JSONB NOT NULL,
     new_configuration JSONB NOT NULL,
     scaling_trigger VARCHAR(50) NOT NULL CHECK (scaling_trigger IN ('manual', 'auto_cpu', 'auto_memory', 'auto_requests', 'scheduled')),
     scaling_reason TEXT,
     cost_impact DECIMAL(10,2),
     performance_impact JSONB DEFAULT '{}',
     scaling_duration_seconds INTEGER,
     triggered_by UUID REFERENCES user_profiles(id),
     triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     success BOOLEAN DEFAULT true,
     error_message TEXT
   );

   -- Resource dependencies and relationships
   CREATE TABLE resource_dependencies (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     parent_resource_id UUID NOT NULL REFERENCES cloud_resources(id),
     dependent_resource_id UUID NOT NULL REFERENCES cloud_resources(id),
     dependency_type VARCHAR(30) NOT NULL CHECK (dependency_type IN ('network', 'storage', 'database', 'load_balancer', 'security')),
     dependency_strength VARCHAR(20) DEFAULT 'soft' CHECK (dependency_strength IN ('soft', 'hard', 'critical')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(parent_resource_id, dependent_resource_id)
   );
   ```

3. **Infrastructure Deployment Schema**
   ```sql
   -- Infrastructure templates
   CREATE TABLE infrastructure_templates (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     template_name VARCHAR(200) NOT NULL,
     template_version VARCHAR(20) DEFAULT '1.0.0',
     template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('application', 'database', 'network', 'monitoring', 'security', 'complete_stack')),
     description TEXT,
     infrastructure_code TEXT NOT NULL, -- Terraform, CloudFormation, ARM, etc.
     template_format VARCHAR(30) DEFAULT 'terraform' CHECK (template_format IN ('terraform', 'cloudformation', 'arm', 'gcp_deployment', 'kubernetes')),
     parameters JSONB DEFAULT '{}',
     resource_requirements JSONB DEFAULT '{
       "min_cpu": 1,
       "min_memory_gb": 2,
       "min_storage_gb": 20,
       "network_requirements": []
     }',
     estimated_cost JSONB DEFAULT '{
       "hourly": 0,
       "daily": 0,
       "monthly": 0,
       "currency": "USD"
     }',
     supported_providers JSONB DEFAULT '[]', -- Array of provider names
     supported_regions JSONB DEFAULT '[]',
     compliance_tags JSONB DEFAULT '[]',
     is_wedding_ready BOOLEAN DEFAULT false, -- Optimized for wedding operations
     version_number INTEGER DEFAULT 1,
     is_active BOOLEAN DEFAULT true,
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(organization_id, template_name, template_version)
   );

   -- Infrastructure deployments
   CREATE TABLE infrastructure_deployments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     deployment_name VARCHAR(200) NOT NULL,
     deployment_type VARCHAR(30) NOT NULL CHECK (deployment_type IN ('development', 'testing', 'staging', 'production', 'disaster_recovery')),
     template_id UUID NOT NULL REFERENCES infrastructure_templates(id),
     target_providers JSONB NOT NULL, -- Array of provider/region configurations
     deployment_parameters JSONB DEFAULT '{}',
     deployment_status VARCHAR(20) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'validating', 'provisioning', 'deployed', 'updating', 'destroying', 'failed', 'rolled_back')),
     deployment_progress JSONB DEFAULT '{
       "current_stage": "",
       "total_stages": 0,
       "completed_stages": 0,
       "estimated_completion": null,
       "stage_details": []
     }',
     resource_inventory JSONB DEFAULT '[]', -- List of created resource IDs
     deployment_logs JSONB DEFAULT '[]',
     rollback_config JSONB DEFAULT '{
       "enabled": true,
       "snapshot_before": true,
       "max_rollback_time": "1h",
       "retain_data": true
     }',
     cost_estimate JSONB DEFAULT '{}',
     actual_costs JSONB DEFAULT '{}',
     performance_targets JSONB DEFAULT '{}',
     compliance_requirements JSONB DEFAULT '[]',
     wedding_day_ready BOOLEAN DEFAULT false,
     deployed_at TIMESTAMP WITH TIME ZONE,
     deployment_duration_seconds INTEGER,
     health_check_passed BOOLEAN,
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     INDEX idx_deployments_org_status (organization_id, deployment_status),
     INDEX idx_deployments_wedding_ready (wedding_day_ready, deployment_status)
   );
   ```

4. **Cost Management & Optimization Schema**
   ```sql
   -- Cost tracking and analysis
   CREATE TABLE cloud_costs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     provider_id UUID REFERENCES cloud_providers(id),
     resource_id UUID REFERENCES cloud_resources(id),
     cost_period_start DATE NOT NULL,
     cost_period_end DATE NOT NULL,
     cost_amount DECIMAL(12,2) NOT NULL,
     cost_currency VARCHAR(3) DEFAULT 'USD',
     cost_category VARCHAR(50) NOT NULL CHECK (cost_category IN ('compute', 'storage', 'network', 'database', 'monitoring', 'support', 'tax')),
     billing_details JSONB DEFAULT '{}',
     usage_metrics JSONB DEFAULT '{}', -- Usage that generated this cost
     cost_allocation_tags JSONB DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     INDEX idx_cloud_costs_org_period (organization_id, cost_period_start, cost_period_end),
     INDEX idx_cloud_costs_provider_period (provider_id, cost_period_start, cost_period_end),
     INDEX idx_cloud_costs_resource (resource_id, cost_period_start)
   );

   -- Cost optimization recommendations
   CREATE TABLE cost_optimization_recommendations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('unused_resources', 'rightsizing', 'reserved_instances', 'spot_instances', 'storage_optimization', 'region_optimization')),
     target_resources JSONB NOT NULL, -- Array of resource IDs or criteria
     optimization_rules JSONB NOT NULL,
     estimated_savings JSONB DEFAULT '{
       "monthly_savings": 0,
       "annual_savings": 0,
       "percentage_savings": 0,
       "currency": "USD"
     }',
     implementation_complexity VARCHAR(20) DEFAULT 'medium' CHECK (implementation_complexity IN ('low', 'medium', 'high')),
     implementation_risk VARCHAR(20) DEFAULT 'low' CHECK (implementation_risk IN ('low', medium', 'high')),
     business_impact VARCHAR(20) DEFAULT 'low' CHECK (business_impact IN ('low', 'medium', 'high')),
     recommendation_status VARCHAR(20) DEFAULT 'identified' CHECK (recommendation_status IN ('identified', 'approved', 'implementing', 'completed', 'rejected', 'expired')),
     recommendation_details TEXT,
     implementation_steps JSONB DEFAULT '[]',
     automated_execution BOOLEAN DEFAULT false,
     scheduled_execution TIMESTAMP WITH TIME ZONE,
     executed_at TIMESTAMP WITH TIME ZONE,
     actual_savings JSONB DEFAULT '{}',
     expires_at TIMESTAMP WITH TIME ZONE,
     created_by UUID REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     INDEX idx_cost_opt_org_status (organization_id, recommendation_status),
     INDEX idx_cost_opt_type (recommendation_type, recommendation_status)
   );

   -- Cost budgets and alerts
   CREATE TABLE cost_budgets (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     budget_name VARCHAR(200) NOT NULL,
     budget_scope VARCHAR(30) NOT NULL CHECK (budget_scope IN ('organization', 'provider', 'environment', 'project', 'resource_type')),
     scope_filters JSONB DEFAULT '{}', -- Filters for budget scope
     budget_amount DECIMAL(12,2) NOT NULL,
     budget_currency VARCHAR(3) DEFAULT 'USD',
     budget_period VARCHAR(20) NOT NULL CHECK (budget_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
     alert_thresholds JSONB DEFAULT '[50, 75, 90, 100]', -- Percentage thresholds
     notification_channels JSONB DEFAULT '["email"]',
     current_spend DECIMAL(12,2) DEFAULT 0,
     forecasted_spend DECIMAL(12,2),
     is_active BOOLEAN DEFAULT true,
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **Disaster Recovery & Backup Schema**
   ```sql
   -- Disaster recovery plans
   CREATE TABLE disaster_recovery_plans (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     plan_name VARCHAR(200) NOT NULL,
     plan_type VARCHAR(30) NOT NULL CHECK (plan_type IN ('backup_restore', 'active_passive', 'active_active', 'pilot_light', 'warm_standby')),
     primary_region_id UUID NOT NULL REFERENCES cloud_regions(id),
     disaster_recovery_regions JSONB NOT NULL, -- Array of DR region configurations
     recovery_objectives JSONB NOT NULL DEFAULT '{
       "rto_minutes": 240,
       "rpo_minutes": 60,
       "availability_target": 99.99,
       "data_retention_days": 30
     }',
     backup_strategy JSONB DEFAULT '{
       "frequency": "daily",
       "retention_days": 30,
       "cross_region": true,
       "encryption": true,
       "compression": true
     }',
     failover_procedures JSONB NOT NULL,
     testing_schedule JSONB DEFAULT '{
       "frequency": "quarterly",
       "last_test": null,
       "next_test": null,
       "test_type": "partial"
     }',
     automated_failover BOOLEAN DEFAULT false,
     cost_overhead DECIMAL(10,2),
     compliance_requirements JSONB DEFAULT '[]',
     wedding_day_priority BOOLEAN DEFAULT false, -- High priority during weddings
     plan_status VARCHAR(20) DEFAULT 'active' CHECK (plan_status IN ('active', 'inactive', 'testing', 'failed_over', 'maintenance')),
     last_tested_at TIMESTAMP WITH TIME ZONE,
     last_failover_at TIMESTAMP WITH TIME ZONE,
     test_success_rate DECIMAL(5,2) DEFAULT 100.00,
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Backup configurations and status
   CREATE TABLE backup_configurations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     dr_plan_id UUID REFERENCES disaster_recovery_plans(id),
     resource_id UUID NOT NULL REFERENCES cloud_resources(id),
     backup_type VARCHAR(30) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential', 'snapshot', 'continuous')),
     backup_frequency VARCHAR(20) NOT NULL CHECK (backup_frequency IN ('continuous', 'hourly', 'daily', 'weekly', 'monthly')),
     backup_schedule JSONB, -- Cron expression or schedule config
     retention_policy JSONB NOT NULL DEFAULT '{
       "daily_retention_days": 7,
       "weekly_retention_weeks": 4,
       "monthly_retention_months": 12,
       "yearly_retention_years": 7
     }',
     backup_destination JSONB NOT NULL, -- Storage location configuration
     encryption_enabled BOOLEAN DEFAULT true,
     compression_enabled BOOLEAN DEFAULT true,
     backup_status VARCHAR(20) DEFAULT 'active' CHECK (backup_status IN ('active', 'paused', 'failed', 'disabled')),
     last_backup_at TIMESTAMP WITH TIME ZONE,
     next_backup_at TIMESTAMP WITH TIME ZONE,
     backup_size_gb DECIMAL(12,3),
     success_rate DECIMAL(5,2) DEFAULT 100.00,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     INDEX idx_backup_config_resource (resource_id, backup_status),
     INDEX idx_backup_config_schedule (next_backup_at, backup_status)
   );

   -- Backup execution logs
   CREATE TABLE backup_executions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     backup_config_id UUID NOT NULL REFERENCES backup_configurations(id),
     execution_status VARCHAR(20) DEFAULT 'in_progress' CHECK (execution_status IN ('in_progress', 'completed', 'failed', 'cancelled')),
     started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     duration_seconds INTEGER,
     backup_size_gb DECIMAL(12,3),
     data_transferred_gb DECIMAL(12,3),
     backup_location TEXT,
     error_message TEXT,
     performance_metrics JSONB DEFAULT '{}'
   );
   ```

6. **Monitoring & Alerting Schema**
   ```sql
   -- Infrastructure monitoring metrics
   CREATE TABLE infrastructure_monitoring (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     resource_id UUID NOT NULL REFERENCES cloud_resources(id),
     monitoring_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     monitoring_type VARCHAR(30) NOT NULL CHECK (monitoring_type IN ('performance', 'availability', 'cost', 'security', 'compliance', 'capacity')),
     metrics JSONB NOT NULL DEFAULT '{
       "cpu_utilization": 0,
       "memory_utilization": 0,
       "disk_utilization": 0,
       "network_in_mbps": 0,
       "network_out_mbps": 0,
       "response_time_ms": 0,
       "error_rate": 0,
       "requests_per_second": 0
     }',
     thresholds JSONB DEFAULT '{
       "warning": {},
       "critical": {}
     }',
     alerts_triggered JSONB DEFAULT '[]',
     anomalies_detected JSONB DEFAULT '[]',
     health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
     compliance_status JSONB DEFAULT '{}',
     INDEX idx_infra_monitoring_resource_time (resource_id, monitoring_timestamp DESC),
     INDEX idx_infra_monitoring_type (monitoring_type, monitoring_timestamp DESC),
     INDEX idx_infra_monitoring_health (health_score, monitoring_timestamp DESC)
   );

   -- Infrastructure alerts and incidents
   CREATE TABLE infrastructure_alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     alert_name VARCHAR(200) NOT NULL,
     alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('resource_health', 'cost_threshold', 'performance_degradation', 'security_incident', 'capacity_planning', 'wedding_day_critical')),
     severity_level VARCHAR(20) DEFAULT 'medium' CHECK (severity_level IN ('info', 'warning', 'critical', 'emergency')),
     resource_id UUID REFERENCES cloud_resources(id),
     provider_id UUID REFERENCES cloud_providers(id),
     alert_conditions JSONB NOT NULL,
     current_values JSONB DEFAULT '{}',
     notification_channels JSONB DEFAULT '["email"]',
     recipient_list JSONB NOT NULL,
     escalation_rules JSONB DEFAULT '{}',
     auto_remediation JSONB DEFAULT '{
       "enabled": false,
       "actions": [],
       "conditions": {}
     }',
     wedding_day_escalation BOOLEAN DEFAULT false,
     triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     acknowledged_at TIMESTAMP WITH TIME ZONE,
     acknowledged_by UUID REFERENCES user_profiles(id),
     resolved_at TIMESTAMP WITH TIME ZONE,
     resolved_by UUID REFERENCES user_profiles(id),
     resolution_notes TEXT,
     alert_status VARCHAR(20) DEFAULT 'active' CHECK (alert_status IN ('active', 'acknowledged', 'resolved', 'suppressed', 'expired')),
     INDEX idx_infra_alerts_org_status (organization_id, alert_status),
     INDEX idx_infra_alerts_severity (severity_level, alert_status),
     INDEX idx_infra_alerts_resource (resource_id, alert_status),
     INDEX idx_infra_alerts_wedding (wedding_day_escalation, alert_status)
   );
   ```

### 🔧 Performance Optimization

#### Specialized Indexes and Query Optimization
```sql
-- Performance indexes for complex queries
CREATE INDEX CONCURRENTLY idx_cloud_resources_cost_tracking ON cloud_resources USING GIN (cost_tracking);
CREATE INDEX CONCURRENTLY idx_cloud_costs_monthly_summary ON cloud_costs (organization_id, EXTRACT(YEAR FROM cost_period_start), EXTRACT(MONTH FROM cost_period_start));
CREATE INDEX CONCURRENTLY idx_monitoring_time_series ON infrastructure_monitoring (resource_id, monitoring_timestamp) WHERE monitoring_timestamp > NOW() - INTERVAL '24 hours';

-- Partitioning for large time-series tables
CREATE TABLE infrastructure_monitoring_y2024 PARTITION OF infrastructure_monitoring
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE infrastructure_monitoring_y2025 PARTITION OF infrastructure_monitoring  
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Materialized views for cost reporting
CREATE MATERIALIZED VIEW monthly_cost_summary AS
SELECT 
  organization_id,
  provider_id,
  DATE_TRUNC('month', cost_period_start) as month,
  cost_category,
  SUM(cost_amount) as total_cost,
  AVG(cost_amount) as avg_cost,
  COUNT(*) as cost_entries
FROM cloud_costs
GROUP BY organization_id, provider_id, DATE_TRUNC('month', cost_period_start), cost_category;

CREATE UNIQUE INDEX ON monthly_cost_summary (organization_id, provider_id, month, cost_category);
```

#### Performance Functions
```sql
-- Optimized function for infrastructure health check
CREATE OR REPLACE FUNCTION get_infrastructure_health_score(org_id UUID, provider_ids UUID[] DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  health_data JSONB;
  total_resources INTEGER;
  healthy_resources INTEGER;
  warning_resources INTEGER;
  critical_resources INTEGER;
  avg_response_time DECIMAL;
BEGIN
  -- Get resource health statistics
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy,
    COUNT(*) FILTER (WHERE health_status = 'warning') as warning,
    COUNT(*) FILTER (WHERE health_status = 'critical') as critical
  INTO total_resources, healthy_resources, warning_resources, critical_resources
  FROM cloud_resources cr
  WHERE cr.organization_id = org_id
    AND cr.resource_status = 'running'
    AND (provider_ids IS NULL OR cr.provider_id = ANY(provider_ids));

  -- Get average response time from recent monitoring data
  SELECT AVG(CAST(metrics->>'response_time_ms' AS DECIMAL))
  INTO avg_response_time
  FROM infrastructure_monitoring im
  JOIN cloud_resources cr ON im.resource_id = cr.id
  WHERE cr.organization_id = org_id
    AND im.monitoring_timestamp > NOW() - INTERVAL '1 hour'
    AND (provider_ids IS NULL OR cr.provider_id = ANY(provider_ids));

  health_data := jsonb_build_object(
    'total_resources', total_resources,
    'healthy_resources', healthy_resources,
    'warning_resources', warning_resources,
    'critical_resources', critical_resources,
    'health_percentage', CASE 
      WHEN total_resources = 0 THEN 100
      ELSE ROUND((healthy_resources::DECIMAL / total_resources) * 100, 2)
    END,
    'avg_response_time_ms', COALESCE(avg_response_time, 0),
    'overall_status', CASE
      WHEN critical_resources > 0 THEN 'critical'
      WHEN warning_resources > 0 THEN 'warning'
      WHEN healthy_resources = total_resources THEN 'healthy'
      ELSE 'unknown'
    END,
    'last_updated', NOW()
  );

  RETURN health_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for cost optimization analysis
CREATE OR REPLACE FUNCTION analyze_cost_optimization(org_id UUID, lookback_days INTEGER DEFAULT 30)
RETURNS TABLE (
  optimization_type VARCHAR(50),
  potential_monthly_savings DECIMAL(12,2),
  affected_resources INTEGER,
  recommendation_details JSONB
) AS $$
BEGIN
  -- Unused resources (no activity in lookback period)
  RETURN QUERY
  SELECT 
    'unused_resources'::VARCHAR(50),
    SUM(CAST(cr.cost_tracking->>'monthly_cost' AS DECIMAL))::DECIMAL(12,2),
    COUNT(*)::INTEGER,
    jsonb_build_object(
      'resources', array_agg(cr.id),
      'description', 'Resources with no activity in the past ' || lookback_days || ' days'
    )
  FROM cloud_resources cr
  LEFT JOIN infrastructure_monitoring im ON cr.id = im.resource_id 
    AND im.monitoring_timestamp > NOW() - INTERVAL '1 day' * lookback_days
  WHERE cr.organization_id = org_id
    AND cr.resource_status = 'running'
    AND im.resource_id IS NULL
  HAVING COUNT(*) > 0;

  -- Oversized resources (low utilization)
  RETURN QUERY
  SELECT 
    'rightsizing'::VARCHAR(50),
    SUM(CAST(cr.cost_tracking->>'monthly_cost' AS DECIMAL) * 0.3)::DECIMAL(12,2), -- Estimated 30% savings
    COUNT(*)::INTEGER,
    jsonb_build_object(
      'resources', array_agg(cr.id),
      'description', 'Resources with consistently low utilization'
    )
  FROM cloud_resources cr
  JOIN (
    SELECT 
      resource_id,
      AVG(CAST(metrics->>'cpu_utilization' AS DECIMAL)) as avg_cpu,
      AVG(CAST(metrics->>'memory_utilization' AS DECIMAL)) as avg_memory
    FROM infrastructure_monitoring
    WHERE monitoring_timestamp > NOW() - INTERVAL '1 day' * lookback_days
    GROUP BY resource_id
    HAVING AVG(CAST(metrics->>'cpu_utilization' AS DECIMAL)) < 20 
       AND AVG(CAST(metrics->>'memory_utilization' AS DECIMAL)) < 30
  ) low_util ON cr.id = low_util.resource_id
  WHERE cr.organization_id = org_id
    AND cr.resource_status = 'running'
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 📊 Real-time Integration Requirements

#### Supabase Real-time Subscriptions
```sql
-- Enable RLS on all cloud infrastructure tables
ALTER TABLE cloud_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_alerts ENABLE ROW LEVEL SECURITY;

-- Organization-based access policies
CREATE POLICY cloud_provider_access ON cloud_providers
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY cloud_resource_access ON cloud_resources
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Real-time triggers for critical events
CREATE OR REPLACE FUNCTION notify_infrastructure_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify on resource status changes
  IF TG_TABLE_NAME = 'cloud_resources' AND OLD.resource_status != NEW.resource_status THEN
    PERFORM pg_notify(
      'infrastructure_change',
      json_build_object(
        'type', 'resource_status_change',
        'resource_id', NEW.id,
        'old_status', OLD.resource_status,
        'new_status', NEW.resource_status,
        'organization_id', NEW.organization_id
      )::text
    );
  END IF;

  -- Notify on new alerts
  IF TG_TABLE_NAME = 'infrastructure_alerts' AND TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'infrastructure_alert',
      json_build_object(
        'type', 'new_alert',
        'alert_id', NEW.id,
        'severity', NEW.severity_level,
        'alert_type', NEW.alert_type,
        'organization_id', NEW.organization_id
      )::text
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER cloud_resources_notify AFTER UPDATE ON cloud_resources
  FOR EACH ROW EXECUTE FUNCTION notify_infrastructure_change();

CREATE TRIGGER infrastructure_alerts_notify AFTER INSERT ON infrastructure_alerts
  FOR EACH ROW EXECUTE FUNCTION notify_infrastructure_change();
```

#### TypeScript Integration Types
```typescript
// Database integration types
export interface CloudResourceRow {
  id: string;
  organization_id: string;
  provider_id: string;
  region_id: string;
  resource_id: string;
  resource_name: string;
  resource_type: 'compute' | 'storage' | 'database' | 'network';
  resource_subtype: string;
  configuration: Record<string, any>;
  resource_status: 'provisioning' | 'running' | 'stopped' | 'error' | 'terminated';
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  cost_tracking: {
    hourly_cost: number;
    daily_cost: number;
    monthly_cost: number;
    total_cost: number;
    currency: string;
    last_updated: string;
  };
  performance_metrics: Record<string, any>;
  tags: Record<string, any>;
  is_wedding_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfrastructureDeploymentRow {
  id: string;
  organization_id: string;
  deployment_name: string;
  deployment_type: 'development' | 'testing' | 'staging' | 'production' | 'disaster_recovery';
  template_id: string;
  target_providers: Array<{
    provider_id: string;
    region_id: string;
    configuration: Record<string, any>;
  }>;
  deployment_status: 'pending' | 'provisioning' | 'deployed' | 'failed';
  deployment_progress: {
    current_stage: string;
    total_stages: number;
    completed_stages: number;
    estimated_completion: string | null;
  };
  wedding_day_ready: boolean;
  created_at: string;
  updated_at: string;
}
```

### 🧪 Testing Requirements
- **Schema Validation**: Verify all constraints, indexes, and relationships work correctly
- **Performance Testing**: Test query performance with 100,000+ resources across multiple providers
- **Real-time Testing**: Validate WebSocket subscriptions and real-time updates
- **Data Integrity**: Test complex multi-table transactions and rollback scenarios
- **Disaster Recovery Testing**: Validate backup and recovery procedures

### 📈 Monitoring & Maintenance
- **Query Performance Monitoring**: Track slow queries and optimize indexes
- **Storage Growth Monitoring**: Monitor table sizes and plan for partitioning
- **Real-time Subscription Health**: Monitor WebSocket connection health
- **Cost Analysis**: Regular analysis of storage and compute costs
- **Backup Verification**: Automated backup testing and validation

### 📚 Documentation Requirements
- Complete database schema documentation with ERDs
- Query optimization guides and performance benchmarks  
- Real-time integration patterns and troubleshooting
- Data retention policies and archival procedures
- Disaster recovery database procedures

### 🎓 Handoff Requirements
Deliver production-ready database schema with comprehensive multi-cloud support, optimized performance, real-time capabilities, and detailed operational documentation. Include migration scripts, backup procedures, and monitoring setup.

---
**Priority Level**: P1 (Critical Infrastructure)  
**Estimated Effort**: 25 days  
**Team Dependencies**: Backend API (Team B), Frontend Components (Team A), Performance Optimization (Team D)  
**Go-Live Target**: Q1 2025  

This database implementation provides WedSync with enterprise-grade multi-cloud infrastructure data management, ensuring efficient storage, retrieval, and real-time monitoring of cloud resources across all providers during peak wedding seasons and critical business operations.