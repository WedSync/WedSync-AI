import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GooglePlacesClient } from '../../lib/integrations/google-places-client';
import { PlacesSearchService } from '../../lib/services/places-search-service';

// Integration tests for Google Places API system
describe('Google Places Integration', () => {
  let client: GooglePlacesClient;
  let service: PlacesSearchService;

  beforeEach(() => {
    // Use real implementations for integration testing
    process.env.GOOGLE_PLACES_API_KEY = 'test-integration-key';
    client = new GooglePlacesClient();
    service = new PlacesSearchService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Full Wedding Venue Search Flow', () => {
    it('should complete end-to-end wedding venue search workflow', async () => {
      // Mock successful Google Places API responses
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                place_id: 'integration-venue-1',
                name: 'Integration Test Venue',
                rating: 4.8,
                types: ['wedding_venue', 'event_planning'],
                geometry: {
                  location: { lat: 40.7128, lng: -74.006 },
                },
                reviews: [
                  { text: 'Perfect for weddings', rating: 5 },
                  { text: 'Beautiful ceremony space', rating: 5 },
                ],
              },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      } as any);

      // Step 1: Search for wedding venues
      const searchResult = await service.searchWeddingVenues({
        query: 'wedding venue NYC',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 10000,
        weddingPreferences: {
          ceremonyType: 'indoor',
          guestCount: 150,
          budget: 'premium',
        },
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.venues).toHaveLength(1);
      expect(searchResult.venues![0]).toMatchObject({
        place_id: 'integration-venue-1',
        name: 'Integration Test Venue',
        weddingScore: expect.any(Number),
        enhancedWeddingAnalysis: expect.any(Object),
      });

      // Verify wedding-specific enhancements were applied
      expect(searchResult.venues![0].weddingScore).toBeGreaterThan(8);
      expect(
        searchResult.venues![0].enhancedWeddingAnalysis?.suitabilityScore,
      ).toBeGreaterThan(7);
    });

    it('should handle venue details retrieval with caching', async () => {
      // Mock venue details response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              place_id: 'detailed-venue-1',
              name: 'Detailed Venue',
              rating: 4.7,
              formatted_address: '123 Wedding Ave, NYC',
              photos: [{ photo_reference: 'photo-1', width: 800, height: 600 }],
              opening_hours: { open_now: true },
              reviews: [
                {
                  author_name: 'Happy Bride',
                  rating: 5,
                  text: 'Amazing venue!',
                },
              ],
            },
            status: 'OK',
          }),
        headers: new Map(),
      } as any);

      // First details request
      const detailsResult1 = await service.getVenueDetails('detailed-venue-1');

      // Second identical request (should use cache)
      const detailsResult2 = await service.getVenueDetails('detailed-venue-1');

      expect(detailsResult1.success).toBe(true);
      expect(detailsResult2.success).toBe(true);
      expect(detailsResult1.venue?.place_id).toBe('detailed-venue-1');
      expect(detailsResult2.venue?.place_id).toBe('detailed-venue-1');

      // Should only make one API call due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting across multiple requests', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    place_id: `venue-${callCount}`,
                    name: `Venue ${callCount}`,
                  },
                ],
                status: 'OK',
              }),
            headers: new Map(),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () =>
              Promise.resolve({
                error_message: 'Rate limit exceeded',
                status: 'OVER_QUERY_LIMIT',
              }),
            headers: new Map(),
          });
        }
      });

      const requests = Array(5)
        .fill(null)
        .map((_, i) =>
          service.searchWeddingVenues({
            query: `venue search ${i}`,
          }),
        );

      const results = await Promise.all(requests);

      // First 3 should succeed
      expect(results.slice(0, 3).every((r) => r.success)).toBe(true);

      // Last 2 should fail due to rate limiting
      expect(results.slice(3).every((r) => !r.success)).toBe(true);

      // Verify analytics tracking
      const analytics = service.getAnalytics();
      expect(analytics.totalSearches).toBe(5);
      expect(analytics.successfulSearches).toBe(3);
      expect(analytics.searchSuccessRate).toBeCloseTo(0.6);
    });

    it('should integrate with wedding planning workflow', async () => {
      // Mock multiple API responses for comprehensive workflow
      global.fetch = vi
        .fn()
        // Search response
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  place_id: 'workflow-venue-1',
                  name: 'Wedding Workflow Venue',
                  rating: 4.9,
                  types: ['wedding_venue'],
                  geometry: { location: { lat: 40.7128, lng: -74.006 } },
                },
              ],
              status: 'OK',
            }),
          headers: new Map(),
        } as any)
        // Details response
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: {
                place_id: 'workflow-venue-1',
                name: 'Wedding Workflow Venue',
                rating: 4.9,
                formatted_address: '456 Wedding Blvd, NYC',
                formatted_phone_number: '+1 555-WEDDING',
                website: 'https://weddingvenue.com',
                reviews: [
                  { text: 'Perfect for ceremonies and receptions', rating: 5 },
                  { text: 'Accommodated 200 guests comfortably', rating: 5 },
                ],
              },
              status: 'OK',
            }),
          headers: new Map(),
        } as any);

      // Step 1: Search for venues
      const searchResult = await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: {
          ceremonyType: 'indoor',
          receptionType: 'same_venue',
          guestCount: 200,
          budget: 'luxury',
        },
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.venues).toHaveLength(1);

      // Step 2: Get detailed information for selected venue
      const venueDetails = await service.getVenueDetails(
        searchResult.venues![0].place_id,
        {
          includePhotos: true,
          includeReviews: true,
          weddingContext: {
            guestCount: 200,
            budget: 'luxury',
          },
        },
      );

      expect(venueDetails.success).toBe(true);
      expect(venueDetails.venue).toMatchObject({
        place_id: 'workflow-venue-1',
        name: 'Wedding Workflow Venue',
        formatted_address: '456 Wedding Blvd, NYC',
        weddingInsights: expect.objectContaining({
          capacityMatch: expect.any(String),
          budgetAlignment: expect.any(String),
        }),
      });

      // Verify the workflow completed successfully
      expect(venueDetails.venue?.weddingInsights?.capacityMatch).toContain(
        '200',
      );
      expect(venueDetails.venue?.weddingInsights?.budgetAlignment).toContain(
        'luxury',
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle API failures gracefully with fallback behavior', async () => {
      global.fetch = vi
        .fn()
        // First call fails
        .mockRejectedValueOnce(new Error('Network failure'))
        // Retry succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { place_id: 'resilient-venue', name: 'Resilient Venue' },
              ],
              status: 'OK',
            }),
          headers: new Map(),
        } as any);

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
      });

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + retry
    });

    it('should handle partial API data gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                place_id: 'partial-venue-1',
                name: 'Complete Venue',
                rating: 4.8,
                types: ['wedding_venue'],
                geometry: { location: { lat: 40.7128, lng: -74.006 } },
              },
              {
                place_id: 'partial-venue-2',
                name: 'Incomplete Venue',
                // Missing rating, types, geometry
              },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      } as any);

      const result = await service.searchWeddingVenues({
        query: 'wedding venues',
      });

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(2);

      // Complete venue should have all enhancements
      expect(result.venues![0].weddingScore).toBeDefined();

      // Incomplete venue should have default/fallback values
      expect(result.venues![1].weddingScore).toBeDefined();
      expect(result.venues![1].weddingScore).toBeGreaterThan(0);
    });

    it('should maintain cache consistency across service restarts', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { place_id: 'cache-test-venue', name: 'Cache Test Venue' },
            ],
            status: 'OK',
          }),
        headers: new Map(),
      } as any);

      // First service instance
      const service1 = new PlacesSearchService();
      await service1.searchWeddingVenues({ query: 'cache test' });

      // Second service instance (simulating restart)
      const service2 = new PlacesSearchService();
      await service2.searchWeddingVenues({ query: 'cache test' });

      // Both should work independently
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent searches efficiently', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { place_id: 'concurrent-venue', name: 'Concurrent Test Venue' },
              ],
              status: 'OK',
            }),
          headers: new Map(),
        }),
      );

      const concurrentSearches = Array(10)
        .fill(null)
        .map((_, i) => service.searchWeddingVenues({ query: `search ${i}` }));

      const startTime = Date.now();
      const results = await Promise.all(concurrentSearches);
      const endTime = Date.now();

      // All searches should succeed
      expect(results.every((r) => r.success)).toBe(true);

      // Should complete within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);

      // Should make appropriate number of API calls
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });

    it('should optimize for wedding-specific use cases', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: Array(20)
              .fill(null)
              .map((_, i) => ({
                place_id: `perf-venue-${i}`,
                name: `Performance Venue ${i}`,
                rating: 4.0 + (i % 10) / 10,
                types: ['wedding_venue'],
                reviews: [{ text: 'Great for weddings', rating: 5 }],
              })),
            status: 'OK',
          }),
        headers: new Map(),
      } as any);

      const startTime = Date.now();
      const result = await service.searchWeddingVenues({
        query: 'wedding venues',
        weddingPreferences: {
          ceremonyType: 'outdoor',
          guestCount: 150,
        },
        sortBy: 'weddingScore',
        sortOrder: 'desc',
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(20);

      // Should process large result sets quickly
      expect(endTime - startTime).toBeLessThan(500);

      // Results should be sorted by wedding score
      const scores = result.venues!.map((v) => v.weddingScore || 0);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });
  });

  describe('Analytics and Monitoring', () => {
    it('should track comprehensive search analytics', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  place_id: 'analytics-venue-1',
                  name: 'Analytics Venue 1',
                  types: ['wedding_venue'],
                },
              ],
              status: 'OK',
            }),
          headers: new Map(),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  place_id: 'analytics-venue-2',
                  name: 'Analytics Venue 2',
                  types: ['banquet_hall'],
                },
              ],
              status: 'OK',
            }),
          headers: new Map(),
        } as any);

      // Perform various searches
      await service.searchWeddingVenues({ query: 'wedding venue' });
      await service.searchWeddingVenues({ query: 'banquet hall' });
      await service.searchWeddingVenues({ query: 'wedding venue' }); // Duplicate

      const analytics = service.getAnalytics();

      expect(analytics).toMatchObject({
        totalSearches: 3,
        successfulSearches: 3,
        searchSuccessRate: 1.0,
        topSearchTerms: expect.arrayContaining([
          { term: 'wedding venue', count: 2 },
          { term: 'banquet hall', count: 1 },
        ]),
        venueTypeDistribution: {
          wedding_venue: 1,
          banquet_hall: 1,
        },
      });
    });

    it('should provide performance metrics', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        // Simulate varying response times
        const delay = Math.random() * 200;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    results: [
                      { place_id: 'perf-venue', name: 'Performance Venue' },
                    ],
                    status: 'OK',
                  }),
                headers: new Map(),
              }),
            delay,
          ),
        );
      });

      // Perform multiple searches to gather metrics
      await Promise.all([
        service.searchWeddingVenues({ query: 'venue 1' }),
        service.searchWeddingVenues({ query: 'venue 2' }),
        service.searchWeddingVenues({ query: 'venue 3' }),
        service.searchWeddingVenues({ query: 'venue 4' }),
        service.searchWeddingVenues({ query: 'venue 5' }),
      ]);

      const analytics = service.getAnalytics();

      expect(analytics.totalSearches).toBe(5);
      expect(analytics.averageResponseTime).toBeGreaterThan(0);
      expect(analytics.averageResponseTime).toBeLessThan(1000); // Should be reasonable
    });
  });
});
