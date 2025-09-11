-- WS-208: AI Journey Suggestions System
-- Complete database schema for AI-powered journey generation with performance tracking
-- Team B - Backend implementation with OpenAI integration

-- Store generated journeys for learning and reuse
CREATE TABLE IF NOT EXISTS ai_generated_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('photographer', 'dj', 'caterer', 'venue', 'planner', 'florist', 'videographer')),
  service_level TEXT NOT NULL CHECK (service_level IN ('basic', 'premium', 'luxury')),
  wedding_timeline_months INTEGER NOT NULL CHECK (wedding_timeline_months > 0),
  client_preferences JSONB DEFAULT '{}'::jsonb,
  generated_structure JSONB NOT NULL,
  ai_model TEXT DEFAULT 'gpt-4',
  ai_prompt_used TEXT,
  generation_metadata JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{
    "predicted_completion_rate": 0.0,
    "predicted_engagement_score": 0.0,
    "confidence_score": 0.0,
    "generation_time_ms": 0,
    "token_usage": 0,
    "complexity_score": 0.0
  }'::jsonb,
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,4) DEFAULT 0.0000,
  avg_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
  is_template BOOLEAN DEFAULT false,
  template_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_completion_rate CHECK (avg_completion_rate >= 0.0 AND avg_completion_rate <= 1.0),
  CONSTRAINT valid_satisfaction CHECK (avg_satisfaction_score >= 0.00 AND avg_satisfaction_score <= 5.00),
  CONSTRAINT valid_confidence CHECK ((performance_metrics->>'confidence_score')::float >= 0.0 AND (performance_metrics->>'confidence_score')::float <= 1.0)
);

-- Track journey performance for ML improvement
CREATE TABLE IF NOT EXISTS journey_performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES customer_journeys(id) ON DELETE CASCADE,
  ai_suggestion_id UUID REFERENCES ai_generated_journeys(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Performance metrics
  actual_completion_rate DECIMAL(5,4) CHECK (actual_completion_rate >= 0.0 AND actual_completion_rate <= 1.0),
  client_satisfaction_score INTEGER CHECK (client_satisfaction_score BETWEEN 1 AND 5),
  supplier_rating INTEGER CHECK (supplier_rating BETWEEN 1 AND 5),
  engagement_metrics JSONB DEFAULT '{
    "email_open_rate": 0.0,
    "sms_response_rate": 0.0,
    "task_completion_time_avg": 0,
    "client_initiated_contact": 0,
    "milestone_hit_rate": 0.0
  }'::jsonb,
  
  -- Journey modifications tracking
  modifications_made JSONB DEFAULT '{
    "nodes_added": [],
    "nodes_removed": [],
    "timing_adjustments": [],
    "content_changes": []
  }'::jsonb,
  modification_reasons TEXT[],
  
  -- Qualitative feedback
  performance_notes TEXT,
  feedback_data JSONB DEFAULT '{}'::jsonb,
  wedding_outcome TEXT CHECK (wedding_outcome IN ('successful', 'issues_minor', 'issues_major', 'cancelled')),
  
  -- Timing data
  journey_start_date DATE,
  journey_end_date DATE,
  wedding_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor-specific journey patterns and templates
CREATE TABLE IF NOT EXISTS vendor_journey_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('photographer', 'dj', 'caterer', 'venue', 'planner', 'florist', 'videographer')),
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  service_level TEXT NOT NULL CHECK (service_level IN ('basic', 'premium', 'luxury', 'all')),
  
  -- Pattern structure
  pattern_data JSONB NOT NULL,
  critical_touchpoints JSONB NOT NULL,
  seasonal_adjustments JSONB DEFAULT '{}'::jsonb,
  timeline_requirements JSONB DEFAULT '{
    "min_weeks": 4,
    "max_weeks": 104,
    "optimal_weeks": 26
  }'::jsonb,
  
  -- Performance tracking
  success_rate DECIMAL(5,4) DEFAULT 0.0000 CHECK (success_rate >= 0.0 AND success_rate <= 1.0),
  usage_frequency INTEGER DEFAULT 0,
  avg_client_satisfaction DECIMAL(3,2) DEFAULT 0.00,
  
  -- Meta information
  industry_standard BOOLEAN DEFAULT false,
  best_practice_notes TEXT[],
  compliance_requirements TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint for pattern identification
  UNIQUE(vendor_type, pattern_name, service_level)
);

