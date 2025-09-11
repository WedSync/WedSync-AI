-- SMS Configuration System Migration (FIXED VERSION)
-- Extends email template patterns for SMS messaging
-- Migration: 025_sms_configuration_system.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SMS Templates Table (mirroring email_templates structure)
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('welcome', 'payment_reminder', 'meeting_confirmation', 'thank_you', 'client_communication', 'custom')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  variables TEXT[] DEFAULT '{}',
  
  -- SMS-specific fields
  character_count INTEGER DEFAULT 0,
  segment_count INTEGER DEFAULT 1,
  character_limit INTEGER DEFAULT 160, -- Standard SMS limit
  
  -- Compliance fields
  opt_out_required BOOLEAN DEFAULT true,
  tcpa_compliant BOOLEAN DEFAULT false,
  consent_required BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT sms_templates_name_user_unique UNIQUE(name, user_id)
);

-- SMS Configuration Table (Twilio credentials)
CREATE TABLE IF NOT EXISTS sms_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted Twilio credentials (using Supabase Vault)
  account_sid_encrypted TEXT, -- Will store vault key reference
  auth_token_encrypted TEXT,  -- Will store vault key reference
  phone_number VARCHAR(20),   -- Twilio phone number
  
  -- Configuration settings
  is_active BOOLEAN DEFAULT false,
  webhook_url TEXT,
  status_callback_url TEXT,
  
  -- Compliance settings
  auto_opt_out BOOLEAN DEFAULT true,
  opt_out_keywords TEXT[] DEFAULT '{"STOP", "QUIT", "UNSUBSCRIBE", "END", "CANCEL"}',
  opt_in_keywords TEXT[] DEFAULT '{"START", "YES", "UNSTOP"}',
  
  -- Usage tracking
  monthly_limit INTEGER DEFAULT 1000,
  monthly_usage INTEGER DEFAULT 0,
  cost_per_message DECIMAL(6,4) DEFAULT 0.0075, -- $0.0075 per SMS
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT one_config_per_user UNIQUE(user_id)
);

