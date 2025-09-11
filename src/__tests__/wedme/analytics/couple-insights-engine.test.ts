import { CoupleInsightsEngine } from '@/lib/wedme/analytics/couple-insights-engine';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        maybeSingle: jest.fn(),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(),
      })),
      in: jest.fn(),
    })),
  })),
  rpc: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('CoupleInsightsEngine', () => {
  let engine: CoupleInsightsEngine;
  const mockCoupleId = 'couple-123';
  const mockWeddingId = 'wedding-456';

  beforeEach(() => {
    engine = new CoupleInsightsEngine();
    jest.clearAllMocks();
  });

  describe('getPersonalizedInsights', () => {
    beforeEach(() => {
      // Mock wedding data
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            wedding_date: '2024-08-15',
            budget: 25000,
            guest_count: 150,
            style: 'Classic',
            venue_type: 'Garden',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        });

      // Mock budget data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 10000, status: 'confirmed' },
            { category: 'catering', amount: 7500, status: 'pending' },
            { category: 'photography', amount: 3000, status: 'confirmed' },
          ],
          error: null,
        });

      // Mock vendor data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'photographer', status: 'confirmed', rating: 4.8 },
            { category: 'venue', status: 'confirmed', rating: 4.9 },
            { category: 'caterer', status: 'pending', rating: 4.7 },
          ],
          error: null,
        });

      // Mock task data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 1,
              title: 'Book venue',
              status: 'completed',
              due_date: '2024-03-01',
            },
            {
              id: 2,
              title: 'Book photographer',
              status: 'completed',
              due_date: '2024-03-15',
            },
            {
              id: 3,
              title: 'Send invitations',
              status: 'pending',
              due_date: '2024-06-01',
            },
            {
              id: 4,
              title: 'Final menu tasting',
              status: 'pending',
              due_date: '2024-07-01',
            },
          ],
          error: null,
        });
    });

    it('should generate personalized insights successfully', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeDefined();
      expect(result.coupleId).toBe(mockCoupleId);
      expect(result.weddingId).toBe(mockWeddingId);
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.nextSteps).toBeInstanceOf(Array);
      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.opportunities).toBeInstanceOf(Array);
    });

    it('should calculate planning health score correctly', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      // With 2 completed tasks out of 4, score should reflect progress
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(100);

      // Score should be between 40-80 based on mock data
      expect(result.overallScore).toBeGreaterThanOrEqual(40);
      expect(result.overallScore).toBeLessThanOrEqual(80);
    });

    it('should identify budget-related insights', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      const budgetInsights = result.insights.filter(
        (insight) => insight.category === 'budget',
      );

      expect(budgetInsights.length).toBeGreaterThan(0);

      const budgetInsight = budgetInsights[0];
      expect(budgetInsight).toHaveProperty('title');
      expect(budgetInsight).toHaveProperty('description');
      expect(budgetInsight).toHaveProperty('type');
      expect(budgetInsight).toHaveProperty('impact');
      expect(budgetInsight).toHaveProperty('confidence');
    });

    it('should identify timeline-related insights', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      const timelineInsights = result.insights.filter(
        (insight) => insight.category === 'timeline',
      );

      expect(timelineInsights.length).toBeGreaterThan(0);

      const timelineInsight = timelineInsights[0];
      expect(timelineInsight.type).toMatch(/progress|warning|recommendation/);
      expect(timelineInsight.confidence).toBeGreaterThanOrEqual(0.5);
      expect(timelineInsight.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should generate relevant next steps', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.nextSteps).toBeInstanceOf(Array);
      expect(result.nextSteps.length).toBeGreaterThan(0);

      // Should include pending tasks as next steps
      const nextStep = result.nextSteps.find(
        (step) =>
          step.includes('Send invitations') || step.includes('Final menu'),
      );
      expect(nextStep).toBeDefined();
    });

    it('should identify risk factors', async () => {
      // Mock late timeline scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            wedding_date: '2024-03-01', // Very soon!
            budget: 25000,
            guest_count: 150,
            style: 'Classic',
            venue_type: 'Garden',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        });

      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.riskFactors).toBeInstanceOf(Array);

      if (result.riskFactors.length > 0) {
        const risk = result.riskFactors[0];
        expect(risk).toHaveProperty('category');
        expect(risk).toHaveProperty('risk');
        expect(risk).toHaveProperty('severity');
        expect(risk).toHaveProperty('mitigation');
        expect(risk.severity).toMatch(/high|medium|low/);
      }
    });

    it('should identify opportunities for optimization', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.opportunities).toBeInstanceOf(Array);

      if (result.opportunities.length > 0) {
        const opportunity = result.opportunities[0];
        expect(opportunity).toHaveProperty('type');
        expect(opportunity).toHaveProperty('title');
        expect(opportunity).toHaveProperty('description');
        expect(opportunity).toHaveProperty('priority');
        expect(opportunity.priority).toMatch(/high|medium|low/);
      }
    });
  });

  describe('analyzeProgressStatus', () => {
    it('should calculate progress correctly with various task statuses', async () => {
      const mockTasks = [
        { status: 'completed', due_date: '2024-01-01' },
        { status: 'completed', due_date: '2024-01-15' },
        { status: 'in_progress', due_date: '2024-02-01' },
        { status: 'pending', due_date: '2024-03-01' },
        { status: 'pending', due_date: '2024-04-01' },
      ];

      const result = await engine.analyzeProgressStatus(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('onTrack');
      expect(result).toHaveProperty('overdueTasks');
      expect(result).toHaveProperty('upcomingDeadlines');

      expect(result.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.completionRate).toBeLessThanOrEqual(1);
      expect(typeof result.onTrack).toBe('boolean');
    });

    it('should identify overdue tasks correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              status: 'pending',
              due_date: pastDate.toISOString(),
              title: 'Overdue task',
            },
          ],
          error: null,
        });

      const result = await engine.analyzeProgressStatus(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.overdueTasks).toBeGreaterThan(0);
    });
  });

  describe('assessPlanningRisks', () => {
    it('should assess timeline risks correctly', async () => {
      // Mock a wedding very soon with incomplete tasks
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 30); // 30 days away

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: soonDate.toISOString(),
            budget: 25000,
          },
          error: null,
        });

      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              status: 'pending',
              category: 'critical',
              due_date: soonDate.toISOString(),
            },
            {
              status: 'pending',
              category: 'important',
              due_date: soonDate.toISOString(),
            },
          ],
          error: null,
        });

      const result = await engine.assessPlanningRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);

      const timelineRisk = result.find((risk) => risk.category === 'Timeline');
      expect(timelineRisk).toBeDefined();
      if (timelineRisk) {
        expect(timelineRisk.severity).toBe('high');
      }
    });

    it('should assess budget risks correctly', async () => {
      // Mock over-budget scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            budget: 20000, // Lower budget
          },
          error: null,
        });

      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 12000, status: 'confirmed' },
            { category: 'catering', amount: 8000, status: 'confirmed' },
            { category: 'photography', amount: 3000, status: 'pending' },
          ],
          error: null,
        });

      const result = await engine.assessPlanningRisks(
        mockCoupleId,
        mockWeddingId,
      );

      const budgetRisk = result.find((risk) => risk.category === 'Budget');
      expect(budgetRisk).toBeDefined();
      if (budgetRisk) {
        expect(budgetRisk.severity).toMatch(/high|medium/);
      }
    });
  });

  describe('identifyOptimizationOpportunities', () => {
    it('should identify budget optimization opportunities', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 15000, status: 'confirmed' },
            { category: 'photography', amount: 5000, status: 'pending' },
          ],
          error: null,
        });

      const result = await engine.identifyOptimizationOpportunities(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);

      const budgetOpportunity = result.find(
        (opp) => opp.type === 'budget_optimization',
      );
      expect(budgetOpportunity).toBeDefined();
      if (budgetOpportunity) {
        expect(budgetOpportunity).toHaveProperty('estimatedSavings');
        expect(budgetOpportunity.estimatedSavings).toBeGreaterThan(0);
      }
    });

    it('should identify timeline optimization opportunities', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 12);

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: futureDate.toISOString(),
          },
          error: null,
        });

      const result = await engine.identifyOptimizationOpportunities(
        mockCoupleId,
        mockWeddingId,
      );

      const timelineOpportunity = result.find(
        (opp) => opp.type === 'timeline_optimization',
      );
      expect(timelineOpportunity).toBeDefined();
      if (timelineOpportunity) {
        expect(timelineOpportunity.priority).toMatch(/high|medium|low/);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(
        engine.getPersonalizedInsights(mockCoupleId, mockWeddingId),
      ).rejects.toThrow('Wedding not found');
    });

    it('should handle missing data gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            // Missing required fields
          },
          error: null,
        });

      mockSupabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should validate input parameters', async () => {
      await expect(
        engine.getPersonalizedInsights('', mockWeddingId),
      ).rejects.toThrow('Invalid couple ID');

      await expect(
        engine.getPersonalizedInsights(mockCoupleId, ''),
      ).rejects.toThrow('Invalid wedding ID');
    });
  });

  describe('Business Logic Validation', () => {
    it('should correctly prioritize insights by impact and confidence', async () => {
      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.insights.length > 1) {
        const highImpactInsights = result.insights.filter(
          (insight) => insight.impact === 'high',
        );
        const mediumImpactInsights = result.insights.filter(
          (insight) => insight.impact === 'medium',
        );
        const lowImpactInsights = result.insights.filter(
          (insight) => insight.impact === 'low',
        );

        // High impact insights should come first
        const firstInsight = result.insights[0];
        expect(['high', 'medium'].includes(firstInsight.impact)).toBe(true);

        // All insights should have valid confidence scores
        result.insights.forEach((insight) => {
          expect(insight.confidence).toBeGreaterThanOrEqual(0.1);
          expect(insight.confidence).toBeLessThanOrEqual(1.0);
        });
      }
    });

    it('should adapt recommendations based on wedding timeline', async () => {
      // Test early planning phase
      const earlyDate = new Date();
      earlyDate.setMonth(earlyDate.getMonth() + 18);

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: earlyDate.toISOString(),
            budget: 25000,
          },
          error: null,
        });

      const earlyResult = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      // Should focus on foundational planning
      const foundationalInsights = earlyResult.insights.filter(
        (insight) =>
          insight.description.includes('venue') ||
          insight.description.includes('budget') ||
          insight.description.includes('vendors'),
      );

      expect(foundationalInsights.length).toBeGreaterThan(0);

      // Test final planning phase
      const soonDate = new Date();
      soonDate.setMonth(soonDate.getMonth() + 2);

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: soonDate.toISOString(),
            budget: 25000,
          },
          error: null,
        });

      const finalResult = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      // Should focus on final details
      const finalInsights = finalResult.insights.filter(
        (insight) =>
          insight.description.includes('final') ||
          insight.description.includes('confirm') ||
          insight.description.includes('last-minute'),
      );

      expect(finalInsights.length).toBeGreaterThan(0);
    });

    it('should calculate accurate completion rates', async () => {
      const mockTasks = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'pending' },
      ];

      // 3 out of 5 completed = 60%
      const expectedRate = 3 / 5;

      const result = await engine.analyzeProgressStatus(
        mockCoupleId,
        mockWeddingId,
      );

      expect(Math.abs(result.completionRate - expectedRate)).toBeLessThan(0.1);
    });
  });

  describe('Performance Tests', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();

      await engine.getPersonalizedInsights(mockCoupleId, mockWeddingId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeBudgetData = Array.from({ length: 100 }, (_, i) => ({
        category: `category-${i}`,
        amount: Math.random() * 1000,
        status: 'confirmed',
      }));

      const largeTaskData = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        status: i % 3 === 0 ? 'completed' : 'pending',
        due_date: '2024-06-01',
      }));

      mockSupabase.from().select().eq().mockResolvedValue({
        data: largeBudgetData,
        error: null,
      });

      const startTime = Date.now();

      const result = await engine.getPersonalizedInsights(
        mockCoupleId,
        mockWeddingId,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should handle large datasets within 3 seconds
    });
  });
});
