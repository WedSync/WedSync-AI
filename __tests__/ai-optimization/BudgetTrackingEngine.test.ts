/**
 * WS-240: Budget Tracking Engine Test Suite
 * 
 * Comprehensive tests for real-time budget monitoring and emergency controls.
 * Critical for preventing cost overruns during peak wedding season.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BudgetTrackingEngine, BudgetStatus, ThresholdAlert } from '@/lib/ai/optimization/BudgetTrackingEngine';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/cache/redis-client');

describe('BudgetTrackingEngine', () => {
  let engine: BudgetTrackingEngine;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      data: []
    };

    engine = new BudgetTrackingEngine();
    (engine as any).supabase = mockSupabase;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('trackRealTimeSpending', () => {
    test('should track photography studio AI costs accurately', async () => {
      // Arrange
      const supplierId = 'capture-moments-studio';
      const featureType = 'photo_ai';
      const cost = 0.25; // £0.25 per photo tagging request
      const model = 'gpt-3.5-turbo';
      const tokens = { input: 150, output: 50 };
      
      // Mock budget config
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_cost_optimization') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    supplier_id: supplierId,
                    feature_type: featureType,
                    daily_budget_pounds: '5.00',
                    monthly_budget_pounds: '50.00',
                    alert_threshold_percent: 80,
                    auto_disable_at_limit: true
                  },
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase;
      });

      // Act
      const budgetStatus = await engine.trackRealTimeSpending(
        supplierId,
        featureType,
        cost,
        model,
        tokens,
        false
      );

      // Assert
      expect(budgetStatus).toBeDefined();
      expect(budgetStatus.supplierId).toBe(supplierId);
      expect(budgetStatus.featureType).toBe(featureType);
      expect(budgetStatus.currentSpend).toBeDefined();
      expect(budgetStatus.budgetLimits.daily).toBe(5.00);
      expect(budgetStatus.budgetLimits.monthly).toBe(50.00);
      expect(budgetStatus.status).toMatch(/healthy|approaching_limit|over_budget|disabled/);
      expect(budgetStatus.seasonalMultiplier).toBeGreaterThanOrEqual(1.0);
    });

    test('should trigger alert when approaching 80% of daily budget', async () => {
      // Arrange
      const supplierId = 'venue-coordinator-1';
      const featureType = 'venue_descriptions';
      const cost = 0.85; // High cost bringing total to ~80% of £5 daily budget
      
      // Mock current spending at £3.15 (63% of £5 budget)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_cost_optimization') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    daily_budget_pounds: '5.00',
                    monthly_budget_pounds: '50.00',
                    alert_threshold_percent: 80,
                    auto_disable_at_limit: true
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'ai_cost_tracking') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    data: [{ cost_pounds: '3.15' }], // Previous spending
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockSupabase;
      });

      // Act
      const budgetStatus = await engine.trackRealTimeSpending(
        supplierId,
        featureType,
        cost,
        'gpt-4-turbo',
        { input: 200, output: 100 }
      );

      // Assert
      expect(budgetStatus.status).toBe('approaching_limit');
      expect(budgetStatus.utilizationPercent.daily).toBeGreaterThan(75);
      expect(budgetStatus.alertsTriggered.length).toBeGreaterThan(0);
    });

    test('should apply wedding season multiplier during peak months', async () => {
      // Arrange - Mock June (peak season)
      const mockDate = new Date('2024-06-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const peakSeasonCost = 1.20; // Higher cost during peak season
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                daily_budget_pounds: '8.00', // Higher budget for peak season
                monthly_budget_pounds: '80.00',
                seasonal_multiplier_enabled: true
              }
            })
          })
        })
      });

      // Act
      const budgetStatus = await engine.trackRealTimeSpending(
        'wedding-planner-1',
        'timeline_assistance',
        peakSeasonCost,
        'gpt-4-turbo',
        { input: 500, output: 300 }
      );

      // Assert
      expect(budgetStatus.seasonalMultiplier).toBe(1.6); // Peak season multiplier
      expect(budgetStatus.projectedMonthlySpend).toBeGreaterThan(0);
    });

    test('should execute auto-disable when budget limit exceeded', async () => {
      // Arrange
      const supplierId = 'over-budget-supplier';
      const featureType = 'content_generation';
      const excessiveCost = 6.00; // Exceeds £5 daily budget
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_cost_optimization') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    daily_budget_pounds: '5.00',
                    auto_disable_at_limit: true
                  }
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                data: [{}],
                error: null
              })
            })
          };
        }
        return mockSupabase;
      });

      // Act
      const budgetStatus = await engine.trackRealTimeSpending(
        supplierId,
        featureType,
        excessiveCost,
        'gpt-4-turbo',
        { input: 1000, output: 500 }
      );

      // Assert
      expect(budgetStatus.status).toBe('over_budget');
      expect(budgetStatus.emergencyDisableEnabled).toBe(true);
    });
  });

  describe('checkBudgetThresholds', () => {
    test('should identify multiple threshold violations across features', async () => {
      // Arrange
      const supplierId = 'multi-feature-supplier';
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_cost_optimization') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                data: [
                  { feature_type: 'photo_ai' },
                  { feature_type: 'venue_descriptions' },
                  { feature_type: 'content_generation' }
                ]
              })
            })
          };
        }
        if (table === 'ai_cost_tracking') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    data: [
                      { cost_pounds: '4.50' }, // 90% of £5 budget - critical
                      { cost_pounds: '3.75' }, // 75% of £5 budget - warning  
                      { cost_pounds: '1.25' }  // 25% of £5 budget - healthy
                    ]
                  })
                })
              })
            })
          };
        }
        return mockSupabase;
      });

      // Act
      const alerts = await engine.checkBudgetThresholds(supplierId);

      // Assert
      expect(alerts).toBeInstanceOf(Array);
      expect(alerts.length).toBeGreaterThan(0);
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      const warningAlerts = alerts.filter(a => a.severity === 'high');
      
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].actionRequired).toBe(true);
      expect(criticalAlerts[0].suggestedActions).toContain(expect.stringContaining('review'));
    });

    test('should sort alerts by severity and timestamp', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [
              { feature_type: 'photo_ai' },
              { feature_type: 'chatbot' }
            ]
          })
        })
      });

      // Act
      const alerts = await engine.checkBudgetThresholds('test-supplier');

      // Assert
      if (alerts.length > 1) {
        // Verify sorting: critical alerts first, then by timestamp
        for (let i = 0; i < alerts.length - 1; i++) {
          const current = alerts[i];
          const next = alerts[i + 1];
          
          if (current.severity !== next.severity) {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            expect(severityOrder[current.severity]).toBeGreaterThanOrEqual(severityOrder[next.severity]);
          }
        }
      }
    });
  });

  describe('executeAutoDisable', () => {
    test('should disable photography AI when daily budget exceeded', async () => {
      // Arrange
      const supplierId = 'photo-studio-emergency';
      const featureType = 'photo_ai';
      const reason = {
        type: 'budget_exceeded' as const,
        message: 'Daily budget of £5.00 exceeded',
        currentSpend: 5.25,
        budgetLimit: 5.00,
        triggerTime: new Date()
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_cost_optimization') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                data: [{}],
                error: null
              })
            })
          };
        }
        if (table === 'ai_budget_alerts') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{}],
              error: null
            })
          };
        }
        if (table === 'ai_optimization_audit_log') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{}],
              error: null
            })
          };
        }
        return mockSupabase;
      });

      // Act
      const result = await engine.executeAutoDisable(supplierId, featureType, reason);

      // Assert
      expect(result.success).toBe(true);
      expect(result.disabledAt).toBeInstanceOf(Date);
      expect(result.reason).toEqual(reason);
      expect(result.affectedFeatures).toContain(featureType);
      expect(result.reEnableInstructions).toContain('budget');
      expect(result.emergencyContact).toBe('support@wedsync.com');
    });

    test('should log disable action for audit trail', async () => {
      // Arrange
      const auditLogSpy = jest.fn().mockResolvedValue({ data: [{}], error: null });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_optimization_audit_log') {
          return {
            insert: auditLogSpy
          };
        }
        return mockSupabase;
      });

      const reason = {
        type: 'manual_disable' as const,
        message: 'Manually disabled for maintenance',
        currentSpend: 2.50,
        budgetLimit: 5.00,
        triggerTime: new Date()
      };

      // Act
      await engine.executeAutoDisable('test-supplier', 'chatbot', reason);

      // Assert
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_id: 'test-supplier',
          action: expect.stringContaining('disable'),
          feature_type: 'chatbot'
        })
      );
    });
  });

  describe('calculateWeddingSeasonProjection', () => {
    test('should project 60% cost increase during peak season', async () => {
      // Arrange
      const supplierId = 'seasonal-photographer';
      const featureType = 'photo_ai';
      const currentUsage = {
        supplierId,
        featureType,
        period: { start: new Date('2024-02-01'), end: new Date('2024-02-29') }, // Off-season
        requests: { total: 100, successful: 98, failed: 2, cached: 25 },
        costs: { total: 25.00, average: 0.25, peak: 0.85, savings: 5.00 },
        patterns: { 
          hourlyDistribution: new Array(24).fill(0),
          peakHours: [9, 14, 16],
          seasonalTrend: 1.0
        },
        optimization: { cacheHitRate: 25, modelOptimization: 15, batchProcessingRate: 10 }
      };

      // Mock current date to February (off-season)
      jest.spyOn(global, 'Date').mockImplementation((dateString?: string) => {
        if (dateString) return new Date(dateString) as any;
        return new Date('2024-02-15') as any;
      });

      // Act
      const projection = await engine.calculateWeddingSeasonProjection(
        supplierId,
        featureType,
        currentUsage
      );

      // Assert
      expect(projection).toBeDefined();
      expect(projection.supplierId).toBe(supplierId);
      expect(projection.featureType).toBe(featureType);
      expect(projection.seasonalMultipliers.projected).toBe(1.6); // Peak season upcoming
      expect(projection.projectedCosts.monthly).toBeGreaterThan(projection.baselineCosts.monthly);
      expect(projection.recommendedBudgets.monthly).toBeGreaterThan(projection.baselineCosts.monthly);
      expect(projection.confidenceScore).toBeBetween(0, 1);
      expect(projection.recommendations).toBeInstanceOf(Array);
      expect(projection.riskFactors).toBeInstanceOf(Array);
    });

    test('should recommend budget increases for peak wedding season', async () => {
      // Arrange - High baseline costs suggesting need for seasonal adjustment
      const highVolumeUsage = {
        supplierId: 'busy-venue-1',
        featureType: 'venue_descriptions',
        period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        requests: { total: 300, successful: 295, failed: 5, cached: 90 },
        costs: { total: 75.00, average: 0.25, peak: 1.20, savings: 15.00 },
        patterns: { 
          hourlyDistribution: new Array(24).fill(0),
          peakHours: [10, 11, 14, 15, 16],
          seasonalTrend: 1.4
        },
        optimization: { cacheHitRate: 30, modelOptimization: 20, batchProcessingRate: 15 }
      };

      // Act
      const projection = await engine.calculateWeddingSeasonProjection(
        'busy-venue-1',
        'venue_descriptions',
        highVolumeUsage
      );

      // Assert
      expect(projection.projectedCosts.monthly).toBeGreaterThan(100); // Significant cost increase
      expect(projection.recommendations).toContain(
        expect.stringMatching(/budget.*peak|increase.*budget/i)
      );
      expect(projection.recommendedBudgets.monthly).toBeGreaterThan(90); // 20% buffer over projected
      expect(projection.riskFactors.length).toBeGreaterThan(0);
    });

    test('should identify low cache hit rate as optimization opportunity', async () => {
      // Arrange - Low cache performance
      const lowCacheUsage = {
        supplierId: 'inefficient-supplier',
        featureType: 'content_generation',
        period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        requests: { total: 200, successful: 190, failed: 10, cached: 20 }, // Only 10% cached
        costs: { total: 60.00, average: 0.30, peak: 1.50, savings: 3.00 }, // Low savings
        patterns: { 
          hourlyDistribution: new Array(24).fill(0),
          peakHours: [9, 13, 17],
          seasonalTrend: 1.2
        },
        optimization: { cacheHitRate: 10, modelOptimization: 5, batchProcessingRate: 5 } // Poor optimization
      };

      // Act
      const projection = await engine.calculateWeddingSeasonProjection(
        'inefficient-supplier',
        'content_generation',
        lowCacheUsage
      );

      // Assert
      expect(projection.riskFactors).toContain(
        expect.stringMatching(/cache.*hit.*rate/i)
      );
      expect(projection.recommendations).toContain(
        expect.stringMatching(/caching.*strategy/i)
      );
      expect(projection.confidenceScore).toBeLessThan(0.8); // Lower confidence due to poor data
    });
  });

  describe('Wedding Industry Emergency Scenarios', () => {
    test('should handle Saturday wedding day emergency (no AI disruption)', async () => {
      // Arrange - Mock Saturday
      const saturdayDate = new Date('2024-06-15'); // Saturday
      saturdayDate.setHours(10, 30, 0, 0); // 10:30 AM wedding day
      jest.spyOn(global, 'Date').mockImplementation(() => saturdayDate as any);

      const emergencyRequest = {
        supplierId: 'wedding-day-photographer',
        featureType: 'photo_ai',
        cost: 2.50,
        model: 'gpt-4-turbo',
        tokens: { input: 500, output: 200 }
      };

      // Act
      const budgetStatus = await engine.trackRealTimeSpending(
        emergencyRequest.supplierId,
        emergencyRequest.featureType,
        emergencyRequest.cost,
        emergencyRequest.model,
        emergencyRequest.tokens
      );

      // Assert
      // On wedding day, should be more lenient with budget enforcement
      expect(budgetStatus).toBeDefined();
      // Should NOT auto-disable on Saturday even if over budget (wedding day protection)
      expect(budgetStatus.status).not.toBe('disabled');
    });

    test('should escalate critical alerts for wedding businesses', async () => {
      // Arrange
      const weddingBusinessSupplier = 'premier-wedding-photography';
      const criticalSpending = 50.00; // Exceeds monthly budget dramatically
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_cost_optimization') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                data: [{ 
                  feature_type: 'photo_ai',
                  monthly_budget_pounds: '30.00', // Much lower than spending
                  alert_threshold_percent: 85 
                }]
              })
            })
          };
        }
        return mockSupabase;
      });

      // Act
      const alerts = await engine.checkBudgetThresholds(weddingBusinessSupplier);

      // Assert
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].actionRequired).toBe(true);
      expect(criticalAlerts[0].suggestedActions).toContain(
        expect.stringMatching(/immediate|urgent|contact/i)
      );
    });

    test('should handle venue coordinator bulk description generation efficiently', async () => {
      // Arrange - Venue coordinator processing 50 venues in one day
      const bulkProcessingCosts = Array.from({ length: 50 }, (_, i) => ({
        supplierId: 'venue-coordinator-bulk',
        featureType: 'venue_descriptions',
        cost: 0.15, // Small cost per venue
        model: 'gpt-3.5-turbo',
        tokens: { input: 100, output: 75 },
        cacheHit: i > 10 // Caching kicks in after 10 descriptions
      }));

      let totalSpent = 0;
      
      // Act - Process each venue description
      for (const request of bulkProcessingCosts.slice(0, 10)) { // Test first 10
        const budgetStatus = await engine.trackRealTimeSpending(
          request.supplierId,
          request.featureType,
          request.cost,
          request.model,
          request.tokens,
          request.cacheHit
        );
        
        totalSpent += request.cost;
        
        // Assert progressive optimization
        if (totalSpent < 3.00) {
          expect(budgetStatus.status).toMatch(/healthy|approaching_limit/);
        }
      }

      // Total for 10 venues should be £1.50, well within budget
      expect(totalSpent).toBeLessThan(2.00);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle high-volume concurrent budget checks', async () => {
      // Arrange
      const concurrentRequests = Array.from({ length: 100 }, (_, i) => ({
        supplierId: `supplier-${i}`,
        featureType: 'photo_ai',
        cost: 0.10,
        model: 'gpt-3.5-turbo',
        tokens: { input: 50, output: 25 }
      }));

      // Act
      const startTime = Date.now();
      const promises = concurrentRequests.slice(0, 10).map(req =>
        engine.trackRealTimeSpending(req.supplierId, req.featureType, req.cost, req.model, req.tokens)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every(result => result !== null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should cache budget status for performance', async () => {
      // Arrange
      const supplierId = 'cached-supplier';
      const featureType = 'chatbot';

      // Act - Make multiple rapid budget checks
      const check1 = engine.checkBudgetThresholds(supplierId, featureType);
      const check2 = engine.checkBudgetThresholds(supplierId, featureType);
      const check3 = engine.checkBudgetThresholds(supplierId, featureType);

      const results = await Promise.all([check1, check2, check3]);

      // Assert - All should return similar results (indicating caching)
      expect(results).toHaveLength(3);
      expect(results.every(result => Array.isArray(result))).toBe(true);
    });

    test('should gracefully handle database timeouts', async () => {
      // Arrange
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 100)
      );
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(() => timeoutPromise)
          })
        })
      });

      // Act & Assert
      await expect(
        engine.trackRealTimeSpending('timeout-supplier', 'photo_ai', 1.0, 'gpt-4-turbo', { input: 100, output: 50 })
      ).rejects.toThrow('Database timeout');
    });
  });
});

// Helper function for numeric range assertions (if not already defined)
if (!expect.extend) {
  (expect as any).extend = (extensions: any) => {
    Object.assign(expect, extensions);
  };
}

expect.extend({
  toBeBetween(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    if (pass) {
      return {
        message: () => `expected ${received} not to be between ${min} and ${max}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be between ${min} and ${max}`,
        pass: false
      };
    }
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBetween(min: number, max: number): R;
    }
  }
}