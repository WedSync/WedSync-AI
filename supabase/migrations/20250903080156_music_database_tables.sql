-- WS-252 Music Database Integration Tables
-- Creates comprehensive music database schema for wedding music management
-- Migration: 20250903080156_music_database_tables.sql

-- ============================================================================
-- MUSIC TRACKS CACHE TABLE
-- Stores track metadata from external providers (Spotify, Apple Music, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS music_tracks_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'apple', 'youtube', 'manual')),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_ms INTEGER,
  explicit BOOLEAN DEFAULT false,
  preview_url TEXT,
  external_url TEXT,
  popularity INTEGER,
  release_date DATE,
  genre TEXT[],
  tempo INTEGER, -- BPM
  musical_key TEXT, -- e.g., "C major", "A minor"
  energy_level DECIMAL(3,2) CHECK (energy_level >= 0 AND energy_level <= 1),
  danceability DECIMAL(3,2) CHECK (danceability >= 0 AND danceability <= 1),
  valence DECIMAL(3,2) CHECK (valence >= 0 AND valence <= 1), -- Musical positivity
  acousticness DECIMAL(3,2) CHECK (acousticness >= 0 AND acousticness <= 1),
  instrumentalness DECIMAL(3,2) CHECK (instrumentalness >= 0 AND instrumentalness <= 1),
  wedding_categories JSONB DEFAULT '[]'::jsonb, -- Array of wedding event types
  appropriateness_score DECIMAL(3,2) CHECK (appropriateness_score >= 0 AND appropriateness_score <= 1),
  ai_analysis_notes TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate tracks from same provider
  UNIQUE(provider, external_id)
);

-- ============================================================================
-- SONG REQUESTS TABLE
-- Handles vague song requests from couples with AI resolution
-- ============================================================================

CREATE TABLE IF NOT EXISTS song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  original_request TEXT NOT NULL,
  normalized_request TEXT, -- AI-processed version
  matched_track_id UUID REFERENCES music_tracks_cache(id) ON DELETE SET NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_method TEXT CHECK (match_method IN ('direct', 'ai_assisted', 'manual')) DEFAULT 'ai_assisted',
  status TEXT CHECK (status IN ('pending', 'resolved', 'clarification_needed', 'rejected')) DEFAULT 'pending',
  approved BOOLEAN DEFAULT NULL, -- NULL = pending, TRUE = approved, FALSE = rejected
  rejection_reason TEXT,
  category_suggestion TEXT,
  event_type TEXT CHECK (event_type IN ('ceremony', 'cocktail', 'dinner', 'reception', 'first_dance', 'party')),
  context_clues JSONB DEFAULT '[]'::jsonb,
  ai_interpretation TEXT,
  clarification_questions JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- MUSIC PLAYLISTS TABLE
-- Stores generated and manual wedding playlists
-- ============================================================================

CREATE TABLE IF NOT EXISTS music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  track_ids UUID[] NOT NULL DEFAULT '{}', -- Array of track IDs from music_tracks_cache
  track_order INTEGER[] DEFAULT '{}', -- Order positions for tracks
  total_duration INTEGER NOT NULL DEFAULT 0, -- Total duration in seconds
  is_public BOOLEAN DEFAULT false,
  is_generated BOOLEAN DEFAULT false, -- TRUE if AI-generated, FALSE if manually created
  wedding_event_type TEXT CHECK (wedding_event_type IN ('ceremony', 'cocktail', 'dinner', 'reception', 'first_dance', 'party')),
  energy_progression DECIMAL[] DEFAULT '{}', -- Energy levels throughout playlist
  generation_metadata JSONB, -- AI generation details, algorithm version, etc.
  custom_settings JSONB DEFAULT '{}'::jsonb, -- User preferences, restrictions, etc.
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  shared_with UUID[] DEFAULT '{}', -- Array of user IDs who can access this playlist
  version INTEGER DEFAULT 1, -- Version control for playlist changes
  parent_playlist_id UUID REFERENCES music_playlists(id) ON DELETE SET NULL, -- For playlist variations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate playlist names within organization
  UNIQUE(organization_id, name)
);

