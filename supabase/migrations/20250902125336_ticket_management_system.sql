-- WS-235: Support Operations Ticket Management System
-- Migration: 20250902125336_ticket_management_system.sql
-- Description: Complete ticket management system with AI classification, SLA monitoring, and wedding-specific support

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Support agents table
CREATE TABLE support_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  
  -- Skills and specialization
  skills TEXT[] DEFAULT '{}', -- ['form_builder', 'billing', 'technical', 'onboarding', 'ai_support']
  languages TEXT[] DEFAULT '{"en"}',
  expertise_level INTEGER DEFAULT 1 CHECK (expertise_level >= 1 AND expertise_level <= 5),
  
  -- Availability
  timezone TEXT DEFAULT 'UTC',
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]}'::jsonb,
  max_concurrent_tickets INTEGER DEFAULT 10,
  
  -- Performance tracking
  current_ticket_count INTEGER DEFAULT 0,
  total_tickets_handled INTEGER DEFAULT 0,
  avg_first_response_minutes DECIMAL(10,2) DEFAULT 0.0,
  avg_resolution_minutes DECIMAL(10,2) DEFAULT 0.0,
  satisfaction_score DECIMAL(3,2) DEFAULT 0.0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'busy', 'away', 'offline')),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  
  -- Wedding-specific expertise
  wedding_experience_years INTEGER DEFAULT 0,
  specialist_areas TEXT[] DEFAULT '{}', -- ['photography', 'venues', 'catering', 'floristry']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core tickets table  
CREATE TABLE support_tickets (
  id VARCHAR(20) PRIMARY KEY, -- FB-123ABC-XYZ format
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('supplier', 'couple', 'admin')),
  user_tier TEXT NOT NULL CHECK (user_tier IN ('free', 'starter', 'professional', 'scale', 'enterprise')),
  
  -- Ticket content
  subject TEXT NOT NULL CHECK (LENGTH(subject) <= 200),
  description TEXT NOT NULL CHECK (LENGTH(description) <= 10000),
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Classification
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'question', 'feature_request', 'billing', 'onboarding', 'technical')),
  category TEXT NOT NULL CHECK (category IN ('form_builder', 'journey_canvas', 'email_system', 'import_export', 'performance', 'billing', 'subscription', 'refund', 'onboarding', 'training', 'feature_help', 'bug', 'data_loss', 'security', 'integration', 'wedding_day_emergency')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed')),
  
  -- Assignment
  assigned_to UUID REFERENCES support_agents(id) ON DELETE SET NULL,
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
  escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Customer feedback
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  satisfaction_requested_at TIMESTAMPTZ,
  satisfaction_provided_at TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'email', 'chat', 'api', 'phone')),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Wedding-specific fields
  wedding_date DATE,
  is_wedding_day_emergency BOOLEAN DEFAULT FALSE,
  venue_location TEXT,
  
  -- Tracking
  related_tickets TEXT[] DEFAULT '{}',
  duplicate_of VARCHAR(20) REFERENCES support_tickets(id) ON DELETE SET NULL,
  
  -- AI Classification tracking
  ai_classification_confidence DECIMAL(3,2),
  ai_classification_method TEXT,
  ai_suggested_responses TEXT[] DEFAULT '{}',
  
  CONSTRAINT valid_resolution_order CHECK (resolved_at IS NULL OR resolved_at >= first_response_at),
  CONSTRAINT valid_closure_order CHECK (closed_at IS NULL OR closed_at >= resolved_at),
  CONSTRAINT valid_escalation_level CHECK (escalation_level <= 3)
);

-- Ticket messages/responses
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(20) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Message details
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system', 'ai')),
  sender_id UUID, -- agent ID or user ID
  sender_name TEXT,
  message TEXT NOT NULL CHECK (LENGTH(message) <= 50000),
  message_type TEXT DEFAULT 'reply' CHECK (message_type IN ('reply', 'note', 'status_change', 'assignment', 'escalation', 'auto_response')),
  
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
  
  -- AI/automation tracking
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),
  ai_model_version TEXT
);

