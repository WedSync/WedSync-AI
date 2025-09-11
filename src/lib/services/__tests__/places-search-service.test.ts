import { PlacesSearchService } from '../places-search-service';
import { GooglePlacesClient } from '../../integrations/google-places-client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  WeddingVenueSearchRequest,
  VenueCategorySearchRequest,
  WeddingVenueDetails,
  VenueAnalytics,
} from '@/types/google-places';

// Mock GooglePlacesClient
vi.mock('../../integrations/google-places-client');
const MockedGooglePlacesClient = vi.mocked(GooglePlacesClient);

// Mock console methods
const consoleMock = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
};

describe('PlacesSearchService', () => {
  let service: PlacesSearchService;
  let mockGoogleClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Google Places client
    mockGoogleClient = {
      searchPlaces: vi.fn(),
      getPlaceDetails: vi.fn(),
      autocompleteSearch: vi.fn(),
      nearbySearch: vi.fn(),
      getCacheStats: vi.fn().mockReturnValue({
        hits: 10,
        misses: 5,
        hitRate: 0.67,
        size: 15,
      }),
    };

    MockedGooglePlacesClient.mockImplementation(() => mockGoogleClient);
    service = new PlacesSearchService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with GooglePlacesClient', () => {
      expect(service).toBeInstanceOf(PlacesSearchService);
      expect(MockedGooglePlacesClient).toHaveBeenCalledTimes(1);
    });

    it('should initialize analytics tracking', () => {
      const analytics = service.getAnalytics();
      expect(analytics).toEqual({
        totalSearches: 0,
        successfulSearches: 0,
        cacheHits: 0,
        averageResponseTime: 0,
        topSearchTerms: [],
        venueTypeDistribution: {},
        searchSuccessRate: 0,
      });
    });
  });

  describe('Wedding Venue Search', () => {
    const mockSuccessResponse = {
      success: true,
      data: {
        results: [
          {
            place_id: 'venue-1',
            name: 'Grand Wedding Hall',
            rating: 4.8,
            types: ['wedding_venue', 'event_planning'],
            geometry: {
              location: { lat: 40.7128, lng: -74.006 },
            },
            weddingScore: 9.2,
            weddingRelevance: 'Perfect for large weddings',
            weddingFeatures: ['Bridal Suite', 'Outdoor Ceremony Space'],
          },
          {
            place_id: 'venue-2',
            name: 'Intimate Garden Venue',
            rating: 4.6,
            types: ['park', 'event_venue'],
            geometry: {
              location: { lat: 40.7129, lng: -74.0061 },
            },
            weddingScore: 8.5,
            weddingRelevance: 'Great for outdoor ceremonies',
            weddingFeatures: ['Garden Setting', 'Photography Opportunities'],
          },
        ],
        status: 'OK',
      },
    };

    it('should search wedding venues successfully', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue(mockSuccessResponse);

      const result = await service.searchWeddingVenues({
        query: 'wedding venue New York',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 10000,
        weddingPreferences: {
          ceremonyType: 'indoor',
          receptionType: 'same_venue',
          guestCount: 150,
          budget: 'premium',
        },
      });

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(2);
      expect(result.venues![0]).toMatchObject({
        place_id: 'venue-1',
        name: 'Grand Wedding Hall',
        weddingScore: 9.2,
      });
      expect(mockGoogleClient.searchPlaces).toHaveBeenCalledWith({
        query: 'wedding venue New York',
        type: 'text_search',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 10000,
        placeTypes: ['wedding_venue', 'event_venue', 'banquet_hall'],
      });
    });

    it('should apply wedding-specific filters', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue(mockSuccessResponse);

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: {
          ceremonyType: 'outdoor',
          guestCount: 50,
          budget: 'moderate',
        },
        filters: {
          minRating: 4.5,
          maxDistance: 5000,
          priceLevel: [2, 3],
          amenities: ['parking', 'catering'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.venues![0].weddingScore).toBeGreaterThan(8);

      // Should filter and enhance results based on preferences
      expect(mockGoogleClient.searchPlaces).toHaveBeenCalledWith(
        expect.objectContaining({
          placeTypes: expect.arrayContaining(['park', 'garden']),
        }),
      );
    });

    it('should handle wedding preference-based venue type selection', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue(mockSuccessResponse);

      // Test different ceremony types
      await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: { ceremonyType: 'beach' },
      });

      expect(mockGoogleClient.searchPlaces).toHaveBeenCalledWith(
        expect.objectContaining({
          placeTypes: expect.arrayContaining(['beach', 'resort']),
        }),
      );

      await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: { ceremonyType: 'church' },
      });

      expect(mockGoogleClient.searchPlaces).toHaveBeenCalledWith(
        expect.objectContaining({
          placeTypes: expect.arrayContaining(['church', 'place_of_worship']),
        }),
      );
    });

    it('should enhance venues with wedding-specific scoring', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              place_id: 'venue-1',
              name: 'Test Venue',
              rating: 4.0,
              types: ['restaurant'],
              reviews: [{ text: 'Great food', rating: 4 }],
            },
          ],
          status: 'OK',
        },
      });

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: { guestCount: 100 },
      });

      expect(result.success).toBe(true);
      expect(result.venues![0]).toHaveProperty('enhancedWeddingAnalysis');
      expect(result.venues![0].enhancedWeddingAnalysis).toMatchObject({
        suitabilityScore: expect.any(Number),
        capacityMatch: expect.any(String),
        recommendedUse: expect.any(Array),
        considerations: expect.any(Array),
      });
    });

    it('should handle search failures gracefully', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: false,
        error: 'API quota exceeded',
      });

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Search failed');
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Wedding venue search failed:',
        'API quota exceeded',
      );
    });
  });

  describe('Category-Based Search', () => {
    it('should search by specific venue category', async () => {
      const categoryResponse = {
        success: true,
        data: {
          results: [
            {
              place_id: 'hotel-1',
              name: 'Luxury Wedding Hotel',
              rating: 4.9,
              types: ['lodging', 'spa'],
              weddingScore: 9.5,
            },
          ],
          status: 'OK',
        },
      };

      mockGoogleClient.searchPlaces.mockResolvedValue(categoryResponse);

      const result = await service.searchByCategory({
        category: 'hotel',
        location: { lat: 40.7128, lng: -74.006 },
        radius: 15000,
        weddingContext: {
          eventType: 'destination_wedding',
          guestCount: 80,
        },
      });

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(1);
      expect(result.venues![0].name).toBe('Luxury Wedding Hotel');
      expect(mockGoogleClient.searchPlaces).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text_search',
          placeTypes: ['lodging', 'resort', 'hotel'],
        }),
      );
    });

    it('should apply category-specific enhancements', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              place_id: 'beach-1',
              name: 'Sunset Beach',
              types: ['natural_feature', 'tourist_attraction'],
              rating: 4.7,
            },
          ],
          status: 'OK',
        },
      });

      const result = await service.searchByCategory({
        category: 'beach',
        location: { lat: 25.7617, lng: -80.1918 },
      });

      expect(result.success).toBe(true);
      expect(result.venues![0]).toHaveProperty('categorySpecificFeatures');
      expect(result.venues![0].categorySpecificFeatures).toMatchObject({
        beachFeatures: expect.any(Array),
        weatherConsiderations: expect.any(Array),
        accessibilityNotes: expect.any(Array),
      });
    });
  });

  describe('Venue Details', () => {
    const mockDetailResponse = {
      success: true,
      data: {
        result: {
          place_id: 'venue-1',
          name: 'Wedding Paradise',
          rating: 4.8,
          formatted_address: '123 Wedding Ave, New York, NY',
          formatted_phone_number: '+1 (555) 123-4567',
          website: 'https://weddingparadise.com',
          photos: [{ photo_reference: 'photo-1', width: 800, height: 600 }],
          opening_hours: {
            weekday_text: ['Monday: 9:00 AM – 10:00 PM'],
          },
          reviews: [
            {
              author_name: 'Happy Bride',
              rating: 5,
              text: 'Perfect for our wedding!',
              time: Date.now() / 1000,
            },
          ],
          weddingAnalysis: {
            overallScore: 9.2,
            ceremonyScore: 9.0,
            receptionScore: 9.5,
            photographyScore: 8.8,
            accessibilityScore: 8.5,
            capacityEstimate: {
              ceremony: '100-200 guests',
              reception: '150-250 guests',
            },
          },
        },
        status: 'OK',
      },
    };

    it('should get comprehensive venue details', async () => {
      mockGoogleClient.getPlaceDetails.mockResolvedValue(mockDetailResponse);

      const result = await service.getVenueDetails('venue-1');

      expect(result.success).toBe(true);
      expect(result.venue).toMatchObject({
        place_id: 'venue-1',
        name: 'Wedding Paradise',
        rating: 4.8,
      });
      expect(result.venue?.weddingAnalysis).toBeDefined();
      expect(mockGoogleClient.getPlaceDetails).toHaveBeenCalledWith({
        placeId: 'venue-1',
        fields: [
          'place_id',
          'name',
          'rating',
          'formatted_address',
          'formatted_phone_number',
          'website',
          'photos',
          'opening_hours',
          'reviews',
          'types',
          'geometry',
          'price_level',
          'user_ratings_total',
        ],
      });
    });

    it('should enhance venue details with wedding-specific insights', async () => {
      mockGoogleClient.getPlaceDetails.mockResolvedValue(mockDetailResponse);

      const result = await service.getVenueDetails('venue-1', {
        includePhotos: true,
        includeReviews: true,
        weddingContext: {
          guestCount: 150,
          budget: 'premium',
        },
      });

      expect(result.success).toBe(true);
      expect(result.venue?.weddingInsights).toMatchObject({
        budgetAlignment: expect.any(String),
        capacityMatch: expect.any(String),
        seasonalConsiderations: expect.any(Array),
        vendorRecommendations: expect.any(Array),
        bookingTips: expect.any(Array),
      });
    });

    it('should handle venue details failures', async () => {
      mockGoogleClient.getPlaceDetails.mockResolvedValue({
        success: false,
        error: 'Place not found',
      });

      const result = await service.getVenueDetails('invalid-venue-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get venue details');
    });
  });

  describe('Duplicate Detection and Merging', () => {
    it('should detect and remove duplicate venues', async () => {
      const duplicateResponse = {
        success: true,
        data: {
          results: [
            {
              place_id: 'venue-1',
              name: 'Grand Wedding Hall',
              formatted_address: '123 Wedding St, NY',
              geometry: { location: { lat: 40.7128, lng: -74.006 } },
            },
            {
              place_id: 'venue-1-duplicate',
              name: 'Grand Wedding Hall',
              formatted_address: '123 Wedding Street, New York',
              geometry: { location: { lat: 40.7129, lng: -74.0061 } },
            },
            {
              place_id: 'venue-2',
              name: 'Different Venue',
              formatted_address: '456 Other St, NY',
              geometry: { location: { lat: 40.72, lng: -74.01 } },
            },
          ],
          status: 'OK',
        },
      };

      mockGoogleClient.searchPlaces.mockResolvedValue(duplicateResponse);

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
      });

      expect(result.success).toBe(true);
      // Should remove duplicate and keep 2 unique venues
      expect(result.venues).toHaveLength(2);
      expect(result.venues!.map((v) => v.name)).toContain('Grand Wedding Hall');
      expect(result.venues!.map((v) => v.name)).toContain('Different Venue');
    });

    it('should merge duplicate venue information intelligently', async () => {
      const service = new PlacesSearchService();
      const duplicates = [
        {
          place_id: 'venue-1',
          name: 'Wedding Hall',
          rating: 4.5,
          user_ratings_total: 100,
          photos: [{ photo_reference: 'photo-1' }],
        },
        {
          place_id: 'venue-1-dup',
          name: 'Wedding Hall',
          rating: 4.8,
          user_ratings_total: 150,
          photos: [{ photo_reference: 'photo-2' }],
        },
      ];

      const merged = service['mergeDuplicateVenues'](duplicates as any);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toMatchObject({
        name: 'Wedding Hall',
        rating: 4.8, // Should keep higher rating
        user_ratings_total: 150, // Should keep higher count
        photos: expect.arrayContaining([
          { photo_reference: 'photo-1' },
          { photo_reference: 'photo-2' },
        ]),
      });
    });
  });

  describe('Search Analytics and Tracking', () => {
    it('should track search analytics', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: { results: [], status: 'OK' },
      });

      await service.searchWeddingVenues({ query: 'wedding venue' });
      await service.searchWeddingVenues({ query: 'reception hall' });
      await service.searchWeddingVenues({ query: 'wedding venue' }); // Repeat search

      const analytics = service.getAnalytics();
      expect(analytics.totalSearches).toBe(3);
      expect(analytics.successfulSearches).toBe(3);
      expect(analytics.topSearchTerms).toContainEqual(
        expect.objectContaining({
          term: 'wedding venue',
          count: 2,
        }),
      );
    });

    it('should calculate search success rate', async () => {
      mockGoogleClient.searchPlaces
        .mockResolvedValueOnce({
          success: true,
          data: { results: [], status: 'OK' },
        })
        .mockResolvedValueOnce({ success: false, error: 'API error' })
        .mockResolvedValueOnce({
          success: true,
          data: { results: [], status: 'OK' },
        });

      await service.searchWeddingVenues({ query: 'venue 1' });
      await service.searchWeddingVenues({ query: 'venue 2' });
      await service.searchWeddingVenues({ query: 'venue 3' });

      const analytics = service.getAnalytics();
      expect(analytics.totalSearches).toBe(3);
      expect(analytics.successfulSearches).toBe(2);
      expect(analytics.searchSuccessRate).toBeCloseTo(0.67, 2);
    });

    it('should track venue type distribution', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: {
          results: [
            { place_id: '1', types: ['wedding_venue'] },
            { place_id: '2', types: ['hotel', 'lodging'] },
            { place_id: '3', types: ['wedding_venue'] },
          ],
          status: 'OK',
        },
      });

      await service.searchWeddingVenues({ query: 'wedding venues' });

      const analytics = service.getAnalytics();
      expect(analytics.venueTypeDistribution).toEqual({
        wedding_venue: 2,
        hotel: 1,
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResultSet = {
        success: true,
        data: {
          results: Array(1000)
            .fill(null)
            .map((_, i) => ({
              place_id: `venue-${i}`,
              name: `Venue ${i}`,
              rating: 4.0 + (i % 10) / 10,
              types: ['wedding_venue'],
            })),
          status: 'OK',
        },
      };

      mockGoogleClient.searchPlaces.mockResolvedValue(largeResultSet);

      const startTime = Date.now();
      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently sort and filter results', async () => {
      const unsortedResults = {
        success: true,
        data: {
          results: [
            {
              place_id: '1',
              name: 'Low Rated',
              rating: 3.0,
              weddingScore: 5.0,
            },
            {
              place_id: '2',
              name: 'High Rated',
              rating: 4.9,
              weddingScore: 9.5,
            },
            {
              place_id: '3',
              name: 'Medium Rated',
              rating: 4.2,
              weddingScore: 7.8,
            },
          ],
          status: 'OK',
        },
      };

      mockGoogleClient.searchPlaces.mockResolvedValue(unsortedResults);

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
        sortBy: 'weddingScore',
        sortOrder: 'desc',
      });

      expect(result.success).toBe(true);
      expect(result.venues![0].name).toBe('High Rated');
      expect(result.venues![1].name).toBe('Medium Rated');
      expect(result.venues![2].name).toBe('Low Rated');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty search results', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: { results: [], status: 'ZERO_RESULTS' },
      });

      const result = await service.searchWeddingVenues({
        query: 'nonexistent venue',
      });

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(0);
      expect(result.message).toContain('No wedding venues found');
    });

    it('should handle malformed venue data', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: {
          results: [
            { place_id: 'valid-venue', name: 'Valid Venue', rating: 4.5 },
            { place_id: null, name: undefined, rating: 'invalid' }, // Malformed
            { place_id: 'another-valid', name: 'Another Venue', rating: 4.0 },
          ],
          status: 'OK',
        },
      });

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
      });

      expect(result.success).toBe(true);
      expect(result.venues).toHaveLength(2); // Should filter out malformed venue
      expect(result.venues!.every((v) => v.place_id && v.name)).toBe(true);
    });

    it('should handle network timeouts gracefully', async () => {
      mockGoogleClient.searchPlaces.mockRejectedValue(
        new Error('Request timeout'),
      );

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Search failed');
      expect(consoleMock.error).toHaveBeenCalled();
    });

    it('should validate search parameters', async () => {
      const result = await service.searchWeddingVenues({
        query: '', // Empty query
        radius: -1000, // Invalid radius
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid search parameters');
    });
  });

  describe('Wedding-Specific Business Logic', () => {
    it('should apply guest count capacity filtering', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              place_id: 'small-venue',
              name: 'Intimate Venue',
              rating: 4.5,
              reviews: [{ text: 'Perfect for small weddings of 20-50 guests' }],
            },
            {
              place_id: 'large-venue',
              name: 'Grand Ballroom',
              rating: 4.8,
              reviews: [{ text: 'Accommodates 200+ wedding guests easily' }],
            },
          ],
          status: 'OK',
        },
      });

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: {
          guestCount: 150,
        },
      });

      expect(result.success).toBe(true);
      // Should rank venues based on capacity match
      expect(
        result.venues![0].enhancedWeddingAnalysis?.capacityMatch,
      ).toContain('Good');
    });

    it('should provide budget-appropriate recommendations', async () => {
      mockGoogleClient.searchPlaces.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              place_id: 'budget-venue',
              name: 'Affordable Hall',
              rating: 4.2,
              price_level: 2,
            },
            {
              place_id: 'luxury-venue',
              name: 'Luxury Resort',
              rating: 4.9,
              price_level: 4,
            },
          ],
          status: 'OK',
        },
      });

      const result = await service.searchWeddingVenues({
        query: 'wedding venue',
        weddingPreferences: {
          budget: 'moderate',
        },
      });

      expect(result.success).toBe(true);
      // Should enhance with budget alignment information
      expect(
        result.venues![0].enhancedWeddingAnalysis?.budgetAlignment,
      ).toBeDefined();
    });
  });
});
