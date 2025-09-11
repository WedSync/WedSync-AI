import FeatureStore, {
  SupplierFeatures,
  CoupleFeatures,
  TransactionFeatures,
} from '@/lib/ml/feature-store';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({ error: null }),
    })),
    rpc: jest.fn(),
  })),
}));

describe('FeatureStore', () => {
  let featureStore: FeatureStore;
  let mockSupplierFeatures: SupplierFeatures;
  let mockCoupleFeatures: CoupleFeatures;
  let mockTransactionFeatures: TransactionFeatures;

  beforeEach(() => {
    featureStore = new FeatureStore();

    mockSupplierFeatures = {
      supplierId: 'test-supplier-1',
      vendorType: 'photographer',
      daysSinceLogin: 3,
      totalForms: 8,
      recentForms: 2,
      totalClients: 12,
      activeClients: 10,
      couplesInvited: 20,
      couplesActivated: 16,
      avgSessionDuration: 1500,
      activeDaysLastMonth: 22,
      negativeTickets: 0,
      failedPayments: 0,
      competitorMentions: 0,
      mrr: 79,
      ltv: 948,
      seasonalityFactor: 1.3,
      engagementScore: 8.7,
      viralCoefficient: 0.85,
      customerHealthScore: 9.1,
    };

    mockCoupleFeatures = {
      coupleId: 'test-couple-1',
      weddingDate: '2024-06-15',
      daysTillWedding: 90,
      totalBudget: 25000,
      budgetSpent: 15000,
      vendorsConnected: 6,
      tasksCompleted: 35,
      totalTasks: 50,
      engagementLevel: 8.2,
      lastActivityDays: 2,
      planningStress: 6.5,
      satisfactionScore: 8.5,
    };

    mockTransactionFeatures = {
      transactionId: 'test-transaction-1',
      supplierId: 'test-supplier-1',
      amount: 79,
      transactionType: 'subscription',
      daysSinceLastTransaction: 30,
      totalTransactionValue: 948,
      averageTransactionValue: 79,
      transactionFrequency: 12,
      seasonalityAdjustment: 1.3,
      riskScore: 2.1,
    };
  });

  describe('storeFeatures', () => {
    it('should store features successfully', async () => {
      const featureSet = {
        entity_type: 'supplier' as const,
        entity_id: 'test-supplier-1',
        feature_set: 'churn_prediction',
        features: mockSupplierFeatures,
        feature_version: 1,
      };

      const result = await featureStore.storeFeatures(featureSet);
      expect(result).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      // Mock upsert to return error
      featureStore['supabase'].from = jest.fn(() => ({
        upsert: jest
          .fn()
          .mockResolvedValue({ error: new Error('Storage failed') }),
      }));

      const featureSet = {
        entity_type: 'supplier' as const,
        entity_id: 'test-supplier-1',
        feature_set: 'churn_prediction',
        features: mockSupplierFeatures,
      };

      const result = await featureStore.storeFeatures(featureSet);
      expect(result).toBe(false);
    });
  });

  describe('getFeatures', () => {
    it('should retrieve features when they exist and are not expired', async () => {
      const mockData = { features: mockSupplierFeatures };
      featureStore['supabase'].from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      }));

      const features = await featureStore.getFeatures(
        'supplier',
        'test-supplier-1',
        'churn_prediction',
      );

      expect(features).toEqual(mockSupplierFeatures);
    });

    it('should return null when features do not exist', async () => {
      featureStore['supabase'].from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Not found') }),
      }));

      const features = await featureStore.getFeatures(
        'supplier',
        'non-existent',
        'churn_prediction',
      );

      expect(features).toBeNull();
    });
  });

  describe('extractSupplierFeatures', () => {
    it('should extract and cache supplier features', async () => {
      const mockRpcData = {
        vendor_type: 'photographer',
        days_since_login: 3,
        total_forms: 8,
        recent_forms: 2,
        total_clients: 12,
        active_clients: 10,
        couples_invited: 20,
        couples_activated: 16,
        avg_session_duration: 1500,
        active_days_last_month: 22,
        negative_tickets: 0,
        failed_payments: 0,
        competitor_mentions: 0,
        mrr: 79,
        estimated_ltv: 948,
        viral_coefficient: 0.85,
      };

      // Mock cached features don't exist
      featureStore.getFeatures = jest.fn().mockResolvedValue(null);

      // Mock RPC call
      featureStore['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      // Mock storeFeatures
      featureStore.storeFeatures = jest.fn().mockResolvedValue(true);

      const features =
        await featureStore.extractSupplierFeatures('test-supplier-1');

      expect(features).toBeDefined();
      expect(features?.supplierId).toBe('test-supplier-1');
      expect(features?.vendorType).toBe('photographer');
      expect(features?.seasonalityFactor).toBeGreaterThan(0);
      expect(features?.engagementScore).toBeGreaterThan(0);
      expect(features?.customerHealthScore).toBeGreaterThan(0);
    });

    it('should return cached features when available', async () => {
      featureStore.getFeatures = jest
        .fn()
        .mockResolvedValue(mockSupplierFeatures);

      const features =
        await featureStore.extractSupplierFeatures('test-supplier-1');

      expect(features).toEqual(mockSupplierFeatures);
      expect(featureStore['supabase'].rpc).not.toHaveBeenCalled();
    });

    it('should handle extraction errors gracefully', async () => {
      featureStore.getFeatures = jest.fn().mockResolvedValue(null);
      featureStore['supabase'].rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      });

      const features =
        await featureStore.extractSupplierFeatures('error-supplier');

      expect(features).toBeNull();
    });
  });

  describe('extractCoupleFeatures', () => {
    it('should extract couple features with wedding date calculations', async () => {
      const weddingDate = new Date();
      weddingDate.setDate(weddingDate.getDate() + 90); // 90 days from now

      const mockRpcData = {
        wedding_date: weddingDate.toISOString(),
        total_budget: 25000,
        budget_spent: 15000,
        vendors_connected: 6,
        tasks_completed: 35,
        total_tasks: 50,
        last_activity_days: 2,
        satisfaction_score: 8.5,
      };

      featureStore.getFeatures = jest.fn().mockResolvedValue(null);
      featureStore['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      });
      featureStore.storeFeatures = jest.fn().mockResolvedValue(true);

      const features =
        await featureStore.extractCoupleFeatures('test-couple-1');

      expect(features).toBeDefined();
      expect(features?.coupleId).toBe('test-couple-1');
      expect(features?.daysTillWedding).toBeCloseTo(90, 0);
      expect(features?.engagementLevel).toBeGreaterThan(0);
      expect(features?.planningStress).toBeGreaterThan(0);
    });
  });

  describe('extractTransactionFeatures', () => {
    it('should extract transaction features with risk calculations', async () => {
      const mockRpcData = {
        supplier_id: 'test-supplier-1',
        amount: 79,
        transaction_type: 'subscription',
        days_since_last_transaction: 30,
        total_transaction_value: 948,
        average_transaction_value: 79,
        transaction_frequency: 12,
      };

      featureStore['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      });
      featureStore.storeFeatures = jest.fn().mockResolvedValue(true);

      const features =
        await featureStore.extractTransactionFeatures('test-transaction-1');

      expect(features).toBeDefined();
      expect(features?.transactionId).toBe('test-transaction-1');
      expect(features?.supplierId).toBe('test-supplier-1');
      expect(features?.seasonalityAdjustment).toBeGreaterThan(0);
      expect(features?.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateSeasonalityFactor', () => {
    it('should return correct seasonal multipliers for different months', () => {
      // Mock different months by setting system date
      const originalDate = Date;

      // June (peak season)
      global.Date = jest.fn(() => ({
        getMonth: () => 5, // June (0-indexed)
      })) as any;

      let factor = featureStore['calculateSeasonalityFactor']();
      expect(factor).toBe(1.6);

      // January (off season)
      global.Date = jest.fn(() => ({
        getMonth: () => 0, // January
      })) as any;

      factor = featureStore['calculateSeasonalityFactor']();
      expect(factor).toBe(0.6);

      global.Date = originalDate;
    });
  });

  describe('calculateEngagementScore', () => {
    it('should calculate engagement score correctly', () => {
      const mockData = {
        days_since_login: 5,
        recent_forms: 3,
        active_clients: 8,
        avg_session_duration: 1200,
      };

      const score = featureStore['calculateEngagementScore'](mockData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should handle missing data gracefully', () => {
      const mockData = {};

      const score = featureStore['calculateEngagementScore'](mockData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateHealthScore', () => {
    it('should calculate customer health score correctly', () => {
      const mockData = {
        failed_payments: 0,
        negative_tickets: 0,
        active_days_last_month: 20,
        couples_activated: 15,
        couples_invited: 20,
      };

      const score = featureStore['calculateHealthScore'](mockData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should penalize for failed payments and negative tickets', () => {
      const healthyData = {
        failed_payments: 0,
        negative_tickets: 0,
        active_days_last_month: 20,
        couples_activated: 15,
        couples_invited: 20,
      };

      const unhealthyData = {
        failed_payments: 2,
        negative_tickets: 3,
        active_days_last_month: 5,
        couples_activated: 2,
        couples_invited: 20,
      };

      const healthyScore = featureStore['calculateHealthScore'](healthyData);
      const unhealthyScore =
        featureStore['calculateHealthScore'](unhealthyData);

      expect(healthyScore).toBeGreaterThan(unhealthyScore);
    });
  });

  describe('calculateCoupleEngagement', () => {
    it('should calculate couple engagement level correctly', () => {
      const mockData = {
        tasks_completed: 35,
        total_tasks: 50,
        vendors_connected: 6,
        total_budget: 25000,
        budget_spent: 15000,
        last_activity_days: 2,
      };

      const engagement = featureStore['calculateCoupleEngagement'](mockData);

      expect(engagement).toBeGreaterThanOrEqual(0);
      expect(engagement).toBeLessThanOrEqual(10);
    });
  });

  describe('calculatePlanningStress', () => {
    it('should calculate higher stress for approaching weddings', () => {
      const nearWeddingStress = featureStore['calculatePlanningStress'](15, {
        total_budget: 25000,
        budget_spent: 20000,
        tasks_completed: 30,
        total_tasks: 50,
      });

      const farWeddingStress = featureStore['calculatePlanningStress'](180, {
        total_budget: 25000,
        budget_spent: 10000,
        tasks_completed: 35,
        total_tasks: 50,
      });

      expect(nearWeddingStress).toBeGreaterThan(farWeddingStress);
    });
  });

  describe('calculateTransactionRisk', () => {
    it('should calculate transaction risk score', () => {
      const riskData = {
        transaction_frequency: 0.5,
        amount: 500,
        average_transaction_value: 100,
        days_since_last_transaction: 120,
      };

      const risk = featureStore['calculateTransactionRisk'](riskData);

      expect(risk).toBeGreaterThanOrEqual(0);
      expect(risk).toBeLessThanOrEqual(10);
    });
  });

  describe('cleanExpiredFeatures', () => {
    it('should remove expired features successfully', async () => {
      const result = await featureStore.cleanExpiredFeatures();
      expect(result).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      featureStore['supabase'].from = jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      }));

      const result = await featureStore.cleanExpiredFeatures();
      expect(result).toBe(false);
    });
  });

  describe('getFeatureStoreStats', () => {
    it('should return feature store statistics', async () => {
      const mockStats = {
        totalFeatures: 150,
        byEntityType: { supplier: 80, couple: 50, transaction: 20 },
        byFeatureSet: {
          churn_prediction: 80,
          engagement_prediction: 50,
          revenue_prediction: 20,
        },
        expiredFeatures: 5,
      };

      featureStore['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const stats = await featureStore.getFeatureStoreStats();

      expect(stats).toEqual(mockStats);
      expect(stats?.totalFeatures).toBe(150);
      expect(stats?.byEntityType.supplier).toBe(80);
    });

    it('should handle stats retrieval errors', async () => {
      featureStore['supabase'].rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Stats failed'),
      });

      const stats = await featureStore.getFeatureStoreStats();
      expect(stats).toBeNull();
    });
  });
});
