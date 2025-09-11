-- SMS Configuration System Migration (FIXED)
-- Extends email template patterns for SMS messaging
-- Migration: 025_sms_configuration_system_fixed.sql

-- SMS Templates Table (mirroring email_templates structure)
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('welcome', 'payment_reminder', 'meeting_confirmation', 'thank_you', 'client_communication', 'custom')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID,  -- Made nullable since auth.users doesn't exist
  created_by UUID,  -- Made nullable
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
  metadata JSONB DEFAULT '{}'
);

-- SMS Configuration Table (Twilio credentials)
CREATE TABLE IF NOT EXISTS sms_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,  -- Made nullable
  
  -- Encrypted Twilio credentials (using Supabase Vault)
  account_sid_encrypted TEXT, -- Will store vault key reference
  auth_token_encrypted TEXT,  -- Will store vault key reference
  phone_number VARCHAR(20),   -- Twilio phone number
  
  -- Configuration settings
  is_active BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  test_phone_number VARCHAR(20),
  
  -- Rate limiting
  daily_limit INTEGER DEFAULT 100,
  monthly_limit INTEGER DEFAULT 1000,
  current_daily_count INTEGER DEFAULT 0,
  current_monthly_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Advanced settings
  messaging_service_sid VARCHAR(100),
  status_callback_url TEXT,
  fallback_number VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Send History
CREATE TABLE IF NOT EXISTS sms_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  configuration_id UUID REFERENCES sms_configurations(id) ON DELETE SET NULL,
  
  -- Recipient information
  to_phone VARCHAR(20) NOT NULL,
  from_phone VARCHAR(20),
  
  -- Message details
  message_body TEXT NOT NULL,
  segments INTEGER DEFAULT 1,
  
  -- Twilio response
  message_sid VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  error_code VARCHAR(20),
  error_message TEXT,
  
  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost tracking
  price_amount DECIMAL(10, 4),
  price_unit VARCHAR(10),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Opt-out Management
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  opted_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(200),
  source VARCHAR(50) DEFAULT 'user_request',
  metadata JSONB DEFAULT '{}'
);

-- SMS Template Usage Analytics
CREATE TABLE IF NOT EXISTS sms_template_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES sms_templates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Metrics
  send_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opt_out_count INTEGER DEFAULT 0,
  
  -- Cost metrics
  total_cost DECIMAL(10, 2) DEFAULT 0,
  average_segments DECIMAL(5, 2) DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT sms_template_analytics_unique UNIQUE(template_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_status ON sms_templates(status);
CREATE INDEX IF NOT EXISTS idx_sms_history_to_phone ON sms_history(to_phone);
CREATE INDEX IF NOT EXISTS idx_sms_history_message_sid ON sms_history(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_history_status ON sms_history(status);
CREATE INDEX IF NOT EXISTS idx_sms_history_sent_at ON sms_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone ON sms_opt_outs(phone_number);

-- Enable RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own SMS templates" ON sms_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SMS templates" ON sms_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS templates" ON sms_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMS templates" ON sms_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own SMS configuration" ON sms_configurations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own SMS configuration" ON sms_configurations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own SMS history" ON sms_history
  FOR SELECT USING (
    configuration_id IN (
      SELECT id FROM sms_configurations WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER update_sms_configurations_updated_at
  BEFORE UPDATE ON sms_configurations
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER update_sms_history_updated_at
  BEFORE UPDATE ON sms_history
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

-- Function to calculate SMS segments
CREATE OR REPLACE FUNCTION calculate_sms_segments(message_text TEXT)
RETURNS INTEGER AS $$
DECLARE
  char_count INTEGER;
  segment_count INTEGER;
BEGIN
  char_count := LENGTH(message_text);
  
  IF char_count <= 160 THEN
    segment_count := 1;
  ELSIF char_count <= 306 THEN
    segment_count := 2;
  ELSE
    segment_count := CEIL(char_count::DECIMAL / 153);
  END IF;
  
  RETURN segment_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check SMS rate limits
CREATE OR REPLACE FUNCTION check_sms_rate_limit(config_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  config RECORD;
  can_send BOOLEAN := true;
BEGIN
  SELECT * INTO config FROM sms_configurations WHERE id = config_id;
  
  -- Reset counters if needed
  IF config.last_reset_date < CURRENT_DATE THEN
    UPDATE sms_configurations
    SET current_daily_count = 0,
        last_reset_date = CURRENT_DATE
    WHERE id = config_id;
    
    -- Reset monthly count if new month
    IF EXTRACT(MONTH FROM config.last_reset_date) != EXTRACT(MONTH FROM CURRENT_DATE) THEN
      UPDATE sms_configurations
      SET current_monthly_count = 0
      WHERE id = config_id;
    END IF;
  END IF;
  
  -- Check limits
  SELECT * INTO config FROM sms_configurations WHERE id = config_id;
  
  IF config.current_daily_count >= config.daily_limit THEN
    can_send := false;
  END IF;
  
  IF config.current_monthly_count >= config.monthly_limit THEN
    can_send := false;
  END IF;
  
  RETURN can_send;
END;
$$ LANGUAGE plpgsql;