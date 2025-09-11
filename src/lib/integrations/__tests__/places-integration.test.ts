/**
 * WS-219 Google Places Integration Tests
 * Team C - Round 1 Implementation
 *
 * Comprehensive integration tests for Google Places wedding sync,
 * venue coordination, and location services.
 */

import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { PlacesWeddingSyncService } from '../places-wedding-sync';
import { PlacesIntegrationService } from '../PlacesIntegrationService';
import { VenueCoordinationService } from '../../services/venue-coordination-service';
import { LocationServicesHub } from '../location-services-hub';

// Mock global fetch
global.fetch = jest.fn();

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(),
      })),
      insert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
      upsert: jest.fn(),
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
    upsert: jest.fn(),
  })),
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Google Places Integration System', () => {
  let placesService: PlacesIntegrationService;
  let placesSync: PlacesWeddingSyncService;
  let venueCoordination: VenueCoordinationService;
  let locationHub: LocationServicesHub;

  const mockConfig = {
    apiUrl: 'https://maps.googleapis.com/maps/api/place',
    timeout: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 100,
  };

  const mockCredentials = {
    apiKey: 'test-google-places-api-key',
    userId: 'test-user',
    organizationId: 'test-org',
  };

  const mockLocationConfig = {
    googleMapsApiKey: 'test-maps-api-key',
    enableRealTimeTraffic: true,
    enableGeofencing: true,
    proximityNotificationRadius: 100,
    routeOptimizationEnabled: true,
    carbonFootprintTracking: true,
    maxWaypoints: 10,
    cacheDuration: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();

    placesService = new PlacesIntegrationService(mockConfig, mockCredentials);
    placesSync = new PlacesWeddingSyncService(
      mockConfig,
      mockCredentials,
      'https://test-supabase-url',
      'test-supabase-key',
    );
    venueCoordination = new VenueCoordinationService(
      'https://test-supabase-url',
      'test-supabase-key',
      placesSync,
    );
    locationHub = new LocationServicesHub(
      'https://test-supabase-url',
      'test-supabase-key',
      mockLocationConfig,
      placesService,
    );
  });

  afterEach(() => {
    locationHub?.cleanup();
  });

  describe('PlacesIntegrationService', () => {
    describe('validateConnection', () => {
      it('validates successful connection to Google Places API', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OK',
              results: [],
            }),
        });

        const isValid = await placesService.validateConnection();
        expect(isValid).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/textsearch/json'),
          expect.objectContaining({
            method: 'GET',
          }),
        );
      });

      it('handles API connection failures', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const isValid = await placesService.validateConnection();
        expect(isValid).toBe(false);
      });

      it('handles invalid API responses', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'REQUEST_DENIED',
              error_message: 'Invalid API key',
            }),
        });

        const isValid = await placesService.validateConnection();
        expect(isValid).toBe(false);
      });
    });

    describe('searchVenues', () => {
      const mockLocation = { latitude: 40.7128, longitude: -74.006 };

      it('searches for wedding venues successfully', async () => {
        const mockVenueData = {
          status: 'OK',
          results: [
            {
              place_id: 'venue-1',
              name: 'Grand Wedding Hall',
              formatted_address: '123 Wedding Ave, NYC',
              geometry: {
                location: { lat: 40.7128, lng: -74.006 },
              },
              rating: 4.5,
              types: ['establishment', 'wedding_venue'],
              photos: [
                {
                  photo_reference: 'photo-ref-1',
                  height: 400,
                  width: 600,
                },
              ],
            },
          ],
        };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVenueData),
        });

        const result = await placesService.searchVenues(mockLocation, 5000, {
          capacity: 100,
          priceRange: 3,
          rating: 4.0,
        });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Grand Wedding Hall');
        expect(result.data[0].rating).toBe(4.5);
      });

      it('filters venues by wedding-specific criteria', async () => {
        const mockSearchResults = {
          status: 'OK',
          results: [
            {
              place_id: 'venue-1',
              name: 'Wedding Palace',
              formatted_address: '123 Wedding Ave',
              geometry: { location: { lat: 40.7128, lng: -74.006 } },
              rating: 4.8,
              types: ['establishment', 'wedding_venue'],
            },
            {
              place_id: 'venue-2',
              name: 'Random Restaurant',
              formatted_address: '456 Food St',
              geometry: { location: { lat: 40.713, lng: -74.007 } },
              rating: 3.2,
              types: ['restaurant'],
            },
          ],
        };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResults),
        });

        const result = await placesService.searchVenues(mockLocation);

        expect(result.success).toBe(true);
        // Should filter and prioritize wedding venues
        expect(result.data[0].name).toBe('Wedding Palace');
      });
    });

    describe('getPlaceDetails', () => {
      it('retrieves detailed venue information', async () => {
        const mockDetailsData = {
          status: 'OK',
          result: {
            place_id: 'venue-1',
            name: 'Grand Wedding Hall',
            formatted_address: '123 Wedding Ave, NYC, NY 10001',
            geometry: {
              location: { lat: 40.7128, lng: -74.006 },
            },
            rating: 4.5,
            formatted_phone_number: '+1 (555) 123-4567',
            website: 'https://grandweddinghall.com',
            types: ['establishment', 'wedding_venue'],
            opening_hours: {
              periods: [
                {
                  open: { day: 1, time: '0900' },
                  close: { day: 1, time: '2200' },
                },
              ],
            },
            reviews: [
              {
                author_name: 'Happy Bride',
                rating: 5,
                text: 'Perfect venue for our wedding!',
                time: 1640995200,
              },
            ],
          },
        };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDetailsData),
        });

        const result = await placesService.getPlaceDetails('venue-1');

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Grand Wedding Hall');
        expect(result.data.phoneNumber).toBe('+1 (555) 123-4567');
        expect(result.data.website).toBe('https://grandweddinghall.com');
        expect(result.data.reviews).toHaveLength(1);
      });
    });
  });

  describe('PlacesWeddingSyncService', () => {
    describe('syncWeddingVenue', () => {
      it('synchronizes venue data with wedding management', async () => {
        const mockSearchCriteria = {
          location: { latitude: 40.7128, longitude: -74.006 },
          radius: 5000,
          minCapacity: 100,
          priceLevel: 3,
          minRating: 4.0,
        };

        // Mock Places API responses
        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                results: [
                  {
                    place_id: 'venue-1',
                    name: 'Test Venue',
                    formatted_address: '123 Test St',
                    geometry: { location: { lat: 40.7128, lng: -74.006 } },
                    rating: 4.5,
                    types: ['establishment'],
                  },
                ],
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                result: {
                  place_id: 'venue-1',
                  name: 'Test Venue',
                  formatted_address: '123 Test St',
                  geometry: { location: { lat: 40.7128, lng: -74.006 } },
                  rating: 4.5,
                  types: ['establishment'],
                },
              }),
          });

        // Mock database responses
        mockSupabaseClient.from().upsert.mockResolvedValueOnce({ error: null });
        mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

        const result = await placesSync.syncWeddingVenue(
          'wedding-1',
          mockSearchCriteria,
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Test Venue');
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('wedding_venues');
      });

      it('handles sync failures gracefully', async () => {
        const mockSearchCriteria = {
          location: { latitude: 40.7128, longitude: -74.006 },
          radius: 5000,
        };

        (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

        const result = await placesSync.syncWeddingVenue(
          'wedding-1',
          mockSearchCriteria,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Google Places venue search failed');
      });
    });

    describe('handleVenueSelection', () => {
      it('coordinates venue selection across systems', async () => {
        const selectedDate = new Date('2024-06-15T14:00:00Z');

        // Mock database responses
        mockSupabaseClient
          .from()
          .select()
          .eq()
          .single.mockResolvedValueOnce({
            data: {
              id: 'venue-1',
              name: 'Test Venue',
              address: '123 Test St',
              location: { latitude: 40.7128, longitude: -74.006 },
              integrationMetadata: {
                googlePlaceId: 'place-1',
                lastSyncAt: new Date(),
                syncVersion: 1,
                dataSource: 'google_places',
              },
            },
            error: null,
          });

        mockSupabaseClient
          .from()
          .update()
          .eq.mockResolvedValueOnce({ error: null });
        mockSupabaseClient.from().select().eq.mockResolvedValueOnce({
          data: [],
          error: null,
        });
        mockSupabaseClient.from().upsert.mockResolvedValueOnce({ error: null });
        mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

        const result = await placesSync.handleVenueSelection(
          'wedding-1',
          'venue-1',
          selectedDate,
        );

        expect(result.success).toBe(true);
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('weddings');
      });
    });

    describe('calculateSupplierTravelTimes', () => {
      it('calculates travel times between suppliers and venue', async () => {
        // Mock suppliers data
        mockSupabaseClient
          .from()
          .select()
          .eq.mockResolvedValueOnce({
            data: [
              {
                id: 'supplier-1',
                name: 'Test Photographer',
                location: { lat: 40.72, lng: -74.01 },
              },
            ],
            error: null,
          });

        // Mock venue data
        const mockVenueLocation = { latitude: 40.7128, longitude: -74.006 };
        jest.spyOn(placesSync as any, 'getWeddingVenue').mockResolvedValueOnce({
          id: 'venue-1',
          location: mockVenueLocation,
        });

        mockSupabaseClient.from().upsert.mockResolvedValueOnce({ error: null });

        const result = await placesSync.calculateSupplierTravelTimes(
          'wedding-1',
          'venue-1',
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('supplier-1');
        expect(typeof result.data['supplier-1']).toBe('number');
      });
    });
  });

  describe('VenueCoordinationService', () => {
    describe('processVenueChangeRequest', () => {
      it('processes venue change requests with coordination', async () => {
        const changeRequest = {
          id: 'request-1',
          weddingId: 'wedding-1',
          requestedBy: 'coordinator-1',
          changeType: 'venue_change' as const,
          currentVenue: {
            venueId: 'venue-1',
            date: new Date('2024-06-15'),
            capacity: 100,
          },
          proposedVenue: {
            venueId: 'venue-2',
            date: new Date('2024-06-20'),
            capacity: 150,
          },
          reason: 'Better availability',
          impact: {
            suppliersAffected: ['supplier-1', 'supplier-2'],
            timelinesAffected: ['timeline-1'],
            estimatedCost: 500,
          },
          status: 'pending' as const,
          approvals: [],
          createdAt: new Date(),
        };

        // Mock database responses
        mockSupabaseClient
          .from()
          .insert()
          .select()
          .single.mockResolvedValueOnce({
            data: { ...changeRequest, id: 'stored-request-1' },
            error: null,
          });

        mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
          data: [],
          error: null,
        });

        const result =
          await venueCoordination.processVenueChangeRequest(changeRequest);

        expect(result.success).toBe(true);
        expect(result.requestId).toBe('stored-request-1');
      });

      it('detects and handles venue conflicts', async () => {
        const conflictingRequest = {
          id: 'request-2',
          weddingId: 'wedding-1',
          requestedBy: 'coordinator-1',
          changeType: 'venue_change' as const,
          proposedVenue: {
            venueId: 'venue-1',
            date: new Date('2024-06-15'),
            capacity: 100,
          },
          reason: 'Schedule conflict',
          impact: {
            suppliersAffected: [],
            timelinesAffected: [],
            estimatedCost: 0,
          },
          status: 'pending' as const,
          approvals: [],
          createdAt: new Date(),
        };

        // Mock existing booking conflict
        mockSupabaseClient
          .from()
          .insert()
          .select()
          .single.mockResolvedValueOnce({
            data: { ...conflictingRequest, id: 'conflict-request-1' },
            error: null,
          });

        mockSupabaseClient
          .from()
          .select()
          .eq()
          .neq.mockResolvedValueOnce({
            data: [
              {
                id: 'existing-wedding',
                couple_name: 'John & Jane',
                venue_date: '2024-06-15T14:00:00Z',
              },
            ],
            error: null,
          });

        const result =
          await venueCoordination.processVenueChangeRequest(conflictingRequest);

        expect(result.success).toBe(false);
        expect(result.conflicts).toBeDefined();
        expect(result.conflicts![0].conflictType).toBe('double_booking');
        expect(result.conflicts![0].severity).toBe('critical');
      });
    });

    describe('detectVenueConflicts', () => {
      it('identifies double booking conflicts', async () => {
        const request = {
          weddingId: 'wedding-1',
          proposedVenue: {
            venueId: 'venue-1',
            date: new Date('2024-06-15'),
            capacity: 100,
          },
        } as any;

        // Mock existing booking
        mockSupabaseClient
          .from()
          .select()
          .eq()
          .eq()
          .neq.mockResolvedValueOnce({
            data: [
              {
                id: 'existing-wedding',
                couple_name: 'Existing Couple',
                venue_date: '2024-06-15T00:00:00Z',
              },
            ],
            error: null,
          });

        mockSupabaseClient.from().select().eq.mockResolvedValueOnce({
          data: [],
          error: null,
        });

        const conflicts = await venueCoordination.detectVenueConflicts(request);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].conflictType).toBe('double_booking');
        expect(conflicts[0].severity).toBe('critical');
      });
    });
  });

  describe('LocationServicesHub', () => {
    describe('calculateRoute', () => {
      it('calculates routes using Google Directions API', async () => {
        const origin = { latitude: 40.7128, longitude: -74.006 };
        const destination = { latitude: 40.7589, longitude: -73.9851 };

        const mockDirectionsResponse = {
          status: 'OK',
          routes: [
            {
              legs: [
                {
                  distance: { value: 5000 },
                  duration: { value: 1200 },
                  steps: [
                    {
                      html_instructions: 'Head north on <b>Broadway</b>',
                      distance: { value: 1000 },
                      duration: { value: 300 },
                      start_location: { lat: 40.7128, lng: -74.006 },
                      end_location: { lat: 40.715, lng: -74.006 },
                    },
                  ],
                },
              ],
              overview_polyline: { points: 'encoded-polyline-data' },
            },
          ],
        };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDirectionsResponse),
        });

        mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

        const result = await locationHub.calculateRoute(origin, destination);

        expect(result.success).toBe(true);
        expect(result.route?.distance).toBe(5000);
        expect(result.route?.duration).toBe(1200);
        expect(result.route?.steps).toHaveLength(1);
      });

      it('handles route calculation errors', async () => {
        const origin = { latitude: 40.7128, longitude: -74.006 };
        const destination = { latitude: 40.7589, longitude: -73.9851 };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'NOT_FOUND',
              error_message: 'No route found',
            }),
        });

        const result = await locationHub.calculateRoute(origin, destination);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Google Directions API error');
      });
    });

    describe('optimizeSupplierRoutes', () => {
      it('optimizes supplier arrival times and routes', async () => {
        const venueLocation = { latitude: 40.7128, longitude: -74.006 };
        const timeWindow = {
          start: new Date('2024-06-15T10:00:00Z'),
          end: new Date('2024-06-15T12:00:00Z'),
        };

        // Mock supplier data
        mockSupabaseClient
          .from()
          .select()
          .eq.mockResolvedValueOnce({
            data: [
              {
                id: 'supplier-1',
                name: 'Wedding Photographer',
                service_type: 'photography',
                location: { lat: 40.72, lng: -74.01 },
              },
              {
                id: 'supplier-2',
                name: 'Catering Service',
                service_type: 'catering',
                location: { lat: 40.71, lng: -74.008 },
              },
            ],
            error: null,
          });

        // Mock route calculations
        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                routes: [
                  {
                    legs: [
                      {
                        distance: { value: 2000 },
                        duration: { value: 600 },
                      },
                    ],
                  },
                ],
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                routes: [
                  {
                    legs: [
                      {
                        distance: { value: 1500 },
                        duration: { value: 450 },
                      },
                    ],
                  },
                ],
              }),
          });

        mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

        const result = await locationHub.optimizeSupplierRoutes(
          'wedding-1',
          venueLocation,
          timeWindow,
        );

        expect(result.success).toBe(true);
        expect(result.optimization?.participants).toHaveLength(2);
        expect(result.optimization?.optimizedRoutes).toHaveLength(2);
        expect(result.optimization?.totalDistance).toBeGreaterThan(0);
      });
    });

    describe('setupGeofencing', () => {
      it('creates geofence zones for venue monitoring', async () => {
        const zones = [
          {
            name: 'Venue Entrance',
            weddingId: 'wedding-1',
            center: { latitude: 40.7128, longitude: -74.006 },
            radius: 100,
            type: 'venue' as const,
            active: true,
            notifications: {
              onEntry: true,
              onExit: false,
              notifySuppliers: ['supplier-1'],
            },
            metadata: { description: 'Main venue entrance' },
          },
        ];

        mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });
        mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

        const result = await locationHub.setupGeofencing('wedding-1', zones);

        expect(result.success).toBe(true);
        expect(result.geofenceIds).toHaveLength(1);
      });
    });

    describe('processLocationUpdate', () => {
      it('triggers proximity alerts for geofence entry', async () => {
        const location = { latitude: 40.7128, longitude: -74.006 };

        // Set up active geofence
        const mockGeofence = {
          id: 'geofence-1',
          name: 'Test Venue',
          weddingId: 'wedding-1',
          center: { latitude: 40.7128, longitude: -74.006 },
          radius: 50,
          type: 'venue',
          active: true,
          notifications: {
            onEntry: true,
            onExit: false,
            notifySuppliers: [],
          },
          metadata: {},
          createdAt: new Date(),
        };

        // Mock geofence data
        jest
          .spyOn(locationHub as any, 'activeGeofences', 'get')
          .mockReturnValue(new Map([['geofence-1', mockGeofence]]));

        // Mock database responses
        mockSupabaseClient
          .from()
          .select()
          .eq()
          .eq()
          .single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' }, // Not found
          });

        mockSupabaseClient
          .from()
          .insert.mockResolvedValueOnce({ error: null }) // proximity alert
          .mockResolvedValueOnce({ error: null }); // location history

        const result = await locationHub.processLocationUpdate(
          'wedding-1',
          'supplier-1',
          location,
        );

        expect(result.success).toBe(true);
        expect(result.alerts).toHaveLength(1);
        expect(result.alerts![0].alertType).toBe('entry');
      });
    });
  });

  describe('Integration Health Checks', () => {
    it('performs health checks for all services', async () => {
      // Mock successful API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'OK' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'OK', routes: [] }),
        });

      mockSupabaseClient
        .from()
        .select()
        .limit.mockResolvedValueOnce({
          data: [{ id: 'test' }],
          error: null,
        });

      const placesHealth = await placesService.validateConnection();
      const syncHealth = await placesSync.healthCheck();
      const coordinationHealth = await venueCoordination.healthCheck();
      const locationHealth = await locationHub.healthCheck();

      expect(placesHealth).toBe(true);
      expect(syncHealth.status).toBe('healthy');
      expect(coordinationHealth.status).toBe('healthy');
      expect(locationHealth.status).toBe('healthy');
    });

    it('detects service degradation', async () => {
      // Mock API failure
      (fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Service unavailable'),
      );

      // Mock database connection success
      mockSupabaseClient
        .from()
        .select()
        .limit.mockResolvedValueOnce({
          data: [{ id: 'test' }],
          error: null,
        });

      const syncHealth = await placesSync.healthCheck();

      expect(syncHealth.status).toBe('degraded');
      expect(syncHealth.details.placesConnection).toBe(false);
      expect(syncHealth.details.supabaseConnection).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('handles API rate limiting gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error_message: 'You have exceeded your rate-limit',
          }),
      });

      const result = await placesService.searchVenues({
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('implements retry logic for transient failures', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OK',
              results: [],
            }),
        });

      const result = await placesService.searchVenues({
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('validates input parameters', async () => {
      const invalidLocation = { latitude: 91, longitude: -200 }; // Invalid coordinates

      await expect(placesService.searchVenues(invalidLocation)).rejects.toThrow(
        'Invalid latitude value',
      );
    });
  });

  describe('Performance and Caching', () => {
    it('caches venue search results', async () => {
      const location = { latitude: 40.7128, longitude: -74.006 };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [{ place_id: 'venue-1', name: 'Test Venue' }],
          }),
      });

      // First call should hit API
      const result1 = await placesService.searchVenues(location);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await placesService.searchVenues(location);
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('manages cache size limits', async () => {
      // Test that cache doesn't grow indefinitely
      const locationHub = new LocationServicesHub(
        'https://test-supabase-url',
        'test-supabase-key',
        { ...mockLocationConfig, cacheDuration: 1 },
      );

      // Add many routes to trigger cleanup
      for (let i = 0; i < 600; i++) {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OK',
              routes: [
                {
                  legs: [
                    { distance: { value: 1000 }, duration: { value: 300 } },
                  ],
                },
              ],
            }),
        });

        await locationHub.calculateRoute(
          { latitude: 40.7128 + i * 0.001, longitude: -74.006 },
          { latitude: 40.7589, longitude: -73.9851 },
        );
      }

      // Cache should have been cleaned up
      const cacheSize = (locationHub as any).routeCache.size;
      expect(cacheSize).toBeLessThan(600);

      locationHub.cleanup();
    });
  });

  describe('Data Integration and Consistency', () => {
    it('maintains data consistency across services', async () => {
      const weddingId = 'wedding-1';
      const venueId = 'venue-1';
      const selectedDate = new Date('2024-06-15T14:00:00Z');

      // Mock successful venue selection
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            id: venueId,
            name: 'Test Venue',
            address: '123 Test St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
          error: null,
        });

      mockSupabaseClient
        .from()
        .update()
        .eq.mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      mockSupabaseClient
        .from()
        .select()
        .eq.mockResolvedValueOnce({ data: [], error: null });

      mockSupabaseClient.from().upsert.mockResolvedValueOnce({ error: null });

      mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

      const result = await placesSync.handleVenueSelection(
        weddingId,
        venueId,
        selectedDate,
      );

      expect(result.success).toBe(true);

      // Verify database updates
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weddings');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wedding_timeline');
    });
  });
});
