-- WS-235 Support Operations Ticket Management System - Team B Extensions
-- Migration: Enhanced support system with AI-powered categorization, wedding day emergency protocols
-- Author: Team B Backend Infrastructure & AI Integration
-- Date: 2025-09-02

-- Enable required extensions for vector search and advanced features
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Support Categories with wedding-specific hierarchical categorization
CREATE TABLE support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  wedding_priority BOOLEAN DEFAULT FALSE, -- Wedding day categories get priority
  auto_escalation_minutes INTEGER DEFAULT 60,
  sla_response_minutes INTEGER DEFAULT 240, -- 4 hours default
  ai_keywords TEXT[], -- For AI categorization
  parent_category_id UUID REFERENCES support_categories(id),
  category_level INTEGER DEFAULT 1, -- 1=top level, 2=subcategory, etc.
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert wedding-specific support categories
INSERT INTO support_categories (name, description, wedding_priority, sla_response_minutes, ai_keywords) VALUES
('Wedding Day Emergency', 'Critical issues occurring on the actual wedding day', TRUE, 5, '{"wedding day", "emergency", "ceremony", "reception", "urgent", "today", "now"}'),
('Form Builder Issues', 'Problems with form creation, editing, or functionality', FALSE, 30, '{"form", "builder", "save", "submit", "field", "validation"}'),
('Guest Management', 'RSVP, guest list, and attendee related problems', FALSE, 60, '{"guest", "rsvp", "attendee", "invitation", "guest list"}'),
('Payment & Billing', 'Payment processing, subscription, and billing issues', FALSE, 15, '{"payment", "billing", "subscription", "charge", "refund", "card"}'),
('Integration Issues', 'CRM and third-party integration problems', FALSE, 90, '{"integration", "tave", "lightblue", "sync", "import", "export"}'),
('Mobile App Issues', 'Mobile responsiveness and app functionality problems', FALSE, 120, '{"mobile", "responsive", "app", "tablet", "phone", "touch"}'),
('Technical Bugs', 'General technical problems and system errors', FALSE, 60, '{"error", "bug", "crash", "freeze", "not working", "broken"}'),
('Training & Support', 'How-to questions and user guidance', FALSE, 180, '{"how to", "help", "tutorial", "guide", "training", "learn"}'),
('Feature Requests', 'New feature suggestions and enhancements', FALSE, 1440, '{"feature", "request", "suggestion", "enhancement", "new"}');

-- Enhanced SLA configurations per pricing tier and category
CREATE TABLE support_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_tier pricing_tier NOT NULL,
  category_id UUID REFERENCES support_categories(id),
  
  -- Response times (in minutes)
  first_response_minutes INTEGER NOT NULL,
  resolution_target_minutes INTEGER NOT NULL,
  
  -- Wedding day overrides (faster response times)
  wedding_day_first_response_minutes INTEGER,
  wedding_day_resolution_minutes INTEGER,
  
  -- Business hours configuration
  business_hours_only BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  weekend_support BOOLEAN DEFAULT FALSE,
  holiday_support BOOLEAN DEFAULT FALSE,
  
  -- Escalation thresholds
  auto_escalation_threshold INTEGER DEFAULT 60, -- minutes before auto-escalation
  max_escalation_level INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(pricing_tier, category_id)
);

-- Insert SLA configurations for different tiers
INSERT INTO support_sla_configs (pricing_tier, category_id, first_response_minutes, resolution_target_minutes, wedding_day_first_response_minutes, wedding_day_resolution_minutes, weekend_support) VALUES
-- FREE tier - basic support only
('FREE', (SELECT id FROM support_categories WHERE name = 'Technical Bugs'), 1440, 7200, 60, 480, FALSE), -- 24h/5d response
('FREE', (SELECT id FROM support_categories WHERE name = 'Training & Support'), 2880, 10080, NULL, NULL, FALSE), -- 48h/7d response

