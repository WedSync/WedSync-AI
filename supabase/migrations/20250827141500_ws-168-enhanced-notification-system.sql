-- Migration: 20250827141500_ws-168-enhanced-notification-system.sql
-- WS-168 Customer Success Dashboard - Enhanced Notification System
-- Creates comprehensive notification infrastructure with analytics, templates, and health scoring

BEGIN;

-- =============================================
-- NOTIFICATION TEMPLATES SYSTEM
-- =============================================

-- Email template categories
CREATE TYPE notification_template_category AS ENUM (
  'welcome',
  'milestone',
  'reminder',
  'alert',
  'engagement',
  'retention',
  'support',
  'billing',
  'custom'
);

-- Template status
CREATE TYPE template_status AS ENUM (
  'draft',
  'active',
  'inactive',
  'archived'
);

-- Notification templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category notification_template_category NOT NULL,
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  html_template TEXT,
  variables JSONB DEFAULT '{}',
  status template_status DEFAULT 'draft',
  is_system_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'
);

-- Template versions for change tracking
CREATE TABLE notification_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  html_template TEXT,
  variables JSONB DEFAULT '{}',
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_notes TEXT
);

-- =============================================
-- ENHANCED NOTIFICATIONS SYSTEM
-- =============================================

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'email',
  'sms',
  'push',
  'in_app',
  'webhook'
);

-- Notification priority
CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Notification status
CREATE TYPE notification_status AS ENUM (
  'pending',
  'queued',
  'processing',
  'sent',
  'delivered',
  'failed',
  'cancelled',
  'bounced'
);

-- Enhanced notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  status notification_status DEFAULT 'pending',
  priority notification_priority DEFAULT 'normal',
  
  -- Recipients
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  
  -- Content
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  html_content TEXT,
  
  -- Metadata and variables
  template_variables JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Organization context
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- System fields
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION ANALYTICS & TRACKING
-- =============================================

-- Notification events for detailed tracking
CREATE TABLE notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, bounced, etc.
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification campaigns for bulk sending
CREATE TABLE notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  
  -- Targeting
  target_audience JSONB DEFAULT '{}', -- criteria for recipient selection
  recipient_count INTEGER DEFAULT 0,
  
  -- Status and timing
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, running, completed, cancelled
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Analytics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Organization context
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link notifications to campaigns
ALTER TABLE notifications ADD COLUMN campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL;

-- =============================================
-- CUSTOMER HEALTH SCORING INTEGRATION
-- =============================================

-- Customer health scores
CREATE TABLE customer_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Health metrics
  overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  engagement_score DECIMAL(5,2) DEFAULT 0,
  satisfaction_score DECIMAL(5,2) DEFAULT 0,
  usage_score DECIMAL(5,2) DEFAULT 0,
  support_score DECIMAL(5,2) DEFAULT 0,
  
  -- Risk indicators
  risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
  churn_probability DECIMAL(5,2) DEFAULT 0,
  
  -- Scoring factors
  scoring_factors JSONB DEFAULT '{}',
  last_activity_at TIMESTAMPTZ,
  
  -- System fields
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, organization_id)
);

-- Health score history for trending
CREATE TABLE customer_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  overall_score DECIMAL(5,2) NOT NULL,
  engagement_score DECIMAL(5,2),
  satisfaction_score DECIMAL(5,2),
  usage_score DECIMAL(5,2),
  support_score DECIMAL(5,2),
  risk_level VARCHAR(20),
  
  score_change DECIMAL(5,2), -- difference from previous score
  factors_changed JSONB DEFAULT '{}',
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION PREFERENCES & SUBSCRIPTIONS
-- =============================================

-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  
  -- Category preferences
  welcome_notifications BOOLEAN DEFAULT true,
  milestone_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  alert_notifications BOOLEAN DEFAULT true,
  engagement_notifications BOOLEAN DEFAULT true,
  retention_notifications BOOLEAN DEFAULT false,
  support_notifications BOOLEAN DEFAULT true,
  billing_notifications BOOLEAN DEFAULT true,
  
  -- Timing preferences
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Frequency settings
  digest_frequency VARCHAR(20) DEFAULT 'daily', -- immediate, daily, weekly, never
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- =============================================
-- AUTOMATION RULES
-- =============================================

-- Notification automation rules
CREATE TABLE notification_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Trigger conditions
  trigger_type VARCHAR(50) NOT NULL, -- health_score_change, milestone_reached, inactivity, etc.
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  
  -- Actions
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  priority notification_priority DEFAULT 'normal',
  
  -- Timing and frequency
  delay_minutes INTEGER DEFAULT 0,
  max_frequency_hours INTEGER DEFAULT 24, -- prevent spam
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  
  -- Organization context
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule execution history
CREATE TABLE automation_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES notification_automation_rules(id) ON DELETE CASCADE,
  
  -- Execution details
  trigger_data JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Results
  success BOOLEAN NOT NULL,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  error_message TEXT,
  
  -- Context
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Notifications indexes
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_client_id ON notifications(client_id);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_template_id ON notifications(template_id);
CREATE INDEX idx_notifications_campaign_id ON notifications(campaign_id);

-- Templates indexes
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_templates_status ON notification_templates(status);
CREATE INDEX idx_notification_templates_created_by ON notification_templates(created_by);

-- Events indexes
CREATE INDEX idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX idx_notification_events_type ON notification_events(event_type);
CREATE INDEX idx_notification_events_created_at ON notification_events(created_at);

