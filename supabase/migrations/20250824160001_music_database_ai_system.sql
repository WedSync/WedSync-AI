-- =====================================================
-- MUSIC DATABASE AI SYSTEM MIGRATION
-- =====================================================
-- Feature ID: WS-128
-- Description: AI-powered music recommendation and database system
-- Created: 2025-08-24
-- Dependencies: Base schema, clients, suppliers
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE music_genre AS ENUM (
  'classical', 'jazz', 'rock', 'pop', 'country', 'r_and_b', 'soul', 'funk',
  'reggae', 'folk', 'blues', 'electronic', 'hip_hop', 'acoustic', 'world',
  'latin', 'gospel', 'indie', 'alternative', 'romantic', 'instrumental'
);

CREATE TYPE music_mood AS ENUM (
  'romantic', 'upbeat', 'peaceful', 'energetic', 'emotional', 'celebratory',
  'intimate', 'fun', 'elegant', 'nostalgic', 'modern', 'traditional',
  'spiritual', 'dramatic'
);

CREATE TYPE wedding_appropriateness AS ENUM (
  'perfect', 'good', 'acceptable', 'questionable', 'inappropriate'
);

CREATE TYPE licensing_status AS ENUM (
  'public_domain', 'licensed', 'needs_license', 'restricted', 'unknown'
);

CREATE TYPE music_provider AS ENUM (
  'spotify', 'apple_music', 'youtube_music', 'internal'
);

CREATE TYPE playlist_type AS ENUM (
  'ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments',
  'background', 'master', 'dj_set'
);

CREATE TYPE wedding_phase AS ENUM (
  'pre_ceremony', 'ceremony', 'post_ceremony', 'cocktails', 'dinner', 'dancing', 'late_night'
);

CREATE TYPE energy_progression AS ENUM (
  'gradual_buildup', 'steady_high', 'peaks_and_valleys', 'mellow_romantic', 'custom'
);

CREATE TYPE age_group AS ENUM (
  'gen_z', 'millennials', 'gen_x', 'boomers'
);

CREATE TYPE recommendation_type AS ENUM (
  'new_playlist', 'enhance_playlist', 'replace_track', 'event_music', 'guest_request_match'
);

-- =====================================================
-- CORE MUSIC TABLES
-- =====================================================

CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Track Information
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_seconds INTEGER NOT NULL,
  
  -- Genre & Classification
  primary_genre music_genre NOT NULL,
  secondary_genres music_genre[],
  subgenres TEXT[],
  
  -- Mood & Energy Analysis
  mood music_mood NOT NULL,
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 10),
  tempo_bpm INTEGER,
  danceability DECIMAL(3,2) CHECK (danceability >= 0 AND danceability <= 1),
  valence DECIMAL(3,2) CHECK (valence >= 0 AND valence <= 1),
  
  -- Wedding Context
  wedding_appropriateness wedding_appropriateness NOT NULL DEFAULT 'good',
  ceremony_suitable BOOLEAN DEFAULT false,
  reception_suitable BOOLEAN DEFAULT false,
  cocktail_suitable BOOLEAN DEFAULT false,
  dinner_suitable BOOLEAN DEFAULT false,
  
  -- Cultural & Religious
  cultural_tags TEXT[],
  religious_appropriateness JSONB, -- Array of {religion, appropriateness, notes}
  language TEXT DEFAULT 'en',
  explicit_content BOOLEAN DEFAULT false,
  
  -- External IDs
  spotify_id TEXT,
  apple_music_id TEXT,
  youtube_id TEXT,
  
  -- Licensing
  licensing_status licensing_status NOT NULL DEFAULT 'unknown',
  licensing_cost DECIMAL(10,2),
  licensing_provider TEXT,
  copyright_info TEXT,
  
  -- Usage Statistics
  popularity_score INTEGER DEFAULT 0 CHECK (popularity_score >= 0 AND popularity_score <= 100),
  wedding_usage_count INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  
  -- AI Analysis
  ai_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_external_spotify UNIQUE (spotify_id) WHERE spotify_id IS NOT NULL,
  CONSTRAINT unique_external_apple UNIQUE (apple_music_id) WHERE apple_music_id IS NOT NULL
);

