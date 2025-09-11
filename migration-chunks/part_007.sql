ders
DROP VIEW IF EXISTS rsvp_reminders CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    invitation_id UUID REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('initial', 'followup', 'final', 'custom')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('email', 'sms', 'both')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Waitlist
DROP VIEW IF EXISTS rsvp_waitlist CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone VARCHAR(20),
    party_size INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 999,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'declined', 'expired'))
);

-- RSVP Analytics
DROP VIEW IF EXISTS rsvp_analytics CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_invited INTEGER DEFAULT 0,
    total_responded INTEGER DEFAULT 0,
    total_attending INTEGER DEFAULT 0,
    total_not_attending INTEGER DEFAULT 0,
    total_maybe INTEGER DEFAULT 0,
    total_waitlist INTEGER DEFAULT 0,
    total_guests_confirmed INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2),
    avg_party_size DECIMAL(4,2),
    meal_preferences JSONB,
    dietary_stats JSONB,
    age_distribution JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, date)
);

-- RSVP Change History
DROP VIEW IF EXISTS rsvp_change_history CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Options
DROP VIEW IF EXISTS rsvp_meal_options CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_meal_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    meal_name TEXT NOT NULL,
    meal_description TEXT,
    meal_type VARCHAR(50) CHECK (meal_type IN ('appetizer', 'main', 'dessert', 'kids', 'vegetarian', 'vegan')),
    max_quantity INTEGER,
    price DECIMAL(10,2),
    allergen_info TEXT[],
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rsvp_events_vendor_id ON rsvp_events(vendor_id);
CREATE INDEX idx_rsvp_events_event_date ON rsvp_events(event_date);
CREATE INDEX idx_rsvp_invitations_event_id ON rsvp_invitations(event_id);
CREATE INDEX idx_rsvp_invitations_code ON rsvp_invitations(invitation_code);
CREATE INDEX idx_rsvp_responses_invitation_id ON rsvp_responses(invitation_id);
CREATE INDEX idx_rsvp_responses_event_id ON rsvp_responses(event_id);
CREATE INDEX idx_rsvp_responses_status ON rsvp_responses(response_status);
CREATE INDEX idx_rsvp_reminders_scheduled ON rsvp_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_rsvp_waitlist_event_id ON rsvp_waitlist(event_id) WHERE status = 'waiting';
CREATE INDEX idx_rsvp_analytics_event_date ON rsvp_analytics(event_id, date);

-- Row Level Security
ALTER TABLE rsvp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_guest_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_custom_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_meal_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can manage their RSVP events" ON rsvp_events
    FOR ALL USING (( SELECT auth.uid() ) = vendor_id);

CREATE POLICY "Vendors can view their invitations" ON rsvp_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_invitations.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Public can submit RSVP with invitation code" ON rsvp_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM rsvp_invitations 
            WHERE rsvp_invitations.id = rsvp_responses.invitation_id
        )
    );

CREATE POLICY "Vendors can view responses" ON rsvp_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_responses.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

-- Functions for automation

-- Function to calculate and update analytics
CREATE OR REPLACE FUNCTION update_rsvp_analytics(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO rsvp_analytics (
        event_id,
        date,
        total_invited,
        total_responded,
        total_attending,
        total_not_attending,
        total_maybe,
        total_waitlist,
        total_guests_confirmed,
        response_rate,
        avg_party_size,
        meal_preferences,
        dietary_stats,
        age_distribution
    )
    SELECT 
        p_event_id,
        CURRENT_DATE,
        (SELECT COUNT(*) FROM rsvp_invitations WHERE event_id = p_event_id),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'attending'),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'not_attending'),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'maybe'),
        (SELECT COUNT(*) FROM rsvp_waitlist WHERE event_id = p_event_id AND status = 'waiting'),
        (SELECT COALESCE(SUM(party_size), 0) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'attending'),
        CASE 
            WHEN (SELECT COUNT(*) FROM rsvp_invitations WHERE event_id = p_event_id) > 0
            THEN ((SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id)::DECIMAL / 
                  (SELECT COUNT(*) FROM rsvp_invitations WHERE event_id = p_event_id)::DECIMAL * 100)
            ELSE 0
        END,
        (SELECT AVG(party_size) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'attending'),
        (SELECT jsonb_object_agg(meal_preference, count) 
         FROM (SELECT meal_preference, COUNT(*) as count 
               FROM rsvp_guest_details gd 
               JOIN rsvp_responses r ON gd.response_id = r.id 
               WHERE r.event_id = p_event_id AND meal_preference IS NOT NULL
               GROUP BY meal_preference) t),
        (SELECT jsonb_object_agg(restriction, count)
         FROM (SELECT unnest(dietary_restrictions) as restriction, COUNT(*) as count
               FROM rsvp_guest_details gd
               JOIN rsvp_responses r ON gd.response_id = r.id
               WHERE r.event_id = p_event_id
               GROUP BY restriction) t),
        (SELECT jsonb_object_agg(age_group, count)
         FROM (SELECT age_group, COUNT(*) as count
               FROM rsvp_guest_details gd
               JOIN rsvp_responses r ON gd.response_id = r.id
               WHERE r.event_id = p_event_id AND age_group IS NOT NULL
               GROUP BY age_group) t)
    ON CONFLICT (event_id, date) 
    DO UPDATE SET
        total_invited = EXCLUDED.total_invited,
        total_responded = EXCLUDED.total_responded,
        total_attending = EXCLUDED.total_attending,
        total_not_attending = EXCLUDED.total_not_attending,
        total_maybe = EXCLUDED.total_maybe,
        total_waitlist = EXCLUDED.total_waitlist,
        total_guests_confirmed = EXCLUDED.total_guests_confirmed,
        response_rate = EXCLUDED.response_rate,
        avg_party_size = EXCLUDED.avg_party_size,
        meal_preferences = EXCLUDED.meal_preferences,
        dietary_stats = EXCLUDED.dietary_stats,
        age_distribution = EXCLUDED.age_distribution;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule reminders
