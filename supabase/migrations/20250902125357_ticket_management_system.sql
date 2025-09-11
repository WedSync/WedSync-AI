-- WS-235: Support Operations Ticket Management System
-- Migration: Complete ticket management schema with AI classification, SLA monitoring, and wedding industry specifics
-- Generated: 2025-09-02 Team E Implementation

-- Support agents table
CREATE TABLE support_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  agent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Skills and specialization
  skills TEXT[] DEFAULT '{}', -- ['form_builder', 'billing', 'technical']
  languages TEXT[] DEFAULT '{"en"}',
  expertise_level INTEGER DEFAULT 1 CHECK (expertise_level >= 1 AND expertise_level <= 5),
  team TEXT DEFAULT 'general',
  
  -- Availability
  timezone TEXT DEFAULT 'UTC',
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}'::jsonb,
  max_concurrent_tickets INTEGER DEFAULT 10,
  
  -- Performance tracking
  current_ticket_count INTEGER DEFAULT 0,
  total_tickets_handled INTEGER DEFAULT 0,
  avg_first_response_minutes DECIMAL(10,2),
  avg_resolution_minutes DECIMAL(10,2),
  satisfaction_score DECIMAL(3,2),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'busy', 'away', 'offline')),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core tickets table with wedding industry specific fields
CREATE TABLE support_tickets (
  id VARCHAR(20) PRIMARY KEY, -- FB-123ABC-XYZ format
  user_id UUID REFERENCES auth.users(id),
  user_type TEXT NOT NULL CHECK (user_type IN ('supplier', 'couple')),
  user_tier TEXT NOT NULL CHECK (user_tier IN ('free', 'starter', 'professional', 'scale', 'enterprise')),
  
  -- Ticket content
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Classification
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'question', 'feature_request', 'billing', 'onboarding', 'technical')),
  category TEXT NOT NULL CHECK (category IN ('form_builder', 'journey_canvas', 'email_system', 'import_export', 'performance', 'billing', 'subscription', 'refund', 'onboarding', 'training', 'feature_help', 'bug', 'data_loss', 'security', 'integration')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed')),
  
  -- Assignment
  assigned_to UUID REFERENCES support_agents(id),
  assigned_team TEXT,
  assigned_at TIMESTAMPTZ,
  
  -- Timing and SLA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  last_update_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  sla_first_response_minutes INTEGER NOT NULL,
  sla_resolution_minutes INTEGER NOT NULL,
  sla_first_response_deadline TIMESTAMPTZ NOT NULL,
  sla_resolution_deadline TIMESTAMPTZ NOT NULL,
  sla_breach BOOLEAN DEFAULT FALSE,
  
  -- Escalation
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Customer feedback
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  satisfaction_requested_at TIMESTAMPTZ,
  satisfaction_provided_at TIMESTAMPTZ,
  
  -- Wedding industry specific metadata
  wedding_date DATE,
  vendor_type TEXT CHECK (vendor_type IN ('photographer', 'videographer', 'dj', 'florist', 'caterer', 'venue', 'planner', 'other')),
  is_wedding_day_emergency BOOLEAN DEFAULT FALSE,
  urgency_score INTEGER DEFAULT 5 CHECK (urgency_score >= 1 AND urgency_score <= 10),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'email', 'chat', 'api')),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Tracking
  related_tickets TEXT[],
  duplicate_of VARCHAR(20) REFERENCES support_tickets(id),
  
  CONSTRAINT valid_resolution_order CHECK (resolved_at IS NULL OR resolved_at >= first_response_at),
  CONSTRAINT valid_closure_order CHECK (closed_at IS NULL OR closed_at >= resolved_at)
);

-- Ticket messages/responses
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(20) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Message details
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_id UUID, -- agent ID or user ID
  sender_name TEXT,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'reply' CHECK (message_type IN ('reply', 'note', 'status_change', 'assignment')),
  
  -- Content
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal BOOLEAN DEFAULT FALSE,
  is_automated BOOLEAN DEFAULT FALSE,
  template_used TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  edit_history JSONB DEFAULT '[]'::jsonb,
  
  -- Status impact
  status_change_from TEXT,
  status_change_to TEXT,
  
  -- Notification tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  read_by_customer BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- Canned responses/templates for wedding industry
