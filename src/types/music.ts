// =====================================================
// MUSIC DATABASE AI SYSTEM TYPES
// =====================================================
// AI-powered music recommendation and database system for wedding planning
// Feature ID: WS-128
// Created: 2025-08-24
// =====================================================

// =====================================================
// CORE MUSIC DATABASE TYPES
// =====================================================

export interface MusicTrack {
  id: string;
  organization_id: string;

  // Track Information
  title: string;
  artist: string;
  album?: string;
  duration_seconds: number;

  // Genre & Classification
  primary_genre: MusicGenre;
  secondary_genres?: MusicGenre[];
  subgenres?: string[];

  // Mood & Energy Analysis
  mood: MusicMood;
  energy_level: EnergyLevel; // 1-10 scale
  tempo_bpm?: number;
  danceability: number; // 0-1 scale
  valence: number; // 0-1 positivity scale

  // Wedding Context
  wedding_appropriateness: WeddingAppropriateness;
  ceremony_suitable: boolean;
  reception_suitable: boolean;
  cocktail_suitable: boolean;
  dinner_suitable: boolean;

  // Cultural & Religious
  cultural_tags?: string[];
  religious_appropriateness?: ReligiousRating[];
  language?: string;
  explicit_content: boolean;

  // External IDs
  spotify_id?: string;
  apple_music_id?: string;
  youtube_id?: string;

  // Licensing
  licensing_status: LicensingStatus;
  licensing_cost?: number;
  licensing_provider?: string;
  copyright_info?: string;

  // Usage Statistics
  popularity_score: number; // 0-100
  wedding_usage_count: number;
  last_played_at?: string;

  // AI Analysis
  ai_analysis: {
    emotion_tags: string[];
    energy_curve?: number[]; // Energy over time
    vocal_characteristics?: string;
    instrumental_features?: string;
    recommended_moments?: WeddingMoment[];
  };

  // Metadata
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MusicPlaylist {
  id: string;
  organization_id: string;
  client_id?: string;

  // Playlist Information
  name: string;
  description?: string;
  cover_image_url?: string;

  // Type & Context
  playlist_type: PlaylistType;
  wedding_phase: WeddingPhase[];
  target_duration_minutes?: number;

  // AI Configuration
  auto_generate: boolean;
  generation_criteria?: {
    mood_preference: MusicMood[];
    energy_progression: EnergyProgression;
    genre_weights: Record<MusicGenre, number>;
    cultural_requirements?: string[];
    avoid_explicit: boolean;
    target_age_groups?: AgeGroup[];
  };

  // Status
  status: 'draft' | 'generated' | 'customized' | 'approved' | 'active';
  is_public: boolean;
  is_template: boolean;

  // Statistics
  total_tracks: number;
  total_duration_seconds: number;
  play_count: number;
  last_played_at?: string;

  // Collaboration
  shared_with: string[]; // User IDs
  vendor_access: boolean;
  guest_requests_enabled: boolean;

  // Metadata
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Relations
  tracks?: PlaylistTrack[];
  guest_requests?: GuestMusicRequest[];
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;

  // Ordering
  order_index: number;

  // Timing
  start_time_seconds?: number; // When in timeline
  fade_in_seconds?: number;
  fade_out_seconds?: number;

  // Status
  status: 'active' | 'queued' | 'played' | 'skipped' | 'removed';

  // AI Suggestions
  ai_suggested: boolean;
  confidence_score?: number; // 0-1
  suggestion_reason?: string;

  // User Customization
  user_added: boolean;
  user_notes?: string;

  // Metadata
  added_at: string;
  added_by?: string;
  played_at?: string;

  // Relations
  track?: MusicTrack;
}

export interface GuestMusicRequest {
  id: string;
  playlist_id: string;
  guest_name: string;
  guest_email?: string;

  // Request Details
  track_title: string;
  artist_name: string;
  special_message?: string;
  dedication?: string;

  // Status
  status: 'pending' | 'approved' | 'rejected' | 'added';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;

  // Metadata
  requested_at: string;
  ip_address?: string;
}

// =====================================================
// AI RECOMMENDATION TYPES
// =====================================================

export interface MusicRecommendation {
  id: string;
  organization_id: string;
  client_id: string;

  // Recommendation Context
  recommendation_type: RecommendationType;
  target_playlist_id?: string;
  target_timeline_event_id?: string;

  // AI Analysis
  recommended_tracks: RecommendedTrack[];
  confidence_score: number; // 0-1
  reasoning: string;

  // User Preferences Used
  preference_snapshot: UserMusicPreferences;

  // Status
  status: 'generated' | 'viewed' | 'applied' | 'rejected';
  feedback_score?: number; // 1-5 stars
  feedback_notes?: string;

  // Metadata
  generated_at: string;
  expires_at: string;
  algorithm_version: string;
}

export interface RecommendedTrack {
  track_id: string;
  confidence_score: number; // 0-1
  reason: string;
  suggested_position?: number;
  alternative_tracks?: string[]; // Other track IDs

