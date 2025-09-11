-- WS-239: Platform vs Client APIs Implementation
-- Team B - Round 1: Dual AI System Database Migration
-- Creates tables for AI feature configuration, usage tracking, and billing

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom enums for AI system configuration
CREATE TYPE tier_enum AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE');
CREATE TYPE api_provider_enum AS ENUM ('openai', 'anthropic', 'google');
CREATE TYPE migration_status_enum AS ENUM ('platform_only', 'hybrid', 'client_only', 'migrating');
CREATE TYPE ai_feature_enum AS ENUM (
  'photo_analysis',
  'content_generation', 
  'email_templates',
  'chat_responses',
  'document_analysis',
  'wedding_planning',
  'vendor_matching',
  'budget_optimization'
);
CREATE TYPE provider_type_enum AS ENUM ('platform', 'client');

-- AI feature configuration per supplier
CREATE TABLE ai_feature_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  
  -- Platform features configuration  
  platform_features_enabled BOOLEAN DEFAULT TRUE,
  platform_usage_tier tier_enum NOT NULL DEFAULT 'FREE',
  platform_monthly_limits JSONB DEFAULT '{
    "photo_analysis": 100,
    "content_generation": 50,
    "email_templates": 25,
    "chat_responses": 200,
    "document_analysis": 10,
    "wedding_planning": 5,
    "vendor_matching": 20,
    "budget_optimization": 10
  }'::JSONB,
  platform_overage_rate_pounds DECIMAL(6,4) DEFAULT 0.0100, -- £0.01 per request
  
  -- Client API configuration
  client_api_enabled BOOLEAN DEFAULT FALSE,
  client_api_provider api_provider_enum DEFAULT 'openai',
  client_api_key_encrypted TEXT, -- Encrypted with AES-256-GCM
  client_api_key_iv TEXT, -- Initialization vector for encryption
  client_monthly_budget_pounds DECIMAL(10,2) DEFAULT 50.00,
  client_auto_disable_at_limit BOOLEAN DEFAULT TRUE,
  client_cost_alerts_enabled BOOLEAN DEFAULT TRUE,
  client_alert_thresholds JSONB DEFAULT '[0.5, 0.8, 0.95]'::JSONB, -- 50%, 80%, 95%
  
  -- Migration settings
  migration_status migration_status_enum DEFAULT 'platform_only',
  migration_date TIMESTAMPTZ,
  migration_savings_estimate_pounds DECIMAL(8,2) DEFAULT 0.00,
  
  -- Health monitoring
  last_health_check TIMESTAMPTZ DEFAULT NOW(),
  client_api_health_status BOOLEAN DEFAULT TRUE,
  platform_api_health_status BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id)
);

-- Real-time usage tracking for all AI requests
CREATE TABLE ai_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  user_id UUID REFERENCES users(id), -- The actual user making the request (for audit)
  
  -- Request classification
  feature_type ai_feature_enum NOT NULL,
  provider_type provider_type_enum NOT NULL, -- 'platform' or 'client'
  request_type VARCHAR(50) NOT NULL, -- e.g., 'image_analysis', 'text_completion'
  
  -- Usage metrics
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
  model_used VARCHAR(50) DEFAULT 'gpt-4',
  
  -- Cost tracking (in pounds)
  cost_pounds DECIMAL(8,4) DEFAULT 0.0000,
  billing_period DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  
  -- Performance and reliability metrics
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Request context for debugging
  request_metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Wedding context for business impact analysis
  wedding_date DATE, -- If request relates to specific wedding
  is_peak_season BOOLEAN DEFAULT FALSE, -- Friday-Sunday or peak wedding months
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for efficient querying
  INDEX idx_supplier_billing (supplier_id, billing_period),
  INDEX idx_feature_type_date (feature_type, created_at),
  INDEX idx_provider_type (provider_type, created_at),
  INDEX idx_success_error (success, created_at) WHERE success = false,
  INDEX idx_wedding_context (wedding_date, is_peak_season) WHERE wedding_date IS NOT NULL
);

