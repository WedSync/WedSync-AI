-- =============================================
-- WhatsApp Business API Integration System
-- Migration: 20250122000003_whatsapp_integration_system.sql
-- Description: Complete WhatsApp integration with Business API support
-- =============================================

-- Create WhatsApp configurations table
CREATE TABLE IF NOT EXISTS whatsapp_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_account_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  webhook_url TEXT,
  status_callback_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  cost_per_message DECIMAL(10,6) DEFAULT 0.005,
  daily_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, phone_number_id),
  UNIQUE(phone_number)
);

-- Create WhatsApp templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language_code TEXT NOT NULL DEFAULT 'en',
  header_type TEXT CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT')),
  header_text TEXT,
  header_variables TEXT[] DEFAULT '{}',
  body_text TEXT NOT NULL,
  body_variables TEXT[] DEFAULT '{}',
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  is_approved_template BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('APPROVED', 'PENDING', 'REJECTED')),
  rejection_reason TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, template_name, language_code)
);

-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'image', 'video', 'document', 'audio')),
  text_body TEXT,
  template_name TEXT,
  language TEXT,
  media_id TEXT,
  media_url TEXT,
  media_caption TEXT,
  media_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  error_code TEXT,
  error_message TEXT,
  is_inbound BOOLEAN DEFAULT false,
  within_session_window BOOLEAN DEFAULT false,
  cost_charged DECIMAL(10,6),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id)
);

-- Create WhatsApp sessions table (for 24-hour messaging window)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  display_name TEXT,
  last_inbound_at TIMESTAMPTZ NOT NULL,
  last_outbound_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ GENERATED ALWAYS AS (last_inbound_at + INTERVAL '24 hours') STORED,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(phone_number)
);

-- Create unified templates table (for multi-channel messaging)
CREATE TABLE IF NOT EXISTS unified_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '{}',
  variables TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('marketing', 'transactional', 'notification')),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name)
);

-- Create unified messages table (for tracking multi-channel sends)
CREATE TABLE IF NOT EXISTS unified_messages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channels_used TEXT[] NOT NULL,
  recipient JSONB NOT NULL,
  content JSONB NOT NULL,
  results JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(10,6) DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_configurations_org_id ON whatsapp_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configurations_user_id ON whatsapp_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configurations_active ON whatsapp_configurations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_org_id ON whatsapp_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user_id ON whatsapp_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON whatsapp_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_approved ON whatsapp_templates(is_approved_template) WHERE is_approved_template = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org_id ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_phone ON whatsapp_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_phone ON whatsapp_messages(to_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_inbound ON whatsapp_messages(is_inbound);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_active ON whatsapp_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires ON whatsapp_sessions(session_expires_at);

CREATE INDEX IF NOT EXISTS idx_unified_templates_org_id ON unified_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_unified_templates_user_id ON unified_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_templates_category ON unified_templates(category);
CREATE INDEX IF NOT EXISTS idx_unified_templates_active ON unified_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_messages_org_id ON unified_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_user_id ON unified_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_sent_at ON unified_messages(sent_at);

-- Create RLS policies
ALTER TABLE whatsapp_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;

-- WhatsApp configurations policies
CREATE POLICY "Users can view their organization's WhatsApp configurations"
  ON whatsapp_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage WhatsApp configurations"
  ON whatsapp_configurations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- WhatsApp templates policies
CREATE POLICY "Users can view their organization's WhatsApp templates"
  ON whatsapp_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own WhatsApp templates"
  ON whatsapp_templates FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage all WhatsApp templates"
  ON whatsapp_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- WhatsApp messages policies
CREATE POLICY "Users can view their organization's WhatsApp messages"
  ON whatsapp_messages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create WhatsApp messages for their organization"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own WhatsApp messages"
  ON whatsapp_messages FOR UPDATE
  USING (user_id = auth.uid());

-- WhatsApp sessions policies (read-only for users)
CREATE POLICY "Users can view WhatsApp sessions for their organization"
  ON whatsapp_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_configurations wc
      JOIN user_profiles up ON up.organization_id = wc.organization_id
      WHERE up.user_id = auth.uid()
      AND wc.phone_number = whatsapp_sessions.phone_number
    )
  );

-- Unified templates policies
CREATE POLICY "Users can view their organization's unified templates"
  ON unified_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own unified templates"
  ON unified_templates FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage all unified templates"
  ON unified_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Unified messages policies
CREATE POLICY "Users can view their organization's unified messages"
  ON unified_messages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create unified messages for their organization"
  ON unified_messages FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Create functions for template usage tracking