-- STARTER tier - business hours support
('STARTER', (SELECT id FROM support_categories WHERE name = 'Wedding Day Emergency'), 15, 120, 5, 60, TRUE),
('STARTER', (SELECT id FROM support_categories WHERE name = 'Payment & Billing'), 60, 480, 30, 240, TRUE),
('STARTER', (SELECT id FROM support_categories WHERE name = 'Form Builder Issues'), 120, 720, 60, 360, TRUE),
('STARTER', (SELECT id FROM support_categories WHERE name = 'Technical Bugs'), 240, 1440, 120, 720, FALSE),

-- PROFESSIONAL tier - priority support
('PROFESSIONAL', (SELECT id FROM support_categories WHERE name = 'Wedding Day Emergency'), 10, 60, 3, 30, TRUE),
('PROFESSIONAL', (SELECT id FROM support_categories WHERE name = 'Payment & Billing'), 30, 240, 15, 120, TRUE),
('PROFESSIONAL', (SELECT id FROM support_categories WHERE name = 'Form Builder Issues'), 60, 360, 30, 180, TRUE),
('PROFESSIONAL', (SELECT id FROM support_categories WHERE name = 'Guest Management'), 90, 480, 45, 240, TRUE),
('PROFESSIONAL', (SELECT id FROM support_categories WHERE name = 'Integration Issues'), 120, 720, 60, 360, TRUE),

-- SCALE tier - enhanced support
('SCALE', (SELECT id FROM support_categories WHERE name = 'Wedding Day Emergency'), 5, 30, 2, 15, TRUE),
('SCALE', (SELECT id FROM support_categories WHERE name = 'Payment & Billing'), 15, 120, 10, 60, TRUE),
('SCALE', (SELECT id FROM support_categories WHERE name = 'Form Builder Issues'), 30, 180, 15, 90, TRUE),
('SCALE', (SELECT id FROM support_categories WHERE name = 'Guest Management'), 45, 240, 20, 120, TRUE),
('SCALE', (SELECT id FROM support_categories WHERE name = 'Integration Issues'), 60, 360, 30, 180, TRUE),
('SCALE', (SELECT id FROM support_categories WHERE name = 'Mobile App Issues'), 90, 480, 45, 240, TRUE),

-- ENTERPRISE tier - premium support
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Wedding Day Emergency'), 3, 15, 1, 10, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Payment & Billing'), 10, 60, 5, 30, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Form Builder Issues'), 15, 90, 10, 45, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Guest Management'), 20, 120, 10, 60, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Integration Issues'), 30, 180, 15, 90, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Mobile App Issues'), 45, 240, 20, 120, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Technical Bugs'), 60, 360, 30, 180, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Training & Support'), 120, 720, 60, 360, TRUE),
('ENTERPRISE', (SELECT id FROM support_categories WHERE name = 'Feature Requests'), 240, 2880, NULL, NULL, TRUE);

-- Advanced auto-escalation rules with complex conditions
CREATE TABLE support_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Conditions (stored as JSONB for complex logic)
  conditions JSONB NOT NULL, -- Complex conditions in JSON logic format
  priority INTEGER DEFAULT 100, -- Lower number = higher priority rule
  
  -- Trigger conditions
  trigger_on_sla_breach BOOLEAN DEFAULT FALSE,
  trigger_on_customer_tier TEXT[], -- Which tiers trigger this rule
  trigger_on_categories UUID[], -- Which categories trigger this rule
  trigger_on_keywords TEXT[], -- Keywords that trigger escalation
  trigger_on_wedding_date_proximity INTEGER, -- Days before wedding date
  
  -- Actions to take when escalated
  escalate_to_level INTEGER,
  assign_to_agent_id UUID REFERENCES support_agents(id),
  assign_to_team TEXT,
  notify_emails TEXT[],
  notify_sms TEXT[],
  change_priority_to VARCHAR(20),
  add_tags TEXT[],
  
  -- Timing controls
  delay_minutes INTEGER DEFAULT 0,
  repeat_every_minutes INTEGER, -- For repeated escalations
  max_escalations INTEGER DEFAULT 1,
  business_hours_only BOOLEAN DEFAULT FALSE,
  
  -- Wedding-specific conditions
  wedding_day_only BOOLEAN DEFAULT FALSE,
  wedding_season_multiplier DECIMAL(3,2) DEFAULT 1.0,
  saturday_priority_boost BOOLEAN DEFAULT FALSE,
  
  -- Status and usage tracking
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  success_rate DECIMAL(5,4) DEFAULT 0.0000,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default escalation rules
INSERT INTO support_escalation_rules (name, description, conditions, trigger_on_categories, escalate_to_level, notify_emails, wedding_day_only, delay_minutes) VALUES
('Wedding Day Emergency Protocol', 'Immediate escalation for wedding day emergencies', 
'{"and": [{"field": "is_wedding_day_issue", "equals": true}, {"field": "priority", "in": ["critical", "high"]}]}',
ARRAY[(SELECT id FROM support_categories WHERE name = 'Wedding Day Emergency')],
3, ARRAY['emergency@wedsync.com', 'ceo@wedsync.com'], TRUE, 0),

