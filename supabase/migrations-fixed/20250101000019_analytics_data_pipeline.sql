-- WARNING: This migration references tables that may not exist: journey_canvases
-- Ensure these tables are created first

-- Analytics Data Pipeline Enhancement
-- Purpose: Add real-time metrics aggregation and performance views

-- Journey Metrics Daily Aggregation
CREATE TABLE IF NOT EXISTS journey_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  instances_started INTEGER DEFAULT 0,
  instances_completed INTEGER DEFAULT 0,
  instances_failed INTEGER DEFAULT 0,
  instances_active INTEGER DEFAULT 0,
  avg_completion_time INTERVAL,
  median_completion_time INTERVAL,
  conversion_rate DECIMAL(5,2),
  revenue_attributed DECIMAL(10,2) DEFAULT 0,
  unique_clients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journey_id, date)
);

-- Node Execution Metrics
CREATE TABLE IF NOT EXISTS node_execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL,
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,
  p95_execution_time_ms INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(node_id, journey_id, date)
);

-- Client Engagement Metrics
CREATE TABLE IF NOT EXISTS client_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  form_submissions INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, journey_id)
);

-- High-Performance Materialized View for Dashboard
DROP MATERIALIZED VIEW IF EXISTS journey_performance_summary CASCADE;
CREATE MATERIALIZED VIEW journey_performance_summary AS
WITH journey_stats AS (
  SELECT 
    j.id,
    j.name,
    j.supplier_id,
    j.status,
    COUNT(DISTINCT ji.id) as total_instances,
    COUNT(DISTINCT CASE WHEN ji.status = 'completed' THEN ji.id END) as completed_instances,
    COUNT(DISTINCT CASE WHEN ji.status = 'failed' THEN ji.id END) as failed_instances,
    COUNT(DISTINCT CASE WHEN ji.status IN ('active', 'running') THEN ji.id END) as active_instances,
    COUNT(DISTINCT ji.client_id) as unique_clients,
    AVG(
      CASE 
        WHEN ji.status = 'completed' AND ji.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ji.completed_at - ji.created_at))/3600 
      END
    ) as avg_completion_hours,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY CASE 
        WHEN ji.status = 'completed' AND ji.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ji.completed_at - ji.created_at))/3600 
      END
    ) as median_completion_hours
  FROM journey_canvases j
  LEFT JOIN journey_instances ji ON j.id = ji.journey_id
  WHERE ji.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY j.id, j.name, j.supplier_id, j.status
),
revenue_stats AS (
  SELECT 
    journey_id,
    SUM(revenue_amount) as total_revenue,
    COUNT(DISTINCT client_id) as paying_clients
  FROM journey_revenue_attribution
  WHERE recorded_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY journey_id
)
SELECT 
  js.*,
  CASE 
    WHEN js.total_instances > 0 
    THEN (js.completed_instances::DECIMAL / js.total_instances * 100)
    ELSE 0 
  END as completion_rate,
  COALESCE(rs.total_revenue, 0) as revenue_30d,
  COALESCE(rs.paying_clients, 0) as paying_clients,
  CASE 
    WHEN js.unique_clients > 0 
    THEN COALESCE(rs.total_revenue, 0) / js.unique_clients
    ELSE 0 
  END as revenue_per_client,
  NOW() as last_refreshed
FROM journey_stats js
LEFT JOIN revenue_stats rs ON js.id = rs.journey_id;

-- Create indexes for materialized view
CREATE UNIQUE INDEX idx_journey_performance_summary_id ON journey_performance_summary(id);
CREATE INDEX idx_journey_performance_summary_supplier ON journey_performance_summary(supplier_id);
CREATE INDEX idx_journey_performance_summary_completion ON journey_performance_summary(completion_rate DESC);

-- Real-time Funnel Analysis View
CREATE OR REPLACE VIEW journey_funnel_analysis AS
WITH node_sequence AS (
  SELECT 
    jn.journey_id,
    jn.id as node_id,
    jn.type as node_type,
    jn.config->>'name' as node_name,
    jn.position,
    ROW_NUMBER() OVER (PARTITION BY jn.journey_id ORDER BY jn.position) as sequence_order
  FROM journey_nodes jn
),
node_reach AS (
  SELECT 
    ns.journey_id,
    ns.node_id,
    ns.node_name,
    ns.sequence_order,
    COUNT(DISTINCT ne.instance_id) as instances_reached,
    COUNT(DISTINCT CASE WHEN ne.status = 'completed' THEN ne.instance_id END) as instances_completed
  FROM node_sequence ns
  LEFT JOIN node_executions ne ON ns.node_id = ne.node_id
  GROUP BY ns.journey_id, ns.node_id, ns.node_name, ns.sequence_order
)
SELECT 
  nr.*,
  LAG(nr.instances_reached, 1) OVER (PARTITION BY nr.journey_id ORDER BY nr.sequence_order) as previous_stage_reached,
  CASE 
    WHEN LAG(nr.instances_reached, 1) OVER (PARTITION BY nr.journey_id ORDER BY nr.sequence_order) > 0
    THEN (nr.instances_reached::DECIMAL / LAG(nr.instances_reached, 1) OVER (PARTITION BY nr.journey_id ORDER BY nr.sequence_order) * 100)
    ELSE 100
  END as conversion_from_previous