CREATE OR REPLACE FUNCTION increment_whatsapp_template_usage(template_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = template_id AND whatsapp_templates.user_id = increment_whatsapp_template_usage.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_unified_template_usage(template_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE unified_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = template_id AND unified_templates.user_id = increment_unified_template_usage.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old sessions (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_whatsapp_sessions()
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_sessions 
  SET is_active = false
  WHERE session_expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get messaging window status
CREATE OR REPLACE FUNCTION check_whatsapp_messaging_window(phone_number TEXT)
RETURNS boolean AS $$
DECLARE
  session_record whatsapp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO session_record
  FROM whatsapp_sessions
  WHERE whatsapp_sessions.phone_number = check_whatsapp_messaging_window.phone_number
    AND is_active = true;
  
  IF session_record.id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN session_record.session_expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_configurations_updated_at
  BEFORE UPDATE ON whatsapp_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_templates_updated_at
  BEFORE UPDATE ON unified_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add communication preferences to clients table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'communication_preferences'
  ) THEN
    ALTER TABLE clients ADD COLUMN communication_preferences JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE clients ADD COLUMN whatsapp_number TEXT;
  END IF;
END $$;

-- Create view for WhatsApp analytics
CREATE OR REPLACE VIEW whatsapp_analytics AS
SELECT 
  wm.organization_id,
  wm.user_id,
  DATE(wm.created_at) as date,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE wm.status = 'delivered') as delivered_messages,
  COUNT(*) FILTER (WHERE wm.status = 'read') as read_messages,
  COUNT(*) FILTER (WHERE wm.status = 'failed') as failed_messages,
  COUNT(*) FILTER (WHERE wm.message_type = 'template') as template_messages,
  COUNT(*) FILTER (WHERE wm.media_type IS NOT NULL) as media_messages,
  SUM(wm.cost_charged) as total_cost,
  AVG(wm.cost_charged) as average_cost,
  CASE 
    WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE wm.status = 'delivered') * 100.0 / COUNT(*)
    ELSE 0
  END as delivery_rate,
  CASE 
    WHEN COUNT(*) FILTER (WHERE wm.status = 'delivered') > 0 
    THEN COUNT(*) FILTER (WHERE wm.status = 'read') * 100.0 / COUNT(*) FILTER (WHERE wm.status = 'delivered')
    ELSE 0
  END as read_rate
FROM whatsapp_messages wm
WHERE wm.is_inbound = false
GROUP BY wm.organization_id, wm.user_id, DATE(wm.created_at);

-- Grant necessary permissions
GRANT SELECT ON whatsapp_analytics TO authenticated;

-- Insert default unified template categories
INSERT INTO unified_templates (
  id,
  user_id,
  organization_id,
  name,
  channels,
  variables,
  category,
  is_active
) VALUES 
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM organizations LIMIT 1),
    'Wedding Reminder',
    '{
      "email": {
        "subject": "Wedding Reminder - {{wedding_date}}",
        "htmlTemplate": "<p>Hi {{couple_names}},</p><p>Just a friendly reminder about your upcoming wedding on {{wedding_date}}. We''re so excited to be part of your special day!</p><p>Best regards,<br>{{photographer_name}}</p>"
      },
      "sms": {
        "template": "Hi {{couple_names}}! Reminder: Your wedding is on {{wedding_date}}. Can''t wait to capture your special day! - {{photographer_name}}"
      },
      "whatsapp": {
        "templateName": "wedding_reminder",
        "language": "en"
      }
    }',
    '["couple_names", "wedding_date", "photographer_name"]',
    'notification',
    true
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM organizations LIMIT 1),
    'Photo Gallery Ready',
    '{
      "email": {
        "subject": "Your Wedding Photos are Ready! 📸",
        "htmlTemplate": "<p>Dear {{couple_names}},</p><p>We''re thrilled to let you know that your wedding photos are now ready for viewing!</p><p><a href=\"{{gallery_link}}\">View Your Gallery</a></p><p>These memories will last a lifetime. Enjoy!</p><p>With love,<br>{{photographer_name}}</p>"
      },
      "sms": {
        "template": "{{couple_names}}, your wedding photos are ready! View them here: {{gallery_link}} - {{photographer_name}} 📸"
      },
      "whatsapp": {
        "templateName": "photo_gallery_ready",
        "language": "en"
      }
    }',
    '["couple_names", "gallery_link", "photographer_name"]',
    'notification',
    true
  )
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create performance optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_analytics 
  ON whatsapp_messages(organization_id, user_id, created_at, status, message_type) 
  WHERE is_inbound = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_sessions_lookup 
  ON whatsapp_sessions(phone_number, is_active, session_expires_at) 
  WHERE is_active = true;

-- Create materialized view for daily analytics (refresh nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS whatsapp_daily_stats AS
SELECT 
  organization_id,
  user_id,
  DATE(created_at) as date,
  COUNT(*) as messages_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as messages_delivered,
  COUNT(*) FILTER (WHERE status = 'read') as messages_read,
  SUM(cost_charged) as total_cost,
  COUNT(*) FILTER (WHERE message_type = 'template') as template_usage,
  COUNT(*) FILTER (WHERE media_type IS NOT NULL) as media_messages
FROM whatsapp_messages
WHERE is_inbound = false
GROUP BY organization_id, user_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_daily_stats_unique 
  ON whatsapp_daily_stats(organization_id, user_id, date);

-- Grant permissions on materialized view
GRANT SELECT ON whatsapp_daily_stats TO authenticated;

COMMENT ON TABLE whatsapp_configurations IS 'WhatsApp Business API configuration settings per organization';
COMMENT ON TABLE whatsapp_templates IS 'WhatsApp message templates with approval status tracking';
COMMENT ON TABLE whatsapp_messages IS 'All WhatsApp messages sent and received with delivery tracking';
COMMENT ON TABLE whatsapp_sessions IS 'Active WhatsApp sessions for 24-hour messaging window compliance';
COMMENT ON TABLE unified_templates IS 'Multi-channel message templates for Email, SMS, and WhatsApp';
COMMENT ON TABLE unified_messages IS 'Multi-channel message delivery tracking and results';

-- Migration completed successfully
SELECT 'WhatsApp Business API integration system created successfully' as status;