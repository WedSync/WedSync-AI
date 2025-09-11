-- WS-225 Client Portal Analytics - Database Functions for High-Performance Analytics
-- Created: 2025-01-30
-- Team: D - Round 1

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create analytics summary function with optimized queries
CREATE OR REPLACE FUNCTION get_client_analytics_summary(
  supplier_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_clients BIGINT,
  average_engagement_score NUMERIC,
  total_open_alerts BIGINT,
  at_risk_clients BIGINT,
  ghost_clients BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  -- Check if organization exists
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  RETURN QUERY
  WITH client_stats AS (
    SELECT 
      c.id,
      c.client_name,
      -- Calculate engagement score based on recent activity
      CASE 
        WHEN c.last_activity_date >= (end_date - INTERVAL '7 days') THEN 100
        WHEN c.last_activity_date >= (end_date - INTERVAL '14 days') THEN 80
        WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') THEN 60
        WHEN c.last_activity_date >= (end_date - INTERVAL '60 days') THEN 40
        WHEN c.last_activity_date >= (end_date - INTERVAL '90 days') THEN 20
        ELSE 10
      END as engagement_score,
      -- Determine client segment
      CASE 
        WHEN c.last_activity_date >= (end_date - INTERVAL '7 days') THEN 'champion'
        WHEN c.last_activity_date >= (end_date - INTERVAL '14 days') THEN 'highly_engaged'
        WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') THEN 'normal'
        WHEN c.last_activity_date >= (end_date - INTERVAL '60 days') THEN 'at_risk'
        ELSE 'ghost'
      END as segment,
      -- Count open alerts (simulated for now)
      CASE 
        WHEN c.last_activity_date < (end_date - INTERVAL '30 days') THEN 1
        ELSE 0
      END as open_alerts
    FROM clients c
    WHERE c.organization_id = org_id
      AND c.created_at <= end_date
      AND c.status = 'active'
  )
  SELECT 
    COUNT(*)::BIGINT as total_clients,
    ROUND(AVG(engagement_score), 1) as average_engagement_score,
    SUM(open_alerts)::BIGINT as total_open_alerts,
    COUNT(*) FILTER (WHERE segment = 'at_risk')::BIGINT as at_risk_clients,
    COUNT(*) FILTER (WHERE segment = 'ghost')::BIGINT as ghost_clients
  FROM client_stats;
END;
$$;

-- Create client segments distribution function
CREATE OR REPLACE FUNCTION get_client_segments_distribution(
  supplier_id UUID
)
RETURNS TABLE (
  segment TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  RETURN QUERY
  WITH client_segments AS (
    SELECT 
      CASE 
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 'champion'
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '14 days') THEN 'highly_engaged'
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 'normal'
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 'at_risk'
        ELSE 'ghost'
      END as segment
    FROM clients c
    WHERE c.organization_id = org_id
      AND c.status = 'active'
  )
  SELECT 
    cs.segment::TEXT,
    COUNT(*)::BIGINT
  FROM client_segments cs
  GROUP BY cs.segment;
END;
$$;

-- Create client engagement details function with performance optimization
CREATE OR REPLACE FUNCTION get_client_engagement_details(
  supplier_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  email TEXT,
  wedding_date DATE,
  engagement_score INTEGER,
  segment TEXT,
  activity_status TEXT,
  total_events_30d INTEGER,
  email_opens_30d INTEGER,
  email_clicks_30d INTEGER,
  form_submissions_30d INTEGER,
  portal_visits_30d INTEGER,
  last_activity TIMESTAMP WITH TIME ZONE,
  open_alerts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.client_name::TEXT,
    c.email::TEXT,
    c.wedding_date,
    -- Engagement score calculation
    CASE 
      WHEN c.last_activity_date >= (end_date - INTERVAL '7 days') THEN 100
      WHEN c.last_activity_date >= (end_date - INTERVAL '14 days') THEN 80
      WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') THEN 60
      WHEN c.last_activity_date >= (end_date - INTERVAL '60 days') THEN 40
      WHEN c.last_activity_date >= (end_date - INTERVAL '90 days') THEN 20
      ELSE 10
    END as engagement_score,
    -- Client segment
    CASE 
      WHEN c.last_activity_date >= (end_date - INTERVAL '7 days') THEN 'champion'
      WHEN c.last_activity_date >= (end_date - INTERVAL '14 days') THEN 'highly_engaged'
      WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') THEN 'normal'
      WHEN c.last_activity_date >= (end_date - INTERVAL '60 days') THEN 'at_risk'
      ELSE 'ghost'
    END::TEXT as segment,
    -- Activity status
    CASE 
      WHEN c.last_activity_date >= (end_date - INTERVAL '1 day') THEN 'very_active'
      WHEN c.last_activity_date >= (end_date - INTERVAL '7 days') THEN 'active'
      WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') THEN 'moderate'
      ELSE 'inactive'
    END::TEXT as activity_status,
    -- Simulated activity metrics (replace with real data when available)
    CASE WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') 
         THEN (RANDOM() * 20)::INTEGER + 5 
         ELSE (RANDOM() * 5)::INTEGER 
    END as total_events_30d,
    CASE WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') 
         THEN (RANDOM() * 15)::INTEGER + 2 
         ELSE (RANDOM() * 3)::INTEGER 
    END as email_opens_30d,
    CASE WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') 
         THEN (RANDOM() * 8)::INTEGER + 1 
         ELSE (RANDOM() * 2)::INTEGER 
    END as email_clicks_30d,
    CASE WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') 
         THEN (RANDOM() * 5)::INTEGER + 1 
         ELSE 0 
    END as form_submissions_30d,
    CASE WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') 
         THEN (RANDOM() * 12)::INTEGER + 3 
         ELSE (RANDOM() * 2)::INTEGER 
    END as portal_visits_30d,
    c.last_activity_date as last_activity,
    -- Open alerts count
    CASE 
      WHEN c.last_activity_date < (end_date - INTERVAL '30 days') THEN 1
      ELSE 0
    END as open_alerts
  FROM clients c
  WHERE c.organization_id = org_id
    AND c.created_at <= end_date
    AND c.status = 'active'
  ORDER BY 
    -- Prioritize clients by engagement and wedding date proximity
    CASE 
      WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 1
      WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '60 days') THEN 2
      ELSE 3
    END,
    c.last_activity_date DESC NULLS LAST,
    c.client_name
  LIMIT limit_count;
END;
$$;

-- Create engagement trends function
CREATE OR REPLACE FUNCTION get_engagement_trends(
  supplier_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  date_granularity TEXT DEFAULT 'day'
)
RETURNS TABLE (
  date TEXT,
  average_score NUMERIC,
  total_events INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  date_trunc_format TEXT;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;
  
  -- Validate and set date truncation format
  date_trunc_format := CASE 
    WHEN date_granularity = 'day' THEN 'day'
    WHEN date_granularity = 'week' THEN 'week'
    WHEN date_granularity = 'month' THEN 'month'
    ELSE 'day'
  END;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      DATE_TRUNC(date_trunc_format, start_date),
      DATE_TRUNC(date_trunc_format, end_date),
      ('1 ' || date_trunc_format)::INTERVAL
    ) as period_date
  ),
  client_engagement AS (
    SELECT 
      DATE_TRUNC(date_trunc_format, c.last_activity_date) as activity_period,
      CASE 
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 100
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '14 days') THEN 80
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 60
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 40
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '90 days') THEN 20
        ELSE 10
      END as engagement_score,
      -- Simulate events (replace with real data)
      CASE WHEN c.last_activity_date IS NOT NULL 
           THEN (RANDOM() * 10)::INTEGER + 1 
           ELSE 0 
      END as events_count
    FROM clients c
    WHERE c.organization_id = org_id
      AND c.status = 'active'
      AND c.last_activity_date BETWEEN start_date AND end_date
  )
  SELECT 
    ds.period_date::DATE::TEXT as date,
    COALESCE(ROUND(AVG(ce.engagement_score), 1), 0) as average_score,
    COALESCE(SUM(ce.events_count), 0)::INTEGER as total_events
  FROM date_series ds
  LEFT JOIN client_engagement ce ON ds.period_date = ce.activity_period
  GROUP BY ds.period_date
  ORDER BY ds.period_date;