-- SMS Messages Log (for tracking and compliance)
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  
  -- Message details
  to_phone VARCHAR(20) NOT NULL,
  from_phone VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  segment_count INTEGER NOT NULL,
  
  -- Twilio tracking
  message_sid VARCHAR(50) UNIQUE, -- Twilio message SID
  status VARCHAR(20) DEFAULT 'queued',
  delivery_status VARCHAR(20),
  error_code VARCHAR(10),
  error_message TEXT,
  
  -- Compliance tracking
  consent_given BOOLEAN DEFAULT false,
  opt_out_respected BOOLEAN DEFAULT true,
  tcpa_compliant BOOLEAN DEFAULT false,
  
  -- Cost tracking
  cost_charged DECIMAL(6,4),
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opt-out Management Table
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  opted_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opt_out_method VARCHAR(20) DEFAULT 'sms' CHECK (opt_out_method IN ('sms', 'manual', 'api')),
  opt_out_message TEXT,
  
  -- Re-opt-in tracking
  opted_in_at TIMESTAMP WITH TIME ZONE,
  opt_in_method VARCHAR(20) CHECK (opt_in_method IN ('sms', 'manual', 'api')),
  
  -- Current status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_phone_per_user UNIQUE(user_id, phone_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_status ON sms_templates(status);
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_at ON sms_templates(created_at);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_template_id ON sms_messages(template_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_phone ON sms_messages(to_phone);
CREATE INDEX IF NOT EXISTS idx_sms_messages_message_sid ON sms_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at);

CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_user_phone ON sms_opt_outs(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone ON sms_opt_outs(phone_number);

-- Row Level Security (RLS) Policies
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_templates
CREATE POLICY "Users can view own SMS templates" ON sms_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SMS templates" ON sms_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

CREATE POLICY "Users can update own SMS templates" ON sms_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own SMS templates" ON sms_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sms_configurations
CREATE POLICY "Users can view own SMS config" ON sms_configurations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own SMS config" ON sms_configurations
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for sms_messages
CREATE POLICY "Users can view own SMS messages" ON sms_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SMS messages" ON sms_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sms_opt_outs
CREATE POLICY "Users can view own opt-outs" ON sms_opt_outs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own opt-outs" ON sms_opt_outs
  FOR ALL USING (auth.uid() = user_id);

-- Functions for business logic

-- Function to increment SMS template usage count
CREATE OR REPLACE FUNCTION increment_sms_template_usage(template_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sms_templates 
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE id = template_id AND sms_templates.user_id = increment_sms_template_usage.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate SMS character count and segments
CREATE OR REPLACE FUNCTION calculate_sms_metrics(content TEXT)
RETURNS JSON AS $$
DECLARE
  char_count INTEGER;
  segment_count INTEGER;
  has_unicode BOOLEAN;
BEGIN
  char_count := LENGTH(content);
  has_unicode := content ~ '[^\x00-\x7F]';
  
  -- Calculate segments based on character count and encoding
  IF has_unicode THEN
    -- Unicode SMS: 70 chars per segment, 67 for concatenated
    IF char_count <= 70 THEN
      segment_count := 1;
    ELSE
      segment_count := CEIL(char_count::DECIMAL / 67);
    END IF;
  ELSE
    -- GSM 7-bit: 160 chars per segment, 153 for concatenated
    IF char_count <= 160 THEN
      segment_count := 1;
    ELSE
      segment_count := CEIL(char_count::DECIMAL / 153);
    END IF;
  END IF;
  
  RETURN json_build_object(
    'character_count', char_count,
    'segment_count', segment_count,
    'has_unicode', has_unicode,
    'encoding', CASE WHEN has_unicode THEN 'UCS-2' ELSE 'GSM 7-bit' END
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if phone number is opted out
CREATE OR REPLACE FUNCTION is_phone_opted_out(user_id UUID, phone_number VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  opted_out BOOLEAN DEFAULT false;
BEGIN
  SELECT is_active INTO opted_out
  FROM sms_opt_outs
  WHERE sms_opt_outs.user_id = is_phone_opted_out.user_id
    AND sms_opt_outs.phone_number = is_phone_opted_out.phone_number
    AND is_active = true;
  
  RETURN COALESCE(opted_out, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update character/segment count on template save
CREATE OR REPLACE FUNCTION update_sms_template_metrics()
RETURNS TRIGGER AS $$
DECLARE
  metrics JSON;
BEGIN
  metrics := calculate_sms_metrics(NEW.content);
  
  NEW.character_count := (metrics->>'character_count')::INTEGER;
  NEW.segment_count := (metrics->>'segment_count')::INTEGER;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sms_template_metrics
  BEFORE INSERT OR UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_template_metrics();

-- NOTE: Default templates will be created by the application when users sign up
-- This avoids the NULL user_id constraint violation

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_opt_outs TO authenticated;

GRANT EXECUTE ON FUNCTION increment_sms_template_usage(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sms_metrics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_phone_opted_out(UUID, VARCHAR) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE sms_templates IS 'SMS templates extending email template patterns';
COMMENT ON TABLE sms_configurations IS 'Twilio SMS configuration with encrypted credentials';
COMMENT ON TABLE sms_messages IS 'SMS message log for tracking and compliance';
COMMENT ON TABLE sms_opt_outs IS 'TCPA compliance opt-out management';

COMMENT ON FUNCTION calculate_sms_metrics(TEXT) IS 'Calculate character count and SMS segments';
COMMENT ON FUNCTION is_phone_opted_out(UUID, VARCHAR) IS 'Check if phone number has opted out';
COMMENT ON FUNCTION increment_sms_template_usage(UUID, UUID) IS 'Track template usage statistics';