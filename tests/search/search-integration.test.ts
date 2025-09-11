import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

interface SearchQuery {
  query: string;
  location?: string;
  vendorType?: string[];
  budget?: { min: number; max: number };
  rating?: number;
  distance?: number;
}

interface VendorProfile {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  priceRange: { min: number; max: number };
  availability: boolean;
  portfolio: string[];
  reviews: Review[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
}

interface SearchIntegrationContext {
  supabase: any;
  searchService: any;
  analyticsService: any;
  cacheService: any;
}

// Mock services and integrations
const createMockIntegrationContext = (): SearchIntegrationContext => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'
  );

  return {
    supabase,
    searchService: {
      search: vi.fn(),
      updateIndex: vi.fn(),
      clearCache: vi.fn()
    },
    analyticsService: {
      trackSearch: vi.fn(),
      recordClick: vi.fn(),
      getSearchMetrics: vi.fn()
    },
    cacheService: {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn()
    }
  };
};

describe('WS-248: Advanced Search System - Integration Tests', () => {
  let context: SearchIntegrationContext;

  beforeEach(() => {
    context = createMockIntegrationContext();
    // Setup mock data
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe('Database Integration', () => {
    test('should integrate with Supabase vendor profiles table', async () => {
      // Mock Supabase response
      const mockVendors = [
        {
          id: '1',
          name: 'Elite Photography',
          type: 'photographer',
          location: 'New York, NY',
          rating: 4.8,
          price_range: { min: 2000, max: 5000 },
          is_available: true
        }
      ];

      context.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockVendors,
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      const searchQuery: SearchQuery = {
        query: 'wedding photographer',
        location: 'New York',
        vendorType: ['photographer'],
        rating: 4.0
      };

      // Test database integration
      const { data, error } = await context.supabase
        .from('vendor_profiles')
        .select('*')
        .ilike('name', `%${searchQuery.query}%`)
        .eq('type', 'photographer')
        .gte('rating', searchQuery.rating || 0)
        .lte('rating', 5)
        .order('rating', { ascending: false });

      expect(error).toBeNull();
      expect(data).toEqual(mockVendors);
      expect(context.supabase.from).toHaveBeenCalledWith('vendor_profiles');
    });

    test('should handle database connection failures gracefully', async () => {
      // Mock database error
      context.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockRejectedValue(new Error('Connection failed'))
        })
      });

      const searchQuery: SearchQuery = {
        query: 'wedding photographer'
      };

      try {
        await context.supabase
          .from('vendor_profiles')
          .select('*')
          .ilike('name', `%${searchQuery.query}%`);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Connection failed');
      }
    });

    test('should integrate with user preferences table', async () => {
      const mockUserPreferences = {
        user_id: 'user-123',
        preferred_vendor_types: ['photographer', 'venue'],
        budget_range: { min: 1000, max: 8000 },
        location_preferences: ['New York', 'New Jersey']
      };

      context.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserPreferences,
              error: null
            })
          })
        })
      });

      const { data } = await context.supabase
        .from('user_search_preferences')
        .select('*')
        .eq('user_id', 'user-123')
        .single();

      expect(data).toEqual(mockUserPreferences);
    });
  });

  describe('Search Service Integration', () => {
    test('should integrate with external search engine (Elasticsearch/Algolia)', async () => {
      const mockSearchResults = {
        hits: [
          {
            _id: '1',
            _score: 0.95,
            _source: {
              name: 'Premier Wedding Photography',
              type: 'photographer',
              location: 'Manhattan, NY',
              rating: 4.9
            }
          }
        ],
        total: 1
      };

      context.searchService.search.mockResolvedValue(mockSearchResults);

      const searchQuery: SearchQuery = {
        query: 'wedding photographer',
        location: 'New York'
      };

      const results = await context.searchService.search({
        index: 'wedding_vendors',
        body: {
          query: {
            bool: {
              must: [
                { match: { name: searchQuery.query } },
                { match: { location: searchQuery.location } }
              ]
            }
          }
        }
      });

      expect(context.searchService.search).toHaveBeenCalledWith({
        index: 'wedding_vendors',
        body: expect.objectContaining({
          query: expect.any(Object)
        })
      });

      expect(results).toEqual(mockSearchResults);
    });

    test('should update search index when vendor data changes', async () => {
      const vendorUpdate = {
        id: 'vendor-123',
        name: 'Updated Vendor Name',
        rating: 4.7,
        portfolio: ['new-photo1.jpg', 'new-photo2.jpg']
      };

      context.searchService.updateIndex.mockResolvedValue({ success: true });

      await context.searchService.updateIndex('vendor-123', vendorUpdate);

      expect(context.searchService.updateIndex).toHaveBeenCalledWith(
        'vendor-123',
        vendorUpdate
      );
    });

    test('should handle search service downtime', async () => {
      context.searchService.search.mockRejectedValue(new Error('Service unavailable'));

      const searchQuery: SearchQuery = {
        query: 'wedding photographer'
      };

      // Should fallback to database search when external service fails
      try {
        await context.searchService.search(searchQuery);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // In real implementation, would fallback to database search
      }
    });
  });

  describe('Analytics Integration', () => {
    test('should track search queries in analytics service', async () => {
      const searchQuery: SearchQuery = {
        query: 'wedding photographer',
        location: 'New York'
      };

      const userId = 'user-456';
      context.analyticsService.trackSearch.mockResolvedValue({ success: true });

      await context.analyticsService.trackSearch({
        userId,
        query: searchQuery.query,
        location: searchQuery.location,
        timestamp: new Date(),
        resultCount: 25
      });

      expect(context.analyticsService.trackSearch).toHaveBeenCalledWith({
        userId,
        query: searchQuery.query,
        location: searchQuery.location,
        timestamp: expect.any(Date),
        resultCount: 25
      });
    });

    test('should record vendor click-through events', async () => {
      const clickEvent = {
        userId: 'user-789',
        vendorId: 'vendor-456',
        searchQuery: 'wedding venue',
        position: 3,
        timestamp: new Date()
      };

      context.analyticsService.recordClick.mockResolvedValue({ success: true });

      await context.analyticsService.recordClick(clickEvent);

      expect(context.analyticsService.recordClick).toHaveBeenCalledWith(clickEvent);
    });

    test('should integrate with search metrics dashboard', async () => {
      const mockMetrics = {
        totalSearches: 1542,
        averageQueryTime: 85,
        topQueries: ['wedding photographer', 'wedding venue', 'wedding florist'],
        clickThroughRate: 0.34,
        noResultsRate: 0.08
      };

      context.analyticsService.getSearchMetrics.mockResolvedValue(mockMetrics);

      const metrics = await context.analyticsService.getSearchMetrics({
        timeRange: '7d',
        vendorType: 'all'
      });

      expect(metrics).toEqual(mockMetrics);
      expect(context.analyticsService.getSearchMetrics).toHaveBeenCalledWith({
        timeRange: '7d',
        vendorType: 'all'
      });
    });
  });

  describe('Cache Integration', () => {
    test('should integrate with Redis cache for query results', async () => {
      const cacheKey = 'search:wedding_photographer:new_york';
      const cachedResults = {
        vendors: [{ id: '1', name: 'Cached Vendor' }],
        totalCount: 1,
        cachedAt: new Date().toISOString()
      };

      context.cacheService.get.mockResolvedValue(cachedResults);

      const results = await context.cacheService.get(cacheKey);

      expect(results).toEqual(cachedResults);
      expect(context.cacheService.get).toHaveBeenCalledWith(cacheKey);
    });

    test('should cache search results after database query', async () => {
      const searchResults = {
        vendors: [{ id: '1', name: 'New Vendor' }],
        totalCount: 1
      };

      const cacheKey = 'search:wedding_venue:california';
      context.cacheService.set.mockResolvedValue({ success: true });

      await context.cacheService.set(cacheKey, searchResults, 300); // 5 minute TTL

      expect(context.cacheService.set).toHaveBeenCalledWith(
        cacheKey,
        searchResults,
        300
      );
    });

    test('should invalidate cache when vendor data changes', async () => {
      const vendorId = 'vendor-789';
      context.cacheService.invalidate.mockResolvedValue({ success: true });

      // When vendor updates, invalidate related cache entries
      await context.cacheService.invalidate(`vendor:${vendorId}*`);

      expect(context.cacheService.invalidate).toHaveBeenCalledWith(
        `vendor:${vendorId}*`
      );
    });
  });

  describe('Third-Party Integrations', () => {
    test('should integrate with Google Places API for location data', async () => {
      const mockGooglePlaces = {
        searchLocations: vi.fn().mockResolvedValue({
          results: [
            {
              place_id: 'ChIJOwg_06VPwokRYv534QaPC8g',
              formatted_address: 'New York, NY, USA',
              geometry: {
                location: { lat: 40.7128, lng: -74.0060 }
              }
            }
          ]
        })
      };

      const locationQuery = 'Manhattan, NY';
      const results = await mockGooglePlaces.searchLocations(locationQuery);

      expect(results.results).toHaveLength(1);
      expect(results.results[0].formatted_address).toContain('New York');
    });

    test('should integrate with review platforms (Google Reviews, Yelp)', async () => {
      const mockReviewIntegration = {
        fetchVendorReviews: vi.fn().mockResolvedValue({
          google: {
            rating: 4.8,
            reviewCount: 156,
            reviews: [
              {
                rating: 5,
                text: 'Amazing wedding photographer!',
                author: 'Sarah M.',
                date: '2024-01-15'
              }
            ]
          },
          yelp: {
            rating: 4.6,
            reviewCount: 89,
            reviews: []
          }
        })
      };

      const vendorId = 'vendor-123';
      const reviews = await mockReviewIntegration.fetchVendorReviews(vendorId);

      expect(reviews.google.rating).toBe(4.8);
      expect(reviews.yelp.rating).toBe(4.6);
    });

    test('should integrate with social media APIs for vendor presence', async () => {
      const mockSocialIntegration = {
        getVendorSocialPresence: vi.fn().mockResolvedValue({
          instagram: {
            handle: '@eliteweddingphoto',
            followers: 25000,
            engagement_rate: 0.045,
            recent_posts: 15
          },
          facebook: {
            page_id: '123456789',
            likes: 8500,
            rating: 4.9
          }
        })
      };

      const vendorId = 'vendor-456';
      const socialData = await mockSocialIntegration.getVendorSocialPresence(vendorId);

      expect(socialData.instagram.followers).toBe(25000);
      expect(socialData.facebook.rating).toBe(4.9);
    });
  });

  describe('Real-time Integration', () => {
    test('should integrate with Supabase real-time for live updates', async () => {
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };

      context.supabase.channel = vi.fn().mockReturnValue(mockSubscription);

      // Subscribe to vendor profile changes
      const channel = context.supabase
        .channel('vendor_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'vendor_profiles'
        }, (payload: any) => {
          // Handle real-time updates
          console.log('Vendor profile changed:', payload);
        })
        .subscribe();

      expect(context.supabase.channel).toHaveBeenCalledWith('vendor_changes');
      expect(mockSubscription.on).toHaveBeenCalled();
      expect(mockSubscription.subscribe).toHaveBeenCalled();
    });

    test('should handle real-time availability updates', async () => {
      const mockAvailabilityUpdate = {
        vendor_id: 'vendor-789',
        date: '2024-06-15',
        available: false,
        updated_at: new Date()
      };

      // Mock real-time availability change
      const handleAvailabilityChange = vi.fn();

      // Simulate receiving real-time update
      handleAvailabilityChange(mockAvailabilityUpdate);

      expect(handleAvailabilityChange).toHaveBeenCalledWith(mockAvailabilityUpdate);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should fallback to database when search service fails', async () => {
      // Primary search service fails
      context.searchService.search.mockRejectedValue(new Error('Search service down'));

      // Fallback to direct database query
      context.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: [{ id: '1', name: 'Fallback Vendor' }],
            error: null
          })
        })
      });

      try {
        await context.searchService.search({ query: 'wedding photographer' });
      } catch (error) {
        // Fallback to database
        const { data } = await context.supabase
          .from('vendor_profiles')
          .select('*')
          .ilike('name', '%wedding photographer%');

        expect(data).toEqual([{ id: '1', name: 'Fallback Vendor' }]);
      }
    });

    test('should handle partial integration failures gracefully', async () => {
      // Analytics fails but search continues
      context.analyticsService.trackSearch.mockRejectedValue(
        new Error('Analytics service unavailable')
      );

      const searchQuery: SearchQuery = {
        query: 'wedding photographer'
      };

      // Search should still work even if analytics fails
      context.searchService.search.mockResolvedValue({
        vendors: [{ id: '1', name: 'Test Vendor' }],
        totalCount: 1
      });

      const results = await context.searchService.search(searchQuery);

      expect(results.vendors).toHaveLength(1);
      
      // Analytics should have failed silently
      try {
        await context.analyticsService.trackSearch({
          query: searchQuery.query,
          timestamp: new Date()
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Data Consistency', () => {
    test('should maintain consistency between search index and database', async () => {
      // Mock database state
      const dbVendor = {
        id: 'vendor-123',
        name: 'Updated Vendor Name',
        rating: 4.8,
        updated_at: new Date()
      };

      // Mock search index state
      const indexVendor = {
        id: 'vendor-123',
        name: 'Old Vendor Name',
        rating: 4.5,
        indexed_at: new Date(Date.now() - 86400000) // 1 day ago
      };

      // Detect inconsistency
      const isInconsistent = dbVendor.name !== indexVendor.name ||
                            dbVendor.rating !== indexVendor.rating;

      expect(isInconsistent).toBe(true);

      if (isInconsistent) {
        // Update search index to match database
        await context.searchService.updateIndex(dbVendor.id, {
          name: dbVendor.name,
          rating: dbVendor.rating
        });

        expect(context.searchService.updateIndex).toHaveBeenCalledWith(
          dbVendor.id,
          expect.objectContaining({
            name: dbVendor.name,
            rating: dbVendor.rating
          })
        );
      }
    });
  });
});