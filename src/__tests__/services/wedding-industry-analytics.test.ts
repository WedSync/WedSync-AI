import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  WeddingIndustryAnalytics,
  weddingAnalytics,
} from '@/lib/services/wedding-industry-analytics';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabaseData = [
  {
    id: 'req-1',
    category: 'timeline_management',
    user_type: 'wedding_supplier',
    wedding_context: {
      wedding_size: 'large',
      timeframe: 'week_of_wedding',
      pain_points: ['weather_uncertainty', 'vendor_coordination'],
    },
    final_priority_score: 85.6,
    vote_count: 25,
    comment_count: 8,
    created_at: '2024-06-15T10:00:00Z',
    status: 'open',
    pain_points: ['weather_uncertainty', 'vendor_coordination'],
    reach_score: 8,
    impact_score: 9,
    rice_calculated_score: 126,
    title: 'Weather alerts for outdoor ceremonies',
    description: 'Need automated weather monitoring for outdoor weddings',
  },
  {
    id: 'req-2',
    category: 'budget_tracking',
    user_type: 'couple',
    wedding_context: {
      wedding_size: 'medium',
      timeframe: 'planning_phase',
      pain_points: ['cost_overruns', 'vendor_invoicing'],
    },
    final_priority_score: 67.2,
    vote_count: 18,
    comment_count: 5,
    created_at: '2024-06-10T14:30:00Z',
    status: 'in_development',
    pain_points: ['cost_overruns', 'vendor_invoicing'],
    reach_score: 7,
    impact_score: 8,
    rice_calculated_score: 89,
  },
  {
    id: 'req-3',
    category: 'guest_management',
    user_type: 'couple',
    wedding_context: {
      wedding_size: 'intimate',
      timeframe: 'immediate',
      pain_points: ['rsvp_tracking', 'dietary_requirements'],
    },
    final_priority_score: 45.3,
    vote_count: 12,
    comment_count: 3,
    created_at: '2024-06-20T09:15:00Z',
    status: 'completed',
    pain_points: ['rsvp_tracking', 'dietary_requirements'],
    reach_score: 5,
    impact_score: 6,
    rice_calculated_score: 45,
  },
  {
    id: 'req-4',
    category: 'vendor_coordination',
    user_type: 'wedding_planner',
    wedding_context: {
      wedding_size: 'destination',
      timeframe: 'week_of_wedding',
      pain_points: ['miscommunication', 'scheduling_conflicts'],
    },
    final_priority_score: 92.8,
    vote_count: 35,
    comment_count: 12,
    created_at: '2024-06-18T16:45:00Z',
    status: 'approved',
    pain_points: ['miscommunication', 'scheduling_conflicts'],
    reach_score: 9,
    impact_score: 10,
    rice_calculated_score: 180,
  },
];

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      gte: jest.fn(() =>
        Promise.resolve({
          data: mockSupabaseData,
          error: null,
        }),
      ),
    })),
  })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Wedding Industry Analytics', () => {
  let analytics: WeddingIndustryAnalytics;

  beforeEach(() => {
    jest.clearAllMocks();
    analytics = new WeddingIndustryAnalytics();

    // Mock current date to June for predictable seasonal calculations
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateWeddingInsights', () => {
    test('calculates seasonal relevance correctly during peak season', async () => {
      const timelineRequest = {
        id: 'test-1',
        category: 'timeline_management',
        wedding_context: { timeframe: 'week_of_wedding' },
        reach_score: 8,
        impact_score: 9,
        final_priority_score: 85.6,
      } as any;

      const insights =
        await analytics.calculateWeddingInsights(timelineRequest);

      expect(insights.seasonal_relevance).toBeGreaterThan(1.0);
      expect(insights.seasonal_relevance).toBeLessThanOrEqual(2.0);
      expect(insights).toHaveProperty('vendor_impact');
      expect(insights).toHaveProperty('couple_benefit');
      expect(insights).toHaveProperty('implementation_urgency');
    });

    test('calculates vendor impact for supplier-submitted requests', async () => {
      const supplierRequest = {
        id: 'test-2',
        category: 'vendor_coordination',
        user_type: 'wedding_supplier',
        wedding_context: { wedding_size: 'large' },
        reach_score: 9,
        impact_score: 8,
        final_priority_score: 120.5,
      } as any;

      const insights =
        await analytics.calculateWeddingInsights(supplierRequest);

      expect(insights.vendor_impact).toBe('high');
      expect(insights.implementation_urgency).toBeGreaterThan(100);
    });

    test('prioritizes couple-beneficial features', async () => {
      const coupleRequest = {
        id: 'test-3',
        category: 'guest_management',
        user_type: 'couple',
        title: 'automated guest reminder system',
        description: 'automatic notifications for rsvp deadlines',
        wedding_context: { timeframe: 'planning_phase' },
        reach_score: 7,
        impact_score: 8,
        final_priority_score: 75.2,
      } as any;

      const insights = await analytics.calculateWeddingInsights(coupleRequest);

      expect(insights.couple_benefit).toBe('high');
    });

    test('identifies wedding day critical features', async () => {
      const weddingDayRequest = {
        id: 'test-4',
        category: 'timeline_management',
        title: 'live ceremony coordination system',
        description: 'real-time coordination during wedding ceremony',
        wedding_context: { timeframe: 'week_of_wedding' },
        final_priority_score: 95.8,
        vote_count: 65,
      } as any;

      const insights =
        await analytics.calculateWeddingInsights(weddingDayRequest);

      expect(insights.implementation_urgency).toBeGreaterThan(95);
    });
  });

  describe('generateProductInsights', () => {
    test('generates comprehensive product insights', async () => {
      const insights = await analytics.generateProductInsights();

      expect(insights).toHaveProperty('top_requested_categories');
      expect(insights).toHaveProperty('wedding_size_patterns');
      expect(insights).toHaveProperty('user_type_priorities');
      expect(insights).toHaveProperty('seasonal_trends');
      expect(insights).toHaveProperty('critical_gaps');

      // Verify data structures
      expect(Array.isArray(insights.top_requested_categories)).toBe(true);
      expect(Array.isArray(insights.wedding_size_patterns)).toBe(true);
      expect(Array.isArray(insights.user_type_priorities)).toBe(true);
      expect(Array.isArray(insights.seasonal_trends)).toBe(true);
      expect(Array.isArray(insights.critical_gaps)).toBe(true);
    });

    test('analyzes top requested categories correctly', async () => {
      const insights = await analytics.generateProductInsights();

      expect(insights.top_requested_categories.length).toBeGreaterThan(0);

      const topCategory = insights.top_requested_categories[0];
      expect(topCategory).toHaveProperty('category');
      expect(topCategory).toHaveProperty('request_count');
      expect(topCategory).toHaveProperty('average_priority_score');
      expect(topCategory).toHaveProperty('total_votes');
      expect(topCategory).toHaveProperty('completion_rate');

      // Verify calculations are reasonable
      expect(topCategory.request_count).toBeGreaterThan(0);
      expect(topCategory.average_priority_score).toBeGreaterThan(0);
      expect(topCategory.completion_rate).toBeLessThanOrEqual(1.0);
    });

    test('identifies wedding size patterns', async () => {
      const insights = await analytics.generateProductInsights();

      expect(insights.wedding_size_patterns.length).toBeGreaterThan(0);

      const sizePattern = insights.wedding_size_patterns[0];
      expect(sizePattern).toHaveProperty('wedding_size');
      expect(sizePattern).toHaveProperty('request_count');
      expect(sizePattern).toHaveProperty('average_urgency');
      expect(sizePattern).toHaveProperty('top_pain_points');

      expect(Array.isArray(sizePattern.top_pain_points)).toBe(true);
      expect(sizePattern.request_count).toBeGreaterThan(0);
    });

    test('analyzes user type priorities', async () => {
      const insights = await analytics.generateProductInsights();

      expect(insights.user_type_priorities.length).toBeGreaterThan(0);

      const userPriority = insights.user_type_priorities[0];
      expect(userPriority).toHaveProperty('user_type');
      expect(userPriority).toHaveProperty('request_count');
      expect(userPriority).toHaveProperty('average_vote_weight');
      expect(userPriority).toHaveProperty('most_requested_category');

      expect(userPriority.request_count).toBeGreaterThan(0);
      expect(userPriority.average_vote_weight).toBeGreaterThan(0);
    });

    test('identifies seasonal trends', async () => {
      const insights = await analytics.generateProductInsights();

      expect(insights.seasonal_trends.length).toBeGreaterThan(0);

      const trend = insights.seasonal_trends[0];
      expect(trend).toHaveProperty('month');
      expect(trend).toHaveProperty('month_name');
      expect(trend).toHaveProperty('request_count');
      expect(trend).toHaveProperty('urgency_multiplier');
      expect(trend).toHaveProperty('top_categories');

      expect(trend.month).toBeGreaterThanOrEqual(1);
      expect(trend.month).toBeLessThanOrEqual(12);
      expect(Array.isArray(trend.top_categories)).toBe(true);
    });

    test('identifies critical gaps in functionality', async () => {
      const insights = await analytics.generateProductInsights();

      expect(insights.critical_gaps.length).toBeGreaterThanOrEqual(0);

      if (insights.critical_gaps.length > 0) {
        const gap = insights.critical_gaps[0];
        expect(gap).toHaveProperty('description');
        expect(gap).toHaveProperty('affected_users');
        expect(gap).toHaveProperty('business_impact');
        expect(gap).toHaveProperty('implementation_difficulty');
        expect(gap).toHaveProperty('recommendation');

        expect(gap.affected_users).toBeGreaterThan(0);
        expect(gap.business_impact).toBeGreaterThan(0);
        expect(gap.implementation_difficulty).toBeGreaterThanOrEqual(1);
        expect(gap.implementation_difficulty).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Wedding Industry Specific Calculations', () => {
    test('applies correct seasonal multipliers throughout the year', () => {
      // Test different months
      const testMonths = [
        { month: 1, expected: 1.0 }, // Off-season
        { month: 6, expected: 1.2 }, // Peak season
        { month: 9, expected: 1.2 }, // Peak season
        { month: 12, expected: 1.0 }, // Off-season
      ];

      testMonths.forEach(({ month, expected }) => {
        jest.setSystemTime(
          new Date(`2024-${month.toString().padStart(2, '0')}-15`),
        );

        const request = {
          category: 'timeline_management',
          wedding_context: { timeframe: 'planning_phase' },
        } as any;

        // Access private method for testing
        const seasonalRelevance = (analytics as any).calculateSeasonalRelevance(
          request,
        );
        expect(seasonalRelevance).toBeGreaterThanOrEqual(expected);
      });
    });

    test('correctly identifies vendor types from wedding context', () => {
      const vendorMappings = [
        {
          context: { category: 'timeline_management' },
          expectedVendors: ['wedding_planner', 'photographer', 'coordinator'],
        },
        {
          context: { category: 'budget_tracking' },
          expectedVendors: ['all_vendors', 'couples'],
        },
        {
          context: { category: 'guest_management' },
          expectedVendors: ['couples', 'caterer', 'venue'],
        },
      ];

      vendorMappings.forEach(({ context, expectedVendors }) => {
        const vendorTypes = (analytics as any).extractVendorTypes(context);
        expectedVendors.forEach((vendor) => {
          expect(vendorTypes).toContain(vendor);
        });
      });
    });

    test('assesses business disruption levels accurately', () => {
      const disruptionTests = [
        {
          request: { effort_score: 2, reach_score: 3 },
          expectedLevel: 'low',
        },
        {
          request: { effort_score: 5, reach_score: 7 },
          expectedLevel: 'medium',
        },
        {
          request: { effort_score: 8, reach_score: 9 },
          expectedLevel: 'critical',
        },
      ];

      disruptionTests.forEach(({ request, expectedLevel }) => {
        const level = (analytics as any).assessBusinessDisruption(request);
        expect(level).toBe(expectedLevel);
      });
    });

    test('estimates revenue impact with marketplace considerations', () => {
      const revenueTests = [
        {
          request: {
            reach_score: 5,
            impact_score: 6,
            category: 'guest_management',
            title: 'Guest list improvements',
          },
          vendorTypes: ['couples', 'caterer'],
          expectMultiplier: 1,
        },
        {
          request: {
            reach_score: 8,
            impact_score: 9,
            category: 'integrations',
            title: 'Payment gateway integration',
          },
          vendorTypes: ['all_vendors'],
          expectMultiplier: 2, // Marketplace feature
        },
      ];

      revenueTests.forEach(({ request, vendorTypes, expectMultiplier }) => {
        const revenueImpact = (analytics as any).estimateRevenueImpact(
          request,
          vendorTypes,
        );
        expect(revenueImpact).toBeGreaterThan(0);

        if (expectMultiplier > 1) {
          // Marketplace features should have higher revenue impact
          expect(revenueImpact).toBeGreaterThan(
            request.reach_score * request.impact_score * 1000,
          );
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty dataset gracefully', async () => {
      // Mock empty response
      mockSupabaseClient.from().select().gte.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const insights = await analytics.generateProductInsights();

      expect(insights.top_requested_categories).toEqual([]);
      expect(insights.wedding_size_patterns).toEqual([]);
      expect(insights.user_type_priorities).toEqual([]);
      expect(insights.critical_gaps).toEqual([]);
    });

    test('handles database errors gracefully', async () => {
      // Mock database error
      mockSupabaseClient
        .from()
        .select()
        .gte.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        });

      await expect(analytics.generateProductInsights()).rejects.toThrow(
        'Database connection failed',
      );
    });

    test('handles malformed wedding context data', async () => {
      const malformedRequest = {
        id: 'test-malformed',
        category: 'timeline_management',
        wedding_context: null, // Malformed
        reach_score: 5,
        impact_score: 6,
        final_priority_score: 45.2,
      } as any;

      const insights =
        await analytics.calculateWeddingInsights(malformedRequest);

      // Should not crash and provide default values
      expect(insights).toBeDefined();
      expect(insights.seasonal_relevance).toBeGreaterThan(0);
    });

    test('validates RICE score bounds in calculations', () => {
      const extremeRequest = {
        reach_score: 15, // Out of bounds
        impact_score: 0, // Out of bounds
        effort_score: -1, // Out of bounds
        wedding_context: { timeframe: 'planning_phase' },
      } as any;

      // Should handle extreme values without crashing
      const seasonalRelevance = (analytics as any).calculateSeasonalRelevance(
        extremeRequest,
      );
      expect(seasonalRelevance).toBeGreaterThan(0);
      expect(seasonalRelevance).toBeLessThanOrEqual(2.0);
    });

    test('handles missing pain points data', () => {
      const noPainPointsRequest = {
        wedding_context: {
          wedding_size: 'large',
          timeframe: 'planning_phase',
          // pain_points is missing
        },
      };

      const vendorTypes = (analytics as any).extractVendorTypes(
        noPainPointsRequest.wedding_context,
      );
      expect(Array.isArray(vendorTypes)).toBe(true);
      expect(vendorTypes.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Considerations', () => {
    test('processes large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSupabaseData[0],
        id: `req-${i}`,
        category: [
          'timeline_management',
          'budget_tracking',
          'guest_management',
        ][i % 3],
        created_at: new Date(2024, 5, (i % 30) + 1).toISOString(),
      }));

      mockSupabaseClient.from().select().gte.mockResolvedValueOnce({
        data: largeDataset,
        error: null,
      });

      const startTime = Date.now();
      const insights = await analytics.generateProductInsights();
      const endTime = Date.now();

      // Should complete within reasonable time (under 5 seconds for this test)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(insights.top_requested_categories.length).toBeGreaterThan(0);
    });

    test('limits result sizes appropriately', async () => {
      const insights = await analytics.generateProductInsights();

      // Should limit results to prevent memory issues
      expect(insights.top_requested_categories.length).toBeLessThanOrEqual(10);
      expect(insights.critical_gaps.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Integration with Wedding Business Logic', () => {
    test('prioritizes wedding-day critical features appropriately', () => {
      const weddingDayFeatures = [
        'live ceremony coordination',
        'day of wedding checklist',
        'real-time vendor communication',
      ];

      weddingDayFeatures.forEach((title) => {
        const request = {
          title,
          description: 'Wedding day feature',
          final_priority_score: 50,
          vote_count: 20,
        } as any;

        const urgency = (analytics as any).calculateImplementationUrgency(
          request,
        );
        expect(urgency).toBeGreaterThan(50); // Should get urgency boost
      });
    });

    test('accounts for vendor ecosystem dependencies', () => {
      const ecosystemTests = [
        {
          category: 'vendor_coordination',
          expectedVendors: ['all_vendors', 'wedding_planner'],
          expectHighImpact: true,
        },
        {
          category: 'guest_management',
          expectedVendors: ['couples', 'caterer', 'venue'],
          expectHighImpact: false,
        },
      ];

      ecosystemTests.forEach(
        ({ category, expectedVendors, expectHighImpact }) => {
          const context = { category };
          const vendorTypes = (analytics as any).extractVendorTypes(context);

          expectedVendors.forEach((vendor) => {
            expect(vendorTypes).toContain(vendor);
          });
        },
      );
    });
  });
});

describe('WeddingIndustryAnalytics Singleton', () => {
  test('exports singleton instance correctly', () => {
    expect(weddingAnalytics).toBeInstanceOf(WeddingIndustryAnalytics);

    // Test that it's the same instance
    const instance1 = weddingAnalytics;
    const instance2 = weddingAnalytics;
    expect(instance1).toBe(instance2);
  });

  test('singleton maintains state across calls', async () => {
    // This test verifies the singleton pattern works correctly
    const result1 = await weddingAnalytics.generateProductInsights();
    const result2 = await weddingAnalytics.generateProductInsights();

    // Both calls should work (structure validation)
    expect(result1).toHaveProperty('top_requested_categories');
    expect(result2).toHaveProperty('top_requested_categories');
  });
});