-- Canned responses/templates
CREATE TABLE support_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('form_builder', 'billing', 'onboarding', 'technical', 'general', 'wedding_day', 'escalation')),
  
  -- Content
  subject_template TEXT,
  content_template TEXT NOT NULL CHECK (LENGTH(content_template) <= 10000),
  variables TEXT[] DEFAULT '{}', -- ['{customer_name}', '{ticket_id}', '{agent_name}']
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  success_rate DECIMAL(5,4) DEFAULT 0.0000, -- Based on customer satisfaction
  
  -- Permissions
  team_restriction TEXT, -- null means available to all
  tier_restriction TEXT, -- null means available for all tiers
  agent_level_required INTEGER DEFAULT 1, -- minimum agent experience level
  
  -- Wedding-specific
  wedding_context_required BOOLEAN DEFAULT FALSE,
  time_sensitive BOOLEAN DEFAULT FALSE, -- For wedding day templates
  
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket classification patterns (for AI training)
CREATE TABLE ticket_classification_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  regex_pattern TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  
  -- Classification results
  predicted_category TEXT NOT NULL,
  predicted_type TEXT NOT NULL,
  predicted_priority TEXT NOT NULL,
  suggested_tags TEXT[] DEFAULT '{}',
  suggested_template TEXT,
  
  -- Accuracy tracking
  usage_count INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,4) DEFAULT 0.0000,
  
  -- Wedding-specific patterns
  wedding_context_keywords TEXT[] DEFAULT '{}', -- ['ceremony', 'reception', 'venue', 'photographer']
  time_sensitivity_indicators TEXT[] DEFAULT '{}', -- ['urgent', 'today', 'now', 'asap']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA tracking and metrics
CREATE TABLE ticket_sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(20) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'first_response', 'resolved', 'escalated', 'sla_warning', 'sla_breach', 'auto_escalated')),
  
  expected_at TIMESTAMPTZ NOT NULL,
  actual_at TIMESTAMPTZ,
  minutes_to_target INTEGER, -- negative means breach
  
  agent_id UUID REFERENCES support_agents(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Wedding context
  is_wedding_day BOOLEAN DEFAULT FALSE,
  wedding_hours_remaining INTEGER, -- Hours until wedding ceremony
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent performance metrics
CREATE TABLE agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES support_agents(id) ON DELETE CASCADE,
  
  -- Time period
  metric_date DATE NOT NULL,
  metric_period TEXT NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
  
  -- Performance data
  tickets_handled INTEGER DEFAULT 0,
  avg_first_response_minutes DECIMAL(10,2),
  avg_resolution_hours DECIMAL(10,2),
  sla_compliance_rate DECIMAL(5,4),
  customer_satisfaction_avg DECIMAL(3,2),
  escalation_rate DECIMAL(5,4),
  
  -- Wedding-specific metrics
  wedding_day_tickets INTEGER DEFAULT 0,
  wedding_day_avg_response_minutes DECIMAL(10,2),
  wedding_emergency_handled INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id, metric_date, metric_period)
);

-- Ticket escalation rules
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  
  -- Conditions
  priority_levels TEXT[] NOT NULL, -- ['critical', 'high']
  user_tiers TEXT[] NOT NULL, -- ['enterprise', 'scale']
  categories TEXT[] DEFAULT '{}', -- ['billing', 'data_loss']
  time_since_created_minutes INTEGER, -- Auto-escalate after X minutes
  time_since_last_response_minutes INTEGER,
  
  -- Actions
  escalate_to_agent_level INTEGER, -- Minimum agent level required
  escalate_to_team TEXT,
  send_notifications_to TEXT[] DEFAULT '{}', -- Email addresses or agent IDs
  auto_assign_to_available BOOLEAN DEFAULT TRUE,
  
  -- Wedding-specific
  wedding_day_override BOOLEAN DEFAULT FALSE, -- Different rules for wedding days
  wedding_hours_threshold INTEGER, -- Hours before wedding to escalate
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-response rules
CREATE TABLE auto_response_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  
  -- Matching conditions
  keywords TEXT[] NOT NULL,
  categories TEXT[] DEFAULT '{}',
  user_tiers TEXT[] DEFAULT '{}',
  time_conditions JSONB DEFAULT '{}'::jsonb, -- Business hours, weekends, etc.
  
  -- Response configuration
  template_id UUID REFERENCES support_templates(id),
  response_delay_minutes INTEGER DEFAULT 0, -- Delay before sending
  max_uses_per_ticket INTEGER DEFAULT 1,
  
  -- Effectiveness tracking
  usage_count INTEGER DEFAULT 0,
  satisfaction_impact DECIMAL(3,2) DEFAULT 0.0,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_tickets_status_priority_created ON support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_tickets_assigned_agent_status ON support_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_user_created ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_tickets_organization_created ON support_tickets(organization_id, created_at DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_tickets_sla_deadlines ON support_tickets(sla_first_response_deadline, sla_resolution_deadline) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_tickets_category_priority_created ON support_tickets(category, priority, created_at DESC);
CREATE INDEX idx_tickets_wedding_emergency ON support_tickets(is_wedding_day_emergency, created_at DESC) WHERE is_wedding_day_emergency = TRUE;
CREATE INDEX idx_tickets_wedding_date ON support_tickets(wedding_date) WHERE wedding_date IS NOT NULL;

CREATE INDEX idx_messages_ticket_created ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_messages_sender ON ticket_messages(sender_type, sender_id);
CREATE INDEX idx_messages_internal ON ticket_messages(is_internal, created_at);

CREATE INDEX idx_agents_skills ON support_agents USING GIN(skills);
CREATE INDEX idx_agents_status_active ON support_agents(status, last_active) WHERE status IN ('active', 'busy');
CREATE INDEX idx_agents_current_workload ON support_agents(current_ticket_count, max_concurrent_tickets);
CREATE INDEX idx_agents_wedding_specialists ON support_agents USING GIN(specialist_areas) WHERE array_length(specialist_areas, 1) > 0;

CREATE INDEX idx_templates_category_team ON support_templates(category, team_restriction);
CREATE INDEX idx_templates_usage ON support_templates(usage_count DESC, success_rate DESC);

CREATE INDEX idx_sla_events_ticket_created ON ticket_sla_events(ticket_id, created_at);
CREATE INDEX idx_sla_events_wedding_day ON ticket_sla_events(is_wedding_day, created_at) WHERE is_wedding_day = TRUE;

CREATE INDEX idx_performance_agent_period ON agent_performance_metrics(agent_id, metric_period, metric_date);

-- Row Level Security (RLS) policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_classification_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sla_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_response_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Support agents can view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
      AND support_agents.status IN ('active', 'busy')
    )
  );

CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Support agents can insert tickets" ON support_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Support agents can update assigned tickets" ON support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
      AND (support_agents.id = support_tickets.assigned_to OR support_agents.expertise_level >= 3)
    )
  );

-- RLS Policies for ticket_messages
CREATE POLICY "Support agents can view all messages" ON ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages from their tickets" ON ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
    AND NOT is_internal
  );

CREATE POLICY "Support agents can insert messages" ON ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
    )
  );

-- RLS Policies for support_agents
CREATE POLICY "Support agents can view all agents" ON support_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_agents sa
      WHERE sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update their own profile" ON support_agents
  FOR UPDATE USING (user_id = auth.uid());

-- Admin-level policies (agents with expertise_level 4-5)
CREATE POLICY "Admin agents can manage templates" ON support_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
      AND support_agents.expertise_level >= 4
    )
  );

CREATE POLICY "Admin agents can manage patterns" ON ticket_classification_patterns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
      AND support_agents.expertise_level >= 4
    )
  );

CREATE POLICY "Admin agents can view all SLA events" ON ticket_sla_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE support_agents.user_id = auth.uid()
      AND support_agents.expertise_level >= 3
    )
  );

-- Functions and triggers for automated maintenance

-- Function to update agent ticket counts
CREATE OR REPLACE FUNCTION update_agent_ticket_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New ticket assigned
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE support_agents 
      SET current_ticket_count = current_ticket_count + 1,
          total_tickets_handled = total_tickets_handled + 1
      WHERE id = NEW.assigned_to;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Assignment changed
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      -- Remove from old agent
      IF OLD.assigned_to IS NOT NULL THEN
        UPDATE support_agents 
        SET current_ticket_count = current_ticket_count - 1
        WHERE id = OLD.assigned_to;
      END IF;
      -- Add to new agent
      IF NEW.assigned_to IS NOT NULL THEN
        UPDATE support_agents 
        SET current_ticket_count = current_ticket_count + 1,
            total_tickets_handled = total_tickets_handled + 1
        WHERE id = NEW.assigned_to;
      END IF;
    END IF;
    
    -- Ticket closed/resolved
    IF OLD.status NOT IN ('resolved', 'closed') AND NEW.status IN ('resolved', 'closed') THEN
      IF NEW.assigned_to IS NOT NULL THEN
        UPDATE support_agents 
        SET current_ticket_count = current_ticket_count - 1
        WHERE id = NEW.assigned_to;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update agent counts
CREATE TRIGGER trigger_update_agent_ticket_count
  AFTER INSERT OR UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_ticket_count();

-- Function to update last_update_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_update_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ticket timestamp on changes
CREATE TRIGGER trigger_update_ticket_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_timestamp();