CREATE TABLE support_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Content with wedding industry context
  subject_template TEXT,
  content_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- ['{customer_name}', '{ticket_id}', '{wedding_date}', '{vendor_type}']
  
  -- Wedding industry specific templates
  is_wedding_specific BOOLEAN DEFAULT FALSE,
  applicable_vendor_types TEXT[] DEFAULT '{}',
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  
  -- Permissions
  team_restriction TEXT, -- null means available to all
  tier_restriction TEXT, -- null means available for all tiers
  skill_requirement TEXT,
  
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Classification patterns for wedding industry
CREATE TABLE ticket_classification_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  regex_pattern TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  
  -- Classification results
  predicted_category TEXT NOT NULL,
  predicted_type TEXT NOT NULL,
  predicted_priority TEXT NOT NULL,
  predicted_vendor_type TEXT,
  suggested_tags TEXT[] DEFAULT '{}',
  suggested_template TEXT,
  
  -- Wedding industry context
  is_wedding_emergency BOOLEAN DEFAULT FALSE,
  wedding_season_adjustment BOOLEAN DEFAULT FALSE,
  
  -- Accuracy tracking
  usage_count INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  incorrect_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,4) DEFAULT 0.0000,
  
  -- AI model details
  ai_model_version TEXT DEFAULT 'pattern_match',
  confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA tracking and metrics
CREATE TABLE ticket_sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(20) NOT NULL REFERENCES support_tickets(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'first_response', 'resolved', 'escalated', 'sla_warning', 'sla_breach')),
  
  expected_at TIMESTAMPTZ NOT NULL,
  actual_at TIMESTAMPTZ,
  minutes_to_target INTEGER, -- negative means breach
  
  agent_id UUID REFERENCES support_agents(id),
  notification_sent BOOLEAN DEFAULT FALSE,
  escalation_triggered BOOLEAN DEFAULT FALSE,
  
  -- Wedding context for SLA adjustments
  wedding_context JSONB DEFAULT '{}'::jsonb,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-response triggers and conditions
CREATE TABLE auto_response_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  
  -- Trigger conditions
  priority_match TEXT[] DEFAULT '{}',
  category_match TEXT[] DEFAULT '{}',
  keyword_triggers TEXT[] DEFAULT '{}',
  user_tier_match TEXT[] DEFAULT '{}',
  
  -- Response configuration
  template_id UUID REFERENCES support_templates(id),
  delay_minutes INTEGER DEFAULT 0,
  
  -- Wedding specific conditions
  wedding_day_only BOOLEAN DEFAULT FALSE,
  vendor_type_match TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket escalation history
CREATE TABLE ticket_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(20) NOT NULL REFERENCES support_tickets(id),
  
  escalated_from UUID REFERENCES support_agents(id),
  escalated_to UUID REFERENCES support_agents(id),
  escalation_level INTEGER NOT NULL,
  escalation_reason TEXT NOT NULL,
  escalation_type TEXT DEFAULT 'manual' CHECK (escalation_type IN ('manual', 'automatic', 'sla_breach')),
  
  priority_before TEXT,
  priority_after TEXT,
  
  resolved_in_minutes INTEGER,
  was_successful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding season calendar for SLA adjustments
CREATE TABLE wedding_season_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name TEXT NOT NULL, -- 'summer_peak', 'spring_busy', etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- SLA adjustments during busy season
  sla_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 0.5 for faster, 1.5 for slower
  auto_escalation_threshold INTEGER DEFAULT 30, -- minutes
  
  -- Weekend wedding handling
  weekend_emergency_mode BOOLEAN DEFAULT FALSE,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for ticket operations
CREATE INDEX idx_tickets_status_priority ON support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_tickets_assigned_agent ON support_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_user_created ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_tickets_sla_deadlines ON support_tickets(sla_first_response_deadline, sla_resolution_deadline) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_tickets_category_priority ON support_tickets(category, priority, created_at DESC);
CREATE INDEX idx_tickets_wedding_emergency ON support_tickets(is_wedding_day_emergency, priority, created_at DESC) WHERE is_wedding_day_emergency = TRUE;
CREATE INDEX idx_tickets_wedding_date ON support_tickets(wedding_date) WHERE wedding_date IS NOT NULL;

