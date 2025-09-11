-- ====================================================================
-- WS-206: AI Email Templates System - Database Schema Migration
-- ====================================================================
-- This migration creates comprehensive email template storage with AI integration
-- Supporting multi-tenant architecture for wedding vendor email automation
-- Team B - Backend Implementation - 2025-01-20
-- ====================================================================

BEGIN;

-- ====================================================================
-- EMAIL TEMPLATES MAIN TABLE
-- ====================================================================
-- AI-generated email templates storage for wedding vendors
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('photographer', 'dj', 'caterer', 'venue', 'florist', 'planner', 'videographer', 'coordinator', 'baker', 'decorator')),
  stage TEXT NOT NULL CHECK (stage IN ('inquiry', 'booking', 'planning', 'final', 'post', 'follow_up', 'reminder', 'confirmation')),
  tone TEXT NOT NULL CHECK (tone IN ('formal', 'friendly', 'casual', 'professional', 'warm', 'enthusiastic')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  merge_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- AI Generation Metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_model TEXT,
  ai_prompt_used TEXT,
  ai_generation_time_ms INTEGER,
  ai_tokens_used JSONB DEFAULT '{}'::jsonb, -- {prompt_tokens, completion_tokens, total_tokens}
  
  -- Performance and Usage Metrics
  performance_metrics JSONB DEFAULT '{}'::jsonb, -- {open_rate, response_rate, conversion_rate}
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Template Configuration
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  category TEXT, -- For organizational purposes
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- For filtering and search
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint to prevent duplicate templates per supplier
  CONSTRAINT unique_template_per_supplier UNIQUE (supplier_id, template_name)
);

-- ====================================================================
-- EMAIL TEMPLATE VARIANTS TABLE
-- ====================================================================
-- Template variants for A/B testing and multiple options
CREATE TABLE IF NOT EXISTS email_template_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL, -- 'A', 'B', 'C', etc.
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Performance Metrics
  performance_score DECIMAL(3,2) DEFAULT 0.00 CHECK (performance_score >= 0.00 AND performance_score <= 1.00),
  open_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (open_rate >= 0.00 AND open_rate <= 100.00),
  response_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (response_rate >= 0.00 AND response_rate <= 100.00),
  conversion_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (conversion_rate >= 0.00 AND conversion_rate <= 100.00),
  
  -- Usage Statistics
  send_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Status and Configuration
  is_active BOOLEAN DEFAULT true,
  is_winner BOOLEAN DEFAULT false, -- Mark the winning variant
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique variant labels per template
  CONSTRAINT unique_variant_label UNIQUE (parent_template_id, variant_label)
);

