-- WS-141: Viral Optimization System Database Schema
-- Creates tables for viral coefficient tracking, invitation optimization, and attribution chains
-- SECURITY: Row Level Security enabled, proper indexes for performance

BEGIN;

-- =============================================
-- VIRAL INVITATIONS TABLE
-- Tracks all invitations sent through the viral system
-- =============================================
CREATE TABLE IF NOT EXISTS viral_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  relationship TEXT NOT NULL CHECK (relationship IN ('past_client', 'vendor', 'friend', 'referral')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  personalized_message TEXT CHECK (length(personalized_message) <= 500),
  wedding_context JSONB DEFAULT '{}',
  template_preference TEXT NOT NULL CHECK (template_preference IN ('warm', 'professional', 'casual')),
  scheduled_at TIMESTAMPTZ,
  a_b_test_variant TEXT NOT NULL CHECK (a_b_test_variant IN ('A', 'B')),
  tracking_code TEXT NOT NULL UNIQUE CHECK (tracking_code ~ '^[a-f0-9]{16}$'),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'delivered', 'opened', 'clicked', 'accepted', 'expired', 'failed')),
  predicted_acceptance_rate DECIMAL(5,4) DEFAULT 0.0000 CHECK (predicted_acceptance_rate >= 0 AND predicted_acceptance_rate <= 1),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_viral_invitations_sender_id ON viral_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_viral_invitations_recipient_email ON viral_invitations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_viral_invitations_tracking_code ON viral_invitations(tracking_code);
CREATE INDEX IF NOT EXISTS idx_viral_invitations_status ON viral_invitations(status);
CREATE INDEX IF NOT EXISTS idx_viral_invitations_created_at ON viral_invitations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_invitations_channel_status ON viral_invitations(channel, status);
CREATE INDEX IF NOT EXISTS idx_viral_invitations_sender_created ON viral_invitations(sender_id, created_at DESC);

-- =============================================
-- VIRAL ATTRIBUTIONS TABLE
-- Tracks referral chains and conversion attribution
-- =============================================
CREATE TABLE IF NOT EXISTS viral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES viral_invitations(id) ON DELETE SET NULL,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('signup', 'activation', 'first_invite', 'premium_upgrade', 'vendor_signup')),
  conversion_value DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (conversion_value >= 0),
  chain_position INTEGER NOT NULL DEFAULT 1 CHECK (chain_position > 0),
  metadata JSONB DEFAULT '{}',
  payout_status TEXT CHECK (payout_status IN ('pending', 'paid', 'cancelled')),
  payout_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (payout_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for attribution queries
CREATE INDEX IF NOT EXISTS idx_viral_attributions_user_id ON viral_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_referrer_id ON viral_attributions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_invitation_id ON viral_attributions(invitation_id);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_conversion_type ON viral_attributions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_created_at ON viral_attributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_chain_lookup ON viral_attributions(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_user_conversion ON viral_attributions(user_id, conversion_type, created_at DESC);

-- =============================================
-- VIRAL FUNNEL TRACKING TABLE
-- Tracks detailed funnel metrics for optimization
-- =============================================
CREATE TABLE IF NOT EXISTS viral_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES viral_invitations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'signup_started', 'signup_completed', 'activated')),
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for funnel analysis
CREATE INDEX IF NOT EXISTS idx_viral_funnel_events_invitation_id ON viral_funnel_events(invitation_id);
CREATE INDEX IF NOT EXISTS idx_viral_funnel_events_event_type ON viral_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_viral_funnel_events_created_at ON viral_funnel_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_funnel_events_invitation_event ON viral_funnel_events(invitation_id, event_type, created_at);

-- =============================================
-- VIRAL NETWORK CONNECTIONS TABLE
-- Tracks network relationships for super-connector identification
-- =============================================
CREATE TABLE IF NOT EXISTS viral_network_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('direct_referral', 'chain_referral', 'mutual_connection')),
  connection_strength DECIMAL(3,2) DEFAULT 1.00 CHECK (connection_strength >= 0 AND connection_strength <= 10),
  first_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interaction_count INTEGER NOT NULL DEFAULT 1 CHECK (interaction_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(connector_id, connected_id)
);

-- Indexes for network analysis
CREATE INDEX IF NOT EXISTS idx_viral_network_connector_id ON viral_network_connections(connector_id);
CREATE INDEX IF NOT EXISTS idx_viral_network_connected_id ON viral_network_connections(connected_id);
CREATE INDEX IF NOT EXISTS idx_viral_network_strength ON viral_network_connections(connection_strength DESC);
CREATE INDEX IF NOT EXISTS idx_viral_network_interactions ON viral_network_connections(interaction_count DESC);