CREATE INDEX idx_messages_ticket_created ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_messages_sender ON ticket_messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_unread ON ticket_messages(ticket_id, read_by_customer) WHERE read_by_customer = FALSE;

CREATE INDEX idx_agents_skills ON support_agents USING GIN(skills);
CREATE INDEX idx_agents_status ON support_agents(status, current_ticket_count);
CREATE INDEX idx_agents_performance ON support_agents(satisfaction_score DESC, avg_first_response_minutes ASC);

CREATE INDEX idx_templates_category ON support_templates(category, team_restriction);
CREATE INDEX idx_templates_wedding ON support_templates(is_wedding_specific, applicable_vendor_types);

CREATE INDEX idx_sla_events_ticket ON ticket_sla_events(ticket_id, created_at DESC);
CREATE INDEX idx_sla_breach_alert ON ticket_sla_events(event_type, created_at DESC) WHERE event_type IN ('sla_warning', 'sla_breach');

CREATE INDEX idx_patterns_accuracy ON ticket_classification_patterns(accuracy_rate DESC, usage_count DESC);

-- Full-text search indexes for ticket content
CREATE INDEX idx_tickets_search ON support_tickets USING gin(to_tsvector('english', subject || ' ' || description));
CREATE INDEX idx_messages_search ON ticket_messages USING gin(to_tsvector('english', message));

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_ticket_last_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets SET last_update_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_message_update_trigger
  AFTER INSERT ON ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_last_update();

-- Trigger for updating agent ticket counts
CREATE OR REPLACE FUNCTION update_agent_ticket_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- Decrease count for old agent
    IF OLD.assigned_to IS NOT NULL THEN
      UPDATE support_agents 
      SET current_ticket_count = current_ticket_count - 1 
      WHERE id = OLD.assigned_to;
    END IF;
    
    -- Increase count for new agent
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE support_agents 
      SET current_ticket_count = current_ticket_count + 1 
      WHERE id = NEW.assigned_to;
    END IF;
  END IF;
  
  -- Handle status changes that affect workload
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
      -- Ticket closed - decrease agent workload
      IF NEW.assigned_to IS NOT NULL THEN
        UPDATE support_agents 
        SET current_ticket_count = current_ticket_count - 1,
            total_tickets_handled = total_tickets_handled + 1
        WHERE id = NEW.assigned_to;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_agent_count_trigger
  AFTER UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_agent_ticket_count();

-- Function to calculate SLA breach status
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
  -- Check first response SLA
  IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
    IF NEW.first_response_at > NEW.sla_first_response_deadline THEN
      NEW.sla_breach = TRUE;
      INSERT INTO ticket_sla_events (ticket_id, event_type, expected_at, actual_at, minutes_to_target)
      VALUES (NEW.id, 'sla_breach', NEW.sla_first_response_deadline, NEW.first_response_at, 
              EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.sla_first_response_deadline))/60);
    END IF;
  END IF;
  
  -- Check resolution SLA
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    IF NEW.resolved_at > NEW.sla_resolution_deadline THEN
      NEW.sla_breach = TRUE;
      INSERT INTO ticket_sla_events (ticket_id, event_type, expected_at, actual_at, minutes_to_target)
      VALUES (NEW.id, 'sla_breach', NEW.sla_resolution_deadline, NEW.resolved_at, 
              EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.sla_resolution_deadline))/60);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sla_breach_check_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION check_sla_breach();

-- Insert default support agents
INSERT INTO support_agents (agent_name, email, skills, team, expertise_level) VALUES
('Technical Lead', 'tech@wedsync.com', '{"technical", "form_builder", "performance", "debugging"}', 'technical', 5),
('Billing Specialist', 'billing@wedsync.com', '{"billing", "payments", "refunds", "subscription"}', 'billing', 4),
('Customer Success', 'success@wedsync.com', '{"onboarding", "training", "customer_success"}', 'success', 3),
('Wedding Expert', 'wedding@wedsync.com', '{"wedding_planning", "vendor_relations", "event_coordination"}', 'wedding', 4),
('General Support', 'support@wedsync.com', '{"general", "feature_help"}', 'general', 2);

