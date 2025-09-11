/**
 * Music AI Service - AI-powered music recommendation and analysis system
 * Feature ID: WS-128
 * Provides intelligent music suggestions for wedding events
 */

import { openaiService } from './openai-service';
import { supabase } from '@/lib/supabase';
import type {
  MusicTrack,
  MusicPlaylist,
  UserMusicPreferences,
  MusicRecommendation,
  RecommendedTrack,
  GenerateMusicRecommendationsRequest,
  MusicGenre,
  MusicMood,
  WeddingPhase,
  EnergyProgression,
  AgeGroup,
} from '@/types/music';

export interface MusicAnalysisRequest {
  trackTitle: string;
  artist: string;
  lyrics?: string;
  audioFeatures?: {
    tempo: number;
    key: number;
    mode: number;
    valence: number;
    energy: number;
    danceability: number;
    instrumentalness: number;
    acousticness: number;
  };
}

export interface MusicAnalysisResponse {
  mood: MusicMood;
  energy_level: number;
  wedding_appropriateness:
    | 'perfect'
    | 'good'
    | 'acceptable'
    | 'questionable'
    | 'inappropriate';
  ceremony_suitable: boolean;
  reception_suitable: boolean;
  cocktail_suitable: boolean;
  dinner_suitable: boolean;
  cultural_considerations: string[];
  religious_appropriateness: Array<{
    religion: string;
    appropriateness: 'perfect' | 'good' | 'neutral' | 'caution' | 'avoid';
    notes?: string;
  }>;
  recommended_moments: string[];
  emotion_tags: string[];
  confidence: number;
}

/**
 * Music AI Service Class
 * Handles music analysis, recommendation generation, and preference learning
 */
export class MusicAIService {
  private readonly recommendationModel = 'gpt-4';
  private readonly analysisCache = new Map<string, MusicAnalysisResponse>();

  /**
   * Generate AI-powered music recommendations
   */
  async generateRecommendations(
    request: GenerateMusicRecommendationsRequest,
  ): Promise<MusicRecommendation> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(request.client_id);

      // Get existing tracks in organization
      const { data: existingTracks } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('organization_id', await this.getOrganizationId(request.client_id))
        .limit(1000);

      // Build AI prompt for recommendations
      const prompt = this.buildRecommendationPrompt(
        request,
        preferences,
        existingTracks || [],
      );

      // Get AI recommendations
      const aiResponse = await openaiService.generateCompletion(prompt, {
        model: this.recommendationModel,
        max_tokens: 2000,
        temperature: 0.3,
        system_prompt: this.getSystemPrompt(),
      });

      // Parse AI response
      const parsedRecommendations = this.parseRecommendationResponse(
        aiResponse.text,
      );

      // Calculate confidence scores
      const recommendedTracks = await this.calculateConfidenceScores(
        parsedRecommendations.tracks,
        preferences,
        existingTracks || [],
      );

      // Create recommendation record
      const recommendation: Omit<
        MusicRecommendation,
        'id' | 'organization_id'
      > = {
        client_id: request.client_id,
        recommendation_type: request.recommendation_type,
        target_playlist_id: request.context.target_playlist_id,
        target_timeline_event_id: request.context.target_timeline_event_id,
        recommended_tracks: recommendedTracks,
        confidence_score: this.calculateOverallConfidence(recommendedTracks),
        reasoning: parsedRecommendations.reasoning,
        preference_snapshot: preferences,
        status: 'generated',
        generated_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days
        algorithm_version: '1.0',
      };

      // Save recommendation
      const { data: savedRecommendation, error } = await supabase
        .from('music_recommendations')
        .insert({
          ...recommendation,
          organization_id: await this.getOrganizationId(request.client_id),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save recommendation: ${error.message}`);
      }

      return savedRecommendation;
    } catch (error) {
      console.error('Music recommendation generation failed:', error);
      throw new Error(`Recommendation generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze a music track for wedding suitability
   */
  async analyzeTrack(
    request: MusicAnalysisRequest,
  ): Promise<MusicAnalysisResponse> {
    const cacheKey = `${request.trackTitle}_${request.artist}`;

    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);

      const aiResponse = await openaiService.generateCompletion(prompt, {
        model: 'gpt-4',
        max_tokens: 1500,
        temperature: 0.2,
        system_prompt: `You are a wedding music expert with deep knowledge of music psychology, 
        cultural appropriateness, and wedding traditions. Analyze music tracks for wedding suitability 
        with high accuracy and cultural sensitivity.`,
      });

      const analysis = this.parseAnalysisResponse(aiResponse.text, request);

      // Cache result
      this.analysisCache.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('Music track analysis failed:', error);
      throw new Error(`Track analysis failed: ${error.message}`);
    }
  }

