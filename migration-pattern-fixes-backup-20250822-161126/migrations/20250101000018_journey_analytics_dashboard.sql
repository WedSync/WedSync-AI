-- Journey Analytics Dashboard Schema
-- Purpose: Support comprehensive journey performance analytics and real-time monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Journey Performance Analytics
CREATE TABLE IF NOT EXISTS journey_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_instances INTEGER DEFAULT 0,
  completed_instances INTEGER DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  avg_completion_time_hours FLOAT DEFAULT 0,
  revenue_attributed DECIMAL(10,2) DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node Performance Metrics
CREATE TABLE IF NOT EXISTS node_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  node_id UUID NOT NULL,
  node_type TEXT NOT NULL,
  date DATE NOT NULL,
  executions INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,
  conversion_impact FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Journey Progress
CREATE TABLE IF NOT EXISTS client_journey_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES journey_instances(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL,
  completion_percentage FLOAT DEFAULT 0,
  engagement_level TEXT DEFAULT 'low' CHECK (engagement_level IN ('low', 'medium', 'high')),
  last_interaction TIMESTAMP WITH TIME ZONE,
  predicted_completion_date DATE,
  revenue_potential DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue Attribution
CREATE TABLE IF NOT EXISTS journey_revenue_attribution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journey_canvases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  revenue_amount DECIMAL(10,2) NOT NULL,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('subscription', 'service', 'upsell', 'initial')),
  attributed_node_id UUID,
  attribution_percentage FLOAT DEFAULT 100,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes for Fast Analytics
