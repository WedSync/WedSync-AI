/**
 * Integration Tests for Complete Music Workflow
 * Tests end-to-end functionality across all music APIs
 */

import { NextRequest } from 'next/server';
import type { MusicSearchFilters, WeddingContext } from '../../src/lib/types/music';

// Import API routes
import { POST as searchPost } from '../../src/app/api/music/search/route';
import { POST as analyzePost } from '../../src/app/api/music/analyze-appropriateness/route';
import { POST as resolvePost } from '../../src/app/api/music/resolve-request/route';
import { POST as generatePost } from '../../src/app/api/music/playlist/generate/route';

// Mock external services
jest.mock('../../src/lib/music/spotify-provider');
jest.mock('../../src/lib/music/apple-music-provider');
jest.mock('../../src/lib/music/wedding-music-ai');

// Mock authentication
jest.mock('../../src/lib/api/auth-middleware', () => ({
  withAuth: (handler: any) => handler,
  MUSIC_PERMISSION_SETS: {
    SEARCH_MUSIC: ['music:search'],
    ANALYZE_MUSIC: ['music:analyze'],
    RESOLVE_REQUEST: ['music:resolve'],
    CREATE_PLAYLIST: ['music:playlist:create']
  }
}));

import { spotifyProvider } from '../../src/lib/music/spotify-provider';
import { appleMusicProvider } from '../../src/lib/music/apple-music-provider';
import { weddingMusicAI } from '../../src/lib/music/wedding-music-ai';

