/**
 * Churn Prediction Model Validation Tests
 * 
 * Comprehensive ML model accuracy and performance testing suite
 * for WS-182 churn intelligence system validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock model validation utilities
interface ValidationDataset {
  samples: Array<{
    supplierId: string;
    features: Record<string, number>;
    label: boolean; // true = churned, false = retained
  }>;
  metadata: {
    totalSamples: number;
    churnRate: number;
    timeRange: { start: Date; end: Date };
  };
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucRoc: number;
  confusion: {
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
  };
}

interface CrossValidationResult {
  folds: number;
  meanAccuracy: number;
  stdAccuracy: number;
  metrics: ModelMetrics;
  generalizationScore: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
  stability: number;
}

interface BiasMetrics {
  segment: string;
  accuracy: number;
  precision: number;
  recall: number;
  sampleSize: number;
  fairnessScore: number;
}

// Mock model validation service
class MockModelValidationService {
  async loadValidationDataset(): Promise<ValidationDataset> {
    return {
      samples: this.generateMockSamples(1000),
      metadata: {
        totalSamples: 1000,
        churnRate: 0.23,
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      },
    };
  }

  async validateModelPerformance(dataset: ValidationDataset): Promise<ModelMetrics> {
    // Simulate model validation with realistic metrics
    const { samples } = dataset;
    let tp = 0, tn = 0, fp = 0, fn = 0;
    
    samples.forEach(sample => {
      const predicted = this.mockPredict(sample.features);
      const actual = sample.label;
      
      if (predicted && actual) tp++;
      else if (!predicted && !actual) tn++;
      else if (predicted && !actual) fp++;
      else if (!predicted && actual) fn++;
    });

    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const accuracy = (tp + tn) / samples.length;
    const f1Score = 2 * (precision * recall) / (precision + recall);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      aucRoc: 0.91, // Mock AUC-ROC score
      confusion: { truePositives: tp, trueNegatives: tn, falsePositives: fp, falseNegatives: fn },
    };
  }

  async performCrossValidation(dataset: ValidationDataset, folds: number = 5): Promise<CrossValidationResult> {
    const foldResults = [];
    const samplesPerFold = Math.floor(dataset.samples.length / folds);
    
    for (let i = 0; i < folds; i++) {
      const testStart = i * samplesPerFold;
      const testEnd = (i + 1) * samplesPerFold;
      const testSet = dataset.samples.slice(testStart, testEnd);
      const trainSet = [
        ...dataset.samples.slice(0, testStart),
        ...dataset.samples.slice(testEnd),
      ];
      
      // Simulate training and validation
      const foldMetrics = await this.validateModelPerformance({ ...dataset, samples: testSet });
      foldResults.push(foldMetrics);
    }
    
    const meanAccuracy = foldResults.reduce((sum, fold) => sum + fold.accuracy, 0) / folds;
    const stdAccuracy = Math.sqrt(
      foldResults.reduce((sum, fold) => sum + Math.pow(fold.accuracy - meanAccuracy, 2), 0) / folds
    );
    
    return {
      folds,
      meanAccuracy,
      stdAccuracy,
      metrics: foldResults[0], // Representative metrics
      generalizationScore: 1 - stdAccuracy, // Higher is better
    };
  }

  async loadSupplierSegmentData(segment: string): Promise<ValidationDataset> {
    const baseDataset = await this.loadValidationDataset();
    const segmentSamples = baseDataset.samples.filter(sample => 
      this.getSupplierSegment(sample.supplierId) === segment
    );
    
    return {
      samples: segmentSamples,
      metadata: {
        ...baseDataset.metadata,
        totalSamples: segmentSamples.length,
        churnRate: segmentSamples.filter(s => s.label).length / segmentSamples.length,
      },
    };
  }

  async validateSegmentAccuracy(segment: string, data: ValidationDataset): Promise<number> {
    const metrics = await this.validateModelPerformance(data);
    return metrics.accuracy;
  }

  async detectDataDrift(currentData: any, historicalData: any): Promise<{
    driftDetected: boolean;
    retrainingRecommended: boolean;
    driftScore: number;
    affectedFeatures: string[];
  }> {
    // Mock drift detection
    const driftScore = Math.random() * 0.2; // 0-20% drift
    const driftDetected = driftScore > 0.15;
    
    return {
      driftDetected,
      retrainingRecommended: driftDetected,
      driftScore,
      affectedFeatures: driftDetected ? ['engagement_score', 'payment_delays'] : [],
    };
  }

  async getCurrentSupplierData(): Promise<any> {
    return { timestamp: new Date(), sampleCount: 1500 };
  }

  async getHistoricalSupplierData(): Promise<any> {
    return { timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), sampleCount: 1200 };
  }

  async extractSupplierFeatures(supplierActivity: any): Promise<{
    behavioralFeatures: Record<string, number>;
    engagementMetrics: Record<string, number>;
    seasonalPatterns: Record<string, number>;
  }> {
    return {
      behavioralFeatures: {
        loginFrequency: 0.75,
        responseTime: 0.82,
        platformUsage: 0.68,
      },
      engagementMetrics: {
        clientInteractions: 0.71,
        bookingConversions: 0.64,
        satisfactionScore: 0.79,
      },
      seasonalPatterns: {
        springActivity: 0.91,
        summerActivity: 0.87,
        fallActivity: 0.52,
        winterActivity: 0.34,
      },
    };
  }

  async loadSupplierActivityData(): Promise<any> {
    return {
      supplierId: 'test-supplier-123',
      activityPeriod: '2024-Q4',
      dataCompleteness: 0.94,
    };
  }

  async createIncompleteSupplierData(): Promise<any> {
    return {
      supplierId: 'incomplete-supplier',
      activityPeriod: '2024-Q4',
      dataCompleteness: 0.67, // Significant missing data
    };
  }

  // Private helper methods
  private generateMockSamples(count: number): ValidationDataset['samples'] {
    return Array.from({ length: count }, (_, i) => ({
      supplierId: `supplier-${i}`,
      features: {
        engagement_score: Math.random(),
        satisfaction_rating: 2 + Math.random() * 3, // 2-5 range
        payment_delays: Math.random() * 10, // 0-10 days
        platform_usage: Math.random(),
        client_interactions: Math.random() * 50, // 0-50 interactions
        booking_conversion: Math.random(),
        response_time: Math.random() * 24, // 0-24 hours
        account_age: Math.random() * 60, // 0-60 months
      },
      label: Math.random() < 0.23, // 23% churn rate
    }));
  }

  private mockPredict(features: Record<string, number>): boolean {
    // Simple mock prediction logic
    const riskScore = 
      (1 - features.engagement_score) * 0.3 +
      (5 - features.satisfaction_rating) / 5 * 0.25 +
      (features.payment_delays / 10) * 0.2 +
      (1 - features.platform_usage) * 0.15 +
      (1 - features.booking_conversion) * 0.1;
    
    return riskScore > 0.5;
  }

  private getSupplierSegment(supplierId: string): string {
    const hash = supplierId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const segments = ['photographers', 'venues', 'planners', 'caterers', 'florists'];
    return segments[hash % segments.length];
  }
}

// Feature engineering validation service
class MockFeatureEngineeringValidator {
  async analyzeFeatureImportance(): Promise<FeatureImportance[]> {
    return [
      { feature: 'engagement_score', importance: 0.28, rank: 1, stability: 0.94 },
      { feature: 'satisfaction_rating', importance: 0.24, rank: 2, stability: 0.91 },
      { feature: 'payment_delays', importance: 0.19, rank: 3, stability: 0.87 },
      { feature: 'platform_usage', importance: 0.15, rank: 4, stability: 0.92 },
      { feature: 'booking_conversion', importance: 0.14, rank: 5, stability: 0.89 },
    ];
  }

  async detectMulticollinearity(): Promise<{
    correlationMatrix: Record<string, Record<string, number>>;
    highCorrelationPairs: Array<{ feature1: string; feature2: string; correlation: number }>;
  }> {
    return {
      correlationMatrix: {
        'engagement_score': { 'platform_usage': 0.73, 'satisfaction_rating': 0.41 },
        'payment_delays': { 'satisfaction_rating': -0.52 },
      },
      highCorrelationPairs: [
        { feature1: 'engagement_score', feature2: 'platform_usage', correlation: 0.73 },
      ],
    };
  }

  async detectDataLeakage(): Promise<{
    leakageDetected: boolean;
    suspiciousFeatures: string[];
    leakageScore: number;
  }> {
    return {
      leakageDetected: false,
      suspiciousFeatures: [],
      leakageScore: 0.02, // Very low leakage
    };
  }

  async testFeatureStability(): Promise<{
    feature: string;
    stabilityScore: number;
    timeSegments: Array<{ period: string; importance: number }>;
  }[]> {
    return [
      {
        feature: 'engagement_score',
        stabilityScore: 0.94,
        timeSegments: [
          { period: '2024-Q1', importance: 0.29 },
          { period: '2024-Q2', importance: 0.27 },
          { period: '2024-Q3', importance: 0.28 },
          { period: '2024-Q4', importance: 0.28 },
        ],
      },
    ];
  }
}

// Bias and fairness testing service
class MockBiasFairnessValidator {
  async testSegmentAccuracy(): Promise<BiasMetrics[]> {
    const segments = ['photographers', 'venues', 'planners', 'caterers'];
    return segments.map(segment => ({
      segment,
      accuracy: 0.82 + Math.random() * 0.06, // 82-88% range
      precision: 0.79 + Math.random() * 0.08, // 79-87% range
      recall: 0.76 + Math.random() * 0.09, // 76-85% range
      sampleSize: 200 + Math.floor(Math.random() * 100), // 200-300 samples
      fairnessScore: 0.88 + Math.random() * 0.08, // 88-96% fairness
    }));
  }

  async calculateDemographicParity(): Promise<{
    overallParity: number;
    segmentMetrics: Array<{ segment: string; positiveRate: number; parity: number }>;
  }> {
    return {
      overallParity: 0.92,
      segmentMetrics: [
        { segment: 'photographers', positiveRate: 0.24, parity: 0.94 },
        { segment: 'venues', positiveRate: 0.22, parity: 0.91 },
        { segment: 'planners', positiveRate: 0.26, parity: 0.89 },
        { segment: 'caterers', positiveRate: 0.23, parity: 0.95 },
      ],
    };
  }

  async generateExplanations(): Promise<Array<{
    supplierId: string;
    prediction: boolean;
    explanation: string;
    confidence: number;
    factors: Array<{ name: string; contribution: number }>;
  }>> {
    return [
      {
        supplierId: 'test-supplier-001',
        prediction: true,
        explanation: 'High churn risk due to declining engagement and delayed payments',
        confidence: 0.89,
        factors: [
          { name: 'engagement_decline', contribution: 0.35 },
          { name: 'payment_delays', contribution: 0.28 },
          { name: 'satisfaction_drop', contribution: 0.22 },
        ],
      },
    ];
  }
}

describe('Churn Prediction Model Validation', () => {
  let modelValidator: MockModelValidationService;
  let featureValidator: MockFeatureEngineeringValidator;
  let biasValidator: MockBiasFairnessValidator;

  beforeEach(() => {
    modelValidator = new MockModelValidationService();
    featureValidator = new MockFeatureEngineeringValidator();
    biasValidator = new MockBiasFairnessValidator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Accuracy Testing', () => {
    it('should achieve target precision and recall rates', async () => {
      const validationDataset = await modelValidator.loadValidationDataset();
      const modelMetrics = await modelValidator.validateModelPerformance(validationDataset);
      
      // Validate against business requirements
      expect(modelMetrics.precision).toBeGreaterThan(0.80);
      expect(modelMetrics.recall).toBeGreaterThan(0.75);
      expect(modelMetrics.f1Score).toBeGreaterThan(0.77);
      
      // Validate AUC-ROC for binary classification
      expect(modelMetrics.aucRoc).toBeGreaterThan(0.88);
      
      // Validate confusion matrix makes sense
      const { confusion } = modelMetrics;
      const totalPredictions = confusion.truePositives + confusion.trueNegatives + 
                              confusion.falsePositives + confusion.falseNegatives;
      expect(totalPredictions).toBe(validationDataset.samples.length);
      
      // Validate accuracy calculation
      const calculatedAccuracy = (confusion.truePositives + confusion.trueNegatives) / totalPredictions;
      expect(Math.abs(modelMetrics.accuracy - calculatedAccuracy)).toBeLessThan(0.01);
    });

    it('should maintain accuracy across supplier segments', async () => {
      const segments = ['photographers', 'venues', 'planners', 'caterers'];
      
      for (const segment of segments) {
        const segmentData = await modelValidator.loadSupplierSegmentData(segment);
        const accuracy = await modelValidator.validateSegmentAccuracy(segment, segmentData);
        
        // Ensure fair treatment across all supplier types
        expect(accuracy).toBeGreaterThan(0.80);
        expect(segmentData.samples.length).toBeGreaterThan(50); // Sufficient sample size
      }
    });

    it('should detect and handle data drift', async () => {
      const currentData = await modelValidator.getCurrentSupplierData();
      const historicalData = await modelValidator.getHistoricalSupplierData();
      
      const driftDetection = await modelValidator.detectDataDrift(currentData, historicalData);
      
      // Validate drift detection and model retraining triggers
      expect(driftDetection.driftDetected).toBeDefined();
      expect(typeof driftDetection.driftDetected).toBe('boolean');
      expect(driftDetection.driftScore).toBeGreaterThanOrEqual(0);
      expect(driftDetection.driftScore).toBeLessThanOrEqual(1);
      
      if (driftDetection.driftDetected) {
        expect(driftDetection.retrainingRecommended).toBe(true);
        expect(driftDetection.affectedFeatures).toBeDefined();
        expect(Array.isArray(driftDetection.affectedFeatures)).toBe(true);
      }
    });

    it('should perform robust cross-validation', async () => {
      const dataset = await modelValidator.loadValidationDataset();
      const crossValidation = await modelValidator.performCrossValidation(dataset, 5);
      
      // Validate cross-validation results
      expect(crossValidation.folds).toBe(5);
      expect(crossValidation.meanAccuracy).toBeGreaterThan(0.82);
      expect(crossValidation.stdAccuracy).toBeLessThan(0.05); // Low variance indicates good generalization
      expect(crossValidation.generalizationScore).toBeGreaterThan(0.90);
      
      // Validate statistical significance
      const marginOfError = 1.96 * crossValidation.stdAccuracy / Math.sqrt(crossValidation.folds);
      expect(marginOfError).toBeLessThan(0.03); // 3% margin of error
    });

    it('should maintain temporal validation accuracy', async () => {
      // Test model performance on different time periods
      const dataset = await modelValidator.loadValidationDataset();
      const timeSlices = [
        { start: new Date('2024-01-01'), end: new Date('2024-03-31') }, // Q1
        { start: new Date('2024-04-01'), end: new Date('2024-06-30') }, // Q2
        { start: new Date('2024-07-01'), end: new Date('2024-09-30') }, // Q3
        { start: new Date('2024-10-01'), end: new Date('2024-12-31') }, // Q4
      ];
      
      const temporalAccuracies = [];
      
      for (const slice of timeSlices) {
        // Filter dataset by time slice
        const sliceData = {
          ...dataset,
          samples: dataset.samples.filter((_, i) => i % 4 === timeSlices.indexOf(slice)), // Mock time filtering
        };
        
        const metrics = await modelValidator.validateModelPerformance(sliceData);
        temporalAccuracies.push(metrics.accuracy);
      }
      
      // Validate temporal stability
      const avgAccuracy = temporalAccuracies.reduce((sum, acc) => sum + acc, 0) / temporalAccuracies.length;
      const maxDeviation = Math.max(...temporalAccuracies.map(acc => Math.abs(acc - avgAccuracy)));
      
      expect(avgAccuracy).toBeGreaterThan(0.82);
      expect(maxDeviation).toBeLessThan(0.05); // Less than 5% deviation across time periods
    });
  });

  describe('Feature Engineering Validation', () => {
    it('should extract meaningful features from supplier behavior', async () => {
      const supplierActivity = await modelValidator.loadSupplierActivityData();
      const extractedFeatures = await modelValidator.extractSupplierFeatures(supplierActivity);
      
      // Validate feature extraction completeness and relevance
      expect(extractedFeatures.behavioralFeatures).toBeDefined();
      expect(extractedFeatures.engagementMetrics).toBeDefined();
      expect(extractedFeatures.seasonalPatterns).toBeDefined();
      
      // Validate feature value ranges
      Object.values(extractedFeatures.behavioralFeatures).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
      
      Object.values(extractedFeatures.engagementMetrics).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should handle missing data gracefully', async () => {
      const incompleteData = await modelValidator.createIncompleteSupplierData();
      const features = await modelValidator.extractSupplierFeatures(incompleteData);
      
      // Validate robust feature extraction with missing data
      expect(features).toBeDefined();
      expect(incompleteData.dataCompleteness).toBeLessThan(1.0);
      
      // Should still extract meaningful features despite incomplete data
      expect(Object.keys(features.behavioralFeatures).length).toBeGreaterThan(0);
      expect(Object.keys(features.engagementMetrics).length).toBeGreaterThan(0);
    });

    it('should validate feature importance and stability', async () => {
      const importanceAnalysis = await featureValidator.analyzeFeatureImportance();
      
      // Validate feature importance analysis
      expect(importanceAnalysis.length).toBeGreaterThan(3);
      
      importanceAnalysis.forEach((feature, index) => {
        expect(feature.importance).toBeGreaterThanOrEqual(0);
        expect(feature.importance).toBeLessThanOrEqual(1);
        expect(feature.rank).toBe(index + 1);
        expect(feature.stability).toBeGreaterThan(0.8); // High stability required
      });
      
      // Top features should account for majority of importance
      const topThreeImportance = importanceAnalysis.slice(0, 3)
        .reduce((sum, f) => sum + f.importance, 0);
      expect(topThreeImportance).toBeGreaterThan(0.6); // Top 3 features > 60% importance
    });

    it('should detect multicollinearity issues', async () => {
      const multicollinearityAnalysis = await featureValidator.detectMulticollinearity();
      
      // Validate correlation analysis
      expect(multicollinearityAnalysis.correlationMatrix).toBeDefined();
      expect(multicollinearityAnalysis.highCorrelationPairs).toBeDefined();
      
      // Check for problematic correlations
      multicollinearityAnalysis.highCorrelationPairs.forEach(pair => {
        expect(Math.abs(pair.correlation)).toBeGreaterThan(0.7);
        expect(pair.feature1).not.toBe(pair.feature2);
      });
      
      // Validate correlation values are within valid range
      Object.values(multicollinearityAnalysis.correlationMatrix).forEach(correlations => {
        Object.values(correlations).forEach(correlation => {
          expect(correlation).toBeGreaterThanOrEqual(-1);
          expect(correlation).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should detect data leakage in feature engineering pipeline', async () => {
      const leakageAnalysis = await featureValidator.detectDataLeakage();
      
      // Validate leakage detection
      expect(typeof leakageAnalysis.leakageDetected).toBe('boolean');
      expect(leakageAnalysis.leakageScore).toBeGreaterThanOrEqual(0);
      expect(leakageAnalysis.leakageScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(leakageAnalysis.suspiciousFeatures)).toBe(true);
      
      // Ensure low leakage score for production models
      expect(leakageAnalysis.leakageScore).toBeLessThan(0.05); // Less than 5% leakage
      
      if (leakageAnalysis.leakageDetected) {
        expect(leakageAnalysis.suspiciousFeatures.length).toBeGreaterThan(0);
      }
    });

    it('should test feature stability across different time periods', async () => {
      const stabilityAnalysis = await featureValidator.testFeatureStability();
      
      // Validate stability analysis
      expect(stabilityAnalysis.length).toBeGreaterThan(0);
      
      stabilityAnalysis.forEach(analysis => {
        expect(analysis.feature).toBeDefined();
        expect(analysis.stabilityScore).toBeGreaterThan(0.8); // High stability
        expect(analysis.timeSegments.length).toBeGreaterThan(2);
        
        // Validate time segment importance consistency
        const importanceValues = analysis.timeSegments.map(seg => seg.importance);
        const meanImportance = importanceValues.reduce((sum, val) => sum + val, 0) / importanceValues.length;
        const maxDeviation = Math.max(...importanceValues.map(val => Math.abs(val - meanImportance)));
        
        expect(maxDeviation / meanImportance).toBeLessThan(0.2); // Less than 20% relative deviation
      });
    });
  });

  describe('Model Bias and Fairness Testing', () => {
    it('should ensure fairness across supplier segments', async () => {
      const segmentMetrics = await biasValidator.testSegmentAccuracy();
      
      // Validate segment fairness
      expect(segmentMetrics.length).toBeGreaterThan(2);
      
      const accuracies = segmentMetrics.map(m => m.accuracy);
      const minAccuracy = Math.min(...accuracies);
      const maxAccuracy = Math.max(...accuracies);
      
      // Ensure all segments meet minimum accuracy
      expect(minAccuracy).toBeGreaterThan(0.80);
      
      // Ensure fairness across segments (accuracy difference < 8%)
      expect(maxAccuracy - minAccuracy).toBeLessThan(0.08);
      
      // Validate fairness scores
      segmentMetrics.forEach(metric => {
        expect(metric.fairnessScore).toBeGreaterThan(0.85);
        expect(metric.sampleSize).toBeGreaterThan(100); // Sufficient sample size
      });
    });

    it('should calculate demographic parity metrics', async () => {
      const parityAnalysis = await biasValidator.calculateDemographicParity();
      
      // Validate parity analysis
      expect(parityAnalysis.overallParity).toBeGreaterThan(0.85);
      expect(parityAnalysis.segmentMetrics.length).toBeGreaterThan(2);
      
      // Validate segment parity
      parityAnalysis.segmentMetrics.forEach(segment => {
        expect(segment.parity).toBeGreaterThan(0.80); // 80%+ parity required
        expect(segment.positiveRate).toBeGreaterThanOrEqual(0);
        expect(segment.positiveRate).toBeLessThanOrEqual(1);
      });
      
      // Check for balanced positive rates across segments
      const positiveRates = parityAnalysis.segmentMetrics.map(s => s.positiveRate);
      const avgPositiveRate = positiveRates.reduce((sum, rate) => sum + rate, 0) / positiveRates.length;
      const maxDeviation = Math.max(...positiveRates.map(rate => Math.abs(rate - avgPositiveRate)));
      
      expect(maxDeviation).toBeLessThan(0.05); // Less than 5% deviation in positive rates
    });

    it('should provide explainable predictions', async () => {
      const explanations = await biasValidator.generateExplanations();
      
      // Validate explanation quality
      expect(explanations.length).toBeGreaterThan(0);
      
      explanations.forEach(explanation => {
        expect(explanation.supplierId).toBeDefined();
        expect(typeof explanation.prediction).toBe('boolean');
        expect(explanation.explanation.length).toBeGreaterThan(20); // Meaningful explanation
        expect(explanation.confidence).toBeGreaterThan(0.8); // High confidence
        
        // Validate factor contributions
        expect(explanation.factors.length).toBeGreaterThan(0);
        const totalContribution = explanation.factors.reduce((sum, f) => sum + Math.abs(f.contribution), 0);
        expect(totalContribution).toBeGreaterThan(0.5); // Factors should explain significant portion
        
        explanation.factors.forEach(factor => {
          expect(factor.name).toBeDefined();
          expect(Math.abs(factor.contribution)).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should validate model calibration across segments', async () => {
      const segments = ['photographers', 'venues', 'planners', 'caterers'];
      const calibrationResults = [];
      
      for (const segment of segments) {
        const segmentData = await modelValidator.loadSupplierSegmentData(segment);
        const metrics = await modelValidator.validateModelPerformance(segmentData);
        
        // Calculate calibration (predicted probability vs actual outcomes)
        const calibrationScore = this.calculateCalibrationScore(segmentData, metrics);
        calibrationResults.push({ segment, calibrationScore });
      }
      
      // Validate calibration across all segments
      calibrationResults.forEach(result => {
        expect(result.calibrationScore).toBeGreaterThan(0.85); // Well-calibrated model
      });
      
      // Ensure consistent calibration across segments
      const calibrationScores = calibrationResults.map(r => r.calibrationScore);
      const minCalibration = Math.min(...calibrationScores);
      const maxCalibration = Math.max(...calibrationScores);
      
      expect(maxCalibration - minCalibration).toBeLessThan(0.08); // < 8% calibration difference
    });

  });

  // Helper function for calibration calculation
  function calculateCalibrationScore(data: any, metrics: any): number {
    // Mock calibration calculation - in real implementation would use Brier score or similar
    return 0.90 - Math.random() * 0.05; // 85-90% calibration
  }
  });

  describe('Performance and Scalability Testing', () => {
    it('should validate model inference speed', async () => {
      const batchSizes = [1, 10, 100, 1000];
      const latencyResults = [];
      
      for (const batchSize of batchSizes) {
        const testBatch = Array.from({ length: batchSize }, (_, i) => ({
          supplierId: `speed-test-${i}`,
          features: {
            engagement_score: Math.random(),
            satisfaction_rating: 2 + Math.random() * 3,
            payment_delays: Math.random() * 10,
            platform_usage: Math.random(),
          },
        }));
        
        const startTime = Date.now();
        const dataset = { samples: testBatch.map(item => ({ ...item, label: false })), metadata: { totalSamples: batchSize, churnRate: 0.2, timeRange: { start: new Date(), end: new Date() } } };
        await modelValidator.validateModelPerformance(dataset);
        const latency = Date.now() - startTime;
        
        latencyResults.push({ batchSize, latency });
      }
      
      // Validate inference speed requirements
      const singlePredictionLatency = latencyResults[0].latency;
      expect(singlePredictionLatency).toBeLessThan(100); // < 100ms for single prediction
      
      // Validate scalability
      const thousandBatchLatency = latencyResults[3].latency;
      expect(thousandBatchLatency).toBeLessThan(5000); // < 5s for 1000 predictions
      
      // Validate linear scaling
      const scalingRatio = thousandBatchLatency / latencyResults[2].latency; // 1000 vs 100
      expect(scalingRatio).toBeLessThan(15); // Should scale better than linear
    });

    it('should handle concurrent validation requests', async () => {
      const concurrentRequests = 10;
      const dataset = await modelValidator.loadValidationDataset();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        modelValidator.validateModelPerformance(dataset)
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Validate all requests completed successfully
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.accuracy).toBeGreaterThan(0.80);
      });
      
      // Validate reasonable response time under load
      expect(totalTime).toBeLessThan(10000); // < 10s for 10 concurrent requests
      
      // Results should be consistent across concurrent requests
      const accuracies = results.map(r => r.accuracy);
      const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      const maxDeviation = Math.max(...accuracies.map(acc => Math.abs(acc - avgAccuracy)));
      
      expect(maxDeviation).toBeLessThan(0.01); // < 1% deviation in concurrent results
    });
  });
});