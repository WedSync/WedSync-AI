/**
 * Tests for Spotify Music Provider Service
 */

import { SpotifyMusicProvider } from '../../../src/lib/music/spotify-provider';
import type { MusicSearchFilters } from '../../../src/lib/types/music';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

describe('SpotifyMusicProvider', () => {
  let spotifyProvider: SpotifyMusicProvider;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      SPOTIFY_CLIENT_ID: 'test_client_id',
      SPOTIFY_CLIENT_SECRET: 'test_client_secret'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    spotifyProvider = new SpotifyMusicProvider();
  });

  describe('Constructor', () => {
    it('should initialize with valid credentials', () => {
      expect(() => new SpotifyMusicProvider()).not.toThrow();
    });

    it('should throw error without required environment variables', () => {
      const originalClientId = process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_ID;

      expect(() => new SpotifyMusicProvider()).toThrow(
        'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables are required'
      );

      process.env.SPOTIFY_CLIENT_ID = originalClientId;
    });
  });

  describe('Token Management', () => {
    it('should get access token successfully', async () => {
      // Mock token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });

      // Mock search request to trigger token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: {
            items: [],
            total: 0,
            limit: 20,
            offset: 0
          }
        })
      });

      // Mock audio features request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_features: []
        })
      });

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      await spotifyProvider.searchTracks(filters);

      // Verify token request
      expect(mockFetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': expect.stringContaining('Basic')
          }),
          body: 'grant_type=client_credentials'
        })
      );
    });

    it('should reuse cached token when valid', async () => {
      // Mock initial token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });

      // Mock two search requests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: { items: [], total: 0 } })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_features: [] })
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: { items: [], total: 0 } })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_features: [] })
      });

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      // First request
      await spotifyProvider.searchTracks(filters);
      
      // Second request
      await spotifyProvider.searchTracks(filters);

      // Should only make one token request
      const tokenRequests = mockFetch.mock.calls.filter(call => 
        call[0] === 'https://accounts.spotify.com/api/token'
      );
      expect(tokenRequests).toHaveLength(1);
    });
  });

  describe('searchTracks', () => {
    beforeEach(() => {
      // Mock token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    });

    it('should search tracks with basic query', async () => {
      // Mock search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: {
            items: [
              {
                id: 'track1',
                name: 'Perfect',
                artists: [{ name: 'Ed Sheeran', id: 'artist1' }],
                album: {
                  name: 'Divide',
                  release_date: '2017-03-03',
                  images: []
                },
                duration_ms: 263000,
                explicit: false,
                preview_url: 'https://preview.url',
                external_urls: { spotify: 'https://spotify.url' },
                popularity: 85
              }
            ],
            total: 1,
            limit: 20,
            offset: 0
          }
        })
      });

      // Mock audio features response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_features: [
            {
              id: 'track1',
              energy: 0.6,
              danceability: 0.7,
              valence: 0.8,
              tempo: 95.5,
              key: 4,
              mode: 1
            }
          ]
        })
      });

      const filters: MusicSearchFilters = {
        query: 'Perfect',
        providers: ['spotify']
      };

      const result = await spotifyProvider.searchTracks(filters, 20, 0);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]).toMatchObject({
        id: 'spotify-track1',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        album: 'Divide',
        duration: 263,
        year: 2017,
        isExplicit: false,
        bpm: 96,
        energy: 0.6,
        danceability: 0.7,
        valence: 0.8
      });
    });

    it('should build complex search queries', async () => {
      // Mock search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: { items: [], total: 0, limit: 20, offset: 0 }
        })
      });

      // Mock audio features response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_features: [] })
      });

      const filters: MusicSearchFilters = {
        query: 'love songs',
        artist: 'Ed Sheeran',
        genre: 'pop',
        yearMin: 2010,
        yearMax: 2020,
        providers: ['spotify']
      };

      await spotifyProvider.searchTracks(filters, 20, 0);

      const searchCall = mockFetch.mock.calls.find(call => 
        call[0].toString().includes('/search')
      );
      
      expect(searchCall).toBeDefined();
      const url = new URL(searchCall![0] as string);
      const query = url.searchParams.get('q');
      
      expect(query).toContain('love songs');
      expect(query).toContain('artist:"Ed Sheeran"');
      expect(query).toContain('genre:"pop"');
      expect(query).toContain('year:2010-2020');
    });

    it('should apply client-side filters', async () => {
      // Mock search response with multiple tracks
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: {
            items: [
              {
                id: 'track1',
                name: 'Track 1',
                artists: [{ name: 'Artist 1' }],
                album: { name: 'Album 1', release_date: '2020-01-01' },
                duration_ms: 180000, // 3 minutes
                explicit: false,
                preview_url: null,
                external_urls: { spotify: 'url' },
                popularity: 50
              },
              {
                id: 'track2',
                name: 'Track 2',
                artists: [{ name: 'Artist 2' }],
                album: { name: 'Album 2', release_date: '2020-01-01' },
                duration_ms: 300000, // 5 minutes
                explicit: true,
                preview_url: null,
                external_urls: { spotify: 'url' },
                popularity: 60
              }
            ],
            total: 2,
            limit: 20,
            offset: 0
          }
        })
      });

      // Mock audio features
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_features: [
            { id: 'track1', energy: 0.3, danceability: 0.4, valence: 0.6, tempo: 80, key: 0, mode: 1 },
            { id: 'track2', energy: 0.8, danceability: 0.9, valence: 0.7, tempo: 120, key: 5, mode: 0 }
          ]
        })
      });

      const filters: MusicSearchFilters = {
        query: 'test',
        durationMin: 240, // 4 minutes minimum
        energyMax: 0.5,   // Low energy only
        isExplicit: false, // No explicit content
        providers: ['spotify']
      };

      const result = await spotifyProvider.searchTracks(filters, 20, 0);

      // Should filter out track2 (too energetic, explicit, too short)
      // Should keep track1 if it meets all criteria
      expect(result.tracks.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should track request count', async () => {
      // Mock token and search responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: { items: [], total: 0 }, audio_features: [] })
      });

      const initialStatus = spotifyProvider.getRateLimitStatus();
      const initialRemaining = initialStatus.remaining;

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      await spotifyProvider.searchTracks(filters);

      const newStatus = spotifyProvider.getRateLimitStatus();
      expect(newStatus.remaining).toBeLessThan(initialRemaining);
    });

    it('should handle rate limit responses', async () => {
      // Mock token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 })
      });

      // Mock rate limited search response
      mockFetch.mockResolvedValueOnce({
        status: 429,
        ok: false,
        headers: new Map([['Retry-After', '60']])
      });

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      await expect(spotifyProvider.searchTracks(filters))
        .rejects.toThrow(/rate limit/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failures', async () => {
      // Mock failed token request
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      await expect(spotifyProvider.searchTracks(filters))
        .rejects.toThrow(/authenticate/i);
    });

    it('should handle API errors gracefully', async () => {
      // Mock token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 })
      });

      // Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      await expect(spotifyProvider.searchTracks(filters))
        .rejects.toThrow(/Spotify API request failed/i);
    });

    it('should handle network failures', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const filters: MusicSearchFilters = {
        query: 'test',
        providers: ['spotify']
      };

      await expect(spotifyProvider.searchTracks(filters))
        .rejects.toThrow(/Spotify API request failed/i);
    });
  });

  describe('getTrackDetails', () => {
    it('should get detailed track information', async () => {
      // Mock token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 })
      });

      // Mock track details response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'track1',
          name: 'Perfect',
          artists: [{ name: 'Ed Sheeran' }],
          album: { name: 'Divide', release_date: '2017-03-03' },
          duration_ms: 263000,
          explicit: false,
          preview_url: 'preview.url',
          external_urls: { spotify: 'spotify.url' },
          popularity: 85
        })
      });

      // Mock audio features response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_features: [{
            id: 'track1',
            energy: 0.6,
            danceability: 0.7,
            valence: 0.8,
            tempo: 95,
            key: 4,
            mode: 1
          }]
        })
      });

      const track = await spotifyProvider.getTrackDetails('track1');

      expect(track).toMatchObject({
        id: 'spotify-track1',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        album: 'Divide',
        year: 2017
      });
    });

    it('should return null for non-existent tracks', async () => {
      // Mock token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 })
      });

      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const track = await spotifyProvider.getTrackDetails('nonexistent');
      expect(track).toBeNull();
    });
  });

  describe('Key Conversion', () => {
    it('should convert Spotify key notation correctly', async () => {
      // Mock responses for search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: {
            items: [{ 
              id: 'track1', 
              name: 'Test', 
              artists: [{ name: 'Test' }],
              album: { name: 'Test', release_date: '2020-01-01' },
              duration_ms: 200000,
              explicit: false,
              preview_url: null,
              external_urls: { spotify: 'url' },
              popularity: 50
            }],
            total: 1
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_features: [{
            id: 'track1',
            key: 0,     // C
            mode: 1,    // Major
            energy: 0.5,
            danceability: 0.5,
            valence: 0.5,
            tempo: 100
          }]
        })
      });

      const result = await spotifyProvider.searchTracks({
        query: 'test',
        providers: ['spotify']
      });

      expect(result.tracks[0].key).toBe('C major');
    });
  });
});