CREATE TABLE music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Playlist Information
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  
  -- Type & Context
  playlist_type playlist_type NOT NULL,
  wedding_phase wedding_phase[],
  target_duration_minutes INTEGER,
  
  -- AI Configuration
  auto_generate BOOLEAN DEFAULT false,
  generation_criteria JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'customized', 'approved', 'active')),
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  
  -- Statistics
  total_tracks INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  
  -- Collaboration
  shared_with UUID[],
  vendor_access BOOLEAN DEFAULT false,
  guest_requests_enabled BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES music_playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  
  -- Ordering
  order_index INTEGER NOT NULL,
  
  -- Timing
  start_time_seconds INTEGER,
  fade_in_seconds INTEGER DEFAULT 0,
  fade_out_seconds INTEGER DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'queued', 'played', 'skipped', 'removed')),
  
  -- AI Suggestions
  ai_suggested BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  suggestion_reason TEXT,
  
  -- User Customization
  user_added BOOLEAN DEFAULT false,
  user_notes TEXT,
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES user_profiles(id),
  played_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(playlist_id, order_index),
  UNIQUE(playlist_id, track_id)
);

CREATE TABLE guest_music_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES music_playlists(id) ON DELETE CASCADE,
  
  -- Guest Information
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  
  -- Request Details
  track_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  special_message TEXT,
  dedication TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'added')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET
);

-- =====================================================
-- AI RECOMMENDATION TABLES
-- =====================================================

CREATE TABLE user_music_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Explicit Preferences
  favorite_genres music_genre[],
  disliked_genres music_genre[],
  favorite_artists TEXT[],
  banned_artists TEXT[],
  
  -- Mood Preferences by Wedding Phase
  preferred_moods JSONB NOT NULL DEFAULT '{}',
  
  -- Cultural & Religious
  cultural_requirements TEXT[],
  religious_restrictions TEXT[],
  language_preferences TEXT[],
  
  -- Energy & Style
  energy_progression energy_progression DEFAULT 'gradual_buildup',
  vocal_preference TEXT CHECK (vocal_preference IN ('instrumental', 'vocal', 'mixed', 'no_preference')),
  explicit_content_allowed BOOLEAN DEFAULT false,
  
  -- Age Demographics
  guest_age_groups age_group[],
  cater_to_older_guests BOOLEAN DEFAULT false,
  
  -- Special Songs
  first_dance_song TEXT,
  father_daughter_song TEXT,
  mother_son_song TEXT,
  entrance_song TEXT,
  exit_song TEXT,
  
  -- AI Learning Data
  listening_history JSONB DEFAULT '[]',
  feedback_history JSONB DEFAULT '[]',
  
  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  learning_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (learning_confidence >= 0 AND learning_confidence <= 1),
  
  -- Constraints
  UNIQUE(user_id, client_id)
);

CREATE TABLE music_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Recommendation Context
  recommendation_type recommendation_type NOT NULL,
  target_playlist_id UUID REFERENCES music_playlists(id),
  target_timeline_event_id UUID, -- FK to timeline_events when implemented
  
  -- AI Analysis
  recommended_tracks JSONB NOT NULL DEFAULT '[]',
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT NOT NULL,
  
  -- User Preferences Used
  preference_snapshot JSONB NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'viewed', 'applied', 'rejected')),
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  feedback_notes TEXT,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  algorithm_version TEXT NOT NULL DEFAULT '1.0'
);

-- =====================================================
-- INTEGRATION TABLES
-- =====================================================

CREATE TABLE external_music_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Service Details
  provider music_provider NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Permissions
  scopes TEXT[],
  can_play_music BOOLEAN DEFAULT false,
  can_create_playlists BOOLEAN DEFAULT false,
  can_read_library BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  error_message TEXT,
  
  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, provider)
);