('Payment Failure Critical Escalation', 'Escalate payment failures that affect subscription access',
'{"and": [{"field": "category", "equals": "Payment & Billing"}, {"field": "keywords", "contains_any": ["subscription", "access", "locked"]}]}',
ARRAY[(SELECT id FROM support_categories WHERE name = 'Payment & Billing')],
2, ARRAY['billing@wedsync.com', 'finance@wedsync.com'], FALSE, 5),

('High-Tier Customer Escalation', 'Faster escalation for SCALE and ENTERPRISE customers',
'{"and": [{"field": "customer_tier", "in": ["SCALE", "ENTERPRISE"]}, {"field": "first_response_time", "greater_than": 30}]}',
NULL, 2, ARRAY['support-manager@wedsync.com'], FALSE, 30),

('Data Loss Emergency', 'Immediate escalation for potential data loss issues',
'{"or": [{"field": "keywords", "contains_any": ["data lost", "missing", "disappeared", "deleted"]}, {"field": "category", "equals": "data_loss"}]}',
ARRAY[(SELECT id FROM support_categories WHERE name = 'Technical Bugs')],
3, ARRAY['cto@wedsync.com', 'data-team@wedsync.com'], FALSE, 0);

-- Knowledge base articles with AI embeddings for semantic search
CREATE TABLE support_kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- AI-generated summary
  
  -- Categorization and organization
  category_ids UUID[], -- Can belong to multiple categories
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}', -- For search matching
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5), -- 1=beginner, 5=expert
  
  -- Wedding industry specific fields
  is_wedding_related BOOLEAN DEFAULT FALSE,
  wedding_stage VARCHAR(100), -- planning, day_of, post_wedding
  applicable_vendor_types TEXT[] DEFAULT '{}', -- photographer, planner, venue, etc.
  seasonal_relevance TEXT[], -- spring, summer, fall, winter, peak_season
  
  -- Content structure
  article_type VARCHAR(50) DEFAULT 'guide', -- guide, faq, troubleshooting, tutorial
  estimated_read_time INTEGER, -- minutes
  prerequisites TEXT[],
  related_articles UUID[],
  
  -- Usage tracking and analytics
  view_count INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  search_impressions INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5,4) DEFAULT 0.0000,
  
  -- Publishing and workflow
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  publish_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  review_required BOOLEAN DEFAULT FALSE,
  review_date TIMESTAMPTZ,
  
  -- AI embeddings for semantic search (OpenAI embeddings are 1536 dimensions)
  embedding_vector VECTOR(1536),
  embedding_updated_at TIMESTAMPTZ,
  
  -- SEO and discoverability
  meta_description TEXT,
  slug VARCHAR(255),
  external_links TEXT[],
  internal_links UUID[],
  
  -- Metadata and attribution
  created_by UUID REFERENCES support_agents(id),
  last_updated_by UUID REFERENCES support_agents(id),
  approved_by UUID REFERENCES support_agents(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(slug),
  CHECK (helpful_votes >= 0 AND unhelpful_votes >= 0)
);

