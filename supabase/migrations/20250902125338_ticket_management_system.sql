-- WS-235: Support Operations Ticket Management System
-- Migration: 20250902125338_ticket_management_system.sql
-- Description: Creates comprehensive ticket management system for WedSync support operations

-- Core tickets table
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

-- Ticket messages/responses
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(20) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Message details
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_id UUID, -- agent ID or user ID
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'reply' CHECK (message_type IN ('reply', 'note', 'status_change', 'assignment')),
  
  -- Content
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal BOOLEAN DEFAULT FALSE,
  is_automated BOOLEAN DEFAULT FALSE,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  edit_history JSONB DEFAULT '[]'::jsonb,
  
  -- Status impact
  status_change_from TEXT,
  status_change_to TEXT
);

-- Canned responses/templates
CREATE TABLE support_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Content
  subject_template TEXT,
  content_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- ['{customer_name}', '{ticket_id}']
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  
  -- Permissions
  team_restriction TEXT, -- null means available to all
  tier_restriction TEXT, -- null means available for all tiers
  
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
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tickets_status_priority ON support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_tickets_assigned_agent ON support_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_user_created ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_tickets_sla_deadlines ON support_tickets(sla_first_response_deadline, sla_resolution_deadline) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_tickets_category_priority ON support_tickets(category, priority, created_at DESC);
CREATE INDEX idx_messages_ticket_created ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_agents_skills ON support_agents USING GIN(skills);
CREATE INDEX idx_templates_category ON support_templates(category, team_restriction);

-- Insert initial support agent (for testing/demo)
INSERT INTO support_agents (
  agent_name, 
  email, 
  skills, 
  languages, 
  expertise_level,
  status
) VALUES 
(
  'Admin Support', 
  'support@wedsync.com', 
  '{"technical", "billing", "form_builder", "onboarding"}',
  '{"en"}',
  5,
  'active'
);

-- Insert wedding-specific classification patterns
INSERT INTO ticket_classification_patterns (
  pattern_name,
  regex_pattern,
  keywords,
  predicted_category,
  predicted_type,
  predicted_priority,
  suggested_tags,
  suggested_template
) VALUES 
(
  'form_save_error',
  'form.*(not|won''t|can''t|isn''t).*(sav|submit|work)',
  '{"form", "save", "error", "not working", "submit"}',
  'form_builder',
  'bug',
  'high',
  '{"forms", "data_loss"}',
  'form_troubleshooting'
),
(
  'payment_failed',
  'payment.*(fail|decline|error)|card.*(decline|reject)|billing.*(issue|problem)',
  '{"payment", "failed", "declined", "billing", "charge"}',
  'billing',
  'billing',
  'critical',
  '{"payment", "urgent", "revenue_impact"}',
  'payment_failure_help'
),
(
  'cannot_access',
  'cannot.*(access|login|get into)|can''t.*(access|login|get in)|unable.*(access|login)',
  '{"cannot access", "locked out", "login", "password"}',
  'onboarding',
  'technical',
  'high',
  '{"access", "login", "urgent"}',
  'access_recovery'
),
(
  'data_missing',
  'data.*(missing|lost|gone|disappeared)|lost.*(client|guest|form)',
  '{"data lost", "missing", "disappeared", "gone"}',
  'data_loss',
  'bug',
  'critical',
  '{"data_loss", "critical", "escalate"}',
  'data_recovery'
),
(
  'wedding_day_emergency',
  'wedding.*(today|tomorrow|this weekend)|urgent.*(ceremony|reception)|live.*(event|wedding)',
  '{"wedding today", "urgent", "ceremony", "reception", "live event"}',
  'bug',
  'technical',
  'critical',
  '{"wedding_day", "emergency", "time_sensitive"}',
  'wedding_day_support'
),
(
  'slow_performance',
  'slow|lag|freez|stuck|loading.*(forever|long)|timeout',
  '{"slow", "lagging", "stuck", "loading"}',
  'performance',
  'bug',
  'medium',
  '{"performance", "user_experience"}',
  'performance_tips'
);