CREATE TABLE dj_vendor_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Connection Details
  access_level TEXT NOT NULL DEFAULT 'view_only' CHECK (access_level IN ('view_only', 'suggest', 'full_control')),
  can_modify_playlists BOOLEAN DEFAULT false,
  can_see_requests BOOLEAN DEFAULT false,
  
  -- Equipment & Setup
  equipment_info JSONB,
  
  -- Synchronization
  sync_enabled BOOLEAN DEFAULT false,
  auto_sync_playlists BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'disconnected')),
  
  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(supplier_id, client_id)
);

-- =====================================================
-- TIMELINE INTEGRATION TABLES
-- =====================================================

CREATE TABLE music_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_event_id UUID NOT NULL, -- FK to timeline_events (will be added when timeline system is complete)
  playlist_id UUID REFERENCES music_playlists(id),
  
  -- Music Details
  music_type TEXT NOT NULL CHECK (music_type IN ('playlist', 'specific_track', 'live_music', 'silence')),
  volume_level INTEGER DEFAULT 75 CHECK (volume_level >= 0 AND volume_level <= 100),
  
  -- Transitions
  fade_in_seconds INTEGER DEFAULT 0,
  fade_out_seconds INTEGER DEFAULT 0,
  crossfade_next BOOLEAN DEFAULT false,
  
  -- Special Instructions
  start_on_cue BOOLEAN DEFAULT false,
  loop_until_event_end BOOLEAN DEFAULT false,
  special_instructions TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'queued', 'playing', 'completed')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS TABLES
-- =====================================================

CREATE TABLE music_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES music_playlists(id) ON DELETE CASCADE,
  
  -- Usage Metrics
  total_plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  skip_rate DECIMAL(3,2) DEFAULT 0,
  
  -- Track Performance
  most_played_tracks JSONB DEFAULT '[]',
  most_skipped_tracks JSONB DEFAULT '[]',
  
  -- Timing Analysis
  peak_listening_hours INTEGER[],
  wedding_phase_engagement JSONB DEFAULT '{}',
  
  -- Feedback
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  guest_request_fulfillment_rate DECIMAL(3,2) DEFAULT 0,
  
  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(playlist_id, period_start, period_end)
);

CREATE TABLE music_recommendation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  algorithm_version TEXT NOT NULL DEFAULT '1.0',
  
  -- Performance
  avg_confidence_score DECIMAL(3,2) NOT NULL,
  acceptance_rate DECIMAL(3,2) NOT NULL,
  user_satisfaction_score DECIMAL(3,2) NOT NULL,
  
  -- Learning
  total_interactions INTEGER NOT NULL DEFAULT 0,
  preference_learning_accuracy DECIMAL(3,2) NOT NULL,
  
  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, algorithm_version, period_start, period_end)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Music Tracks Indexes
