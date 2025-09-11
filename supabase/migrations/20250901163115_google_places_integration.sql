-- Migration: Google Places Integration for Wedding Venues
-- Created: 2025-01-20
-- Description: Complete schema for Google Places API integration with wedding-specific requirements

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. GOOGLE PLACES API CONFIGURATION TABLE
-- Manages API keys, quotas, and organization-specific settings
CREATE TABLE google_places_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL, -- Encrypted Google Places API key
    daily_quota_limit INTEGER DEFAULT 1000,
    daily_quota_used INTEGER DEFAULT 0,
    quota_reset_date DATE DEFAULT CURRENT_DATE,
    autocomplete_enabled BOOLEAN DEFAULT true,
    details_enabled BOOLEAN DEFAULT true,
    photos_enabled BOOLEAN DEFAULT true,
    reviews_enabled BOOLEAN DEFAULT false, -- Premium feature
    search_radius_km INTEGER DEFAULT 50, -- Default search radius
    preferred_language VARCHAR(5) DEFAULT 'en',
    preferred_region VARCHAR(2), -- e.g., 'GB', 'US'
    rate_limit_per_minute INTEGER DEFAULT 100,
    last_api_call TIMESTAMP WITH TIME ZONE,
    api_status VARCHAR(20) DEFAULT 'active' CHECK (api_status IN ('active', 'suspended', 'quota_exceeded', 'error')),
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_org_places_config UNIQUE (organization_id),
    CONSTRAINT valid_quota CHECK (daily_quota_used <= daily_quota_limit),
    CONSTRAINT valid_radius CHECK (search_radius_km BETWEEN 1 AND 100)
);

