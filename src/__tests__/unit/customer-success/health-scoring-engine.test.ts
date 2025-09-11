/**
 * WS-133: Health Scoring Engine Tests
 * Comprehensive test suite for the health scoring calculation engine
 */

import { describe, it, expect, jest, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { HealthScoringEngine } from '@/lib/services/health-scoring-engine';
import { createClient } from '@/lib/supabase/server';
// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn()
  }
vi.mock('@/lib/analytics/engagement-scoring', () => ({
  engagementScoringService: {
    getEngagementScore: vi.fn()
describe('HealthScoringEngine', () => {
  let healthScoringEngine: HealthScoringEngine;
  let mockSupabase: unknown;
  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis()
    };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    healthScoringEngine = new HealthScoringEngine();
  });
  afterEach(() => {
    vi.clearAllMocks();
  describe('calculateHealthScore', () => {
    it('should calculate comprehensive health score for a user', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';
      // Mock user data gathering
      const mockUserData = {
        userProfile: {
          id: userId,
          supplier_id: 'supplier-123',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        customerConfig: {
          completion_percentage: 85,
          success_milestones_achieved: 5
        milestones: [
          { achieved: true, points_value: 100 },
          { achieved: true, points_value: 200 },
          { achieved: false, points_value: 150 }
        ],
        featureUsage: [
          { feature_key: 'projects', usage_count: 10 },
          { feature_key: 'clients', usage_count: 5 }
        engagementEvents: [
          { event_type: 'login', created_at: new Date() }
        ]
      };
      // Mock database responses
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockUserData.userProfile, error: null })
        .mockResolvedValueOnce({ data: mockUserData.customerConfig, error: null })
        .mockResolvedValueOnce({ data: mockUserData.milestones, error: null });
      // Mock component score calculations
      vi.spyOn(healthScoringEngine as any, 'gatherUserData')
        .mockResolvedValue(mockUserData);
      vi.spyOn(healthScoringEngine as any, 'calculateComponentScores')
        .mockResolvedValue({
          onboarding_completion: 85,
          feature_adoption_breadth: 75,
          feature_adoption_depth: 80,
          engagement_frequency: 70,
          engagement_quality: 85,
          success_milestone_progress: 67,
          support_interaction_quality: 90,
          platform_value_realization: 80,
          retention_indicators: 85,
          growth_trajectory: 75
        });
      // Call the method
      const result = await healthScoringEngine.calculateHealthScore(userId, false, organizationId);
      // Assertions
      expect(result).toHaveProperty('user_id', userId);
      expect(result).toHaveProperty('organization_id', organizationId);
      expect(result).toHaveProperty('overall_health_score');
      expect(result.overall_health_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_health_score).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('onboarding_completion', 85);
      expect(result).toHaveProperty('churn_risk_score');
      expect(result).toHaveProperty('risk_level');
      expect(result).toHaveProperty('improvement_opportunities');
    });
    it('should use cached results when available and not expired', async () => {
      const cachedScore = {
        user_id: userId,
        overall_health_score: 85,
        expires_at: new Date(Date.now() + 3600000) // 1 hour from now
      const redis = require('@/lib/redis').redis;
      redis.get.mockResolvedValueOnce(JSON.stringify(cachedScore));
      const result = await healthScoringEngine.calculateHealthScore(userId);
      expect(result).toEqual(cachedScore);
      expect(mockSupabase.from).not.toHaveBeenCalled(); // Should not hit database
    it('should recalculate when cache is expired', async () => {
      const expiredCachedScore = {
        expires_at: new Date(Date.now() - 1000) // 1 second ago (expired)
      redis.get.mockResolvedValueOnce(JSON.stringify(expiredCachedScore));
      // Mock fresh calculation data
          userProfile: { id: userId },
          customerConfig: { completion_percentage: 90 }
          onboarding_completion: 90,
          feature_adoption_breadth: 80,
          feature_adoption_depth: 85,
          engagement_frequency: 75,
          engagement_quality: 88,
          success_milestone_progress: 70,
          support_interaction_quality: 92,
          platform_value_realization: 85,
          retention_indicators: 87,
          growth_trajectory: 78
      const result = await healthScoringEngine.calculateHealthScore(userId, true);
      expect(result.overall_health_score).toBeGreaterThan(0);
      expect(mockSupabase.from).toHaveBeenCalled(); // Should hit database for fresh data
    it('should handle missing user data gracefully', async () => {
      const userId = 'nonexistent-user';
          userProfile: null,
          customerConfig: null,
          milestones: [],
          featureUsage: [],
          engagementEvents: []
      await expect(
        healthScoringEngine.calculateHealthScore(userId)
      ).rejects.toThrow();
  describe('calculateBatchHealthScores', () => {
    it('should calculate health scores for multiple users efficiently', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      vi.spyOn(healthScoringEngine, 'calculateHealthScore')
        .mockImplementation((userId) => 
          Promise.resolve({
            user_id: userId,
            overall_health_score: 80,
            calculated_at: new Date(),
            expires_at: new Date(Date.now() + 3600000)
          } as unknown)
        );
      const results = await healthScoringEngine.calculateBatchHealthScores(userIds);
      expect(results.size).toBe(3);
      expect(results.has('user-1')).toBe(true);
      expect(results.has('user-2')).toBe(true);
      expect(results.has('user-3')).toBe(true);
    it('should handle individual user calculation failures in batch', async () => {
      const userIds = ['user-1', 'user-2', 'user-error'];
        .mockImplementation((userId) => {
          if (userId === 'user-error') {
            return Promise.reject(new Error('Calculation failed'));
          }
          return Promise.resolve({
          } as unknown);
      expect(results.size).toBe(2); // Only successful calculations
      expect(results.has('user-error')).toBe(false);
    it('should process large batches in chunks', async () => {
      const userIds = Array(25).fill(null).map((_, i) => `user-${i}`);
          user_id: 'test',
          overall_health_score: 80,
          calculated_at: new Date(),
          expires_at: new Date(Date.now() + 3600000)
        } as unknown);
      expect(results.size).toBe(25);
      expect(healthScoringEngine.calculateHealthScore).toHaveBeenCalledTimes(25);
  describe('getHealthBenchmarks', () => {
    it('should return benchmarks for given user type and organization size', async () => {
      const mockHistoricalScores = [
        { overall_health_score: 95 },
        { overall_health_score: 87 },
        { overall_health_score: 82 },
        { overall_health_score: 75 },
        { overall_health_score: 68 },
        { overall_health_score: 62 },
        { overall_health_score: 45 },
        { overall_health_score: 38 },
        { overall_health_score: 25 },
        { overall_health_score: 15 }
      ];
      mockSupabase.gte.mockReturnValueOnce({
        ...mockSupabase,
        data: mockHistoricalScores,
        error: null
      });
      const result = await healthScoringEngine.getHealthBenchmarks(
        'wedding_planner',
        'medium',
        'hospitality'
      );
      expect(result).toHaveProperty('user_type', 'wedding_planner');
      expect(result).toHaveProperty('organization_size', 'medium');
      expect(result).toHaveProperty('industry', 'hospitality');
      expect(result).toHaveProperty('benchmarks');
      expect(result.benchmarks).toHaveProperty('excellent');
      expect(result.benchmarks).toHaveProperty('good');
      expect(result.benchmarks).toHaveProperty('average');
      expect(result.benchmarks).toHaveProperty('below_average');
      expect(result.benchmarks).toHaveProperty('poor');
      expect(result).toHaveProperty('percentiles');
    it('should return default benchmarks when no historical data available', async () => {
        data: [],
      const result = await healthScoringEngine.getHealthBenchmarks('new_user', 'small');
      expect(result.benchmarks.excellent).toBe(90);
      expect(result.benchmarks.good).toBe(75);
      expect(result.benchmarks.average).toBe(60);
      expect(result.benchmarks.below_average).toBe(45);
      expect(result.benchmarks.poor).toBe(30);
    it('should cache benchmark results', async () => {
      const mockBenchmarks = {
        user_type: 'wedding_planner',
        organization_size: 'large',
        benchmarks: { excellent: 90, good: 75, average: 60, below_average: 45, poor: 30 }
      redis.get.mockResolvedValueOnce(JSON.stringify(mockBenchmarks));
      const result = await healthScoringEngine.getHealthBenchmarks('wedding_planner', 'large');
      expect(result).toEqual(mockBenchmarks);
      expect(mockSupabase.from).not.toHaveBeenCalled();
  describe('getHealthTrends', () => {
    it('should return health score trends over specified time period', async () => {
      const mockTrendData = [
        {
          calculated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          overall_health_score: 75,
          onboarding_completion: 80,
          engagement_frequency: 70
          calculated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          engagement_frequency: 75
          overall_health_score: 85,
          engagement_frequency: 80
        }
      mockSupabase.order.mockReturnValueOnce({
        data: mockTrendData,
      const result = await healthScoringEngine.getHealthTrends(userId, 7);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('user_id', userId);
      expect(result[0]).toHaveProperty('health_score', 75);
      expect(result[0]).toHaveProperty('component_scores');
      expect(result[2].health_score).toBe(85); // Latest should be highest
    it('should handle empty trend data', async () => {
      const result = await healthScoringEngine.getHealthTrends('user-123', 30);
      expect(result).toEqual([]);
    it('should handle database errors gracefully', async () => {
        data: null,
        error: { message: 'Database error' }
  describe('Component Score Calculations', () => {
    let engine: HealthScoringEngine;
    beforeEach(() => {
      engine = new HealthScoringEngine();
    describe('calculateOnboardingScore', () => {
      it('should calculate onboarding completion percentage correctly', async () => {
        const userData = {
          onboardingProgress: {
            completed_steps: 4,
            total_steps: 5
        };
        const score = await (engine as unknown).calculateOnboardingScore(userData);
        expect(score).toBe(80); // 4/5 * 100
      it('should handle missing onboarding data', async () => {
        const userData = { onboardingProgress: null };
        expect(score).toBe(0);
    describe('calculateFeatureBreadthScore', () => {
      it('should calculate feature adoption breadth correctly', async () => {
          featureUsage: [
            { feature_key: 'projects' },
            { feature_key: 'clients' },
            { feature_key: 'tasks' },
            { feature_key: 'calendar' }
          ]
        const score = await (engine as unknown).calculateFeatureBreadthScore(userData);
        expect(score).toBe(20); // 4 features / 20 total features * 100
      it('should cap score at 100', async () => {
          featureUsage: Array(25).fill(null).map((_, i) => ({ feature_key: `feature_${i}` }))
        expect(score).toBe(100);
    describe('calculateEngagementFrequencyScore', () => {
      it('should calculate engagement frequency based on recent activity', async () => {
        const now = new Date();
          engagementEvents: [
            { created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
            { created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
            { created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        const score = await (engine as unknown).calculateEngagementFrequencyScore(userData);
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      it('should return default score for no engagement events', async () => {
        const userData = { engagementEvents: [] };
        expect(score).toBe(50);
    describe('calculateMilestoneScore', () => {
      it('should calculate milestone completion percentage', async () => {
          milestones: [
            { achieved: true },
            { achieved: false },
            { achieved: false }
        const score = await (engine as unknown).calculateMilestoneScore(userData);
        expect(score).toBe(50); // 2/4 * 100
      it('should handle empty milestones array', async () => {
        const userData = { milestones: [] };
  describe('Risk Assessment', () => {
    it('should identify risk factors correctly', async () => {
      const componentScores = {
        onboarding_completion: 30, // Low - should trigger risk factor
        engagement_frequency: 20,  // Very low - should trigger risk factor
        feature_adoption_breadth: 80, // Good - should not trigger risk factor
        support_interaction_quality: 95 // Excellent - should not trigger risk factor
      const riskAssessment = await (engine as unknown).assessRisks(componentScores, {});
      expect(riskAssessment).toHaveProperty('risk_factors');
      expect(riskAssessment.risk_factors.length).toBeGreaterThan(0);
      expect(riskAssessment).toHaveProperty('churn_risk_score');
      expect(riskAssessment.churn_risk_score).toBeGreaterThan(50);
      expect(riskAssessment).toHaveProperty('risk_level');
      expect(['medium', 'high', 'critical'].includes(riskAssessment.risk_level)).toBe(true);
    it('should assign appropriate risk levels', async () => {
      const lowRiskScores = {
        onboarding_completion: 90,
        engagement_frequency: 85,
        feature_adoption_breadth: 80,
        support_interaction_quality: 95
      const lowRiskAssessment = await (engine as unknown).assessRisks(lowRiskScores, {});
      expect(lowRiskAssessment.risk_level).toBe('low');
      const highRiskScores = {
        onboarding_completion: 20,
        engagement_frequency: 15,
        feature_adoption_breadth: 25,
        support_interaction_quality: 60
      const highRiskAssessment = await (engine as unknown).assessRisks(highRiskScores, {});
      expect(['high', 'critical'].includes(highRiskAssessment.risk_level)).toBe(true);
  describe('Performance and Edge Cases', () => {
    it('should handle extremely large datasets efficiently', async () => {
      const userIds = Array(1000).fill(null).map((_, i) => `user-${i}`);
      const startTime = Date.now();
      const endTime = Date.now();
      expect(results.size).toBe(1000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    it('should handle malformed data gracefully', async () => {
      const malformedUserData = {
        userProfile: { id: 'user-123' },
          completion_percentage: null, // Invalid
          success_milestones_achieved: 'invalid' // Wrong type
        milestones: 'not-an-array', // Wrong type
        featureUsage: undefined,
        engagementEvents: null
        .mockResolvedValue(malformedUserData);
      // Should not throw error, should handle gracefully
      const result = await healthScoringEngine.calculateHealthScore('user-123');
      
      expect(result).toBeDefined();
    it('should maintain score consistency across calculations', async () => {
      const consistentUserData = {
        userProfile: { id: 'user-123', created_at: new Date('2024-01-01') },
        customerConfig: { completion_percentage: 75, success_milestones_achieved: 3 },
          { achieved: true },
          { achieved: false }
          { feature_key: 'projects', usage_count: 5 },
          { feature_key: 'clients', usage_count: 3 }
        .mockResolvedValue(consistentUserData);
      const score1 = await healthScoringEngine.calculateHealthScore('user-123', true);
      const score2 = await healthScoringEngine.calculateHealthScore('user-123', true);
      expect(score1.overall_health_score).toBe(score2.overall_health_score);
});