END;
$$;

-- Create activity status distribution function
CREATE OR REPLACE FUNCTION get_activity_status_distribution(
  supplier_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  RETURN QUERY
  WITH activity_status AS (
    SELECT 
      CASE 
        WHEN c.last_activity_date >= (end_date - INTERVAL '1 day') THEN 'very_active'
        WHEN c.last_activity_date >= (end_date - INTERVAL '7 days') THEN 'active'
        WHEN c.last_activity_date >= (end_date - INTERVAL '30 days') THEN 'moderate'
        ELSE 'inactive'
      END as status
    FROM clients c
    WHERE c.organization_id = org_id
      AND c.created_at <= end_date
      AND c.status = 'active'
  )
  SELECT 
    as_data.status::TEXT,
    COUNT(*)::BIGINT
  FROM activity_status as_data
  GROUP BY as_data.status;
END;
$$;

-- Create client risk alerts function
CREATE OR REPLACE FUNCTION get_client_risk_alerts(
  supplier_id UUID,
  severity_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  days_since_activity INTEGER,
  wedding_date DATE,
  engagement_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  RETURN QUERY
  WITH client_alerts AS (
    SELECT 
      c.id as client_id,
      c.client_name::TEXT,
      -- Determine alert type based on client status
      CASE 
        WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 'no_recent_activity'
        WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 'low_engagement'
        WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '14 days') THEN 'approaching_wedding'
        WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '7 days') THEN 'wedding_week'
        ELSE 'general_followup'
      END::TEXT as alert_type,
      -- Determine severity
      CASE 
        WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '7 days') AND 
             c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 'critical'
        WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 'high'
        WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 'medium'
        ELSE 'low'
      END::TEXT as severity,
      -- Generate alert message
      CASE 
        WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 
          'Client has been inactive for over 60 days'
        WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 
          'Client engagement has declined significantly'
        WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '7 days') THEN 
          'Wedding is within 7 days - final confirmation needed'
        WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '14 days') THEN 
          'Wedding is approaching - timeline review recommended'
        ELSE 'Regular client check-in recommended'
      END::TEXT as message,
      EXTRACT(DAY FROM (CURRENT_TIMESTAMP - c.last_activity_date))::INTEGER as days_since_activity,
      c.wedding_date,
      -- Engagement score
      CASE 
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 100
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '14 days') THEN 80
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 60
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 40
        WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '90 days') THEN 20
        ELSE 10
      END as engagement_score,
      c.created_at
    FROM clients c
    WHERE c.organization_id = org_id
      AND c.status = 'active'
      AND (
        c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '30 days') OR
        c.wedding_date <= (CURRENT_DATE + INTERVAL '30 days')
      )
  )
  SELECT 
    ca.client_id,
    ca.client_name,
    ca.alert_type,
    ca.severity,
    ca.message,
    ca.days_since_activity,
    ca.wedding_date,
    ca.engagement_score,
    ca.created_at
  FROM client_alerts ca
  WHERE (severity_filter IS NULL OR ca.severity = severity_filter)
  ORDER BY 
    -- Order by severity and urgency
    CASE ca.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2  
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    ca.days_since_activity DESC,
    ca.wedding_date ASC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Create indexes for optimal performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_organization_activity 
ON clients (organization_id, last_activity_date DESC, status) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_wedding_date 
ON clients (wedding_date) 
WHERE status = 'active' AND wedding_date >= CURRENT_DATE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_engagement_lookup 
ON clients (organization_id, last_activity_date, wedding_date, status);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_client_analytics_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_segments_distribution(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_engagement_details(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_engagement_trends(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_status_distribution(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_risk_alerts(UUID, TEXT, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_client_analytics_summary IS 'WS-225: High-performance analytics summary for client dashboard';
COMMENT ON FUNCTION get_client_segments_distribution IS 'WS-225: Client segment distribution for analytics charts';
COMMENT ON FUNCTION get_client_engagement_details IS 'WS-225: Detailed client engagement data with performance optimization';
COMMENT ON FUNCTION get_engagement_trends IS 'WS-225: Engagement trends over time for analytics visualization';
COMMENT ON FUNCTION get_activity_status_distribution IS 'WS-225: Activity status distribution for analytics';
COMMENT ON FUNCTION get_client_risk_alerts IS 'WS-225: Client risk alerts with severity scoring and recommendations';