-- Monthly billing summaries for efficient reporting
CREATE TABLE ai_billing_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  billing_period DATE NOT NULL,
  
  -- Platform usage summary
  platform_requests INTEGER DEFAULT 0,
  platform_tokens_used INTEGER DEFAULT 0,
  platform_limit_exceeded BOOLEAN DEFAULT FALSE,
  platform_overage_requests INTEGER DEFAULT 0,
  platform_overage_cost_pounds DECIMAL(8,2) DEFAULT 0.00,
  
  -- Client usage summary
  client_requests INTEGER DEFAULT 0,
  client_tokens_input INTEGER DEFAULT 0,
  client_tokens_output INTEGER DEFAULT 0,
  client_cost_pounds DECIMAL(10,2) DEFAULT 0.00,
  client_budget_utilization DECIMAL(5,4) DEFAULT 0.0000, -- Percentage of budget used
  client_alerts_triggered INTEGER DEFAULT 0,
  
  -- Cost comparison and savings
  estimated_platform_cost_pounds DECIMAL(10,2) DEFAULT 0.00, -- What it would cost on platform
  client_savings_pounds DECIMAL(10,2) DEFAULT 0.00,
  savings_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Performance metrics
  average_response_time_ms INTEGER,
  success_rate DECIMAL(5,4) DEFAULT 1.0000,
  error_count INTEGER DEFAULT 0,
  
  -- Wedding business context
  peak_season_usage_percentage DECIMAL(5,2) DEFAULT 0.00,
  wedding_critical_errors INTEGER DEFAULT 0, -- Errors during peak wedding times
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, billing_period)
);

-- API key rotation history for security audit trail
CREATE TABLE ai_key_rotation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  rotation_type VARCHAR(20) NOT NULL, -- 'scheduled', 'manual', 'emergency'
  old_key_fingerprint VARCHAR(64), -- SHA-256 hash of old key for audit
  new_key_fingerprint VARCHAR(64), -- SHA-256 hash of new key
  rotation_reason TEXT,
  rotated_by UUID REFERENCES users(id), -- Admin or supplier who initiated
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circuit breaker state tracking for reliability
CREATE TABLE ai_circuit_breaker_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_type provider_type_enum NOT NULL,
  supplier_id UUID REFERENCES users(id), -- NULL for platform-wide breakers
  circuit_state VARCHAR(10) NOT NULL DEFAULT 'CLOSED', -- 'CLOSED', 'OPEN', 'HALF_OPEN'
  failure_count INTEGER DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  last_success_time TIMESTAMPTZ,
  next_attempt_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_type, supplier_id)
);

-- Row Level Security Policies
ALTER TABLE ai_feature_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_billing_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_key_rotation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers to only see their own data
CREATE POLICY "Suppliers can manage their own AI config" ON ai_feature_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = ai_feature_config.supplier_id 
      AND users.id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can view their own usage data" ON ai_usage_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = ai_usage_tracking.supplier_id 
      AND users.id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can view their own billing data" ON ai_billing_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = ai_billing_summary.supplier_id 
      AND users.id = auth.uid()
    )
  );

-- Service role policies for system operations
CREATE POLICY "Service role full access" ON ai_feature_config
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON ai_usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON ai_billing_summary
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON ai_key_rotation_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON ai_circuit_breaker_state
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger functions for automated maintenance
CREATE OR REPLACE FUNCTION update_ai_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_config_updated_at
  BEFORE UPDATE ON ai_feature_config
  FOR EACH ROW EXECUTE FUNCTION update_ai_config_timestamp();

