import { describe, test, expect, beforeEach, afterEach } from 'vitest';

interface GeoCoordinates {
  lat: number;
  lng: number;
}

interface LocationSearchQuery {
  location?: string;                    // Text location "New York, NY"
  coordinates?: GeoCoordinates;         // Lat/lng coordinates
  radius?: number;                      // Search radius in miles
  searchTerm?: string;                  // What to search for
  sortBy?: 'distance' | 'relevance' | 'rating';
  includeNearbyAreas?: boolean;         // Expand to nearby cities/areas
  locationTypes?: ('city' | 'state' | 'zip' | 'neighborhood' | 'venue')[];
}

interface LocationSearchResult {
  vendor: {
    id: string;
    name: string;
    type: string;
    rating: number;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: GeoCoordinates;
  };
  distance: number;                     // Distance in miles
  locationMatch: {
    type: 'exact' | 'nearby' | 'expanded';
    matchedLocation: string;
    confidence: number;
  };
}

interface LocationData {
  name: string;
  coordinates: GeoCoordinates;
  type: 'city' | 'state' | 'zip' | 'neighborhood';
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  aliases: string[];                    // Alternative names/spellings
  nearbyAreas: string[];               // Adjacent cities/areas
}

// Mock location database
const LOCATION_DATABASE: LocationData[] = [
  {
    name: 'New York, NY',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    type: 'city',
    bounds: { north: 40.9176, south: 40.4774, east: -73.7004, west: -74.2591 },
    aliases: ['NYC', 'New York City', 'Manhattan'],
    nearbyAreas: ['Brooklyn, NY', 'Queens, NY', 'Bronx, NY', 'Staten Island, NY', 'Jersey City, NJ']
  },
  {
    name: 'Los Angeles, CA',
    coordinates: { lat: 34.0522, lng: -118.2437 },
    type: 'city',
    bounds: { north: 34.8233, south: 33.7037, east: -117.6457, west: -118.6681 },
    aliases: ['LA', 'Los Angeles County'],
    nearbyAreas: ['Beverly Hills, CA', 'Santa Monica, CA', 'Hollywood, CA', 'Pasadena, CA']
  },
  {
    name: 'Brooklyn, NY',
    coordinates: { lat: 40.6782, lng: -73.9442 },
    type: 'neighborhood',
    bounds: { north: 40.7394, south: 40.5707, east: -73.8333, west: -74.0420 },
    aliases: ['Brooklyn Borough'],
    nearbyAreas: ['New York, NY', 'Queens, NY', 'Staten Island, NY']
  },
  {
    name: 'Chicago, IL',
    coordinates: { lat: 41.8781, lng: -87.6298 },
    type: 'city',
    bounds: { north: 42.0230, south: 41.6445, east: -87.5244, west: -87.9404 },
    aliases: ['Chi-town', 'The Windy City'],
    nearbyAreas: ['Evanston, IL', 'Oak Park, IL', 'Naperville, IL']
  },
  {
    name: '10001',
    coordinates: { lat: 40.7505, lng: -73.9934 },
    type: 'zip',
    bounds: { north: 40.7563, south: 40.7447, east: -73.9851, west: -74.0017 },
    aliases: ['Chelsea', 'Midtown Manhattan'],
    nearbyAreas: ['10011', '10018', '10019']
  }
];

// Mock vendor data with locations
const MOCK_VENDORS = [
  {
    id: '1',
    name: 'Elite Wedding Photography',
    type: 'photographer',
    rating: 4.8,
    address: '123 Fifth Avenue',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    coordinates: { lat: 40.7505, lng: -73.9934 }
  },
  {
    id: '2',
    name: 'Brooklyn Loft Venue',
    type: 'venue',
    rating: 4.6,
    address: '456 Brooklyn Heights Promenade',
    city: 'Brooklyn',
    state: 'NY',
    zipCode: '11201',
    coordinates: { lat: 40.6959, lng: -73.9969 }
  },
  {
    id: '3',
    name: 'Central Park Photography',
    type: 'photographer',
    rating: 4.7,
    address: '789 Central Park West',
    city: 'New York',
    state: 'NY',
    zipCode: '10024',
    coordinates: { lat: 40.7829, lng: -73.9654 }
  },
  {
    id: '4',
    name: 'LA Wedding Venues',
    type: 'venue',
    rating: 4.5,
    address: '321 Beverly Hills Drive',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    coordinates: { lat: 34.0736, lng: -118.4004 }
  },
  {
    id: '5',
    name: 'Queens Catering Co',
    type: 'caterer',
    rating: 4.4,
    address: '654 Queens Boulevard',
    city: 'Queens',
    state: 'NY',
    zipCode: '11377',
    coordinates: { lat: 40.7308, lng: -73.8786 }
  }
];

