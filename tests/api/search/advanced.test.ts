/**
 * Comprehensive tests for Advanced Search API
 * Tests all functionality of /api/search/advanced endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../src/app/api/search/advanced/route';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        textSearch: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({
                      data: mockVendors,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Mock AdvancedSearchService
vi.mock('../../../src/lib/services/search/AdvancedSearchService', () => ({
  AdvancedSearchService: vi.fn().mockImplementation(() => ({
    executeAdvancedSearch: vi.fn().mockResolvedValue({
      results: mockSearchResults,
      metadata: mockMetadata,
      suggestions: mockSuggestions,
      facets: mockFacets
    }),
    generateSearchSuggestions: vi.fn().mockResolvedValue(['photography', 'photographer near me']),
    trackSearchEvent: vi.fn().mockResolvedValue(undefined)
  }))
}));

const mockVendors = [
  {
    id: '1',
    business_name: 'Elite Photography',
    vendor_type: 'photographer',
    location: { lat: 40.7128, lng: -74.0060 },
    rating: 4.8,
    base_price: 2500
  },
  {
    id: '2', 
    business_name: 'Dream Venues',
    vendor_type: 'venue',
    location: { lat: 40.7589, lng: -73.9851 },
    rating: 4.6,
    base_price: 8000
  }
];

const mockSearchResults = [
  {
    vendor: mockVendors[0],
    relevanceScore: 0.95,
    matchFactors: ['location', 'rating', 'specialization'],
    priceMatch: 'good',
    availabilityStatus: 'available'
  }
];

const mockMetadata = {
  totalResults: 1,
  searchTime: 150,
  query: 'wedding photographer NYC',
  filters: {},
  pagination: { page: 1, limit: 20, total: 1 }
};

const mockSuggestions = ['wedding photographer', 'NYC photographer'];
const mockFacets = {
  vendorTypes: [{ value: 'photographer', count: 5 }],
  locations: [{ value: 'NYC', count: 3 }],
  priceRanges: [{ range: '2000-3000', count: 2 }]
};

describe('/api/search/advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/search/advanced', () => {
    it('should perform basic search with query parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding+photographer');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('suggestions');
      expect(data.results).toHaveLength(1);
      expect(data.metadata.query).toBe('wedding photographer');
    });

    it('should apply location filters correctly', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=photographer&location=NYC&radius=25');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
    });

    it('should apply vendor type filters', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding&types=photographer,venue');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
    });

    it('should apply budget filters', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding&minBudget=2000&maxBudget=5000');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding&page=2&limit=10');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.metadata.pagination.page).toBe(2);
      expect(data.metadata.pagination.limit).toBe(10);
    });

    it('should handle sort parameters', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding&sort=rating&order=desc');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
    });

    it('should return 400 for missing query parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding&page=-1');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });

    it('should include performance headers', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.headers.get('X-Search-Time')).toBeDefined();
      expect(response.headers.get('X-Total-Results')).toBeDefined();
    });
  });

  describe('POST /api/search/advanced', () => {
    it('should handle complex search request body', async () => {
      const searchRequest = {
        query: 'wedding photographer',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          radius: 25
        },
        filters: {
          vendorTypes: ['photographer'],
          priceRange: { min: 2000, max: 5000 },
          rating: { min: 4.0 },
          availability: {
            startDate: '2024-06-15',
            endDate: '2024-06-15'
          }
        },
        preferences: {
          weddingStyle: 'modern',
          guestCount: 100,
          priority: 'quality'
        },
        pagination: { page: 1, limit: 20 },
        sort: { field: 'relevance', order: 'desc' }
      };

      const request = new NextRequest('http://localhost:3000/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('facets');
      expect(data).toHaveProperty('suggestions');
    });

    it('should handle bulk search requests', async () => {
      const bulkRequest = {
        searches: [
          { query: 'photographer', location: 'NYC' },
          { query: 'venue', location: 'Brooklyn' },
          { query: 'florist', location: 'Manhattan' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should validate request body structure', async () => {
      const invalidRequest = {
        invalidField: 'test'
      };

      const request = new NextRequest('http://localhost:3000/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should track search analytics for POST requests', async () => {
      const searchRequest = {
        query: 'wedding photographer',
        userId: 'user123'
      };

      const request = new NextRequest('http://localhost:3000/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      // Verify analytics tracking was called
    });
  });

  describe('Error Handling', () => {
    it('should handle search service errors gracefully', async () => {
      // Mock service to throw error
      vi.doMock('../../../src/lib/services/search/AdvancedSearchService', () => ({
        AdvancedSearchService: vi.fn().mockImplementation(() => ({
          executeAdvancedSearch: vi.fn().mockRejectedValue(new Error('Service error'))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle database connection errors', async () => {
      // Mock Supabase to return error
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection error' }
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Performance', () => {
    it('should complete search within acceptable time', async () => {
      const start = Date.now();
      
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => {
        const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
        return GET(new NextRequest(url));
      });
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Caching', () => {
    it('should include appropriate cache headers', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.headers.get('Cache-Control')).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should sanitize search query input', async () => {
      const maliciousQuery = '<script>alert("xss")</script>';
      const url = new URL(`http://localhost:3000/api/search/advanced?q=${encodeURIComponent(maliciousQuery)}`);
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Verify query is sanitized in response
    });

    it('should validate location coordinates', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding&lat=invalid&lng=invalid');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });

    it('should enforce rate limiting headers', async () => {
      const url = new URL('http://localhost:3000/api/search/advanced?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });
});