-- ====================================================================
-- EMAIL TEMPLATE USAGE LOG
-- ====================================================================
-- Track when templates are used and their outcomes
CREATE TABLE IF NOT EXISTS email_template_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES email_template_variants(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Usage Context
  usage_context TEXT NOT NULL CHECK (usage_context IN ('manual_send', 'automated_send', 'preview', 'test')),
  personalization_data JSONB DEFAULT '{}'::jsonb, -- Merge tag values used
  
  -- Outcome Tracking
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Email Details
  recipient_email TEXT,
  subject_used TEXT,
  body_length INTEGER,
  
  -- Performance Data
  delivery_status TEXT CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed', 'spam')),
  engagement_score DECIMAL(3,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- AI GENERATION REQUESTS LOG
-- ====================================================================
-- Track AI generation requests for monitoring and billing
CREATE TABLE IF NOT EXISTS ai_generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request Details
  request_type TEXT NOT NULL CHECK (request_type IN ('generate_template', 'personalize_template', 'improve_template')),
  vendor_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  tone TEXT NOT NULL,
  prompt_data JSONB NOT NULL, -- Original prompt and parameters
  
  -- AI Response
  ai_model TEXT NOT NULL,
  response_data JSONB, -- Generated templates/content
  tokens_used JSONB DEFAULT '{}'::jsonb,
  generation_time_ms INTEGER,
  
  -- Cost and Billing
  estimated_cost_usd DECIMAL(10,6),
  
  -- Status and Audit
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
-- Optimized indexes for common query patterns

-- Email Templates Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_supplier ON email_templates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_vendor_stage ON email_templates(vendor_type, stage);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_usage ON email_templates(use_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_created ON email_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_search ON email_templates USING gin(to_tsvector('english', template_name || ' ' || COALESCE(category, '') || ' ' || array_to_string(tags, ' ')));

-- Template Variants Indexes
CREATE INDEX IF NOT EXISTS idx_template_variants_parent ON email_template_variants(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_template_variants_performance ON email_template_variants(parent_template_id, performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_template_variants_active ON email_template_variants(parent_template_id, is_active) WHERE is_active = true;

-- Usage Log Indexes
CREATE INDEX IF NOT EXISTS idx_usage_log_template ON email_template_usage_log(template_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_supplier ON email_template_usage_log(supplier_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_client ON email_template_usage_log(client_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_engagement ON email_template_usage_log(engagement_score DESC) WHERE engagement_score > 0;

-- AI Generation Indexes
CREATE INDEX IF NOT EXISTS idx_ai_requests_supplier ON ai_generation_requests(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user ON ai_generation_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_generation_requests(status, created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY POLICIES
-- ====================================================================
-- Ensure multi-tenant data isolation

-- Email Templates RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access templates from their organization
CREATE POLICY email_templates_tenant_isolation ON email_templates
  USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Email Template Variants RLS
ALTER TABLE email_template_variants ENABLE ROW LEVEL SECURITY;

-- Policy: Access variants through parent template access
CREATE POLICY email_template_variants_tenant_isolation ON email_template_variants
  USING (
    parent_template_id IN (
      SELECT et.id FROM email_templates et
      WHERE et.supplier_id IN (
        SELECT s.id FROM suppliers s
        JOIN user_profiles up ON up.organization_id = s.organization_id
        WHERE up.user_id = auth.uid()
      )
    )
  );

-- Usage Log RLS
ALTER TABLE email_template_usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access usage logs from their organization
CREATE POLICY email_template_usage_log_tenant_isolation ON email_template_usage_log
  USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- AI Generation Requests RLS
ALTER TABLE ai_generation_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own AI requests
CREATE POLICY ai_generation_requests_user_isolation ON ai_generation_requests
  USING (user_id = auth.uid());

-- ====================================================================
-- TRIGGER FUNCTIONS
-- ====================================================================
-- Automated maintenance and audit functions

-- Function: Update template updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update timestamp on template changes
CREATE TRIGGER update_email_templates_timestamp
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_template_timestamp();

-- Function: Update variant updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_variant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update timestamp on variant changes
CREATE TRIGGER update_template_variants_timestamp
  BEFORE UPDATE ON email_template_variants
  FOR EACH ROW EXECUTE FUNCTION update_template_variant_timestamp();

-- Function: Update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update template usage count and last used date
  UPDATE email_templates 
  SET 
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = NEW.template_id;
  
  -- Update variant send count if variant specified
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE email_template_variants
    SET send_count = send_count + 1
    WHERE id = NEW.variant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update usage stats when template is used
CREATE TRIGGER update_template_usage_stats_trigger
  AFTER INSERT ON email_template_usage_log
  FOR EACH ROW EXECUTE FUNCTION update_template_usage_stats();

-- ====================================================================
-- HELPER FUNCTIONS
-- ====================================================================
-- Utility functions for template management

-- Function: Get template with best performing variant
CREATE OR REPLACE FUNCTION get_best_template_variant(template_id UUID)
RETURNS TABLE (
  template_data jsonb,
  variant_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_jsonb(et.*) as template_data,
    to_jsonb(etv.*) as variant_data
  FROM email_templates et
  LEFT JOIN email_template_variants etv ON etv.parent_template_id = et.id
  WHERE et.id = template_id
    AND et.is_active = true
    AND (etv.is_active = true OR etv.id IS NULL)
  ORDER BY etv.performance_score DESC NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Search templates with full-text search
CREATE OR REPLACE FUNCTION search_email_templates(
  search_query TEXT,
  supplier_id_param UUID,
  vendor_type_param TEXT DEFAULT NULL,
  stage_param TEXT DEFAULT NULL
) RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  subject TEXT,
  vendor_type TEXT,
  stage TEXT,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.template_name,
    et.subject,
    et.vendor_type,
    et.stage,
    ts_rank(to_tsvector('english', et.template_name || ' ' || et.subject || ' ' || COALESCE(et.category, '') || ' ' || array_to_string(et.tags, ' ')), plainto_tsquery('english', search_query)) as search_rank
  FROM email_templates et
  WHERE et.supplier_id = supplier_id_param
    AND et.is_active = true
    AND (vendor_type_param IS NULL OR et.vendor_type = vendor_type_param)
    AND (stage_param IS NULL OR et.stage = stage_param)
    AND to_tsvector('english', et.template_name || ' ' || et.subject || ' ' || COALESCE(et.category, '') || ' ' || array_to_string(et.tags, ' ')) @@ plainto_tsquery('english', search_query)
  ORDER BY search_rank DESC, et.use_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- DATA VALIDATION CONSTRAINTS
-- ====================================================================
-- Additional business logic constraints

-- Constraint: Template name must be reasonable length
ALTER TABLE email_templates ADD CONSTRAINT reasonable_template_name 
  CHECK (LENGTH(template_name) >= 3 AND LENGTH(template_name) <= 200);

-- Constraint: Subject line must be reasonable length
ALTER TABLE email_templates ADD CONSTRAINT reasonable_subject_length 
  CHECK (LENGTH(subject) >= 5 AND LENGTH(subject) <= 200);

-- Constraint: Body must have content
ALTER TABLE email_templates ADD CONSTRAINT body_has_content 
  CHECK (LENGTH(TRIM(body)) >= 10);

-- Constraint: AI generation time must be positive
ALTER TABLE email_templates ADD CONSTRAINT positive_generation_time
  CHECK (ai_generation_time_ms IS NULL OR ai_generation_time_ms > 0);

-- Constraint: Use count must be non-negative
ALTER TABLE email_templates ADD CONSTRAINT non_negative_use_count 
  CHECK (use_count >= 0);

-- Constraint: Variant performance scores are valid percentages
ALTER TABLE email_template_variants ADD CONSTRAINT valid_rates 
  CHECK (
    open_rate IS NULL OR (open_rate >= 0.00 AND open_rate <= 100.00) AND
    response_rate IS NULL OR (response_rate >= 0.00 AND response_rate <= 100.00) AND
    conversion_rate IS NULL OR (conversion_rate >= 0.00 AND conversion_rate <= 100.00)
  );

-- ====================================================================
-- INITIAL DATA SETUP
-- ====================================================================
-- Create default template categories and merge tags

-- Insert default merge tags reference data
INSERT INTO system_config (key, value, description) VALUES 
  ('email_template_merge_tags', '[
    "{{client_name}}", "{{partner_name}}", "{{wedding_date}}", 
    "{{venue_name}}", "{{vendor_name}}", "{{vendor_type}}",
    "{{guest_count}}", "{{budget_range}}", "{{event_time}}",
    "{{contact_phone}}", "{{contact_email}}", "{{preferred_style}}",
    "{{special_requests}}", "{{timeline_stage}}", "{{next_step}}"
  ]'::jsonb, 'Available merge tags for email templates')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Insert default template categories
INSERT INTO system_config (key, value, description) VALUES 
  ('email_template_categories', '[
    "inquiry_response", "booking_confirmation", "planning_updates",
    "final_details", "post_event", "follow_up", "reminders",
    "marketing", "testimonial_requests", "referral_requests"
  ]'::jsonb, 'Available template categories')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ====================================================================
-- MIGRATION COMPLETION LOG
-- ====================================================================
INSERT INTO migration_log (migration_name, executed_at, description) VALUES 
  ('20250901004028_email_templates_system', NOW(), 'WS-206: AI Email Templates System - Complete backend schema with multi-tenant support, AI integration, and performance optimization')
ON CONFLICT DO NOTHING;

COMMIT;

-- ====================================================================
-- MIGRATION VERIFICATION QUERIES
-- ====================================================================
-- Run these queries to verify the migration was successful:

-- Check all tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'email_template%';

-- Check indexes were created  
-- SELECT indexname FROM pg_indexes WHERE tablename LIKE 'email_template%';

-- Check RLS policies are active
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename LIKE 'email_template%';

-- Verify constraints
-- SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name LIKE 'email_template%';