CREATE OR REPLACE FUNCTION schedule_rsvp_reminders(p_event_id UUID, p_invitation_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_event RECORD;
    v_reminder_days INTEGER[];
    v_day INTEGER;
BEGIN
    SELECT * INTO v_event FROM rsvp_events WHERE id = p_event_id;
    
    IF v_event.reminder_settings->>'enabled' = 'true' THEN
        v_reminder_days := ARRAY(SELECT jsonb_array_elements_text(v_event.reminder_settings->'days_before')::INTEGER);
        
        FOREACH v_day IN ARRAY v_reminder_days LOOP
            IF p_invitation_id IS NULL THEN
                -- Schedule for all invitations
                INSERT INTO rsvp_reminders (event_id, invitation_id, reminder_type, scheduled_for, delivery_method)
                SELECT 
                    p_event_id,
                    i.id,
                    CASE 
                        WHEN v_day >= 30 THEN 'initial'
                        WHEN v_day >= 7 THEN 'followup'
                        ELSE 'final'
                    END,
                    v_event.event_date - INTERVAL '1 day' * v_day,
                    CASE 
                        WHEN i.guest_email IS NOT NULL AND i.guest_phone IS NOT NULL THEN 'both'
                        WHEN i.guest_email IS NOT NULL THEN 'email'
                        WHEN i.guest_phone IS NOT NULL THEN 'sms'
                    END
                FROM rsvp_invitations i
                WHERE i.event_id = p_event_id
                AND NOT EXISTS (
                    SELECT 1 FROM rsvp_reminders r 
                    WHERE r.invitation_id = i.id 
                    AND r.scheduled_for = v_event.event_date - INTERVAL '1 day' * v_day
                );
            ELSE
                -- Schedule for specific invitation
                INSERT INTO rsvp_reminders (event_id, invitation_id, reminder_type, scheduled_for, delivery_method)
                SELECT 
                    p_event_id,
                    p_invitation_id,
                    CASE 
                        WHEN v_day >= 30 THEN 'initial'
                        WHEN v_day >= 7 THEN 'followup'
                        ELSE 'final'
                    END,
                    v_event.event_date - INTERVAL '1 day' * v_day,
                    CASE 
                        WHEN i.guest_email IS NOT NULL AND i.guest_phone IS NOT NULL THEN 'both'
                        WHEN i.guest_email IS NOT NULL THEN 'email'
                        WHEN i.guest_phone IS NOT NULL THEN 'sms'
                    END
                FROM rsvp_invitations i
                WHERE i.id = p_invitation_id
                AND NOT EXISTS (
                    SELECT 1 FROM rsvp_reminders r 
                    WHERE r.invitation_id = p_invitation_id 
                    AND r.scheduled_for = v_event.event_date - INTERVAL '1 day' * v_day
                );
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics on response changes
CREATE OR REPLACE FUNCTION trigger_update_rsvp_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_rsvp_analytics(COALESCE(NEW.event_id, OLD.event_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_response
AFTER INSERT OR UPDATE OR DELETE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION trigger_update_rsvp_analytics();

-- Trigger to track changes
CREATE OR REPLACE FUNCTION trigger_track_rsvp_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO rsvp_change_history (
            response_id,
            changed_by,
            change_type,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            auth.uid(),
            'response_update',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_rsvp_changes
AFTER UPDATE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION trigger_track_rsvp_changes();

-- Function to process waitlist when space becomes available
CREATE OR REPLACE FUNCTION process_rsvp_waitlist(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
    v_event RECORD;
    v_current_guests INTEGER;
    v_available_space INTEGER;
    v_waitlist RECORD;
BEGIN
    SELECT * INTO v_event FROM rsvp_events WHERE id = p_event_id;
    
    IF v_event.max_guests IS NOT NULL THEN
        SELECT COALESCE(SUM(party_size), 0) INTO v_current_guests
        FROM rsvp_responses 
        WHERE event_id = p_event_id AND response_status = 'attending';
        
        v_available_space := v_event.max_guests - v_current_guests;
        
        IF v_available_space > 0 THEN
            FOR v_waitlist IN 
                SELECT * FROM rsvp_waitlist 
                WHERE event_id = p_event_id 
                AND status = 'waiting'
                AND party_size <= v_available_space
                ORDER BY priority, added_at
                LIMIT 1
            LOOP
                -- Create invitation for waitlist guest
                INSERT INTO rsvp_invitations (
                    event_id,
                    guest_name,
                    guest_email,
                    guest_phone,
                    max_party_size
                ) VALUES (
                    p_event_id,
                    v_waitlist.guest_name,
                    v_waitlist.guest_email,
                    v_waitlist.guest_phone,
                    v_waitlist.party_size
                );
                
                -- Update waitlist status
                UPDATE rsvp_waitlist 
                SET status = 'invited', invited_at = NOW()
                WHERE id = v_waitlist.id;
                
                v_available_space := v_available_space - v_waitlist.party_size;
            END LOOP;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rsvp_events_updated_at BEFORE UPDATE ON rsvp_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_invitations_updated_at BEFORE UPDATE ON rsvp_invitations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_responses_updated_at BEFORE UPDATE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- Migration: 20250101000042_wedding_website_system.sql
-- ========================================

-- Create wedding_websites table
DROP VIEW IF EXISTS wedding_websites CASCADE;
CREATE TABLE IF NOT EXISTS wedding_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255),
  is_published BOOLEAN DEFAULT false,
  is_password_protected BOOLEAN DEFAULT false,
  password_hash TEXT,
  template_id VARCHAR(100) DEFAULT 'default',
  custom_css TEXT,
  primary_language VARCHAR(10) DEFAULT 'en',
  supported_languages TEXT[] DEFAULT ARRAY['en'],
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Create website_content table
DROP VIEW IF EXISTS website_content CASCADE;
CREATE TABLE IF NOT EXISTS website_content (
  website_id UUID PRIMARY KEY REFERENCES wedding_websites(id) ON DELETE CASCADE,
  hero_title VARCHAR(255),
  hero_subtitle VARCHAR(255),
  hero_image TEXT,
  hero_date DATE,
  welcome_message TEXT,
  venue_name VARCHAR(255),
  venue_address TEXT,
  ceremony_time TIME,
  reception_time TIME,
  dress_code VARCHAR(100),
  additional_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wedding_stories table
DROP VIEW IF EXISTS wedding_stories CASCADE;
CREATE TABLE IF NOT EXISTS wedding_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  date DATE,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wedding_party_members table
DROP VIEW IF EXISTS wedding_party_members CASCADE;
CREATE TABLE IF NOT EXISTS wedding_party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('bridesmaid', 'groomsman', 'maid_of_honor', 'best_man', 'flower_girl', 'ring_bearer', 'other')),
  bio TEXT,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create registry_links table
DROP VIEW IF EXISTS registry_links CASCADE;
CREATE TABLE IF NOT EXISTS registry_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create travel_info table
DROP VIEW IF EXISTS travel_info CASCADE;
CREATE TABLE IF NOT EXISTS travel_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  address TEXT,
  map_url TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('accommodation', 'transportation', 'attraction', 'venue', 'other')),
  website_url TEXT,
  phone VARCHAR(50),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create website_translations table
DROP VIEW IF EXISTS website_translations CASCADE;
CREATE TABLE IF NOT EXISTS website_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  field_key VARCHAR(255) NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, language_code, field_key)
);

-- Create website_themes table
DROP VIEW IF EXISTS website_themes CASCADE;
CREATE TABLE IF NOT EXISTS website_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  default_colors JSONB,
  default_fonts JSONB,
  features TEXT[],
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create website_analytics table
DROP VIEW IF EXISTS website_analytics CASCADE;
CREATE TABLE IF NOT EXISTS website_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  average_time_on_page INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  top_referrers TEXT[],
  device_breakdown JSONB,
  location_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_wedding_websites_client_id ON wedding_websites(client_id);
CREATE INDEX idx_wedding_websites_slug ON wedding_websites(slug);
CREATE INDEX idx_wedding_websites_is_published ON wedding_websites(is_published);
CREATE INDEX idx_wedding_stories_website_id ON wedding_stories(website_id);
CREATE INDEX idx_wedding_party_members_website_id ON wedding_party_members(website_id);
CREATE INDEX idx_registry_links_website_id ON registry_links(website_id);
CREATE INDEX idx_travel_info_website_id ON travel_info(website_id);
CREATE INDEX idx_website_translations_website_id ON website_translations(website_id);
CREATE INDEX idx_website_translations_language ON website_translations(language_code);
CREATE INDEX idx_website_analytics_website_id_date ON website_analytics(website_id, date);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wedding_websites_updated_at BEFORE UPDATE ON wedding_websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_content_updated_at BEFORE UPDATE ON website_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_stories_updated_at BEFORE UPDATE ON wedding_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_party_members_updated_at BEFORE UPDATE ON wedding_party_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registry_links_updated_at BEFORE UPDATE ON registry_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_info_updated_at BEFORE UPDATE ON travel_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_translations_updated_at BEFORE UPDATE ON website_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE wedding_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for wedding_websites
CREATE POLICY "Users can view their own wedding websites"
  ON wedding_websites FOR SELECT
  USING (( SELECT auth.uid() ) = client_id);

CREATE POLICY "Users can create their own wedding websites"
  ON wedding_websites FOR INSERT
  WITH CHECK (( SELECT auth.uid() ) = client_id);

CREATE POLICY "Users can update their own wedding websites"
  ON wedding_websites FOR UPDATE
  USING (( SELECT auth.uid() ) = client_id);

CREATE POLICY "Users can delete their own wedding websites"
  ON wedding_websites FOR DELETE
  USING (( SELECT auth.uid() ) = client_id);

-- Similar policies for other tables (website_content, wedding_stories, etc.)
CREATE POLICY "Users can manage website content"
  ON website_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_content.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can manage wedding stories"
  ON wedding_stories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = wedding_stories.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can manage wedding party members"
  ON wedding_party_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = wedding_party_members.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can manage registry links"
  ON registry_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = registry_links.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can manage travel info"
  ON travel_info FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = travel_info.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can manage translations"
  ON website_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_translations.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can view their website analytics"
  ON website_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_analytics.website_id
      AND wedding_websites.client_id = ( SELECT auth.uid() )
    )
  );

-- Insert default themes
INSERT INTO website_themes (name, preview_url, thumbnail_url, default_colors, default_fonts, features, is_premium) VALUES
  ('Classic Elegance', '/themes/classic-preview.jpg', '/themes/classic-thumb.jpg', 
   '{"primary": "#4A5568", "secondary": "#718096", "accent": "#D69E2E", "text": "#2D3748", "background": "#FFFFFF"}',
   '{"heading": "Playfair Display", "body": "Open Sans"}',
   ARRAY['Elegant typography', 'Timeline layout', 'Photo gallery'],
   false),
  ('Modern Minimal', '/themes/modern-preview.jpg', '/themes/modern-thumb.jpg',
   '{"primary": "#000000", "secondary": "#4A5568", "accent": "#ED8936", "text": "#1A202C", "background": "#FFFFFF"}',
   '{"heading": "Montserrat", "body": "Lato"}',
   ARRAY['Clean design', 'Card layouts', 'Smooth animations'],
   false),
  ('Romantic Garden', '/themes/garden-preview.jpg', '/themes/garden-thumb.jpg',
   '{"primary": "#D53F8C", "secondary": "#B83280", "accent": "#97266D", "text": "#702459", "background": "#FFF5F7"}',
   '{"heading": "Dancing Script", "body": "Raleway"}',
   ARRAY['Floral elements', 'Soft colors', 'Love quotes'],
   true);


-- ========================================
-- Migration: 20250101000043_referral_programs_system.sql
-- ========================================

-- Migration: 026_referral_programs_system.sql
-- Feature: WS-046 - Referral Programs System  
-- Description: Complete referral system with programs, codes, conversions and analytics

-- Referral Programs table
DROP VIEW IF EXISTS referral_programs CASCADE;
CREATE TABLE IF NOT EXISTS referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  name VARCHAR(100) NOT NULL,
  reward_type VARCHAR(20) CHECK (reward_type IN ('monetary', 'percentage', 'upgrade', 'custom')),
  referrer_reward_amount DECIMAL(10,2),
  referee_reward_amount DECIMAL(10,2),
  milestone_rewards JSONB, -- {3: 50.00, 5: 100.00, 10: 250.00}
  attribution_window_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Codes table
DROP VIEW IF EXISTS referral_codes CASCADE;
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  program_id UUID NOT NULL REFERENCES referral_programs(id),
  couple_id UUID NOT NULL REFERENCES couples(id),
  landing_page_url TEXT,
  qr_code_url TEXT,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Conversions table
DROP VIEW IF EXISTS referral_conversions CASCADE;
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referred_couple_id UUID REFERENCES couples(id),
  referred_email VARCHAR(255) NOT NULL,
  click_timestamp TIMESTAMP WITH TIME ZONE,
  conversion_timestamp TIMESTAMP WITH TIME ZONE,
  reward_fulfilled BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(10,2),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Analytics table
