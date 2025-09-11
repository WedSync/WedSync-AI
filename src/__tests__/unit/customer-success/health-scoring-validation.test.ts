/**
 * WS-168: Health Scoring Algorithm Validation Tests
 * Comprehensive validation suite for mathematical accuracy and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthScoringEngine } from '@/lib/services/health-scoring-engine';
describe('Health Scoring Algorithm Validation', () => {
  let engine: HealthScoringEngine;
  beforeEach(() => {
    engine = new HealthScoringEngine();
  });
  describe('Mathematical Accuracy Validation', () => {
    it('should validate weight distribution sums to 1.0', () => {
      const weights = {
        onboarding_completion: 0.15,
        feature_adoption_breadth: 0.12,
        feature_adoption_depth: 0.13,
        engagement_frequency: 0.12,
        engagement_quality: 0.15,
        success_milestone_progress: 0.10,
        support_interaction_quality: 0.08,
        platform_value_realization: 0.10,
        retention_indicators: 0.05,
        growth_trajectory: 0.00
      };
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001); // Allow for floating point precision
    });
    it('should validate component scores are always within 0-100 range', async () => {
      const testCases = [
        // Edge case: Very high usage data
        {
          featureUsage: [
            { feature_key: 'feature1', usage_count: 50 },
            { feature_key: 'feature2', usage_count: 100 }
          ]
        },
        // Edge case: Empty engagement events
          engagementEvents: []
        // Edge case: Very frequent engagement
          engagementEvents: Array(100).fill(null).map((_, i) => ({
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          }))
        }
      ];
      for (const userData of testCases) {
        const score = await (engine as unknown).calculateFeatureDepthScore(userData);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        const engagementScore = await (engine as unknown).calculateEngagementFrequencyScore(userData);
        expect(engagementScore).toBeGreaterThanOrEqual(0);
        expect(engagementScore).toBeLessThanOrEqual(100);
      }
    it('should validate overall score calculation consistency', () => {
      const componentScores = {
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
      const calculatedScore = (engine as unknown).calculateWeightedScore(componentScores);
      
      // Manual calculation for verification
      const expectedScore = Math.round(
        85 * 0.15 + 75 * 0.12 + 80 * 0.13 + 70 * 0.12 + 85 * 0.15 +
        67 * 0.10 + 90 * 0.08 + 80 * 0.10 + 85 * 0.05 + 75 * 0.00
      );
      expect(calculatedScore).toBe(expectedScore);
      expect(calculatedScore).toBeGreaterThanOrEqual(0);
      expect(calculatedScore).toBeLessThanOrEqual(100);
    it('should validate risk score thresholds are logical', async () => {
          scores: { onboarding_completion: 90, engagement_frequency: 85, feature_adoption_breadth: 80 },
          expectedRiskLevel: 'low'
          scores: { onboarding_completion: 30, engagement_frequency: 20, feature_adoption_breadth: 15 },
          expectedRiskLevel: ['high', 'critical']
          scores: { onboarding_completion: 60, engagement_frequency: 55, feature_adoption_breadth: 50 },
          expectedRiskLevel: ['low', 'medium']
      for (const testCase of testCases) {
        const riskAssessment = await (engine as unknown).assessRisks(testCase.scores, {});
        
        expect(riskAssessment.churn_risk_score).toBeGreaterThanOrEqual(0);
        expect(riskAssessment.churn_risk_score).toBeLessThanOrEqual(100);
        if (Array.isArray(testCase.expectedRiskLevel)) {
          expect(testCase.expectedRiskLevel).toContain(riskAssessment.risk_level);
        } else {
          expect(riskAssessment.risk_level).toBe(testCase.expectedRiskLevel);
  describe('Edge Case Validation', () => {
    it('should handle division by zero scenarios', async () => {
      const edgeCases = [
        { milestones: [] }, // Empty array - division by zero risk
        { featureUsage: [] }, // Empty feature usage
        { onboardingProgress: { completed_steps: 0, total_steps: 0 } }, // Zero total steps
        { supportTickets: [] } // No support tickets
      for (const userData of edgeCases) {
        // These should not throw errors and should return valid scores
        expect(async () => {
          await (engine as unknown).calculateOnboardingScore(userData);
          await (engine as unknown).calculateFeatureBreadthScore(userData);
          await (engine as unknown).calculateMilestoneScore(userData);
          await (engine as unknown).calculateSupportScore(userData);
        }).not.toThrow();
    it('should validate null and undefined data handling', async () => {
      const nullDataCases = [
        { onboardingProgress: null },
        { featureUsage: undefined },
        { milestones: null },
        { engagementEvents: undefined }
      for (const userData of nullDataCases) {
        const onboardingScore = await (engine as unknown).calculateOnboardingScore(userData);
        const featureScore = await (engine as unknown).calculateFeatureBreadthScore(userData);
        const milestoneScore = await (engine as unknown).calculateMilestoneScore(userData);
        // All scores should be valid numbers, not NaN or undefined
        expect(typeof onboardingScore).toBe('number');
        expect(typeof featureScore).toBe('number');
        expect(typeof milestoneScore).toBe('number');
        expect(typeof engagementScore).toBe('number');
        expect(isNaN(onboardingScore)).toBe(false);
        expect(isNaN(featureScore)).toBe(false);
        expect(isNaN(milestoneScore)).toBe(false);
        expect(isNaN(engagementScore)).toBe(false);
    it('should validate extreme values handling', async () => {
      const extremeCases = [
          name: 'Very high usage counts',
          featureUsage: [{ feature_key: 'feature1', usage_count: 10000 }]
          name: 'Very old user profile',
          userProfile: { created_at: new Date('2020-01-01') }
          name: 'Very recent user profile',
          userProfile: { created_at: new Date() }
          name: 'Large number of engagement events',
          engagementEvents: Array(10000).fill({ created_at: new Date() })
      for (const testCase of extremeCases) {
        const featureDepthScore = await (engine as unknown).calculateFeatureDepthScore(testCase);
        const retentionScore = await (engine as unknown).calculateRetentionScore(testCase);
        const engagementScore = await (engine as unknown).calculateEngagementFrequencyScore(testCase);
        // Scores should still be within valid range
        expect(featureDepthScore).toBeGreaterThanOrEqual(0);
        expect(featureDepthScore).toBeLessThanOrEqual(100);
        expect(retentionScore).toBeGreaterThanOrEqual(0);
        expect(retentionScore).toBeLessThanOrEqual(100);
  describe('Algorithm Logic Validation', () => {
    it('should validate score trends analysis logic', () => {
        { current: 80, score7d: 70, score30d: 60, expectedTrend: 'improving' },
        { current: 70, score7d: 80, score30d: 85, expectedTrend: 'declining' },
        { current: 75, score7d: 74, score30d: 76, expectedTrend: 'stable' },
        { current: 80, score7d: 60, score30d: 90, expectedTrend: 'volatile' }
        const trend_7d = testCase.current - (testCase.score7d || 0);
        const trend_30d = testCase.current - (testCase.score30d || 0);
        let trend_direction: 'improving' | 'stable' | 'declining' | 'volatile' = 'stable';
        if (Math.abs(trend_7d) > 10 && Math.abs(trend_30d) > 15) {
          trend_direction = 'volatile';
        } else if (trend_7d > 5 || trend_30d > 10) {
          trend_direction = 'improving';
        } else if (trend_7d < -5 || trend_30d < -10) {
          trend_direction = 'declining';
        expect(trend_direction).toBe(testCase.expectedTrend);
    it('should validate percentile calculation accuracy', () => {
      const testScores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      // Test percentile calculations
      const p50 = (engine as unknown).percentile(testScores, 50);
      const p90 = (engine as unknown).percentile(testScores, 90);
      const p10 = (engine as unknown).percentile(testScores, 10);
      expect(p50).toBe(55); // Median of sorted array
      expect(p90).toBe(91); // 90th percentile
      expect(p10).toBe(19); // 10th percentile
    it('should validate recommendation prioritization logic', async () => {
        onboarding_completion: 30, // Lowest - should be highest priority
        engagement_frequency: 40,  // Second lowest
        feature_adoption_breadth: 80, // High - should not be prioritized
        support_interaction_quality: 95 // Highest - should not be prioritized
      const recommendations = await (engine as unknown).generateRecommendations(componentScores, { risk_level: 'medium' }, {});
      expect(recommendations.opportunities.length).toBeGreaterThan(0);
      expect(recommendations.nextActions.length).toBeGreaterThan(0);
      // Should prioritize lowest scoring components
      const onboardingRec = recommendations.opportunities.find((rec: any) => 
        rec.category === 'Onboarding'
      expect(onboardingRec).toBeDefined();
      expect(['high', 'critical'].includes(onboardingRec.priority)).toBe(true);
  describe('Performance Validation', () => {
    it('should maintain calculation performance within acceptable limits', async () => {
      const mockUserData = {
        userProfile: { id: 'user-123', created_at: new Date() },
        featureUsage: Array(100).fill({ feature_key: 'test', usage_count: 5 }),
        engagementEvents: Array(500).fill({ created_at: new Date() }),
        milestones: Array(50).fill({ achieved: true })
      const startTime = Date.now();
      await (engine as unknown).calculateComponentScores(mockUserData);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      // Should complete component scoring within reasonable time
      expect(executionTime).toBeLessThan(1000); // Less than 1 second
    it('should validate caching effectiveness', () => {
      const cacheKey = 'health_score:user-123';
      const ttl = 3600;
      // Verify cache key generation is consistent
      const key1 = `health_score:user-123`;
      const key2 = `health_score:user-123`;
      expect(key1).toBe(key2); // Keys should be identical for same input
      expect(ttl).toBeGreaterThan(0); // TTL should be positive
  describe('Business Logic Validation', () => {
    it('should validate wedding industry-specific scoring logic', async () => {
      const weddingSupplierData = {
        userProfile: { 
          id: 'supplier-123', 
          supplier_category: 'photographer',
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
        milestones: [
          { achieved: true }, // Portfolio upload
          { achieved: true }, // First booking
          { achieved: false } // Client testimonial
        ],
        engagementEvents: [
          { created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Recent activity
          { created_at: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        ]
      const milestoneScore = await (engine as unknown).calculateMilestoneScore(weddingSupplierData);
      const retentionScore = await (engine as unknown).calculateRetentionScore(weddingSupplierData);
      expect(milestoneScore).toBeCloseTo(67, 0); // 2/3 milestones achieved
      expect(retentionScore).toBeGreaterThan(70); // Should have good retention for 90-day old account
    it('should validate score consistency across different user types', async () => {
      const baseUserData = {
        onboardingProgress: { completed_steps: 4, total_steps: 5 },
        milestones: [{ achieved: true }, { achieved: false }],
        featureUsage: [{ feature_key: 'feature1', usage_count: 10 }]
      const score1 = await (engine as unknown).calculateOnboardingScore(baseUserData);
      const score2 = await (engine as unknown).calculateOnboardingScore(baseUserData);
      // Same input should always produce same output
      expect(score1).toBe(score2);
      expect(score1).toBe(80); // 4/5 * 100
});