CREATE INDEX IF NOT EXISTS idx_journey_analytics_date_journey ON journey_analytics(date, journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_analytics_supplier ON journey_analytics(supplier_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_node_analytics_performance ON node_analytics(journey_id, node_type, date);
CREATE INDEX IF NOT EXISTS idx_client_progress_engagement ON client_journey_progress(engagement_level, completion_percentage);
CREATE INDEX IF NOT EXISTS idx_client_progress_journey ON client_journey_progress(journey_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_journey ON journey_revenue_attribution(journey_id, recorded_at DESC);

-- Materialized view for real-time dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS journey_dashboard_summary AS
SELECT 
  j.id,
  j.name,
  j.supplier_id,
  COUNT(DISTINCT ji.id) as total_instances,
  COUNT(DISTINCT CASE WHEN ji.status = 'completed' THEN ji.id END) as completed_instances,
  CASE 
    WHEN COUNT(DISTINCT ji.id) > 0 
    THEN COUNT(DISTINCT CASE WHEN ji.status = 'completed' THEN ji.id END)::FLOAT / COUNT(DISTINCT ji.id)::FLOAT 
    ELSE 0 
  END as completion_rate,
  COALESCE(AVG(ja.conversion_rate), 0) as avg_conversion_rate,
  COALESCE(SUM(jra.revenue_amount), 0) as total_revenue,
  COUNT(DISTINCT cjp.client_id) as active_clients,
  COALESCE(AVG(ja.engagement_score), 0) as avg_engagement_score,
  MAX(ji.created_at) as last_instance_created,
  NOW() as last_refreshed
FROM journey_canvases j
LEFT JOIN journey_instances ji ON j.id = ji.journey_id
LEFT JOIN journey_analytics ja ON j.id = ja.journey_id AND ja.date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN journey_revenue_attribution jra ON j.id = jra.journey_id
LEFT JOIN client_journey_progress cjp ON j.id = cjp.journey_id AND cjp.completion_percentage < 100
WHERE j.status = 'active'
GROUP BY j.id, j.name, j.supplier_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_dashboard_summary_id ON journey_dashboard_summary(id);
CREATE INDEX IF NOT EXISTS idx_journey_dashboard_summary_supplier ON journey_dashboard_summary(supplier_id);

-- Function to refresh dashboard data
CREATE OR REPLACE FUNCTION refresh_journey_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY journey_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate journey analytics
CREATE OR REPLACE FUNCTION calculate_journey_analytics(p_journey_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  v_supplier_id UUID;
  v_total_instances INTEGER;
  v_completed_instances INTEGER;
  v_conversion_rate FLOAT;
  v_avg_completion_time FLOAT;
  v_revenue DECIMAL(10,2);
  v_engagement_score FLOAT;
BEGIN
  -- Get supplier ID
  SELECT supplier_id INTO v_supplier_id 
  FROM journey_canvases 
  WHERE id = p_journey_id;
  
  -- Calculate metrics for the journey
  WITH journey_metrics AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      AVG(
        CASE 
          WHEN status = 'completed' 
          THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 
        END
      ) as avg_hours
    FROM journey_instances
    WHERE journey_id = p_journey_id
      AND DATE(created_at) = p_date
  ),
  revenue_metrics AS (
    SELECT COALESCE(SUM(revenue_amount), 0) as total_revenue
    FROM journey_revenue_attribution
    WHERE journey_id = p_journey_id
      AND DATE(recorded_at) = p_date
  ),
  engagement_metrics AS (
    SELECT 
      AVG(
        CASE engagement_level 
          WHEN 'high' THEN 1.0
          WHEN 'medium' THEN 0.6
          WHEN 'low' THEN 0.3
          ELSE 0
        END
      ) as engagement
    FROM client_journey_progress
    WHERE journey_id = p_journey_id
  )
  SELECT 
    jm.total,
    jm.completed,
    CASE WHEN jm.total > 0 THEN jm.completed::FLOAT / jm.total::FLOAT ELSE 0 END,
    COALESCE(jm.avg_hours, 0),
    rm.total_revenue,
    COALESCE(em.engagement, 0)
  INTO 
    v_total_instances,
    v_completed_instances,
    v_conversion_rate,
    v_avg_completion_time,
    v_revenue,
    v_engagement_score
  FROM journey_metrics jm
  CROSS JOIN revenue_metrics rm
  CROSS JOIN engagement_metrics em;
  
  -- Insert or update analytics record
  INSERT INTO journey_analytics (
    journey_id, supplier_id, date, total_instances, completed_instances,
    conversion_rate, avg_completion_time_hours, revenue_attributed, engagement_score
  ) VALUES (
    p_journey_id, v_supplier_id, p_date, v_total_instances, v_completed_instances,
    v_conversion_rate, v_avg_completion_time, v_revenue, v_engagement_score
  )
  ON CONFLICT (journey_id, date) 
  DO UPDATE SET
    total_instances = EXCLUDED.total_instances,
    completed_instances = EXCLUDED.completed_instances,
    conversion_rate = EXCLUDED.conversion_rate,
    avg_completion_time_hours = EXCLUDED.avg_completion_time_hours,
    revenue_attributed = EXCLUDED.revenue_attributed,
    engagement_score = EXCLUDED.engagement_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update client journey progress
CREATE OR REPLACE FUNCTION update_client_journey_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert client journey progress
  INSERT INTO client_journey_progress (
    instance_id,
    client_id,
    journey_id,
    current_stage,
    completion_percentage,
    last_interaction,
    updated_at
  )
  SELECT 
    NEW.id,
    NEW.client_id,
    NEW.journey_id,
    NEW.current_node_id,
    CASE 
      WHEN NEW.status = 'completed' THEN 100
      WHEN NEW.status = 'failed' THEN 0
      ELSE COALESCE(
        (
          SELECT COUNT(DISTINCT ne.node_id)::FLOAT / NULLIF(COUNT(DISTINCT jn.id)::FLOAT, 0) * 100
          FROM node_executions ne
          JOIN journey_nodes jn ON jn.journey_id = NEW.journey_id
          WHERE ne.instance_id = NEW.id
        ), 0
      )
    END,
    NOW(),
    NOW()
  ON CONFLICT (instance_id) 
  DO UPDATE SET
    current_stage = EXCLUDED.current_stage,
    completion_percentage = EXCLUDED.completion_percentage,
    last_interaction = EXCLUDED.last_interaction,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for journey instance updates
DROP TRIGGER IF EXISTS update_journey_progress_trigger ON journey_instances;
CREATE TRIGGER update_journey_progress_trigger
AFTER INSERT OR UPDATE ON journey_instances
FOR EACH ROW
EXECUTE FUNCTION update_client_journey_progress();

-- Add unique constraint for analytics
ALTER TABLE journey_analytics 
ADD CONSTRAINT unique_journey_analytics_date UNIQUE (journey_id, date);

-- Grant permissions
GRANT SELECT ON journey_analytics TO authenticated;
GRANT SELECT ON node_analytics TO authenticated;
GRANT SELECT ON client_journey_progress TO authenticated;
GRANT SELECT ON journey_revenue_attribution TO authenticated;
GRANT SELECT ON journey_dashboard_summary TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE journey_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE client_journey_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE node_executions;

-- Create scheduled job to refresh dashboard (if pg_cron is available)
-- This should be run every 5 minutes for near real-time updates
-- SELECT cron.schedule('refresh-journey-dashboard', '*/5 * * * *', 'SELECT refresh_journey_dashboard();');

COMMENT ON TABLE journey_analytics IS 'Aggregated journey performance metrics for analytics dashboard';
COMMENT ON TABLE node_analytics IS 'Node-level performance metrics for journey optimization';
COMMENT ON TABLE client_journey_progress IS 'Real-time client progress tracking through journeys';
COMMENT ON TABLE journey_revenue_attribution IS 'Revenue attribution to specific journeys and nodes';
COMMENT ON MATERIALIZED VIEW journey_dashboard_summary IS 'Pre-computed dashboard summary for fast loading';