  /**
   * Learn from user interactions to improve recommendations
   */
  async learnFromInteraction(
    userId: string,
    trackId: string,
    interactionType:
      | 'play'
      | 'skip'
      | 'like'
      | 'dislike'
      | 'add_to_playlist'
      | 'remove_from_playlist',
    context: WeddingPhase,
    durationPlayedSeconds?: number,
  ): Promise<void> {
    try {
      // Get current preferences
      const { data: preferences } = await supabase
        .from('user_music_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!preferences) return;

      // Update listening history
      const interaction = {
        track_id: trackId,
        interaction_type: interactionType,
        context,
        timestamp: new Date().toISOString(),
        duration_played_seconds: durationPlayedSeconds,
      };

      const updatedHistory = [
        ...(preferences.listening_history || []),
        interaction,
      ];

      // Keep only last 1000 interactions for performance
      const recentHistory = updatedHistory.slice(-1000);

      // Calculate new learning confidence
      const newConfidence = this.calculateLearningConfidence(recentHistory);

      // Update preferences
      await supabase
        .from('user_music_preferences')
        .update({
          listening_history: recentHistory,
          learning_confidence: newConfidence,
          last_updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to learn from interaction:', error);
    }
  }

  /**
   * Generate a smart playlist based on preferences and context
   */
  async generateSmartPlaylist(
    clientId: string,
    playlistType: string,
    weddingPhases: WeddingPhase[],
    targetDurationMinutes: number,
    customCriteria?: any,
  ): Promise<string[]> {
    try {
      // Get client preferences
      const preferences = await this.getUserPreferences(clientId);

      // Build generation criteria
      const criteria = {
        playlist_type: playlistType,
        wedding_phases: weddingPhases,
        target_duration_minutes: targetDurationMinutes,
        mood_preference: preferences.preferred_moods,
        energy_progression: preferences.energy_progression,
        cultural_requirements: preferences.cultural_requirements,
        avoid_explicit: !preferences.explicit_content_allowed,
        target_age_groups: preferences.guest_age_groups,
        ...customCriteria,
      };

      // Get AI recommendations for playlist generation
      const recommendation = await this.generateRecommendations({
        client_id: clientId,
        recommendation_type: 'new_playlist',
        context: {
          playlist_criteria: criteria,
        },
        preferences,
        limit: Math.ceil(targetDurationMinutes / 4), // Estimate ~4 min per song
      });

      return recommendation.recommended_tracks.map((track) => track.track_id);
    } catch (error) {
      console.error('Smart playlist generation failed:', error);
      throw new Error(`Playlist generation failed: ${error.message}`);
    }
  }

  /**
   * Match guest song requests to available tracks
   */
  async matchGuestRequest(
    requestedTitle: string,
    requestedArtist: string,
    organizationId: string,
  ): Promise<{ exactMatch?: MusicTrack; suggestions: MusicTrack[] }> {
    try {
      // First try exact match
      const { data: exactMatch } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('title', requestedTitle)
        .ilike('artist', requestedArtist)
        .single();

      // Get similar tracks using AI
      const prompt = `Find similar wedding-appropriate songs to "${requestedTitle}" by ${requestedArtist}. 
      Consider similar artists, genre, mood, and wedding suitability. Return 5 alternative suggestions 
      that would satisfy a guest request for this song.`;

      const aiResponse = await openaiService.generateCompletion(prompt, {
        max_tokens: 800,
        temperature: 0.4,
      });

      // Parse suggestions and find matching tracks
      const { data: allTracks } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(500);

      const suggestions = this.findSimilarTracks(
        aiResponse.text,
        allTracks || [],
      );

      return {
        exactMatch: exactMatch || undefined,
        suggestions: suggestions.slice(0, 5),
      };
    } catch (error) {
      console.error('Guest request matching failed:', error);
      return { suggestions: [] };
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async getUserPreferences(
    clientId: string,
  ): Promise<UserMusicPreferences> {
    const { data: preferences } = await supabase
      .from('user_music_preferences')
      .select('*')
      .eq('client_id', clientId)
      .single();

    // Return default preferences if none exist
    return preferences || this.getDefaultPreferences(clientId);
  }

  private async getOrganizationId(clientId: string): Promise<string> {
    const { data: client } = await supabase
      .from('clients')
      .select('organization_id')
      .eq('id', clientId)
      .single();

    if (!client) {
      throw new Error('Client not found');
    }

    return client.organization_id;
  }

  private buildRecommendationPrompt(
    request: GenerateMusicRecommendationsRequest,
    preferences: UserMusicPreferences,
    existingTracks: MusicTrack[],
  ): string {
    return `Generate wedding music recommendations for a ${request.recommendation_type} request.

CONTEXT:
- Wedding Date: ${request.context.wedding_date || 'TBD'}
- Guest Count: ${request.context.guest_count || 'Unknown'}
- Venue Type: ${request.context.venue_type || 'Mixed'}
- Cultural Requirements: ${request.context.cultural_requirements?.join(', ') || 'None specified'}
- Religious Requirements: ${request.context.religious_requirements?.join(', ') || 'None specified'}

USER PREFERENCES:
- Favorite Genres: ${preferences.favorite_genres?.join(', ') || 'Not specified'}
- Disliked Genres: ${preferences.disliked_genres?.join(', ') || 'None'}
- Energy Progression: ${preferences.energy_progression || 'gradual_buildup'}
- Cultural Requirements: ${preferences.cultural_requirements?.join(', ') || 'None'}
- Explicit Content Allowed: ${preferences.explicit_content_allowed ? 'Yes' : 'No'}
- Guest Age Groups: ${preferences.guest_age_groups?.join(', ') || 'Mixed'}

AVAILABLE TRACKS: ${existingTracks.length} tracks in database

Generate ${request.limit || 10} specific song recommendations with detailed reasoning.
Focus on tracks that match the user's preferences and wedding context.

Return recommendations in this JSON format:
{
  "reasoning": "Overall explanation of recommendation strategy",
  "tracks": [
    {
      "title": "Song Title",
      "artist": "Artist Name",
      "confidence": 0.85,
      "reasoning": "Why this song fits",
      "wedding_moments": ["first_dance", "cocktail_hour"],
      "mood": "romantic",
      "energy_level": 4,
      "cultural_appropriateness": "perfect"
    }
  ]
}`;
  }

  private buildAnalysisPrompt(request: MusicAnalysisRequest): string {
    return `Analyze the wedding suitability of this song:

SONG: "${request.trackTitle}" by ${request.artist}

${
  request.audioFeatures
    ? `
AUDIO FEATURES:
- Tempo: ${request.audioFeatures.tempo} BPM
- Key: ${request.audioFeatures.key}
- Valence: ${request.audioFeatures.valence} (positivity)
- Energy: ${request.audioFeatures.energy}
- Danceability: ${request.audioFeatures.danceability}
`
    : ''
}

${request.lyrics ? `LYRICS SAMPLE: ${request.lyrics.substring(0, 500)}...` : ''}

Analyze this song for wedding appropriateness and return detailed analysis in JSON format:

{
  "mood": "romantic|upbeat|peaceful|energetic|emotional|celebratory|intimate|fun|elegant|nostalgic|modern|traditional|spiritual|dramatic",
  "energy_level": 5,
  "wedding_appropriateness": "perfect|good|acceptable|questionable|inappropriate",
  "ceremony_suitable": true,
  "reception_suitable": false,
  "cocktail_suitable": true,
  "dinner_suitable": true,
  "cultural_considerations": ["western", "universal"],
  "religious_appropriateness": [
    {
      "religion": "christian",
      "appropriateness": "perfect|good|neutral|caution|avoid",
      "notes": "explanation if needed"
    }
  ],
  "recommended_moments": ["processional", "first_dance", "cocktail_hour"],
  "emotion_tags": ["love", "commitment", "joy"],
  "confidence": 0.92
}

Consider lyrics content, musical style, cultural context, and traditional wedding appropriateness.`;
  }

  private getSystemPrompt(): string {
    return `You are an expert wedding music consultant with deep knowledge of:
- Music psychology and emotional impact
- Cultural and religious music traditions worldwide
- Wedding ceremony and reception flow
- Multi-generational music preferences
- Music licensing and copyright considerations

Provide accurate, culturally sensitive, and practical music recommendations that create 
memorable wedding experiences while respecting diverse backgrounds and preferences.`;
  }

  private parseRecommendationResponse(aiText: string): {
    reasoning: string;
    tracks: Array<{
      title: string;
      artist: string;
      confidence: number;
      reasoning: string;
      wedding_moments: string[];
      mood: MusicMood;
      energy_level: number;
      cultural_appropriateness: string;
    }>;
  } {
    try {
      // Extract JSON from AI response
      const jsonMatch =
        aiText.match(/```json\n?(.*?)\n?```/s) || aiText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      // Fallback parsing if no proper JSON
      return {
        reasoning: 'AI recommendation parsing failed',
        tracks: [],
      };
    } catch (error) {
      console.error('Failed to parse recommendation response:', error);
      return {
        reasoning: 'Failed to parse AI response',
        tracks: [],
      };
    }
  }

  private parseAnalysisResponse(
    aiText: string,
    originalRequest: MusicAnalysisRequest,
  ): MusicAnalysisResponse {
    try {
      const jsonMatch =
        aiText.match(/```json\n?(.*?)\n?```/s) || aiText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          mood: parsed.mood || 'peaceful',
          energy_level: parsed.energy_level || 5,
          wedding_appropriateness: parsed.wedding_appropriateness || 'good',
          ceremony_suitable: parsed.ceremony_suitable || false,
          reception_suitable: parsed.reception_suitable || false,
          cocktail_suitable: parsed.cocktail_suitable || false,
          dinner_suitable: parsed.dinner_suitable || false,
          cultural_considerations: parsed.cultural_considerations || [],
          religious_appropriateness: parsed.religious_appropriateness || [],
          recommended_moments: parsed.recommended_moments || [],
          emotion_tags: parsed.emotion_tags || [],
          confidence: parsed.confidence || 0.5,
        };
      }

      // Fallback analysis based on available data
      return this.generateFallbackAnalysis(originalRequest);
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return this.generateFallbackAnalysis(originalRequest);
    }
  }

  private async calculateConfidenceScores(
    aiTracks: any[],
    preferences: UserMusicPreferences,
    existingTracks: MusicTrack[],
  ): Promise<RecommendedTrack[]> {
    const recommendedTracks: RecommendedTrack[] = [];

    for (const aiTrack of aiTracks) {
      // Try to find matching track in database
      const matchingTrack = existingTracks.find(
        (track) =>
          track.title.toLowerCase().includes(aiTrack.title.toLowerCase()) &&
          track.artist.toLowerCase().includes(aiTrack.artist.toLowerCase()),
      );

      if (matchingTrack) {
        // Calculate preference-based confidence
        const confidenceScore = this.calculatePreferenceMatch(
          matchingTrack,
          preferences,
        );

        recommendedTracks.push({
          track_id: matchingTrack.id,
          confidence_score: Math.min(aiTrack.confidence * confidenceScore, 1.0),
          reason: aiTrack.reasoning,
          suggested_position: aiTrack.suggested_position,
          alternative_tracks: [],
        });
      }
    }

    return recommendedTracks.sort(
      (a, b) => b.confidence_score - a.confidence_score,
    );
  }

  private calculatePreferenceMatch(
    track: MusicTrack,
    preferences: UserMusicPreferences,
  ): number {
    let score = 0.5; // Base score

    // Genre preference matching
    if (preferences.favorite_genres?.includes(track.primary_genre)) {
      score += 0.3;
    }
    if (preferences.disliked_genres?.includes(track.primary_genre)) {
      score -= 0.4;
    }

    // Mood matching
    const relevantMoods = Object.values(
      preferences.preferred_moods || {},
    ).flat();
    if (relevantMoods.includes(track.mood)) {
      score += 0.2;
    }

    // Explicit content check
    if (track.explicit_content && !preferences.explicit_content_allowed) {
      score -= 0.5;
    }

    // Cultural requirements
    if (
      preferences.cultural_requirements?.length > 0 &&
      track.cultural_tags?.length > 0
    ) {
      const culturalMatch = preferences.cultural_requirements.some((req) =>
        track.cultural_tags?.includes(req),
      );
      if (culturalMatch) score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateOverallConfidence(tracks: RecommendedTrack[]): number {
    if (tracks.length === 0) return 0;

    const avgConfidence =
      tracks.reduce((sum, track) => sum + track.confidence_score, 0) /
      tracks.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private calculateLearningConfidence(interactions: any[]): number {
    if (interactions.length < 10) return 0.1;
    if (interactions.length < 50) return 0.3;
    if (interactions.length < 100) return 0.5;
    if (interactions.length < 200) return 0.7;
    return 0.9;
  }

  private generateFallbackAnalysis(
    request: MusicAnalysisRequest,
  ): MusicAnalysisResponse {
    // Basic analysis based on available data
    let energy = 5;
    let mood: MusicMood = 'peaceful';

    if (request.audioFeatures) {
      energy = Math.round(request.audioFeatures.energy * 10);

      if (request.audioFeatures.valence > 0.7) {
        mood = request.audioFeatures.energy > 0.6 ? 'celebratory' : 'upbeat';
      } else if (request.audioFeatures.valence < 0.3) {
        mood = 'emotional';
      } else {
        mood = request.audioFeatures.energy > 0.6 ? 'energetic' : 'romantic';
      }
    }

    return {
      mood,
      energy_level: energy,
      wedding_appropriateness: 'good',
      ceremony_suitable: energy <= 4,
      reception_suitable: energy >= 5,
      cocktail_suitable: energy >= 3 && energy <= 7,
      dinner_suitable: energy <= 6,
      cultural_considerations: ['western'],
      religious_appropriateness: [
        { religion: 'general', appropriateness: 'good' },
      ],
      recommended_moments: energy <= 4 ? ['ceremony'] : ['reception'],
      emotion_tags: ['wedding_appropriate'],
      confidence: 0.4,
    };
  }

  private findSimilarTracks(
    aiText: string,
    tracks: MusicTrack[],
  ): MusicTrack[] {
    // Simple similarity matching - could be enhanced with vector embeddings
    const keywords = aiText.toLowerCase().split(/\W+/);

    return tracks
      .map((track) => ({
        track,
        similarity: this.calculateTextSimilarity(
          `${track.title} ${track.artist} ${track.mood}`.toLowerCase(),
          keywords,
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map((item) => item.track);
  }

  private calculateTextSimilarity(text: string, keywords: string[]): number {
    const textWords = text.split(/\W+/);
    const matches = keywords.filter((keyword) =>
      textWords.some(
        (word) => word.includes(keyword) || keyword.includes(word),
      ),
    );
    return matches.length / keywords.length;
  }

  private getDefaultPreferences(clientId: string): UserMusicPreferences {
    return {
      id: '',
      user_id: '',
      organization_id: '',
      client_id: clientId,
      favorite_genres: ['pop', 'rock', 'romantic'],
      disliked_genres: [],
      favorite_artists: [],
      banned_artists: [],
      preferred_moods: {
        ceremony: ['romantic', 'peaceful', 'spiritual'],
        cocktails: ['upbeat', 'elegant', 'fun'],
        dinner: ['romantic', 'peaceful', 'elegant'],
        dancing: ['energetic', 'celebratory', 'fun'],
      },
      cultural_requirements: [],
      religious_restrictions: [],
      language_preferences: ['en'],
      energy_progression: 'gradual_buildup',
      vocal_preference: 'mixed',
      explicit_content_allowed: false,
      guest_age_groups: ['millennials', 'gen_x'],
      cater_to_older_guests: true,
      listening_history: [],
      feedback_history: [],
      last_updated_at: new Date().toISOString(),
      learning_confidence: 0.0,
    };
  }
}

// Export singleton instance
export const musicAIService = new MusicAIService();
