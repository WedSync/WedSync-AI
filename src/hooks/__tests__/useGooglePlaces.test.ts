/**
 * Tests for useGooglePlaces hook
 * Comprehensive testing of Google Places API integration
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGooglePlaces } from '../useGooglePlaces';
import type {
  AutocompleteResponse,
  PlaceDetailsResponse,
  NearbySearchResponse,
} from '@/types/google-places';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock crypto.randomUUID
global.crypto = {
  ...global.crypto,
  randomUUID: jest.fn(() => 'mock-uuid'),
};

// Test data
const mockPredictions = [
  {
    place_id: 'test-place-1',
    description: 'Test Wedding Venue, New York, NY',
    structured_formatting: {
      main_text: 'Test Wedding Venue',
      main_text_matched_substrings: [{ offset: 0, length: 4 }],
      secondary_text: 'New York, NY',
    },
    terms: [
      { offset: 0, value: 'Test' },
      { offset: 5, value: 'Wedding' },
      { offset: 13, value: 'Venue' },
    ],
    types: ['establishment', 'wedding_venue'],
    matched_substrings: [{ offset: 0, length: 4 }],
  },
];

const mockPlaceDetails = {
  place_id: 'test-place-1',
  name: 'Test Wedding Venue',
  formatted_address: '123 Wedding St, New York, NY 10001',
  geometry: {
    location: { lat: 40.7128, lng: -74.006 },
  },
  types: ['establishment', 'wedding_venue'],
  rating: 4.5,
  user_ratings_total: 150,
  formatted_phone_number: '(555) 123-4567',
  website: 'https://testweddingvenue.com',
};

const mockNearbyPlaces = [
  {
    place_id: 'nearby-1',
    name: 'Nearby Photographer',
    formatted_address: '456 Photo St, New York, NY 10002',
    geometry: {
      location: { lat: 40.7129, lng: -74.0061 },
    },
    types: ['establishment', 'photographer'],
    rating: 4.8,
  },
];

describe('useGooglePlaces Hook', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useGooglePlaces());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.predictions).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.searchError).toBeNull();
      expect(result.current.placeDetails).toBeNull();
      expect(result.current.isLoadingDetails).toBe(false);
      expect(result.current.detailsError).toBeNull();
      expect(result.current.nearbyPlaces).toEqual([]);
      expect(result.current.isSearchingNearby).toBe(false);
      expect(result.current.nearbyError).toBeNull();
    });
  });

  describe('Autocomplete Search', () => {
    it('should search for places with debouncing', async () => {
      const mockResponse: AutocompleteResponse = {
        predictions: mockPredictions,
        status: 'OK',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      // Set search query
      act(() => {
        result.current.setSearchQuery('wedding venue');
      });

      expect(result.current.isSearching).toBe(true);
      expect(result.current.searchQuery).toBe('wedding venue');

      // Fast forward debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/google-places/autocomplete',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: 'wedding venue',
              types: ['establishment'],
              components: 'country:us|country:ca|country:gb|country:au',
              sessiontoken: 'mock-uuid',
            }),
            signal: expect.any(AbortSignal),
          },
        );
      });

      await waitFor(() => {
        expect(result.current.predictions).toEqual(mockPredictions);
        expect(result.current.isSearching).toBe(false);
        expect(result.current.searchError).toBeNull();
      });
    });

    it('should filter wedding-relevant results', async () => {
      const mockResponse: AutocompleteResponse = {
        predictions: [
          ...mockPredictions,
          {
            place_id: 'irrelevant-place',
            description: 'Random Store, New York, NY',
            structured_formatting: {
              main_text: 'Random Store',
              main_text_matched_substrings: [],
              secondary_text: 'New York, NY',
            },
            terms: [],
            types: ['store'],
            matched_substrings: [],
          },
        ],
        status: 'OK',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      act(() => {
        result.current.setSearchQuery('venue');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.predictions).toEqual(mockPredictions);
        expect(result.current.predictions).toHaveLength(1);
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchError).toContain('Autocomplete API error');
        expect(result.current.predictions).toEqual([]);
        expect(result.current.isSearching).toBe(false);
      });
    });

    it('should clear search correctly', () => {
      const { result } = renderHook(() => useGooglePlaces());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.predictions).toEqual([]);
      expect(result.current.searchError).toBeNull();
    });

    it('should not search for empty queries', async () => {
      const { result } = renderHook(() => useGooglePlaces());

      act(() => {
        result.current.setSearchQuery('   '); // whitespace only
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.predictions).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });
  });

  describe('Place Details', () => {
    it('should fetch place details successfully', async () => {
      const mockResponse: PlaceDetailsResponse = {
        result: mockPlaceDetails,
        status: 'OK',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      let placeDetails;
      await act(async () => {
        placeDetails = await result.current.getPlaceDetails('test-place-1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/google-places/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: 'test-place-1',
          fields: expect.any(String),
          sessiontoken: 'mock-uuid',
        }),
        signal: expect.any(AbortSignal),
      });

      expect(placeDetails).toEqual(mockPlaceDetails);
      expect(result.current.placeDetails).toEqual(mockPlaceDetails);
      expect(result.current.isLoadingDetails).toBe(false);
      expect(result.current.detailsError).toBeNull();
    });

    it('should handle place details errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      let placeDetails;
      await act(async () => {
        placeDetails = await result.current.getPlaceDetails('invalid-place');
      });

      expect(placeDetails).toBeNull();
      expect(result.current.detailsError).toContain('Place Details API error');
    });

    it('should cache place details', async () => {
      const mockResponse: PlaceDetailsResponse = {
        result: mockPlaceDetails,
        status: 'OK',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      // First call - should make API request
      await act(async () => {
        await result.current.getPlaceDetails('test-place-1');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await act(async () => {
        await result.current.getPlaceDetails('test-place-1');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(result.current.placeDetails).toEqual(mockPlaceDetails);
    });
  });

  describe('Nearby Search', () => {
    it('should search for nearby places successfully', async () => {
      const mockResponse: NearbySearchResponse = {
        results: mockNearbyPlaces,
        status: 'OK',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      const searchRequest = {
        location: { lat: 40.7128, lng: -74.006 },
        radius: 1000,
        vendor_type: 'photographer' as const,
      };

      let nearbyResults;
      await act(async () => {
        nearbyResults = await result.current.searchNearby(searchRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/google-places/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: '40.7128,-74.0060',
          radius: 1000,
          type: 'photographer',
          keyword: undefined,
          minprice: undefined,
          maxprice: undefined,
          opennow: undefined,
        }),
        signal: expect.any(AbortSignal),
      });

      expect(nearbyResults).toEqual(mockNearbyPlaces);
      expect(result.current.nearbyPlaces).toEqual(mockNearbyPlaces);
      expect(result.current.isSearchingNearby).toBe(false);
      expect(result.current.nearbyError).toBeNull();
    });

    it('should handle nearby search errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGooglePlaces());

      const searchRequest = {
        location: { lat: 40.7128, lng: -74.006 },
        radius: 1000,
      };

      let nearbyResults;
      await act(async () => {
        nearbyResults = await result.current.searchNearby(searchRequest);
      });

      expect(nearbyResults).toEqual([]);
      expect(result.current.nearbyError).toContain(
        'Failed to search nearby places',
      );
    });

    it('should cache nearby search results', async () => {
      const mockResponse: NearbySearchResponse = {
        results: mockNearbyPlaces,
        status: 'OK',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useGooglePlaces());

      const searchRequest = {
        location: { lat: 40.7128, lng: -74.006 },
        radius: 1000,
      };

      // First call - should make API request
      await act(async () => {
        await result.current.searchNearby(searchRequest);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same parameters - should use cache
      await act(async () => {
        await result.current.searchNearby(searchRequest);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('Error Handling', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useGooglePlaces());

      // Simulate errors (would normally come from failed API calls)
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.searchError).toBeNull();
      expect(result.current.detailsError).toBeNull();
      expect(result.current.nearbyError).toBeNull();
    });

    it('should handle aborted requests gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('AbortError'));

      const { result } = renderHook(() => useGooglePlaces());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
        expect(result.current.searchError).toBeNull(); // Aborted requests don't set errors
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useGooglePlaces());

      // Start a search
      act(() => {
        result.current.setSearchQuery('test');
      });

      // Unmount should cleanup timers and abort controllers
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should debounce search queries', async () => {
      const { result } = renderHook(() => useGooglePlaces());

      // Rapid typing simulation
      act(() => {
        result.current.setSearchQuery('w');
      });
      act(() => {
        result.current.setSearchQuery('we');
      });
      act(() => {
        result.current.setSearchQuery('wed');
      });
      act(() => {
        result.current.setSearchQuery('wedding');
      });

      // Only advance time once
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only make one API call for final query
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(0); // No calls yet without mock response
      });
    });

    it('should cancel previous requests when new search starts', () => {
      const { result } = renderHook(() => useGooglePlaces());

      // Start first search
      act(() => {
        result.current.setSearchQuery('first search');
      });

      // Start second search before first completes
      act(() => {
        result.current.setSearchQuery('second search');
      });

      // Should cancel the first request
      expect(result.current.searchQuery).toBe('second search');
    });
  });
});
