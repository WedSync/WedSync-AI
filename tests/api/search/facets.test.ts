/**
 * Comprehensive tests for Search Facets API
 * Tests all functionality of /api/search/facets endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../../src/app/api/search/facets/route';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        textSearch: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  not: vi.fn(() => Promise.resolve({
                    data: mockVendorData,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

const mockVendorData = [
  {
    vendor_type: 'photographer',
    location: { city: 'New York', state: 'NY' },
    base_price: 2500,
    rating: 4.8,
    specializations: ['wedding', 'portrait'],
    availability_dates: ['2024-06-15', '2024-07-20']
  },
  {
    vendor_type: 'venue',
    location: { city: 'Brooklyn', state: 'NY' },
    base_price: 8000,
    rating: 4.5,
    specializations: ['reception', 'ceremony'],
    availability_dates: ['2024-06-15']
  },
  {
    vendor_type: 'florist',
    location: { city: 'Manhattan', state: 'NY' },
    base_price: 1200,
    rating: 4.7,
    specializations: ['bridal bouquet', 'centerpieces'],
    availability_dates: ['2024-07-20', '2024-08-10']
  }
];

describe('/api/search/facets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/search/facets', () => {
    it('should return all facets when no filters applied', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('facets');
      expect(data.facets).toHaveProperty('vendorTypes');
      expect(data.facets).toHaveProperty('locations');
      expect(data.facets).toHaveProperty('priceRanges');
      expect(data.facets).toHaveProperty('ratings');
      expect(data.facets).toHaveProperty('availability');
    });

    it('should filter facets based on search query', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?q=photographer');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.vendorTypes.some((vt: any) => vt.value === 'photographer')).toBe(true);
    });

    it('should return vendor type facets with counts', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.vendorTypes).toEqual([
        { value: 'photographer', count: 1, label: 'Photographers' },
        { value: 'venue', count: 1, label: 'Venues' },
        { value: 'florist', count: 1, label: 'Florists' }
      ]);
    });

    it('should return location facets grouped by city/state', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.locations).toContainEqual({
        value: 'New York, NY',
        count: 1,
        label: 'New York, NY'
      });
      expect(data.facets.locations).toContainEqual({
        value: 'Brooklyn, NY',
        count: 1,
        label: 'Brooklyn, NY'
      });
    });

    it('should return price range facets in logical buckets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.priceRanges).toContainEqual({
        range: '1000-2000',
        count: 1,
        label: '$1,000 - $2,000'
      });
      expect(data.facets.priceRanges).toContainEqual({
        range: '2000-5000',
        count: 1,
        label: '$2,000 - $5,000'
      });
    });

    it('should return rating facets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.ratings).toContainEqual({
        value: '4.5+',
        count: 3,
        label: '4.5 Stars & Up'
      });
    });

    it('should return availability facets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?date=2024-06-15');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.availability).toContainEqual({
        date: '2024-06-15',
        availableCount: 2,
        label: 'June 15, 2024'
      });
    });

    it('should apply existing filters to facet calculation', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?vendorType=photographer&location=New York');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      // Should show reduced counts for other facets
      expect(data.facets.vendorTypes.find((vt: any) => vt.value === 'photographer').count).toBe(1);
    });

    it('should include specialization facets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets).toHaveProperty('specializations');
      expect(data.facets.specializations).toContainEqual({
        value: 'wedding',
        count: 1,
        label: 'Wedding Specialist'
      });
    });

    it('should handle multiple filter combinations', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?vendorType=photographer,venue&priceMin=2000');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.vendorTypes.length).toBeGreaterThan(0);
    });

    it('should return dynamic facets based on search context', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?q=outdoor+wedding');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets).toHaveProperty('features');
      expect(data.facets.features).toContainEqual({
        value: 'outdoor',
        count: expect.any(Number),
        label: 'Outdoor Specialists'
      });
    });
  });

  describe('Facet Recommendations', () => {
    it('should provide recommended filters based on popular combinations', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?includeRecommendations=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    it('should suggest filters to narrow down large result sets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?q=wedding&suggestFilters=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('suggestions');
      expect(data.suggestions).toHaveProperty('narrowFilters');
    });

    it('should recommend removing filters for small result sets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?vendorType=photographer&location=Remote+Island&suggestFilters=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.suggestions).toHaveProperty('expandFilters');
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache facet results for common queries', async () => {
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBeDefined();
    });

    it('should respond quickly for facet calculations', async () => {
      const start = Date.now();
      
      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeMockData = Array(1000).fill(null).map((_, i) => ({
        vendor_type: ['photographer', 'venue', 'florist'][i % 3],
        location: { city: `City${i}`, state: 'NY' },
        base_price: 1000 + (i * 100),
        rating: 3 + (i % 2),
      }));

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: largeMockData,
              error: null
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle invalid filter parameters', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?priceMin=invalid&priceMax=alsoinvalid');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle empty result sets', async () => {
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/facets');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.vendorTypes).toEqual([]);
    });
  });

  describe('Advanced Filtering', () => {
    it('should support date range filtering for availability', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?startDate=2024-06-01&endDate=2024-06-30');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.availability).toBeDefined();
    });

    it('should support radius-based location filtering', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?lat=40.7128&lng=-74.0060&radius=25');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.locations).toBeDefined();
    });

    it('should support custom price range buckets', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?customPriceRanges=1000-2500,2500-5000,5000+');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.priceRanges.some((pr: any) => pr.range === '1000-2500')).toBe(true);
    });

    it('should support multiple selection for facet values', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?vendorType=photographer,venue&rating=4.0+,4.5+');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets).toBeDefined();
    });
  });

  describe('Facet Metadata', () => {
    it('should include facet metadata and statistics', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?includeMetadata=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('totalResults');
      expect(data.metadata).toHaveProperty('facetCounts');
    });

    it('should track facet usage analytics', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?trackUsage=true&userId=user123');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Analytics-Tracked')).toBe('true');
    });

    it('should provide facet selection guidance', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?includeGuidance=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('guidance');
      expect(data.guidance).toHaveProperty('mostPopularFilters');
      expect(data.guidance).toHaveProperty('effectiveFilters');
    });
  });

  describe('Real-time Updates', () => {
    it('should provide real-time availability updates', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?realtime=true&date=2024-06-15');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('lastUpdated');
    });

    it('should include price volatility indicators', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?includePriceVolatility=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.priceRanges[0]).toHaveProperty('volatility');
    });
  });

  describe('Internationalization', () => {
    it('should support localized facet labels', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?locale=es');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.vendorTypes[0].label).not.toBe('Photographers'); // Should be translated
    });

    it('should handle different currency formats', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?currency=EUR&locale=de');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.priceRanges[0].label).toMatch(/€/);
    });
  });

  describe('Accessibility', () => {
    it('should provide screen reader friendly labels', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?includeA11yLabels=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.facets.vendorTypes[0]).toHaveProperty('ariaLabel');
    });

    it('should include keyboard navigation hints', async () => {
      const url = new URL('http://localhost:3000/api/search/facets?includeNavHints=true');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('navigationHints');
    });
  });
});