describe('Music Workflow Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    organizationId: 'org-123',
    email: 'test@example.com',
    permissions: ['music:search', 'music:analyze', 'music:resolve', 'music:playlist:create']
  };

  const mockTrack = {
    id: 'spotify-test-track',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    album: 'Divide',
    duration: 263,
    genre: 'Pop',
    year: 2017,
    isExplicit: false,
    energy: 0.6,
    danceability: 0.7,
    valence: 0.9,
    bpm: 95,
    key: 'E major',
    createdAt: '2025-01-14T00:00:00Z',
    updatedAt: '2025-01-14T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (spotifyProvider.searchTracks as jest.Mock).mockResolvedValue({
      tracks: [mockTrack],
      total: 1
    });

    (appleMusicProvider.searchTracks as jest.Mock).mockResolvedValue({
      tracks: [{ ...mockTrack, id: 'apple-test-track' }],
      total: 1
    });

    (weddingMusicAI.analyzeWeddingAppropriateness as jest.Mock).mockResolvedValue({
      score: 0.9,
      categories: ['first_dance', 'ceremony'],
      issues: [],
      reasoning: 'Perfect wedding song with romantic lyrics and appropriate energy level',
      energy_level: 0.6,
      confidence: 0.95,
      alternatives: [],
      cultural_considerations: [],
      age_appropriateness: {
        min_age: 0,
        concerns: []
      }
    });
  });

  describe('Complete Wedding Music Discovery Workflow', () => {
    it('should handle full workflow: search → analyze → playlist generation', async () => {
      // Step 1: Search for music
      const searchRequest = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            query: 'romantic wedding songs',
            providers: ['spotify', 'apple']
          } as MusicSearchFilters,
          limit: 10,
          offset: 0
        })
      });
      (searchRequest as any).user = mockUser;

      const searchResponse = await searchPost(searchRequest);
      expect(searchResponse.status).toBe(200);

      const searchData = await searchResponse.json();
      expect(searchData.success).toBe(true);
      expect(searchData.data.results).toHaveLength(2); // Spotify + Apple Music

      // Step 2: Analyze found tracks for wedding appropriateness
      const trackToAnalyze = searchData.data.results[0].tracks[0];
      
      const analyzeRequest = new NextRequest('http://localhost:3000/api/music/analyze-appropriateness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: trackToAnalyze,
          context: {
            event_type: 'first_dance',
            cultural_considerations: ['Western'],
            family_friendly: true,
            religious_considerations: false
          } as WeddingContext
        })
      });
      (analyzeRequest as any).user = mockUser;

      const analyzeResponse = await analyzePost(analyzeRequest);
      expect(analyzeResponse.status).toBe(200);

      const analyzeData = await analyzeResponse.json();
      expect(analyzeData.success).toBe(true);
      expect(analyzeData.data.score).toBeGreaterThan(0.8);
      expect(analyzeData.data.categories).toContain('first_dance');

      // Step 3: Generate complete playlist
      const playlistRequest = new NextRequest('http://localhost:3000/api/music/playlist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_id: 'wedding-123',
          preferences: {
            genres: ['Pop', 'Rock'],
            energy_flow: 'gradual',
            must_include: [trackToAnalyze.id],
            avoid: [],
            guest_demographics: {
              age_range: '25-65',
              cultural_background: ['Western'],
              musical_preferences: ['Pop', 'Classic Rock']
            }
          },
          timeline: {
            ceremony: { duration_minutes: 30 },
            cocktail: { duration_minutes: 60 },
            dinner: { duration_minutes: 90 },
            dancing: { duration_minutes: 120 }
          }
        })
      });
      (playlistRequest as any).user = mockUser;

      const playlistResponse = await generatePost(playlistRequest);
      expect(playlistResponse.status).toBe(200);

      const playlistData = await playlistResponse.json();
      expect(playlistData.success).toBe(true);
      expect(playlistData.data.sections).toHaveLength(4); // All timeline sections
      expect(playlistData.data.total_duration).toBeGreaterThan(0);

      // Verify the must-include track is in the playlist
      const allTracks = playlistData.data.sections.flatMap((section: any) => 
        section.tracks.map((t: any) => t.track.id)
      );
      expect(allTracks).toContain(trackToAnalyze.id);
    });
  });

  describe('Vague Request Resolution Workflow', () => {
    it('should resolve vague requests and provide analyzed results', async () => {
      // Mock AI interpretation
      (weddingMusicAI.analyzeWeddingAppropriateness as jest.Mock)
        .mockResolvedValueOnce({
          score: 0.85,
          categories: ['first_dance'],
          issues: [],
          reasoning: 'Romantic ballad perfect for first dance',
          energy_level: 0.4,
          confidence: 0.9
        });

      // Step 1: Resolve vague request
      const resolveRequest = new NextRequest('http://localhost:3000/api/music/resolve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: "I want something romantic but not too slow for our first dance. We like Ed Sheeran but want something unique.",
          context: {
            event_type: 'first_dance',
            guest_demographics: {
              age_range: '25-45',
              musical_preferences: ['Pop', 'Indie']
            },
            cultural_considerations: ['Western'],
            family_friendly: true
          } as WeddingContext
        })
      });
      (resolveRequest as any).user = mockUser;

      const resolveResponse = await resolvePost(resolveRequest);
      expect(resolveResponse.status).toBe(200);

      const resolveData = await resolveResponse.json();
      expect(resolveData.success).toBe(true);
      expect(resolveData.data.interpreted_request).toBeDefined();
      expect(resolveData.data.search_suggestions).toBeDefined();
      expect(resolveData.data.recommended_tracks).toHaveLength(2); // Spotify + Apple
      expect(resolveData.data.analysis_summary).toBeDefined();
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should handle provider failures gracefully', async () => {
      // Simulate Spotify failure
      (spotifyProvider.searchTracks as jest.Mock).mockRejectedValue(
        new Error('Spotify API unavailable')
      );

      const searchRequest = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            query: 'wedding songs',
            providers: ['spotify', 'apple']
          } as MusicSearchFilters,
          limit: 10,
          offset: 0
        })
      });
      (searchRequest as any).user = mockUser;

      const response = await searchPost(searchRequest);
      expect(response.status).toBe(200); // Should still succeed with Apple Music

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1); // Only Apple Music results
      expect(data.data.provider_errors).toContain('spotify');
    });

    it('should handle AI analysis failures', async () => {
      // Simulate AI service failure
      (weddingMusicAI.analyzeWeddingAppropriateness as jest.Mock).mockRejectedValue(
        new Error('OpenAI service unavailable')
      );

      const analyzeRequest = new NextRequest('http://localhost:3000/api/music/analyze-appropriateness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: mockTrack,
          context: {
            event_type: 'ceremony'
          } as WeddingContext
        })
      });
      (analyzeRequest as any).user = mockUser;

      const response = await analyzePost(analyzeRequest);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AI_ANALYSIS_FAILED');
    });
  });

  describe('Authentication and Authorization Workflow', () => {
    it('should enforce permissions across all endpoints', async () => {
      const userWithoutPermissions = {
        ...mockUser,
        permissions: [] // No music permissions
      };

      const endpoints = [
        { route: searchPost, path: '/api/music/search', body: { filters: { query: 'test', providers: ['spotify'] } } },
        { route: analyzePost, path: '/api/music/analyze-appropriateness', body: { track: mockTrack, context: {} } },
        { route: resolvePost, path: '/api/music/resolve-request', body: { request: 'test', context: {} } },
        { route: generatePost, path: '/api/music/playlist/generate', body: { wedding_id: 'test', preferences: {}, timeline: {} } }
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(endpoint.body)
        });
        (request as any).user = userWithoutPermissions;

        const response = await endpoint.route(request);
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should handle rate limits across multiple provider calls', async () => {
      // Simulate rate limit from Spotify
      (spotifyProvider.searchTracks as jest.Mock).mockImplementation(() => {
        const error = new Error('Rate limit exceeded');
        (error as any).status = 429;
        throw error;
      });

      const searchRequest = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            query: 'test',
            providers: ['spotify']
          } as MusicSearchFilters,
          limit: 10,
          offset: 0
        })
      });
      (searchRequest as any).user = mockUser;

      const response = await searchPost(searchRequest);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain consistent track data format across all endpoints', async () => {
      const trackFormats: any[] = [];

      // Collect track formats from search
      const searchRequest = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { query: 'test', providers: ['spotify'] } as MusicSearchFilters,
          limit: 1,
          offset: 0
        })
      });
      (searchRequest as any).user = mockUser;

      const searchResponse = await searchPost(searchRequest);
      const searchData = await searchResponse.json();
      if (searchData.success && searchData.data.results[0]?.tracks[0]) {
        trackFormats.push(searchData.data.results[0].tracks[0]);
      }

      // Collect from analysis
      const analyzeRequest = new NextRequest('http://localhost:3000/api/music/analyze-appropriateness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: mockTrack,
          context: { event_type: 'ceremony' } as WeddingContext
        })
      });
      (analyzeRequest as any).user = mockUser;

      await analyzePost(analyzeRequest);
      // Analysis doesn't return tracks, but uses them as input

      // Verify all tracks have consistent required fields
      const requiredFields = ['id', 'title', 'artist', 'duration', 'createdAt', 'updatedAt'];
      
      trackFormats.forEach(track => {
        requiredFields.forEach(field => {
          expect(track).toHaveProperty(field);
          expect(track[field]).toBeDefined();
        });
      });
    });
  });
});