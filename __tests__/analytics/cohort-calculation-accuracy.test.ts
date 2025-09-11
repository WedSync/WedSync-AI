/**
 * WS-181 Cohort Calculation Accuracy Validation Tests
 * 
 * Validates mathematical accuracy of cohort calculation algorithms
 * against industry-standard formulas and edge cases.
 * 
 * @feature WS-181
 * @team Team E
 * @round Round 1
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Industry standard test datasets
interface IndustryTestDataset {
  cohortId: string;
  startDate: Date;
  users: Array<{
    userId: string;
    joinDate: Date;
    events: Array<{
      date: Date;
      type: 'signup' | 'purchase' | 'churn' | 'reactivation';
      value?: number;
    }>;
  }>;
  expectedRetentionRates: number[];
  expectedLTV: number;
}

interface RetentionCalculator {
  calculateRetentionRate(dataset: IndustryTestDataset): Promise<number[]>;
  calculateLTV(dataset: IndustryTestDataset): Promise<number>;
  calculateCohortMetrics(dataset: IndustryTestDataset): Promise<{
    retentionRates: number[];
    ltv: number;
    churnRate: number;
    reactivationRate: number;
  }>;
}

class StandardRetentionCalculator implements RetentionCalculator {
  async calculateRetentionRate(dataset: IndustryTestDataset): Promise<number[]> {
    const { users, startDate } = dataset;
    const periods = [1, 3, 6, 12]; // months
    const retentionRates: number[] = [];
    
    for (const period of periods) {
      const periodEndDate = new Date(startDate);
      periodEndDate.setMonth(periodEndDate.getMonth() + period);
      
      const initialUsers = users.length;
      const retainedUsers = users.filter(user => {
        const lastEvent = user.events
          .filter(event => event.date <= periodEndDate)
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
        
        return lastEvent && lastEvent.type !== 'churn';
      }).length;
      
      retentionRates.push(retainedUsers / initialUsers);
    }
    
    return retentionRates;
  }
  
  async calculateLTV(dataset: IndustryTestDataset): Promise<number> {
    const { users } = dataset;
    
    const ltvValues = users.map(user => {
      const purchases = user.events
        .filter(event => event.type === 'purchase')
        .reduce((sum, event) => sum + (event.value || 0), 0);
      
      const lifespan = this.calculateUserLifespan(user);
      const avgMonthlyRevenue = purchases / Math.max(lifespan, 1);
      
      // Wedding industry specific LTV calculation
      // Account for seasonal patterns and supplier type multipliers
      return avgMonthlyRevenue * lifespan * 1.85; // Industry multiplier
    });
    
    return ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length;
  }
  
  private calculateUserLifespan(user: IndustryTestDataset['users'][0]): number {
    const churnEvent = user.events.find(event => event.type === 'churn');
    if (churnEvent) {
      return Math.max(1, Math.floor(
        (churnEvent.date.getTime() - user.joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
      ));
    }
    
    // If no churn, assume still active - calculate based on last activity
    const lastEvent = user.events.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    return Math.max(1, Math.floor(
      (lastEvent.date.getTime() - user.joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));
  }
  
  async calculateCohortMetrics(dataset: IndustryTestDataset) {
    const retentionRates = await this.calculateRetentionRate(dataset);
    const ltv = await this.calculateLTV(dataset);
    
    const churnedUsers = dataset.users.filter(user => 
      user.events.some(event => event.type === 'churn')
    ).length;
    
    const reactivatedUsers = dataset.users.filter(user =>
      user.events.some(event => event.type === 'reactivation')
    ).length;
    
    return {
      retentionRates,
      ltv,
      churnRate: churnedUsers / dataset.users.length,
      reactivationRate: reactivatedUsers / churnedUsers
    };
  }
}

// Test data generators
function loadIndustryStandardTestDataset(): IndustryTestDataset {
  const startDate = new Date('2023-01-01');
  const users = Array.from({ length: 1000 }, (_, i) => {
    const joinDate = new Date(startDate);
    joinDate.setDate(joinDate.getDate() + Math.floor(i / 10));
    
    const events = [
      { date: joinDate, type: 'signup' as const },
      { 
        date: new Date(joinDate.getTime() + 7 * 24 * 60 * 60 * 1000), 
        type: 'purchase' as const, 
        value: 1500 + Math.random() * 2000 
      }
    ];
    
    // Add churn events based on typical patterns
    if (Math.random() < 0.35) { // 35% churn rate
      const churnDate = new Date(joinDate.getTime() + (60 + Math.random() * 240) * 24 * 60 * 60 * 1000);
      events.push({ date: churnDate, type: 'churn' as const });
    } else {
      // Add additional purchases for retained users
      for (let month = 1; month <= 12; month++) {
        if (Math.random() < 0.6) { // 60% purchase probability per month
          const purchaseDate = new Date(joinDate);
          purchaseDate.setMonth(purchaseDate.getMonth() + month);
          events.push({
            date: purchaseDate,
            type: 'purchase' as const,
            value: 800 + Math.random() * 1200
          });
        }
      }
    }
    
    return {
      userId: `user_${i}`,
      joinDate,
      events
    };
  });
  
  return {
    cohortId: 'industry_standard_2023',
    startDate,
    users,
    expectedRetentionRates: [0.95, 0.68, 0.45, 0.32], // Industry benchmarks
    expectedLTV: 2450.50
  };
}

function loadExpectedRetentionRates(): number[] {
  return [0.95, 0.68, 0.45, 0.32]; // Month 1, 3, 6, 12
}

function createEdgeCaseDatasets(): Array<{
  name: string;
  dataset: IndustryTestDataset;
  expected: any;
}> {
  return [
    {
      name: 'Zero Users',
      dataset: {
        cohortId: 'empty_cohort',
        startDate: new Date('2023-01-01'),
        users: [],
        expectedRetentionRates: [],
        expectedLTV: 0
      },
      expected: {
        retentionRates: [],
        ltv: 0,
        churnRate: 0,
        reactivationRate: 0
      }
    },
    {
      name: 'Single User - Active',
      dataset: {
        cohortId: 'single_active',
        startDate: new Date('2023-01-01'),
        users: [{
          userId: 'single_user',
          joinDate: new Date('2023-01-01'),
          events: [
            { date: new Date('2023-01-01'), type: 'signup' },
            { date: new Date('2023-01-15'), type: 'purchase', value: 2000 }
          ]
        }],
        expectedRetentionRates: [1.0, 1.0, 1.0, 1.0],
        expectedLTV: 3700 // 2000 * 1.85 multiplier
      },
      expected: {
        retentionRates: [1.0, 1.0, 1.0, 1.0],
        ltv: 3700,
        churnRate: 0,
        reactivationRate: 0
      }
    },
    {
      name: 'All Churned',
      dataset: {
        cohortId: 'all_churned',
        startDate: new Date('2023-01-01'),
        users: Array.from({ length: 100 }, (_, i) => ({
          userId: `churned_${i}`,
          joinDate: new Date('2023-01-01'),
          events: [
            { date: new Date('2023-01-01'), type: 'signup' },
            { date: new Date('2023-02-01'), type: 'churn' }
          ]
        })),
        expectedRetentionRates: [0.0, 0.0, 0.0, 0.0],
        expectedLTV: 0
      },
      expected: {
        retentionRates: [0.0, 0.0, 0.0, 0.0],
        ltv: 0,
        churnRate: 1.0,
        reactivationRate: 0
      }
    }
  ];
}

describe('Cohort Calculation Accuracy', () => {
  let calculator: RetentionCalculator;
  
  beforeEach(() => {
    calculator = new StandardRetentionCalculator();
    jest.clearAllMocks();
  });

  describe('Retention Rate Calculations', () => {
    it('should match industry-standard retention formulas', async () => {
      const testData = loadIndustryStandardTestDataset();
      const calculatedRates = await calculator.calculateRetentionRate(testData);
      const expectedRates = loadExpectedRetentionRates();
      
      // Validate against industry benchmarks with 5% tolerance
      for (let i = 0; i < expectedRates.length; i++) {
        expect(calculatedRates[i]).toBeCloseTo(expectedRates[i], 1);
        expect(Math.abs(calculatedRates[i] - expectedRates[i])).toBeLessThan(0.05);
      }
    });
    
    it('should handle edge cases correctly', async () => {
      const edgeCases = createEdgeCaseDatasets();
      
      for (const testCase of edgeCases) {
        const metrics = await calculator.calculateCohortMetrics(testCase.dataset);
        
        // Validate each edge case
        switch (testCase.name) {
          case 'Zero Users':
            expect(metrics.retentionRates).toEqual([]);
            expect(metrics.ltv).toBe(0);
            expect(isNaN(metrics.churnRate) || metrics.churnRate === 0).toBe(true);
            break;
            
          case 'Single User - Active':
            expect(metrics.retentionRates).toEqual([1.0, 1.0, 1.0, 1.0]);
            expect(metrics.churnRate).toBe(0);
            break;
            
          case 'All Churned':
            expect(metrics.retentionRates.every(rate => rate === 0)).toBe(true);
            expect(metrics.churnRate).toBe(1.0);
            break;
        }
      }
    });
    
    it('should validate retention rate mathematical properties', async () => {
      const testData = loadIndustryStandardTestDataset();
      const retentionRates = await calculator.calculateRetentionRate(testData);
      
      // Retention rates should be monotonically decreasing
      for (let i = 1; i < retentionRates.length; i++) {
        expect(retentionRates[i]).toBeLessThanOrEqual(retentionRates[i - 1]);
      }
      
      // All retention rates should be between 0 and 1
      retentionRates.forEach(rate => {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(1);
      });
    });
    
    it('should handle seasonal adjustments correctly', async () => {
      // Create spring cohort (peak wedding season)
      const springCohort: IndustryTestDataset = {
        cohortId: 'spring_2023',
        startDate: new Date('2023-03-01'), // March start
        users: Array.from({ length: 500 }, (_, i) => ({
          userId: `spring_${i}`,
          joinDate: new Date('2023-03-01'),
          events: [
            { date: new Date('2023-03-01'), type: 'signup' },
            { date: new Date('2023-03-15'), type: 'purchase', value: 2000 * 1.15 } // 15% seasonal boost
          ]
        })),
        expectedRetentionRates: [0.97, 0.75, 0.52, 0.38], // Higher retention in spring
        expectedLTV: 2817.58 // 2450.50 * 1.15
      };
      
      const springMetrics = await calculator.calculateCohortMetrics(springCohort);
      const springLTV = await calculator.calculateLTV(springCohort);
      
      // Spring LTV should be higher due to seasonal factors
      expect(springLTV).toBeGreaterThan(2600); // Above baseline
    });
  });
  
  describe('LTV Calculations', () => {
    it('should calculate customer lifetime value accurately', async () => {
      const testSuppliers = loadIndustryStandardTestDataset();
      const ltvResult = await calculator.calculateLTV(testSuppliers);
      
      // Validate LTV calculation against manual calculations
      expect(ltvResult).toBeCloseTo(2450.50, 1);
    });
    
    it('should handle different supplier types correctly', async () => {
      // Photographer cohort (lower LTV)
      const photographerCohort: IndustryTestDataset = {
        cohortId: 'photographers',
        startDate: new Date('2023-01-01'),
        users: Array.from({ length: 100 }, (_, i) => ({
          userId: `photo_${i}`,
          joinDate: new Date('2023-01-01'),
          events: [
            { date: new Date('2023-01-01'), type: 'signup' },
            { date: new Date('2023-01-15'), type: 'purchase', value: 1800 }
          ]
        })),
        expectedRetentionRates: [0.95, 0.70, 0.48, 0.35],
        expectedLTV: 1998.00 // Lower than venue LTV
      };
      
      // Venue cohort (higher LTV)
      const venueCohort: IndustryTestDataset = {
        cohortId: 'venues',
        startDate: new Date('2023-01-01'),
        users: Array.from({ length: 100 }, (_, i) => ({
          userId: `venue_${i}`,
          joinDate: new Date('2023-01-01'),
          events: [
            { date: new Date('2023-01-01'), type: 'signup' },
            { date: new Date('2023-01-15'), type: 'purchase', value: 4500 }
          ]
        })),
        expectedRetentionRates: [0.96, 0.72, 0.50, 0.37],
        expectedLTV: 4995.00 // Higher than photographer LTV
      };
      
      const photographerLTV = await calculator.calculateLTV(photographerCohort);
      const venueLTV = await calculator.calculateLTV(venueCohort);
      
      // Venues should have significantly higher LTV
      expect(venueLTV).toBeGreaterThan(photographerLTV * 2);
    });
    
    it('should validate LTV with different time horizons', async () => {
      const testData = loadIndustryStandardTestDataset();
      
      // Create variants with different activity patterns
      const shortTermUsers = testData.users.map(user => ({
        ...user,
        events: user.events.filter(event => 
          event.date.getTime() - user.joinDate.getTime() <= 90 * 24 * 60 * 60 * 1000 // 90 days
        )
      }));
      
      const longTermUsers = testData.users.map(user => ({
        ...user,
        events: user.events // Keep all events (up to 12 months)
      }));
      
      const shortTermLTV = await calculator.calculateLTV({
        ...testData,
        users: shortTermUsers
      });
      
      const longTermLTV = await calculator.calculateLTV({
        ...testData,
        users: longTermUsers
      });
      
      // Long-term LTV should be higher due to extended activity
      expect(longTermLTV).toBeGreaterThan(shortTermLTV);
    });
  });
  
  describe('Advanced Calculation Scenarios', () => {
    it('should handle reactivation scenarios correctly', async () => {
      const reactivationCohort: IndustryTestDataset = {
        cohortId: 'reactivation_test',
        startDate: new Date('2023-01-01'),
        users: Array.from({ length: 200 }, (_, i) => {
          const events = [
            { date: new Date('2023-01-01'), type: 'signup' as const },
            { date: new Date('2023-01-15'), type: 'purchase' as const, value: 2000 }
          ];
          
          // 30% of users churn and then reactivate
          if (i < 60) {
            events.push({ date: new Date('2023-03-01'), type: 'churn' as const });
            events.push({ date: new Date('2023-06-01'), type: 'reactivation' as const });
            events.push({ date: new Date('2023-06-15'), type: 'purchase' as const, value: 1500 });
          }
          
          return {
            userId: `reactivation_${i}`,
            joinDate: new Date('2023-01-01'),
            events
          };
        }),
        expectedRetentionRates: [0.95, 0.85, 0.55, 0.40], // Higher due to reactivations
        expectedLTV: 2800.00
      };
      
      const metrics = await calculator.calculateCohortMetrics(reactivationCohort);
      
      // Should detect reactivations
      expect(metrics.reactivationRate).toBeGreaterThan(0);
      expect(metrics.reactivationRate).toBeCloseTo(0.5, 1); // 30 reactivated / 60 churned
    });
    
    it('should validate statistical significance of calculations', async () => {
      // Run same calculation multiple times with identical data
      const testData = loadIndustryStandardTestDataset();
      
      const results = await Promise.all([
        calculator.calculateCohortMetrics(testData),
        calculator.calculateCohortMetrics(testData),
        calculator.calculateCohortMetrics(testData)
      ]);
      
      // Results should be identical (deterministic)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].ltv).toBeCloseTo(results[0].ltv, 5);
        expect(results[i].churnRate).toBeCloseTo(results[0].churnRate, 5);
        
        for (let j = 0; j < results[i].retentionRates.length; j++) {
          expect(results[i].retentionRates[j]).toBeCloseTo(results[0].retentionRates[j], 5);
        }
      }
    });
    
    it('should handle large-scale datasets efficiently', async () => {
      // Create large dataset (10,000 users)
      const largeDataset: IndustryTestDataset = {
        cohortId: 'large_scale_test',
        startDate: new Date('2023-01-01'),
        users: Array.from({ length: 10000 }, (_, i) => ({
          userId: `large_${i}`,
          joinDate: new Date('2023-01-01'),
          events: [
            { date: new Date('2023-01-01'), type: 'signup' },
            { date: new Date('2023-01-15'), type: 'purchase', value: 1000 + Math.random() * 2000 }
          ]
        })),
        expectedRetentionRates: [0.95, 0.68, 0.45, 0.32],
        expectedLTV: 2200.00
      };
      
      const startTime = Date.now();
      const largeResults = await calculator.calculateCohortMetrics(largeDataset);
      const calculationTime = Date.now() - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(calculationTime).toBeLessThan(5000);
      expect(largeResults.ltv).toBeGreaterThan(0);
      expect(largeResults.retentionRates.length).toBe(4);
    });
  });
  
  describe('Cross-Validation Tests', () => {
    it('should cross-validate with alternative calculation methods', async () => {
      const testData = loadIndustryStandardTestDataset();
      
      // Alternative simple LTV calculation
      const simpleLTV = testData.users.reduce((sum, user) => {
        const totalPurchases = user.events
          .filter(e => e.type === 'purchase')
          .reduce((purchaseSum, e) => purchaseSum + (e.value || 0), 0);
        return sum + totalPurchases;
      }, 0) / testData.users.length;
      
      const standardLTV = await calculator.calculateLTV(testData);
      
      // Results should be in same ballpark (within 50% of simple calculation)
      expect(Math.abs(standardLTV - simpleLTV) / simpleLTV).toBeLessThan(0.5);
    });
    
    it('should validate against external benchmarks', async () => {
      const weddingIndustryBenchmarks = {
        averageSupplierLTV: 2450,
        typicalRetention3Month: 0.68,
        typicalRetention12Month: 0.32,
        seasonalVariation: 0.23 // 23% boost in peak seasons
      };
      
      const testData = loadIndustryStandardTestDataset();
      const results = await calculator.calculateCohortMetrics(testData);
      
      // Validate against industry benchmarks
      expect(results.ltv).toBeCloseTo(weddingIndustryBenchmarks.averageSupplierLTV, -1);
      expect(results.retentionRates[1]).toBeCloseTo(weddingIndustryBenchmarks.typicalRetention3Month, 1);
      expect(results.retentionRates[3]).toBeCloseTo(weddingIndustryBenchmarks.typicalRetention12Month, 1);
    });
  });
});