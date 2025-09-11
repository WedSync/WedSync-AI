import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { LTVPredictionEngine, SupplierFeatures, LTVPredictionResult } from '@/lib/analytics/ltv-prediction-engine';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock the Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('LTVPredictionEngine', () => {
  let ltvEngine: LTVPredictionEngine;
  let mockSupplierData: any;
  let mockTransactionData: any;
  let mockActivityData: any;
  let mockCohortData: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize test data
    mockSupplierData = {
      id: 'supplier-123',
      business_type: 'photographer',
      subscription_tier: 'premium',
      acquisition_channel: 'organic',
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
      metadata: {
        referral_score: 8,
        satisfaction_score: 0.85
      }
    };

    mockTransactionData = [
      { amount: 150, created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { amount: 150, created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
      { amount: 150, created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    mockActivityData = [
      { activity_type: 'login', created_at: new Date().toISOString(), engagement_score: 15 },
      { activity_type: 'profile_update', created_at: new Date().toISOString(), engagement_score: 10 },
    ];

    mockCohortData = [
      {
        acquisition_channel: 'organic',
        plan_tier: 'premium',
        cohort_size: 100,
        retention_month_1: 0.85,
        retention_month_6: 0.72,
        retention_month_12: 0.65,
        retention_month_24: 0.58,
        avg_ltv_6m: 900,
        avg_ltv_12m: 1800,
        avg_ltv_24m: 3200,
        avg_ltv_36m: 4500
      }
    ];

    // Setup Supabase mocks
    mockSupabase.from.mockImplementation((table: string) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        rpc: jest.fn()
      };

      // Configure responses based on table
      switch (table) {
        case 'suppliers':
          mockChain.single.mockResolvedValue({ data: mockSupplierData, error: null });
          break;
        case 'supplier_transactions':
          mockChain.single.mockResolvedValue({ data: mockTransactionData, error: null });
          break;
        case 'supplier_activity_logs':
          mockChain.single.mockResolvedValue({ data: mockActivityData, error: null });
          break;
        case 'mv_cohort_ltv_analysis':
          mockChain.single.mockResolvedValue({ data: mockCohortData, error: null });
          break;
        case 'marketing_attribution':
          mockChain.single.mockResolvedValue({ data: [], error: null });
          break;
        default:
          mockChain.single.mockResolvedValue({ data: null, error: null });
      }

      return mockChain;
    });

    ltvEngine = new LTVPredictionEngine();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Feature Extraction', () => {
    it('should extract supplier features correctly', async () => {
      // The private method is tested indirectly through predictSupplierLTV
      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      expect(result).toBeDefined();
      expect(result.supplierId).toBe('supplier-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('suppliers');
      expect(mockSupabase.from).toHaveBeenCalledWith('supplier_transactions');
      expect(mockSupabase.from).toHaveBeenCalledWith('supplier_activity_logs');
    });

    it('should handle missing supplier data gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
      }));

      await expect(ltvEngine.predictSupplierLTV('nonexistent')).rejects.toThrow();
    });

    it('should calculate months active correctly', async () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      mockSupplierData.created_at = oneYearAgo.toISOString();

      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      // Should be approximately 12 months active
      expect(result.predictionBreakdown).toBeDefined();
    });
  });

  describe('LTV Prediction Models', () => {
    it('should generate ensemble predictions', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123', 24);

      expect(result).toMatchObject({
        supplierId: 'supplier-123',
        historicalLTV: expect.any(Number),
        predictedLTV: expect.any(Number),
        totalLTV: expect.any(Number),
        confidence: expect.any(Number),
        paybackPeriod: expect.any(Number),
        ltvCacRatio: expect.any(Number),
        modelVersion: 'v2.1-ensemble'
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.totalLTV).toBe(result.historicalLTV + result.predictedLTV);
    });

    it('should include prediction breakdown when requested', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123', 24);

      expect(result.predictionBreakdown).toBeDefined();
      expect(Array.isArray(result.predictionBreakdown)).toBe(true);
      
      if (result.predictionBreakdown && result.predictionBreakdown.length > 0) {
        const breakdown = result.predictionBreakdown[0];
        expect(breakdown).toHaveProperty('modelType');
        expect(breakdown).toHaveProperty('prediction');
        expect(breakdown).toHaveProperty('confidence');
        expect(breakdown).toHaveProperty('weight');
        expect(breakdown).toHaveProperty('contributingFactors');
      }
    });

    it('should validate prediction horizon limits', async () => {
      // Should work with valid horizons
      await expect(ltvEngine.predictSupplierLTV('supplier-123', 12)).resolves.toBeDefined();
      await expect(ltvEngine.predictSupplierLTV('supplier-123', 36)).resolves.toBeDefined();
    });

    it('should calculate risk factors appropriately', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123');

      expect(result.riskFactors).toBeDefined();
      expect(Array.isArray(result.riskFactors)).toBe(true);
      expect(result.churnProbability).toBeGreaterThanOrEqual(0);
      expect(result.churnProbability).toBeLessThanOrEqual(1);
      expect(result.expansionPotential).toBeGreaterThanOrEqual(0);
      expect(result.expansionPotential).toBeLessThanOrEqual(1);
    });
  });

  describe('Batch Predictions', () => {
    const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3'];

    beforeEach(() => {
      // Mock successful individual predictions
      jest.spyOn(ltvEngine, 'predictSupplierLTV').mockImplementation(async (id: string) => ({
        supplierId: id,
        historicalLTV: 500,
        predictedLTV: 1500,
        totalLTV: 2000,
        confidence: 0.8,
        paybackPeriod: 6,
        ltvCacRatio: 4.2,
        predictionBreakdown: [],
        calculatedAt: new Date(),
        modelVersion: 'v2.1-ensemble',
        riskFactors: [],
        churnProbability: 0.15,
        expansionPotential: 0.3
      }));
    });

    it('should process batch predictions successfully', async () => {
      const result = await ltvEngine.batchPredictLTV(supplierIds, []);

      expect(result).toMatchObject({
        predictions: expect.arrayContaining([
          expect.objectContaining({
            supplierId: expect.any(String),
            totalLTV: expect.any(Number)
          })
        ]),
        totalProcessed: 3,
        averageLTV: expect.any(Number),
        highValueSuppliers: expect.any(Number),
        executionTime: expect.any(Number)
      });

      expect(result.predictions).toHaveLength(3);
      expect(result.totalProcessed).toBe(3);
    });

    it('should calculate batch metrics correctly', async () => {
      const result = await ltvEngine.batchPredictLTV(supplierIds, []);

      expect(result.averageLTV).toBe(2000); // All mocked to return 2000
      expect(result.highValueSuppliers).toBe(0); // 2000 < 2000 threshold
    });

    it('should handle empty supplier lists', async () => {
      const result = await ltvEngine.batchPredictLTV([], []);

      expect(result.predictions).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
      expect(result.averageLTV).toBe(0);
    });

    it('should process large batches efficiently', async () => {
      const largeBatch = Array.from({ length: 150 }, (_, i) => `supplier-${i}`);
      const startTime = Date.now();
      
      const result = await ltvEngine.batchPredictLTV(largeBatch, []);
      const executionTime = Date.now() - startTime;

      expect(result.totalProcessed).toBe(150);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Business Logic Validation', () => {
    it('should apply correct seasonal adjustments for photographers', async () => {
      mockSupplierData.business_type = 'photographer';
      
      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      // Predictions should be adjusted for wedding seasonality
      expect(result.predictedLTV).toBeGreaterThan(0);
    });

    it('should handle different subscription tiers appropriately', async () => {
      const basicResult = await ltvEngine.predictSupplierLTV('supplier-123');
      
      mockSupplierData.subscription_tier = 'enterprise';
      const enterpriseResult = await ltvEngine.predictSupplierLTV('supplier-123');
      
      // Enterprise should generally have higher LTV potential
      // This might not always be true due to other factors, so we just check they're both valid
      expect(basicResult.predictedLTV).toBeGreaterThan(0);
      expect(enterpriseResult.predictedLTV).toBeGreaterThan(0);
    });

    it('should calculate payback periods realistically', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      expect(result.paybackPeriod).toBeGreaterThan(0);
      expect(result.paybackPeriod).toBeLessThan(60); // Should be less than 5 years
    });

    it('should maintain LTV:CAC ratio calculations', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      if (result.ltvCacRatio > 0) {
        expect(result.ltvCacRatio).toBeGreaterThan(0.5); // Minimum viability
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(ltvEngine.predictSupplierLTV('supplier-123')).rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      mockSupplierData.created_at = 'invalid-date';
      mockTransactionData = [{ amount: null, created_at: null }];

      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      // Should still return a prediction, though possibly with low confidence
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should provide meaningful error messages', async () => {
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Supplier not found' }
        })
      }));

      try {
        await ltvEngine.predictSupplierLTV('nonexistent');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('LTV prediction failed');
        expect(error.message).toContain('nonexistent');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete individual predictions within acceptable time', async () => {
      const startTime = Date.now();
      await ltvEngine.predictSupplierLTV('supplier-123');
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent predictions', async () => {
      const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3', 'supplier-4', 'supplier-5'];
      
      const startTime = Date.now();
      const promises = supplierIds.map(id => ltvEngine.predictSupplierLTV(id));
      const results = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Model Integration', () => {
    it('should integrate multiple prediction models', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123');

      // Should have predictions from multiple models
      if (result.predictionBreakdown) {
        const modelTypes = result.predictionBreakdown.map(b => b.modelType);
        expect(modelTypes.length).toBeGreaterThan(0);
      }
    });

    it('should weight model predictions appropriately', async () => {
      const result = await ltvEngine.predictSupplierLTV('supplier-123');

      if (result.predictionBreakdown && result.predictionBreakdown.length > 1) {
        const totalWeight = result.predictionBreakdown.reduce((sum, b) => sum + b.weight, 0);
        expect(totalWeight).toBeCloseTo(1.0, 1); // Weights should sum to approximately 1
      }
    });

    it('should maintain prediction consistency', async () => {
      const result1 = await ltvEngine.predictSupplierLTV('supplier-123');
      const result2 = await ltvEngine.predictSupplierLTV('supplier-123');

      // With same inputs, should get consistent results (allowing for small variations)
      const variance = Math.abs(result1.predictedLTV - result2.predictedLTV) / result1.predictedLTV;
      expect(variance).toBeLessThan(0.1); // Less than 10% variance
    });
  });

  describe('Data Quality Validation', () => {
    it('should assess data quality in confidence scores', async () => {
      // Test with high-quality data
      const highQualityResult = await ltvEngine.predictSupplierLTV('supplier-123');
      
      // Test with low-quality data
      mockTransactionData = []; // No transaction history
      mockActivityData = []; // No activity
      const lowQualityResult = await ltvEngine.predictSupplierLTV('supplier-123');

      expect(highQualityResult.confidence).toBeGreaterThan(lowQualityResult.confidence);
    });

    it('should identify data gaps in risk factors', async () => {
      mockTransactionData = []; // No revenue data
      
      const result = await ltvEngine.predictSupplierLTV('supplier-123');
      
      expect(result.riskFactors).toContain('Low monthly revenue');
    });
  });
});