  // Relations
  track?: MusicTrack;
}

export interface UserMusicPreferences {
  id: string;
  user_id: string;
  organization_id: string;
  client_id?: string;

  // Explicit Preferences
  favorite_genres: MusicGenre[];
  disliked_genres: MusicGenre[];
  favorite_artists: string[];
  banned_artists: string[];

  // Mood Preferences
  preferred_moods: {
    ceremony: MusicMood[];
    cocktails: MusicMood[];
    dinner: MusicMood[];
    dancing: MusicMood[];
  };

  // Cultural & Religious
  cultural_requirements: string[];
  religious_restrictions: string[];
  language_preferences: string[];

  // Energy & Style
  energy_progression: EnergyProgression;
  vocal_preference: 'instrumental' | 'vocal' | 'mixed' | 'no_preference';
  explicit_content_allowed: boolean;

  // Age Demographics
  guest_age_groups: AgeGroup[];
  cater_to_older_guests: boolean;

  // Special Requirements
  first_dance_song?: string;
  father_daughter_song?: string;
  mother_son_song?: string;
  entrance_song?: string;
  exit_song?: string;

  // AI Learning Data
  listening_history: MusicInteraction[];
  feedback_history: RecommendationFeedback[];

  // Metadata
  last_updated_at: string;
  learning_confidence: number; // 0-1
}

export interface MusicInteraction {
  track_id: string;
  interaction_type:
    | 'play'
    | 'skip'
    | 'like'
    | 'dislike'
    | 'add_to_playlist'
    | 'remove_from_playlist';
  context: WeddingPhase;
  timestamp: string;
  duration_played_seconds?: number;
}

export interface RecommendationFeedback {
  recommendation_id: string;
  track_id: string;
  rating: number; // 1-5 stars
  feedback_type: 'helpful' | 'not_helpful' | 'inappropriate' | 'love_it';
  notes?: string;
  timestamp: string;
}

// =====================================================
// INTEGRATION TYPES
// =====================================================

export interface ExternalMusicService {
  id: string;
  organization_id: string;
  user_id: string;

  // Service Details
  provider: MusicProvider;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;

  // Permissions
  scopes: string[];
  can_play_music: boolean;
  can_create_playlists: boolean;
  can_read_library: boolean;

  // Status
  is_active: boolean;
  last_sync_at?: string;
  sync_status?: 'pending' | 'syncing' | 'success' | 'error';
  error_message?: string;

  // Metadata
  connected_at: string;
  updated_at: string;
}

export interface DJVendorConnection {
  id: string;
  supplier_id: string; // DJ vendor
  client_id: string;
  organization_id: string;

  // Connection Details
  access_level: 'view_only' | 'suggest' | 'full_control';
  can_modify_playlists: boolean;
  can_see_requests: boolean;

  // Equipment & Setup
  equipment_info?: {
    sound_system: string;
    microphones: number;
    has_lighting: boolean;
    setup_time_minutes: number;
    breakdown_time_minutes: number;
  };

  // Synchronization
  sync_enabled: boolean;
  auto_sync_playlists: boolean;
  last_sync_at?: string;

  // Status
  status: 'pending' | 'active' | 'paused' | 'disconnected';

  // Metadata
  connected_at: string;
  updated_at: string;
}

// =====================================================
// TIMELINE INTEGRATION TYPES
// =====================================================

export interface MusicTimelineEvent {
  id: string;
  timeline_event_id: string; // FK to timeline_events
  playlist_id?: string;

  // Music Details
  music_type: 'playlist' | 'specific_track' | 'live_music' | 'silence';
  volume_level: number; // 0-100

  // Transitions
  fade_in_seconds: number;
  fade_out_seconds: number;
  crossfade_next: boolean;

  // Special Instructions
  start_on_cue: boolean;
  loop_until_event_end: boolean;
  special_instructions?: string;

  // Status
  status: 'planned' | 'queued' | 'playing' | 'completed';

