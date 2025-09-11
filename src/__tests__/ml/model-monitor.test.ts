import ModelMonitor, {
  ModelHealth,
  ModelMetrics,
  FeatureDrift,
  ModelAlert,
} from '@/lib/ml/model-monitor';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      gte: jest.fn().mockReturnThis(),
    })),
  })),
}));

describe('ModelMonitor', () => {
  let monitor: ModelMonitor;
  let mockMetrics: ModelMetrics;
  let mockModel: any;

  beforeEach(() => {
    monitor = new ModelMonitor();

    mockMetrics = {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.87,
      f1Score: 0.84,
      auc: 0.89,
      mse: 0.12,
      mae: 0.08,
      calibrationScore: 0.91,
    };

    mockModel = {
      id: 'test-model-id',
      model_name: 'churn_predictor_v1',
      model_type: 'churn',
      status: 'deployed',
    };
  });

  describe('evaluateModelPerformance', () => {
    it('should evaluate model performance correctly', async () => {
      const mockRpcData = {
        accuracy: 0.85,
        precision: 0.82,
        recall: 0.87,
        f1_score: 0.84,
        auc: 0.89,
        mse: 0.12,
        mae: 0.08,
        calibration_score: 0.91,
      };

      monitor['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      // Mock storeModelMetrics
      monitor['storeModelMetrics'] = jest.fn().mockResolvedValue(undefined);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const metrics = await monitor.evaluateModelPerformance(
        'test-model-id',
        startDate,
        endDate,
      );

      expect(metrics).toEqual(mockMetrics);
      expect(monitor['supabase'].rpc).toHaveBeenCalledWith(
        'evaluate_model_performance',
        {
          model_id: 'test-model-id',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      );
    });

    it('should handle evaluation errors', async () => {
      monitor['supabase'].rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Evaluation failed'),
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await expect(
        monitor.evaluateModelPerformance('test-model-id', startDate, endDate),
      ).rejects.toThrow('Failed to evaluate model performance');
    });
  });

  describe('detectFeatureDrift', () => {
    it('should detect feature drift correctly', async () => {
      const mockDriftData = [
        {
          feature_name: 'days_since_login',
          drift_score: 0.15,
          p_value: 0.02,
          is_drifting: true,
          drift_type: 'mean',
        },
        {
          feature_name: 'total_clients',
          drift_score: 0.05,
          p_value: 0.15,
          is_drifting: false,
          drift_type: 'distribution',
        },
      ];

      monitor['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockDriftData,
        error: null,
      });

      const referencePeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-15'),
      };
      const comparisonPeriod = {
        start: new Date('2024-01-16'),
        end: new Date('2024-01-31'),
      };

      const drifts = await monitor.detectFeatureDrift(
        'test-model-id',
        referencePeriod,
        comparisonPeriod,
      );

      expect(drifts).toHaveLength(2);
      expect(drifts[0].featureName).toBe('days_since_login');
      expect(drifts[0].isDrifting).toBe(true);
      expect(drifts[0].recommendation).toContain('Mean drift detected');
      expect(drifts[1].isDrifting).toBe(false);
      expect(drifts[1].recommendation).toContain('No action required');
    });

    it('should return empty array on drift detection errors', async () => {
      monitor['supabase'].rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Drift detection failed'),
      });

      const referencePeriod = { start: new Date(), end: new Date() };
      const comparisonPeriod = { start: new Date(), end: new Date() };

      const drifts = await monitor.detectFeatureDrift(
        'test-model-id',
        referencePeriod,
        comparisonPeriod,
      );

      expect(drifts).toEqual([]);
    });
  });

  describe('getModelHealth', () => {
    it('should return comprehensive model health assessment', async () => {
      // Mock model data
      monitor['supabase'].from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockModel, error: null }),
      }));

      // Mock performance evaluation
      monitor.evaluateModelPerformance = jest
        .fn()
        .mockResolvedValue(mockMetrics);

      // Mock drift detection
      monitor.detectFeatureDrift = jest.fn().mockResolvedValue([]);

      // Mock active alerts
      monitor['getActiveAlerts'] = jest.fn().mockResolvedValue([]);

      // Mock performance trend
      monitor['getPerformanceTrend'] = jest.fn().mockResolvedValue('stable');

      const health = await monitor.getModelHealth('test-model-id');

      expect(health).toBeDefined();
      expect(health?.modelId).toBe('test-model-id');
      expect(health?.modelName).toBe('churn_predictor_v1');
      expect(health?.status).toBe('healthy');
      expect(health?.overallScore).toBeGreaterThan(70);
      expect(health?.metrics).toEqual(mockMetrics);
      expect(health?.performanceTrend).toBe('stable');
    });

    it('should return null for non-existent models', async () => {
      monitor['supabase'].from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Not found') }),
      }));

      const health = await monitor.getModelHealth('non-existent-model');

      expect(health).toBeNull();
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      const mockReportData = {
        total_predictions: 1500,
        correct_predictions: 1275,
        average_confidence: 0.83,
        performance_by_segment: {
          photographers: {
            accuracy: 0.87,
            precision: 0.84,
            recall: 0.89,
            f1Score: 0.86,
            auc: 0.91,
          },
          venues: {
            accuracy: 0.82,
            precision: 0.79,
            recall: 0.85,
            f1Score: 0.82,
            auc: 0.87,
          },
        },
        revenue_impact: 125000,
        churn_prevented: 45,
        accuracy_gains: 0.12,
      };

      monitor['supabase'].rpc = jest.fn().mockResolvedValue({
        data: mockReportData,
        error: null,
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const report = await monitor.generatePerformanceReport(
        'churn_predictor_v1',
        startDate,
        endDate,
      );

      expect(report).toBeDefined();
      expect(report?.modelName).toBe('churn_predictor_v1');
      expect(report?.totalPredictions).toBe(1500);
      expect(report?.correctPredictions).toBe(1275);
      expect(report?.businessImpact.revenueImpact).toBe(125000);
      expect(report?.businessImpact.churnPrevented).toBe(45);
    });

    it('should return null on report generation errors', async () => {
      monitor['supabase'].rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Report generation failed'),
      });

      const report = await monitor.generatePerformanceReport(
        'test-model',
        new Date(),
        new Date(),
      );

      expect(report).toBeNull();
    });
  });

  describe('createAlert', () => {
    it('should create alerts successfully', async () => {
      monitor['supabase'].from = jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      }));

      monitor['triggerCriticalAlert'] = jest.fn().mockResolvedValue(undefined);

      const result = await monitor.createAlert(
        'test-model-id',
        'high',
        'performance_degradation',
        'Model accuracy dropped below threshold',
      );

      expect(result).toBe(true);
    });

    it('should trigger critical alert notifications for critical alerts', async () => {
      monitor['supabase'].from = jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      }));

      monitor['triggerCriticalAlert'] = jest.fn().mockResolvedValue(undefined);

      const result = await monitor.createAlert(
        'test-model-id',
        'critical',
        'model_failure',
        'Model completely failing',
      );

      expect(result).toBe(true);
      expect(monitor['triggerCriticalAlert']).toHaveBeenCalledWith(
        'test-model-id',
        'Model completely failing',
      );
    });

    it('should handle alert creation errors', async () => {
      monitor['supabase'].from = jest.fn(() => ({
        insert: jest
          .fn()
          .mockResolvedValue({ error: new Error('Insert failed') }),
      }));

      const result = await monitor.createAlert(
        'test-model-id',
        'medium',
        'warning',
        'Warning message',
      );

      expect(result).toBe(false);
    });
  });

  describe('scheduleModelRetraining', () => {
    it('should schedule model retraining successfully', async () => {
      monitor['supabase'].from = jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      }));

      monitor.createAlert = jest.fn().mockResolvedValue(true);

      const result = await monitor.scheduleModelRetraining(
        'test-model-id',
        'Performance degraded',
      );

      expect(result).toBe(true);
      expect(monitor.createAlert).toHaveBeenCalledWith(
        'test-model-id',
        'medium',
        'auto_retraining',
        'Model scheduled for retraining: Performance degraded',
        'automatic_retraining',
      );
    });
  });

  describe('monitorAllModels', () => {
    it('should monitor all deployed models', async () => {
      const mockModels = [
        { id: 'model-1', model_name: 'churn_predictor' },
        { id: 'model-2', model_name: 'revenue_forecaster' },
      ];

      monitor['supabase'].from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockModels, error: null }),
      }));

      const mockHealth1: ModelHealth = {
        modelId: 'model-1',
        modelName: 'churn_predictor',
        status: 'healthy',
        overallScore: 85,
        lastEvaluated: new Date().toISOString(),
        metrics: mockMetrics,
        featureDrifts: [],
        alerts: [],
        recommendations: [],
        performanceTrend: 'stable',
      };

      const mockHealth2: ModelHealth = {
        modelId: 'model-2',
        modelName: 'revenue_forecaster',
        status: 'critical',
        overallScore: 45,
        lastEvaluated: new Date().toISOString(),
        metrics: { ...mockMetrics, accuracy: 0.6 },
        featureDrifts: [],
        alerts: [],
        recommendations: [],
        performanceTrend: 'degrading',
      };

      monitor.getModelHealth = jest
        .fn()
        .mockResolvedValueOnce(mockHealth1)
        .mockResolvedValueOnce(mockHealth2);

      monitor['handleUnhealthyModel'] = jest.fn().mockResolvedValue(undefined);

      const healthReports = await monitor.monitorAllModels();

      expect(healthReports).toHaveLength(2);
      expect(healthReports[0].status).toBe('healthy');
      expect(healthReports[1].status).toBe('critical');
      expect(monitor['handleUnhealthyModel']).toHaveBeenCalledWith(mockHealth2);
    });

    it('should handle monitoring errors gracefully', async () => {
      monitor['supabase'].from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Query failed') }),
      }));

      const healthReports = await monitor.monitorAllModels();

      expect(healthReports).toEqual([]);
    });
  });

  describe('helper methods', () => {
    describe('calculateHealthScore', () => {
      it('should calculate health score correctly', () => {
        const score = monitor['calculateHealthScore'](mockMetrics, [], []);

        expect(score).toBeCloseTo(84.5, 1);
      });

      it('should penalize for feature drift', () => {
        const drifts: FeatureDrift[] = [
          {
            featureName: 'test_feature',
            driftScore: 0.2,
            pValue: 0.01,
            isDrifting: true,
            driftType: 'mean',
            recommendation: 'test',
          },
        ];

        const scoreWithDrift = monitor['calculateHealthScore'](
          mockMetrics,
          drifts,
          [],
        );
        const scoreWithoutDrift = monitor['calculateHealthScore'](
          mockMetrics,
          [],
          [],
        );

        expect(scoreWithDrift).toBeLessThan(scoreWithoutDrift);
      });

      it('should penalize for alerts', () => {
        const alerts: ModelAlert[] = [
          {
            id: 'alert-1',
            severity: 'critical',
            type: 'performance_degradation',
            message: 'Test alert',
            createdAt: new Date().toISOString(),
          },
        ];

        const scoreWithAlerts = monitor['calculateHealthScore'](
          mockMetrics,
          [],
          alerts,
        );
        const scoreWithoutAlerts = monitor['calculateHealthScore'](
          mockMetrics,
          [],
          [],
        );

        expect(scoreWithAlerts).toBeLessThan(scoreWithoutAlerts);
      });
    });

    describe('determineModelStatus', () => {
      it('should determine status correctly based on score', () => {
        expect(monitor['determineModelStatus'](85, [])).toBe('healthy');
        expect(monitor['determineModelStatus'](65, [])).toBe('warning');
        expect(monitor['determineModelStatus'](45, [])).toBe('critical');
        expect(monitor['determineModelStatus'](25, [])).toBe('failing');
      });

      it('should return failing for critical alerts regardless of score', () => {
        const criticalAlerts: ModelAlert[] = [
          {
            id: 'alert-1',
            severity: 'critical',
            type: 'model_failure',
            message: 'Critical failure',
            createdAt: new Date().toISOString(),
          },
        ];

        expect(monitor['determineModelStatus'](85, criticalAlerts)).toBe(
          'failing',
        );
      });
    });

    describe('generateHealthRecommendations', () => {
      it('should generate appropriate recommendations', () => {
        const lowAccuracyMetrics = {
          ...mockMetrics,
          accuracy: 0.7,
          precision: 0.6,
          recall: 0.6,
        };

        const recommendations = monitor['generateHealthRecommendations'](
          lowAccuracyMetrics,
          [],
          [],
        );

        expect(recommendations.length).toBeGreaterThan(0);
        expect(
          recommendations.some((r) => r.includes('accuracy below 80%')),
        ).toBe(true);
        expect(recommendations.some((r) => r.includes('Low precision'))).toBe(
          true,
        );
        expect(recommendations.some((r) => r.includes('Low recall'))).toBe(
          true,
        );
      });
    });
  });
});
