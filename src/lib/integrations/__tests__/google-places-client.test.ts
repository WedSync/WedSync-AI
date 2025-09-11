import { GooglePlacesClient } from '../google-places-client';
import { jest, describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  GooglePlacesSearchRequest,
  GooglePlaceDetailsRequest,
  GoogleNearbySearchRequest,
  GoogleAutocompleteRequest,
} from '@/types/google-places';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock console methods
const consoleMock = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
};

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    GOOGLE_PLACES_API_KEY: 'test-api-key-123',
  };

  // Clear all mocks
  vi.clearAllMocks();
  mockFetch.mockClear();
});

afterEach(() => {
  process.env = originalEnv;
  vi.resetAllMocks();
});

describe('GooglePlacesClient', () => {
  let client: GooglePlacesClient;

  beforeEach(() => {
    client = new GooglePlacesClient();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(client).toBeInstanceOf(GooglePlacesClient);
      expect(client['apiKey']).toBe('test-api-key-123');
      expect(client['baseUrl']).toBe(
        'https://maps.googleapis.com/maps/api/place',
      );
      expect(client['rateLimit']).toEqual({
        requests: 0,
        windowStart: expect.any(Number),
        maxRequests: 100,
        windowMs: 60000,
      });
    });

    it('should throw error if API key is missing', () => {
      delete process.env.GOOGLE_PLACES_API_KEY;
      expect(() => new GooglePlacesClient()).toThrow(
        'Google Places API key is required',
      );
    });

    it('should initialize cache system correctly', () => {
      expect(client['cache']).toEqual(new Map());
      expect(client['cacheStats']).toEqual({
        hits: 0,
        misses: 0,
        evictions: 0,
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            status: 'OK',
          }),
        headers: new Map([
          ['x-goog-fieldmask', 'places.id,places.displayName'],
        ]),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should reject requests exceeding rate limit', async () => {
      // Set client to exceed rate limit
      client['rateLimit'].requests = 100;
      client['rateLimit'].windowStart = Date.now();

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reset rate limit after window expires', async () => {
      // Set rate limit to expired window
      client['rateLimit'].requests = 100;
      client['rateLimit'].windowStart = Date.now() - 70000; // 70 seconds ago

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(true);
      expect(client['rateLimit'].requests).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    it('should cache successful responses', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ place_id: 'test-place-1', name: 'Test Venue' }],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // First request
      await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      // Second identical request
      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should only call API once
      expect(client['cacheStats'].hits).toBe(1);
      expect(client['cacheStats'].misses).toBe(1);
    });

    it('should respect cache TTL', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ place_id: 'test-place-1', name: 'Test Venue' }],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Mock expired cache entry
      const cacheKey = client['generateCacheKey']('textsearch', {
        query: 'wedding venue',
      });
      client['cache'].set(cacheKey, {
        data: { results: [], status: 'OK' },
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days old
        hits: 1,
      });

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should call API for fresh data
    });

    it('should evict least recently used cache entries when cache is full', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ place_id: 'test-place-1', name: 'Test Venue' }],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Fill cache to capacity
      const maxCacheSize = 1000;
      for (let i = 0; i < maxCacheSize + 1; i++) {
        await client.searchPlaces({
          query: `wedding venue ${i}`,
          type: 'text_search',
        });
      }

      expect(client['cacheStats'].evictions).toBeGreaterThan(0);
      expect(client['cache'].size).toBeLessThanOrEqual(maxCacheSize);
    });
  });

  describe('Search Places', () => {
    it('should perform text search successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                place_id: 'test-place-1',
                name: 'Beautiful Wedding Venue',
                rating: 4.8,
                types: ['wedding_venue', 'event_planning'],
                geometry: {
                  location: { lat: 40.7128, lng: -74.006 },
                },
              },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue New York',
        type: 'text_search',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
      expect(result.data?.results[0]).toMatchObject({
        place_id: 'test-place-1',
        name: 'Beautiful Wedding Venue',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('textsearch/json'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
            'User-Agent': 'WedSync-GooglePlaces/1.0',
          }),
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error_message: 'Invalid request parameters',
            status: 'INVALID_REQUEST',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: '',
        type: 'text_search',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API request failed');
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Google Places API error:',
        expect.any(Object),
      );
    });

    it('should handle network failures with retry logic', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [{ place_id: 'test-place-1', name: 'Test Venue' }],
              status: 'OK',
            }),
          headers: new Map(),
        } as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should apply wedding-specific enhancements', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                place_id: 'test-place-1',
                name: 'Wedding Paradise',
                rating: 4.5,
                types: ['wedding_venue'],
                reviews: [
                  { text: 'Perfect for our wedding ceremony!' },
                  { text: 'Beautiful venue for weddings' },
                ],
              },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(true);
      expect(result.data?.results[0]).toMatchObject({
        place_id: 'test-place-1',
        weddingScore: expect.any(Number),
        weddingRelevance: expect.any(String),
        weddingFeatures: expect.any(Array),
      });
    });
  });

  describe('Get Place Details', () => {
    it('should fetch comprehensive place details', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              place_id: 'test-place-1',
              name: 'Grand Wedding Hall',
              rating: 4.9,
              formatted_address: '123 Wedding St, New York, NY',
              formatted_phone_number: '+1 (555) 123-4567',
              website: 'https://grandweddinghall.com',
              photos: [
                { photo_reference: 'photo-ref-1', width: 800, height: 600 },
              ],
              opening_hours: {
                weekday_text: [
                  'Monday: 9:00 AM – 10:00 PM',
                  'Tuesday: 9:00 AM – 10:00 PM',
                ],
              },
              reviews: [
                {
                  author_name: 'Happy Bride',
                  rating: 5,
                  text: 'Perfect venue for our wedding!',
                  time: Date.now() / 1000,
                },
              ],
            },
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getPlaceDetails({
        placeId: 'test-place-1',
        fields: ['name', 'rating', 'formatted_address', 'photos', 'reviews'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toMatchObject({
        place_id: 'test-place-1',
        name: 'Grand Wedding Hall',
        rating: 4.9,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('details/json'),
        expect.any(Object),
      );
    });

    it('should add wedding-specific analysis to place details', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              place_id: 'test-place-1',
              name: 'Wedding Venue',
              types: ['wedding_venue', 'event_planning'],
              reviews: [
                { text: 'Amazing wedding ceremony here', rating: 5 },
                { text: 'Perfect for receptions', rating: 5 },
              ],
            },
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getPlaceDetails({
        placeId: 'test-place-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toMatchObject({
        weddingAnalysis: expect.objectContaining({
          overallScore: expect.any(Number),
          ceremonyScore: expect.any(Number),
          receptionScore: expect.any(Number),
          photographyScore: expect.any(Number),
          accessibilityScore: expect.any(Number),
          capacityEstimate: expect.objectContaining({
            ceremony: expect.any(String),
            reception: expect.any(String),
          }),
          recommendedFor: expect.any(Array),
          considerations: expect.any(Array),
        }),
      });
    });
  });

  describe('Autocomplete Search', () => {
    it('should provide autocomplete suggestions', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            predictions: [
              {
                place_id: 'test-prediction-1',
                description: 'Wedding Venue - New York, NY',
                structured_formatting: {
                  main_text: 'Wedding Venue',
                  secondary_text: 'New York, NY',
                },
                types: ['establishment'],
              },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.autocompleteSearch({
        input: 'wedding venue',
        sessionToken: 'test-session-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.predictions).toHaveLength(1);
      expect(result.data?.predictions[0]).toMatchObject({
        place_id: 'test-prediction-1',
        description: 'Wedding Venue - New York, NY',
      });
    });
  });

  describe('Nearby Search', () => {
    it('should find nearby venues', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                place_id: 'nearby-venue-1',
                name: 'Nearby Wedding Venue',
                rating: 4.7,
                geometry: {
                  location: { lat: 40.7129, lng: -74.0061 },
                },
              },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.nearbySearch({
        location: { lat: 40.7128, lng: -74.006 },
        radius: 5000,
        type: 'wedding_venue',
      });

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
      expect(result.data?.results[0]).toMatchObject({
        place_id: 'nearby-venue-1',
        name: 'Nearby Wedding Venue',
      });
    });
  });

  describe('Wedding-Specific Features', () => {
    it('should calculate accurate wedding scores', () => {
      const place = {
        name: 'Perfect Wedding Venue',
        rating: 4.8,
        types: ['wedding_venue', 'event_planning'],
        reviews: [
          { text: 'Beautiful wedding ceremony', rating: 5 },
          { text: 'Perfect for receptions', rating: 5 },
          { text: 'Amazing photography opportunities', rating: 5 },
        ],
      };

      const score = client['calculateWeddingScore'](place as any);
      expect(score).toBeGreaterThan(8); // Should be high score for perfect venue
    });

    it('should identify wedding features correctly', () => {
      const place = {
        name: 'Bridal Suite Hotel',
        types: ['lodging', 'spa'],
        reviews: [
          { text: 'Great bridal suite for getting ready' },
          { text: 'Beautiful gardens for photos' },
        ],
      };

      const features = client['identifyWeddingFeatures'](place as any);
      expect(features).toContain('Bridal Suite');
      expect(features).toContain('Photography Opportunities');
    });

    it('should provide relevant venue recommendations', () => {
      const place = {
        name: 'Outdoor Garden Venue',
        types: ['park', 'tourist_attraction'],
        rating: 4.5,
        reviews: [{ text: 'Perfect for outdoor ceremonies' }],
      };

      const recommendations = client['getVenueRecommendations'](place as any);
      expect(recommendations).toContain('Outdoor ceremonies');
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle quota exceeded errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error_message: 'Quota exceeded',
            status: 'OVER_QUERY_LIMIT',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('quota exceeded');
      expect(consoleMock.warn).toHaveBeenCalledWith(
        'Google Places API quota exceeded. Consider upgrading your plan.',
      );
    });

    it('should handle invalid API key errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error_message: 'Invalid API key',
            status: 'REQUEST_DENIED',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should handle malformed responses gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(null),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response format');
    });

    it('should validate request parameters', async () => {
      const result = await client.searchPlaces({
        query: '', // Empty query
        type: 'text_search',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query parameter is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should batch requests when possible', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Multiple simultaneous requests
      const promises = [
        client.searchPlaces({ query: 'wedding venue 1', type: 'text_search' }),
        client.searchPlaces({ query: 'wedding venue 2', type: 'text_search' }),
        client.searchPlaces({ query: 'wedding venue 3', type: 'text_search' }),
      ];

      await Promise.all(promises);

      // Should make individual requests (no batching for different queries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent requests without rate limit conflicts', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Create many concurrent requests
      const promises = Array(50)
        .fill(null)
        .map((_, i) =>
          client.searchPlaces({
            query: `wedding venue ${i}`,
            type: 'text_search',
          }),
        );

      const results = await Promise.all(promises);

      // Should handle rate limiting properly
      const successCount = results.filter((r) => r.success).length;
      const rateLimitedCount = results.filter(
        (r) => !r.success && r.error?.includes('Rate limit'),
      ).length;

      expect(successCount + rateLimitedCount).toBe(50);
      expect(successCount).toBeLessThanOrEqual(100); // Within rate limit
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    it('should track cache statistics correctly', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ place_id: 'test-place-1' }],
            status: 'OK',
          }),
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // First request (miss)
      await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(client['cacheStats'].misses).toBe(1);
      expect(client['cacheStats'].hits).toBe(0);

      // Second identical request (hit)
      await client.searchPlaces({
        query: 'wedding venue',
        type: 'text_search',
      });

      expect(client['cacheStats'].misses).toBe(1);
      expect(client['cacheStats'].hits).toBe(1);
    });

    it('should provide cache statistics via public method', () => {
      const stats = client.getCacheStats();
      expect(stats).toEqual({
        hits: expect.any(Number),
        misses: expect.any(Number),
        evictions: expect.any(Number),
        hitRate: expect.any(Number),
        size: expect.any(Number),
        maxSize: expect.any(Number),
      });
    });
  });
});