// Location search service implementation
class LocationSearchService {
  // Calculate distance between two points using Haversine formula
  private calculateDistance(point1: GeoCoordinates, point2: GeoCoordinates): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Geocode location string to coordinates
  private geocodeLocation(location: string): GeoCoordinates | null {
    const normalizedLocation = location.toLowerCase().trim();
    
    for (const locationData of LOCATION_DATABASE) {
      if (locationData.name.toLowerCase() === normalizedLocation ||
          locationData.aliases.some(alias => alias.toLowerCase() === normalizedLocation)) {
        return locationData.coordinates;
      }
    }
    
    return null;
  }

  // Get location information
  private getLocationData(location: string): LocationData | null {
    const normalizedLocation = location.toLowerCase().trim();
    
    return LOCATION_DATABASE.find(loc => 
      loc.name.toLowerCase() === normalizedLocation ||
      loc.aliases.some(alias => alias.toLowerCase() === normalizedLocation)
    ) || null;
  }

  // Check if point is within bounds
  private isWithinBounds(point: GeoCoordinates, bounds: LocationData['bounds']): boolean {
    return point.lat >= bounds.south && point.lat <= bounds.north &&
           point.lng >= bounds.west && point.lng <= bounds.east;
  }

  async searchByLocation(query: LocationSearchQuery): Promise<{
    results: LocationSearchResult[];
    searchCenter: GeoCoordinates | null;
    searchRadius: number;
    totalFound: number;
  }> {
    let searchCenter: GeoCoordinates | null = null;
    let searchRadius = query.radius || 25; // Default 25 miles

    // Determine search center
    if (query.coordinates) {
      searchCenter = query.coordinates;
    } else if (query.location) {
      searchCenter = this.geocodeLocation(query.location);
      if (!searchCenter) {
        return { results: [], searchCenter: null, searchRadius, totalFound: 0 };
      }
    } else {
      return { results: [], searchCenter: null, searchRadius, totalFound: 0 };
    }

    const locationData = query.location ? this.getLocationData(query.location) : null;
    const results: LocationSearchResult[] = [];

    // Search through vendors
    for (const vendor of MOCK_VENDORS) {
      let include = false;
      let matchType: 'exact' | 'nearby' | 'expanded' = 'nearby';
      let matchedLocation = '';
      let confidence = 0;

      // Calculate distance
      const distance = this.calculateDistance(searchCenter, vendor.coordinates);

      // Check if vendor matches location criteria
      if (query.location && locationData) {
        // Exact location match
        if (vendor.city.toLowerCase() === query.location.toLowerCase() ||
            `${vendor.city}, ${vendor.state}`.toLowerCase() === query.location.toLowerCase()) {
          include = true;
          matchType = 'exact';
          matchedLocation = `${vendor.city}, ${vendor.state}`;
          confidence = 1.0;
        }
        // Within bounds of searched location
        else if (this.isWithinBounds(vendor.coordinates, locationData.bounds)) {
          include = true;
          matchType = 'exact';
          matchedLocation = locationData.name;
          confidence = 0.9;
        }
        // Within radius
        else if (distance <= searchRadius) {
          include = true;
          matchType = 'nearby';
          matchedLocation = `${vendor.city}, ${vendor.state}`;
          confidence = Math.max(0.5, 1 - (distance / searchRadius));
        }
        // Nearby areas (if enabled)
        else if (query.includeNearbyAreas && locationData.nearbyAreas.includes(`${vendor.city}, ${vendor.state}`)) {
          include = true;
          matchType = 'expanded';
          matchedLocation = `${vendor.city}, ${vendor.state}`;
          confidence = 0.6;
        }
      } else {
        // Coordinate-based search - just use radius
        if (distance <= searchRadius) {
          include = true;
          matchType = 'nearby';
          matchedLocation = `${vendor.city}, ${vendor.state}`;
          confidence = Math.max(0.3, 1 - (distance / searchRadius));
        }
      }

      // Apply search term filter if provided
      if (include && query.searchTerm) {
        const searchLower = query.searchTerm.toLowerCase();
        const nameMatch = vendor.name.toLowerCase().includes(searchLower);
        const typeMatch = vendor.type.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !typeMatch) {
          include = false;
        }
      }

      if (include) {
        results.push({
          vendor,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          locationMatch: {
            type: matchType,
            matchedLocation,
            confidence
          }
        });
      }
    }

