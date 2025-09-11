/**
 * Comprehensive tests for SearchIndexingService
 * Tests all functionality of the search indexing backend service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchIndexingService } from '../../../src/lib/services/search/SearchIndexingService';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: mockVendor,
          error: null
        }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({
      data: [{ id: 'idx-123' }],
      error: null
    })),
    upsert: vi.fn(() => Promise.resolve({
      data: [{ id: 'idx-123' }],
      error: null
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({
        data: [{ id: 'idx-123' }],
        error: null
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({
        data: [{ id: 'idx-123' }],
        error: null
      }))
    }))
  }))
};

const mockVendor = {
  id: 'vendor-123',
  business_name: 'Elite Photography Studios',
  vendor_type: 'photographer',
  description: 'Professional wedding photography services in NYC',
  location: { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY' },
  rating: 4.8,
  review_count: 150,
  base_price: 2500,
  specializations: ['wedding', 'portrait', 'engagement'],
  portfolio_images: ['img1.jpg', 'img2.jpg'],
  tags: ['professional', 'experienced', 'creative'],
  business_hours: { monday: '9-17', tuesday: '9-17' },
  contact_info: { phone: '555-1234', email: 'info@example.com' }
};

const mockIndexDocument = {
  id: 'idx-123',
  vendor_id: 'vendor-123',
  document: {
    business_name: 'Elite Photography Studios',
    vendor_type: 'photographer',
    description: 'Professional wedding photography services in NYC',
    searchable_content: 'Elite Photography Studios photographer professional wedding photography services NYC',
    location_text: 'New York NY NYC',
    specializations: ['wedding', 'portrait', 'engagement'],
    tags: ['professional', 'experienced', 'creative'],
    rating: 4.8,
    price_range: 'premium'
  },
  indexed_at: new Date().toISOString(),
  status: 'active'
};

describe('SearchIndexingService', () => {
  let indexingService: SearchIndexingService;

  beforeEach(() => {
    vi.clearAllMocks();
    indexingService = new SearchIndexingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('indexVendor', () => {
    it('should index a vendor successfully', async () => {
      const result = await indexingService.indexVendor('vendor-123');

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('indexId');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vendors');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('search_index');
    });

    it('should transform vendor data into searchable document', async () => {
      await indexingService.indexVendor('vendor-123');

      const insertCall = mockSupabaseClient.from().insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: 'vendor-123',
          document: expect.objectContaining({
            business_name: 'Elite Photography Studios',
            vendor_type: 'photographer',
            searchable_content: expect.stringContaining('Elite Photography Studios')
          })
        })
      );
    });

    it('should handle vendor not found', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Vendor not found' }
            }))
          }))
        }))
      }));

      await expect(indexingService.indexVendor('nonexistent-vendor'))
        .rejects.toThrow('Vendor not found');
    });

    it('should handle database errors during indexing', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockVendor, error: null }))
          }))
        })),
        insert: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Insert failed' }
        }))
      }));

      await expect(indexingService.indexVendor('vendor-123'))
        .rejects.toThrow('Insert failed');
    });

    it('should update existing index entry', async () => {
      // Mock existing index entry
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockVendor, error: null }))
              }))
            }))
          };
        }
        if (table === 'search_index') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: mockIndexDocument, 
                  error: null 
                }))
              }))
            })),
            upsert: vi.fn(() => Promise.resolve({
              data: [{ id: 'idx-123' }],
              error: null
            }))
          };
        }
        return {};
      });

      const result = await indexingService.indexVendor('vendor-123');

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);
    });

    it('should include all searchable fields in document', async () => {
      await indexingService.indexVendor('vendor-123');

      const insertCall = mockSupabaseClient.from().insert;
      const indexDocument = insertCall.mock.calls[0][0];

      expect(indexDocument.document).toHaveProperty('business_name');
      expect(indexDocument.document).toHaveProperty('vendor_type');
      expect(indexDocument.document).toHaveProperty('description');
      expect(indexDocument.document).toHaveProperty('searchable_content');
      expect(indexDocument.document).toHaveProperty('location_text');
      expect(indexDocument.document).toHaveProperty('specializations');
      expect(indexDocument.document).toHaveProperty('tags');
      expect(indexDocument.document).toHaveProperty('rating');
      expect(indexDocument.document).toHaveProperty('price_range');
    });
  });

  describe('updateVendorIndex', () => {
    it('should update existing vendor index', async () => {
      const updateData = {
        business_name: 'Updated Photography Studio',
        description: 'Updated description'
      };

      const result = await indexingService.updateVendorIndex('vendor-123', updateData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('search_index');
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        description: 'Only updating description'
      };

      const result = await indexingService.updateVendorIndex('vendor-123', partialUpdate);

      expect(result.success).toBe(true);
    });

    it('should regenerate searchable content on update', async () => {
      const updateData = {
        business_name: 'New Business Name',
        specializations: ['wedding', 'corporate']
      };

      await indexingService.updateVendorIndex('vendor-123', updateData);

      const updateCall = mockSupabaseClient.from().update;
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            business_name: 'New Business Name',
            searchable_content: expect.stringContaining('New Business Name')
          })
        })
      );
    });

    it('should update timestamp on modification', async () => {
      const updateData = { description: 'Updated' };

      await indexingService.updateVendorIndex('vendor-123', updateData);

      const updateCall = mockSupabaseClient.from().update;
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          indexed_at: expect.any(String)
        })
      );
    });
  });

  describe('deleteVendorIndex', () => {
    it('should delete vendor from index', async () => {
      const result = await indexingService.deleteVendorIndex('vendor-123');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('search_index');
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });

    it('should handle deletion of non-existent vendor', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }));

      const result = await indexingService.deleteVendorIndex('nonexistent-vendor');

      expect(result.success).toBe(true);
      expect(result.found).toBe(false);
    });

    it('should handle database errors during deletion', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Delete failed' }
          }))
        }))
      }));

      await expect(indexingService.deleteVendorIndex('vendor-123'))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('bulkIndex', () => {
    it('should index multiple vendors', async () => {
      const vendorIds = ['vendor-1', 'vendor-2', 'vendor-3'];
      
      // Mock multiple vendor responses
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: vendorIds.map((id, index) => ({ ...mockVendor, id, business_name: `Business ${index}` })),
                error: null
              }))
            }))
          };
        }
        if (table === 'search_index') {
          return {
            insert: vi.fn(() => Promise.resolve({
              data: vendorIds.map(id => ({ id: `idx-${id}` })),
              error: null
            }))
          };
        }
        return {};
      });

      const result = await indexingService.bulkIndex(vendorIds);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle partial failures in bulk indexing', async () => {
      const vendorIds = ['vendor-1', 'vendor-2', 'vendor-3'];
      
      // Mock one successful vendor, one that doesn't exist
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{ ...mockVendor, id: 'vendor-1' }], // Only one vendor found
                error: null
              }))
            }))
          };
        }
        return {};
      });

      const result = await indexingService.bulkIndex(vendorIds);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.results.some(r => r.success === false)).toBe(true);
    });

    it('should process bulk operations in batches', async () => {
      const largeVendorList = Array(150).fill(null).map((_, i) => `vendor-${i}`);

      // Mock batch processing
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: Array(50).fill(null).map((_, i) => ({ ...mockVendor, id: `vendor-${i}` })),
                error: null
              }))
            }))
          };
        }
        if (table === 'search_index') {
          return {
            insert: vi.fn(() => Promise.resolve({
              data: Array(50).fill(null).map((_, i) => ({ id: `idx-vendor-${i}` })),
              error: null
            }))
          };
        }
        return {};
      });

      const result = await indexingService.bulkIndex(largeVendorList);

      expect(result.successful).toBeGreaterThan(0);
      // Should process in multiple batches
    });

    it('should track progress during bulk operations', async () => {
      const vendorIds = ['vendor-1', 'vendor-2', 'vendor-3'];
      
      const progressCallback = vi.fn();
      const result = await indexingService.bulkIndex(vendorIds, { 
        progressCallback 
      });

      expect(progressCallback).toHaveBeenCalled();
      expect(result.successful).toBeGreaterThan(0);
    });
  });

  describe('reindexAll', () => {
    it('should reindex all vendors', async () => {
      // Mock getAllVendors
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [mockVendor, { ...mockVendor, id: 'vendor-2' }],
                error: null
              }))
            }))
          };
        }
        if (table === 'search_index') {
          return {
            delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
            insert: vi.fn(() => Promise.resolve({
              data: [{ id: 'idx-1' }, { id: 'idx-2' }],
              error: null
            }))
          };
        }
        return {};
      });

      const result = await indexingService.reindexAll();

      expect(result.totalProcessed).toBeGreaterThan(0);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });

    it('should clear existing index before reindexing', async () => {
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [mockVendor],
                error: null
              }))
            }))
          };
        }
        if (table === 'search_index') {
          return {
            delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
            insert: vi.fn(() => Promise.resolve({
              data: [{ id: 'idx-1' }],
              error: null
            }))
          };
        }
        return {};
      });

      await indexingService.reindexAll();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('search_index');
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });

    it('should handle large datasets during full reindex', async () => {
      const largeVendorSet = Array(1000).fill(null).map((_, i) => ({
        ...mockVendor,
        id: `vendor-${i}`,
        business_name: `Business ${i}`
      }));

      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'vendors') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: largeVendorSet,
                error: null
              }))
            }))
          };
        }
        if (table === 'search_index') {
          return {
            delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
            insert: vi.fn(() => Promise.resolve({
              data: largeVendorSet.map((v, i) => ({ id: `idx-${i}` })),
              error: null
            }))
          };
        }
        return {};
      });

      const result = await indexingService.reindexAll();

      expect(result.totalProcessed).toBe(1000);
    });
  });

  describe('getIndexStatus', () => {
    it('should return comprehensive index status', async () => {
      // Mock index statistics
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'search_index') {
          return {
            select: vi.fn(() => Promise.resolve({
              data: [
                { status: 'active', count: 1200 },
                { status: 'pending', count: 5 }
              ],
              error: null
            }))
          };
        }
        return {};
      });

      const status = await indexingService.getIndexStatus();

      expect(status).toHaveProperty('totalDocuments');
      expect(status).toHaveProperty('indexSize');
      expect(status).toHaveProperty('lastUpdated');
      expect(status).toHaveProperty('health');
      expect(status.health).toMatch(/green|yellow|red/);
    });

    it('should detect index health issues', async () => {
      // Mock unhealthy index
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({
          data: [
            { status: 'active', count: 100 },
            { status: 'error', count: 50 }
          ],
          error: null
        }))
      }));

      const status = await indexingService.getIndexStatus();

      expect(status.health).toBe('yellow');
      expect(status).toHaveProperty('issues');
      expect(Array.isArray(status.issues)).toBe(true);
    });

    it('should calculate index size and statistics', async () => {
      const status = await indexingService.getIndexStatus();

      expect(status).toHaveProperty('indexSize');
      expect(status).toHaveProperty('averageDocumentSize');
      expect(status).toHaveProperty('pendingOperations');
      expect(typeof status.totalDocuments).toBe('number');
    });
  });

  describe('optimizeIndex', () => {
    it('should perform index optimization', async () => {
      const result = await indexingService.optimizeIndex();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('optimizations');
      expect(typeof result.optimizations).toBe('number');
    });

    it('should clean up orphaned index entries', async () => {
      // Mock orphaned entries
      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'search_index') {
          return {
            select: vi.fn(() => Promise.resolve({
              data: [
                { vendor_id: 'vendor-123' },
                { vendor_id: 'orphaned-vendor' }
              ],
              error: null
            })),
            delete: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{ vendor_id: 'orphaned-vendor' }],
                error: null
              }))
            }))
          };
        }
        if (table === 'vendors') {
          return {
            select: vi.fn(() => Promise.resolve({
              data: [{ id: 'vendor-123' }], // Only one vendor exists
              error: null
            }))
          };
        }
        return {};
      });

      const result = await indexingService.optimizeIndex();

      expect(result.success).toBe(true);
      expect(result.orphanedRemoved).toBe(1);
    });

    it('should rebuild fragmented indices', async () => {
      const result = await indexingService.optimizeIndex({ 
        rebuildFragmented: true 
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('rebuiltIndices');
    });

    it('should compress index storage', async () => {
      const result = await indexingService.optimizeIndex({ 
        compress: true 
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('spaceReclaimed');
    });
  });

  describe('handleWebhook', () => {
    it('should handle vendor created webhook', async () => {
      const webhookPayload = {
        event: 'vendor.created',
        data: {
          vendorId: 'vendor-123'
        }
      };

      const result = await indexingService.handleWebhook(webhookPayload);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('indexed');
    });

    it('should handle vendor updated webhook', async () => {
      const webhookPayload = {
        event: 'vendor.updated',
        data: {
          vendorId: 'vendor-123',
          changes: ['business_name', 'description']
        }
      };

      const result = await indexingService.handleWebhook(webhookPayload);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('updated');
    });

    it('should handle vendor deleted webhook', async () => {
      const webhookPayload = {
        event: 'vendor.deleted',
        data: {
          vendorId: 'vendor-123'
        }
      };

      const result = await indexingService.handleWebhook(webhookPayload);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('deleted');
    });

    it('should ignore irrelevant webhook events', async () => {
      const webhookPayload = {
        event: 'user.login',
        data: {
          userId: 'user-123'
        }
      };

      const result = await indexingService.handleWebhook(webhookPayload);

      expect(result.processed).toBe(false);
      expect(result.reason).toBe('irrelevant_event');
    });

    it('should validate webhook payload structure', async () => {
      const invalidPayload = {
        invalidField: 'test'
      };

      const result = await indexingService.handleWebhook(invalidPayload as any);

      expect(result.processed).toBe(false);
      expect(result.reason).toBe('invalid_payload');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should complete indexing operations within time limits', async () => {
      const start = Date.now();
      
      await indexingService.indexVendor('vendor-123');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent indexing operations', async () => {
      const operations = [
        indexingService.indexVendor('vendor-1'),
        indexingService.indexVendor('vendor-2'),
        indexingService.indexVendor('vendor-3')
      ];

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should track indexing performance metrics', async () => {
      const result = await indexingService.indexVendor('vendor-123');

      expect(result).toHaveProperty('performanceMetrics');
      expect(result.performanceMetrics).toHaveProperty('duration');
      expect(result.performanceMetrics).toHaveProperty('documentSize');
    });

    it('should handle memory efficiently during bulk operations', async () => {
      const largeVendorList = Array(500).fill(null).map((_, i) => `vendor-${i}`);

      // Should not cause memory issues
      const result = await indexingService.bulkIndex(largeVendorList, {
        batchSize: 50
      });

      expect(result).toBeDefined();
      expect(result.totalProcessed).toBe(500);
    });
  });

  describe('Document Transformation', () => {
    it('should create comprehensive searchable content', async () => {
      const vendor = {
        ...mockVendor,
        business_name: 'Amazing Wedding Photography',
        description: 'We capture your special moments',
        specializations: ['wedding', 'engagement', 'portraits'],
        tags: ['professional', 'creative', 'experienced']
      };

      const document = await indexingService['transformVendorToDocument'](vendor);

      expect(document.searchable_content).toContain('Amazing Wedding Photography');
      expect(document.searchable_content).toContain('capture special moments');
      expect(document.searchable_content).toContain('wedding engagement portraits');
      expect(document.searchable_content).toContain('professional creative experienced');
    });

    it('should normalize location data for search', async () => {
      const vendor = {
        ...mockVendor,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          city: 'New York',
          state: 'NY',
          zip: '10001'
        }
      };

      const document = await indexingService['transformVendorToDocument'](vendor);

      expect(document.location_text).toContain('New York');
      expect(document.location_text).toContain('NY');
      expect(document.location_text).toContain('NYC'); // Should add common abbreviations
    });

    it('should categorize price ranges appropriately', async () => {
      const budgetVendor = { ...mockVendor, base_price: 800 };
      const luxuryVendor = { ...mockVendor, base_price: 8000 };

      const budgetDoc = await indexingService['transformVendorToDocument'](budgetVendor);
      const luxuryDoc = await indexingService['transformVendorToDocument'](luxuryVendor);

      expect(budgetDoc.price_range).toBe('budget');
      expect(luxuryDoc.price_range).toBe('luxury');
    });

    it('should handle missing or incomplete vendor data', async () => {
      const incompleteVendor = {
        id: 'vendor-123',
        business_name: 'Test Business',
        vendor_type: 'photographer'
        // Missing many optional fields
      };

      const document = await indexingService['transformVendorToDocument'](incompleteVendor);

      expect(document.business_name).toBe('Test Business');
      expect(document.vendor_type).toBe('photographer');
      expect(document.searchable_content).toContain('Test Business');
      // Should handle missing fields gracefully
    });
  });
});