-- Insert sample knowledge base articles for wedding industry
INSERT INTO support_kb_articles (title, content, summary, category_ids, tags, keywords, is_wedding_related, wedding_stage, applicable_vendor_types, article_type, is_published) VALUES
('How to Create Your First Wedding Client Form', 
'Creating effective wedding client forms is crucial for gathering all necessary information from couples. This comprehensive guide walks you through the process step-by-step...

Step 1: Navigate to Forms
Click on the "Forms" section in your dashboard. You''ll see options to create a new form or use a template.

Step 2: Choose a Template
For wedding photographers, we recommend starting with the "Wedding Photography Client Information" template. This includes fields for:
- Couple names and contact information
- Wedding date and venue details
- Photography package preferences
- Timeline requirements
- Special requests and must-have shots

Step 3: Customize Fields
Add or remove fields based on your specific needs. Popular additions include:
- Engagement session preferences
- Social media sharing permissions
- Family dynamics and VIP list
- Vendor coordination contacts

Step 4: Set Up Notifications
Configure email notifications so you''re instantly alerted when couples submit their information.

Step 5: Embed or Share
You can either embed the form directly on your website or send the direct link to couples.',

'Complete guide for wedding professionals to create effective client information forms with industry-specific fields and best practices.',
ARRAY[(SELECT id FROM support_categories WHERE name = 'Form Builder Issues')],
'{"forms", "wedding", "client", "setup", "beginner"}',
'{"form creation", "wedding form", "client information", "template", "setup"}',
TRUE, 'planning', '{"photographer", "videographer", "planner"}', 'tutorial', TRUE),

('Troubleshooting Wedding Day Technical Issues', 
'When technical issues arise on a wedding day, quick resolution is critical. This guide provides step-by-step troubleshooting for common problems...

CRITICAL: Wedding Day Protocol
If you''re experiencing issues on the actual wedding day, call our emergency hotline immediately: +1 (555) WEDDING (933-3464)

Common Wedding Day Issues:

1. Website Not Loading
- Check internet connection at venue
- Try accessing from mobile data instead of venue WiFi
- Clear browser cache or try incognito mode
- Contact emergency support if issue persists

2. RSVP Form Not Submitting
- Verify all required fields are completed
- Check for character limits in text fields
- Try submitting from a different device/browser
- Have couples submit via alternate method if urgent

3. Guest List Access Issues
- Confirm login credentials
- Check if account has been temporarily suspended
- Verify subscription status
- Use guest list backup if available

4. Mobile Display Problems
- Refresh the page on mobile device
- Check if mobile optimization is enabled
- Test on different mobile browsers
- Switch to desktop version temporarily

Emergency Contacts:
- Technical Emergency: emergency@wedsync.com
- Wedding Day Hotline: +1 (555) WEDDING
- Account Access: access@wedsync.com',

'Emergency troubleshooting guide for technical issues occurring on wedding days, with immediate resolution steps and emergency contact information.',
ARRAY[(SELECT id FROM support_categories WHERE name = 'Wedding Day Emergency'), (SELECT id FROM support_categories WHERE name = 'Technical Bugs')],
'{"wedding day", "emergency", "troubleshooting", "technical", "urgent"}',
'{"wedding day emergency", "technical issues", "troubleshooting", "website down", "access problems"}',
TRUE, 'day_of', '{"photographer", "videographer", "planner", "venue"}', 'troubleshooting', TRUE),