-- Health scores indexes
CREATE INDEX idx_customer_health_scores_client_id ON customer_health_scores(client_id);
CREATE INDEX idx_customer_health_scores_organization_id ON customer_health_scores(organization_id);
CREATE INDEX idx_customer_health_scores_risk_level ON customer_health_scores(risk_level);
CREATE INDEX idx_customer_health_scores_overall_score ON customer_health_scores(overall_score);
CREATE INDEX idx_customer_health_history_client_id ON customer_health_history(client_id);
CREATE INDEX idx_customer_health_history_recorded_at ON customer_health_history(recorded_at);

-- Preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_organization_id ON notification_preferences(organization_id);

-- Automation rules indexes
CREATE INDEX idx_automation_rules_organization_id ON notification_automation_rules(organization_id);
CREATE INDEX idx_automation_rules_trigger_type ON notification_automation_rules(trigger_type);
CREATE INDEX idx_automation_rules_is_active ON notification_automation_rules(is_active);
CREATE INDEX idx_automation_rule_executions_rule_id ON automation_rule_executions(rule_id);
CREATE INDEX idx_automation_rule_executions_client_id ON automation_rule_executions(client_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rule_executions ENABLE ROW LEVEL SECURITY;

-- Notification Templates Policies
CREATE POLICY "Users can view templates in their organization" ON notification_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.organization_id = notification_templates.created_by OR is_system_template = true)
    )
  );

CREATE POLICY "Users can create templates in their organization" ON notification_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update their organization's templates" ON notification_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = notification_templates.created_by
    )
  );

-- Notifications Policies
CREATE POLICY "Users can view notifications in their organization" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = notifications.organization_id
    ) OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can create notifications in their organization" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = notifications.organization_id
    )
  );

CREATE POLICY "Users can update notifications in their organization" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = notifications.organization_id
    )
  );

-- Notification Events Policies
CREATE POLICY "Users can view events for their notifications" ON notification_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notifications n
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE n.id = notification_events.notification_id
      AND (up.organization_id = n.organization_id OR n.recipient_id = auth.uid())
    )
  );

-- Customer Health Scores Policies
CREATE POLICY "Users can view health scores in their organization" ON customer_health_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = customer_health_scores.organization_id
    )
  );

CREATE POLICY "System can manage health scores" ON customer_health_scores
  FOR ALL USING (auth.uid() IS NULL); -- Allow system operations

-- Notification Preferences Policies
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Automation Rules Policies
CREATE POLICY "Users can manage automation rules in their organization" ON notification_automation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = notification_automation_rules.organization_id
    )
  );

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_campaigns_updated_at BEFORE UPDATE ON notification_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_health_scores_updated_at BEFORE UPDATE ON customer_health_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON notification_automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to track health score changes
CREATE OR REPLACE FUNCTION track_health_score_changes()
RETURNS TRIGGER AS $$
DECLARE
  score_change DECIMAL(5,2);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    score_change := NEW.overall_score - OLD.overall_score;
    
    INSERT INTO customer_health_history (
      client_id,
      organization_id,
      overall_score,
      engagement_score,
      satisfaction_score,
      usage_score,
      support_score,
      risk_level,
      score_change,
      factors_changed
    ) VALUES (
      NEW.client_id,
      NEW.organization_id,
      NEW.overall_score,
      NEW.engagement_score,
      NEW.satisfaction_score,
      NEW.usage_score,
      NEW.support_score,
      NEW.risk_level,
      score_change,
      CASE WHEN score_change != 0 THEN jsonb_build_object('score_change', score_change, 'timestamp', NOW()) ELSE '{}'::jsonb END
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_customer_health_changes 
  AFTER UPDATE ON customer_health_scores 
  FOR EACH ROW EXECUTE FUNCTION track_health_score_changes();

-- Function to create template versions
CREATE OR REPLACE FUNCTION create_template_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.subject_template != NEW.subject_template OR 
    OLD.content_template != NEW.content_template OR 
    OLD.html_template != NEW.html_template OR
    OLD.variables != NEW.variables
  ) THEN
    NEW.version = OLD.version + 1;
    
    INSERT INTO notification_template_versions (
      template_id,
      version,
      subject_template,
      content_template,
      html_template,
      variables,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.version,
      OLD.subject_template,
      OLD.content_template,
      OLD.html_template,
      OLD.variables,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_notification_template_version 
  BEFORE UPDATE ON notification_templates 
  FOR EACH ROW EXECUTE FUNCTION create_template_version();

-- =============================================
-- INITIAL SYSTEM DATA
-- =============================================

-- Insert default notification templates
INSERT INTO notification_templates (name, category, subject_template, content_template, is_system_template, status) VALUES
  ('Welcome Email', 'welcome', 'Welcome to {{organization_name}}!', 'Hi {{client_name}},\n\nWelcome to {{organization_name}}! We''re excited to help you plan your perfect wedding.\n\nBest regards,\nThe {{organization_name}} Team', true, 'active'),
  ('Milestone Reminder', 'milestone', 'Milestone Reminder: {{milestone_name}}', 'Hi {{client_name}},\n\nThis is a friendly reminder that your milestone "{{milestone_name}}" is coming up on {{milestone_date}}.\n\nBest regards,\nThe {{organization_name}} Team', true, 'active'),
  ('Health Score Alert', 'alert', 'Client Attention Required: {{client_name}}', 'A client requires attention:\n\nClient: {{client_name}}\nHealth Score: {{health_score}}\nRisk Level: {{risk_level}}\n\nPlease review and take appropriate action.', true, 'active'),
  ('Engagement Follow-up', 'engagement', 'We miss you, {{client_name}}!', 'Hi {{client_name}},\n\nWe noticed you haven''t been active recently. Is there anything we can help you with for your wedding planning?\n\nBest regards,\nThe {{organization_name}} Team', true, 'active');

COMMIT;