-- Insert default classification patterns for wedding industry
INSERT INTO ticket_classification_patterns (pattern_name, regex_pattern, keywords, predicted_category, predicted_type, predicted_priority, suggested_tags, is_wedding_emergency) VALUES
('Form Save Error', 'form.*(not|won''t|can''t|isn''t).*(sav|submit|work)', '{"form", "save", "error", "not working", "submit"}', 'form_builder', 'bug', 'high', '{"forms", "data_loss"}', FALSE),
('Payment Failed', 'payment.*(fail|decline|error)|card.*(decline|reject)|billing.*(issue|problem)', '{"payment", "failed", "declined", "billing", "charge"}', 'billing', 'billing', 'critical', '{"payment", "urgent", "revenue_impact"}', FALSE),
('Cannot Access', 'cannot.*(access|login|get into)|can''t.*(access|login|get in)|unable.*(access|login)', '{"cannot access", "locked out", "login", "password"}', 'onboarding', 'technical', 'high', '{"access", "login", "urgent"}', FALSE),
('Data Missing', 'data.*(missing|lost|gone|disappeared)|lost.*(client|guest|form)', '{"data lost", "missing", "disappeared", "gone"}', 'data_loss', 'bug', 'critical', '{"data_loss", "critical", "escalate"}', FALSE),
('Wedding Day Emergency', 'wedding.*(today|tomorrow|this weekend)|urgent.*(ceremony|reception)|live.*(event|wedding)', '{"wedding today", "urgent", "ceremony", "reception", "live event"}', 'bug', 'technical', 'critical', '{"wedding_day", "emergency", "time_sensitive"}', TRUE),
('Slow Performance', 'slow|lag|freez|stuck|loading.*(forever|long)|timeout', '{"slow", "lagging", "stuck", "loading"}', 'performance', 'bug', 'medium', '{"performance", "user_experience"}', FALSE);

-- Insert wedding industry support templates
INSERT INTO support_templates (template_key, name, category, subject_template, content_template, variables, is_wedding_specific, applicable_vendor_types) VALUES
('wedding_day_emergency', 'Wedding Day Emergency Response', 'bug', 'URGENT: Wedding Day Support - {ticket_id}', 
'Hi {customer_name},

I understand you''re experiencing an issue on your wedding day - this is our absolute top priority. I''ve immediately escalated your ticket to our emergency response team.

Our technical team is investigating this issue right now and I will personally ensure you get a resolution within the next 15 minutes.

Wedding Day Emergency Hotline: +1 (555) 123-4567
Direct Contact: {agent_email}

Your wedding is important to us, and we will not let technical issues disrupt your special day.

Best regards,
{agent_name}
WedSync Emergency Response Team', 
'{"customer_name", "ticket_id", "agent_name", "agent_email"}', TRUE, '{"photographer", "videographer", "planner", "venue"}'),

('form_troubleshooting', 'Form Issues Resolution', 'form_builder', 'Form Issues - We''re Here to Help - {ticket_id}', 
'Hi {customer_name},

I see you''re having trouble with your forms - I completely understand how frustrating this must be, especially when you need to collect important information from your wedding clients.

I''m looking into this right away and will have an update for you within the next 30 minutes. In the meantime, here are a few quick things to try:

1. Clear your browser cache and cookies
2. Try using an incognito/private browser window
3. Ensure you''re using the latest version of Chrome or Firefox

I''ve also checked your account and can see {form_count} active forms. Your data is safe and secure.

Best regards,
{agent_name}', 
'{"customer_name", "ticket_id", "agent_name", "form_count"}', TRUE, '{"photographer", "planner"}'),

('payment_failure_help', 'Payment Issue Resolution', 'billing', 'Payment Issue Resolved - {ticket_id}', 
'Hi {customer_name},

I see there was an issue with your payment - don''t worry, this happens sometimes and we''re here to help resolve it quickly.

I''ve checked your account and can see the payment attempt for your {subscription_tier} subscription. Here''s what I''m doing to fix this:

1. Verifying the payment method details
2. Checking for any temporary bank holds
3. Ensuring your account remains active during resolution

Your account will remain fully functional while we resolve this payment issue. No disruption to your wedding planning!

If you need to update your payment method, you can do so here: {payment_update_link}

Best regards,
{agent_name}
WedSync Billing Team', 
'{"customer_name", "ticket_id", "subscription_tier", "payment_update_link", "agent_name"}', FALSE, '{}'),

