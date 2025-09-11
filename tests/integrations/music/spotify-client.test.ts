import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpotifyClient } from '@/lib/integrations/music/spotify-client';
import { RateLimitError, CircuitBreakerError } from '@/lib/integrations/core/base-http-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('SpotifyClient', () => {
  let client: SpotifyClient;
  const mockConfig = {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    redirectUri: 'http://localhost:3000/callback'
  };

  beforeEach(() => {
    client = new SpotifyClient(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication', () => {
    it('should obtain client credentials token', async () => {
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      });

      const mockSearchResponse = {
        tracks: {
          items: [],
          total: 0,
          limit: 20,
          offset: 0
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      });

      const result = await client.searchTracks('test query');
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: 'grant_type=client_credentials'
        })
      );
    });

    it('should reuse valid access token', async () => {
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      const mockSearchResponse = {
        tracks: {
          items: [],
          total: 0,
          limit: 20,
          offset: 0
        }
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse)
        });

      // First request should get token and make search
      await client.searchTracks('test query 1');
      
      // Second request should reuse token
      await client.searchTracks('test query 2');
      
      // Should only call token endpoint once
      expect(fetch).toHaveBeenCalledTimes(3);
      expect((fetch as any).mock.calls.filter((call: any) => 
        call[0].includes('/api/token')
      )).toHaveLength(1);
    });

    it('should handle token refresh', async () => {
      // Mock expired token scenario - this would be more complex in real implementation
      const mockTokenResponse = {
        access_token: 'new_access_token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      });

      const mockSearchResponse = {
        tracks: {
          items: [],
          total: 0,
          limit: 20,
          offset: 0
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      });

      const result = await client.searchTracks('test query');
      expect(result).toBeDefined();
    });
  });

  describe('Track Search', () => {
    beforeEach(() => {
      // Mock successful token response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    });

    it('should search tracks successfully', async () => {
      const mockTrack = {
        id: 'track123',
        name: 'Test Song',
        artists: [{ id: 'artist123', name: 'Test Artist' }],
        album: {
          id: 'album123',
          name: 'Test Album',
          release_date: '2023-01-01',
          images: [{ url: 'http://example.com/image.jpg', height: 300, width: 300 }]
        },
        duration_ms: 180000,
        popularity: 75,
        preview_url: 'http://example.com/preview.mp3',
        explicit: false,
        external_urls: { spotify: 'http://open.spotify.com/track/track123' }
      };

      const mockResponse = {
        tracks: {
          items: [mockTrack],
          total: 1,
          limit: 20,
          offset: 0
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.searchTracks('test query');
      
      expect(result.tracks.items).toHaveLength(1);
      expect(result.tracks.items[0].name).toBe('Test Song');
      expect(result.tracks.items[0].artists[0].name).toBe('Test Artist');
    });

    it('should handle search with options', async () => {
      const mockResponse = {
        tracks: {
          items: [],
          total: 0,
          limit: 10,
          offset: 20
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.searchTracks('test query', {
        limit: 10,
        offset: 20,
        market: 'US'
      });

      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('limit=10&offset=20&market=US'),
        expect.any(Object)
      );
    });

    it('should handle rate limiting', async () => {
      (fetch as any).mockRejectedValueOnce(
        new RateLimitError('Rate limit exceeded', 60)
      );

      await expect(client.searchTracks('test query')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid query' } })
      });

      await expect(client.searchTracks('test query')).rejects.toThrow();
    });
  });

  describe('Track Details', () => {
    beforeEach(() => {
      // Mock token
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    });

    it('should get track details', async () => {
      const mockTrack = {
        id: 'track123',
        name: 'Test Song',
        artists: [{ id: 'artist123', name: 'Test Artist' }],
        album: {
          id: 'album123',
          name: 'Test Album',
          release_date: '2023-01-01',
          images: []
        },
        duration_ms: 180000,
        popularity: 75,
        preview_url: null,
        explicit: false,
        external_urls: { spotify: 'http://open.spotify.com/track/track123' }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrack)
      });

      const result = await client.getTrack('track123');
      
      expect(result.id).toBe('track123');
      expect(result.name).toBe('Test Song');
    });

    it('should get multiple tracks', async () => {
      const mockTracks = [
        {
          id: 'track1',
          name: 'Song 1',
          artists: [{ id: 'artist1', name: 'Artist 1' }],
          album: {
            id: 'album1',
            name: 'Album 1',
            release_date: '2023-01-01',
            images: []
          },
          duration_ms: 180000,
          popularity: 75,
          preview_url: null,
          explicit: false,
          external_urls: { spotify: 'http://open.spotify.com/track/track1' }
        },
        {
          id: 'track2',
          name: 'Song 2',
          artists: [{ id: 'artist2', name: 'Artist 2' }],
          album: {
            id: 'album2',
            name: 'Album 2',
            release_date: '2023-02-01',
            images: []
          },
          duration_ms: 200000,
          popularity: 80,
          preview_url: null,
          explicit: true,
          external_urls: { spotify: 'http://open.spotify.com/track/track2' }
        }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tracks: mockTracks })
      });

      const result = await client.getMultipleTracks(['track1', 'track2']);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('track1');
      expect(result[1].id).toBe('track2');
    });
  });

  describe('Playlist Management', () => {
    beforeEach(() => {
      // Mock token
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    });

    it('should create playlist', async () => {
      const mockPlaylist = {
        id: 'playlist123',
        name: 'My Wedding Playlist',
        description: 'Songs for our special day',
        images: [],
        tracks: { total: 0 },
        external_urls: { spotify: 'http://open.spotify.com/playlist/playlist123' }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlaylist)
      });

      const result = await client.createPlaylist('user123', 'My Wedding Playlist', {
        description: 'Songs for our special day',
        public: false
      });
      
      expect(result.id).toBe('playlist123');
      expect(result.name).toBe('My Wedding Playlist');
    });

    it('should add tracks to playlist', async () => {
      const mockResponse = { snapshot_id: 'snapshot123' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const trackUris = ['spotify:track:1', 'spotify:track:2'];
      const result = await client.addTracksToPlaylist('playlist123', trackUris);
      
      expect(result.snapshot_id).toBe('snapshot123');
    });

    it('should handle large track lists by chunking', async () => {
      // Create 150 track URIs to test chunking (Spotify max is 100 per request)
      const trackUris = Array.from({ length: 150 }, (_, i) => `spotify:track:${i}`);
      
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ snapshot_id: 'snap1' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ snapshot_id: 'snap2' }) });

      const result = await client.addTracksToPlaylist('playlist123', trackUris);
      
      expect(fetch).toHaveBeenCalledTimes(3); // 1 token + 2 chunks
      expect(result.snapshot_id).toBe('snap2'); // Last snapshot
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      // Mock token request
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });

      // Mock 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        (fetch as any).mockRejectedValueOnce(new Error('Service unavailable'));
      }

      // First few requests should fail normally
      for (let i = 0; i < 5; i++) {
        await expect(client.searchTracks('test')).rejects.toThrow('Service unavailable');
      }

      // Next request should fail with circuit breaker
      await expect(client.searchTracks('test')).rejects.toThrow('Circuit breaker');
    });
  });

  describe('Recommendations', () => {
    beforeEach(() => {
      // Mock token
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock_token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    });

    it('should get recommendations', async () => {
      const mockTracks = [
        {
          id: 'rec1',
          name: 'Recommended Song',
          artists: [{ id: 'artist1', name: 'Artist 1' }],
          album: {
            id: 'album1',
            name: 'Album 1',
            release_date: '2023-01-01',
            images: []
          },
          duration_ms: 180000,
          popularity: 75,
          preview_url: null,
          explicit: false,
          external_urls: { spotify: 'http://open.spotify.com/track/rec1' }
        }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tracks: mockTracks })
      });

      const result = await client.getRecommendations({
        seedTracks: ['track1'],
        targetValence: 0.8,
        targetEnergy: 0.7,
        limit: 10
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Recommended Song');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('AbortError'));

      await expect(client.searchTracks('test')).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      });

      await expect(client.searchTracks('test')).rejects.toThrow();
    });
  });

  describe('Metrics', () => {
    it('should provide client metrics', () => {
      const metrics = client.getMetrics();
      
      expect(metrics).toHaveProperty('auth');
      expect(metrics).toHaveProperty('api');
      expect(metrics.auth).toHaveProperty('circuitBreaker');
      expect(metrics.api).toHaveProperty('circuitBreaker');
    });
  });
});