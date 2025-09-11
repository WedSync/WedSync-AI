import { GET } from '../places/details/[placeId]/route';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../../../lib/services/places-search-service');
vi.mock('../../../../lib/middleware/security');
vi.mock('../../../../lib/middleware/audit');
vi.mock('@supabase/ssr');

// Mock PlacesSearchService
const mockPlacesSearchService = {
  getVenueDetails: vi.fn(),
};

vi.mock('../../../../lib/services/places-search-service', () => ({
  PlacesSearchService: vi.fn(() => mockPlacesSearchService),
}));

// Mock security middleware
const mockWithSecureValidation = vi.fn((schema, handler) => handler);
vi.mock('../../../../lib/middleware/security', () => ({
  withSecureValidation: mockWithSecureValidation,
  secureStringSchema: vi.fn(),
}));

// Mock audit middleware
const mockLogAuditEvent = vi.fn();
vi.mock('../../../../lib/middleware/audit', () => ({
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

describe('/api/places/details/[placeId]', () => {
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

  describe('GET /api/places/details/[placeId]', () => {
    const mockVenueDetails = {
      success: true,
      venue: {
        place_id: 'venue-123',
        name: 'Grand Wedding Hall',
        rating: 4.8,
        formatted_address: '123 Wedding Avenue, New York, NY 10001',
        formatted_phone_number: '+1 (555) 123-4567',
        website: 'https://grandweddinghall.com',
        photos: [
          {
            photo_reference: 'photo-ref-1',
            width: 800,
            height: 600,
            html_attributions: [
              '<a href="https://example.com">Photo Credit</a>',
            ],
          },
        ],
        opening_hours: {
          weekday_text: [
            'Monday: 9:00 AM – 10:00 PM',
            'Tuesday: 9:00 AM – 10:00 PM',
            'Wednesday: 9:00 AM – 10:00 PM',
            'Thursday: 9:00 AM – 10:00 PM',
            'Friday: 9:00 AM – 11:00 PM',
            'Saturday: 8:00 AM – 11:00 PM',
            'Sunday: 10:00 AM – 9:00 PM',
          ],
          open_now: true,
        },
        reviews: [
          {
            author_name: 'Happy Bride Sarah',
            rating: 5,
            text: 'Perfect venue for our dream wedding! The staff was amazing and the location is gorgeous.',
            time: Date.now() / 1000,
            profile_photo_url: 'https://example.com/photo.jpg',
          },
        ],
        types: ['wedding_venue', 'event_planning', 'banquet_hall'],
        price_level: 3,
        user_ratings_total: 247,
        geometry: {
          location: { lat: 40.7128, lng: -74.006 },
        },
        weddingAnalysis: {
          overallScore: 9.2,
          ceremonyScore: 9.0,
          receptionScore: 9.5,
          photographyScore: 8.8,
          accessibilityScore: 8.5,
          capacityEstimate: {
            ceremony: '150-200 guests',
            reception: '200-300 guests',
          },
          recommendedFor: [
            'large_weddings',
            'elegant_receptions',
            'winter_weddings',
          ],
          considerations: ['Limited outdoor space', 'Premium pricing'],
        },
        weddingInsights: {
          budgetAlignment: 'Premium venue - expect $200-300 per person',
          capacityMatch: 'Excellent for 150-250 guest weddings',
          seasonalConsiderations: [
            'Peak season: May-October',
            'Winter bookings available',
          ],
          vendorRecommendations: [
            'In-house catering available',
            'Preferred photographer list',
          ],
          bookingTips: [
            'Book 12-18 months in advance',
            'Saturday premium applies',
          ],
        },
      },
    };

    it('should get comprehensive venue details successfully', async () => {
      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        mockVenueDetails,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        venue: expect.objectContaining({
          place_id: 'venue-123',
          name: 'Grand Wedding Hall',
          rating: 4.8,
          weddingAnalysis: expect.objectContaining({
            overallScore: 9.2,
            capacityEstimate: expect.any(Object),
          }),
          weddingInsights: expect.objectContaining({
            budgetAlignment: expect.any(String),
            capacityMatch: expect.any(String),
          }),
        }),
      });

      expect(mockPlacesSearchService.getVenueDetails).toHaveBeenCalledWith(
        'venue-123',
        {},
      );

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'places_details',
        'success',
        expect.objectContaining({
          placeId: 'venue-123',
        }),
      );
    });

    it('should handle venue details with wedding context', async () => {
      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        mockVenueDetails,
      );

      const url = new URL('http://localhost:3000/api/places/details/venue-123');
      url.searchParams.set('guestCount', '180');
      url.searchParams.set('budget', 'premium');
      url.searchParams.set('includePhotos', 'true');
      url.searchParams.set('includeReviews', 'true');

      const request = new NextRequest(url);
      const response = await GET(request, { params: { placeId: 'venue-123' } });

      expect(response.status).toBe(200);
      expect(mockPlacesSearchService.getVenueDetails).toHaveBeenCalledWith(
        'venue-123',
        {
          includePhotos: true,
          includeReviews: true,
          weddingContext: {
            guestCount: 180,
            budget: 'premium',
          },
        },
      );
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      });

      expect(mockPlacesSearchService.getVenueDetails).not.toHaveBeenCalled();
    });

    it('should validate place ID parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/places/details/',
      );
      const response = await GET(request, { params: { placeId: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Place ID is required',
      });
    });

    it('should handle venue not found', async () => {
      mockPlacesSearchService.getVenueDetails.mockResolvedValue({
        success: false,
        error: 'Place not found',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/nonexistent-venue',
      );
      const response = await GET(request, {
        params: { placeId: 'nonexistent-venue' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        success: false,
        error: 'Venue not found',
      });

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'places_details',
        'not_found',
        expect.objectContaining({
          placeId: 'nonexistent-venue',
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      mockPlacesSearchService.getVenueDetails.mockResolvedValue({
        success: false,
        error: 'Google Places API quota exceeded',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Google Places API quota exceeded',
      });
    });

    it('should handle service unavailable', async () => {
      mockPlacesSearchService.getVenueDetails.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({
        success: false,
        error: 'Service temporarily unavailable. Please try again later.',
        retryAfter: expect.any(Number),
      });

      expect(consoleMock.error).toHaveBeenCalledWith(
        'Places details API error:',
        expect.any(Error),
      );
    });

    it('should sanitize malicious place ID', async () => {
      const maliciousPlaceId = '<script>alert("xss")</script>venue-123';

      const request = new NextRequest(
        `http://localhost:3000/api/places/details/${encodeURIComponent(maliciousPlaceId)}`,
      );
      const response = await GET(request, {
        params: { placeId: maliciousPlaceId },
      });

      // Should reject obviously malicious input
      expect(response.status).toBe(400);
    });

    it('should include performance metrics in response headers', async () => {
      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        mockVenueDetails,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });

      expect(response.headers.get('X-Response-Time')).toMatch(/^\d+ms$/);
      expect(response.headers.get('X-Cache-Status')).toBeDefined();
    });

    it('should handle partial venue data gracefully', async () => {
      const partialVenueData = {
        success: true,
        venue: {
          place_id: 'venue-123',
          name: 'Venue Name Only',
          // Missing most fields that would normally be present
        },
      };

      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        partialVenueData,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.venue).toMatchObject({
        place_id: 'venue-123',
        name: 'Venue Name Only',
      });

      // Should indicate partial data
      expect(data).toHaveProperty('warnings');
      expect(data.warnings).toContain(
        'Incomplete venue data - some details may be unavailable',
      );
    });

    it('should handle wedding analysis failures gracefully', async () => {
      const venueWithoutAnalysis = {
        success: true,
        venue: {
          place_id: 'venue-123',
          name: 'Basic Venue',
          rating: 4.0,
          // Missing wedding analysis
        },
      };

      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        venueWithoutAnalysis,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('warnings');
      expect(data.warnings).toContain(
        'Wedding-specific analysis unavailable for this venue',
      );
    });

    it('should enforce rate limiting for venue details', async () => {
      // Mock multiple rapid requests for same venue
      mockPlacesSearchService.getVenueDetails
        .mockResolvedValueOnce(mockVenueDetails)
        .mockResolvedValueOnce(mockVenueDetails)
        .mockResolvedValueOnce(mockVenueDetails)
        .mockRejectedValue(new Error('Rate limit exceeded'));

      const requests = Array(5)
        .fill(null)
        .map(() => {
          const req = new NextRequest(
            'http://localhost:3000/api/places/details/venue-123',
          );
          return GET(req, { params: { placeId: 'venue-123' } });
        });

      const responses = await Promise.all(requests);
      const statusCodes = responses.map((r) => r.status);

      expect(statusCodes).toContain(200); // Some successful
      expect(statusCodes).toContain(429); // Some rate limited
    });

    it('should cache venue details appropriately', async () => {
      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        mockVenueDetails,
      );

      // First request
      const request1 = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response1 = await GET(request1, {
        params: { placeId: 'venue-123' },
      });

      // Second identical request
      const request2 = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response2 = await GET(request2, {
        params: { placeId: 'venue-123' },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Should have cache headers
      expect(response2.headers.get('X-Cache-Status')).toBe('HIT');
    });

    it('should handle concurrent requests for same venue efficiently', async () => {
      mockPlacesSearchService.getVenueDetails.mockImplementation(async () => {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return mockVenueDetails;
      });

      const concurrentRequests = Array(10)
        .fill(null)
        .map(() => {
          const req = new NextRequest(
            'http://localhost:3000/api/places/details/venue-123',
          );
          return GET(req, { params: { placeId: 'venue-123' } });
        });

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // Should complete efficiently (not 10x the single request time)
      expect(endTime - startTime).toBeLessThan(500);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Wedding-Specific Features', () => {
    it('should provide wedding capacity insights', async () => {
      const venueWithCapacityInsights = {
        success: true,
        venue: {
          place_id: 'venue-123',
          name: 'Wedding Hall',
          weddingAnalysis: {
            overallScore: 8.5,
            capacityEstimate: {
              ceremony: '100-150 guests',
              reception: '120-180 guests',
              cocktailHour: '150-200 guests',
            },
          },
          weddingInsights: {
            capacityRecommendations: {
              optimal: 125,
              maximum: 180,
              comfortable: 150,
              notes: [
                'Consider dance floor space for larger groups',
                'Outdoor ceremony option increases capacity',
              ],
            },
          },
        },
      };

      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        venueWithCapacityInsights,
      );

      const url = new URL('http://localhost:3000/api/places/details/venue-123');
      url.searchParams.set('guestCount', '140');

      const request = new NextRequest(url);
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(data.venue.weddingInsights.capacityRecommendations).toBeDefined();
      expect(data.venue.weddingInsights.capacityMatch).toContain('140');
    });

    it('should provide seasonal wedding insights', async () => {
      const venueWithSeasonalData = {
        success: true,
        venue: {
          place_id: 'outdoor-venue',
          name: 'Garden Wedding Venue',
          weddingInsights: {
            seasonalConsiderations: [
              'Spring: Perfect for garden ceremonies',
              'Summer: Peak season with premium pricing',
              'Fall: Beautiful foliage, book early',
              'Winter: Limited outdoor options',
            ],
            weatherBackupPlans: [
              'Tent available for outdoor ceremonies',
              'Indoor cocktail space for inclement weather',
            ],
          },
        },
      };

      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        venueWithSeasonalData,
      );

      const url = new URL(
        'http://localhost:3000/api/places/details/outdoor-venue',
      );
      url.searchParams.set('season', 'fall');

      const request = new NextRequest(url);
      const response = await GET(request, {
        params: { placeId: 'outdoor-venue' },
      });
      const data = await response.json();

      expect(data.venue.weddingInsights.seasonalConsiderations).toContain(
        'Fall: Beautiful foliage, book early',
      );
    });

    it('should provide vendor recommendations', async () => {
      const venueWithVendorInfo = {
        success: true,
        venue: {
          place_id: 'venue-123',
          name: 'Full Service Venue',
          weddingInsights: {
            vendorRecommendations: [
              'In-house catering with seasonal menus',
              'Preferred photographer: Jane Smith Photography',
              'Florist partnership: Bloom & Blossom',
              'Live music venue - acoustics excellent',
            ],
            restrictionsAndPolicies: [
              'No outside catering allowed',
              'Music must end by 10 PM',
              'Sparklers permitted outdoors only',
            ],
          },
        },
      };

      mockPlacesSearchService.getVenueDetails.mockResolvedValue(
        venueWithVendorInfo,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/places/details/venue-123',
      );
      const response = await GET(request, { params: { placeId: 'venue-123' } });
      const data = await response.json();

      expect(data.venue.weddingInsights.vendorRecommendations).toContain(
        'In-house catering with seasonal menus',
      );
      expect(data.venue.weddingInsights.restrictionsAndPolicies).toContain(
        'No outside catering allowed',
      );
    });
  });
});
