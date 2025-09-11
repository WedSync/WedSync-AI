-- WS-141: Viral Optimization Round 3 - Production Scale Optimization
-- Performance target: 10K+ concurrent users, <200ms response times

-- Create materialized view for viral coefficient caching
CREATE MATERIALIZED VIEW IF NOT EXISTS viral_coefficient_cache AS
SELECT 
  DATE_TRUNC('hour', NOW()) as calculation_time,
  COALESCE(
    ROUND((total_accepted::decimal / NULLIF(users_who_invited, 0)), 3), 
    0
  ) as viral_coefficient,
  users_who_invited,
  total_sent,
  total_accepted,
  ROUND(total_accepted::decimal / NULLIF(total_sent, 0) * 100, 2) as conversion_rate,
  COUNT(DISTINCT CASE WHEN va.actor_type = 'super_connector' THEN va.actor_id END) as super_connectors_active,
  SUM(CASE WHEN va.metadata->>'channel' = 'email' THEN 1 ELSE 0 END) as email_invitations,
  SUM(CASE WHEN va.metadata->>'channel' = 'sms' THEN 1 ELSE 0 END) as sms_invitations,
  SUM(CASE WHEN va.metadata->>'channel' = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp_invitations
FROM (
  SELECT 
    COUNT(DISTINCT actor_id) as users_who_invited,
    COUNT(*) as total_sent,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as total_accepted
  FROM viral_actions va
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND actor_type IN ('supplier', 'couple')
) viral_stats, viral_actions va
WHERE va.created_at >= NOW() - INTERVAL '30 days'
GROUP BY viral_stats.users_who_invited, viral_stats.total_sent, viral_stats.total_accepted;

-- Index for fast refresh
CREATE INDEX IF NOT EXISTS idx_viral_coefficient_cache_time 
  ON viral_coefficient_cache(calculation_time DESC);

-- Super-connector cache for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS super_connectors_cache AS
WITH connector_scores AS (
  SELECT 
    supplier_id,
    COUNT(DISTINCT couple_id) as couple_connections,
    COUNT(CASE WHEN va.status = 'accepted' THEN 1 END) as viral_successes,
    AVG(COALESCE(cs.connection_strength, 0.5)) as avg_strength,
    MAX(va.created_at) as last_activity,
    CASE 
      WHEN MAX(va.created_at) > NOW() - INTERVAL '7 days' THEN 2.0
      WHEN MAX(va.created_at) > NOW() - INTERVAL '30 days' THEN 1.5
      ELSE 1.0
    END as recency_boost
  FROM supplier_couple_connections scc
  LEFT JOIN viral_actions va ON va.actor_id = scc.supplier_id::text
  LEFT JOIN connection_strength cs ON cs.supplier_id = scc.supplier_id 
    AND cs.couple_id = scc.couple_id
  WHERE scc.is_active = true
  GROUP BY scc.supplier_id
)
SELECT 
  supplier_id,
  couple_connections,
  viral_successes,
  ROUND(
    couple_connections * avg_strength * (1 + viral_successes * 0.1) * recency_boost,
    2
  ) as super_connector_score,
  CASE 
    WHEN couple_connections * avg_strength * (1 + viral_successes * 0.1) * recency_boost >= 1000 THEN 'platinum'
    WHEN couple_connections * avg_strength * (1 + viral_successes * 0.1) * recency_boost >= 500 THEN 'gold'
    WHEN couple_connections * avg_strength * (1 + viral_successes * 0.1) * recency_boost >= 200 THEN 'silver'
    ELSE 'bronze'
  END as tier,
  last_activity,
  DATE_TRUNC('day', NOW()) as last_updated
FROM connector_scores
WHERE couple_connections >= 20
ORDER BY super_connector_score DESC
LIMIT 1000;

-- Index for super connector lookups
CREATE INDEX IF NOT EXISTS idx_super_connectors_cache_supplier 
  ON super_connectors_cache(supplier_id);
CREATE INDEX IF NOT EXISTS idx_super_connectors_cache_tier 
  ON super_connectors_cache(tier);

-- Real-time viral events table for streaming
CREATE TABLE IF NOT EXISTS viral_events_stream (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN (
    'invitation_sent', 'invitation_converted', 'super_connector_identified',
    'viral_milestone_reached', 'attribution_tracked', 'reward_earned'
  )),
  actor_id text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('supplier', 'couple', 'super_connector')),
  target_id text,
  metadata jsonb DEFAULT '{}',
  coefficient_impact decimal(10, 4) DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  processed_at timestamptz,
  broadcast_status text DEFAULT 'pending' CHECK (broadcast_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Partitioning for performance at scale
CREATE INDEX IF NOT EXISTS idx_viral_events_stream_created 
  ON viral_events_stream(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_events_stream_status 
  ON viral_events_stream(broadcast_status) 
  WHERE broadcast_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_viral_events_stream_actor 
  ON viral_events_stream(actor_id, actor_type);

-- Attribution tracking table for Team D integration
CREATE TABLE IF NOT EXISTS viral_attribution_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  referrer_id uuid REFERENCES user_profiles(id),
  attribution_chain jsonb DEFAULT '[]', -- Full referral chain
  viral_depth integer DEFAULT 0,
  channel text,
  campaign_id text,
  ab_test_variant text,
  revenue_impact decimal(10, 2) DEFAULT 0,
  conversion_value decimal(10, 2) DEFAULT 0,
  attributed_at timestamptz DEFAULT NOW(),
  marketing_segment text[],
  super_connector_involved boolean DEFAULT false,
  
  -- Indexes for performance
  INDEX idx_attribution_user (user_id),
  INDEX idx_attribution_referrer (referrer_id),
  INDEX idx_attribution_revenue (revenue_impact DESC),
  INDEX idx_attribution_segment (marketing_segment) USING GIN
);

-- Offline sync queue for Team E integration
CREATE TABLE IF NOT EXISTS viral_offline_sync_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'viral_event',
  entity_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'sync')),
  payload jsonb NOT NULL,
  priority integer DEFAULT 2, -- 1 = high (super-connectors), 2 = normal
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  error_message text,
  
  -- Indexes for sync performance
  INDEX idx_offline_sync_priority (priority, created_at),
  INDEX idx_offline_sync_status (synced_at NULLS FIRST)
);