  // Metadata
  created_at: string;
  updated_at: string;
}

// =====================================================
// ENUMS
// =====================================================

export type MusicGenre =
  | 'classical'
  | 'jazz'
  | 'rock'
  | 'pop'
  | 'country'
  | 'r_and_b'
  | 'soul'
  | 'funk'
  | 'reggae'
  | 'folk'
  | 'blues'
  | 'electronic'
  | 'hip_hop'
  | 'acoustic'
  | 'world'
  | 'latin'
  | 'gospel'
  | 'indie'
  | 'alternative'
  | 'romantic'
  | 'instrumental';

export type MusicMood =
  | 'romantic'
  | 'upbeat'
  | 'peaceful'
  | 'energetic'
  | 'emotional'
  | 'celebratory'
  | 'intimate'
  | 'fun'
  | 'elegant'
  | 'nostalgic'
  | 'modern'
  | 'traditional'
  | 'spiritual'
  | 'dramatic';

export type EnergyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type WeddingAppropriateness =
  | 'perfect'
  | 'good'
  | 'acceptable'
  | 'questionable'
  | 'inappropriate';

export type ReligiousRating = {
  religion: string;
  appropriateness: 'perfect' | 'good' | 'neutral' | 'caution' | 'avoid';
  notes?: string;
};

export type WeddingMoment =
  | 'processional'
  | 'recessional'
  | 'unity_ceremony'
  | 'kiss'
  | 'first_dance'
  | 'father_daughter'
  | 'mother_son'
  | 'cake_cutting'
  | 'bouquet_toss'
  | 'grand_entrance'
  | 'last_dance'
  | 'cocktail_hour'
  | 'dinner_background'
  | 'dancing_warmup'
  | 'peak_party';

export type PlaylistType =
  | 'ceremony'
  | 'cocktail_hour'
  | 'dinner'
  | 'dancing'
  | 'special_moments'
  | 'background'
  | 'master'
  | 'dj_set';

export type WeddingPhase =
  | 'pre_ceremony'
  | 'ceremony'
  | 'post_ceremony'
  | 'cocktails'
  | 'dinner'
  | 'dancing'
  | 'late_night';

export type EnergyProgression =
  | 'gradual_buildup'
  | 'steady_high'
  | 'peaks_and_valleys'
  | 'mellow_romantic'
  | 'custom';

export type AgeGroup =
  | 'gen_z' // 18-27
  | 'millennials' // 28-43
  | 'gen_x' // 44-59
  | 'boomers'; // 60+

export type LicensingStatus =
  | 'public_domain'
  | 'licensed'
  | 'needs_license'
  | 'restricted'
  | 'unknown';

export type MusicProvider =
  | 'spotify'
  | 'apple_music'
  | 'youtube_music'
  | 'internal';

export type RecommendationType =
  | 'new_playlist'
  | 'enhance_playlist'
  | 'replace_track'
  | 'event_music'
  | 'guest_request_match';

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreatePlaylistRequest {
  name: string;
  client_id?: string;
  playlist_type: PlaylistType;
  wedding_phase: WeddingPhase[];
  auto_generate?: boolean;
  generation_criteria?: any;
}

export interface GenerateMusicRecommendationsRequest {
  client_id: string;
  recommendation_type: RecommendationType;
  context: {
    wedding_date?: string;
    guest_count?: number;
    venue_type?: string;
    cultural_requirements?: string[];
    religious_requirements?: string[];
    time_of_day?: string;
    season?: string;
  };
  preferences?: Partial<UserMusicPreferences>;
  limit?: number;
}

export interface AddTrackToPlaylistRequest {
  playlist_id: string;
  track_id: string;
  order_index?: number;
  user_notes?: string;
}

export interface GuestRequestMusicRequest {
  guest_name: string;
  guest_email?: string;
  track_title: string;
  artist_name: string;
  special_message?: string;
  dedication?: string;
}

export interface MusicSearchRequest {
  query?: string;
  genres?: MusicGenre[];
  moods?: MusicMood[];
  energy_min?: number;
  energy_max?: number;
  wedding_phase?: WeddingPhase;
  cultural_tags?: string[];
  explicit_allowed?: boolean;
  limit?: number;
  offset?: number;
}

export interface SyncExternalMusicRequest {
  provider: MusicProvider;
  playlist_ids?: string[];
  import_user_library?: boolean;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface MusicAnalytics {
  playlist_id: string;

  // Usage Metrics
  total_plays: number;
  unique_listeners: number;
  avg_session_duration: number;
  skip_rate: number;

  // Track Performance
  most_played_tracks: { track_id: string; play_count: number }[];
  most_skipped_tracks: { track_id: string; skip_count: number }[];

  // Timing Analysis
  peak_listening_hours: number[];
  wedding_phase_engagement: Record<WeddingPhase, number>;

  // Feedback
  avg_rating: number;
  total_ratings: number;
  guest_request_fulfillment_rate: number;

  // Period
  period_start: string;
  period_end: string;
  last_updated: string;
}

export interface MusicRecommendationMetrics {
  algorithm_version: string;

  // Performance
  avg_confidence_score: number;
  acceptance_rate: number; // Recommendations accepted
  user_satisfaction_score: number;

  // Learning
  total_interactions: number;
  preference_learning_accuracy: number;

  // Period
  period_start: string;
  period_end: string;
  last_calculated: string;
}

// =====================================================
// COMPONENT PROPS TYPES
// =====================================================

export interface MusicPlayerProps {
  playlist?: MusicPlaylist;
  currentTrack?: MusicTrack;
  isPlaying: boolean;
  volume: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeChange: (volume: number) => void;
}

export interface MusicRecommendationCardProps {
  recommendation: MusicRecommendation;
  onAccept: (trackIds: string[]) => void;
  onReject: (reason?: string) => void;
  onFeedback: (rating: number, notes?: string) => void;
}

export interface PlaylistBuilderProps {
  playlist: MusicPlaylist;
  availableTracks: MusicTrack[];
  recommendations?: MusicRecommendation[];
  onAddTrack: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
  onReorderTracks: (trackIds: string[]) => void;
  onGenerateRecommendations: () => void;
}
