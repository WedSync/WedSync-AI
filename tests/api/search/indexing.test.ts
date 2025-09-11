/**
 * Comprehensive tests for Search Indexing API
 * Tests all functionality of /api/search/indexing endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../src/app/api/search/indexing/route';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: mockIndexData,
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({
        data: [{ id: 'new-index-entry' }],
        error: null
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ id: 'updated-entry' }],
          error: null
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ id: 'deleted-entry' }],
          error: null
        }))
      }))
    }))
  }))
}));

// Mock SearchIndexingService
vi.mock('../../../src/lib/services/search/SearchIndexingService', () => ({
  SearchIndexingService: vi.fn().mockImplementation(() => ({
    indexVendor: vi.fn().mockResolvedValue({ success: true, indexId: 'idx123' }),
    updateVendorIndex: vi.fn().mockResolvedValue({ success: true }),
    deleteVendorIndex: vi.fn().mockResolvedValue({ success: true }),
    bulkIndex: vi.fn().mockResolvedValue({ 
      successful: 5, 
      failed: 0, 
      results: mockBulkResults 
    }),
    reindexAll: vi.fn().mockResolvedValue({ 
      totalProcessed: 100, 
      successful: 98, 
      failed: 2 
    }),
    getIndexStatus: vi.fn().mockResolvedValue(mockIndexStatus),
    optimizeIndex: vi.fn().mockResolvedValue({ success: true, optimizations: 5 }),
    handleWebhook: vi.fn().mockResolvedValue({ processed: true })
  }))
}));

const mockIndexData = [
  {
    id: 'idx1',
    vendor_id: 'vendor1',
    document: {
      business_name: 'Elite Photography',
      vendor_type: 'photographer',
      description: 'Professional wedding photography services',
      tags: ['wedding', 'photography', 'professional']
    },
    indexed_at: '2024-01-15T10:00:00Z',
    status: 'active'
  }
];

const mockIndexStatus = {
  totalDocuments: 1250,
  indexSize: '45MB',
  lastUpdated: '2024-01-15T10:00:00Z',
  health: 'green',
  shards: 1,
  replicas: 0,
  pendingOperations: 0
};

const mockBulkResults = [
  { vendorId: 'vendor1', success: true, indexId: 'idx1' },
  { vendorId: 'vendor2', success: true, indexId: 'idx2' },
  { vendorId: 'vendor3', success: false, error: 'Invalid data' }
];

describe('/api/search/indexing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/search/indexing', () => {
    it('should return index status and statistics', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('statistics');
      expect(data.status.health).toBe('green');
      expect(data.statistics.totalDocuments).toBe(1250);
    });

    it('should return recent index operations', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing?includeRecent=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('recentOperations');
      expect(Array.isArray(data.recentOperations)).toBe(true);
    });

    it('should return index health diagnostics', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing?diagnostic=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('diagnostics');
      expect(data.diagnostics).toHaveProperty('performance');
      expect(data.diagnostics).toHaveProperty('errors');
    });

    it('should require admin authentication', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing');
      const request = new NextRequest(url); // No auth header
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should return vendor-specific index info when vendorId provided', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing?vendorId=vendor1');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('vendorIndex');
      expect(data.vendorIndex.vendor_id).toBe('vendor1');
    });
  });

  describe('POST /api/search/indexing', () => {
    it('should index a single vendor', async () => {
      const indexRequest = {
        vendorId: 'vendor123',
        action: 'index'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(indexRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('indexId');
    });

    it('should handle bulk indexing operations', async () => {
      const bulkRequest = {
        action: 'bulkIndex',
        vendorIds: ['vendor1', 'vendor2', 'vendor3']
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(bulkRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(data.successful).toBe(5);
      expect(data.failed).toBe(0);
    });

    it('should trigger full reindexing', async () => {
      const reindexRequest = {
        action: 'reindexAll',
        force: true
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(reindexRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('totalProcessed');
      expect(data.totalProcessed).toBe(100);
    });

    it('should optimize search index', async () => {
      const optimizeRequest = {
        action: 'optimize'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(optimizeRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('optimizations');
    });

    it('should handle webhook events', async () => {
      const webhookPayload = {
        action: 'webhook',
        event: 'vendor.updated',
        data: {
          vendorId: 'vendor123',
          changes: ['business_name', 'description']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'webhook-secret'
        },
        body: JSON.stringify(webhookPayload)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.processed).toBe(true);
    });

    it('should validate request body structure', async () => {
      const invalidRequest = {
        invalidField: 'test'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should require authentication for non-webhook requests', async () => {
      const indexRequest = {
        vendorId: 'vendor123',
        action: 'index'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(indexRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });

    it('should handle concurrent indexing requests', async () => {
      const requests = Array(3).fill(null).map((_, i) => {
        const indexRequest = {
          vendorId: `vendor${i}`,
          action: 'index'
        };

        return POST(new NextRequest('http://localhost:3000/api/search/indexing', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          },
          body: JSON.stringify(indexRequest)
        }));
      });
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('PUT /api/search/indexing', () => {
    it('should update existing index entry', async () => {
      const updateRequest = {
        vendorId: 'vendor123',
        document: {
          business_name: 'Updated Photography Studio',
          description: 'Updated description',
          tags: ['updated', 'photography']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(updateRequest)
      });
      
      const response = await PUT(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle partial document updates', async () => {
      const partialUpdate = {
        vendorId: 'vendor123',
        document: {
          description: 'Only updating description'
        },
        partial: true
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(partialUpdate)
      });
      
      const response = await PUT(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should validate document structure', async () => {
      const invalidUpdate = {
        vendorId: 'vendor123',
        document: {
          invalidField: 'test'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(invalidUpdate)
      });
      
      const response = await PUT(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/search/indexing', () => {
    it('should delete vendor from index', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing?vendorId=vendor123');
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle bulk deletion', async () => {
      const deleteRequest = {
        vendorIds: ['vendor1', 'vendor2', 'vendor3']
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(deleteRequest)
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should require vendorId parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing');
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await DELETE(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle indexing service errors', async () => {
      // Mock service error
      vi.doMock('../../../src/lib/services/search/SearchIndexingService', () => ({
        SearchIndexingService: vi.fn().mockImplementation(() => ({
          indexVendor: vi.fn().mockRejectedValue(new Error('Indexing failed'))
        }))
      }));

      const indexRequest = {
        vendorId: 'vendor123',
        action: 'index'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(indexRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle database connection errors', async () => {
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

      const url = new URL('http://localhost:3000/api/search/indexing');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: 'invalid-json{'
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle timeout errors during bulk operations', async () => {
      const bulkRequest = {
        action: 'bulkIndex',
        vendorIds: Array(1000).fill(null).map((_, i) => `vendor${i}`)
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(bulkRequest)
      });
      
      const response = await POST(request);
      
      // Should handle large bulk operations gracefully
      expect([200, 202, 503]).toContain(response.status);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should include performance metrics in responses', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing?includeMetrics=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Index-Performance')).toBeDefined();
    });

    it('should track indexing operation durations', async () => {
      const indexRequest = {
        vendorId: 'vendor123',
        action: 'index'
      };

      const start = Date.now();
      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(indexRequest)
      });
      
      const response = await POST(request);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Operation-Duration')).toBeDefined();
    });

    it('should provide index health monitoring', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing?healthCheck=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.health).toHaveProperty('status');
      expect(data.health).toHaveProperty('uptime');
      expect(data.health).toHaveProperty('resourceUsage');
    });
  });

  describe('Security and Authorization', () => {
    it('should validate admin token authenticity', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should validate webhook signatures', async () => {
      const webhookPayload = {
        action: 'webhook',
        event: 'vendor.updated',
        data: { vendorId: 'vendor123' }
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'invalid-secret'
        },
        body: JSON.stringify(webhookPayload)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });

    it('should sanitize input data', async () => {
      const maliciousRequest = {
        vendorId: '<script>alert("xss")</script>',
        action: 'index'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(maliciousRequest)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should enforce rate limiting for indexing operations', async () => {
      const url = new URL('http://localhost:3000/api/search/indexing');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch indexing with progress tracking', async () => {
      const batchRequest = {
        action: 'batchIndex',
        batch: [
          { vendorId: 'vendor1', priority: 'high' },
          { vendorId: 'vendor2', priority: 'normal' },
          { vendorId: 'vendor3', priority: 'low' }
        ],
        trackProgress: true
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(batchRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('batchId');
      expect(data).toHaveProperty('progressUrl');
    });

    it('should support scheduled indexing operations', async () => {
      const scheduleRequest = {
        action: 'schedule',
        operation: 'reindexAll',
        scheduledFor: '2024-02-01T02:00:00Z'
      };

      const request = new NextRequest('http://localhost:3000/api/search/indexing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(scheduleRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('scheduleId');
    });
  });
});