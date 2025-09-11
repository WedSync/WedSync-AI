import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as predictLTV, GET as getLTVHistory } from '@/app/api/analytics/ltv/predict/route';
import { POST as batchLTV, GET as getBatchStatus } from '@/app/api/analytics/ltv/batch/route';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { 
        id: 'user-123',
        role: 'admin',
        permissions: ['analytics:read', 'financial:read', 'analytics:batch']
      },
      error: null
    }),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  })
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock the LTV prediction engine
const mockLTVEngine = {
  predictSupplierLTV: jest.fn(),
  batchPredictLTV: jest.fn()
};

jest.mock('@/lib/analytics/ltv-prediction-engine', () => ({
  LTVPredictionEngine: jest.fn(() => mockLTVEngine)
}));

describe('Analytics LTV API Routes Integration Tests', () => {
  let mockAuthUser: any;
  let mockSupplierData: any;
  let mockLTVPrediction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthUser = {
      id: 'user-123',
      email: 'admin@wedsync.com'
    };

    mockSupplierData = {
      id: 'supplier-123',
      business_type: 'photographer',
      subscription_tier: 'premium',
      acquisition_channel: 'organic'
    };

    mockLTVPrediction = {
      supplierId: 'supplier-123',
      historicalLTV: 850.50,
      predictedLTV: 1249.75,
      totalLTV: 2100.25,
      confidence: 0.82,
      paybackPeriod: 8,
      ltvCacRatio: 4.2,
      calculatedAt: new Date('2024-01-20T10:00:00Z'),
      modelVersion: 'v2.1-ensemble',
      riskFactors: ['Limited transaction history'],
      churnProbability: 0.12,
      expansionPotential: 0.35,
      predictionBreakdown: [
        {
          modelType: 'cohort_based',
          prediction: 1200,
          confidence: 0.85,
          weight: 0.4,
          contributingFactors: ['High engagement score', 'Premium tier']
        }
      ]
    };

    // Setup default successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAuthUser },
      error: null
    });

    // Setup default LTV prediction
    mockLTVEngine.predictSupplierLTV.mockResolvedValue(mockLTVPrediction);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/analytics/ltv/predict', () => {
    it('should predict LTV for valid supplier', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierId: 'supplier-123',
          predictionHorizon: 24,
          includeBreakdown: true
        })
      });

      const response = await predictLTV(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        supplierId: 'supplier-123',
        historicalLTV: 850.5,
        predictedLTV: 1249.75,
        totalLTV: 2100.25,
        confidence: 0.82,
        paybackPeriod: 8,
        ltvCacRatio: 4.2,
        modelVersion: 'v2.1-ensemble'
      });

      expect(data.predictionBreakdown).toBeDefined();
      expect(data.riskFactors).toBeDefined();
      expect(data.churnProbability).toBeDefined();
      expect(data.expansionPotential).toBeDefined();
    });

    it('should handle missing authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplierId: 'supplier-123'
        })
      });

      const response = await predictLTV(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized access to financial analytics');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          predictionHorizon: 24
        })
      });

      const response = await predictLTV(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('supplierId is required');
    });

    it('should validate prediction horizon limits', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierId: 'supplier-123',
          predictionHorizon: 48 // Invalid: exceeds 36 month limit
        })
      });

      const response = await predictLTV(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('predictionHorizon must be between 1 and 36 months');
    });

    it('should handle supplier not found', async () => {
      mockLTVEngine.predictSupplierLTV.mockRejectedValue(
        new Error('Supplier not found')
      );

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierId: 'nonexistent-supplier'
        })
      });

      const response = await predictLTV(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Supplier not found or insufficient data for prediction');
    });

    it('should handle insufficient data', async () => {
      mockLTVEngine.predictSupplierLTV.mockRejectedValue(
        new Error('Insufficient data for prediction')
      );

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierId: 'new-supplier'
        })
      });

      const response = await predictLTV(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBe('Insufficient data for accurate prediction');
      expect(data.suggestion).toBeDefined();
    });

    it('should include cache headers in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierId: 'supplier-123'
        })
      });

      const response = await predictLTV(request);

      expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
      expect(response.headers.get('ETag')).toMatch(/^"ltv-supplier-123-\d+"$/);
    });
  });

  describe('GET /api/analytics/ltv/predict', () => {
    it('should retrieve LTV history for supplier', async () => {
      const mockHistory = [
        {
          customer_id: 'supplier-123',
          predicted_ltv_24m: 2000,
          confidence_score: 0.8,
          calculation_date: '2024-01-15T00:00:00Z',
          model_version: 'v2.0-ensemble'
        },
        {
          customer_id: 'supplier-123',
          predicted_ltv_24m: 1950,
          confidence_score: 0.78,
          calculation_date: '2024-01-01T00:00:00Z',
          model_version: 'v1.9-ensemble'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockHistory,
          error: null
        })
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/predict?supplierId=supplier-123&limit=2',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getLTVHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.supplierId).toBe('supplier-123');
      expect(data.history).toHaveLength(2);
      expect(data.count).toBe(2);
    });

    it('should require supplierId parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/predict?limit=10',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getLTVHistory(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('supplierId query parameter is required');
    });

    it('should limit results to maximum of 50', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/predict?supplierId=supplier-123&limit=100',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getLTVHistory(request);

      // Should call with limit of 50, not 100
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(50);
    });
  });

  describe('POST /api/analytics/ltv/batch', () => {
    it('should process small batches synchronously', async () => {
      const mockBatchResult = {
        predictions: [
          {
            supplierId: 'supplier-123',
            totalLTV: 2100,
            confidence: 0.82
          },
          {
            supplierId: 'supplier-124', 
            totalLTV: 1800,
            confidence: 0.78
          }
        ],
        totalProcessed: 2,
        averageLTV: 1950,
        highValueSuppliers: 1,
        executionTime: 1250
      };

      mockLTVEngine.batchPredictLTV.mockResolvedValue(mockBatchResult);

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierIds: ['supplier-123', 'supplier-124'],
          includeBreakdown: false,
          backgroundProcessing: false
        })
      });

      const response = await batchLTV(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.results).toMatchObject({
        totalProcessed: 2,
        averageLTV: 1950,
        executionTime: 1250
      });
      expect(data.results.predictions).toHaveLength(2);
    });

    it('should queue large batches for background processing', async () => {
      const largeBatch = Array.from({ length: 150 }, (_, i) => `supplier-${i}`);

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierIds: largeBatch,
          backgroundProcessing: true
        })
      });

      const response = await batchLTV(request);
      const data = await response.json();

      expect(response.status).toBe(202); // Accepted for processing
      expect(data.status).toBe('processing');
      expect(data.batchId).toMatch(/^batch_ltv_\d+_[a-z0-9]+$/);
      expect(data.progress.total).toBe(150);
      expect(data.progress.processed).toBe(0);
    });

    it('should validate batch size limits', async () => {
      const hugeBatch = Array.from({ length: 2000 }, (_, i) => `supplier-${i}`);

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierIds: hugeBatch,
          maxBatchSize: 1000
        })
      });

      const response = await batchLTV(request);
      const data = await response.json();

      expect(response.status).toBe(413); // Payload Too Large
      expect(data.error).toContain('Batch size 2000 exceeds maximum of 1000');
      expect(data.suggestion).toBeDefined();
    });

    it('should require either supplierIds or segmentFilters', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          includeBreakdown: true
        })
      });

      const response = await batchLTV(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either supplierIds or segmentFilters must be provided');
    });

    it('should handle empty results from segment filters', async () => {
      // Mock empty supplier list from filters
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [], // No suppliers match filters
          error: null
        })
      });

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          segmentFilters: [
            {
              businessType: ['nonexistent-type'],
              subscriptionTier: ['nonexistent-tier']
            }
          ]
        })
      });

      const response = await batchLTV(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No suppliers found matching the specified criteria');
    });

    it('should require admin permissions for batch operations', async () => {
      // Mock user without batch permissions
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            role: 'user',
            permissions: ['analytics:read'] // Missing analytics:batch
          },
          error: null
        })
      });

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierIds: ['supplier-123']
        })
      });

      const response = await batchLTV(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized. Batch operations require admin/executive permissions.');
    });
  });

  describe('GET /api/analytics/ltv/batch', () => {
    it('should retrieve batch job status', async () => {
      const mockJob = {
        batch_id: 'batch_ltv_123',
        status: 'processing',
        total_items: 100,
        processed_items: 45,
        results: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockJob,
          error: null
        })
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/batch?batchId=batch_ltv_123',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getBatchStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.batchId).toBe('batch_ltv_123');
      expect(data.status).toBe('processing');
      expect(data.progress).toMatchObject({
        processed: 45,
        total: 100,
        estimatedTimeRemaining: 110 // (100-45) * 2 seconds
      });
    });

    it('should require batchId parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/batch',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getBatchStatus(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('batchId query parameter is required');
    });

    it('should return 404 for non-existent batch job', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found')
        })
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/batch?batchId=nonexistent',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getBatchStatus(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Batch job not found');
    });

    it('should include download URL for completed large jobs', async () => {
      const mockCompletedJob = {
        batch_id: 'batch_ltv_123',
        status: 'completed',
        total_items: 500, // Large job
        processed_items: 500,
        results: { /* large result set */ }
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCompletedJob,
          error: null
        })
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/ltv/batch?batchId=batch_ltv_123',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getBatchStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.downloadUrl).toBe('/api/analytics/ltv/batch/download?batchId=batch_ltv_123');
      expect(data.expiresAt).toBeDefined();
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should complete within reasonable time limits', async () => {
      const startTime = Date.now();

      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          supplierId: 'supplier-123'
        })
      });

      await predictLTV(request);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // API should respond within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify({
            supplierId: 'supplier-123'
          })
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => predictLTV(req)));
      const executionTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(executionTime).toBeLessThan(10000); // All requests should complete within 10 seconds
    });
  });

  describe('Audit Logging', () => {
    it('should log LTV prediction requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/ltv/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-browser/1.0'
        },
        body: JSON.stringify({
          supplierId: 'supplier-123',
          includeBreakdown: true
        })
      });

      await predictLTV(request);

      // Verify audit log was created
      expect(mockSupabase.from).toHaveBeenCalledWith('financial_audit_log');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'ltv_prediction',
        resource_id: 'supplier-123',
        resource_type: 'supplier',
        details: expect.objectContaining({
          predictedLTV: mockLTVPrediction.predictedLTV,
          confidence: mockLTVPrediction.confidence,
          modelVersion: mockLTVPrediction.modelVersion
        }),
        ip_address: '192.168.1.1',
        user_agent: 'test-browser/1.0'
      });
    });
  });
});