('data_recovery', 'Data Recovery Support', 'data_loss', 'URGENT: Data Recovery in Progress - {ticket_id}', 
'Hi {customer_name},

I understand you''re concerned about missing data - this is extremely serious and I want to assure you that we have multiple backup systems in place to protect your wedding information.

I''ve immediately started our data recovery process and have escalated this to our senior technical team. Here''s what''s happening:

1. Checking our hourly backup systems
2. Verifying database integrity
3. Cross-referencing with our redundant storage

Initial timeline: I expect to have your data restored within the next 2 hours.

I will update you every 30 minutes until this is completely resolved.

Emergency contact: {agent_phone}

Best regards,
{agent_name}
Senior Data Recovery Specialist', 
'{"customer_name", "ticket_id", "agent_name", "agent_phone"}', TRUE, '{"photographer", "planner", "venue"}');

-- Insert default wedding season calendar
INSERT INTO wedding_season_calendar (season_name, start_date, end_date, sla_multiplier, auto_escalation_threshold, weekend_emergency_mode) VALUES
('Spring Wedding Season', '2025-04-01', '2025-05-31', 0.75, 20, TRUE),
('Summer Peak Season', '2025-06-01', '2025-09-30', 0.5, 15, TRUE),
('Fall Wedding Season', '2025-10-01', '2025-11-30', 0.8, 25, TRUE),
('Holiday Season', '2025-12-15', '2025-12-31', 0.6, 15, TRUE);

-- Insert auto-response rules for common scenarios
INSERT INTO auto_response_rules (rule_name, priority_match, category_match, template_id, delay_minutes, is_active) VALUES
('Wedding Day Emergency Auto-Response', '{"critical"}', '{"bug"}', (SELECT id FROM support_templates WHERE template_key = 'wedding_day_emergency'), 0, TRUE),
('Payment Failure Immediate Response', '{"critical"}', '{"billing"}', (SELECT id FROM support_templates WHERE template_key = 'payment_failure_help'), 2, TRUE),
('Form Issues Quick Help', '{"high"}', '{"form_builder"}', (SELECT id FROM support_templates WHERE template_key = 'form_troubleshooting'), 5, TRUE);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_messages TO authenticated;
GRANT SELECT ON support_templates TO authenticated;
GRANT SELECT ON support_agents TO authenticated;
GRANT SELECT ON ticket_classification_patterns TO authenticated;
GRANT SELECT, INSERT ON ticket_sla_events TO authenticated;
GRANT SELECT ON wedding_season_calendar TO authenticated;

-- RLS Policies for multi-tenant security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets 
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Agents can see assigned tickets and tickets in their team
CREATE POLICY "Agents can view assigned tickets" ON support_tickets 
  FOR ALL USING (
    assigned_to IN (SELECT id FROM support_agents WHERE user_id = auth.uid())
    OR assigned_team IN (SELECT team FROM support_agents WHERE user_id = auth.uid())
  );

-- Admin users can see all tickets
CREATE POLICY "Admin can view all tickets" ON support_tickets 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Similar policies for messages
CREATE POLICY "Users can view own ticket messages" ON ticket_messages 
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

CREATE POLICY "Agents can view assigned ticket messages" ON ticket_messages 
  FOR ALL USING (
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE assigned_to IN (SELECT id FROM support_agents WHERE user_id = auth.uid())
      OR assigned_team IN (SELECT team FROM support_agents WHERE user_id = auth.uid())
    )
  );

-- Comments for documentation
COMMENT ON TABLE support_tickets IS 'Core ticket management with wedding industry specific fields and SLA tracking';
COMMENT ON TABLE support_agents IS 'Support team members with skills, availability, and performance metrics';
COMMENT ON TABLE ticket_messages IS 'All communications and internal notes for tickets with read tracking';
COMMENT ON TABLE support_templates IS 'Canned responses optimized for wedding industry scenarios';
COMMENT ON TABLE ticket_classification_patterns IS 'AI/ML patterns for automatic ticket classification and prioritization';
COMMENT ON TABLE ticket_sla_events IS 'SLA monitoring events and breach tracking with notifications';
COMMENT ON TABLE wedding_season_calendar IS 'Wedding season definitions for SLA adjustments and emergency handling';

-- Migration completed successfully
-- Ready for WS-235 Ticket Management System implementation