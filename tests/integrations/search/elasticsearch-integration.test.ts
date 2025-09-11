/**
 * WS-248: Test suite for ElasticsearchIntegration
 * Advanced Search System Team C Round 1 - Evidence Package
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElasticsearchIntegration, WeddingVendor } from '../../../src/integrations/search/elasticsearch/ElasticsearchIntegration';

// Mock Elasticsearch client
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
    index: vi.fn(),
    indices: {
      exists: vi.fn(),
      create: vi.fn()
    },
    cluster: {
      health: vi.fn()
    },
    close: vi.fn()
  }))
}));

describe('ElasticsearchIntegration - WS-248', () => {
  let elasticsearchIntegration: ElasticsearchIntegration;
  let mockClient: any;
  
  const testConfig = {
    nodes: ['http://localhost:9200'],
    auth: { username: 'test', password: 'test' }
  };

  const mockVendor: WeddingVendor = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Wedding Photographer',
    type: 'photographer',
    location: {
      lat: 51.5074,
      lon: -0.1278,
      address: '123 Wedding Street',
      city: 'London',
      region: 'Greater London',
      country: 'UK',
      postcode: 'W1A 0AX'
    },
    priceRange: {
      min: 1000,
      max: 3000,
      currency: 'GBP'
    },
    services: ['wedding photography', 'engagement shoots'],
    rating: 4.8,
    reviewCount: 127,
    availability: ['2025-06-15T00:00:00Z'],
    portfolio: ['https://example.com/photo1.jpg'],
    tags: ['natural light', 'romantic'],
    isActive: true,
    lastUpdated: '2025-01-14T10:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    elasticsearchIntegration = new ElasticsearchIntegration(testConfig);
    mockClient = (elasticsearchIntegration as any).client;
  });

  afterEach(async () => {
    await elasticsearchIntegration.shutdown();
  });

  describe('Initialization', () => {
    it('should create client with correct configuration', () => {
      expect(mockClient).toBeDefined();
    });

    it('should initialize indices successfully', async () => {
      mockClient.indices.exists.mockResolvedValue(false);
      mockClient.indices.create.mockResolvedValue({ acknowledged: true });

      await elasticsearchIntegration.initializeIndices();

      expect(mockClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'wedding_vendors'
        })
      );
    });
  });

  describe('Vendor Indexing', () => {
    it('should index vendor successfully', async () => {
      mockClient.index.mockResolvedValue({ _id: mockVendor.id, result: 'created' });

      await elasticsearchIntegration.indexVendor(mockVendor);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'wedding_vendors',
        id: mockVendor.id,
        body: expect.objectContaining({
          id: mockVendor.id,
          name: mockVendor.name,
          type: mockVendor.type
        }),
        refresh: 'wait_for'
      });
    });
  });

  describe('Vendor Search', () => {
    const mockSearchResponse = {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{
          _id: mockVendor.id,
          _source: mockVendor,
          _score: 1.0
        }]
      },
      took: 15
    };

    it('should search vendors with basic query', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      const result = await elasticsearchIntegration.searchVendors({
        query: 'photographer',
        limit: 10
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'wedding_vendors',
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.any(Object)
            }),
            size: 10
          })
        })
      );

      expect(result.hits.total.value).toBe(1);
    });

    it('should apply location filters correctly', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await elasticsearchIntegration.searchVendors({
        location: {
          center: { lat: 51.5074, lon: -0.1278 },
          radius: '25km'
        }
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                filter: expect.arrayContaining([
                  expect.objectContaining({
                    geo_distance: expect.objectContaining({
                      distance: '25km'
                    })
                  })
                ])
              })
            })
          })
        })
      );
    });
  });

  describe('Wedding Day Protection', () => {
    it('should use fallback search during critical times', async () => {
      // Mock Saturday (wedding day)
      const saturday = new Date('2025-06-14T14:00:00Z');
      vi.spyOn(Date, 'now').mockReturnValue(saturday.getTime());
      vi.spyOn(global, 'Date').mockImplementation(() => saturday);

      mockClient.search.mockRejectedValueOnce(new Error('Service unavailable'));
      mockClient.search.mockResolvedValueOnce({
        hits: { total: { value: 1, relation: 'eq' }, hits: [] },
        took: 10
      });

      const result = await elasticsearchIntegration.searchVendors({
        query: 'photographer'
      });

      expect(result).toBeDefined();
      expect(mockClient.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Monitoring', () => {
    it('should return correct health status', () => {
      const metrics = elasticsearchIntegration.getMetrics();
      expect(metrics).toHaveProperty('healthStatus');
      expect(typeof metrics.healthStatus).toBe('string');
    });
  });
});