-- =============================================
-- VIRAL A/B TEST RESULTS TABLE
-- Tracks A/B test performance for optimization
-- =============================================
CREATE TABLE IF NOT EXISTS viral_ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  invitation_id UUID NOT NULL REFERENCES viral_invitations(id) ON DELETE CASCADE,
  conversion_achieved BOOLEAN DEFAULT FALSE,
  conversion_type TEXT,
  conversion_value DECIMAL(10,2) DEFAULT 0.00,
  test_start_date DATE NOT NULL,
  test_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for A/B test analysis
CREATE INDEX IF NOT EXISTS idx_viral_ab_test_name ON viral_ab_test_results(test_name);
CREATE INDEX IF NOT EXISTS idx_viral_ab_test_variant ON viral_ab_test_results(test_name, variant);
CREATE INDEX IF NOT EXISTS idx_viral_ab_test_conversion ON viral_ab_test_results(conversion_achieved, created_at);
CREATE INDEX IF NOT EXISTS idx_viral_ab_test_dates ON viral_ab_test_results(test_start_date, test_end_date);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE viral_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_ab_test_results ENABLE ROW LEVEL SECURITY;

-- Viral Invitations RLS Policies
CREATE POLICY "Users can view their own invitations"
  ON viral_invitations FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can insert their own invitations"
  ON viral_invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own invitations"
  ON viral_invitations FOR UPDATE
  USING (auth.uid() = sender_id);

-- Viral Attributions RLS Policies
CREATE POLICY "Users can view their own attributions"
  ON viral_attributions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = referrer_id);

CREATE POLICY "Users can insert their own attributions"
  ON viral_attributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attributions"
  ON viral_attributions FOR UPDATE
  USING (auth.uid() = user_id);

-- Viral Funnel Events RLS Policies
CREATE POLICY "Users can view funnel events for their invitations"
  ON viral_funnel_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viral_invitations 
      WHERE viral_invitations.id = viral_funnel_events.invitation_id 
      AND viral_invitations.sender_id = auth.uid()
    )
  );

CREATE POLICY "System can insert funnel events"
  ON viral_funnel_events FOR INSERT
  WITH CHECK (true); -- System-level inserts allowed

-- Viral Network Connections RLS Policies
CREATE POLICY "Users can view their network connections"
  ON viral_network_connections FOR SELECT
  USING (auth.uid() = connector_id OR auth.uid() = connected_id);

CREATE POLICY "Users can insert their network connections"
  ON viral_network_connections FOR INSERT
  WITH CHECK (auth.uid() = connector_id);

-- Viral A/B Test Results RLS Policies
CREATE POLICY "Users can view AB test results for their invitations"
  ON viral_ab_test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viral_invitations 
      WHERE viral_invitations.id = viral_ab_test_results.invitation_id 
      AND viral_invitations.sender_id = auth.uid()
    )
  );

-- =============================================
-- PERFORMANCE FUNCTIONS
-- Viral coefficient calculation with optimized queries
-- =============================================