('Understanding Payment and Billing Issues', 
'Payment processing can sometimes encounter issues. Here''s how to identify and resolve common billing problems...

Common Payment Issues:

1. Declined Card
Most common causes:
- Insufficient funds
- Expired card
- International transaction blocks
- Bank fraud protection

Resolution steps:
- Verify card details are correct
- Check with bank about transaction blocks
- Try alternative payment method
- Contact billing support for manual processing

2. Subscription Not Updating
If payment succeeded but subscription shows as unpaid:
- Allow up to 10 minutes for processing
- Check payment method on file
- Verify email confirmation was received
- Contact support with transaction ID

3. Refund Requests
Refund timeline:
- Cancellation within 30 days: Full refund
- Processing time: 3-5 business days
- Refunds return to original payment method

4. Billing Address Mismatches
Ensure billing address exactly matches bank records:
- Include apartment/suite numbers
- Use proper abbreviations
- Match bank statement format

Pro Tips:
- Save receipts for business tax purposes
- Set up billing alerts to avoid expired cards
- Use business credit cards for better expense tracking',

'Comprehensive guide to resolving payment and billing issues, including common causes and step-by-step solutions for wedding professionals.',
ARRAY[(SELECT id FROM support_categories WHERE name = 'Payment & Billing')],
'{"billing", "payment", "subscription", "refund", "card"}',
'{"payment failed", "billing issues", "subscription", "refund", "card declined"}',
FALSE, 'planning', '{}', 'guide', TRUE);

-- Comprehensive support metrics table for analytics and reporting
CREATE TABLE support_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  hour INTEGER CHECK (hour BETWEEN 0 AND 23),
  
  -- Volume metrics
  tickets_created INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_closed INTEGER DEFAULT 0,
  tickets_escalated INTEGER DEFAULT 0,
  tickets_reopened INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_first_response_minutes NUMERIC(10,2),
  avg_resolution_minutes NUMERIC(10,2),
  avg_customer_wait_minutes NUMERIC(10,2),
  sla_breach_count INTEGER DEFAULT 0,
  sla_met_count INTEGER DEFAULT 0,
  sla_compliance_rate NUMERIC(5,4) DEFAULT 0.0000,
  
  -- Wedding-specific metrics
  wedding_day_tickets INTEGER DEFAULT 0,
  wedding_emergency_tickets INTEGER DEFAULT 0,
  weekend_tickets INTEGER DEFAULT 0,
  peak_season_tickets INTEGER DEFAULT 0,
  
  -- Customer satisfaction metrics
  avg_satisfaction_score NUMERIC(3,2),
  satisfaction_response_count INTEGER DEFAULT 0,
  satisfaction_response_rate NUMERIC(5,4) DEFAULT 0.0000,
  nps_score NUMERIC(4,2), -- Net Promoter Score
  
  -- Agent performance metrics
  avg_agent_workload NUMERIC(5,2), -- Average tickets per agent
  agent_utilization_rate NUMERIC(5,4) DEFAULT 0.0000,
  agent_response_consistency NUMERIC(5,4) DEFAULT 0.0000,
  
  -- AI and automation metrics
  ai_auto_categorized INTEGER DEFAULT 0,
  ai_categorization_accuracy NUMERIC(5,4) DEFAULT 0.0000,
  auto_responses_sent INTEGER DEFAULT 0,
  kb_article_views INTEGER DEFAULT 0,
  kb_article_helpfulness_rate NUMERIC(5,4) DEFAULT 0.0000,
  
  -- Channel and source metrics
  web_tickets INTEGER DEFAULT 0,
  email_tickets INTEGER DEFAULT 0,
  chat_tickets INTEGER DEFAULT 0,
  api_tickets INTEGER DEFAULT 0,
  
  -- Business impact metrics
  revenue_impact_tickets INTEGER DEFAULT 0, -- Tickets affecting revenue
  churn_risk_tickets INTEGER DEFAULT 0, -- Tickets from at-risk customers
  escalation_cost_impact NUMERIC(10,2) DEFAULT 0.00, -- Estimated cost of escalations
  
  -- System performance metrics
  avg_page_load_time_ms NUMERIC(8,2),
  system_uptime_percentage NUMERIC(5,4) DEFAULT 1.0000,
  api_response_time_ms NUMERIC(8,2),
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(date, hour),
  CHECK (sla_compliance_rate >= 0.0000 AND sla_compliance_rate <= 1.0000),
  CHECK (satisfaction_response_rate >= 0.0000 AND satisfaction_response_rate <= 1.0000),
  CHECK (system_uptime_percentage >= 0.0000 AND system_uptime_percentage <= 1.0000)
);

