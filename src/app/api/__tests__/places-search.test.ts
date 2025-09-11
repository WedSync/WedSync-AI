import { GET, POST } from '../places/search/route';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../../lib/services/places-search-service');
vi.mock('../../../lib/middleware/security');
vi.mock('../../../lib/middleware/audit');
vi.mock('@supabase/ssr');

// Mock PlacesSearchService
const mockPlacesSearchService = {
  searchWeddingVenues: vi.fn(),
  getAnalytics: vi.fn().mockReturnValue({
    totalSearches: 100,
    successfulSearches: 95,
    searchSuccessRate: 0.95,
  }),
};

vi.mock('../../../lib/services/places-search-service', () => ({
  PlacesSearchService: vi.fn(() => mockPlacesSearchService),
}));

// Mock security middleware
const mockWithSecureValidation = vi.fn((schema, handler) => handler);
vi.mock('../../../lib/middleware/security', () => ({
  withSecureValidation: mockWithSecureValidation,
  secureStringSchema: vi.fn(),
}));

// Mock audit middleware
const mockLogAuditEvent = vi.fn();
vi.mock('../../../lib/middleware/audit', () => ({
  logAuditEvent: mockLogAuditEvent,
}));

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

// Mock console methods
const consoleMock = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
};

describe('/api/places/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/places/search', () => {
    it('should handle simple venue search successfully', async () => {
      const mockSearchResult = {
        success: true,
        venues: [
          {
            place_id: 'venue-1',
            name: 'Grand Wedding Hall',
            rating: 4.8,
            weddingScore: 9.2,
          },
        ],
        message: 'Found 1 venue',
      };

      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue(
        mockSearchResult,
      );

      const url = new URL(
        'http://localhost:3000/api/places/search?query=wedding+venue+NYC',
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        venues: expect.arrayContaining([
          expect.objectContaining({
            place_id: 'venue-1',
            name: 'Grand Wedding Hall',
          }),
        ]),
        message: 'Found 1 venue',
      });

      expect(mockPlacesSearchService.searchWeddingVenues).toHaveBeenCalledWith({
        query: 'wedding venue NYC',
      });

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'places_search',
        'success',
        expect.objectContaining({
          query: 'wedding venue NYC',
          resultCount: 1,
        }),
      );
    });

    it('should handle search with location parameters', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue({
        success: true,
        venues: [],
        message: 'No venues found',
      });

      const url = new URL('http://localhost:3000/api/places/search');
      url.searchParams.set('query', 'wedding venue');
      url.searchParams.set('lat', '40.7128');
      url.searchParams.set('lng', '-74.0060');
      url.searchParams.set('radius', '5000');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPlacesSearchService.searchWeddingVenues).toHaveBeenCalledWith({
        query: 'wedding venue',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 5000,
      });
    });

    it('should handle search with wedding preferences', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue({
        success: true,
        venues: [],
        message: 'No venues found',
      });

      const url = new URL('http://localhost:3000/api/places/search');
      url.searchParams.set('query', 'outdoor venue');
      url.searchParams.set('ceremonyType', 'outdoor');
      url.searchParams.set('guestCount', '150');
      url.searchParams.set('budget', 'premium');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPlacesSearchService.searchWeddingVenues).toHaveBeenCalledWith({
        query: 'outdoor venue',
        weddingPreferences: {
          ceremonyType: 'outdoor',
          guestCount: 150,
          budget: 'premium',
        },
      });
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const url = new URL(
        'http://localhost:3000/api/places/search?query=wedding+venue',
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      });

      expect(
        mockPlacesSearchService.searchWeddingVenues,
      ).not.toHaveBeenCalled();
    });

    it('should validate required query parameter', async () => {
      const url = new URL('http://localhost:3000/api/places/search'); // No query param
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Query parameter is required',
      });
    });

    it('should handle search service errors', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue({
        success: false,
        error: 'Google Places API quota exceeded',
      });

      const url = new URL(
        'http://localhost:3000/api/places/search?query=wedding+venue',
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Google Places API quota exceeded',
      });

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'places_search',
        'failed',
        expect.objectContaining({
          error: 'Google Places API quota exceeded',
        }),
      );
    });

    it('should apply rate limiting', async () => {
      // Mock rate limit exceeded scenario
      const rateLimitError = new Error('Rate limit exceeded');
      mockPlacesSearchService.searchWeddingVenues.mockRejectedValue(
        rateLimitError,
      );

      const url = new URL(
        'http://localhost:3000/api/places/search?query=wedding+venue',
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('POST /api/places/search', () => {
    it('should handle enhanced search with full preferences', async () => {
      const mockSearchResult = {
        success: true,
        venues: [
          {
            place_id: 'venue-1',
            name: 'Perfect Wedding Venue',
            rating: 4.9,
            weddingScore: 9.5,
            enhancedWeddingAnalysis: {
              suitabilityScore: 9.2,
              capacityMatch: 'Perfect match',
              recommendedUse: ['ceremony', 'reception'],
            },
          },
        ],
        message: 'Found 1 enhanced venue result',
      };

      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue(
        mockSearchResult,
      );

      const requestBody = {
        query: 'luxury wedding venue',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 10000,
        weddingPreferences: {
          ceremonyType: 'indoor',
          receptionType: 'same_venue',
          guestCount: 200,
          budget: 'luxury',
          season: 'spring',
          style: 'elegant',
        },
        filters: {
          minRating: 4.5,
          maxDistance: 15000,
          priceLevel: [3, 4],
          amenities: ['parking', 'catering', 'bridal_suite'],
        },
        sortBy: 'weddingScore',
        sortOrder: 'desc',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        venues: expect.arrayContaining([
          expect.objectContaining({
            place_id: 'venue-1',
            name: 'Perfect Wedding Venue',
            enhancedWeddingAnalysis: expect.any(Object),
          }),
        ]),
        message: 'Found 1 enhanced venue result',
      });

      expect(mockPlacesSearchService.searchWeddingVenues).toHaveBeenCalledWith(
        requestBody,
      );

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'places_enhanced_search',
        'success',
        expect.objectContaining({
          query: 'luxury wedding venue',
          preferences: expect.any(Object),
          resultCount: 1,
        }),
      );
    });

    it('should validate POST request body', async () => {
      const invalidRequestBody = {
        // Missing required query field
        location: { lat: 40.7128, lng: -74.006 },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Query parameter is required',
      });
    });

    it('should handle malformed JSON in POST body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/places/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Invalid request body',
      });
    });

    it('should sanitize input data for security', async () => {
      const maliciousRequestBody = {
        query: '<script>alert("xss")</script>wedding venue',
        weddingPreferences: {
          notes: 'DROP TABLE venues; --',
        },
      };

      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue({
        success: true,
        venues: [],
        message: 'No venues found',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/places/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousRequestBody),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify that the service was called with sanitized input
      const calledWith =
        mockPlacesSearchService.searchWeddingVenues.mock.calls[0][0];
      expect(calledWith.query).not.toContain('<script>');
      expect(calledWith.weddingPreferences?.notes).not.toContain('DROP TABLE');
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should enforce rate limits per user', async () => {
      // Mock multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() => {
          const url = new URL(
            'http://localhost:3000/api/places/search?query=venue',
          );
          return new NextRequest(url);
        });

      // First few should succeed, then rate limited
      mockPlacesSearchService.searchWeddingVenues
        .mockResolvedValueOnce({
          success: true,
          venues: [],
          message: 'Success',
        })
        .mockResolvedValueOnce({
          success: true,
          venues: [],
          message: 'Success',
        })
        .mockResolvedValueOnce({
          success: true,
          venues: [],
          message: 'Success',
        })
        .mockRejectedValue(new Error('Rate limit exceeded'));

      const responses = await Promise.all(requests.map((req) => GET(req)));
      const statusCodes = responses.map((r) => r.status);

      expect(statusCodes).toContain(200); // Some successful
      expect(statusCodes).toContain(429); // Some rate limited
    });

    it('should log suspicious search patterns', async () => {
      const suspiciousRequestBody = {
        query: 'venue',
        weddingPreferences: {
          guestCount: -1000, // Invalid negative number
          budget: 'UNION SELECT * FROM users', // SQL injection attempt
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suspiciousRequestBody),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'places_search_suspicious',
        'blocked',
        expect.objectContaining({
          reason: expect.stringContaining('Invalid'),
        }),
      );
    });
  });

  describe('Performance and Monitoring', () => {
    it('should include performance metrics in response headers', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue({
        success: true,
        venues: [],
        message: 'No venues found',
      });

      const url = new URL(
        'http://localhost:3000/api/places/search?query=venue',
      );
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.headers.get('X-Response-Time')).toMatch(/^\d+ms$/);
      expect(response.headers.get('X-Cache-Status')).toBeDefined();
    });

    it('should handle high concurrency gracefully', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockImplementation(
        async () => {
          // Simulate processing time
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { success: true, venues: [], message: 'Success' };
        },
      );

      const concurrentRequests = Array(50)
        .fill(null)
        .map(() => {
          const url = new URL(
            'http://localhost:3000/api/places/search?query=venue',
          );
          return GET(new NextRequest(url));
        });

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // All requests should eventually succeed or be rate limited
      const statusCodes = responses.map((r) => r.status);
      statusCodes.forEach((code) => {
        expect([200, 429, 500]).toContain(code);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should provide fallback when search service is unavailable', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      const url = new URL(
        'http://localhost:3000/api/places/search?query=venue',
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({
        success: false,
        error:
          'Search service temporarily unavailable. Please try again later.',
        retryAfter: expect.any(Number),
      });
    });

    it('should handle partial search failures gracefully', async () => {
      mockPlacesSearchService.searchWeddingVenues.mockResolvedValue({
        success: true,
        venues: [{ place_id: 'venue-1', name: 'Venue 1' }],
        warnings: ['Some results may be incomplete due to API limitations'],
        message: 'Found 1 venue with warnings',
      });

      const url = new URL(
        'http://localhost:3000/api/places/search?query=venue',
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        venues: expect.any(Array),
        warnings: expect.arrayContaining([
          expect.stringContaining('incomplete'),
        ]),
        message: expect.any(String),
      });
    });
  });
});