CREATE OR REPLACE FUNCTION calculate_viral_coefficient(
  user_id_param UUID DEFAULT NULL,
  timeframe_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  viral_coefficient DECIMAL(5,2),
  total_inviters INTEGER,
  total_invites_sent INTEGER,
  total_invites_accepted INTEGER,
  acceptance_rate DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  WITH user_invites AS (
    SELECT 
      vi.sender_id,
      COUNT(*) as invites_sent,
      COUNT(CASE WHEN vi.status = 'accepted' THEN 1 END) as invites_accepted
    FROM viral_invitations vi
    WHERE 
      (user_id_param IS NULL OR vi.sender_id = user_id_param)
      AND vi.created_at >= NOW() - (timeframe_days || ' days')::INTERVAL
    GROUP BY vi.sender_id
  ),
  viral_metrics AS (
    SELECT 
      COUNT(DISTINCT sender_id) as users_who_invited,
      SUM(invites_sent) as total_invites_sent,
      SUM(invites_accepted) as total_invites_accepted
    FROM user_invites
  )
  SELECT 
    COALESCE(
      CASE 
        WHEN vm.users_who_invited > 0 
        THEN ROUND((vm.total_invites_accepted::decimal / vm.users_who_invited), 2)
        ELSE 0 
      END, 0
    )::DECIMAL(5,2),
    vm.users_who_invited::INTEGER,
    vm.total_invites_sent::INTEGER,
    vm.total_invites_accepted::INTEGER,
    COALESCE(
      CASE 
        WHEN vm.total_invites_sent > 0 
        THEN ROUND((vm.total_invites_accepted::decimal / vm.total_invites_sent), 4)
        ELSE 0 
      END, 0
    )::DECIMAL(5,4)
  FROM viral_metrics vm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUPER CONNECTOR IDENTIFICATION FUNCTION
-- Identifies users with high viral performance
-- =============================================

CREATE OR REPLACE FUNCTION identify_super_connectors(
  min_referrals INTEGER DEFAULT 5,
  timeframe_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_type TEXT,
  total_referrals INTEGER,
  successful_conversions INTEGER,
  viral_coefficient DECIMAL(5,2),
  network_size INTEGER,
  total_attributed_value DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.id,
      u.name,
      u.user_type,
      COUNT(vi.id) as total_referrals,
      COUNT(CASE WHEN vi.status = 'accepted' THEN 1 END) as successful_conversions,
      COUNT(DISTINCT vnc.connected_id) as network_size,
      SUM(va.conversion_value) as total_attributed_value
    FROM auth.users u
    LEFT JOIN viral_invitations vi ON u.id = vi.sender_id
      AND vi.created_at >= NOW() - (timeframe_days || ' days')::INTERVAL
    LEFT JOIN viral_network_connections vnc ON u.id = vnc.connector_id
    LEFT JOIN viral_attributions va ON u.id = va.referrer_id
      AND va.created_at >= NOW() - (timeframe_days || ' days')::INTERVAL
    GROUP BY u.id, u.name, u.user_type
    HAVING COUNT(CASE WHEN vi.status = 'accepted' THEN 1 END) >= min_referrals
  )
  SELECT 
    us.id,
    us.name,
    us.user_type,
    us.total_referrals::INTEGER,
    us.successful_conversions::INTEGER,
    COALESCE(
      CASE 
        WHEN us.total_referrals > 0 
        THEN ROUND((us.successful_conversions::decimal / us.total_referrals), 2)
        ELSE 0 
      END, 0
    )::DECIMAL(5,2),
    us.network_size::INTEGER,
    COALESCE(us.total_attributed_value, 0)::DECIMAL(10,2)
  FROM user_stats us
  ORDER BY us.successful_conversions DESC, us.network_size DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_viral_invitations_updated_at
  BEFORE UPDATE ON viral_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viral_attributions_updated_at
  BEFORE UPDATE ON viral_attributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create network connections on successful referrals
CREATE OR REPLACE FUNCTION create_network_connection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO viral_network_connections (
      connector_id,
      connected_id,
      connection_type,
      connection_strength,
      first_interaction_at,
      last_interaction_at
    )
    SELECT 
      NEW.sender_id,
      u.id,
      'direct_referral',
      2.0,
      NEW.created_at,
      NOW()
    FROM auth.users u 
    WHERE u.email = NEW.recipient_email
    ON CONFLICT (connector_id, connected_id) 
    DO UPDATE SET
      last_interaction_at = NOW(),
      interaction_count = viral_network_connections.interaction_count + 1,
      connection_strength = LEAST(viral_network_connections.connection_strength + 0.5, 10.0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_network_connection_on_acceptance
  AFTER UPDATE ON viral_invitations
  FOR EACH ROW
  EXECUTE FUNCTION create_network_connection();

-- =============================================
-- INITIAL DATA AND CONFIGURATION
-- =============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance on large datasets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_invitations_composite_performance 
  ON viral_invitations(sender_id, status, created_at DESC) 
  WHERE status IN ('sent', 'accepted');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_attributions_composite_performance 
  ON viral_attributions(referrer_id, conversion_type, created_at DESC)
  WHERE conversion_value > 0;

-- Comments for documentation
COMMENT ON TABLE viral_invitations IS 'Stores all viral invitations with tracking and A/B testing capabilities';
COMMENT ON TABLE viral_attributions IS 'Tracks referral attribution chains and conversion values';
COMMENT ON TABLE viral_funnel_events IS 'Detailed tracking of invitation funnel progression';
COMMENT ON TABLE viral_network_connections IS 'Maps user network relationships for viral analysis';
COMMENT ON TABLE viral_ab_test_results IS 'A/B test results for invitation optimization';

COMMENT ON FUNCTION calculate_viral_coefficient IS 'Calculates viral coefficient for users or entire system';
COMMENT ON FUNCTION identify_super_connectors IS 'Identifies users with exceptional viral performance';

COMMIT;