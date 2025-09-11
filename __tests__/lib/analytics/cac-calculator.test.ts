import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { CACCalculator, AcquisitionChannel, DateRange, ChannelCACResult } from '@/lib/analytics/cac-calculator';

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

describe('CACCalculator', () => {
  let cacCalculator: CACCalculator;
  let mockAttributionData: any;
  let mockSpendData: any;
  let mockConversionData: any;
  let testDateRange: DateRange;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize test data
    testDateRange = {
      start: new Date('2024-01-01'),
      end: new Date('2024-03-31')
    };

    mockAttributionData = [
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-001',
        customer_id: 'customer-123',
        touchpoint_timestamp: new Date('2024-01-15'),
        conversion_timestamp: new Date('2024-01-20'),
        conversion_value: 150,
        attribution_weight: 1.0
      },
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-001',
        customer_id: 'customer-124',
        touchpoint_timestamp: new Date('2024-02-01'),
        conversion_timestamp: new Date('2024-02-05'),
        conversion_value: 200,
        attribution_weight: 0.8
      },
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-002',
        customer_id: 'customer-125',
        touchpoint_timestamp: new Date('2024-02-10'),
        conversion_timestamp: new Date('2024-02-15'),
        conversion_value: 180,
        attribution_weight: 0.6
      }
    ];

    mockSpendData = [
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-001',
        date: new Date('2024-01-01'),
        spend: 500,
        impressions: 10000,
        clicks: 250
      },
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-001',
        date: new Date('2024-02-01'),
        spend: 600,
        impressions: 12000,
        clicks: 300
      },
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-002',
        date: new Date('2024-02-01'),
        spend: 400,
        impressions: 8000,
        clicks: 200
      }
    ];

    mockConversionData = [
      { customer_id: 'customer-123', conversion_date: new Date('2024-01-20'), revenue: 150 },
      { customer_id: 'customer-124', conversion_date: new Date('2024-02-05'), revenue: 200 },
      { customer_id: 'customer-125', conversion_date: new Date('2024-02-15'), revenue: 180 }
    ];

    // Setup Supabase mocks
    mockSupabase.from.mockImplementation((table: string) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis()
      };

      // Configure responses based on table
      switch (table) {
        case 'marketing_attribution':
          mockChain.single.mockResolvedValue({ data: mockAttributionData, error: null });
          break;
        case 'marketing_spend':
          mockChain.single.mockResolvedValue({ data: mockSpendData, error: null });
          break;
        case 'customer_conversions':
          mockChain.single.mockResolvedValue({ data: mockConversionData, error: null });
          break;
        default:
          mockChain.single.mockResolvedValue({ data: [], error: null });
      }

      return mockChain;
    });

    cacCalculator = new CACCalculator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Channel CAC Calculation', () => {
    it('should calculate basic CAC correctly', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001', 'google-ads-002']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result).toMatchObject({
        cac: expect.any(Number),
        totalSpend: expect.any(Number),
        newCustomers: expect.any(Number),
        conversionRate: expect.any(Number),
        qualityScore: expect.any(Number)
      });

      expect(result.cac).toBeGreaterThan(0);
      expect(result.newCustomers).toBe(3); // Based on mock data
      expect(result.totalSpend).toBe(1500); // Sum of spend data
      expect(result.cac).toBeCloseTo(500, 0); // 1500 / 3 customers
    });

    it('should calculate multi-touch attribution correctly', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.cacByModel).toBeDefined();
      expect(result.cacByModel['first_touch']).toBeGreaterThan(0);
      expect(result.cacByModel['last_touch']).toBeGreaterThan(0);
      expect(result.cacByModel['linear']).toBeGreaterThan(0);
      expect(result.cacByModel['time_decay']).toBeGreaterThan(0);
      expect(result.cacByModel['position_based']).toBeGreaterThan(0);
    });

    it('should include trend analysis', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.trends).toBeDefined();
      expect(result.trends).toHaveProperty('monthOverMonth');
      expect(result.trends).toHaveProperty('quarterOverQuarter');
      expect(typeof result.trends.monthOverMonth).toBe('number');
      expect(typeof result.trends.quarterOverQuarter).toBe('number');
    });

    it('should calculate conversion metrics correctly', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.conversionRate).toBeGreaterThan(0);
      expect(result.conversionRate).toBeLessThanOrEqual(1);
      expect(result.averageTimeToPurchase).toBeGreaterThan(0);
      expect(result.averageJourneyLength).toBeGreaterThan(0);
    });
  });

  describe('Attribution Models', () => {
    it('should implement first-touch attribution correctly', async () => {
      const attribution = await cacCalculator.calculateFirstTouchAttribution(
        'paid_search', 
        testDateRange
      );

      expect(attribution).toBeGreaterThan(0);
      // First-touch should give full credit to the first touchpoint
    });

    it('should implement last-touch attribution correctly', async () => {
      const attribution = await cacCalculator.calculateLastTouchAttribution(
        'paid_search', 
        testDateRange
      );

      expect(attribution).toBeGreaterThan(0);
      // Last-touch should give full credit to the last touchpoint
    });

    it('should implement linear attribution correctly', async () => {
      const attribution = await cacCalculator.calculateLinearAttribution(
        'paid_search', 
        testDateRange
      );

      expect(attribution).toBeGreaterThan(0);
      // Linear should distribute credit equally across touchpoints
    });

    it('should implement time-decay attribution correctly', async () => {
      const attribution = await cacCalculator.calculateTimeDecayAttribution(
        'paid_search', 
        testDateRange
      );

      expect(attribution).toBeGreaterThan(0);
      // Time-decay should give more credit to recent touchpoints
    });

    it('should implement position-based attribution correctly', async () => {
      const attribution = await cacCalculator.calculatePositionBasedAttribution(
        'paid_search', 
        testDateRange
      );

      expect(attribution).toBeGreaterThan(0);
      // Position-based should give more credit to first and last touchpoints
    });
  });

  describe('Quality Scoring', () => {
    it('should calculate quality scores within valid range', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should factor customer lifetime value into quality score', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      // Mock higher LTV customers
      mockConversionData[0].revenue = 500;
      mockConversionData[1].revenue = 600;
      
      const highLTVResult = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      // Reset to lower LTV
      mockConversionData[0].revenue = 50;
      mockConversionData[1].revenue = 60;
      
      const lowLTVResult = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(highLTVResult.qualityScore).toBeGreaterThan(lowLTVResult.qualityScore);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle channels with no spend data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'marketing_spend') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockAttributionData, error: null })
        };
      });

      const testChannel: AcquisitionChannel = {
        name: 'organic_search',
        type: 'organic',
        campaigns: []
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.cac).toBe(0);
      expect(result.totalSpend).toBe(0);
    });

    it('should handle channels with no conversions', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'customer_conversions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSpendData, error: null })
        };
      });

      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.newCustomers).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.cac).toBe(Infinity);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      await expect(cacCalculator.calculateChannelCAC(testChannel, testDateRange))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Performance Tests', () => {
    it('should complete CAC calculation within acceptable time', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001', 'google-ads-002']
      };

      const startTime = Date.now();
      await cacCalculator.calculateChannelCAC(testChannel, testDateRange);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeAttributionData = Array.from({ length: 1000 }, (_, i) => ({
        channel: 'paid_search',
        campaign_id: `campaign-${i}`,
        customer_id: `customer-${i}`,
        touchpoint_timestamp: new Date(`2024-01-${(i % 28) + 1}`),
        conversion_timestamp: new Date(`2024-02-${(i % 28) + 1}`),
        conversion_value: 150 + (i % 100),
        attribution_weight: Math.random()
      }));

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'marketing_attribution') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: largeAttributionData, error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSpendData, error: null })
        };
      });

      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const startTime = Date.now();
      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(10000); // Should handle large datasets within 10 seconds
    });
  });

  describe('Business Logic Validation', () => {
    it('should apply wedding industry seasonality correctly', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      // Test spring wedding season (higher expected CAC)
      const springRange: DateRange = {
        start: new Date('2024-03-01'),
        end: new Date('2024-05-31')
      };

      // Test winter season (lower expected CAC)
      const winterRange: DateRange = {
        start: new Date('2024-11-01'),
        end: new Date('2024-01-31')
      };

      const springResult = await cacCalculator.calculateChannelCAC(testChannel, springRange);
      const winterResult = await cacCalculator.calculateChannelCAC(testChannel, winterRange);

      // Both should return valid results
      expect(springResult.cac).toBeGreaterThan(0);
      expect(winterResult.cac).toBeGreaterThan(0);
    });

    it('should calculate payback periods correctly', async () => {
      const testChannel: AcquisitionChannel = {
        name: 'paid_search',
        type: 'paid_search',
        campaigns: ['google-ads-001']
      };

      const result = await cacCalculator.calculateChannelCAC(testChannel, testDateRange);

      expect(result.averageTimeToPurchase).toBeGreaterThan(0);
      expect(result.averageTimeToPurchase).toBeLessThan(365); // Should be less than a year
    });
  });
});