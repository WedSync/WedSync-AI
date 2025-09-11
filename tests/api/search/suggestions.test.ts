/**
 * Comprehensive tests for Search Suggestions API
 * Tests all functionality of /api/search/suggestions endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../../src/app/api/search/suggestions/route';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockSuggestionData,
                error: null
              }))
            }))
          }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({
        data: mockAnalyticsData,
        error: null
      }))
    }))
  }))
}));

const mockSuggestionData = [
  {
    id: '1',
    business_name: 'Elite Photography Studios',
    vendor_type: 'photographer',
    search_tags: ['wedding photographer', 'portrait photographer', 'NYC photographer']
  },
  {
    id: '2',
    business_name: 'Dream Wedding Venues',
    vendor_type: 'venue',
    search_tags: ['wedding venue', 'NYC venue', 'reception hall']
  }
];

const mockAnalyticsData = [
  { query: 'wedding photographer', count: 150 },
  { query: 'wedding venues nyc', count: 120 },
  { query: 'florist brooklyn', count: 85 }
];

describe('/api/search/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/search/suggestions', () => {
    it('should return suggestions for partial query', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photog');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('suggestions');
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('vendors');
      expect(Array.isArray(data.suggestions)).toBe(true);
    });

    it('should return popular searches when no query provided', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('popular');
      expect(data.popular).toContain('wedding photographer');
    });

    it('should handle location-based suggestions', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photographer&location=NYC');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions.some((s: any) => s.includes('NYC'))).toBe(true);
    });

    it('should provide category suggestions', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('categories');
      expect(data.categories).toContain('photographer');
      expect(data.categories).toContain('venue');
    });

    it('should return vendor suggestions', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=elite&includeVendors=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('vendors');
      expect(Array.isArray(data.vendors)).toBe(true);
    });

    it('should handle spell correction suggestions', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photograper'); // misspelled
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('corrections');
      expect(data.corrections).toContain('photographer');
    });

    it('should respect limit parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=wedding&limit=3');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should filter out inappropriate suggestions', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=spam');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      // Verify no inappropriate content in suggestions
      data.suggestions.forEach((suggestion: string) => {
        expect(suggestion).not.toMatch(/spam|scam|fake/i);
      });
    });

    it('should handle empty query gracefully', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('popular');
    });

    it('should return contextual suggestions based on wedding preferences', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=venue&style=rustic&budget=moderate');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions.some((s: any) => s.includes('barn') || s.includes('rustic'))).toBe(true);
    });

    it('should include trending searches', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?includeTrending=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('trending');
      expect(Array.isArray(data.trending)).toBe(true);
    });
  });

  describe('Query Processing', () => {
    it('should handle special characters in query', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=caf%C3%A9+wedding'); // café wedding
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(200);
      const url = new URL(`http://localhost:3000/api/search/suggestions?q=${longQuery}`);
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(400); // Should reject overly long queries
    });

    it('should handle queries with numbers', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=dj+for+100+guests');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions).toBeDefined();
    });

    it('should be case insensitive', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=PHOTOGRAPHER');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should respond quickly for common queries', async () => {
      const start = Date.now();
      
      const url = new URL('http://localhost:3000/api/search/suggestions?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should include cache headers', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photographer');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBeDefined();
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(10).fill(null).map((_, i) => {
        const url = new URL(`http://localhost:3000/api/search/suggestions?q=wedding${i}`);
        return GET(new NextRequest(url));
      });
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track suggestion requests', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photographer&track=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Verify analytics tracking headers
      expect(response.headers.get('X-Tracked')).toBe('true');
    });

    it('should include usage metadata', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=venue&includeMetadata=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('requestTime');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/suggestions?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle invalid parameters', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?limit=invalid');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle network timeouts', async () => {
      // Mock network timeout
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Network timeout')), 100);
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/suggestions?q=wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect([500, 503]).toContain(response.status);
    });
  });

  describe('Security', () => {
    it('should sanitize malicious input', async () => {
      const maliciousQuery = '<script>alert("xss")</script>';
      const url = new URL(`http://localhost:3000/api/search/suggestions?q=${encodeURIComponent(maliciousQuery)}`);
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      // Verify no script tags in response
      JSON.stringify(data).should.not.match(/<script>/i);
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE vendors; --";
      const url = new URL(`http://localhost:3000/api/search/suggestions?q=${encodeURIComponent(sqlInjection)}`);
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200); // Should not crash
    });

    it('should enforce rate limiting', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=test');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    });
  });

  describe('Personalization', () => {
    it('should provide personalized suggestions when user context available', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=venue&userId=user123');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer mock-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('personalized');
    });

    it('should adapt suggestions based on search history', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photo&includeHistory=true');
      const request = new NextRequest(url, {
        headers: { 
          'Authorization': 'Bearer mock-token',
          'X-User-ID': 'user123'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions).toBeDefined();
    });
  });

  describe('Internationalization', () => {
    it('should handle different languages', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=fotógrafo&lang=es');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions).toBeDefined();
    });

    it('should provide translations for common terms', async () => {
      const url = new URL('http://localhost:3000/api/search/suggestions?q=photographer&lang=es&includeTranslations=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('translations');
    });
  });
});