-- Function to automatically create billing summaries
CREATE OR REPLACE FUNCTION generate_monthly_ai_billing_summary(
  p_supplier_id UUID,
  p_billing_period DATE DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS UUID AS $$
DECLARE
  summary_id UUID;
  platform_data RECORD;
  client_data RECORD;
BEGIN
  -- Get platform usage data
  SELECT 
    COUNT(*) as requests,
    COALESCE(SUM(tokens_total), 0) as tokens,
    COUNT(*) FILTER (WHERE cost_pounds > 0) as overage_requests,
    COALESCE(SUM(cost_pounds), 0) as overage_cost
  INTO platform_data
  FROM ai_usage_tracking
  WHERE supplier_id = p_supplier_id 
    AND provider_type = 'platform'
    AND billing_period = p_billing_period;

  -- Get client usage data  
  SELECT
    COUNT(*) as requests,
    COALESCE(SUM(tokens_input), 0) as tokens_input,
    COALESCE(SUM(tokens_output), 0) as tokens_output,
    COALESCE(SUM(cost_pounds), 0) as cost,
    AVG(response_time_ms)::INTEGER as avg_response_time,
    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / GREATEST(COUNT(*), 1)) as success_rate,
    COUNT(*) FILTER (WHERE success = false) as errors
  INTO client_data
  FROM ai_usage_tracking
  WHERE supplier_id = p_supplier_id 
    AND provider_type = 'client'
    AND billing_period = p_billing_period;

  -- Insert or update billing summary
  INSERT INTO ai_billing_summary (
    supplier_id,
    billing_period,
    platform_requests,
    platform_tokens_used,
    platform_overage_requests,
    platform_overage_cost_pounds,
    client_requests,
    client_tokens_input,
    client_tokens_output,
    client_cost_pounds,
    average_response_time_ms,
    success_rate,
    error_count
  ) VALUES (
    p_supplier_id,
    p_billing_period,
    platform_data.requests,
    platform_data.tokens,
    platform_data.overage_requests,
    platform_data.overage_cost,
    client_data.requests,
    client_data.tokens_input,
    client_data.tokens_output,
    client_data.cost,
    client_data.avg_response_time,
    client_data.success_rate,
    client_data.errors
  )
  ON CONFLICT (supplier_id, billing_period) 
  DO UPDATE SET
    platform_requests = EXCLUDED.platform_requests,
    platform_tokens_used = EXCLUDED.platform_tokens_used,
    platform_overage_requests = EXCLUDED.platform_overage_requests,
    platform_overage_cost_pounds = EXCLUDED.platform_overage_cost_pounds,
    client_requests = EXCLUDED.client_requests,
    client_tokens_input = EXCLUDED.client_tokens_input,
    client_tokens_output = EXCLUDED.client_tokens_output,
    client_cost_pounds = EXCLUDED.client_cost_pounds,
    average_response_time_ms = EXCLUDED.average_response_time_ms,
    success_rate = EXCLUDED.success_rate,
    error_count = EXCLUDED.error_count,
    updated_at = NOW()
  RETURNING id INTO summary_id;

  RETURN summary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial data for existing suppliers (set up platform-only configuration)
INSERT INTO ai_feature_config (supplier_id, platform_usage_tier)
SELECT 
  u.id,
  CASE 
    WHEN o.subscription_tier = 'FREE' THEN 'FREE'::tier_enum
    WHEN o.subscription_tier = 'STARTER' THEN 'STARTER'::tier_enum  
    WHEN o.subscription_tier = 'PROFESSIONAL' THEN 'PROFESSIONAL'::tier_enum
    WHEN o.subscription_tier = 'SCALE' THEN 'SCALE'::tier_enum
    WHEN o.subscription_tier = 'ENTERPRISE' THEN 'ENTERPRISE'::tier_enum
    ELSE 'FREE'::tier_enum
  END as tier
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.user_type = 'supplier'
  AND NOT EXISTS (
    SELECT 1 FROM ai_feature_config 
    WHERE supplier_id = u.id
  )
ON CONFLICT (supplier_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE ai_feature_config IS 'WS-239: Configuration for dual AI system (platform vs client keys) per supplier';
COMMENT ON TABLE ai_usage_tracking IS 'WS-239: Real-time tracking of all AI requests with cost and performance metrics';  
COMMENT ON TABLE ai_billing_summary IS 'WS-239: Monthly billing summaries for efficient reporting and cost analysis';
COMMENT ON TABLE ai_key_rotation_log IS 'WS-239: Security audit trail for API key rotations';
COMMENT ON TABLE ai_circuit_breaker_state IS 'WS-239: Circuit breaker state for AI service reliability';

COMMENT ON COLUMN ai_feature_config.client_api_key_encrypted IS 'Encrypted using AES-256-GCM with unique IV per supplier';
COMMENT ON COLUMN ai_usage_tracking.is_peak_season IS 'Business context: Friday-Sunday or peak wedding months for impact analysis';
COMMENT ON COLUMN ai_billing_summary.client_savings_pounds IS 'Cost savings from using client AI vs platform AI';