-- Client Analytics - Engagement Tracking System
-- Purpose: Track wedding client engagement and detect at-risk couples
-- Feature ID: WS-017

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Client Engagement Events Table
CREATE TABLE IF NOT EXISTS client_engagement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'email_open', 'email_click', 'form_view', 'form_submit', 
    'portal_login', 'portal_view', 'document_download', 'message_sent',
    'call_scheduled', 'meeting_attended', 'payment_made'
  )),
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(client_id, created_at DESC),
  INDEX(supplier_id, created_at DESC),
  INDEX(event_type, created_at DESC)
);

-- Client Engagement Scores Table
CREATE TABLE IF NOT EXISTS client_engagement_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  segment TEXT NOT NULL CHECK (segment IN ('champion', 'highly_engaged', 'normal', 'at_risk', 'ghost')),
  factors JSONB DEFAULT '{}', -- Breakdown of score calculation
  last_activity TIMESTAMP WITH TIME ZONE,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, supplier_id)
);

-- At-Risk Alerts Table  
CREATE TABLE IF NOT EXISTS at_risk_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('going_silent', 'low_engagement', 'missed_milestone')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  recommended_actions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  INDEX(supplier_id, created_at DESC),
  INDEX(client_id, resolved_at)
);

-- Materialized View for Real-Time Dashboard
CREATE MATERIALIZED VIEW client_analytics_dashboard AS
WITH recent_activity AS (
  SELECT 
    client_id,
    supplier_id,
    COUNT(*) as total_events,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    MAX(created_at) as last_activity,
    COUNT(CASE WHEN event_type = 'email_open' THEN 1 END) as email_opens,
    COUNT(CASE WHEN event_type = 'email_click' THEN 1 END) as email_clicks,
    COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as form_submissions,
    COUNT(CASE WHEN event_type = 'portal_login' THEN 1 END) as portal_visits
  FROM client_engagement_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY client_id, supplier_id
),
client_segments AS (
  SELECT 
    client_id,
    supplier_id,
    score,
    segment,
    last_activity
  FROM client_engagement_scores
)
SELECT 
  c.id as client_id,
  c.supplier_id,
  c.name as client_name,
  c.email,
  c.wedding_date,
  COALESCE(cs.score, 0) as engagement_score,
  COALESCE(cs.segment, 'normal') as segment,
  COALESCE(ra.total_events, 0) as total_events_30d,
  COALESCE(ra.active_days, 0) as active_days_30d,
  COALESCE(ra.email_opens, 0) as email_opens_30d,
  COALESCE(ra.email_clicks, 0) as email_clicks_30d,
  COALESCE(ra.form_submissions, 0) as form_submissions_30d,
  COALESCE(ra.portal_visits, 0) as portal_visits_30d,
  COALESCE(cs.last_activity, c.created_at) as last_activity,
  CASE 
    WHEN cs.last_activity < NOW() - INTERVAL '21 days' THEN 'ghost'
    WHEN cs.last_activity < NOW() - INTERVAL '14 days' THEN 'at_risk' 
    WHEN cs.last_activity < NOW() - INTERVAL '7 days' THEN 'needs_attention'
    ELSE 'active'
  END as activity_status,
  (
    SELECT COUNT(*)
    FROM at_risk_alerts ara
    WHERE ara.client_id = c.id 
      AND ara.resolved_at IS NULL
  ) as open_alerts,
  NOW() as last_refreshed
FROM clients c
LEFT JOIN client_segments cs ON c.id = cs.client_id
LEFT JOIN recent_activity ra ON c.id = ra.client_id
WHERE c.status = 'active';

-- Unique index for materialized view
CREATE UNIQUE INDEX idx_client_analytics_dashboard_client ON client_analytics_dashboard(client_id);
CREATE INDEX idx_client_analytics_dashboard_supplier ON client_analytics_dashboard(supplier_id);
CREATE INDEX idx_client_analytics_dashboard_segment ON client_analytics_dashboard(segment);
CREATE INDEX idx_client_analytics_dashboard_activity ON client_analytics_dashboard(activity_status);

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_client_id UUID, p_supplier_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_factors JSONB := '{}';
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_segment TEXT;
  
  -- Activity weights
  v_email_weight INTEGER := 10;
  v_portal_weight INTEGER := 15;
  v_form_weight INTEGER := 20;
  v_communication_weight INTEGER := 25;
  v_meeting_weight INTEGER := 30;
  
  -- Recency decay factors
  v_recency_factor DECIMAL;
  v_days_since_activity INTEGER;
