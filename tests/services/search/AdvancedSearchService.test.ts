/**
 * Comprehensive tests for AdvancedSearchService
 * Tests all functionality of the advanced search backend service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdvancedSearchService } from '../../../src/lib/services/search/AdvancedSearchService';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('../../../src/lib/services/search/RelevanceScoring', () => ({
  RelevanceScoring: vi.fn().mockImplementation(() => ({
    calculateScore: vi.fn().mockReturnValue(0.85),
    calculateBulkScores: vi.fn().mockReturnValue([0.85, 0.72, 0.68]),
    analyzeQuery: vi.fn().mockReturnValue({
      keywords: ['wedding', 'photographer'],
      intent: 'service_search',
      location: 'NYC'
    })
  }))
}));

vi.mock('../../../src/lib/services/search/WeddingVendorScoring', () => ({
  WeddingVendorScoring: vi.fn().mockImplementation(() => ({
    calculateWeddingSpecificScore: vi.fn().mockReturnValue(0.92)
  }))
}));

vi.mock('../../../src/lib/services/search/LocationBasedSearch', () => ({
  LocationBasedSearch: vi.fn().mockImplementation(() => ({
    filterByLocation: vi.fn().mockReturnValue(mockVendors.slice(0, 2)),
    calculateDistanceScores: vi.fn().mockReturnValue([0.9, 0.7])
  }))
}));

const mockSupabaseClient = {
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
      })),
      or: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: mockVendors,
            error: null
          }))
        }))
      }))
    }))
  })),
  rpc: vi.fn(() => Promise.resolve({
    data: mockSearchResults,
    error: null
  }))
};

const mockVendors = [
  {
    id: '1',
    business_name: 'Elite Photography Studios',
    vendor_type: 'photographer',
    description: 'Professional wedding photography services in NYC',
    location: { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY' },
    rating: 4.8,
    review_count: 150,
    base_price: 2500,
    specializations: ['wedding', 'portrait', 'engagement'],
    portfolio_images: ['img1.jpg', 'img2.jpg'],
    availability: { next_available: '2024-06-15' },
    verified: true,
    response_time_hours: 2
  },
  {
    id: '2',
    business_name: 'Dream Wedding Venues',
    vendor_type: 'venue',
    description: 'Elegant wedding venues in Manhattan',
    location: { lat: 40.7589, lng: -73.9851, city: 'New York', state: 'NY' },
    rating: 4.6,
    review_count: 85,
    base_price: 8000,
    specializations: ['reception', 'ceremony', 'outdoor'],
    portfolio_images: ['venue1.jpg', 'venue2.jpg'],
    availability: { next_available: '2024-07-20' },
    verified: true,
    response_time_hours: 6
  },
  {
    id: '3',
    business_name: 'Brooklyn Florists',
    vendor_type: 'florist',
    description: 'Custom floral arrangements for weddings',
    location: { lat: 40.6782, lng: -73.9442, city: 'Brooklyn', state: 'NY' },
    rating: 4.4,
    review_count: 65,
    base_price: 1200,
    specializations: ['bridal bouquet', 'centerpieces', 'ceremony decor'],
    portfolio_images: ['flowers1.jpg'],
    availability: { next_available: '2024-06-01' },
    verified: false,
    response_time_hours: 24
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

describe('AdvancedSearchService', () => {
  let searchService: AdvancedSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    searchService = new AdvancedSearchService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeAdvancedSearch', () => {
    it('should perform basic text search', async () => {
      const searchParams = {
        query: 'wedding photographer'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('metadata');
      expect(result.results).toHaveLength(3);
      expect(result.metadata.totalResults).toBe(3);
      expect(result.metadata.query).toBe('wedding photographer');
    });

    it('should apply location filters correctly', async () => {
      const searchParams = {
        query: 'photographer',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          radius: 10
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata.filters).toHaveProperty('location');
    });

    it('should filter by vendor types', async () => {
      const searchParams = {
        query: 'wedding',
        filters: {
          vendorTypes: ['photographer', 'venue']
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata.filters.vendorTypes).toEqual(['photographer', 'venue']);
    });

    it('should apply price range filters', async () => {
      const searchParams = {
        query: 'wedding',
        filters: {
          priceRange: {
            min: 1000,
            max: 5000
          }
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata.filters.priceRange).toEqual({ min: 1000, max: 5000 });
    });

    it('should apply rating filters', async () => {
      const searchParams = {
        query: 'wedding',
        filters: {
          rating: {
            min: 4.5
          }
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata.filters.rating).toEqual({ min: 4.5 });
    });

    it('should handle availability filtering', async () => {
      const searchParams = {
        query: 'photographer',
        filters: {
          availability: {
            startDate: '2024-06-15',
            endDate: '2024-06-15'
          }
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata.filters.availability).toBeDefined();
    });

    it('should sort results correctly', async () => {
      const searchParams = {
        query: 'wedding',
        sort: {
          field: 'rating',
          order: 'desc'
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata.sort).toEqual({ field: 'rating', order: 'desc' });
      // Results should be sorted by rating descending
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].vendor.rating).toBeGreaterThanOrEqual(
          result.results[i].vendor.rating
        );
      }
    });

    it('should handle pagination', async () => {
      const searchParams = {
        query: 'wedding',
        pagination: {
          page: 2,
          limit: 1
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.metadata.pagination.page).toBe(2);
      expect(result.metadata.pagination.limit).toBe(1);
      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('should apply personalization when user preferences provided', async () => {
      const searchParams = {
        query: 'wedding photographer',
        preferences: {
          weddingStyle: 'modern',
          budgetTier: 'luxury',
          priorities: ['quality', 'creativity']
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toBeDefined();
      expect(result.metadata).toHaveProperty('personalization');
      expect(result.metadata.personalization).toBe(true);
    });

    it('should calculate relevance scores for all results', async () => {
      const searchParams = {
        query: 'wedding photographer'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      result.results.forEach(searchResult => {
        expect(searchResult).toHaveProperty('relevanceScore');
        expect(searchResult.relevanceScore).toBeGreaterThan(0);
        expect(searchResult.relevanceScore).toBeLessThanOrEqual(1);
        expect(searchResult).toHaveProperty('matchFactors');
        expect(Array.isArray(searchResult.matchFactors)).toBe(true);
      });
    });

    it('should include search metadata', async () => {
      const searchParams = {
        query: 'wedding photographer'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.metadata).toHaveProperty('totalResults');
      expect(result.metadata).toHaveProperty('searchTime');
      expect(result.metadata).toHaveProperty('query');
      expect(result.metadata).toHaveProperty('filters');
      expect(result.metadata.searchTime).toBeGreaterThan(0);
    });

    it('should handle empty search results', async () => {
      // Mock empty results
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          textSearch: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }));

      const searchParams = {
        query: 'nonexistent service'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toHaveLength(0);
      expect(result.metadata.totalResults).toBe(0);
      expect(result).toHaveProperty('suggestions');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          textSearch: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      }));

      const searchParams = {
        query: 'wedding photographer'
      };

      await expect(searchService.executeAdvancedSearch(searchParams)).rejects.toThrow();
    });
  });

  describe('generateSearchSuggestions', () => {
    it('should generate query suggestions', async () => {
      const suggestions = await searchService.generateSearchSuggestions('photog');

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('photographer');
    });

    it('should return contextual suggestions', async () => {
      const suggestions = await searchService.generateSearchSuggestions('wedding', {
        location: 'NYC',
        vendorTypes: ['photographer']
      });

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.some(s => s.includes('photographer'))).toBe(true);
    });

    it('should handle empty query', async () => {
      const suggestions = await searchService.generateSearchSuggestions('');

      expect(Array.isArray(suggestions)).toBe(true);
      // Should return popular searches
    });
  });

  describe('trackSearchEvent', () => {
    it('should track search events with metadata', async () => {
      const eventData = {
        query: 'wedding photographer',
        resultsCount: 25,
        responseTime: 150,
        userId: 'user123'
      };

      await searchService.trackSearchEvent(eventData);

      // Verify tracking was called (would normally check analytics service)
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });

    it('should handle anonymous search tracking', async () => {
      const eventData = {
        query: 'wedding venue',
        resultsCount: 10,
        responseTime: 200,
        sessionId: 'session456'
      };

      await searchService.trackSearchEvent(eventData);

      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should complete searches within acceptable time limits', async () => {
      const start = Date.now();

      const searchParams = {
        query: 'wedding photographer'
      };

      await searchService.executeAdvancedSearch(searchParams);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large result sets efficiently', async () => {
      // Mock large result set
      const largeResultSet = Array(1000).fill(null).map((_, i) => ({
        ...mockVendors[0],
        id: `vendor-${i}`,
        business_name: `Business ${i}`
      }));

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          textSearch: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: largeResultSet,
                error: null
              }))
            }))
          }))
        }))
      }));

      const searchParams = {
        query: 'wedding',
        pagination: { page: 1, limit: 50 }
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results.length).toBeLessThanOrEqual(50);
      expect(result.metadata.totalResults).toBeGreaterThan(0);
    });

    it('should cache frequently searched queries', async () => {
      const searchParams = {
        query: 'wedding photographer'
      };

      // First search
      await searchService.executeAdvancedSearch(searchParams);
      
      // Second search (should be faster due to caching)
      const start = Date.now();
      await searchService.executeAdvancedSearch(searchParams);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Cached response should be fast
    });
  });

  describe('Search Quality and Relevance', () => {
    it('should prioritize exact matches in business names', async () => {
      const searchParams = {
        query: 'Elite Photography'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results[0].vendor.business_name).toMatch(/Elite Photography/i);
      expect(result.results[0].relevanceScore).toBeGreaterThan(0.9);
    });

    it('should boost verified vendors in results', async () => {
      const searchParams = {
        query: 'photographer'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      // Verified vendors should generally appear higher in results
      const verifiedResults = result.results.filter(r => r.vendor.verified);
      const unverifiedResults = result.results.filter(r => !r.vendor.verified);

      if (verifiedResults.length > 0 && unverifiedResults.length > 0) {
        expect(verifiedResults[0].relevanceScore).toBeGreaterThan(
          unverifiedResults[unverifiedResults.length - 1].relevanceScore
        );
      }
    });

    it('should consider vendor response time in scoring', async () => {
      const searchParams = {
        query: 'wedding services'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      result.results.forEach(searchResult => {
        if (searchResult.vendor.response_time_hours <= 2) {
          expect(searchResult.matchFactors).toContain('fast_response');
        }
      });
    });

    it('should weight specializations appropriately', async () => {
      const searchParams = {
        query: 'wedding photographer'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      const photographerResults = result.results.filter(
        r => r.vendor.vendor_type === 'photographer'
      );

      photographerResults.forEach(searchResult => {
        if (searchResult.vendor.specializations.includes('wedding')) {
          expect(searchResult.matchFactors).toContain('specialization');
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed search parameters', async () => {
      const invalidParams = {
        query: '',
        filters: {
          priceRange: {
            min: 'invalid',
            max: 'also invalid'
          }
        }
      };

      await expect(searchService.executeAdvancedSearch(invalidParams as any))
        .rejects.toThrow();
    });

    it('should handle location search without coordinates', async () => {
      const searchParams = {
        query: 'photographer',
        location: {
          city: 'New York',
          state: 'NY'
        }
      };

      const result = await searchService.executeAdvancedSearch(searchParams as any);

      expect(result.results).toBeDefined();
    });

    it('should handle concurrent search requests', async () => {
      const searchParams = {
        query: 'wedding services'
      };

      const requests = Array(5).fill(null).map(() => 
        searchService.executeAdvancedSearch(searchParams)
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result.results).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    });

    it('should validate search input limits', async () => {
      const searchParams = {
        query: 'a'.repeat(1000), // Very long query
      };

      await expect(searchService.executeAdvancedSearch(searchParams))
        .rejects.toThrow();
    });

    it('should handle service dependencies failures gracefully', async () => {
      // Mock RelevanceScoring failure
      vi.doMock('../../../src/lib/services/search/RelevanceScoring', () => ({
        RelevanceScoring: vi.fn().mockImplementation(() => ({
          calculateScore: vi.fn().mockRejectedValue(new Error('Scoring service failed')),
          analyzeQuery: vi.fn().mockReturnValue({
            keywords: ['wedding'],
            intent: 'service_search'
          })
        }))
      }));

      const searchService = new AdvancedSearchService();
      const searchParams = {
        query: 'wedding photographer'
      };

      // Should fallback to basic scoring
      const result = await searchService.executeAdvancedSearch(searchParams);
      expect(result.results).toBeDefined();
    });
  });

  describe('Search Analytics Integration', () => {
    it('should collect search performance metrics', async () => {
      const searchParams = {
        query: 'wedding photographer'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.metadata).toHaveProperty('searchTime');
      expect(result.metadata).toHaveProperty('cacheHit');
      expect(result.metadata).toHaveProperty('totalResults');
    });

    it('should track zero-result searches for improvement', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          textSearch: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }));

      const searchParams = {
        query: 'extremely rare service'
      };

      const result = await searchService.executeAdvancedSearch(searchParams);

      expect(result.results).toHaveLength(0);
      expect(result.metadata.zeroResults).toBe(true);
      // Should track for analysis
    });
  });
});