-- ============================================================================
-- SONG APPROPRIATENESS ANALYSIS TABLE
-- Stores AI analysis results for wedding appropriateness
-- ============================================================================

CREATE TABLE IF NOT EXISTS song_appropriateness_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES music_tracks_cache(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Organization-specific context
  reason_category TEXT NOT NULL CHECK (reason_category IN ('explicit', 'breakup', 'death', 'violence', 'inappropriate', 'cultural', 'religious', 'age_inappropriate')),
  appropriateness_score DECIMAL(3,2) NOT NULL CHECK (appropriateness_score >= 0 AND appropriateness_score <= 1),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_details JSONB,
  flagged_content TEXT[], -- Specific lyrics or themes flagged
  suitable_categories TEXT[] DEFAULT '{}', -- Wedding event types where this track is suitable
  alternative_suggestions TEXT[], -- Suggested alternative tracks if inappropriate
  cultural_considerations TEXT[],
  age_appropriateness JSONB, -- Min age and concerns
  context_hash TEXT, -- Hash of analysis context for caching
  ai_model_version TEXT DEFAULT 'gpt-3.5-turbo',
  human_verified BOOLEAN DEFAULT false,
  human_notes TEXT,
  verification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for track + organization + context combination
  UNIQUE(track_id, organization_id, context_hash)
);

-- ============================================================================
-- MUSIC API USAGE TRACKING TABLE
-- Tracks external API usage for rate limiting and cost management
-- ============================================================================

CREATE TABLE IF NOT EXISTS music_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_provider TEXT NOT NULL CHECK (api_provider IN ('spotify', 'apple', 'openai', 'youtube')),
  endpoint TEXT NOT NULL, -- API endpoint called
  request_type TEXT NOT NULL CHECK (request_type IN ('search', 'track_details', 'audio_features', 'ai_analysis', 'recommendations')),
  request_count INTEGER NOT NULL DEFAULT 1,
  tokens_used INTEGER DEFAULT 0, -- For OpenAI API
  cost_estimate DECIMAL(10,4) DEFAULT 0.0000, -- Estimated API cost
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  rate_limited BOOLEAN DEFAULT false,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional request metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WEDDING MUSIC PREFERENCES TABLE
-- Stores couple and organization music preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS wedding_music_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  preferred_genres TEXT[] DEFAULT '{}',
  avoided_genres TEXT[] DEFAULT '{}',
  must_include_tracks UUID[] DEFAULT '{}', -- Track IDs that must be included
  avoid_tracks UUID[] DEFAULT '{}', -- Track IDs to avoid
  energy_preferences JSONB DEFAULT '{}'::jsonb, -- Energy levels for different events
  cultural_requirements TEXT[],
  religious_considerations BOOLEAN DEFAULT false,
  family_friendly BOOLEAN DEFAULT true,
  guest_demographics JSONB DEFAULT '{}'::jsonb, -- Age ranges, cultural backgrounds
  special_requests TEXT,
  do_not_play_list UUID[] DEFAULT '{}', -- Absolute no-play tracks
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per wedding
  UNIQUE(wedding_id)
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- Optimized for common query patterns
-- ============================================================================

-- Music tracks cache indexes
CREATE INDEX IF NOT EXISTS idx_tracks_cache_search ON music_tracks_cache USING GIN ((lower(title) || ' ' || lower(artist)));
CREATE INDEX IF NOT EXISTS idx_tracks_cache_provider ON music_tracks_cache(provider);
CREATE INDEX IF NOT EXISTS idx_tracks_cache_genre ON music_tracks_cache USING GIN (genre);
CREATE INDEX IF NOT EXISTS idx_tracks_wedding_categories ON music_tracks_cache USING GIN (wedding_categories);
CREATE INDEX IF NOT EXISTS idx_tracks_appropriateness ON music_tracks_cache(appropriateness_score DESC) WHERE appropriateness_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_energy_level ON music_tracks_cache(energy_level) WHERE energy_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_tempo ON music_tracks_cache(tempo) WHERE tempo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_explicit ON music_tracks_cache(explicit);
CREATE INDEX IF NOT EXISTS idx_tracks_release_date ON music_tracks_cache(release_date);

