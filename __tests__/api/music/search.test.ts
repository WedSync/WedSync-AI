/**
 * Tests for Music Search API Endpoint
 * POST /api/music/search
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../../src/app/api/music/search/route';
import type { MusicSearchFilters } from '../../../src/lib/types/music';

// Mock external dependencies
vi.mock('../../../src/lib/music/spotify-provider', () => ({
  spotifyProvider: {
    searchTracks: vi.fn(),
    getRateLimitStatus: vi.fn(() => ({ remaining: 50, resetTime: Date.now() + 3600000 }))
  }
}));

vi.mock('../../../src/lib/music/apple-music-provider', () => ({
  appleMusicProvider: {
    searchTracks: vi.fn(),
    getRateLimitStatus: vi.fn(() => ({ remaining: 800, resetTime: Date.now() + 3600000 }))
  }
}));

// Mock authentication
vi.mock('../../../src/lib/api/auth-middleware', () => ({
  withAuth: (handler: any) => handler,
  MUSIC_PERMISSION_SETS: {
    SEARCH_MUSIC: ['music:search']
  }
}));

import { spotifyProvider } from '../../../src/lib/music/spotify-provider';
import { appleMusicProvider } from '../../../src/lib/music/apple-music-provider';

describe('/api/music/search', () => {
  const mockUser = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    email: 'test@example.com',
    permissions: ['music:search']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful responses by default
    (spotifyProvider.searchTracks as any).mockResolvedValue({
      tracks: [
        {
          id: 'spotify-track-1',
          title: 'Perfect',
          artist: 'Ed Sheeran',
          album: 'Divide',
          duration: 263,
          year: 2017,
          isExplicit: false,
          energy: 0.6,
          valence: 0.9,
          bpm: 95
        }
      ],
      total: 1
    });

    (appleMusicProvider.searchTracks as any).mockResolvedValue({
      tracks: [
        {
          id: 'apple-track-1',
          title: 'Thinking Out Loud',
          artist: 'Ed Sheeran',
          album: 'x (Deluxe Edition)',
          duration: 281,
          year: 2014,
          isExplicit: false,
          energy: 0.4,
          valence: 0.8,
          bpm: 79
        }
      ],
      total: 1
    });
  });

  describe('Happy Path Tests', () => {
    it('should search music from Spotify provider', async () => {
      const requestBody = {
        filters: {
          query: 'wedding songs',
          providers: ['spotify']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // Mock authentication context
      (request as any).user = mockUser;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].tracks).toBeDefined();
      expect(spotifyProvider.searchTracks).toHaveBeenCalledWith(
        requestBody.filters,
        20,
        0
      );
    });

    it('should search music from Apple Music provider', async () => {
      const requestBody = {
        filters: {
          query: 'first dance',
          providers: ['apple']
        } as MusicSearchFilters,
        limit: 10,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(appleMusicProvider.searchTracks).toHaveBeenCalledWith(
        requestBody.filters,
        10,
        0
      );
    });

    it('should search from multiple providers', async () => {
      const requestBody = {
        filters: {
          query: 'love songs',
          providers: ['spotify', 'apple']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(2);
      expect(spotifyProvider.searchTracks).toHaveBeenCalled();
      expect(appleMusicProvider.searchTracks).toHaveBeenCalled();
    });
  });

  describe('Validation Tests', () => {
    it('should reject invalid request body', async () => {
      const requestBody = {
        filters: {
          // Missing required query
          providers: ['spotify']
        },
        limit: 'invalid' // Should be number
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject unsupported providers', async () => {
      const requestBody = {
        filters: {
          query: 'test',
          providers: ['invalid-provider']
        } as any,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should enforce limit constraints', async () => {
      const requestBody = {
        filters: {
          query: 'test',
          providers: ['spotify']
        } as MusicSearchFilters,
        limit: 1000, // Exceeds maximum
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle provider service errors gracefully', async () => {
      (spotifyProvider.searchTracks as jest.Mock).mockRejectedValue(
        new Error('Spotify API unavailable')
      );

      const requestBody = {
        filters: {
          query: 'test',
          providers: ['spotify']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MUSIC_SEARCH_FAILED');
    });

    it('should handle rate limiting from providers', async () => {
      (spotifyProvider.getRateLimitStatus as jest.Mock).mockReturnValue({
        remaining: 0,
        resetTime: Date.now() + 3600000
      });

      const requestBody = {
        filters: {
          query: 'test',
          providers: ['spotify']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle partial provider failures', async () => {
      // Spotify succeeds, Apple Music fails
      (appleMusicProvider.searchTracks as jest.Mock).mockRejectedValue(
        new Error('Apple Music API error')
      );

      const requestBody = {
        filters: {
          query: 'test',
          providers: ['spotify', 'apple']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1); // Only Spotify results
      expect(data.data.provider_errors).toContain('apple');
    });
  });

  describe('Performance Tests', () => {
    it('should complete search within reasonable time', async () => {
      const requestBody = {
        filters: {
          query: 'wedding',
          providers: ['spotify', 'apple']
        } as MusicSearchFilters,
        limit: 50,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = mockUser;

      const startTime = Date.now();
      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // 5 second timeout
    });
  });

  describe('Security Tests', () => {
    it('should require authentication', async () => {
      const requestBody = {
        filters: {
          query: 'test',
          providers: ['spotify']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // No user context (not authenticated)

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should enforce music search permissions', async () => {
      const userWithoutPermissions = {
        ...mockUser,
        permissions: ['other:permission'] // Missing music:search
      };

      const requestBody = {
        filters: {
          query: 'test',
          providers: ['spotify']
        } as MusicSearchFilters,
        limit: 20,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      (request as any).user = userWithoutPermissions;

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});