CREATE INDEX idx_music_tracks_organization ON music_tracks(organization_id);
CREATE INDEX idx_music_tracks_genre ON music_tracks(primary_genre);
CREATE INDEX idx_music_tracks_mood ON music_tracks(mood);
CREATE INDEX idx_music_tracks_energy ON music_tracks(energy_level);
CREATE INDEX idx_music_tracks_wedding_phases ON music_tracks(ceremony_suitable, reception_suitable, cocktail_suitable, dinner_suitable);
CREATE INDEX idx_music_tracks_popularity ON music_tracks(popularity_score DESC);
CREATE INDEX idx_music_tracks_duration ON music_tracks(duration_seconds);
CREATE INDEX idx_music_tracks_explicit ON music_tracks(explicit_content);
CREATE INDEX idx_music_tracks_spotify ON music_tracks(spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX idx_music_tracks_search ON music_tracks USING gin(to_tsvector('english', title || ' ' || artist));

-- Music Playlists Indexes
CREATE INDEX idx_music_playlists_organization ON music_playlists(organization_id);
CREATE INDEX idx_music_playlists_client ON music_playlists(client_id);
CREATE INDEX idx_music_playlists_type ON music_playlists(playlist_type);
CREATE INDEX idx_music_playlists_status ON music_playlists(status);
CREATE INDEX idx_music_playlists_created ON music_playlists(created_at DESC);

-- Playlist Tracks Indexes
CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track ON playlist_tracks(track_id);
CREATE INDEX idx_playlist_tracks_order ON playlist_tracks(playlist_id, order_index);
CREATE INDEX idx_playlist_tracks_ai_suggested ON playlist_tracks(ai_suggested, confidence_score DESC);

-- Guest Requests Indexes
CREATE INDEX idx_guest_requests_playlist ON guest_music_requests(playlist_id);
CREATE INDEX idx_guest_requests_status ON guest_music_requests(status);
CREATE INDEX idx_guest_requests_requested_at ON guest_music_requests(requested_at DESC);

-- User Preferences Indexes
CREATE INDEX idx_music_preferences_user ON user_music_preferences(user_id);
CREATE INDEX idx_music_preferences_client ON user_music_preferences(client_id);
CREATE INDEX idx_music_preferences_updated ON user_music_preferences(last_updated_at DESC);

-- Recommendations Indexes
CREATE INDEX idx_music_recommendations_client ON music_recommendations(client_id);
CREATE INDEX idx_music_recommendations_type ON music_recommendations(recommendation_type);
CREATE INDEX idx_music_recommendations_status ON music_recommendations(status);
CREATE INDEX idx_music_recommendations_generated ON music_recommendations(generated_at DESC);
CREATE INDEX idx_music_recommendations_expires ON music_recommendations(expires_at);

-- External Services Indexes
CREATE INDEX idx_external_music_user ON external_music_services(user_id);
CREATE INDEX idx_external_music_provider ON external_music_services(provider);
CREATE INDEX idx_external_music_active ON external_music_services(is_active, last_sync_at);

-- DJ Connections Indexes
CREATE INDEX idx_dj_connections_supplier ON dj_vendor_connections(supplier_id);
CREATE INDEX idx_dj_connections_client ON dj_vendor_connections(client_id);
CREATE INDEX idx_dj_connections_status ON dj_vendor_connections(status);

-- Analytics Indexes
CREATE INDEX idx_music_analytics_playlist ON music_analytics(playlist_id);
CREATE INDEX idx_music_analytics_period ON music_analytics(period_start, period_end);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_music_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_music_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_music_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_vendor_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_recommendation_metrics ENABLE ROW LEVEL SECURITY;

-- Music Tracks Policies
CREATE POLICY "Users can view music tracks in their organization" ON music_tracks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage music tracks" ON music_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = music_tracks.organization_id 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Music Playlists Policies
CREATE POLICY "Users can view playlists in their organization" ON music_playlists
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own playlists" ON music_playlists
  FOR ALL USING (
    created_by = auth.uid() OR 
    auth.uid() = ANY(shared_with) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = music_playlists.organization_id 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Playlist Tracks Policies
CREATE POLICY "Users can view playlist tracks if they can view the playlist" ON playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM music_playlists 
      WHERE id = playlist_tracks.playlist_id 
      AND (
        created_by = auth.uid() OR 
        auth.uid() = ANY(shared_with) OR
        organization_id IN (
          SELECT organization_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage playlist tracks if they can edit the playlist" ON playlist_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM music_playlists 
      WHERE id = playlist_tracks.playlist_id 
      AND (
        created_by = auth.uid() OR 
        auth.uid() = ANY(shared_with) OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_id = auth.uid() 
          AND organization_id = music_playlists.organization_id 
          AND role IN ('OWNER', 'ADMIN')
        )
      )
    )
  );

-- Guest Music Requests Policies (Public for guests)
CREATE POLICY "Anyone can submit guest music requests" ON guest_music_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view guest requests for their playlists" ON guest_music_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM music_playlists 
      WHERE id = guest_music_requests.playlist_id 
      AND (
        created_by = auth.uid() OR 
        auth.uid() = ANY(shared_with) OR
        organization_id IN (
          SELECT organization_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage guest requests for their playlists" ON guest_music_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM music_playlists 
      WHERE id = guest_music_requests.playlist_id 
      AND (
        created_by = auth.uid() OR 
        organization_id IN (
          SELECT organization_id FROM user_profiles 
          WHERE user_id = auth.uid() 
          AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
      )
    )
  );

-- User Music Preferences Policies
CREATE POLICY "Users can manage their own music preferences" ON user_music_preferences
  FOR ALL USING (user_id = auth.uid());

-- Music Recommendations Policies
CREATE POLICY "Users can view recommendations for their clients" ON music_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = music_recommendations.client_id 
      AND organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- External Music Services Policies
CREATE POLICY "Users can manage their own external music services" ON external_music_services
  FOR ALL USING (user_id = auth.uid());

-- DJ Vendor Connections Policies
CREATE POLICY "Vendors and clients can view their connections" ON dj_vendor_connections
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    ) OR
    client_id IN (
      SELECT id FROM clients 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Music Timeline Events Policies
CREATE POLICY "Users can view music timeline events for their timelines" ON music_timeline_events
  FOR SELECT USING (true); -- Will be restricted by timeline_events RLS when integrated

-- Analytics Policies (Admin/Owner only)
CREATE POLICY "Admins can view music analytics" ON music_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Admins can view recommendation metrics" ON music_recommendation_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- FUNCTIONS FOR MUSIC OPERATIONS
-- =====================================================

-- Function to update playlist statistics
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE music_playlists SET
    total_tracks = (
      SELECT COUNT(*) FROM playlist_tracks 
      WHERE playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id)
      AND status = 'active'
    ),
    total_duration_seconds = (
      SELECT COALESCE(SUM(mt.duration_seconds), 0)
      FROM playlist_tracks pt
      JOIN music_tracks mt ON pt.track_id = mt.id
      WHERE pt.playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id)
      AND pt.status = 'active'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.playlist_id, OLD.playlist_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update playlist stats when tracks change
CREATE TRIGGER update_playlist_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION update_playlist_stats();

-- Function to clean expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM music_recommendations 
  WHERE expires_at < NOW() 
  AND status = 'generated';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate music recommendation score
CREATE OR REPLACE FUNCTION calculate_music_score(
  track_genres music_genre[],
  track_mood music_mood,
  track_energy INTEGER,
  user_preferences JSONB
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  score DECIMAL(3,2) := 0.0;
  genre_match BOOLEAN := false;
  i music_genre;
BEGIN
  -- Genre matching (40% weight)
  FOREACH i IN ARRAY track_genres LOOP
    IF i = ANY((user_preferences->>'favorite_genres')::music_genre[]) THEN
      score := score + 0.4;
      genre_match := true;
      EXIT;
    END IF;
  END LOOP;
  
  -- Mood matching (30% weight)
  IF track_mood = ANY((user_preferences->>'preferred_moods')::music_mood[]) THEN
    score := score + 0.3;
  END IF;
  
  -- Energy level matching (20% weight)
  IF track_energy BETWEEN 
    COALESCE((user_preferences->>'min_energy')::INTEGER, 1) AND 
    COALESCE((user_preferences->>'max_energy')::INTEGER, 10) THEN
    score := score + 0.2;
  END IF;
  
  -- Popularity bonus (10% weight)
  score := score + 0.1;
  
  RETURN LEAST(score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for playlist with track details
CREATE VIEW playlist_details AS
SELECT 
  p.*,
  json_agg(
    json_build_object(
      'id', pt.id,
      'order_index', pt.order_index,
      'track', json_build_object(
        'id', mt.id,
        'title', mt.title,
        'artist', mt.artist,
        'duration_seconds', mt.duration_seconds,
        'mood', mt.mood,
        'energy_level', mt.energy_level
      ),
      'ai_suggested', pt.ai_suggested,
      'confidence_score', pt.confidence_score
    ) ORDER BY pt.order_index
  ) FILTER (WHERE pt.id IS NOT NULL) AS tracks
FROM music_playlists p
LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id AND pt.status = 'active'
LEFT JOIN music_tracks mt ON pt.track_id = mt.id
GROUP BY p.id;

-- View for track usage statistics
CREATE VIEW track_usage_stats AS
SELECT 
  mt.*,
  COALESCE(pt_stats.playlist_count, 0) AS playlist_count,
  COALESCE(pt_stats.total_plays, 0) AS estimated_plays
FROM music_tracks mt
LEFT JOIN (
  SELECT 
    track_id,
    COUNT(DISTINCT playlist_id) AS playlist_count,
    SUM(COALESCE((SELECT play_count FROM music_playlists WHERE id = playlist_id), 0)) AS total_plays
  FROM playlist_tracks 
  WHERE status = 'active'
  GROUP BY track_id
) pt_stats ON mt.id = pt_stats.track_id;

-- =====================================================
-- SAMPLE DATA INSERT
-- =====================================================

-- Insert some sample wedding-appropriate music tracks
INSERT INTO music_tracks (
  organization_id, title, artist, duration_seconds, primary_genre, mood, 
  energy_level, wedding_appropriateness, ceremony_suitable, reception_suitable, 
  cocktail_suitable, dinner_suitable, popularity_score, ai_analysis
) VALUES
  -- Sample organization ID (replace with actual)
  (
    '00000000-0000-0000-0000-000000000000',
    'A Thousand Years',
    'Christina Perri',
    269,
    'romantic',
    'romantic',
    3,
    'perfect',
    true,
    false,
    true,
    true,
    85,
    '{"emotion_tags": ["love", "eternal", "commitment"], "recommended_moments": ["processional", "unity_ceremony"]}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Can''t Stop the Feeling',
    'Justin Timberlake',
    236,
    'pop',
    'upbeat',
    8,
    'good',
    false,
    true,
    true,
    false,
    92,
    '{"emotion_tags": ["joy", "celebration", "fun"], "recommended_moments": ["grand_entrance", "dancing_warmup"]}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'At Last',
    'Etta James',
    180,
    'jazz',
    'romantic',
    4,
    'perfect',
    true,
    true,
    true,
    true,
    78,
    '{"emotion_tags": ["love", "classic", "timeless"], "recommended_moments": ["first_dance", "dinner_background"]}'
  );

-- =====================================================
-- CLEANUP AND MAINTENANCE
-- =====================================================

-- Schedule cleanup of expired recommendations (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-music-recommendations', '0 2 * * *', 'SELECT cleanup_expired_recommendations();');

COMMENT ON TABLE music_tracks IS 'Core music database with AI analysis and wedding context';
COMMENT ON TABLE music_playlists IS 'Wedding playlists with AI generation capabilities';
COMMENT ON TABLE playlist_tracks IS 'Track ordering and metadata within playlists';
COMMENT ON TABLE guest_music_requests IS 'Guest song requests for wedding playlists';
COMMENT ON TABLE user_music_preferences IS 'User music preferences for AI learning';
COMMENT ON TABLE music_recommendations IS 'AI-generated music recommendations';
COMMENT ON TABLE external_music_services IS 'Spotify/Apple Music integration credentials';
COMMENT ON TABLE dj_vendor_connections IS 'DJ vendor access and equipment info';
COMMENT ON TABLE music_timeline_events IS 'Timeline integration for music events';
COMMENT ON TABLE music_analytics IS 'Playlist usage and performance analytics';
COMMENT ON TABLE music_recommendation_metrics IS 'AI recommendation system performance metrics';