-- Function to check and update SLA breach status
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if first response SLA is breached
  IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
    IF NEW.first_response_at > NEW.sla_first_response_deadline THEN
      NEW.sla_breach = TRUE;
      -- Log SLA event
      INSERT INTO ticket_sla_events (ticket_id, event_type, expected_at, actual_at, minutes_to_target)
      VALUES (
        NEW.id, 
        'sla_breach', 
        NEW.sla_first_response_deadline, 
        NEW.first_response_at,
        EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.sla_first_response_deadline)) / 60
      );
    ELSE
      -- Log successful first response
      INSERT INTO ticket_sla_events (ticket_id, event_type, expected_at, actual_at, minutes_to_target)
      VALUES (
        NEW.id, 
        'first_response', 
        NEW.sla_first_response_deadline, 
        NEW.first_response_at,
        EXTRACT(EPOCH FROM (NEW.sla_first_response_deadline - NEW.first_response_at)) / 60
      );
    END IF;
  END IF;
  
  -- Check resolution SLA breach
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    IF NEW.resolved_at > NEW.sla_resolution_deadline THEN
      NEW.sla_breach = TRUE;
      -- Log resolution SLA breach
      INSERT INTO ticket_sla_events (ticket_id, event_type, expected_at, actual_at, minutes_to_target)
      VALUES (
        NEW.id, 
        'sla_breach', 
        NEW.sla_resolution_deadline, 
        NEW.resolved_at,
        EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.sla_resolution_deadline)) / 60
      );
    ELSE
      -- Log successful resolution
      INSERT INTO ticket_sla_events (ticket_id, event_type, expected_at, actual_at, minutes_to_target)
      VALUES (
        NEW.id, 
        'resolved', 
        NEW.sla_resolution_deadline, 
        NEW.resolved_at,
        EXTRACT(EPOCH FROM (NEW.sla_resolution_deadline - NEW.resolved_at)) / 60
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for SLA monitoring
CREATE TRIGGER trigger_check_sla_breach
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION check_sla_breach();

-- Insert default support templates
INSERT INTO support_templates (template_key, name, category, subject_template, content_template, variables, wedding_context_required, time_sensitive) VALUES
('welcome_response', 'Initial Acknowledgment', 'general', 'Re: {subject} - Ticket #{ticket_id}', 
 'Hi {customer_name},

Thank you for contacting WedSync support. I''ve received your request about "{subject}" and have assigned ticket #{ticket_id} to track this issue.

I''ll review your case and respond within {sla_response_time} with next steps or a resolution.

If this is urgent and related to an upcoming wedding, please let me know the wedding date so I can prioritize accordingly.

Best regards,
{agent_name}
WedSync Support Team', 
 ARRAY['{customer_name}', '{subject}', '{ticket_id}', '{sla_response_time}', '{agent_name}'], FALSE, FALSE),

('form_troubleshooting', 'Form Builder Issues', 'form_builder', 'Form Builder Solution - Ticket #{ticket_id}',
 'Hi {customer_name},

I''ve investigated the form issue you reported in ticket #{ticket_id}. Here are the steps to resolve this:

1. Clear your browser cache and cookies
2. Try using an incognito/private browsing window
3. Ensure you''re using a supported browser (Chrome, Firefox, Safari, Edge)
4. Check that JavaScript is enabled

If the issue persists after trying these steps, please let me know:
- Which browser and version you''re using
- The exact error message you''re seeing
- When this issue started occurring

I''ll investigate further and provide a solution within {sla_resolution_time}.

Best regards,
{agent_name}', 
 ARRAY['{customer_name}', '{ticket_id}', '{sla_resolution_time}', '{agent_name}'], FALSE, FALSE),

('wedding_day_emergency', 'Wedding Day Emergency Response', 'wedding_day', 'URGENT: Wedding Day Support - Ticket #{ticket_id}',
 'Hi {customer_name},

I understand you''re experiencing an urgent issue on your wedding day. This is now our top priority.

I''ve immediately escalated your ticket #{ticket_id} to our wedding day emergency team. A senior technician will contact you within the next 15 minutes.

In the meantime:
- Keep this email thread open for updates
- If possible, try accessing WedSync from a different device/browser
- Have a backup contact method ready (phone number below)

Emergency contact: {emergency_phone}

We will resolve this quickly so your special day goes smoothly.

Urgent regards,
{agent_name}
WedSync Emergency Support', 
 ARRAY['{customer_name}', '{ticket_id}', '{agent_name}', '{emergency_phone}'], TRUE, TRUE),

('billing_issue_help', 'Billing Issue Resolution', 'billing', 'Billing Support - Ticket #{ticket_id}',
 'Hi {customer_name},

I''ve received your billing inquiry in ticket #{ticket_id} and I''m here to help resolve this quickly.

To assist you better, I''ve reviewed your account and can see your current subscription details. 

{billing_context}

If you need immediate assistance with:
- Payment failures: I can retry the payment or update your payment method
- Refund requests: I can process these within 3-5 business days  
- Subscription changes: I can upgrade/downgrade your plan immediately

Please reply with the specific action you''d like me to take, or let me know if you have any questions.

Best regards,
{agent_name}
WedSync Billing Support', 
 ARRAY['{customer_name}', '{ticket_id}', '{billing_context}', '{agent_name}'], FALSE, FALSE);

-- Insert default classification patterns
INSERT INTO ticket_classification_patterns (pattern_name, regex_pattern, keywords, predicted_category, predicted_type, predicted_priority, suggested_tags, wedding_context_keywords) VALUES
('form_save_error', 'form.*(not|won''t|can''t|isn''t).*(sav|submit|work)', ARRAY['form', 'save', 'error', 'not working', 'submit'], 'form_builder', 'bug', 'high', ARRAY['forms', 'data_loss'], ARRAY['client form', 'guest list', 'rsvp']),
('payment_failed', 'payment.*(fail|decline|error)|card.*(decline|reject)|billing.*(issue|problem)', ARRAY['payment', 'failed', 'declined', 'billing', 'charge'], 'billing', 'billing', 'critical', ARRAY['payment', 'urgent', 'revenue_impact'], ARRAY['wedding payment', 'deposit', 'final payment']),
('cannot_access', 'cannot.*(access|login|get into)|can''t.*(access|login|get in)|unable.*(access|login)', ARRAY['cannot access', 'locked out', 'login', 'password'], 'onboarding', 'technical', 'high', ARRAY['access', 'login', 'urgent'], ARRAY['supplier portal', 'client dashboard']),
('wedding_day_emergency', 'wedding.*(today|tomorrow|this weekend)|urgent.*(ceremony|reception)|live.*(event|wedding)', ARRAY['wedding today', 'urgent', 'ceremony', 'reception', 'live event'], 'wedding_day_emergency', 'technical', 'critical', ARRAY['wedding_day', 'emergency', 'time_sensitive'], ARRAY['ceremony', 'reception', 'venue', 'live wedding']),
('data_missing', 'data.*(missing|lost|gone|disappeared)|lost.*(client|guest|form)', ARRAY['data lost', 'missing', 'disappeared', 'gone'], 'data_loss', 'bug', 'critical', ARRAY['data_loss', 'critical', 'escalate'], ARRAY['guest list', 'client data', 'wedding details']);

-- Insert default escalation rules
INSERT INTO escalation_rules (rule_name, priority_levels, user_tiers, time_since_created_minutes, escalate_to_agent_level, wedding_day_override) VALUES
('Critical Enterprise Escalation', ARRAY['critical'], ARRAY['enterprise'], 30, 4, TRUE),
('Wedding Day Emergency', ARRAY['critical', 'high'], ARRAY['professional', 'scale', 'enterprise'], 15, 5, TRUE),
('High Priority Scale Tier', ARRAY['high'], ARRAY['scale'], 60, 3, FALSE),
('Data Loss Immediate', ARRAY['critical'], ARRAY['starter', 'professional', 'scale', 'enterprise'], 15, 4, TRUE);

COMMENT ON TABLE support_tickets IS 'Core ticket tracking with AI classification and wedding-specific features';
COMMENT ON TABLE support_agents IS 'Support team members with skills, workload tracking, and wedding expertise';
COMMENT ON TABLE ticket_messages IS 'Complete message history with AI response tracking';
COMMENT ON TABLE support_templates IS 'Canned responses with usage analytics and wedding context';
COMMENT ON TABLE ticket_classification_patterns IS 'AI training patterns for wedding industry support';
COMMENT ON TABLE ticket_sla_events IS 'SLA tracking and breach monitoring with wedding day awareness';
COMMENT ON TABLE agent_performance_metrics IS 'Comprehensive agent performance tracking including wedding-specific metrics';
COMMENT ON TABLE escalation_rules IS 'Automated escalation rules with wedding day overrides';
COMMENT ON TABLE auto_response_rules IS 'Intelligent auto-response system configuration';