-- Fraud detection and rate limiting
CREATE TABLE IF NOT EXISTS viral_security_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id),
  event_type text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  action_taken text,
  created_at timestamptz DEFAULT NOW(),
  
  -- Indexes for security monitoring
  INDEX idx_security_events_user (user_id, created_at DESC),
  INDEX idx_security_events_severity (severity, created_at DESC),
  INDEX idx_security_events_device (device_fingerprint)
);

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS viral_performance_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  endpoint text,
  value decimal(10, 3),
  unit text DEFAULT 'ms',
  percentile_95 decimal(10, 3),
  percentile_99 decimal(10, 3),
  sample_count integer,
  error_count integer DEFAULT 0,
  measured_at timestamptz DEFAULT NOW(),
  
  -- Indexes for monitoring queries
  INDEX idx_performance_metrics_time (measured_at DESC),
  INDEX idx_performance_metrics_endpoint (endpoint, measured_at DESC)
);

-- Function to refresh viral coefficient cache
CREATE OR REPLACE FUNCTION refresh_viral_coefficient_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY viral_coefficient_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY super_connectors_cache;
  
  -- Log performance metrics
  INSERT INTO viral_performance_metrics (
    metric_name,
    endpoint,
    value,
    unit,
    sample_count
  ) VALUES (
    'cache_refresh',
    'viral_coefficient',
    EXTRACT(EPOCH FROM (clock_timestamp() - NOW())) * 1000,
    'ms',
    1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to process viral event stream
CREATE OR REPLACE FUNCTION process_viral_event_stream()
RETURNS trigger AS $$
DECLARE
  v_coefficient decimal(10, 3);
BEGIN
  -- Calculate coefficient impact
  IF NEW.event_type = 'invitation_sent' THEN
    NEW.coefficient_impact := 0.01; -- Small positive impact
  ELSIF NEW.event_type = 'invitation_converted' THEN
    NEW.coefficient_impact := 0.05; -- Larger positive impact
    
    -- Track attribution
    INSERT INTO viral_attribution_tracking (
      user_id,
      referrer_id,
      channel,
      ab_test_variant,
      super_connector_involved
    ) VALUES (
      NEW.target_id::uuid,
      NEW.actor_id::uuid,
      NEW.metadata->>'channel',
      NEW.metadata->>'templateVariant',
      NEW.actor_type = 'super_connector'
    );
  END IF;
  
  -- Check for milestones
  SELECT viral_coefficient INTO v_coefficient
  FROM viral_coefficient_cache
  ORDER BY calculation_time DESC
  LIMIT 1;
  
  IF v_coefficient >= 1.2 AND NOT EXISTS (
    SELECT 1 FROM viral_events_stream 
    WHERE event_type = 'viral_milestone_reached'
      AND metadata->>'milestone' = 'coefficient_target'
      AND created_at > NOW() - INTERVAL '1 day'
  ) THEN
    INSERT INTO viral_events_stream (
      event_type,
      actor_id,
      actor_type,
      metadata
    ) VALUES (
      'viral_milestone_reached',
      'system',
      'supplier',
      jsonb_build_object('milestone', 'coefficient_target', 'value', v_coefficient)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for viral event processing
CREATE TRIGGER process_viral_events
  BEFORE INSERT ON viral_events_stream
  FOR EACH ROW
  EXECUTE FUNCTION process_viral_event_stream();

-- Function for fraud detection
CREATE OR REPLACE FUNCTION detect_viral_fraud(
  p_user_id uuid,
  p_recipients jsonb,
  p_device_fingerprint text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_suspicious_count integer := 0;
  v_domain_counts jsonb := '{}';
  v_result jsonb;
BEGIN
  -- Check for suspicious patterns
  WITH recipient_analysis AS (
    SELECT 
      r->>'email' as email,
      SPLIT_PART(r->>'email', '@', 2) as domain
    FROM jsonb_array_elements(p_recipients) r
    WHERE r->>'email' IS NOT NULL
  )
  SELECT 
    COUNT(CASE 
      WHEN email ~* '^(test|bot|spam|fake)\d*@' THEN 1 
      WHEN domain ~* '(10minutemail|tempmail|guerrillamail|mailinator)' THEN 1
    END) as suspicious,
    jsonb_object_agg(domain, count(*)) as domains
  INTO v_suspicious_count, v_domain_counts
  FROM recipient_analysis
  GROUP BY domain;
  
  -- Log security event if fraud detected
  IF v_suspicious_count > 0 THEN
    INSERT INTO viral_security_events (
      user_id,
      event_type,
      severity,
      details,
      device_fingerprint
    ) VALUES (
      p_user_id,
      'fraud_attempt',
      'medium',
      jsonb_build_object(
        'suspicious_recipients', v_suspicious_count,
        'domain_distribution', v_domain_counts
      ),
      p_device_fingerprint
    );
  END IF;
  
  v_result := jsonb_build_object(
    'is_valid', v_suspicious_count = 0,
    'suspicious_count', v_suspicious_count,
    'domain_counts', v_domain_counts
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to refresh caches (run via pg_cron or external scheduler)
-- SELECT cron.schedule('refresh-viral-caches', '0 * * * *', 'SELECT refresh_viral_coefficient_cache()');

-- Performance indexes for production scale
CREATE INDEX IF NOT EXISTS idx_viral_actions_composite 
  ON viral_actions(actor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_actions_channel 
  ON viral_actions((metadata->>'channel'), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_actions_ab_test 
  ON viral_actions((metadata->>'abTestId'), status);

-- Grant appropriate permissions
GRANT SELECT ON viral_coefficient_cache TO authenticated;
GRANT SELECT ON super_connectors_cache TO authenticated;
GRANT ALL ON viral_events_stream TO authenticated;
GRANT ALL ON viral_attribution_tracking TO authenticated;
GRANT ALL ON viral_offline_sync_queue TO authenticated;
GRANT SELECT ON viral_performance_metrics TO authenticated;

-- Enable RLS for security
ALTER TABLE viral_events_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_attribution_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_security_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own viral events"
  ON viral_events_stream FOR SELECT
  USING (actor_id = auth.uid()::text OR target_id = auth.uid()::text);

CREATE POLICY "Users can view their attribution data"
  ON viral_attribution_tracking FOR SELECT
  USING (user_id = auth.uid() OR referrer_id = auth.uid());

-- Comment for documentation
COMMENT ON MATERIALIZED VIEW viral_coefficient_cache IS 
  'Production-ready cached viral coefficient calculation, refreshed hourly for 10K+ concurrent users';
COMMENT ON MATERIALIZED VIEW super_connectors_cache IS 
  'High-performance cache of top 1000 super-connectors, optimized for real-time lookups';
COMMENT ON TABLE viral_events_stream IS 
  'Real-time viral event streaming table for Team A dashboard integration';
COMMENT ON TABLE viral_attribution_tracking IS 
  'Attribution tracking for Team D marketing automation integration';
COMMENT ON TABLE viral_offline_sync_queue IS 
  'Offline sync queue for Team E offline functionality integration';