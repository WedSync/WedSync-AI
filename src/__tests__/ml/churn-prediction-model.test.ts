import { WeddingSupplierChurnPredictor } from '@/lib/ml/churn-prediction-model';
import { SupplierFeatures } from '@/lib/ml/feature-store';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

describe('WeddingSupplierChurnPredictor', () => {
  let predictor: WeddingSupplierChurnPredictor;
  let mockFeatures: SupplierFeatures;

  beforeEach(() => {
    predictor = new WeddingSupplierChurnPredictor();
    mockFeatures = {
      supplierId: 'test-supplier-id',
      vendorType: 'photographer',
      daysSinceLogin: 7,
      totalForms: 5,
      recentForms: 2,
      totalClients: 10,
      activeClients: 8,
      couplesInvited: 15,
      couplesActivated: 12,
      avgSessionDuration: 1200, // 20 minutes
      activeDaysLastMonth: 18,
      negativeTickets: 0,
      failedPayments: 0,
      competitorMentions: 0,
      mrr: 49,
      ltv: 588, // 12 months * 49
      seasonalityFactor: 1.3,
      engagementScore: 8.5,
      viralCoefficient: 0.8,
      customerHealthScore: 9.2,
    };
  });

  describe('predictChurn', () => {
    it('should predict low churn for healthy suppliers', async () => {
      // Mock supabase.rpc to return healthy supplier data
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          vendor_type: 'photographer',
          days_since_login: 2,
          total_forms: 10,
          recent_forms: 3,
          total_clients: 20,
          active_clients: 15,
          couples_invited: 25,
          couples_activated: 20,
          avg_session_duration: 1800,
          active_days_last_month: 25,
          negative_tickets: 0,
          failed_payments: 0,
          competitor_mentions: 0,
          mrr: 79,
          estimated_ltv: 948,
        },
        error: null,
      });

      predictor['supabase'].rpc = mockRpc;

      const prediction = await predictor.predictChurn('healthy-supplier-id');

      expect(prediction).toBeDefined();
      expect(prediction.supplierId).toBe('healthy-supplier-id');
      expect(prediction.riskLevel).toBe('low');
      expect(prediction.churnProbability).toBeLessThan(0.3);
      expect(prediction.interventions.length).toBeGreaterThanOrEqual(0);
    });

    it('should predict high churn for inactive suppliers with failed payments', async () => {
      // Mock supabase.rpc to return unhealthy supplier data
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          vendor_type: 'photographer',
          days_since_login: 30,
          total_forms: 1,
          recent_forms: 0,
          total_clients: 2,
          active_clients: 0,
          couples_invited: 3,
          couples_activated: 1,
          avg_session_duration: 300,
          active_days_last_month: 2,
          negative_tickets: 2,
          failed_payments: 2,
          competitor_mentions: 1,
          mrr: 19,
          estimated_ltv: 76,
        },
        error: null,
      });

      predictor['supabase'].rpc = mockRpc;

      const prediction = await predictor.predictChurn('unhealthy-supplier-id');

      expect(prediction).toBeDefined();
      expect(prediction.riskLevel).toBe('critical');
      expect(prediction.churnProbability).toBeGreaterThan(0.7);
      expect(prediction.interventions.length).toBeGreaterThan(0);

      // Should have immediate outreach intervention
      const immediateOutreach = prediction.interventions.find(
        (i) => i.type === 'immediate_outreach',
      );
      expect(immediateOutreach).toBeDefined();
      expect(immediateOutreach?.priority).toBe('critical');
    });

    it('should adjust predictions for wedding seasonality', () => {
      const offSeasonMultiplier = predictor['getSeasonalMultiplier']('January');
      const peakSeasonMultiplier = predictor['getSeasonalMultiplier']('June');

      expect(peakSeasonMultiplier).toBeGreaterThan(offSeasonMultiplier);
      expect(offSeasonMultiplier).toBe(0.6);
      expect(peakSeasonMultiplier).toBe(1.6);
    });

    it('should generate appropriate interventions by risk level', async () => {
      const criticalRiskFeatures = {
        ...mockFeatures,
        daysSinceLogin: 45,
        failedPayments: 3,
      };
      const criticalInterventions = await predictor.generateInterventions(
        { probability: 0.85, confidence: 0.9, estimatedDate: new Date() },
        criticalRiskFeatures,
      );

      expect(criticalInterventions.length).toBeGreaterThan(0);
      expect(criticalInterventions.some((i) => i.priority === 'critical')).toBe(
        true,
      );
      expect(
        criticalInterventions.some((i) => i.type === 'immediate_outreach'),
      ).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      predictor['supabase'].rpc = mockRpc;

      await expect(
        predictor.predictChurn('error-supplier-id'),
      ).rejects.toThrow();
    });
  });

  describe('generateInterventions', () => {
    it('should recommend immediate outreach for high risk suppliers', async () => {
      const highRiskPrediction = {
        probability: 0.8,
        confidence: 0.9,
        estimatedDate: new Date(),
      };
      const interventions = await predictor.generateInterventions(
        highRiskPrediction,
        mockFeatures,
      );

      const immediateOutreach = interventions.find(
        (i) => i.type === 'immediate_outreach',
      );
      expect(immediateOutreach).toBeDefined();
      expect(immediateOutreach?.priority).toBe('critical');
      expect(immediateOutreach?.script).toContain(mockFeatures.vendorType);
    });

    it('should recommend engagement campaign for inactive suppliers', async () => {
      const inactiveFeatures = { ...mockFeatures, daysSinceLogin: 20 };
      const interventions = await predictor.generateInterventions(
        { probability: 0.5, confidence: 0.8, estimatedDate: new Date() },
        inactiveFeatures,
      );

      const engagementCampaign = interventions.find(
        (i) => i.type === 'engagement_campaign',
      );
      expect(engagementCampaign).toBeDefined();
      expect(engagementCampaign?.action).toContain('re-engagement');
    });

    it('should recommend growth assistance for suppliers with few clients', async () => {
      const lowClientFeatures = { ...mockFeatures, activeClients: 2 };
      const interventions = await predictor.generateInterventions(
        { probability: 0.4, confidence: 0.7, estimatedDate: new Date() },
        lowClientFeatures,
      );

      const growthAssistance = interventions.find(
        (i) => i.type === 'growth_assistance',
      );
      expect(growthAssistance).toBeDefined();
      expect(growthAssistance?.action).toContain('onboarding');
    });
  });

  describe('getRiskLevel', () => {
    it('should correctly classify risk levels', () => {
      expect(predictor['getRiskLevel'](0.9)).toBe('critical');
      expect(predictor['getRiskLevel'](0.7)).toBe('high');
      expect(predictor['getRiskLevel'](0.5)).toBe('medium');
      expect(predictor['getRiskLevel'](0.2)).toBe('low');
    });
  });

  describe('generateOutreachScript', () => {
    it('should personalize outreach script with supplier information', () => {
      const script = predictor['generateOutreachScript'](mockFeatures);

      expect(script).toContain(mockFeatures.daysSinceLogin.toString());
      expect(script).toContain(mockFeatures.vendorType);
      expect(script).toContain('WedSync');
    });
  });

  describe('calculateRetentionOffer', () => {
    it('should provide appropriate retention offers based on MRR', () => {
      expect(predictor['calculateRetentionOffer'](150)).toContain(
        '3 months free',
      );
      expect(predictor['calculateRetentionOffer'](75)).toContain(
        '2 months free',
      );
      expect(predictor['calculateRetentionOffer'](25)).toContain(
        '1 month free',
      );
    });
  });

  describe('applyWeddingSeasonality', () => {
    it('should apply correct seasonal adjustments', () => {
      const baseFeatures = { ...mockFeatures };

      // Mock different months
      const juneAdjusted = predictor['applyWeddingSeasonality'](
        baseFeatures,
        'June',
      );
      const januaryAdjusted = predictor['applyWeddingSeasonality'](
        baseFeatures,
        'January',
      );

      expect(juneAdjusted.seasonalityFactor).toBe(1.6);
      expect(januaryAdjusted.seasonalityFactor).toBe(0.6);
    });
  });

  describe('ensemble prediction methods', () => {
    it('should combine multiple algorithms for robust predictions', async () => {
      const features = mockFeatures;

      // Mock individual algorithm predictions
      const lgPrediction = await predictor['logisticRegression'](features);
      const rfPrediction = await predictor['randomForest'](features);
      const gbPrediction = await predictor['gradientBoosting'](features);

      expect(lgPrediction).toBeDefined();
      expect(rfPrediction).toBeDefined();
      expect(gbPrediction).toBeDefined();

      const ensemble = predictor['weightedEnsemble']([
        lgPrediction,
        rfPrediction,
        gbPrediction,
      ]);

      expect(ensemble.probability).toBeGreaterThanOrEqual(0);
      expect(ensemble.probability).toBeLessThanOrEqual(1);
      expect(ensemble.confidence).toBeGreaterThanOrEqual(0);
      expect(ensemble.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('explainPrediction', () => {
    it('should provide meaningful factor explanations', () => {
      const prediction = { probability: 0.7, confidence: 0.8 };
      const factors = predictor['explainPrediction'](mockFeatures, prediction);

      expect(factors).toBeDefined();
      expect(Array.isArray(factors)).toBe(true);
      expect(factors.length).toBeGreaterThan(0);

      factors.forEach((factor) => {
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('impact');
        expect(factor).toHaveProperty('description');
        expect(factor.impact).toBeGreaterThanOrEqual(-1);
        expect(factor.impact).toBeLessThanOrEqual(1);
      });
    });
  });
});