-- 2. GOOGLE PLACES CACHE TABLE
-- Caches venue data to reduce API calls and improve performance
CREATE TABLE google_places_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id VARCHAR(255) NOT NULL UNIQUE, -- Google Place ID
    name TEXT NOT NULL,
    formatted_address TEXT NOT NULL,
    coordinates POINT NOT NULL, -- PostGIS point for spatial queries
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    
    -- Google Places data (JSONB for flexibility)
    place_data JSONB NOT NULL DEFAULT '{}',
    
    -- Extracted common fields for easy querying
    phone_number VARCHAR(50),
    website_url TEXT,
    rating DECIMAL(2,1),
    user_ratings_total INTEGER,
    price_level INTEGER CHECK (price_level BETWEEN 0 AND 4),
    
    -- Place types (wedding relevant)
    place_types TEXT[] DEFAULT '{}',
    business_status VARCHAR(20) DEFAULT 'OPERATIONAL',
    
    -- Venue capacity and amenities (extracted from reviews/details)
    estimated_capacity INTEGER,
    has_parking BOOLEAN,
    wheelchair_accessible BOOLEAN,
    outdoor_space BOOLEAN,
    allows_alcohol BOOLEAN,
    has_catering BOOLEAN,
    
    -- Photos and reviews cache
    photos_data JSONB DEFAULT '[]',
    reviews_data JSONB DEFAULT '[]',
    
    -- Cache management
    cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    api_calls_count INTEGER DEFAULT 1,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Wedding industry specific
    venue_category VARCHAR(50), -- ceremony, reception, accommodation, etc.
    wedding_suitability_score INTEGER CHECK (wedding_suitability_score BETWEEN 1 AND 10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. WEDDING PLACES TABLE
-- Links cached places to specific couples/weddings with roles and status
CREATE TABLE wedding_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    place_id VARCHAR(255) NOT NULL REFERENCES google_places_cache(place_id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Wedding venue role
    venue_role VARCHAR(30) NOT NULL CHECK (venue_role IN (
        'ceremony_venue',
        'reception_venue', 
        'cocktail_venue',
        'accommodation',
        'getting_ready_location',
        'photo_shoot_location',
        'rehearsal_dinner',
        'brunch_venue',
        'after_party',
        'vendor_meeting_location',
        'other'
    )),
    
    -- Booking status and timeline
    booking_status VARCHAR(20) DEFAULT 'considering' CHECK (booking_status IN (
        'considering',
        'shortlisted',
        'contacted',
        'site_visit_scheduled',
        'site_visit_completed',
        'quote_requested',
        'quote_received',
        'under_negotiation',
        'contract_sent',
        'deposit_paid',
        'booked',
        'confirmed',
        'rejected',
        'cancelled'
    )),
    
    -- Booking details
    booking_date DATE,
    event_start_time TIME,
    event_end_time TIME,
    guest_count INTEGER,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    deposit_paid_date DATE,
    
    -- Contact and booking information
    venue_contact_name VARCHAR(255),
    venue_contact_email VARCHAR(255),
    venue_contact_phone VARCHAR(50),
    booking_reference VARCHAR(100),
    
    -- Notes and preferences
    notes TEXT,
    client_rating INTEGER CHECK (client_rating BETWEEN 1 AND 5),
    client_feedback TEXT,
    photographer_notes TEXT, -- Special notes for photographer
    
    -- Logistics
    setup_time TIME,
    breakdown_time TIME,
    accessibility_requirements TEXT,
    special_requests TEXT,
    
    -- Timeline integration
    timeline_position INTEGER, -- Order in wedding day timeline
    travel_time_minutes INTEGER, -- From previous venue
    
    -- Metadata
    added_by_user_id UUID REFERENCES auth.users(id),
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    is_backup_option BOOLEAN DEFAULT false,
    is_confirmed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_couple_venue_role UNIQUE (couple_id, venue_role, is_backup_option) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT valid_event_times CHECK (event_end_time IS NULL OR event_end_time > event_start_time),
    CONSTRAINT valid_costs CHECK (actual_cost IS NULL OR estimated_cost IS NULL OR actual_cost >= 0),
    CONSTRAINT valid_deposit CHECK (deposit_amount IS NULL OR estimated_cost IS NULL OR deposit_amount <= estimated_cost)
);

-- 4. VENUE AVAILABILITY TABLE (Wedding Season Management)
CREATE TABLE venue_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id VARCHAR(255) NOT NULL REFERENCES google_places_cache(place_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Availability window
    available_date DATE NOT NULL,
    available_from TIME,
    available_until TIME,
    is_available BOOLEAN DEFAULT true,
    
    -- Pricing (wedding season surge pricing)
    base_price DECIMAL(10,2),
    weekend_surcharge DECIMAL(10,2),
    peak_season_surcharge DECIMAL(10,2),
    holiday_surcharge DECIMAL(10,2),
    
    -- Capacity and restrictions
    max_guests INTEGER,
    min_guests INTEGER,
    setup_hours_included INTEGER DEFAULT 2,
    breakdown_hours_included INTEGER DEFAULT 1,
    
    -- Booking window
    advance_booking_days_min INTEGER DEFAULT 30,
    advance_booking_days_max INTEGER DEFAULT 365,
    
    -- Source of availability data
    data_source VARCHAR(20) DEFAULT 'manual' CHECK (data_source IN ('manual', 'api', 'scrape', 'import')),
    last_verified TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_venue_date_availability UNIQUE (place_id, available_date),
    CONSTRAINT valid_availability_times CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from)
);

-- INDEXES FOR PERFORMANCE

-- Spatial indexes for location-based queries
CREATE INDEX idx_places_cache_coordinates ON google_places_cache USING GIST (coordinates);
CREATE INDEX idx_places_cache_location ON google_places_cache (latitude, longitude);

-- Wedding planning queries
CREATE INDEX idx_wedding_places_couple_id ON wedding_places (couple_id);
CREATE INDEX idx_wedding_places_role_status ON wedding_places (venue_role, booking_status);
CREATE INDEX idx_wedding_places_org_id ON wedding_places (organization_id);
CREATE INDEX idx_wedding_places_booking_date ON wedding_places (booking_date) WHERE booking_date IS NOT NULL;

-- Cache performance
CREATE INDEX idx_places_cache_expiry ON google_places_cache (cache_expires_at);
CREATE INDEX idx_places_cache_name_search ON google_places_cache USING GIN (to_tsvector('english', name));
CREATE INDEX idx_places_cache_address_search ON google_places_cache USING GIN (to_tsvector('english', formatted_address));
CREATE INDEX idx_places_cache_types ON google_places_cache USING GIN (place_types);

-- API management
CREATE INDEX idx_places_config_org ON google_places_config (organization_id);
CREATE INDEX idx_places_config_quota_reset ON google_places_config (quota_reset_date) WHERE api_status = 'active';