    // Sort results
    if (query.sortBy === 'distance') {
      results.sort((a, b) => a.distance - b.distance);
    } else if (query.sortBy === 'rating') {
      results.sort((a, b) => b.vendor.rating - a.vendor.rating);
    } else {
      // Sort by relevance (combination of distance and confidence)
      results.sort((a, b) => {
        const aScore = a.locationMatch.confidence * 0.6 + (1 - Math.min(a.distance / 50, 1)) * 0.4;
        const bScore = b.locationMatch.confidence * 0.6 + (1 - Math.min(b.distance / 50, 1)) * 0.4;
        return bScore - aScore;
      });
    }

    return {
      results,
      searchCenter,
      searchRadius,
      totalFound: results.length
    };
  }

  // Get suggestions for location autocomplete
  async getLocationSuggestions(input: string): Promise<{
    suggestions: Array<{
      name: string;
      type: string;
      coordinates: GeoCoordinates;
    }>;
  }> {
    const inputLower = input.toLowerCase().trim();
    const suggestions: Array<{ name: string; type: string; coordinates: GeoCoordinates }> = [];

    if (inputLower.length < 2) {
      return { suggestions: [] };
    }

    for (const location of LOCATION_DATABASE) {
      if (location.name.toLowerCase().includes(inputLower) ||
          location.aliases.some(alias => alias.toLowerCase().includes(inputLower))) {
        suggestions.push({
          name: location.name,
          type: location.type,
          coordinates: location.coordinates
        });
      }
    }

    return { suggestions: suggestions.slice(0, 8) };
  }
}

