/**
 * WS-116: Geographic Search Service Tests
 * Comprehensive test coverage for location-based search functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { geographicSearchService, LocationSearchParams } from '@/lib/services/geographic-search-service';
// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  neq: vi.fn(() => mockSupabase),
  not: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  overlaps: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  or: vi.fn(() => mockSupabase),
  ilike: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  rpc: vi.fn(() => mockSupabase)
};
// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));
// Mock environment variables
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }
// Sample test data
const sampleSuppliers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    business_name: 'Test Photography Studio',
    primary_category: 'Photography',
    latitude: 51.5074,
    longitude: -0.1278,
    address_line1: '123 Test Street',
    address_line2: null,
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    average_rating: 4.5,
    total_reviews: 25,
    price_range: '££',
    is_verified: true,
    featured_image: 'https://example.com/image.jpg',
    service_radius_miles: 30,
    cities: { name: 'London' },
    states: { name: 'England' },
    countries: { name: 'United Kingdom' }
  },
    id: '223e4567-e89b-12d3-a456-426614174001',
    business_name: 'Elite Wedding Venue',
    primary_category: 'Venue',
    latitude: 51.4994,
    longitude: -0.1245,
    address_line1: '456 Venue Road',
    postcode: 'SE1 2AB',
    average_rating: 4.8,
    total_reviews: 15,
    price_range: '£££',
    featured_image: 'https://example.com/venue.jpg',
    service_radius_miles: 0, // Venues typically don't have service radius
];
const sampleCities = [
    id: 'city-1',
    name: 'London',
    ascii_name: 'London',
    location: { coordinates: [-0.1278, 51.5074] },
    id: 'city-2',
    name: 'Manchester',
    ascii_name: 'Manchester',
    location: { coordinates: [-2.2426, 53.4808] },
const samplePostcodes = [
    id: 'postcode-1',
    code: 'SW1A1AA',
    formatted_code: 'SW1A 1AA',
    location: { coordinates: [-0.1419, 51.4993] },
    states: { name: 'England' }
describe('Geographic Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockSupabase.from.mockReturnValue(mockSupabase);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('searchSuppliers', () => {
    it('should search suppliers within radius successfully', async () => {
      // Setup mock responses
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      mockSupabase.limit.mockResolvedValue({ 
        data: sampleSuppliers, 
        error: null 
      });
      // Mock the RPC call for service area check
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      const searchParams: LocationSearchParams = {
        latitude: 51.5074,
        longitude: -0.1278,
        radius: 25,
        category: 'Photography',
        minRating: 4.0,
        sortBy: 'distance',
        sortOrder: 'asc',
        limit: 20
      };
      const result = await geographicSearchService.searchSuppliers(searchParams);
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1); // Only photography supplier should match
      expect(result.results[0].businessName).toBe('Test Photography Studio');
      expect(result.results[0].distance).toBeLessThan(25);
      expect(result.searchRadius).toBe(25);
      expect(result.center).toEqual({ 
        latitude: 51.5074, 
        longitude: -0.1278 
      // Verify the correct query was built
      expect(mockSupabase.from).toHaveBeenCalledWith('suppliers');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_published', true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('primary_category', 'Photography');
      expect(mockSupabase.gte).toHaveBeenCalledWith('average_rating', 4.0);
    });
    it('should handle empty results gracefully', async () => {
        data: [], 
        radius: 5,
        category: 'NonexistentCategory'
      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.searchRadius).toBe(5);
    it('should apply all filters correctly', async () => {
        radius: 50,
        subcategories: ['Wedding', 'Portrait'],
        priceRange: ['££', '£££'],
        verifiedOnly: true
      await geographicSearchService.searchSuppliers(searchParams);
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('secondary_categories', ['Wedding', 'Portrait']);
      expect(mockSupabase.in).toHaveBeenCalledWith('price_range', ['££', '£££']);
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_verified', true);
    it('should handle database errors gracefully', async () => {
        data: null, 
        error: { message: 'Database connection failed' }
        radius: 25
      await expect(geographicSearchService.searchSuppliers(searchParams))
        .rejects
        .toThrow('Failed to search suppliers by location');
    it('should sort results correctly', async () => {
      const unsortedSuppliers = [...sampleSuppliers].reverse();
        data: unsortedSuppliers, 
        sortBy: 'rating',
        sortOrder: 'desc'
      expect(result.results[0].rating).toBeGreaterThan(result.results[1].rating);
  describe('getLocationSuggestions', () => {
    it('should return location suggestions for cities and postcodes', async () => {
      // Mock cities query
      mockSupabase.limit.mockResolvedValueOnce({ 
        data: sampleCities, 
      // Mock postcodes query  
        data: samplePostcodes, 
      const suggestions = await geographicSearchService.getLocationSuggestions('London', 10);
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toBe('London');
      expect(suggestions[0].type).toBe('city');
      expect(suggestions[0].latitude).toBe(51.5074);
      expect(suggestions[0].longitude).toBe(-0.1278);
      // Verify both cities and postcodes were queried
      expect(mockSupabase.or).toHaveBeenCalled();
      expect(mockSupabase.ilike).toHaveBeenCalled();
    it('should handle empty query gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });
      const suggestions = await geographicSearchService.getLocationSuggestions('', 10);
      expect(suggestions).toEqual([]);
    it('should handle database errors in suggestions', async () => {
      mockSupabase.limit.mockRejectedValue(new Error('Database error'));
  describe('getPopularWeddingLocations', () => {
    const sampleHotspots = [
      {
        id: 'hotspot-1',
        name: 'Central London Wedding District',
        weddings_per_year: 500,
        average_guest_count: 120,
        total_suppliers: 45,
        location: { coordinates: [-0.1278, 51.5074] }
      }
    ];
    it('should return popular wedding locations', async () => {
        data: sampleHotspots, 
      const locations = await geographicSearchService.getPopularWeddingLocations(20);
      expect(locations).toBeDefined();
      expect(locations.length).toBe(1);
      expect(locations[0].name).toBe('Central London Wedding District');
      expect(locations[0].weddingsPerYear).toBe(500);
      expect(locations[0].location.latitude).toBe(51.5074);
      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_location_hotspots');
      expect(mockSupabase.order).toHaveBeenCalledWith('weddings_per_year', { ascending: false });
    it('should handle empty hotspots', async () => {
      expect(locations).toEqual([]);
  describe('getSuppliersInArea', () => {
    it('should get suppliers in specific city', async () => {
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.select.mockResolvedValue({ 
        data: [sampleSuppliers[0]], 
      const suppliers = await geographicSearchService.getSuppliersInArea(
        'city-1', 
        'city', 
        'Photography'
      );
      expect(suppliers).toBeDefined();
      expect(suppliers.length).toBe(1);
      expect(suppliers[0].businessName).toBe('Test Photography Studio');
      expect(suppliers[0].servesLocation).toBe(true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('city_id', 'city-1');
    it('should get suppliers in state', async () => {
      await geographicSearchService.getSuppliersInArea('state-1', 'state');
      expect(mockSupabase.eq).toHaveBeenCalledWith('state_id', 'state-1');
    it('should get suppliers in country', async () => {
      await geographicSearchService.getSuppliersInArea('country-1', 'country');
      expect(mockSupabase.eq).toHaveBeenCalledWith('country_id', 'country-1');
  describe('distance calculations', () => {
    it('should calculate distance correctly using Haversine formula', () => {
      // Test known distance: London to Paris is approximately 344km
      const londonLat = 51.5074;
      const londonLng = -0.1278;
      const parisLat = 48.8566;
      const parisLng = 2.3522;
      // Access private method for testing (in real implementation, we'd expose this or create a utility)
      const service = geographicSearchService as any;
      const distance = service.calculateDistance(londonLat, londonLng, parisLat, parisLng);
      // Allow for some variance in calculation
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    it('should handle same location distance', () => {
      const distance = service.calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
      expect(distance).toBe(0);
  describe('caching functionality', () => {
    it('should generate consistent cache keys', () => {
      const params1: LocationSearchParams = {
        category: 'Photography'
      const params2: LocationSearchParams = {
      const key1 = service.generateCacheKey(params1);
      const key2 = service.generateCacheKey(params2);
      expect(key1).toBe(key2);
    it('should generate different cache keys for different parameters', () => {
        radius: 50  // Different radius
      expect(key1).not.toBe(key2);
  describe('result formatting', () => {
    it('should format addresses correctly', () => {
      const supplier = {
        address_line1: '123 Test Street',
        address_line2: 'Suite 100',
        city: 'London',
        postcode: 'SW1A 1AA'
      const address = service.formatAddress(supplier);
      expect(address).toBe('123 Test Street, Suite 100, London, SW1A 1AA');
    it('should handle missing address components', () => {
        address_line2: null,
        postcode: null
      expect(address).toBe('123 Test Street, London');
  describe('sorting functionality', () => {
    const testSuppliers = [
      { businessName: 'A Supplier', distance: 5, rating: 4.0, totalReviews: 10, priceRange: '££' },
      { businessName: 'B Supplier', distance: 3, rating: 4.5, totalReviews: 20, priceRange: '£' },
      { businessName: 'C Supplier', distance: 8, rating: 3.8, totalReviews: 5, priceRange: '£££' }
    ] as any[];
    it('should sort by distance ascending', () => {
      const sorted = service.sortResults(testSuppliers, 'distance', 'asc');
      expect(sorted[0].distance).toBe(3);
      expect(sorted[1].distance).toBe(5);
      expect(sorted[2].distance).toBe(8);
    it('should sort by rating descending', () => {
      const sorted = service.sortResults(testSuppliers, 'rating', 'desc');
      expect(sorted[0].rating).toBe(4.5);
      expect(sorted[1].rating).toBe(4.0);
      expect(sorted[2].rating).toBe(3.8);
    it('should sort by reviews descending', () => {
      const sorted = service.sortResults(testSuppliers, 'reviews', 'desc');
      expect(sorted[0].totalReviews).toBe(20);
      expect(sorted[1].totalReviews).toBe(10);
      expect(sorted[2].totalReviews).toBe(5);
    it('should sort by price ascending', () => {
      const sorted = service.sortResults(testSuppliers, 'price', 'asc');
      expect(sorted[0].priceRange).toBe('£');
      expect(sorted[1].priceRange).toBe('££');
      expect(sorted[2].priceRange).toBe('£££');
});