-- Insert initial support templates
INSERT INTO support_templates (
  template_key,
  name,
  category,
  subject_template,
  content_template,
  variables,
  created_by
) VALUES 
(
  'form_troubleshooting',
  'Form Issues - Troubleshooting Steps',
  'form_builder',
  'Re: {ticket_subject} - Troubleshooting Steps',
  'Hi {customer_name},

Thank you for contacting WedSync support regarding the form issue you''re experiencing.

I understand you''re having trouble with {form_issue_details}. Let''s get this resolved quickly for you.

**Immediate troubleshooting steps:**

1. **Clear your browser cache and cookies**
   - For Chrome: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
   - Select "All time" and clear browsing data

2. **Try a different browser**
   - Test with Chrome, Firefox, or Safari
   - Use an incognito/private window

3. **Check your internet connection**
   - Ensure you have a stable connection
   - Try refreshing the page

4. **Disable browser extensions**
   - Ad blockers can sometimes interfere with forms

If these steps don''t resolve the issue, I''ll escalate this to our technical team immediately. Your forms and client data are our priority.

**Your ticket ID is: {ticket_id}**
**Expected resolution time: {sla_resolution_time}**

I''ll keep you updated every step of the way.

Best regards,
{agent_name}
WedSync Support Team

---
This is regarding ticket {ticket_id}. Reply to this email to add to the conversation.',
  '{"customer_name", "ticket_subject", "form_issue_details", "ticket_id", "sla_resolution_time", "agent_name"}',
  (SELECT id FROM support_agents WHERE email = 'support@wedsync.com' LIMIT 1)
),
(
  'payment_failure_help',
  'Payment Issue - Immediate Assistance',
  'billing',
  'Re: {ticket_subject} - Payment Issue Resolution',
  'Hi {customer_name},

I''m sorry to hear you''re experiencing payment difficulties. I understand how frustrating this must be, and I''m here to help resolve this immediately.

**I''ve noted:**
- Account Tier: {user_tier}
- Issue: {payment_issue_description}
- Ticket Priority: Critical

**Let''s resolve this now:**

1. **Check your card details**
   - Ensure card number, expiry date, and CVV are correct
   - Verify billing address matches your card statement

2. **Try a different payment method**
   - Different credit/debit card
   - PayPal (if available)

3. **Contact your bank**
   - Some banks block online payments for security
   - Ask them to allow payments to "WedSync" or "Stripe"

**If this is urgent (wedding within 48 hours):**
- Call me directly: +44 (0) XXX XXX XXXX
- I can process payment manually
- We''ll ensure your service continues uninterrupted

**Your account will remain active for the next 24 hours** while we resolve this.

Your ticket ID: {ticket_id}
Expected resolution: Within {sla_resolution_time}

I''ll personally monitor this ticket until resolved.

Best regards,
{agent_name}
WedSync Billing Support

---
Reply to add to ticket {ticket_id}',
  '{"customer_name", "ticket_subject", "user_tier", "payment_issue_description", "ticket_id", "sla_resolution_time", "agent_name"}',
  (SELECT id FROM support_agents WHERE email = 'support@wedsync.com' LIMIT 1)
),
(
  'wedding_day_support',
  'URGENT: Wedding Day Support',
  'bug',
  'URGENT: Wedding Day Technical Support - {ticket_subject}',
  'Hi {customer_name},

**WEDDING DAY PRIORITY SUPPORT ACTIVATED**

I understand you''re experiencing technical issues during your wedding event. This is our absolute highest priority.

**Immediate actions I''m taking:**
✅ Escalated to senior technical team
✅ Wedding day emergency protocol activated
✅ Direct phone support available

**Your wedding day support contact:**
📞 Emergency Line: +44 (0) XXX XXX XXXX
📱 WhatsApp: +44 (0) XXX XXX XXXX (fastest response)
📧 Priority Email: emergency@wedsync.com

**Current status:**
- Issue: {technical_issue}
- Expected resolution: {sla_resolution_time}
- Technical team assigned: {assigned_team}

**Immediate workaround options:**
{workaround_options}

**I''m personally monitoring this ticket every 5 minutes** until your wedding event concludes successfully.

Your wedding day should be perfect. We''ve got your back.

{agent_name}
Senior Wedding Day Support
WedSync Emergency Response Team

Ticket: {ticket_id} | Priority: CRITICAL',
  '{"customer_name", "ticket_subject", "technical_issue", "sla_resolution_time", "assigned_team", "workaround_options", "agent_name", "ticket_id"}',
  (SELECT id FROM support_agents WHERE email = 'support@wedsync.com' LIMIT 1)
);

