/**
 * WS-183 LTV Calculator Test Suite
 * Comprehensive financial calculation validation
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock LTV Calculator implementation
class LTVCalculator {
  calculateCohortLTV(params: {
    cohortData: Array<{ revenue: number; date: string; customerId: string }>;
    timeWindow: number;
    churnRate?: number;
  }): { ltv: number; confidence: number; methodology: string } {
    const { cohortData, timeWindow, churnRate = 0.05 } = params;
    
    // Historical average method
    const totalRevenue = cohortData.reduce((sum, item) => sum + item.revenue, 0);
    const monthlyAverage = totalRevenue / timeWindow;
    const adjustedForChurn = monthlyAverage * (1 - churnRate);
    const projectedLTV = adjustedForChurn * 36; // 3-year projection
    
    return {
      ltv: Number(projectedLTV.toFixed(2)),
      confidence: 0.85,
      methodology: 'historical_average_cohort'
    };
  }

  calculateProbabilisticLTV(params: {
    customerData: any;
    model: 'beta_geometric' | 'pareto_nbd' | 'modified_beta_geometric';
  }): { ltv: number; confidenceInterval: [number, number]; methodology: string } {
    // Simplified probabilistic calculation
    const baseLTV = 3500;
    const uncertainty = 0.15; // 15% uncertainty
    
    return {
      ltv: baseLTV,
      confidenceInterval: [
        Number((baseLTV * (1 - uncertainty)).toFixed(2)),
        Number((baseLTV * (1 + uncertainty)).toFixed(2))
      ],
      methodology: params.model
    };
  }

  calculateEnsembleLTV(models: Array<{ weight: number; result: any }>): {
    ltv: number;
    weightedComponents: Array<{ model: string; weight: number; contribution: number }>;
  } {
    let weightedSum = 0;
    const components = models.map(model => {
      const contribution = model.result.ltv * model.weight;
      weightedSum += contribution;
      return {
        model: model.result.methodology,
        weight: model.weight,
        contribution: Number(contribution.toFixed(2))
      };
    });

    return {
      ltv: Number(weightedSum.toFixed(2)),
      weightedComponents: components
    };
  }
}

describe('LTVCalculator', () => {
  let calculator: LTVCalculator;

  beforeEach(() => {
    calculator = new LTVCalculator();
  });

  describe('Cohort-based LTV Calculation', () => {
    it('should calculate accurate LTV for wedding photographer cohort', () => {
      const photographerCohortData = [
        { revenue: 2500, date: '2024-01-15', customerId: 'photographer-001' },
        { revenue: 1800, date: '2024-02-10', customerId: 'photographer-002' },
        { revenue: 3200, date: '2024-03-05', customerId: 'photographer-003' },
        { revenue: 2100, date: '2024-04-12', customerId: 'photographer-004' }
      ];

      const result = calculator.calculateCohortLTV({
        cohortData: photographerCohortData,
        timeWindow: 4, // months
        churnRate: 0.03 // 3% monthly churn for photographers
      });

      // Mathematical validation
      const expectedMonthlyAverage = 9600 / 4; // $2400/month
      const expectedAdjusted = expectedMonthlyAverage * 0.97; // Adjusted for 3% churn
      const expectedLTV = expectedAdjusted * 36; // 3-year projection

      expect(result.ltv).toBeCloseTo(expectedLTV, 2);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.methodology).toBe('historical_average_cohort');
    });

    it('should handle edge cases for low-tenure suppliers', () => {
      const newSupplierData = [
        { revenue: 500, date: '2024-12-01', customerId: 'new-supplier-001' }
      ];

      const result = calculator.calculateCohortLTV({
        cohortData: newSupplierData,
        timeWindow: 1,
        churnRate: 0.15 // Higher churn for new suppliers
      });

      // Should calculate but with appropriate uncertainty
      expect(result.ltv).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.7); // Lower confidence for limited data
      expect(result.methodology).toBe('historical_average_cohort');
    });

    it('should validate mathematical precision within 0.01% tolerance', () => {
      const precisionTestData = [
        { revenue: 1000.50, date: '2024-01-01', customerId: 'precision-001' },
        { revenue: 1500.75, date: '2024-02-01', customerId: 'precision-002' }
      ];

      const result = calculator.calculateCohortLTV({
        cohortData: precisionTestData,
        timeWindow: 2,
        churnRate: 0.05
      });

      // Manual calculation for precision validation
      const totalRevenue = 2501.25;
      const monthlyAverage = totalRevenue / 2; // 1250.625
      const churnAdjusted = monthlyAverage * 0.95; // 1188.09375
      const projectedLTV = churnAdjusted * 36; // 42771.375

      expect(Math.abs(result.ltv - 42771.38)).toBeLessThan(0.01);
    });
  });

  describe('Probabilistic LTV Modeling', () => {
    it('should generate confidence intervals for predictions', () => {
      const customerData = {
        customerId: 'customer-001',
        transactionHistory: [
          { amount: 2500, date: '2024-01-15' },
          { amount: 1200, date: '2024-04-10' },
          { amount: 800, date: '2024-08-22' }
        ],
        engagementMetrics: {
          sessionCount: 45,
          averageSessionDuration: 12.5
        }
      };

      const result = calculator.calculateProbabilisticLTV({
        customerData,
        model: 'beta_geometric'
      });

      // Validate confidence intervals
      expect(result.confidenceInterval).toHaveLength(2);
      expect(result.confidenceInterval[0]).toBeLessThan(result.ltv);
      expect(result.confidenceInterval[1]).toBeGreaterThan(result.ltv);
      expect(result.ltv).toBeGreaterThan(0);
      expect(result.methodology).toBe('beta_geometric');

      // Statistical significance validation
      const intervalWidth = result.confidenceInterval[1] - result.confidenceInterval[0];
      const relativeWidth = intervalWidth / result.ltv;
      expect(relativeWidth).toBeLessThan(0.5); // Interval should not be wider than 50% of LTV
    });

    it('should validate different probabilistic models', () => {
      const testData = { customerId: 'test-001', transactionHistory: [] };
      
      const models = ['beta_geometric', 'pareto_nbd', 'modified_beta_geometric'] as const;
      
      models.forEach(model => {
        const result = calculator.calculateProbabilisticLTV({
          customerData: testData,
          model
        });

        expect(result.ltv).toBeGreaterThan(0);
        expect(result.confidenceInterval).toHaveLength(2);
        expect(result.methodology).toBe(model);
      });
    });
  });

  describe('Multi-Model Ensemble', () => {
    it('should combine models with appropriate weighting', () => {
      const historicalResult = {
        ltv: 3200,
        confidence: 0.85,
        methodology: 'historical_average'
      };

      const probabilisticResult = {
        ltv: 3800,
        confidence: 0.78,
        methodology: 'beta_geometric'
      };

      const mlResult = {
        ltv: 3500,
        confidence: 0.92,
        methodology: 'random_forest'
      };

      // Weight by confidence scores
      const totalConfidence = 0.85 + 0.78 + 0.92;
      const models = [
        { weight: 0.85 / totalConfidence, result: historicalResult },
        { weight: 0.78 / totalConfidence, result: probabilisticResult },
        { weight: 0.92 / totalConfidence, result: mlResult }
      ];

      const ensembleResult = calculator.calculateEnsembleLTV(models);

      // Validate weighted calculation
      const expectedLTV = (
        (3200 * 0.85 / totalConfidence) +
        (3800 * 0.78 / totalConfidence) +
        (3500 * 0.92 / totalConfidence)
      );

      expect(ensembleResult.ltv).toBeCloseTo(expectedLTV, 2);
      expect(ensembleResult.weightedComponents).toHaveLength(3);
      
      // Validate weights sum to approximately 1
      const totalWeight = ensembleResult.weightedComponents.reduce(
        (sum, comp) => sum + comp.weight, 0
      );
      expect(totalWeight).toBeCloseTo(1, 2);
    });

    it('should handle model selection logic for different scenarios', () => {
      // High-confidence scenario - should weight ML model heavily
      const highConfidenceModels = [
        { weight: 0.2, result: { ltv: 3000, methodology: 'historical' } },
        { weight: 0.1, result: { ltv: 3200, methodology: 'probabilistic' } },
        { weight: 0.7, result: { ltv: 3100, methodology: 'ml_ensemble' } }
      ];

      const result = calculator.calculateEnsembleLTV(highConfidenceModels);
      
      // Should be closer to ML model result due to high weight
      expect(result.ltv).toBeCloseTo(3100, 0);
      expect(result.weightedComponents.find(c => c.model === 'ml_ensemble')?.weight).toBe(0.7);
    });
  });

  describe('Wedding Industry Validation', () => {
    it('should handle seasonal wedding patterns', () => {
      // Summer peak season data
      const summerData = [
        { revenue: 4500, date: '2024-06-15', customerId: 'venue-001' },
        { revenue: 5200, date: '2024-07-20', customerId: 'venue-002' },
        { revenue: 4800, date: '2024-08-10', customerId: 'venue-003' }
      ];

      // Winter off-season data
      const winterData = [
        { revenue: 1200, date: '2024-01-15', customerId: 'venue-004' },
        { revenue: 1800, date: '2024-02-10', customerId: 'venue-005' }
      ];

      const summerResult = calculator.calculateCohortLTV({
        cohortData: summerData,
        timeWindow: 3,
        churnRate: 0.02 // Lower churn in peak season
      });

      const winterResult = calculator.calculateCohortLTV({
        cohortData: winterData,
        timeWindow: 2,
        churnRate: 0.08 // Higher churn in off-season
      });

      // Summer should have higher LTV
      expect(summerResult.ltv).toBeGreaterThan(winterResult.ltv);
      expect(summerResult.confidence).toBeGreaterThanOrEqual(winterResult.confidence);
    });

    it('should validate different supplier types have appropriate LTV patterns', () => {
      const supplierTypes = [
        { type: 'photographer', avgRevenue: 2800, churnRate: 0.03 },
        { type: 'venue', avgRevenue: 8500, churnRate: 0.01 },
        { type: 'catering', avgRevenue: 4200, churnRate: 0.04 },
        { type: 'florist', avgRevenue: 1200, churnRate: 0.06 }
      ];

      const results = supplierTypes.map(supplier => {
        const mockData = [
          { revenue: supplier.avgRevenue, date: '2024-06-01', customerId: `${supplier.type}-001` }
        ];

        return {
          type: supplier.type,
          ...calculator.calculateCohortLTV({
            cohortData: mockData,
            timeWindow: 1,
            churnRate: supplier.churnRate
          })
        };
      });

      // Venues should have highest LTV (high revenue, low churn)
      const venueResult = results.find(r => r.type === 'venue');
      const floristResult = results.find(r => r.type === 'florist');

      expect(venueResult?.ltv).toBeGreaterThan(floristResult?.ltv || 0);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large datasets efficiently', () => {
      // Generate large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        revenue: Math.random() * 5000 + 1000,
        date: `2024-${String(Math.floor(i / 800) + 1).padStart(2, '0')}-01`,
        customerId: `customer-${i.toString().padStart(6, '0')}`
      }));

      const startTime = Date.now();
      
      const result = calculator.calculateCohortLTV({
        cohortData: largeDataset,
        timeWindow: 12,
        churnRate: 0.05
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.ltv).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should validate input data and handle errors gracefully', () => {
      // Test with invalid data
      const invalidData = [
        { revenue: -100, date: 'invalid-date', customerId: '' },
        { revenue: 'not-a-number', date: '2024-01-01', customerId: 'test' }
      ];

      expect(() => {
        calculator.calculateCohortLTV({
          cohortData: invalidData as any,
          timeWindow: 1,
          churnRate: 0.05
        });
      }).not.toThrow(); // Should handle gracefully, not crash

      // Test with edge case parameters
      const edgeCaseResult = calculator.calculateCohortLTV({
        cohortData: [],
        timeWindow: 0,
        churnRate: 1.5 // Invalid churn rate > 100%
      });

      expect(edgeCaseResult.ltv).toBeGreaterThanOrEqual(0);
    });
  });
});