DROP VIEW IF EXISTS referral_analytics CASCADE;
CREATE TABLE IF NOT EXISTS referral_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES referral_programs(id),
  date DATE NOT NULL,
  invitations_sent INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  rewards_paid DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(program_id, date)
);

-- Performance indexes
CREATE INDEX idx_referral_programs_supplier ON referral_programs(supplier_id);
CREATE INDEX idx_referral_programs_active ON referral_programs(is_active, expires_at);
CREATE INDEX idx_referral_codes_program ON referral_codes(program_id);
CREATE INDEX idx_referral_codes_couple ON referral_codes(couple_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_conversions_code ON referral_conversions(referral_code_id);
CREATE INDEX idx_referral_conversions_email ON referral_conversions(referred_email);
CREATE INDEX idx_referral_conversions_timestamp ON referral_conversions(conversion_timestamp);
CREATE INDEX idx_referral_analytics_program_date ON referral_analytics(program_id, date);

-- Row Level Security Policies
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_programs
CREATE POLICY "Suppliers can view their own referral programs"
ON referral_programs FOR SELECT
TO authenticated
USING (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Suppliers can create their own referral programs"
ON referral_programs FOR INSERT
TO authenticated
WITH CHECK (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Suppliers can update their own referral programs"
ON referral_programs FOR UPDATE
TO authenticated
USING (supplier_id = ( SELECT auth.uid() ));

-- RLS Policies for referral_codes
CREATE POLICY "Suppliers can view their referral codes"
ON referral_codes FOR SELECT
TO authenticated
USING (
  program_id IN (
    SELECT id FROM referral_programs WHERE supplier_id = ( SELECT auth.uid() )
  )
);

CREATE POLICY "Suppliers can create referral codes"
ON referral_codes FOR INSERT
TO authenticated
WITH CHECK (
  program_id IN (
    SELECT id FROM referral_programs WHERE supplier_id = ( SELECT auth.uid() )
  )
);

-- RLS Policies for referral_conversions
CREATE POLICY "Suppliers can view their conversions"
ON referral_conversions FOR SELECT
TO authenticated
USING (
  referral_code_id IN (
    SELECT rc.id FROM referral_codes rc
    JOIN referral_programs rp ON rc.program_id = rp.id
    WHERE rp.supplier_id = ( SELECT auth.uid() )
  )
);

CREATE POLICY "System can create conversions"
ON referral_conversions FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for referral_analytics
CREATE POLICY "Suppliers can view their analytics"
ON referral_analytics FOR SELECT
TO authenticated
USING (
  program_id IN (
    SELECT id FROM referral_programs WHERE supplier_id = ( SELECT auth.uid() )
  )
);

-- Functions for automated code generation and analytics
CREATE OR REPLACE FUNCTION update_referral_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO referral_analytics (program_id, date, clicks, conversions)
  VALUES (
    (SELECT program_id FROM referral_codes WHERE id = NEW.referral_code_id),
    CURRENT_DATE,
    CASE WHEN NEW.click_timestamp IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.conversion_timestamp IS NOT NULL THEN 1 ELSE 0 END
  )
  ON CONFLICT (program_id, date)
  DO UPDATE SET
    clicks = referral_analytics.clicks + CASE WHEN NEW.click_timestamp IS NOT NULL THEN 1 ELSE 0 END,
    conversions = referral_analytics.conversions + CASE WHEN NEW.conversion_timestamp IS NOT NULL THEN 1 ELSE 0 END,
    revenue_generated = referral_analytics.revenue_generated + COALESCE(NEW.reward_amount, 0);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_analytics
  AFTER INSERT ON referral_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_analytics();

-- Function to update click counts
CREATE OR REPLACE FUNCTION increment_click_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE referral_codes 
  SET total_clicks = total_clicks + 1
  WHERE id = NEW.referral_code_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_clicks
  AFTER INSERT ON referral_conversions
  FOR EACH ROW
  WHEN (NEW.click_timestamp IS NOT NULL)
  EXECUTE FUNCTION increment_click_count();


-- ========================================
-- Migration: 20250101000044_task_delegation_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Task Delegation System Migration
-- WS-058: Comprehensive task delegation system for efficient workflow management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled');
CREATE TYPE task_category AS ENUM (
  'venue_management', 'vendor_coordination', 'client_management', 'logistics',
  'design', 'photography', 'catering', 'florals', 'music', 'transportation'
);
CREATE TYPE dependency_type AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');
CREATE TYPE notification_type AS ENUM ('assignment', 'deadline_reminder', 'status_change', 'dependency_update');

-- Team members table (extends existing user profiles)
DROP VIEW IF EXISTS team_members CASCADE;
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coordinator',
  specialties task_category[] DEFAULT '{}',
  available_hours_per_week INTEGER DEFAULT 40,
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow tasks table
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  category task_category NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'todo',
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES team_members(id),
  created_by UUID NOT NULL REFERENCES team_members(id),
  estimated_duration INTEGER NOT NULL DEFAULT 1, -- in hours
  buffer_time INTEGER DEFAULT 0, -- in hours
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_critical_path BOOLEAN DEFAULT false,
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task dependencies table
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  predecessor_task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  dependency_type dependency_type NOT NULL DEFAULT 'finish_to_start',
  lag_time INTEGER DEFAULT 0, -- in hours
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (predecessor_task_id != successor_task_id),
  CONSTRAINT unique_dependency UNIQUE (predecessor_task_id, successor_task_id)
);

-- Task assignments table (for multiple assignees)
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES team_members(id),
  role TEXT DEFAULT 'assignee',
  is_primary BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_primary_assignment UNIQUE (task_id, is_primary) WHERE is_primary = true
);

-- Task notifications table
CREATE TABLE task_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workload metrics table
CREATE TABLE workload_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_tasks INTEGER DEFAULT 0,
  overdue_tasks INTEGER DEFAULT 0,
  upcoming_deadlines INTEGER DEFAULT 0,
  capacity_utilization DECIMAL(5,2) DEFAULT 0.0,
  weekly_hours_scheduled DECIMAL(5,2) DEFAULT 0.0,
  efficiency_score DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_member_date UNIQUE (team_member_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_workflow_tasks_wedding_id ON workflow_tasks(wedding_id);
CREATE INDEX idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_deadline ON workflow_tasks(deadline);
CREATE INDEX idx_workflow_tasks_category ON workflow_tasks(category);
CREATE INDEX idx_workflow_tasks_priority ON workflow_tasks(priority);
CREATE INDEX idx_workflow_tasks_critical_path ON workflow_tasks(is_critical_path);
CREATE INDEX idx_task_dependencies_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_dependencies_successor ON task_dependencies(successor_task_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_notifications_recipient ON task_notifications(recipient_id);
CREATE INDEX idx_task_notifications_unread ON task_notifications(recipient_id, is_read);
CREATE INDEX idx_workload_metrics_member_date ON workload_metrics(team_member_id, date);

-- Functions for critical path calculation
CREATE OR REPLACE FUNCTION calculate_critical_path(wedding_uuid UUID)
RETURNS TABLE (
  task_id UUID,
  is_critical BOOLEAN,
  earliest_start TIMESTAMP WITH TIME ZONE,
  latest_start TIMESTAMP WITH TIME ZONE,
  slack_time INTERVAL
) AS $$
BEGIN
  -- Simplified critical path calculation
  -- In production, this would be a more complex algorithm
  RETURN QUERY
  WITH RECURSIVE task_paths AS (
    -- Base case: tasks with no dependencies
    SELECT 
      t.id,
      t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour' as earliest_start,
      0 as depth
    FROM workflow_tasks t
    WHERE t.wedding_id = wedding_uuid
      AND NOT EXISTS (
        SELECT 1 FROM task_dependencies td 
        WHERE td.successor_task_id = t.id
      )
    
    UNION ALL
    
    -- Recursive case: tasks with dependencies
    SELECT 
      t.id,
      GREATEST(
        tp.earliest_start + (pt.estimated_duration + pt.buffer_time + td.lag_time) * INTERVAL '1 hour',
        t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour'
      ),
      tp.depth + 1
    FROM workflow_tasks t
    JOIN task_dependencies td ON td.successor_task_id = t.id
    JOIN workflow_tasks pt ON pt.id = td.predecessor_task_id
    JOIN task_paths tp ON tp.task_id = pt.id
    WHERE t.wedding_id = wedding_uuid
  )
  SELECT 
    tp.task_id,
    (tp.earliest_start = t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour') as is_critical,
    tp.earliest_start,
    t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour' as latest_start,
    (t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour' - tp.earliest_start) as slack_time
  FROM task_paths tp
  JOIN workflow_tasks t ON t.id = tp.task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update workload metrics
CREATE OR REPLACE FUNCTION update_workload_metrics(member_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_tasks_count INTEGER;
  overdue_count INTEGER;
  upcoming_count INTEGER;
  total_hours DECIMAL;
  available_hours DECIMAL;
  utilization DECIMAL;
BEGIN
  -- Calculate current metrics
  SELECT COUNT(*) INTO current_tasks_count
  FROM workflow_tasks
  WHERE assigned_to = member_uuid AND status IN ('todo', 'in_progress');
  
  SELECT COUNT(*) INTO overdue_count
  FROM workflow_tasks
  WHERE assigned_to = member_uuid 
    AND deadline < NOW() 
    AND status NOT IN ('completed', 'cancelled');
  
  SELECT COUNT(*) INTO upcoming_count
  FROM workflow_tasks
  WHERE assigned_to = member_uuid 
    AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND status NOT IN ('completed', 'cancelled');
  
  SELECT COALESCE(SUM(estimated_duration), 0) INTO total_hours
  FROM workflow_tasks
  WHERE assigned_to = member_uuid 
    AND status IN ('todo', 'in_progress')
    AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days';
  
  SELECT available_hours_per_week INTO available_hours
  FROM team_members
  WHERE id = member_uuid;
  
  utilization := CASE WHEN available_hours > 0 THEN (total_hours / available_hours) * 100 ELSE 0 END;
  
  -- Insert or update metrics
  INSERT INTO workload_metrics (
    team_member_id, current_tasks, overdue_tasks, upcoming_deadlines,
    capacity_utilization, weekly_hours_scheduled
  ) VALUES (
    member_uuid, current_tasks_count, overdue_count, upcoming_count,
    utilization, total_hours
  )
  ON CONFLICT (team_member_id, date)
  DO UPDATE SET
    current_tasks = EXCLUDED.current_tasks,
    overdue_tasks = EXCLUDED.overdue_tasks,
    upcoming_deadlines = EXCLUDED.upcoming_deadlines,
    capacity_utilization = EXCLUDED.capacity_utilization,
    weekly_hours_scheduled = EXCLUDED.weekly_hours_scheduled;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workload metrics on task changes
CREATE OR REPLACE FUNCTION trigger_update_workload()
RETURNS TRIGGER AS $$
BEGIN
  -- Update metrics for old assignee if changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    IF OLD.assigned_to IS NOT NULL THEN
      PERFORM update_workload_metrics(OLD.assigned_to);
    END IF;
  END IF;
  
  -- Update metrics for current assignee
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM update_workload_metrics(NEW.assigned_to);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_tasks_workload_update
  AFTER INSERT OR UPDATE OF assigned_to, status, deadline, estimated_duration
  ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_workload();

-- Function to create automatic notifications
CREATE OR REPLACE FUNCTION create_task_notification(
  task_uuid UUID,
  recipient_uuid UUID,
  notif_type notification_type,
  notif_title TEXT,
  notif_message TEXT,
  schedule_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO task_notifications (
    task_id, recipient_id, notification_type, title, message, scheduled_for
  ) VALUES (
    task_uuid, recipient_uuid, notif_type, notif_title, notif_message, schedule_time
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic notifications on task assignment
CREATE OR REPLACE FUNCTION trigger_task_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Assignment notification
  IF TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL THEN
    PERFORM create_task_notification(
      NEW.id,
      NEW.assigned_to,
      'assignment',
      'New Task Assigned: ' || NEW.title,
      'You have been assigned a new task: ' || NEW.title || '. Deadline: ' || NEW.deadline::TEXT
    );
  END IF;
  
  -- Status change notification
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.assigned_by != NEW.assigned_to THEN
      PERFORM create_task_notification(
        NEW.id,
        NEW.assigned_by,
        'status_change',
        'Task Status Updated: ' || NEW.title,
        'Task "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;
  END IF;
  
  -- Deadline reminder (1 day before)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.deadline IS DISTINCT FROM NEW.deadline) THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.status NOT IN ('completed', 'cancelled') THEN
      PERFORM create_task_notification(
        NEW.id,
        NEW.assigned_to,
        'deadline_reminder',
        'Deadline Reminder: ' || NEW.title,
        'Reminder: Task "' || NEW.title || '" is due on ' || NEW.deadline::TEXT,
        NEW.deadline - INTERVAL '1 day'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_tasks_notifications
  AFTER INSERT OR UPDATE OF assigned_to, status, deadline
  ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_notifications();

-- Row Level Security (RLS) policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_metrics ENABLE ROW LEVEL SECURITY;

-- Team members can see all team members in their organization
CREATE POLICY "Team members visibility" ON team_members
  FOR SELECT USING (true); -- Simplified for demo - in production, add organization filtering

-- Users can view tasks they're involved with
CREATE POLICY "Task access" ON workflow_tasks
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    created_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    assigned_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Users can create tasks
CREATE POLICY "Task creation" ON workflow_tasks
  FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Users can update tasks they're assigned to or created
CREATE POLICY "Task updates" ON workflow_tasks
  FOR UPDATE USING (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    created_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    assigned_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Dependency access follows task access
CREATE POLICY "Dependency access" ON task_dependencies
  FOR SELECT USING (
    predecessor_task_id IN (SELECT id FROM workflow_tasks) OR
    successor_task_id IN (SELECT id FROM workflow_tasks)
  );

-- Assignment access
CREATE POLICY "Assignment access" ON task_assignments
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    assigned_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Notification access
CREATE POLICY "Notification access" ON task_notifications
  FOR SELECT USING (
    recipient_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Workload metrics access
CREATE POLICY "Workload access" ON workload_metrics
  FOR SELECT USING (
    team_member_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    EXISTS (SELECT 1 FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND role IN ('admin', 'manager'))
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create initial wedding planner roles
INSERT INTO team_members (user_id, name, email, role, specialties) VALUES
(auth.uid(), 'System Administrator', 'admin@wedsync.com', 'admin', ARRAY['venue_management', 'vendor_coordination']::task_category[])
ON CONFLICT DO NOTHING;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000045_delegation_workflow_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Delegation Workflow System Migration
-- WS-058: Role-based delegation workflow with approval processes

-- Create enum types for roles and permissions
CREATE TYPE user_role AS ENUM (
  'admin', 'wedding_planner', 'senior_coordinator', 
  'coordinator', 'specialist', 'vendor', 'client'
);

CREATE TYPE delegation_type AS ENUM ('assignment', 'approval', 'review', 'collaboration');
CREATE TYPE delegation_status AS ENUM ('pending', 'approved', 'rejected', 'auto_approved');
CREATE TYPE workflow_type AS ENUM (
  'task_creation', 'task_assignment', 'deadline_change', 
  'priority_change', 'resource_allocation'
);
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Update team_members table to include role hierarchy
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'coordinator',
ADD COLUMN IF NOT EXISTS authority_level INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS can_delegate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_delegation_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS approval_authority TEXT[] DEFAULT '{}';

-- Team hierarchy table
CREATE TABLE team_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES team_hierarchy(id),
  user_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'coordinator',
  level INTEGER NOT NULL DEFAULT 1,
  reports_to UUID REFERENCES team_members(id),
  can_approve_for UUID[] DEFAULT '{}',
  department TEXT,
  specializations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Delegation requests table
CREATE TABLE delegation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES team_members(id),
  to_user_id UUID NOT NULL REFERENCES team_members(id),
  delegated_by UUID NOT NULL REFERENCES team_members(id),
  delegation_type delegation_type NOT NULL DEFAULT 'assignment',
  authority_level INTEGER NOT NULL DEFAULT 1,
  deadline TIMESTAMP WITH TIME ZONE,
  instructions TEXT,
  status delegation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_notes TEXT,
  auto_approved BOOLEAN DEFAULT false
);

-- Workflow approvals table
CREATE TABLE workflow_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type workflow_type NOT NULL,
  entity_id UUID NOT NULL, -- Task ID, etc.
  requested_by UUID NOT NULL REFERENCES team_members(id),
  approver_id UUID NOT NULL REFERENCES team_members(id),
  status approval_status NOT NULL DEFAULT 'pending',
  request_data JSONB NOT NULL DEFAULT '{}',
  approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Role permissions table (for flexible permission management)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  permission_name TEXT NOT NULL,
  permission_scope TEXT DEFAULT 'all', -- 'all', 'own', 'team', 'department'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_name, permission_scope)
);

-- User-specific permission overrides
CREATE TABLE user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  permission_scope TEXT DEFAULT 'all',
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID NOT NULL REFERENCES team_members(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_team_hierarchy_user_id ON team_hierarchy(user_id);
CREATE INDEX idx_team_hierarchy_parent_id ON team_hierarchy(parent_id);
CREATE INDEX idx_team_hierarchy_reports_to ON team_hierarchy(reports_to);
CREATE INDEX idx_delegation_requests_task_id ON delegation_requests(task_id);
CREATE INDEX idx_delegation_requests_from_user ON delegation_requests(from_user_id);
CREATE INDEX idx_delegation_requests_to_user ON delegation_requests(to_user_id);
CREATE INDEX idx_delegation_requests_status ON delegation_requests(status);
CREATE INDEX idx_workflow_approvals_approver ON workflow_approvals(approver_id);
CREATE INDEX idx_workflow_approvals_requested_by ON workflow_approvals(requested_by);
CREATE INDEX idx_workflow_approvals_status ON workflow_approvals(status);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_user_permission_overrides_user ON user_permission_overrides(user_id);

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_name, permission_scope) VALUES
-- Admin permissions
('admin', 'create_tasks', 'all'),
('admin', 'edit_tasks', 'all'),
('admin', 'delete_tasks', 'all'),
('admin', 'assign_tasks', 'all'),
('admin', 'view_all_tasks', 'all'),
('admin', 'manage_team', 'all'),
('admin', 'view_team_workload', 'all'),
('admin', 'assign_team_members', 'all'),
('admin', 'manage_workflows', 'all'),
('admin', 'approve_delegations', 'all'),
('admin', 'override_assignments', 'all'),
('admin', 'manage_vendors', 'all'),
('admin', 'assign_vendor_tasks', 'all'),
('admin', 'view_client_tasks', 'all'),
('admin', 'approve_client_requests', 'all'),
('admin', 'manage_settings', 'all'),
('admin', 'view_analytics', 'all'),
('admin', 'export_data', 'all'),

-- Wedding Planner permissions
('wedding_planner', 'create_tasks', 'all'),
('wedding_planner', 'edit_tasks', 'all'),
('wedding_planner', 'delete_tasks', 'all'),
('wedding_planner', 'assign_tasks', 'all'),
('wedding_planner', 'view_all_tasks', 'all'),
('wedding_planner', 'manage_team', 'team'),
('wedding_planner', 'view_team_workload', 'all'),
('wedding_planner', 'assign_team_members', 'team'),
('wedding_planner', 'manage_workflows', 'team'),
('wedding_planner', 'approve_delegations', 'team'),
('wedding_planner', 'override_assignments', 'team'),
('wedding_planner', 'manage_vendors', 'all'),
('wedding_planner', 'assign_vendor_tasks', 'all'),
('wedding_planner', 'view_client_tasks', 'all'),
('wedding_planner', 'approve_client_requests', 'all'),
('wedding_planner', 'view_analytics', 'all'),
('wedding_planner', 'export_data', 'team'),

-- Senior Coordinator permissions
('senior_coordinator', 'create_tasks', 'team'),
('senior_coordinator', 'edit_tasks', 'team'),
('senior_coordinator', 'assign_tasks', 'team'),
('senior_coordinator', 'view_all_tasks', 'team'),
('senior_coordinator', 'view_team_workload', 'team'),
('senior_coordinator', 'assign_team_members', 'team'),
('senior_coordinator', 'approve_delegations', 'team'),
('senior_coordinator', 'assign_vendor_tasks', 'team'),
('senior_coordinator', 'view_client_tasks', 'team'),
('senior_coordinator', 'view_analytics', 'team'),

-- Coordinator permissions
('coordinator', 'create_tasks', 'own'),
('coordinator', 'edit_tasks', 'own'),
('coordinator', 'assign_tasks', 'own'),
('coordinator', 'view_all_tasks', 'team'),
('coordinator', 'assign_vendor_tasks', 'own'),
('coordinator', 'view_client_tasks', 'own'),

-- Specialist permissions
('specialist', 'create_tasks', 'own'),
('specialist', 'edit_tasks', 'own'),
('specialist', 'view_client_tasks', 'own'),

-- Vendor permissions
('vendor', 'edit_tasks', 'own'),
('vendor', 'view_client_tasks', 'own'),

-- Client permissions
('client', 'view_client_tasks', 'own'),
('client', 'approve_client_requests', 'own');

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID,
  permission_name TEXT,
  scope_context TEXT DEFAULT 'all'
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  has_permission BOOLEAN := false;
  override_permission BOOLEAN;
BEGIN
  -- Get user role
  SELECT tm.user_role INTO user_role_val
  FROM team_members tm
  WHERE tm.id = user_uuid;
  
  IF user_role_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for user-specific overrides first
  SELECT upo.granted INTO override_permission
  FROM user_permission_overrides upo
  WHERE upo.user_id = user_uuid 
    AND upo.permission_name = permission_name
    AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
  ORDER BY upo.created_at DESC
  LIMIT 1;
  
  IF override_permission IS NOT NULL THEN
    RETURN override_permission;
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 FROM role_permissions rp
    WHERE rp.role = user_role_val
      AND rp.permission_name = permission_name
      AND (rp.permission_scope = 'all' OR rp.permission_scope = scope_context)
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to check delegation authority
CREATE OR REPLACE FUNCTION can_delegate_to_user(
  delegator_id UUID,
  delegatee_id UUID,
  delegation_level INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  delegator_level INTEGER;
  delegatee_level INTEGER;
  max_delegation INTEGER;
  can_delegate BOOLEAN;
BEGIN
  -- Get delegator info
  SELECT tm.authority_level, tm.can_delegate, tm.max_delegation_level
  INTO delegator_level, can_delegate, max_delegation
  FROM team_members tm
  WHERE tm.id = delegator_id;
  
  -- Get delegatee level
  SELECT tm.authority_level INTO delegatee_level
  FROM team_members tm
  WHERE tm.id = delegatee_id;
  
  -- Check if delegation is allowed
  IF NOT can_delegate THEN
    RETURN false;
  END IF;
  
  -- Check if delegation level is within limits
  IF delegation_level > max_delegation THEN
    RETURN false;
  END IF;
  
  -- Check if delegator has higher authority than delegatee
  IF delegator_level <= delegatee_level THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-approve delegations based on rules
CREATE OR REPLACE FUNCTION process_delegation_auto_approval()
RETURNS TRIGGER AS $$
DECLARE
  delegator_level INTEGER;
  delegatee_level INTEGER;
  authority_diff INTEGER;
BEGIN
  -- Get authority levels
  SELECT tm.authority_level INTO delegator_level
  FROM team_members tm WHERE tm.id = NEW.delegated_by;
  
  SELECT tm.authority_level INTO delegatee_level
  FROM team_members tm WHERE tm.id = NEW.to_user_id;
  
  authority_diff := delegator_level - delegatee_level;
  
  -- Auto-approve if authority difference is significant (>20 levels)
  -- or if it's a low-level delegation
  IF authority_diff >= 20 OR NEW.authority_level <= 2 THEN
    NEW.status := 'auto_approved';
    NEW.auto_approved := true;
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delegation_auto_approval
  BEFORE INSERT ON delegation_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_delegation_auto_approval();

-- Function to create approval workflow for high-level changes
CREATE OR REPLACE FUNCTION create_workflow_approval(
  workflow_type_val workflow_type,
  entity_id_val UUID,
  requested_by_val UUID,
  request_data_val JSONB
)
RETURNS UUID AS $$
DECLARE
  approval_id UUID;
  approver_id UUID;
  user_level INTEGER;
  required_level INTEGER := 70; -- Default approval level
BEGIN
  -- Get user's authority level
  SELECT tm.authority_level INTO user_level
  FROM team_members tm WHERE tm.id = requested_by_val;
  
  -- Determine required approval level based on workflow type
  CASE workflow_type_val
    WHEN 'deadline_change' THEN required_level := 50;
    WHEN 'priority_change' THEN required_level := 60;
    WHEN 'resource_allocation' THEN required_level := 70;
    WHEN 'task_assignment' THEN required_level := 40;
    ELSE required_level := 70;
  END CASE;
  
  -- If user has sufficient authority, auto-approve
  IF user_level >= required_level THEN
    RETURN NULL; -- No approval needed
  END IF;
  
  -- Find appropriate approver
  SELECT tm.id INTO approver_id
  FROM team_members tm
  WHERE tm.authority_level >= required_level
    AND tm.id != requested_by_val
  ORDER BY tm.authority_level ASC
  LIMIT 1;
  
  IF approver_id IS NULL THEN
    RAISE EXCEPTION 'No suitable approver found';
  END IF;
  
  -- Create approval request
  INSERT INTO workflow_approvals (
    workflow_type, entity_id, requested_by, approver_id, request_data
  ) VALUES (
    workflow_type_val, entity_id_val, requested_by_val, approver_id, request_data_val
  ) RETURNING id INTO approval_id;
  
  RETURN approval_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle task assignment delegation
CREATE OR REPLACE FUNCTION delegate_task_assignment(
  task_uuid UUID,
  from_user_uuid UUID,
  to_user_uuid UUID,
  delegated_by_uuid UUID,
  delegation_type_val delegation_type DEFAULT 'assignment',
  instructions_val TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  delegation_id UUID;
  can_delegate BOOLEAN;
BEGIN
  -- Check if delegation is allowed
  SELECT can_delegate_to_user(delegated_by_uuid, to_user_uuid, 1) INTO can_delegate;
  
  IF NOT can_delegate THEN
    RAISE EXCEPTION 'User does not have authority to delegate to target user';
  END IF;
  
  -- Create delegation request
  INSERT INTO delegation_requests (
    task_id, from_user_id, to_user_id, delegated_by, 
    delegation_type, instructions
  ) VALUES (
    task_uuid, from_user_uuid, to_user_uuid, delegated_by_uuid,
    delegation_type_val, instructions_val
  ) RETURNING id INTO delegation_id;
  
  -- Create notification
  PERFORM create_task_notification(
    task_uuid,
    to_user_uuid,
    'assignment',
    'Task Delegated to You',
    'A task has been delegated to you by ' || 
    (SELECT name FROM team_members WHERE id = delegated_by_uuid)
  );
  
  RETURN delegation_id;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for new tables
ALTER TABLE team_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Team hierarchy access
CREATE POLICY "Team hierarchy access" ON team_hierarchy
  FOR SELECT USING (
    user_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    EXISTS (SELECT 1 FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND user_role IN ('admin', 'wedding_planner'))
  );

-- Delegation requests access
CREATE POLICY "Delegation requests access" ON delegation_requests
  FOR SELECT USING (
    from_user_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    to_user_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    delegated_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Workflow approvals access
CREATE POLICY "Workflow approvals access" ON workflow_approvals
  FOR SELECT USING (
    requested_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    approver_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Role permissions (read-only for most users)
CREATE POLICY "Role permissions read" ON role_permissions
  FOR SELECT USING (true);

-- User permission overrides
CREATE POLICY "User permission overrides access" ON user_permission_overrides
  FOR SELECT USING (
    user_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    EXISTS (SELECT 1 FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND user_role IN ('admin', 'wedding_planner'))
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON delegation_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON workflow_approvals TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON user_permission_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE ON team_hierarchy TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000046_deadline_tracking_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =====================================================
-- WS-058: Task Delegation System - Deadline Tracking
-- Migration: 028_deadline_tracking_system.sql
-- =====================================================

-- Table for automated deadline alerts
CREATE TABLE deadline_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('reminder', 'warning', 'overdue', 'escalation')),
    alert_time TIMESTAMPTZ NOT NULL,
    triggered_at TIMESTAMPTZ NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for task notifications
CREATE TABLE task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'in_app', 'sms')),
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    sent_at TIMESTAMPTZ NULL,
    read_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_deadline_alerts_task_id ON deadline_alerts(task_id);
CREATE INDEX idx_deadline_alerts_alert_time ON deadline_alerts(alert_time) WHERE triggered_at IS NULL;
CREATE INDEX idx_deadline_alerts_triggered ON deadline_alerts(triggered_at);

CREATE INDEX idx_task_notifications_recipient ON task_notifications(recipient_id);
CREATE INDEX idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX idx_task_notifications_status ON task_notifications(status);
CREATE INDEX idx_task_notifications_urgency ON task_notifications(urgency);

-- Function to trigger deadline alerts automatically
CREATE OR REPLACE FUNCTION process_deadline_alerts()
RETURNS TABLE(
    alert_id UUID,
    task_title TEXT,
    assignee_name TEXT,
    alert_message TEXT,
    alert_priority TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Process pending alerts that are due
    RETURN QUERY
    WITH triggered_alerts AS (
        UPDATE deadline_alerts 
        SET triggered_at = NOW(),
            updated_at = NOW()
        WHERE triggered_at IS NULL 
        AND alert_time <= NOW()
        RETURNING id, task_id, message, priority
    )
    SELECT 
        ta.id,
        wt.title,
        tm.name,
        ta.message,
        ta.priority
    FROM triggered_alerts ta
    JOIN workflow_tasks wt ON ta.task_id = wt.id
    LEFT JOIN team_members tm ON wt.assigned_to = tm.id;
END;
$$;

-- Function to get deadline metrics for a wedding
CREATE OR REPLACE FUNCTION get_deadline_metrics(wedding_id_param UUID)
RETURNS TABLE(
    total_tasks INTEGER,
    upcoming_deadlines INTEGER,
    overdue_tasks INTEGER,
    completed_tasks INTEGER,
    critical_overdue INTEGER,
    average_completion_time INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH task_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE deadline > NOW() AND status != 'completed') as upcoming,
            COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed' AND priority = 'critical') as critical_overdue,
            AVG(CASE 
                WHEN status = 'completed' AND completed_at IS NOT NULL 
                THEN completed_at - created_at 
                ELSE NULL 
            END) as avg_completion
        FROM workflow_tasks 
        WHERE wedding_id = wedding_id_param
        AND deadline IS NOT NULL
    )
    SELECT 
        total::INTEGER,
        upcoming::INTEGER,
        overdue::INTEGER,
        completed::INTEGER,
        critical_overdue::INTEGER,
        avg_completion
    FROM task_stats;
END;
$$;

-- Function to calculate critical path for task dependencies
CREATE OR REPLACE FUNCTION calculate_critical_path(wedding_id_param UUID)
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    earliest_start TIMESTAMPTZ,
    latest_finish TIMESTAMPTZ,
    slack_time INTERVAL,
    is_critical BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Simplified critical path calculation
    -- In a real implementation, this would use proper CPM algorithms
    RETURN QUERY
    WITH RECURSIVE task_hierarchy AS (
        -- Base case: tasks with no dependencies
        SELECT 
            t.id,
            t.title,
            t.created_at as earliest_start,
            t.deadline as latest_finish,
            CASE 
                WHEN t.deadline IS NOT NULL 
                THEN t.deadline - t.created_at 
                ELSE INTERVAL '0'
            END as slack_time,
            0 as depth
        FROM workflow_tasks t
        WHERE t.wedding_id = wedding_id_param
        AND NOT EXISTS (
            SELECT 1 FROM task_dependencies td 
            WHERE td.dependent_task_id = t.id
        )
        
        UNION ALL
        
        -- Recursive case: tasks that depend on others
        SELECT 
            t.id,
            t.title,
            GREATEST(th.earliest_start + INTERVAL '1 day', t.created_at) as earliest_start,
            t.deadline as latest_finish,
            CASE 
                WHEN t.deadline IS NOT NULL 
                THEN t.deadline - GREATEST(th.earliest_start + INTERVAL '1 day', t.created_at)
                ELSE INTERVAL '0'
            END as slack_time,
            th.depth + 1
        FROM workflow_tasks t
        JOIN task_dependencies td ON t.id = td.dependent_task_id
        JOIN task_hierarchy th ON td.prerequisite_task_id = th.id
        WHERE t.wedding_id = wedding_id_param
        AND th.depth < 10 -- Prevent infinite recursion
    )
    SELECT 
        th.id,
        th.title,
        th.earliest_start,
        th.latest_finish,
        th.slack_time,
        (th.slack_time <= INTERVAL '0' OR th.slack_time <= INTERVAL '1 day') as is_critical
    FROM task_hierarchy th
    ORDER BY th.earliest_start, th.slack_time;
END;
$$;

-- Function to automatically escalate overdue critical tasks
CREATE OR REPLACE FUNCTION escalate_overdue_tasks()
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    assignee_name TEXT,
    days_overdue INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create escalation notifications for critical overdue tasks
    INSERT INTO task_notifications (
        recipient_id,
        task_id,
        message,
        type,
        urgency,
        status
    )
    SELECT 
        supervisor.user_id,
        wt.id,
        'ESCALATION: Critical task "' || wt.title || '" is ' || 
        EXTRACT(DAY FROM NOW() - wt.deadline)::INTEGER || ' days overdue',
        'email',
        'critical',
        'pending'
    FROM workflow_tasks wt
    JOIN team_members tm ON wt.assigned_to = tm.id
    JOIN team_members supervisor ON supervisor.wedding_id = tm.wedding_id
    WHERE wt.deadline < NOW() - INTERVAL '4 hours'
    AND wt.status != 'completed'
    AND wt.priority = 'critical'
    AND supervisor.role IN ('admin', 'manager', 'coordinator')
    AND NOT EXISTS (
        SELECT 1 FROM task_notifications tn 
        WHERE tn.task_id = wt.id 
        AND tn.urgency = 'critical'
        AND tn.created_at > NOW() - INTERVAL '24 hours'
    );

    -- Return escalated tasks
    RETURN QUERY
    SELECT 
        wt.id,
        wt.title,
        tm.name,
        EXTRACT(DAY FROM NOW() - wt.deadline)::INTEGER
    FROM workflow_tasks wt
    LEFT JOIN team_members tm ON wt.assigned_to = tm.id
    WHERE wt.deadline < NOW()
    AND wt.status != 'completed'
    AND wt.priority = 'critical'
    ORDER BY wt.deadline;
END;
$$;

-- Trigger to update deadline alerts when task deadline changes
CREATE OR REPLACE FUNCTION update_deadline_alerts_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If deadline changed, delete old alerts and create new ones
    IF OLD.deadline IS DISTINCT FROM NEW.deadline AND NEW.deadline IS NOT NULL THEN
        -- Delete pending alerts for this task
        DELETE FROM deadline_alerts 
        WHERE task_id = NEW.id 
        AND triggered_at IS NULL;
        
        -- The application layer will handle creating new alerts
        -- This prevents complex logic in the database trigger
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER deadline_change_trigger
    AFTER UPDATE OF deadline ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_deadline_alerts_trigger();

-- Trigger to automatically update task status based on dependencies
CREATE OR REPLACE FUNCTION check_dependency_completion_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When a task is completed, check if any dependent tasks can now start
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE workflow_tasks 
        SET status = 'in_progress',
            started_at = NOW(),
            updated_at = NOW()
        WHERE id IN (
            SELECT td.dependent_task_id
            FROM task_dependencies td
            WHERE td.prerequisite_task_id = NEW.id
            AND td.dependency_type = 'blocks'
        )
        AND status = 'pending'
        AND NOT EXISTS (
            -- Check that all other blocking dependencies are completed
            SELECT 1 FROM task_dependencies td2
            JOIN workflow_tasks wt2 ON td2.prerequisite_task_id = wt2.id
            WHERE td2.dependent_task_id = workflow_tasks.id
            AND td2.dependency_type = 'blocks'
            AND wt2.status != 'completed'
            AND wt2.id != NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER dependency_completion_trigger
    AFTER UPDATE OF status ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_dependency_completion_trigger();

-- Row Level Security (RLS) policies
ALTER TABLE deadline_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for deadline_alerts: Users can view alerts for tasks they have access to
CREATE POLICY deadline_alerts_access_policy ON deadline_alerts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.wedding_id = wt.wedding_id
            WHERE wt.id = deadline_alerts.task_id
            AND tm.user_id = ( SELECT auth.uid() )
        )
    );

-- Policy for task_notifications: Users can view their own notifications
CREATE POLICY task_notifications_recipient_policy ON task_notifications
    FOR ALL
    USING (recipient_id = ( SELECT auth.uid() ));

-- Policy for task_notifications: Task creators and assignees can view task notifications
CREATE POLICY task_notifications_task_access_policy ON task_notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.user_id = ( SELECT auth.uid() )
            WHERE wt.id = task_notifications.task_id
            AND (wt.assigned_to = tm.id OR wt.created_by = tm.id)
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON deadline_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create notification processing job (would be handled by background job in production)
COMMENT ON FUNCTION process_deadline_alerts() IS 'Function to be called by cron job every 15 minutes to process pending deadline alerts';
COMMENT ON FUNCTION escalate_overdue_tasks() IS 'Function to be called daily to escalate overdue critical tasks';

-- Insert initial test data for demonstration
INSERT INTO deadline_alerts (task_id, alert_type, alert_time, message, priority)
SELECT 
    id,
    'reminder',
    deadline - INTERVAL '2 days',
    'Task due in 2 days',
    CASE priority
        WHEN 'critical' THEN 'critical'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
    END
FROM workflow_tasks 
WHERE deadline > NOW() + INTERVAL '2 days'
ON CONFLICT DO NOTHING;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000047_task_status_history.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =====================================================
-- WS-058: Task Delegation System - Status Management
-- Migration: 029_task_status_history.sql
-- =====================================================

-- Table for tracking task status changes
CREATE TABLE task_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    updated_by UUID NOT NULL REFERENCES team_members(id),
    comment TEXT NULL,
    progress_percentage INTEGER NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX idx_task_status_history_created_at ON task_status_history(created_at);
CREATE INDEX idx_task_status_history_updated_by ON task_status_history(updated_by);

-- Function to update task status with history tracking
CREATE OR REPLACE FUNCTION update_task_status_with_history(
    task_id_param UUID,
    new_status_param TEXT,
    updated_by_param UUID,
    comment_param TEXT DEFAULT NULL,
    progress_param INTEGER DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    previous_status TEXT,
    new_status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    current_task_status TEXT;
    current_progress INTEGER;
BEGIN
    -- Get current task status
    SELECT status, progress_percentage 
    INTO current_task_status, current_progress
    FROM workflow_tasks 
    WHERE id = task_id_param;

    -- Check if task exists
    IF current_task_status IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Don't create history record if status hasn't changed
    IF current_task_status = new_status_param AND 
       (progress_param IS NULL OR current_progress = progress_param) THEN
        RETURN QUERY SELECT TRUE, current_task_status, new_status_param;
        RETURN;
    END IF;

    -- Insert status history record
    INSERT INTO task_status_history (
        task_id,
        previous_status,
        new_status,
        updated_by,
        comment,
        progress_percentage
    ) VALUES (
        task_id_param,
        current_task_status,
        new_status_param,
        updated_by_param,
        comment_param,
        progress_param
    );

    -- Update the task
    UPDATE workflow_tasks 
    SET 
        status = new_status_param,
        progress_percentage = COALESCE(progress_param, progress_percentage),
        updated_at = NOW(),
        started_at = CASE 
            WHEN new_status_param = 'in_progress' AND current_task_status != 'in_progress' 
            THEN NOW() 
            ELSE started_at 
        END,
        completed_at = CASE 
            WHEN new_status_param = 'completed' 
            THEN NOW() 
            ELSE NULL 
        END
    WHERE id = task_id_param;

    -- Return success
    RETURN QUERY SELECT TRUE, current_task_status, new_status_param;
END;
$$;

-- Function to get task completion statistics
CREATE OR REPLACE FUNCTION get_task_completion_stats(wedding_id_param UUID)
RETURNS TABLE(
    total_tasks INTEGER,
    pending_tasks INTEGER,
    in_progress_tasks INTEGER,
    on_hold_tasks INTEGER,
    completed_tasks INTEGER,
    cancelled_tasks INTEGER,
    completion_rate DECIMAL,
    average_completion_time INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH task_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            AVG(CASE 
                WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
                THEN completed_at - started_at 
                ELSE NULL 
            END) as avg_completion_time
        FROM workflow_tasks 
        WHERE wedding_id = wedding_id_param
    )
    SELECT 
        total::INTEGER,
        pending::INTEGER,
        in_progress::INTEGER,
        on_hold::INTEGER,
        completed::INTEGER,
        cancelled::INTEGER,
        CASE 
            WHEN total > 0 
            THEN ROUND((completed::DECIMAL / total::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL
        END as completion_rate,
        avg_completion_time
    FROM task_counts;
END;
$$;

-- Function to get status transition patterns
CREATE OR REPLACE FUNCTION get_status_transition_patterns(wedding_id_param UUID)
RETURNS TABLE(
    from_status TEXT,
    to_status TEXT,
    transition_count INTEGER,
    avg_time_in_status INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tsh.previous_status,
        tsh.new_status,
        COUNT(*)::INTEGER as transition_count,
        AVG(
            CASE 
                WHEN tsh.created_at IS NOT NULL AND prev_tsh.created_at IS NOT NULL
                THEN tsh.created_at - prev_tsh.created_at
                ELSE NULL
            END
        ) as avg_time_in_status
    FROM task_status_history tsh
    JOIN workflow_tasks wt ON tsh.task_id = wt.id
    LEFT JOIN task_status_history prev_tsh ON (
        prev_tsh.task_id = tsh.task_id AND 
        prev_tsh.created_at < tsh.created_at AND
        prev_tsh.new_status = tsh.previous_status
    )
    WHERE wt.wedding_id = wedding_id_param
    GROUP BY tsh.previous_status, tsh.new_status
    ORDER BY transition_count DESC;
END;
$$;

-- Function to identify bottleneck tasks
CREATE OR REPLACE FUNCTION identify_bottleneck_tasks(wedding_id_param UUID)
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    current_status TEXT,
    days_in_current_status INTEGER,
    blocking_tasks_count INTEGER,
    priority TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH current_status_duration AS (
        SELECT 
            wt.id,
            wt.title,
            wt.status,
            wt.priority,
            COALESCE(
                EXTRACT(DAY FROM NOW() - MAX(tsh.created_at)),
                EXTRACT(DAY FROM NOW() - wt.created_at)
            )::INTEGER as days_in_status
        FROM workflow_tasks wt
        LEFT JOIN task_status_history tsh ON wt.id = tsh.task_id
        WHERE wt.wedding_id = wedding_id_param
        AND wt.status IN ('in_progress', 'on_hold')
        GROUP BY wt.id, wt.title, wt.status, wt.priority, wt.created_at
    ),
    blocking_counts AS (
        SELECT 
            td.prerequisite_task_id as task_id,
            COUNT(td.dependent_task_id) as blocking_count
        FROM task_dependencies td
        JOIN workflow_tasks wt_prereq ON td.prerequisite_task_id = wt_prereq.id
        JOIN workflow_tasks wt_dep ON td.dependent_task_id = wt_dep.id
        WHERE wt_prereq.wedding_id = wedding_id_param
        AND wt_prereq.status != 'completed'
        AND wt_dep.status = 'pending'
        AND td.dependency_type = 'blocks'
        GROUP BY td.prerequisite_task_id
    )
    SELECT 
        csd.id,
        csd.title,
        csd.status,
        csd.days_in_status,
        COALESCE(bc.blocking_count, 0)::INTEGER,
        csd.priority
    FROM current_status_duration csd
    LEFT JOIN blocking_counts bc ON csd.id = bc.task_id
    WHERE csd.days_in_status > 3 OR bc.blocking_count > 0
    ORDER BY 
        bc.blocking_count DESC NULLS LAST,
        csd.days_in_status DESC,
        CASE csd.priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END;
END;
$$;

-- Trigger to automatically log status changes
CREATE OR REPLACE FUNCTION auto_log_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_status_history (
            task_id,
            previous_status,
            new_status,
            updated_by,
            comment,
            progress_percentage
        ) VALUES (
            NEW.id,
            COALESCE(OLD.status, 'pending'),
            NEW.status,
            -- Try to get the updating user from the session or use a system user
            COALESCE(
                (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND wedding_id = NEW.wedding_id LIMIT 1),
                NEW.created_by
            ),
            'Automatic status change',
            NEW.progress_percentage
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Only create trigger if not using the stored procedure
-- This provides a fallback for direct updates to the table
CREATE TRIGGER auto_status_history_trigger
    AFTER UPDATE OF status ON workflow_tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION auto_log_status_change_trigger();

-- Function to get team productivity metrics
CREATE OR REPLACE FUNCTION get_team_productivity_metrics(wedding_id_param UUID)
RETURNS TABLE(
    team_member_id UUID,
    team_member_name TEXT,
    total_assigned_tasks INTEGER,
    completed_tasks INTEGER,
    in_progress_tasks INTEGER,
    overdue_tasks INTEGER,
    completion_rate DECIMAL,
    avg_completion_time INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.name,
        COUNT(wt.id)::INTEGER as total_assigned,
        COUNT(*) FILTER (WHERE wt.status = 'completed')::INTEGER as completed,
        COUNT(*) FILTER (WHERE wt.status = 'in_progress')::INTEGER as in_progress,
        COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed')::INTEGER as overdue,
        CASE 
            WHEN COUNT(wt.id) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE wt.status = 'completed')::DECIMAL / COUNT(wt.id)::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL
        END as completion_rate,
        AVG(
            CASE 
                WHEN wt.status = 'completed' AND wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL
                THEN wt.completed_at - wt.started_at
                ELSE NULL
            END
        ) as avg_completion_time
    FROM team_members tm
    LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
    WHERE tm.wedding_id = wedding_id_param
    GROUP BY tm.id, tm.name
    ORDER BY completion_rate DESC, total_assigned DESC;
END;
$$;

-- Row Level Security policies
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view status history for tasks they have access to
CREATE POLICY task_status_history_access_policy ON task_status_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.wedding_id = wt.wedding_id
            WHERE wt.id = task_status_history.task_id
            AND tm.user_id = ( SELECT auth.uid() )
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON task_status_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert some sample status history for existing tasks
INSERT INTO task_status_history (task_id, previous_status, new_status, updated_by, comment)
SELECT 
    wt.id,
    'pending',
    wt.status,
    wt.created_by,
    'Initial status set during task creation'
FROM workflow_tasks wt
WHERE NOT EXISTS (
    SELECT 1 FROM task_status_history tsh 
    WHERE tsh.task_id = wt.id
)
ON CONFLICT DO NOTHING;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000048_workload_tracking_system.sql
-- ========================================

-- =====================================================
-- WS-058: Task Delegation System - Workload Tracking
-- Migration: 030_workload_tracking_system.sql
-- =====================================================

-- Function to calculate comprehensive workload metrics
CREATE OR REPLACE FUNCTION calculate_workload_metrics(wedding_id_param UUID)
RETURNS TABLE(
    team_member_id UUID,
    team_member_name TEXT,
    role TEXT,
    specialty TEXT,
    total_assigned_tasks INTEGER,
    active_tasks INTEGER,
    completed_tasks INTEGER,
    overdue_tasks INTEGER,
    estimated_hours_total DECIMAL,
    estimated_hours_remaining DECIMAL,
    capacity_utilization DECIMAL,
    workload_score DECIMAL,
    availability_status TEXT,
    avg_completion_time_days DECIMAL,
    task_completion_rate DECIMAL
) 
LANGUAGE plpgsql
AS $$
DECLARE
    standard_work_hours CONSTANT DECIMAL := 40.0; -- Hours per week
BEGIN
    RETURN QUERY
    WITH team_task_stats AS (
        SELECT 
            tm.id as member_id,
            tm.name as member_name,
            tm.role,
            tm.specialty,
            COUNT(wt.id) as total_tasks,
            COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_count,
            COUNT(*) FILTER (WHERE wt.status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_count,
            COALESCE(SUM(wt.estimated_hours), 0) as total_hours,
            COALESCE(SUM(CASE 
                WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                THEN wt.estimated_hours 
                ELSE 0 
            END), 0) as remaining_hours,
            AVG(CASE 
                WHEN wt.status = 'completed' AND wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL
                THEN EXTRACT(DAY FROM wt.completed_at - wt.started_at)
                ELSE NULL 
            END) as avg_completion_days
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
        GROUP BY tm.id, tm.name, tm.role, tm.specialty
    ),
    workload_calculations AS (
        SELECT 
            tts.*,
            -- Capacity utilization based on remaining hours vs standard work hours
            CASE 
                WHEN standard_work_hours > 0 
                THEN ROUND((tts.remaining_hours / standard_work_hours) * 100, 2)
                ELSE 0 
            END as utilization,
            -- Workload score considering task count, hours, priority, and deadlines
            ROUND(
                (tts.active_count * 2.0) + 
                (tts.remaining_hours * 0.5) + 
                (tts.overdue_count * 5.0) +
                -- Priority weight (estimated from task priorities)
                COALESCE((
                    SELECT SUM(CASE wt.priority 
                        WHEN 'critical' THEN 3.0
                        WHEN 'high' THEN 2.0 
                        WHEN 'medium' THEN 1.0
                        ELSE 0.5 
                    END)
                    FROM workflow_tasks wt 
                    WHERE wt.assigned_to = tts.member_id 
                    AND wt.status IN ('pending', 'in_progress', 'on_hold')
                ), 0),
                2
            ) as workload_score,
            -- Task completion rate
            CASE 
                WHEN tts.total_tasks > 0 
                THEN ROUND((tts.completed_count::DECIMAL / tts.total_tasks::DECIMAL) * 100, 2)
                ELSE 0 
            END as completion_rate
        FROM team_task_stats tts
    )
    SELECT 
        wc.member_id,
        wc.member_name,
        wc.role,
        wc.specialty,
        wc.total_tasks::INTEGER,
        wc.active_count::INTEGER,
        wc.completed_count::INTEGER,
        wc.overdue_count::INTEGER,
        wc.total_hours,
        wc.remaining_hours,
        wc.utilization,
        wc.workload_score,
        -- Availability status based on utilization and overdue tasks
        CASE 
            WHEN wc.overdue_count > 2 OR wc.utilization > 100 THEN 'overloaded'
            WHEN wc.utilization > 85 OR wc.overdue_count > 0 THEN 'busy'
            WHEN wc.utilization < 50 AND wc.active_count = 0 THEN 'available'
            WHEN wc.utilization <= 85 THEN 'available'
            ELSE 'unavailable'
        END as availability_status,
        COALESCE(wc.avg_completion_days, 3.0),
        wc.completion_rate
    FROM workload_calculations wc
    ORDER BY wc.workload_score DESC, wc.utilization DESC;
END;
$$;

-- Function to analyze overall team capacity
CREATE OR REPLACE FUNCTION analyze_team_capacity(wedding_id_param UUID)
RETURNS TABLE(
    total_team_size INTEGER,
    total_capacity_hours DECIMAL,
    allocated_hours DECIMAL,
    remaining_capacity DECIMAL,
    capacity_utilization DECIMAL
) 
LANGUAGE plpgsql
AS $$
DECLARE
    standard_hours_per_member CONSTANT DECIMAL := 40.0;
BEGIN
    RETURN QUERY
    WITH capacity_analysis AS (
        SELECT 
            COUNT(tm.id) as team_size,
            COUNT(tm.id) * standard_hours_per_member as total_capacity,
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as allocated
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
    )
    SELECT 
        ca.team_size::INTEGER,
        ca.total_capacity,
        ca.allocated,
        (ca.total_capacity - ca.allocated) as remaining,
        CASE 
            WHEN ca.total_capacity > 0 
            THEN ROUND((ca.allocated / ca.total_capacity) * 100, 2)
            ELSE 0 
        END as utilization
    FROM capacity_analysis ca;
END;
$$;

-- Function to identify capacity bottlenecks by specialty
CREATE OR REPLACE FUNCTION identify_capacity_bottlenecks(wedding_id_param UUID)
RETURNS TABLE(
    specialty TEXT,
    overallocation_percentage DECIMAL,
    affected_tasks INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    standard_hours_per_specialty CONSTANT DECIMAL := 40.0;
BEGIN
    RETURN QUERY
    WITH specialty_workload AS (
        SELECT 
            tm.specialty,
            COUNT(tm.id) as specialist_count,
            COUNT(tm.id) * standard_hours_per_specialty as specialty_capacity,
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as allocated_hours,
            COUNT(wt.id) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_task_count
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
        AND tm.specialty IS NOT NULL
        GROUP BY tm.specialty
        HAVING COUNT(tm.id) > 0
    )
    SELECT 
        sw.specialty,
        ROUND(
            CASE 
                WHEN sw.specialty_capacity > 0 
                THEN ((sw.allocated_hours - sw.specialty_capacity) / sw.specialty_capacity) * 100
                ELSE 0 
            END, 
            2
        ) as overallocation_pct,
        sw.active_task_count::INTEGER
    FROM specialty_workload sw
    WHERE sw.allocated_hours > sw.specialty_capacity
    ORDER BY overallocation_pct DESC;
END;
$$;

-- Function to get workload trends over time
CREATE OR REPLACE FUNCTION get_workload_trends(wedding_id_param UUID, days_param INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    total_active_tasks INTEGER,
    average_workload_score DECIMAL,
    team_utilization DECIMAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '1 day' * days_param,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE as trend_date
    ),
    daily_metrics AS (
        SELECT 
            ds.trend_date,
            COUNT(wt.id) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_tasks,
            COUNT(DISTINCT tm.id) as team_count,
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as daily_allocated_hours
        FROM date_series ds
        LEFT JOIN workflow_tasks wt ON DATE(wt.created_at) <= ds.trend_date
        LEFT JOIN team_members tm ON wt.assigned_to = tm.id
        WHERE tm.wedding_id = wedding_id_param OR tm.wedding_id IS NULL
        GROUP BY ds.trend_date
    )
    SELECT 
        dm.trend_date,
        dm.active_tasks::INTEGER,
        ROUND(
            CASE 
                WHEN dm.team_count > 0 
                THEN dm.daily_allocated_hours / dm.team_count 
                ELSE 0 
            END, 
            2
        ) as avg_workload,
        ROUND(
            CASE 
                WHEN dm.team_count > 0 
                THEN (dm.daily_allocated_hours / (dm.team_count * 40.0)) * 100
                ELSE 0 
            END, 
            2
        ) as utilization
    FROM daily_metrics dm
    ORDER BY dm.trend_date;
END;
$$;

-- Function to suggest optimal task assignments
CREATE OR REPLACE FUNCTION suggest_task_assignment(
    wedding_id_param UUID,
    task_category_param TEXT,
    priority_param TEXT,
    estimated_hours_param DECIMAL
)
RETURNS TABLE(
    team_member_id UUID,
    team_member_name TEXT,
    confidence_score DECIMAL,
    current_workload_score DECIMAL,
    specialty_match BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH member_suitability AS (
        SELECT 
            tm.id,
            tm.name,
            tm.role,
            tm.specialty,
            -- Calculate current workload
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as current_hours,
            COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_task_count,
            COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_count,
            -- Specialty match
            (tm.specialty = task_category_param OR tm.role IN ('admin', 'coordinator')) as specialty_match,
            -- Completion rate
            CASE 
                WHEN COUNT(wt.id) > 0 
                THEN (COUNT(*) FILTER (WHERE wt.status = 'completed')::DECIMAL / COUNT(wt.id)::DECIMAL) * 100
                ELSE 100 
            END as completion_rate
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
        GROUP BY tm.id, tm.name, tm.role, tm.specialty
    ),
    confidence_calculation AS (
        SELECT 
            ms.*,
            -- Base confidence calculation
            (
                50.0 + -- Base score
                CASE WHEN ms.specialty_match THEN 30.0 ELSE 0.0 END + -- Specialty bonus
                CASE WHEN ms.current_hours < 20 THEN 20.0 
                     WHEN ms.current_hours < 35 THEN 10.0 