-- Add missing fields to existing support_tickets table
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES support_categories(id);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS hours_until_wedding INTEGER;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(3,2) CHECK (ai_confidence_score >= 0.00 AND ai_confidence_score <= 1.00);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_suggested_category_id UUID REFERENCES support_categories(id);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20) CHECK (ai_sentiment IN ('positive', 'neutral', 'negative', 'frustrated', 'urgent'));
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_keywords TEXT[];
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- Add missing fields to support_agents table  
ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';
ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS is_wedding_day_specialist BOOLEAN DEFAULT FALSE;
ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS max_concurrent_tickets INTEGER DEFAULT 10;

-- Add AI analysis fields to ticket_messages
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20);
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS ai_intent VARCHAR(100);

-- Create comprehensive indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_category_priority ON support_tickets(category_id, priority, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_wedding_emergency ON support_tickets(is_wedding_day_issue, priority, wedding_date) WHERE is_wedding_day_issue = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_hours_until_wedding ON support_tickets(hours_until_wedding) WHERE hours_until_wedding IS NOT NULL AND hours_until_wedding <= 48;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_ai_confidence ON support_tickets(ai_confidence_score DESC, category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_session_search ON support_tickets USING GIN (session_data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_categories_wedding_priority ON support_categories(wedding_priority, sla_response_minutes) WHERE wedding_priority = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_categories_ai_keywords ON support_categories USING GIN (ai_keywords);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_sla_configs_tier_category ON support_sla_configs(pricing_tier, category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_escalation_rules_active ON support_escalation_rules(is_active, priority) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_escalation_rules_conditions ON support_escalation_rules USING GIN (conditions);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_escalation_rules_wedding ON support_escalation_rules(wedding_day_only, saturday_priority_boost) WHERE wedding_day_only = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_kb_articles_embedding ON support_kb_articles USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_kb_articles_wedding ON support_kb_articles(is_wedding_related, wedding_stage) WHERE is_wedding_related = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_kb_articles_search ON support_kb_articles USING GIN (to_tsvector('english', title || ' ' || content));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_kb_articles_keywords ON support_kb_articles USING GIN (keywords);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_kb_articles_published ON support_kb_articles(is_published, is_featured) WHERE is_published = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_metrics_date_hour ON support_metrics(date DESC, hour);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_metrics_wedding_emergency ON support_metrics(date, wedding_emergency_tickets DESC) WHERE wedding_emergency_tickets > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_metrics_sla_compliance ON support_metrics(date, sla_compliance_rate) WHERE sla_compliance_rate < 1.0000;

-- Partitioning for support_metrics table (monthly partitions for better performance)
-- CREATE TABLE support_metrics_2025_01 PARTITION OF support_metrics
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Function to automatically calculate hours until wedding
CREATE OR REPLACE FUNCTION calculate_hours_until_wedding(wedding_date_param DATE)
RETURNS INTEGER AS $$
BEGIN
  IF wedding_date_param IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (wedding_date_param::timestamp - CURRENT_TIMESTAMP)) / 3600;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate hours_until_wedding
CREATE OR REPLACE FUNCTION update_hours_until_wedding()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hours_until_wedding = calculate_hours_until_wedding(NEW.wedding_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_hours_until_wedding_trigger
  BEFORE INSERT OR UPDATE OF wedding_date ON support_tickets
  FOR EACH ROW 
  EXECUTE FUNCTION update_hours_until_wedding();

-- Function to generate unique ticket numbers in format WS-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_sequence INTEGER;
  ticket_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9 FOR 4) AS INTEGER)), 0) + 1
  INTO next_sequence
  FROM support_tickets 
  WHERE id LIKE 'WS-' || current_year || '-%';
  
  -- Format: WS-2025-0001
  ticket_number := 'WS-' || current_year || '-' || LPAD(next_sequence::TEXT, 4, '0');
  
  RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Enhanced RLS policies for new tables
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_metrics ENABLE ROW LEVEL SECURITY;