-- Add Row Level Security (RLS) policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_classification_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sla_events ENABLE ROW LEVEL SECURITY;

-- Admin and support agents can access all tickets
CREATE POLICY "Admin and support agents can view all tickets" ON support_tickets
  FOR ALL USING (
    auth.jwt() ->> 'user_metadata' ? 'admin' OR
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE user_id = auth.uid()
    )
  );

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());

-- Users can create tickets for themselves
CREATE POLICY "Users can create their own tickets" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Support agents can access their own agent record
CREATE POLICY "Support agents can access their own record" ON support_agents
  FOR ALL USING (user_id = auth.uid());

-- Admin can manage all agent records
CREATE POLICY "Admin can manage all agent records" ON support_agents
  FOR ALL USING (auth.jwt() ->> 'user_metadata' ? 'admin');

-- Support agents and admin can manage ticket messages
CREATE POLICY "Support agents can manage ticket messages" ON ticket_messages
  FOR ALL USING (
    auth.jwt() ->> 'user_metadata' ? 'admin' OR
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE user_id = auth.uid()
    )
  );

-- Users can view public messages for their tickets
CREATE POLICY "Users can view public messages for their tickets" ON ticket_messages
  FOR SELECT USING (
    is_internal = FALSE AND
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_messages.ticket_id 
      AND user_id = auth.uid()
    )
  );

-- Support agents can access all templates
CREATE POLICY "Support agents can access templates" ON support_templates
  FOR SELECT USING (
    auth.jwt() ->> 'user_metadata' ? 'admin' OR
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE user_id = auth.uid()
    )
  );

-- Admin can manage templates
CREATE POLICY "Admin can manage templates" ON support_templates
  FOR ALL USING (auth.jwt() ->> 'user_metadata' ? 'admin');

-- Support agents can access classification patterns
CREATE POLICY "Support agents can access classification patterns" ON ticket_classification_patterns
  FOR SELECT USING (
    auth.jwt() ->> 'user_metadata' ? 'admin' OR
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE user_id = auth.uid()
    )
  );

-- Support agents can access SLA events
CREATE POLICY "Support agents can access SLA events" ON ticket_sla_events
  FOR SELECT USING (
    auth.jwt() ->> 'user_metadata' ? 'admin' OR
    EXISTS (
      SELECT 1 FROM support_agents 
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE support_tickets IS 'Core support ticket management for WedSync platform';
COMMENT ON TABLE support_agents IS 'Support team members with skills and performance tracking';
COMMENT ON TABLE ticket_messages IS 'Conversation history for support tickets';
COMMENT ON TABLE support_templates IS 'Canned responses and email templates';
COMMENT ON TABLE ticket_classification_patterns IS 'AI training data for automatic ticket classification';
COMMENT ON TABLE ticket_sla_events IS 'SLA monitoring and breach tracking';

-- Migration completed successfully
SELECT 'WS-235 Ticket Management System migration completed successfully' AS status;