-- Song requests indexes
CREATE INDEX IF NOT EXISTS idx_song_requests_org ON song_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_wedding ON song_requests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_requested_at ON song_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_requests_event_type ON song_requests(event_type);
CREATE INDEX IF NOT EXISTS idx_song_requests_search ON song_requests USING GIN (to_tsvector('english', original_request));

-- Music playlists indexes
CREATE INDEX IF NOT EXISTS idx_playlists_org ON music_playlists(organization_id);
CREATE INDEX IF NOT EXISTS idx_playlists_wedding ON music_playlists(wedding_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_by ON music_playlists(created_by);
CREATE INDEX IF NOT EXISTS idx_playlists_event_type ON music_playlists(wedding_event_type);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON music_playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlists_generated ON music_playlists(is_generated);
CREATE INDEX IF NOT EXISTS idx_playlists_updated ON music_playlists(updated_at DESC);

-- Appropriateness analysis indexes
CREATE INDEX IF NOT EXISTS idx_appropriateness_track ON song_appropriateness_analysis(track_id);
CREATE INDEX IF NOT EXISTS idx_appropriateness_org ON song_appropriateness_analysis(organization_id);
CREATE INDEX IF NOT EXISTS idx_appropriateness_score ON song_appropriateness_analysis(appropriateness_score DESC);
CREATE INDEX IF NOT EXISTS idx_appropriateness_category ON song_appropriateness_analysis(reason_category);
CREATE INDEX IF NOT EXISTS idx_appropriateness_verified ON song_appropriateness_analysis(human_verified);

-- API usage indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_org ON music_api_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON music_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON music_api_usage(api_provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_window ON music_api_usage(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON music_api_usage(created_at DESC);

-- Music preferences indexes
CREATE INDEX IF NOT EXISTS idx_music_prefs_org ON wedding_music_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_music_prefs_wedding ON wedding_music_preferences(wedding_id);
CREATE INDEX IF NOT EXISTS idx_music_prefs_client ON wedding_music_preferences(client_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Ensures data access is properly restricted
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE music_tracks_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_appropriateness_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_music_preferences ENABLE ROW LEVEL SECURITY;

-- Music tracks cache - public read access (cached data is not sensitive)
CREATE POLICY "Public read access to music tracks cache" ON music_tracks_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage music tracks cache" ON music_tracks_cache
  FOR ALL TO service_role
  USING (true);

-- Song requests - organization-scoped access
CREATE POLICY "Users can view own organization song requests" ON song_requests
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create song requests for own organization" ON song_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can update own song requests" ON song_requests
  FOR UPDATE TO authenticated
  USING (
    supplier_id IN (
      SELECT id 
      FROM suppliers 
      WHERE user_id = auth.uid()
    )
  );

-- Music playlists - organization and sharing-based access
CREATE POLICY "Users can view accessible playlists" ON music_playlists
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR is_public = true
    OR auth.uid() = ANY(shared_with)
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create playlists in own organization" ON music_playlists
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own playlists" ON music_playlists
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own playlists" ON music_playlists
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Appropriateness analysis - organization-scoped read access
CREATE POLICY "Users can view appropriateness analysis for own org" ON song_appropriateness_analysis
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL -- Global analysis available to all
  );

CREATE POLICY "Service role can manage appropriateness analysis" ON song_appropriateness_analysis
  FOR ALL TO service_role
  USING (true);

-- API usage - users can view own organization usage
CREATE POLICY "Users can view own organization API usage" ON music_api_usage
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage API usage" ON music_api_usage
  FOR ALL TO service_role
  USING (true);

-- Music preferences - wedding-scoped access
CREATE POLICY "Users can view wedding music preferences" ON wedding_music_preferences
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage wedding music preferences" ON wedding_music_preferences
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables with updated_at columns
CREATE TRIGGER update_music_tracks_cache_updated_at 
  BEFORE UPDATE ON music_tracks_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_song_appropriateness_analysis_updated_at 
  BEFORE UPDATE ON song_appropriateness_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_playlists_updated_at 
  BEFORE UPDATE ON music_playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_music_preferences_updated_at 
  BEFORE UPDATE ON wedding_music_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to search tracks with full-text search
CREATE OR REPLACE FUNCTION search_music_tracks(
  search_query TEXT,
  genres_filter TEXT[] DEFAULT NULL,
  energy_min DECIMAL DEFAULT NULL,
  energy_max DECIMAL DEFAULT NULL,
  explicit_filter BOOLEAN DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  track_id UUID,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration_ms INTEGER,
  genre TEXT[],
  energy_level DECIMAL,
  appropriateness_score DECIMAL,
  relevance_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.artist,
    t.album,
    t.duration_ms,
    t.genre,
    t.energy_level,
    t.appropriateness_score,
    ts_rank(to_tsvector('english', t.title || ' ' || t.artist), plainto_tsquery('english', search_query)) as relevance_rank
  FROM music_tracks_cache t
  WHERE 
    (search_query IS NULL OR to_tsvector('english', t.title || ' ' || t.artist) @@ plainto_tsquery('english', search_query))
    AND (genres_filter IS NULL OR t.genre && genres_filter)
    AND (energy_min IS NULL OR t.energy_level >= energy_min)
    AND (energy_max IS NULL OR t.energy_level <= energy_max)
    AND (explicit_filter IS NULL OR t.explicit = explicit_filter)
  ORDER BY 
    relevance_rank DESC,
    t.appropriateness_score DESC NULLS LAST,
    t.popularity DESC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get playlist analytics
CREATE OR REPLACE FUNCTION get_playlist_analytics(playlist_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'track_count', array_length(track_ids, 1),
    'total_duration_minutes', ROUND(total_duration / 60.0, 2),
    'avg_energy_level', ROUND((
      SELECT AVG(t.energy_level) 
      FROM music_tracks_cache t 
      WHERE t.id = ANY(track_ids)
    ), 3),
    'explicit_count', (
      SELECT COUNT(*) 
      FROM music_tracks_cache t 
      WHERE t.id = ANY(track_ids) AND t.explicit = true
    ),
    'genre_distribution', (
      SELECT json_object_agg(genre_name, genre_count)
      FROM (
        SELECT unnest(t.genre) as genre_name, COUNT(*) as genre_count
        FROM music_tracks_cache t 
        WHERE t.id = ANY(track_ids)
        GROUP BY genre_name
        ORDER BY genre_count DESC
        LIMIT 10
      ) genre_stats
    )
  )
  INTO result
  FROM music_playlists 
  WHERE id = playlist_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE music_tracks_cache IS 'Cached music track metadata from external providers (Spotify, Apple Music, etc.) with AI analysis results';
COMMENT ON TABLE song_requests IS 'Vague song requests from couples with AI-powered resolution and supplier approval workflow';
COMMENT ON TABLE music_playlists IS 'Wedding playlists (both manually created and AI-generated) with track ordering and metadata';
COMMENT ON TABLE song_appropriateness_analysis IS 'AI analysis results for wedding appropriateness with cultural and age considerations';
COMMENT ON TABLE music_api_usage IS 'External API usage tracking for rate limiting and cost management';
COMMENT ON TABLE wedding_music_preferences IS 'Couple and organization music preferences and restrictions';

COMMENT ON FUNCTION search_music_tracks IS 'Full-text search function for music tracks with filtering options';
COMMENT ON FUNCTION get_playlist_analytics IS 'Generate analytics summary for a specific playlist';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users for appropriate operations
GRANT SELECT ON music_tracks_cache TO authenticated;
GRANT ALL ON song_requests TO authenticated;
GRANT ALL ON music_playlists TO authenticated;
GRANT SELECT ON song_appropriateness_analysis TO authenticated;
GRANT SELECT ON music_api_usage TO authenticated;
GRANT ALL ON wedding_music_preferences TO authenticated;

-- Grant full access to service role for all operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;