describe('WS-248: Advanced Search System - Location Search Tests', () => {
  let locationSearchService: LocationSearchService;

  beforeEach(() => {
    locationSearchService = new LocationSearchService();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Basic Location Search Functionality', () => {
    test('should find vendors by city name', async () => {
      const result = await locationSearchService.searchByLocation({
        location: 'New York, NY'
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.searchCenter).not.toBeNull();
      expect(result.searchCenter?.lat).toBeCloseTo(40.7128, 2);
      expect(result.searchCenter?.lng).toBeCloseTo(-74.0060, 2);

      // Should include NYC vendors
      const nycVendors = result.results.filter(r => 
        r.vendor.city === 'New York' && r.vendor.state === 'NY'
      );
      expect(nycVendors.length).toBeGreaterThan(0);
    });

    test('should find vendors by coordinates', async () => {
      const result = await locationSearchService.searchByLocation({
        coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates
        radius: 10
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.searchCenter).toEqual({ lat: 40.7128, lng: -74.0060 });

      // All results should be within 10 miles
      result.results.forEach(vendor => {
        expect(vendor.distance).toBeLessThanOrEqual(10);
      });
    });

    test('should calculate accurate distances', async () => {
      const result = await locationSearchService.searchByLocation({
        coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates
        radius: 50
      });

      result.results.forEach(vendor => {
        expect(vendor.distance).toBeGreaterThanOrEqual(0);
        expect(typeof vendor.distance).toBe('number');
        expect(vendor.distance).toBe(Math.round(vendor.distance * 100) / 100); // Should be rounded to 2 decimals
      });
    });

    test('should respect search radius limits', async () => {
      const smallRadiusResult = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        radius: 5
      });

      const largeRadiusResult = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        radius: 50
      });

      expect(largeRadiusResult.results.length).toBeGreaterThanOrEqual(smallRadiusResult.results.length);

      smallRadiusResult.results.forEach(vendor => {
        expect(vendor.distance).toBeLessThanOrEqual(5);
      });

      largeRadiusResult.results.forEach(vendor => {
        expect(vendor.distance).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Location Matching and Geocoding', () => {
    test('should handle location aliases correctly', async () => {
      const nycResult = await locationSearchService.searchByLocation({
        location: 'NYC'
      });

      const newYorkResult = await locationSearchService.searchByLocation({
        location: 'New York, NY'
      });

      expect(nycResult.searchCenter).toEqual(newYorkResult.searchCenter);
      expect(nycResult.results.length).toBe(newYorkResult.results.length);
    });

    test('should handle zip code searches', async () => {
      const result = await locationSearchService.searchByLocation({
        location: '10001'
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.searchCenter).not.toBeNull();

      // Should find vendors in or near that zip code
      const vendorsInZip = result.results.filter(r => r.vendor.zipCode === '10001');
      expect(vendorsInZip.length).toBeGreaterThan(0);
    });

    test('should return empty results for unknown locations', async () => {
      const result = await locationSearchService.searchByLocation({
        location: 'Unknown City, ZZ'
      });

      expect(result.results).toHaveLength(0);
      expect(result.searchCenter).toBeNull();
      expect(result.totalFound).toBe(0);
    });

    test('should differentiate between exact and nearby matches', async () => {
      const result = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        radius: 50
      });

      const exactMatches = result.results.filter(r => r.locationMatch.type === 'exact');
      const nearbyMatches = result.results.filter(r => r.locationMatch.type === 'nearby');

      expect(exactMatches.length).toBeGreaterThan(0);
      
      exactMatches.forEach(match => {
        expect(match.locationMatch.confidence).toBeGreaterThan(0.8);
      });

      if (nearbyMatches.length > 0) {
        nearbyMatches.forEach(match => {
          expect(match.locationMatch.confidence).toBeLessThan(1.0);
        });
      }
    });
  });

  describe('Advanced Location Features', () => {
    test('should expand search to nearby areas when enabled', async () => {
      const withNearbyResult = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        includeNearbyAreas: true,
        radius: 10
      });

      const withoutNearbyResult = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        includeNearbyAreas: false,
        radius: 10
      });

      expect(withNearbyResult.results.length).toBeGreaterThanOrEqual(withoutNearbyResult.results.length);

      const expandedMatches = withNearbyResult.results.filter(r => r.locationMatch.type === 'expanded');
      if (expandedMatches.length > 0) {
        expandedMatches.forEach(match => {
          expect(match.locationMatch.confidence).toBeGreaterThan(0.5);
        });
      }
    });

    test('should combine location and search term filters', async () => {
      const photographerResult = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        searchTerm: 'photographer'
      });

      const venueResult = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        searchTerm: 'venue'
      });

      photographerResult.results.forEach(result => {
        const matchesSearchTerm = result.vendor.name.toLowerCase().includes('photographer') ||
                                 result.vendor.type.toLowerCase().includes('photographer');
        expect(matchesSearchTerm).toBe(true);
      });

      venueResult.results.forEach(result => {
        const matchesSearchTerm = result.vendor.name.toLowerCase().includes('venue') ||
                                 result.vendor.type.toLowerCase().includes('venue');
        expect(matchesSearchTerm).toBe(true);
      });
    });

    test('should sort results correctly by different criteria', async () => {
      const baseQuery = {
        location: 'New York, NY',
        radius: 50
      };

      const distanceResult = await locationSearchService.searchByLocation({
        ...baseQuery,
        sortBy: 'distance' as const
      });

      const ratingResult = await locationSearchService.searchByLocation({
        ...baseQuery,
        sortBy: 'rating' as const
      });

      // Check distance sorting
      if (distanceResult.results.length > 1) {
        for (let i = 1; i < distanceResult.results.length; i++) {
          expect(distanceResult.results[i].distance).toBeGreaterThanOrEqual(
            distanceResult.results[i - 1].distance
          );
        }
      }

      // Check rating sorting
      if (ratingResult.results.length > 1) {
        for (let i = 1; i < ratingResult.results.length; i++) {
          expect(ratingResult.results[i].vendor.rating).toBeLessThanOrEqual(
            ratingResult.results[i - 1].vendor.rating
          );
        }
      }
    });
  });

  describe('Location Suggestions and Autocomplete', () => {
    test('should provide location suggestions for partial input', async () => {
      const result = await locationSearchService.getLocationSuggestions('New');

      expect(result.suggestions.length).toBeGreaterThan(0);
      
      const newYorkSuggestion = result.suggestions.find(s => 
        s.name.includes('New York')
      );
      expect(newYorkSuggestion).toBeDefined();
      expect(newYorkSuggestion?.coordinates).toBeDefined();
    });

    test('should handle case-insensitive location suggestions', async () => {
      const lowerResult = await locationSearchService.getLocationSuggestions('new york');
      const upperResult = await locationSearchService.getLocationSuggestions('NEW YORK');
      const mixedResult = await locationSearchService.getLocationSuggestions('New York');

      expect(lowerResult.suggestions.length).toBe(upperResult.suggestions.length);
      expect(upperResult.suggestions.length).toBe(mixedResult.suggestions.length);
    });

    test('should limit number of location suggestions', async () => {
      const result = await locationSearchService.getLocationSuggestions('New');

      expect(result.suggestions.length).toBeLessThanOrEqual(8);
    });

    test('should return empty suggestions for very short input', async () => {
      const result = await locationSearchService.getLocationSuggestions('N');

      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('Geographic Accuracy and Validation', () => {
    test('should calculate distances with reasonable accuracy', async () => {
      // Test known distances between major cities
      const nycCoords = { lat: 40.7128, lng: -74.0060 };
      const laCoords = { lat: 34.0522, lng: -118.2437 };

      const result = await locationSearchService.searchByLocation({
        coordinates: nycCoords,
        radius: 3000 // Large radius to include LA
      });

      const laVendor = result.results.find(r => r.vendor.city === 'Los Angeles');
      if (laVendor) {
        // NYC to LA is approximately 2,445 miles
        expect(laVendor.distance).toBeGreaterThan(2000);
        expect(laVendor.distance).toBeLessThan(3000);
      }
    });

    test('should handle edge cases with coordinates', async () => {
      const edgeCases = [
        { lat: 0, lng: 0 },        // Equator/Prime Meridian
        { lat: 90, lng: 0 },       // North Pole
        { lat: -90, lng: 0 },      // South Pole
        { lat: 40.7128, lng: 180 }, // Date line
      ];

      for (const coords of edgeCases) {
        const result = await locationSearchService.searchByLocation({
          coordinates: coords,
          radius: 1000
        });

        expect(result.searchCenter).toEqual(coords);
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      }
    });

    test('should validate coordinate ranges', async () => {
      // These should work without throwing errors
      const validCoords = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: -33.8688, lng: 151.2093 }, // Sydney
        { lat: 51.5074, lng: -0.1278 },   // London
      ];

      for (const coords of validCoords) {
        const result = await locationSearchService.searchByLocation({
          coordinates: coords,
          radius: 10
        });

        expect(result.searchCenter).toEqual(coords);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large radius searches efficiently', async () => {
      const startTime = Date.now();
      
      const result = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        radius: 1000 // Very large radius
      });

      const searchTime = Date.now() - startTime;
      expect(searchTime).toBeLessThan(500); // Should complete within 500ms

      expect(result.results).toBeDefined();
      expect(result.totalFound).toBeGreaterThanOrEqual(result.results.length);
    });

    test('should handle empty search parameters gracefully', async () => {
      const result = await locationSearchService.searchByLocation({});

      expect(result.results).toHaveLength(0);
      expect(result.searchCenter).toBeNull();
      expect(result.totalFound).toBe(0);
    });

    test('should handle malformed location strings', async () => {
      const malformedLocations = [
        '',
        '   ',
        'Invalid, Location, Name',
        '12345 This Is Not A Place',
        'City, State, Country, Extra'
      ];

      for (const location of malformedLocations) {
        const result = await locationSearchService.searchByLocation({
          location
        });

        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      }
    });

    test('should maintain consistent results for identical queries', async () => {
      const query = {
        location: 'New York, NY',
        radius: 25,
        sortBy: 'distance' as const
      };

      const result1 = await locationSearchService.searchByLocation(query);
      const result2 = await locationSearchService.searchByLocation(query);

      expect(result1.results.length).toBe(result2.results.length);
      expect(result1.searchCenter).toEqual(result2.searchCenter);
      
      result1.results.forEach((result, index) => {
        expect(result.vendor.id).toBe(result2.results[index].vendor.id);
        expect(result.distance).toBe(result2.results[index].distance);
      });
    });
  });

  describe('Location-based Search Integration', () => {
    test('should work with different vendor types', async () => {
      const vendorTypes = ['photographer', 'venue', 'caterer'];
      
      for (const type of vendorTypes) {
        const result = await locationSearchService.searchByLocation({
          location: 'New York, NY',
          searchTerm: type
        });

        if (result.results.length > 0) {
          result.results.forEach(vendor => {
            expect(vendor.vendor.type).toBe(type);
          });
        }
      }
    });

    test('should provide location match metadata', async () => {
      const result = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        includeNearbyAreas: true,
        radius: 25
      });

      result.results.forEach(vendor => {
        expect(vendor.locationMatch.type).toMatch(/^(exact|nearby|expanded)$/);
        expect(vendor.locationMatch.matchedLocation).toBeDefined();
        expect(vendor.locationMatch.confidence).toBeGreaterThan(0);
        expect(vendor.locationMatch.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should prioritize closer and more relevant matches', async () => {
      const result = await locationSearchService.searchByLocation({
        location: 'New York, NY',
        sortBy: 'relevance'
      });

      if (result.results.length > 1) {
        // First result should have high confidence or be very close
        const firstResult = result.results[0];
        expect(firstResult.locationMatch.confidence > 0.8 || firstResult.distance < 5).toBe(true);
      }
    });
  });
});