BEGIN
  -- Get last activity
  SELECT MAX(created_at) INTO v_last_activity
  FROM client_engagement_events
  WHERE client_id = p_client_id AND supplier_id = p_supplier_id;
  
  IF v_last_activity IS NULL THEN
    v_last_activity := NOW() - INTERVAL '365 days'; -- Default to very old
  END IF;
  
  v_days_since_activity := EXTRACT(days FROM NOW() - v_last_activity);
  
  -- Calculate recency factor (exponential decay)
  v_recency_factor := GREATEST(0.1, EXP(-v_days_since_activity::DECIMAL / 14)); -- Half-life of 14 days
  
  -- Calculate activity scores for last 30 days
  WITH activity_counts AS (
    SELECT 
      COUNT(CASE WHEN event_type IN ('email_open', 'email_click') THEN 1 END) as email_activity,
      COUNT(CASE WHEN event_type IN ('portal_login', 'portal_view') THEN 1 END) as portal_activity,
      COUNT(CASE WHEN event_type IN ('form_view', 'form_submit') THEN 1 END) as form_activity,
      COUNT(CASE WHEN event_type IN ('message_sent', 'call_scheduled') THEN 1 END) as communication_activity,
      COUNT(CASE WHEN event_type IN ('meeting_attended', 'payment_made') THEN 1 END) as meeting_activity
    FROM client_engagement_events
    WHERE client_id = p_client_id 
      AND supplier_id = p_supplier_id
      AND created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    -- Cap each activity type at reasonable maximums
    LEAST(ac.email_activity * v_email_weight, 100) +
    LEAST(ac.portal_activity * v_portal_weight, 150) +
    LEAST(ac.form_activity * v_form_weight, 200) +
    LEAST(ac.communication_activity * v_communication_weight, 250) +
    LEAST(ac.meeting_activity * v_meeting_weight, 300),
    jsonb_build_object(
      'email_activity', ac.email_activity,
      'portal_activity', ac.portal_activity,
      'form_activity', ac.form_activity,
      'communication_activity', ac.communication_activity,
      'meeting_activity', ac.meeting_activity,
      'recency_factor', v_recency_factor,
      'days_since_activity', v_days_since_activity
    )
  INTO v_score, v_factors
  FROM activity_counts ac;
  
  -- Apply recency decay
  v_score := ROUND(v_score * v_recency_factor);
  
  -- Cap at 100
  v_score := LEAST(v_score, 100);
  
  -- Determine segment
  IF v_score >= 80 THEN
    v_segment := 'champion';
  ELSIF v_score >= 60 THEN
    v_segment := 'highly_engaged';
  ELSIF v_score >= 30 THEN
    v_segment := 'normal';
  ELSIF v_score >= 10 THEN
    v_segment := 'at_risk';
  ELSE
    v_segment := 'ghost';
  END IF;
  
  -- Update engagement scores table
  INSERT INTO client_engagement_scores (
    client_id, supplier_id, score, segment, factors, last_activity
  ) VALUES (
    p_client_id, p_supplier_id, v_score, v_segment, v_factors, v_last_activity
  )
  ON CONFLICT (client_id, supplier_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    segment = EXCLUDED.segment,
    factors = EXCLUDED.factors,
    last_activity = EXCLUDED.last_activity,
    calculated_at = NOW();
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and create at-risk alerts
CREATE OR REPLACE FUNCTION detect_at_risk_clients()
RETURNS INTEGER AS $$
DECLARE
  v_alert_count INTEGER := 0;
  v_client_record RECORD;
BEGIN
  -- Find clients who haven't engaged in 14+ days
  FOR v_client_record IN
    SELECT DISTINCT
      c.id as client_id,
      c.supplier_id,
      c.name,
      c.wedding_date,
      ces.last_activity,
      ces.score,
      ces.segment,
      EXTRACT(days FROM NOW() - ces.last_activity) as days_since_activity
    FROM clients c
    JOIN client_engagement_scores ces ON c.id = ces.client_id
    WHERE ces.last_activity < NOW() - INTERVAL '14 days'
      AND c.status = 'active'
      AND c.wedding_date > NOW() -- Only active weddings
      AND NOT EXISTS (
        SELECT 1 FROM at_risk_alerts ara
        WHERE ara.client_id = c.id
          AND ara.alert_type = 'going_silent'
          AND ara.resolved_at IS NULL
      )
  LOOP
    -- Create alert based on severity
    INSERT INTO at_risk_alerts (
      client_id, supplier_id, alert_type, severity, message, recommended_actions
    ) VALUES (
      v_client_record.client_id,
      v_client_record.supplier_id,
      'going_silent',
      CASE 
        WHEN v_client_record.days_since_activity > 21 THEN 'critical'
        WHEN v_client_record.days_since_activity > 14 THEN 'high'
        ELSE 'medium'
      END,
      FORMAT('%s hasn''t engaged in %s days (%s before wedding)',
        v_client_record.name,
        v_client_record.days_since_activity,
        v_client_record.wedding_date - CURRENT_DATE
      ),
      CASE 
        WHEN v_client_record.days_since_activity > 21 THEN 
          '["Call immediately", "Send personal email", "Schedule meeting"]'
        WHEN v_client_record.days_since_activity > 14 THEN
          '["Send check-in email", "Offer help", "Schedule call"]'
        ELSE
          '["Send friendly reminder", "Share useful content"]'
      END::JSONB
    );
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics dashboard
CREATE OR REPLACE FUNCTION refresh_client_analytics()
RETURNS void AS $$
BEGIN
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY client_analytics_dashboard;
  
  -- Update all engagement scores
  INSERT INTO client_engagement_scores (client_id, supplier_id, score, segment, factors, last_activity)
  SELECT 
    c.id,
    c.supplier_id,
    calculate_engagement_score(c.id, c.supplier_id),
    CASE 
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 80 THEN 'champion'
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 60 THEN 'highly_engaged'
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 30 THEN 'normal'
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 10 THEN 'at_risk'
      ELSE 'ghost'
    END,
    '{}'::JSONB,
    COALESCE((
      SELECT MAX(created_at)
      FROM client_engagement_events
      WHERE client_id = c.id AND supplier_id = c.supplier_id
    ), c.created_at)
  FROM clients c
  WHERE c.status = 'active'
  ON CONFLICT (client_id, supplier_id) DO NOTHING;
  
  -- Detect new at-risk clients
  PERFORM detect_at_risk_clients();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update engagement when events are added
CREATE OR REPLACE FUNCTION update_engagement_on_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate engagement score for this client
  PERFORM calculate_engagement_score(NEW.client_id, NEW.supplier_id);
  
  -- Check if they were at-risk and can be resolved
  UPDATE at_risk_alerts
  SET resolved_at = NOW()
  WHERE client_id = NEW.client_id
    AND resolved_at IS NULL
    AND alert_type = 'going_silent'
    AND NEW.created_at > created_at; -- Only if new activity
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_engagement_trigger ON client_engagement_events;
CREATE TRIGGER update_engagement_trigger
AFTER INSERT ON client_engagement_events
FOR EACH ROW
EXECUTE FUNCTION update_engagement_on_event();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_engagement_events_client_time ON client_engagement_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_supplier_time ON client_engagement_events(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type_time ON client_engagement_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_segment ON client_engagement_scores(segment, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_at_risk_alerts_unresolved ON at_risk_alerts(supplier_id, resolved_at) WHERE resolved_at IS NULL;

-- Grant permissions
GRANT SELECT, INSERT ON client_engagement_events TO authenticated;
GRANT SELECT ON client_engagement_scores TO authenticated;
GRANT SELECT ON at_risk_alerts TO authenticated;
GRANT SELECT ON client_analytics_dashboard TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE client_engagement_events;
ALTER PUBLICATION supabase_realtime ADD TABLE client_engagement_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE at_risk_alerts;

-- Comments for documentation
COMMENT ON TABLE client_engagement_events IS 'Tracks all client engagement activities for scoring';
COMMENT ON TABLE client_engagement_scores IS 'Real-time engagement scores (0-100) and client segments';
COMMENT ON TABLE at_risk_alerts IS 'Automated alerts for clients going silent or at-risk';
COMMENT ON MATERIALIZED VIEW client_analytics_dashboard IS 'Real-time analytics dashboard for client engagement';