-- AI generation audit log for compliance and debugging
CREATE TABLE IF NOT EXISTS ai_generation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('generate_new', 'optimize_existing', 'get_patterns')),
  request_data JSONB NOT NULL,
  
  -- AI processing
  ai_model_used TEXT DEFAULT 'gpt-4',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  
  -- Response details
  response_status TEXT NOT NULL CHECK (response_status IN ('success', 'error', 'timeout', 'rate_limited')),
  response_data JSONB,
  error_details TEXT,
  
  -- Rate limiting
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMP WITH TIME ZONE,
  
  -- Compliance
  gdpr_anonymized BOOLEAN DEFAULT false,
  retention_period_days INTEGER DEFAULT 90,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Performance indexes for optimal query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_vendor_type ON ai_generated_journeys(vendor_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_service_level ON ai_generated_journeys(service_level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_supplier ON ai_generated_journeys(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_usage_count ON ai_generated_journeys(usage_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_performance ON ai_generated_journeys(avg_completion_rate DESC, avg_satisfaction_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_template ON ai_generated_journeys(is_template, template_category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_data_ai_suggestion ON journey_performance_data(ai_suggestion_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_data_supplier ON journey_performance_data(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_data_wedding_date ON journey_performance_data(wedding_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_data_satisfaction ON journey_performance_data(client_satisfaction_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_patterns_type ON vendor_journey_patterns(vendor_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_patterns_service ON vendor_journey_patterns(service_level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_patterns_success ON vendor_journey_patterns(success_rate DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_supplier ON ai_generation_audit_log(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created ON ai_generation_audit_log(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_request_type ON ai_generation_audit_log(request_type);

-- JSONB indexes for performance on JSON queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_structure_gin ON ai_generated_journeys USING GIN (generated_structure);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_journeys_preferences_gin ON ai_generated_journeys USING GIN (client_preferences);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_engagement_gin ON journey_performance_data USING GIN (engagement_metrics);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_patterns_data_gin ON vendor_journey_patterns USING GIN (pattern_data);

-- Row Level Security policies
ALTER TABLE ai_generated_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_performance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_journey_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their organization's AI generated journeys
CREATE POLICY ai_journeys_access_policy ON ai_generated_journeys
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can only access performance data for their organization
CREATE POLICY performance_data_access_policy ON journey_performance_data
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Vendor patterns are globally readable but only writable by admin
CREATE POLICY vendor_patterns_read_policy ON vendor_journey_patterns
  FOR SELECT USING (true);

CREATE POLICY vendor_patterns_write_policy ON vendor_journey_patterns
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE role = 'admin' OR role = 'super_admin'
    )
  );

-- Policy: Audit logs are only accessible by organization members
CREATE POLICY audit_log_access_policy ON ai_generation_audit_log
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_journeys_updated_at BEFORE UPDATE ON ai_generated_journeys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_data_updated_at BEFORE UPDATE ON journey_performance_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_patterns_updated_at BEFORE UPDATE ON vendor_journey_patterns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default vendor patterns for common wedding service types
INSERT INTO vendor_journey_patterns (vendor_type, pattern_name, service_level, pattern_description, pattern_data, critical_touchpoints) VALUES
('photographer', 'Standard Wedding Photography', 'premium', 'Comprehensive photography journey from booking to delivery', 
'{
  "total_duration_weeks": 26,
  "node_count": 8,
  "communication_channels": ["email", "phone", "in_person"],
  "deliverable_checkpoints": 4
}'::jsonb,
'{
  "booking_confirmation": {"timing_days": 0, "required": true, "channel": "email"},
  "engagement_session": {"timing_days": -60, "required": false, "channel": "in_person"},
  "timeline_planning": {"timing_days": -30, "required": true, "channel": "phone"},
  "final_details": {"timing_days": -7, "required": true, "channel": "email"},
  "wedding_day_prep": {"timing_days": -1, "required": true, "channel": "phone"}
}'::jsonb);

INSERT INTO vendor_journey_patterns (vendor_type, pattern_name, service_level, pattern_description, pattern_data, critical_touchpoints) VALUES
('caterer', 'Full Service Catering', 'premium', 'Complete catering service from consultation to service', 
'{
  "total_duration_weeks": 20,
  "node_count": 10,
  "communication_channels": ["email", "phone", "in_person"],
  "deliverable_checkpoints": 5
}'::jsonb,
'{
  "initial_consultation": {"timing_days": 0, "required": true, "channel": "in_person"},
  "menu_tasting": {"timing_days": -90, "required": true, "channel": "in_person"},
  "final_headcount": {"timing_days": -14, "required": true, "channel": "email"},
  "dietary_restrictions": {"timing_days": -7, "required": true, "channel": "email"},
  "delivery_coordination": {"timing_days": -1, "required": true, "channel": "phone"}
}'::jsonb);

-- Analytics view for AI performance monitoring
CREATE OR REPLACE VIEW ai_journey_analytics AS
SELECT 
  aj.vendor_type,
  aj.service_level,
  COUNT(*) as total_generated,
  AVG(aj.avg_completion_rate) as avg_completion_rate,
  AVG(aj.avg_satisfaction_score) as avg_satisfaction_score,
  AVG((aj.performance_metrics->>'confidence_score')::float) as avg_confidence_score,
  SUM(aj.usage_count) as total_usage_count,
  COUNT(jpd.id) as performance_data_points,
  AVG(jpd.actual_completion_rate) as actual_avg_completion_rate,
  AVG(jpd.client_satisfaction_score) as actual_avg_satisfaction
FROM ai_generated_journeys aj
LEFT JOIN journey_performance_data jpd ON aj.id = jpd.ai_suggestion_id
GROUP BY aj.vendor_type, aj.service_level;

-- Function to get AI suggestions based on criteria
CREATE OR REPLACE FUNCTION get_ai_journey_suggestions(
  p_vendor_type TEXT,
  p_service_level TEXT,
  p_timeline_months INTEGER,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  generated_structure JSONB,
  avg_completion_rate DECIMAL,
  avg_satisfaction_score DECIMAL,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aj.id,
    aj.generated_structure,
    aj.avg_completion_rate,
    aj.avg_satisfaction_score,
    aj.usage_count
  FROM ai_generated_journeys aj
  WHERE aj.vendor_type = p_vendor_type
    AND aj.service_level = p_service_level
    AND aj.wedding_timeline_months <= p_timeline_months
  ORDER BY aj.avg_completion_rate DESC, aj.avg_satisfaction_score DESC, aj.usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ai_generated_journeys TO authenticated;
GRANT SELECT, INSERT, UPDATE ON journey_performance_data TO authenticated;
GRANT SELECT ON vendor_journey_patterns TO authenticated;
GRANT INSERT ON vendor_journey_patterns TO service_role;
GRANT SELECT, INSERT ON ai_generation_audit_log TO authenticated;
GRANT SELECT ON ai_journey_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_journey_suggestions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_generated_journeys IS 'Stores AI-generated customer journeys with performance tracking for machine learning improvement';
COMMENT ON TABLE journey_performance_data IS 'Tracks actual journey performance against AI predictions for continuous learning';
COMMENT ON TABLE vendor_journey_patterns IS 'Industry-standard journey patterns and templates for different vendor types';
COMMENT ON TABLE ai_generation_audit_log IS 'Audit trail for AI generation requests for compliance and debugging';
COMMENT ON VIEW ai_journey_analytics IS 'Analytics view for monitoring AI journey generation performance and accuracy';
COMMENT ON FUNCTION get_ai_journey_suggestions IS 'Retrieves top-performing AI journey suggestions based on criteria';