FROM node_reach nr;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_journey_metrics()
RETURNS void AS $$
BEGIN
  -- Aggregate metrics for yesterday
  INSERT INTO journey_metrics (
    journey_id, date, instances_started, instances_completed, 
    instances_failed, instances_active, avg_completion_time,
    median_completion_time, conversion_rate, revenue_attributed, unique_clients
  )
  SELECT 
    j.id as journey_id,
    CURRENT_DATE - INTERVAL '1 day' as date,
    COUNT(DISTINCT CASE WHEN DATE(ji.created_at) = CURRENT_DATE - INTERVAL '1 day' THEN ji.id END) as instances_started,
    COUNT(DISTINCT CASE WHEN DATE(ji.completed_at) = CURRENT_DATE - INTERVAL '1 day' THEN ji.id END) as instances_completed,
    COUNT(DISTINCT CASE WHEN ji.status = 'failed' AND DATE(ji.updated_at) = CURRENT_DATE - INTERVAL '1 day' THEN ji.id END) as instances_failed,
    COUNT(DISTINCT CASE WHEN ji.status IN ('active', 'running') THEN ji.id END) as instances_active,
    AVG(ji.completed_at - ji.created_at) FILTER (WHERE ji.status = 'completed') as avg_completion_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ji.completed_at - ji.created_at) FILTER (WHERE ji.status = 'completed') as median_completion_time,
    CASE 
      WHEN COUNT(DISTINCT ji.id) > 0 
      THEN (COUNT(DISTINCT CASE WHEN ji.status = 'completed' THEN ji.id END)::DECIMAL / COUNT(DISTINCT ji.id) * 100)
      ELSE 0 
    END as conversion_rate,
    COALESCE(SUM(jra.revenue_amount), 0) as revenue_attributed,
    COUNT(DISTINCT ji.client_id) as unique_clients
  FROM journey_canvases j
  LEFT JOIN journey_instances ji ON j.id = ji.journey_id
  LEFT JOIN journey_revenue_attribution jra ON j.id = jra.journey_id 
    AND DATE(jra.recorded_at) = CURRENT_DATE - INTERVAL '1 day'
  GROUP BY j.id
  ON CONFLICT (journey_id, date) 
  DO UPDATE SET
    instances_started = EXCLUDED.instances_started,
    instances_completed = EXCLUDED.instances_completed,
    instances_failed = EXCLUDED.instances_failed,
    instances_active = EXCLUDED.instances_active,
    avg_completion_time = EXCLUDED.avg_completion_time,
    median_completion_time = EXCLUDED.median_completion_time,
    conversion_rate = EXCLUDED.conversion_rate,
    revenue_attributed = EXCLUDED.revenue_attributed,
    unique_clients = EXCLUDED.unique_clients,
    updated_at = NOW();
    
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY journey_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY journey_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to update real-time metrics on journey instance changes
CREATE OR REPLACE FUNCTION update_analytics_on_instance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update client journey progress
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO client_journey_progress (
      instance_id, client_id, journey_id, current_stage,
      completion_percentage, engagement_level, last_interaction
    ) VALUES (
      NEW.id, NEW.client_id, NEW.journey_id, NEW.current_node_id,
      CASE 
        WHEN NEW.status = 'completed' THEN 100
        WHEN NEW.status = 'failed' THEN 0
        ELSE COALESCE(NEW.progress_percentage, 0)
      END,
      CASE 
        WHEN NEW.progress_percentage >= 75 THEN 'high'
        WHEN NEW.progress_percentage >= 40 THEN 'medium'
        ELSE 'low'
      END,
      NOW()
    )
    ON CONFLICT (instance_id) 
    DO UPDATE SET
      current_stage = EXCLUDED.current_stage,
      completion_percentage = EXCLUDED.completion_percentage,
      engagement_level = EXCLUDED.engagement_level,
      last_interaction = EXCLUDED.last_interaction,
      updated_at = NOW();
  END IF;
  
  -- Update today's metrics cache
  UPDATE journey_analytics 
  SET 
    total_instances = total_instances + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    completed_instances = completed_instances + CASE WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE journey_id = NEW.journey_id 
    AND date = CURRENT_DATE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time updates
DROP TRIGGER IF EXISTS analytics_instance_change_trigger ON journey_instances;
CREATE TRIGGER analytics_instance_change_trigger
AFTER INSERT OR UPDATE ON journey_instances
FOR EACH ROW
EXECUTE FUNCTION update_analytics_on_instance_change();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_journey_metrics_journey_date ON journey_metrics(journey_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_node_execution_metrics_node ON node_execution_metrics(node_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_client_engagement_journey ON client_engagement_metrics(journey_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_journey_instances_analytics ON journey_instances(journey_id, status, created_at);

-- Grant permissions
GRANT SELECT ON journey_metrics TO authenticated;
GRANT SELECT ON node_execution_metrics TO authenticated;
GRANT SELECT ON client_engagement_metrics TO authenticated;
GRANT SELECT ON journey_performance_summary TO authenticated;
GRANT SELECT ON journey_funnel_analysis TO authenticated;

-- Create scheduled job to aggregate metrics (runs daily at 2 AM)
-- This would be set up in Supabase dashboard or via pg_cron
-- SELECT cron.schedule('aggregate-journey-metrics', '0 2 * * *', 'SELECT aggregate_daily_journey_metrics();');

COMMENT ON TABLE journey_metrics IS 'Daily aggregated metrics for journey performance';
COMMENT ON TABLE node_execution_metrics IS 'Daily node-level execution metrics';
COMMENT ON TABLE client_engagement_metrics IS 'Client engagement tracking across journeys';
COMMENT ON MATERIALIZED VIEW journey_performance_summary IS 'High-performance summary for dashboard queries';
COMMENT ON VIEW journey_funnel_analysis IS 'Real-time funnel conversion analysis';