-- Support categories - readable by all authenticated users
CREATE POLICY "Support categories readable by authenticated users" ON support_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- SLA configs - readable by all authenticated users  
CREATE POLICY "SLA configs readable by authenticated users" ON support_sla_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Escalation rules - only support agents and admins can view
CREATE POLICY "Escalation rules for support staff only" ON support_escalation_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_agents WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    )
  );

-- KB articles - published articles readable by all, drafts only by creators
CREATE POLICY "Published KB articles readable by all" ON support_kb_articles
  FOR SELECT USING (
    is_published = TRUE OR 
    created_by IN (SELECT id FROM support_agents WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Support metrics - only accessible by support staff and admins
CREATE POLICY "Support metrics for authorized staff only" ON support_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_agents WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Functions for automated metrics collection
CREATE OR REPLACE FUNCTION collect_hourly_support_metrics()
RETURNS VOID AS $$
DECLARE
  metric_date DATE := CURRENT_DATE;
  metric_hour INTEGER := EXTRACT(HOUR FROM CURRENT_TIMESTAMP);
BEGIN
  -- Insert or update hourly metrics
  INSERT INTO support_metrics (date, hour, tickets_created, tickets_resolved, avg_first_response_minutes, sla_breach_count, wedding_day_tickets)
  SELECT 
    metric_date,
    metric_hour,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    COUNT(*) FILTER (WHERE resolved_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' AND resolved_at IS NOT NULL),
    AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) FILTER (WHERE first_response_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    COUNT(*) FILTER (WHERE sla_breach = TRUE AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    COUNT(*) FILTER (WHERE is_wedding_day_issue = TRUE AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour')
  FROM support_tickets
  ON CONFLICT (date, hour) 
  DO UPDATE SET
    tickets_created = EXCLUDED.tickets_created,
    tickets_resolved = EXCLUDED.tickets_resolved,
    avg_first_response_minutes = EXCLUDED.avg_first_response_minutes,
    sla_breach_count = EXCLUDED.sla_breach_count,
    wedding_day_tickets = EXCLUDED.wedding_day_tickets,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions for new tables
GRANT SELECT ON support_categories TO authenticated;
GRANT SELECT ON support_sla_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_kb_articles TO authenticated;
GRANT SELECT ON support_escalation_rules TO authenticated;
GRANT SELECT ON support_metrics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE support_categories IS 'Hierarchical categorization system for support tickets with wedding industry specialization';
COMMENT ON TABLE support_sla_configs IS 'SLA configuration per pricing tier and category with wedding day overrides';  
COMMENT ON TABLE support_escalation_rules IS 'Complex escalation rules with JSON conditions and wedding-specific triggers';
COMMENT ON TABLE support_kb_articles IS 'Knowledge base with AI embeddings for semantic search and wedding industry content';
COMMENT ON TABLE support_metrics IS 'Comprehensive support metrics for analytics, reporting, and performance tracking';

COMMENT ON COLUMN support_tickets.hours_until_wedding IS 'Automatically calculated hours between ticket creation and wedding date for urgency scoring';
COMMENT ON COLUMN support_tickets.ai_confidence_score IS 'AI model confidence score (0.00-1.00) for ticket categorization accuracy';
COMMENT ON COLUMN support_tickets.ai_sentiment IS 'AI-detected customer sentiment from ticket content';
COMMENT ON COLUMN support_kb_articles.embedding_vector IS 'OpenAI embeddings vector (1536 dimensions) for semantic search';
COMMENT ON FUNCTION generate_ticket_number() IS 'Generates unique ticket numbers in format WS-YYYY-NNNN';
COMMENT ON FUNCTION collect_hourly_support_metrics() IS 'Automated function to collect and store hourly support metrics';

-- Migration completed successfully
-- Database schema ready for WS-235 Support Operations Ticket Management System implementation