-- Availability queries
CREATE INDEX idx_venue_availability_date ON venue_availability (available_date);
CREATE INDEX idx_venue_availability_place_date ON venue_availability (place_id, available_date);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE google_places_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;

-- Google Places Config Policies
CREATE POLICY "Users can view their organization's places config" ON google_places_config
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage places config" ON google_places_config
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Google Places Cache Policies
CREATE POLICY "Users can view cached places data" ON google_places_cache
    FOR SELECT USING (
        organization_id IS NULL OR -- Public cache data
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert cached places data" ON google_places_cache
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their cached places data" ON google_places_cache
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Wedding Places Policies
CREATE POLICY "Users can view their organization's wedding places" ON wedding_places
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's wedding places" ON wedding_places
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    ) WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Venue Availability Policies
CREATE POLICY "Users can view venue availability" ON venue_availability
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage venue availability" ON venue_availability
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- FUNCTIONS FOR BUSINESS LOGIC

-- Function to check and update API quota
CREATE OR REPLACE FUNCTION check_and_update_api_quota(
    org_id UUID,
    calls_needed INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    config_record google_places_config%ROWTYPE;
    quota_available INTEGER;
BEGIN
    -- Get current config
    SELECT * INTO config_record 
    FROM google_places_config 
    WHERE organization_id = org_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Reset quota if new day
    IF config_record.quota_reset_date < CURRENT_DATE THEN
        UPDATE google_places_config 
        SET daily_quota_used = 0,
            quota_reset_date = CURRENT_DATE
        WHERE organization_id = org_id;
        
        config_record.daily_quota_used = 0;
    END IF;
    
    -- Check if quota available
    quota_available = config_record.daily_quota_limit - config_record.daily_quota_used;
    
    IF quota_available >= calls_needed THEN
        -- Update quota usage
        UPDATE google_places_config 
        SET daily_quota_used = daily_quota_used + calls_needed,
            last_api_call = NOW()
        WHERE organization_id = org_id;
        
        RETURN TRUE;
    ELSE
        -- Mark as quota exceeded
        UPDATE google_places_config 
        SET api_status = 'quota_exceeded'
        WHERE organization_id = org_id;
        
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_places_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM google_places_cache 
    WHERE cache_expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate venue distance from wedding location
CREATE OR REPLACE FUNCTION calculate_venue_distance(
    wedding_lat DECIMAL,
    wedding_lng DECIMAL,
    venue_place_id VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
    venue_point POINT;
    distance_km DECIMAL;
BEGIN
    SELECT coordinates INTO venue_point 
    FROM google_places_cache 
    WHERE place_id = venue_place_id;
    
    IF venue_point IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate distance using PostGIS
    SELECT ST_Distance(
        ST_Transform(ST_SetSRID(ST_MakePoint(wedding_lng, wedding_lat), 4326), 3857),
        ST_Transform(ST_SetSRID(venue_point, 4326), 3857)
    ) / 1000 INTO distance_km;
    
    RETURN distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get venue availability for date range
CREATE OR REPLACE FUNCTION get_venue_availability(
    venue_place_id VARCHAR,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE(
    available_date DATE,
    is_available BOOLEAN,
    base_price DECIMAL,
    total_price DECIMAL,
    max_guests INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        va.available_date,
        va.is_available,
        va.base_price,
        COALESCE(va.base_price, 0) + 
        CASE 
            WHEN EXTRACT(DOW FROM va.available_date) IN (0, 6) THEN COALESCE(va.weekend_surcharge, 0)
            ELSE 0
        END +
        COALESCE(va.peak_season_surcharge, 0) +
        COALESCE(va.holiday_surcharge, 0) as total_price,
        va.max_guests
    FROM venue_availability va
    WHERE va.place_id = venue_place_id
      AND va.available_date BETWEEN start_date AND end_date
    ORDER BY va.available_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGERS FOR AUTOMATION

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_google_places_config_updated_at 
    BEFORE UPDATE ON google_places_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_places_cache_updated_at 
    BEFORE UPDATE ON google_places_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_places_updated_at 
    BEFORE UPDATE ON wedding_places 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_availability_updated_at 
    BEFORE UPDATE ON venue_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging for important changes
CREATE OR REPLACE FUNCTION log_wedding_venue_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.booking_status != NEW.booking_status THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            user_id,
            organization_id
        ) VALUES (
            'wedding_places',
            NEW.id,
            'status_change',
            json_build_object('booking_status', OLD.booking_status),
            json_build_object('booking_status', NEW.booking_status),
            auth.uid(),
            NEW.organization_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_wedding_places_changes 
    AFTER UPDATE ON wedding_places 
    FOR EACH ROW EXECUTE FUNCTION log_wedding_venue_changes();

-- VIEWS FOR COMMON QUERIES

-- Wedding venue summary view
CREATE OR REPLACE VIEW wedding_venues_summary AS
SELECT 
    wp.couple_id,
    wp.venue_role,
    wp.booking_status,
    gpc.name as venue_name,
    gpc.formatted_address,
    gpc.phone_number,
    gpc.website_url,
    gpc.rating,
    wp.booking_date,
    wp.estimated_cost,
    wp.guest_count,
    wp.notes,
    wp.organization_id
FROM wedding_places wp
JOIN google_places_cache gpc ON wp.place_id = gpc.place_id
WHERE wp.is_backup_option = false
ORDER BY wp.timeline_position NULLS LAST;

-- Available venues view (for search)
CREATE OR REPLACE VIEW available_venues AS
SELECT DISTINCT
    gpc.place_id,
    gpc.name,
    gpc.formatted_address,
    gpc.latitude,
    gpc.longitude,
    gpc.rating,
    gpc.user_ratings_total,
    gpc.price_level,
    gpc.place_types,
    gpc.wedding_suitability_score,
    gpc.estimated_capacity,
    gpc.has_parking,
    gpc.wheelchair_accessible,
    gpc.outdoor_space,
    va.base_price,
    va.max_guests
FROM google_places_cache gpc
LEFT JOIN venue_availability va ON gpc.place_id = va.place_id
WHERE gpc.cache_expires_at > NOW()
  AND gpc.business_status = 'OPERATIONAL'
  AND (va.is_available IS NULL OR va.is_available = true);

-- INITIAL DATA AND SETUP

-- Insert default place types relevant to weddings
CREATE TABLE wedding_venue_categories (
    category VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    google_place_types TEXT[] NOT NULL,
    typical_capacity_min INTEGER,
    typical_capacity_max INTEGER,
    avg_cost_per_person DECIMAL(8,2),
    description TEXT
);

INSERT INTO wedding_venue_categories VALUES
('ceremony_venue', 'Ceremony Venues', '{"church","hindu_temple","mosque","synagogue","place_of_worship","wedding_venue","park"}', 50, 300, 25.00, 'Traditional ceremony locations including religious venues and outdoor spaces'),
('reception_venue', 'Reception Venues', '{"banquet_hall","restaurant","hotel","wedding_venue","event_venue"}', 50, 500, 75.00, 'Reception and dining venues for wedding celebrations'),
('accommodation', 'Guest Accommodation', '{"lodging","hotel","bed_and_breakfast","guest_house"}', 10, 200, 120.00, 'Hotels and accommodation for wedding guests'),
('photo_location', 'Photo Locations', '{"park","garden","beach","landmark","scenic_spot"}', 2, 50, 0.00, 'Beautiful locations for wedding photography'),
('vendor_space', 'Vendor Spaces', '{"beauty_salon","spa","florist","bakery"}', 2, 20, 0.00, 'Locations for wedding preparation and vendor services');

-- Add helpful comments
COMMENT ON TABLE google_places_config IS 'Stores Google Places API configuration and quota management per organization';
COMMENT ON TABLE google_places_cache IS 'Caches Google Places venue data to reduce API calls and improve performance';
COMMENT ON TABLE wedding_places IS 'Links venues to specific weddings with booking status and wedding-day logistics';
COMMENT ON TABLE venue_availability IS 'Tracks venue availability and pricing for wedding season management';

COMMENT ON COLUMN google_places_cache.wedding_suitability_score IS 'AI-calculated score (1-10) based on reviews, amenities, and wedding-specific factors';
COMMENT ON COLUMN wedding_places.timeline_position IS 'Order of venue in wedding day timeline (1=first, 2=second, etc.)';
COMMENT ON COLUMN wedding_places.travel_time_minutes IS 'Estimated travel time from previous venue in timeline';
COMMENT ON COLUMN venue_availability.peak_season_surcharge IS 'Additional cost during wedding season (May-October)';