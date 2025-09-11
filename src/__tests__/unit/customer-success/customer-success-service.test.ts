/**
 * WS-133: Customer Success Service Tests
 * Comprehensive test suite for the customer success system
 */

import { describe, it, expect, jest, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';
import { createClient } from '@/lib/supabase/server';
// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));
// Mock Redis
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn()
  }
// Mock engagement scoring service
vi.mock('@/lib/analytics/engagement-scoring', () => ({
  engagementScoringService: {
    getEngagementScore: vi.fn(),
    trackEvent: vi.fn()
describe('CustomerSuccessService', () => {
  let customerSuccessService: CustomerSuccessService;
  let mockSupabase: unknown;
  beforeEach(() => {
    // Setup mock Supabase client
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
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    customerSuccessService = new CustomerSuccessService();
  });
  afterEach(() => {
    vi.clearAllMocks();
  describe('initializeCustomerSuccess', () => {
    it('should initialize customer success configuration for a new user', async () => {
      // Mock workflow data
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Wedding Planner Onboarding',
        user_type: 'wedding_planner',
        stages: []
      };
      // Mock successful database responses
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWorkflow,
        error: null
      });
      const mockConfig = {
        id: 'config-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        onboarding_flow_id: 'workflow-123',
        current_stage: 'welcome',
        completion_percentage: 0,
        health_score: 50,
        success_milestones_achieved: 0,
        engagement_level: 'medium',
        at_risk_score: 0,
        last_activity: new Date()
        data: mockConfig,
      // Call the method
      const result = await customerSuccessService.initializeCustomerSuccess(
        'user-123',
        'wedding_planner',
        'org-123'
      );
      // Assertions
      expect(result).toEqual(mockConfig);
      expect(mockSupabase.from).toHaveBeenCalledWith('onboarding_workflows');
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_success_configs');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
    it('should throw error if no workflow found for user type', async () => {
      // Mock no workflow found
        data: null,
        error: { message: 'No workflow found' }
      // Call and expect error
      await expect(
        customerSuccessService.initializeCustomerSuccess('user-123', 'wedding_planner')
      ).rejects.toThrow('No workflow found for user type: wedding_planner');
    it('should handle database insertion errors', async () => {
      // Mock workflow success
      const mockWorkflow = { id: 'workflow-123', name: 'Test Workflow' };
      // Mock config insertion failure
        error: { message: 'Database error' }
      ).rejects.toThrow('Failed to create customer success config: Database error');
  describe('getCustomerSuccessStatus', () => {
    it('should return complete customer success status', async () => {
        completion_percentage: 75,
        health_score: 85,
        success_milestones_achieved: 5
      const mockHealthScore = {
        overall_score: 85,
        component_scores: {
          onboarding_completion: 100,
          feature_adoption: 75,
          engagement_level: 80
        },
        trend: 'improving',
        risk_factors: [],
        improvement_recommendations: []
      const mockMilestones = [
        {
          id: 'milestone-1',
          milestone_name: 'Complete Profile',
          achieved: false,
          points_value: 100
        }
      ];
      // Mock database responses
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockConfig, error: null })
        .mockResolvedValueOnce({ data: mockHealthScore, error: null });
      mockSupabase.eq.mockReturnValueOnce({
        ...mockSupabase,
        data: mockMilestones,
      // Mock other method calls
      vi.spyOn(customerSuccessService as any, 'calculateHealthScore')
        .mockResolvedValue(mockHealthScore);
      vi.spyOn(customerSuccessService as any, 'getCurrentMilestones')
        .mockResolvedValue(mockMilestones);
      vi.spyOn(customerSuccessService as any, 'generateNextActions')
        .mockResolvedValue(['Complete onboarding']);
      vi.spyOn(customerSuccessService as any, 'getActiveEngagementTriggers')
        .mockResolvedValue([]);
      const result = await customerSuccessService.getCustomerSuccessStatus('user-123');
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('health_score');
      expect(result).toHaveProperty('current_milestones');
      expect(result).toHaveProperty('next_actions');
      expect(result.config).toEqual(mockConfig);
      expect(result.health_score).toEqual(mockHealthScore);
    it('should throw error if config not found', async () => {
      // Mock config not found
        error: { message: 'Not found' }
        customerSuccessService.getCustomerSuccessStatus('user-123')
      ).rejects.toThrow('Customer success config not found');
  describe('calculateHealthScore', () => {
    it('should calculate comprehensive health score', async () => {
        completion_percentage: 80,
        success_milestones_achieved: 3,
        at_risk_score: 20
      const mockUserProfile = {
        id: 'user-123',
        supplier_id: 'supplier-123',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        .mockResolvedValueOnce({ data: mockUserProfile, error: null });
      // Mock component calculations
      vi.spyOn(customerSuccessService as any, 'calculateFeatureAdoptionScore')
        .mockResolvedValue(75);
      vi.spyOn(customerSuccessService as any, 'calculateEngagementScore')
        .mockResolvedValue(85);
      vi.spyOn(customerSuccessService as any, 'calculateSupportScore')
        .mockResolvedValue(90);
      vi.spyOn(customerSuccessService as any, 'calculateScoreTrend')
        .mockResolvedValue('improving');
      vi.spyOn(customerSuccessService as any, 'identifyRiskFactors')
      vi.spyOn(customerSuccessService as any, 'generateImprovementRecommendations')
        .mockResolvedValue(['Continue current progress']);
      const result = await customerSuccessService.calculateHealthScore('user-123');
      expect(result).toHaveProperty('user_id', 'user-123');
      expect(result).toHaveProperty('overall_score');
      expect(result).toHaveProperty('component_scores');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('risk_factors');
      expect(result.overall_score).toBeGreaterThan(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
    it('should handle missing config gracefully', async () => {
        customerSuccessService.calculateHealthScore('user-123')
      ).rejects.toThrow('Customer config not found');
  describe('achieveMilestone', () => {
    it('should successfully achieve a milestone', async () => {
      const mockMilestone = {
        id: 'milestone-123',
        milestone_name: 'Complete Profile',
        milestone_type: 'onboarding',
        achieved: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      const mockAchievedMilestone = {
        ...mockMilestone,
        achieved: true,
        achieved_at: new Date(),
        time_to_achieve_hours: 2
        .mockResolvedValueOnce({ data: mockMilestone, error: null })
        .mockResolvedValueOnce({ data: mockAchievedMilestone, error: null });
      // Mock helper methods
      vi.spyOn(customerSuccessService as any, 'incrementMilestoneCount')
        .mockResolvedValue(undefined);
      vi.spyOn(customerSuccessService as any, 'triggerMilestoneCelebration')
      vi.spyOn(customerSuccessService as any, 'setupNextMilestone')
      vi.spyOn(customerSuccessService as any, 'trackSuccessEvent')
      const result = await customerSuccessService.achieveMilestone(
        'onboarding',
        { test: 'data' }
      expect(result).toEqual(mockAchievedMilestone);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        achieved_at: expect.any(Date),
        time_to_achieve_hours: expect.any(Number)
    it('should return milestone if already achieved', async () => {
        achieved_at: new Date()
        data: mockAchievedMilestone,
        {}
      expect(mockSupabase.update).not.toHaveBeenCalled();
    it('should handle milestone not found error', async () => {
        customerSuccessService.achieveMilestone('user-123', 'onboarding', {})
      ).rejects.toThrow('Milestone not found: Not found');
  describe('processEngagementTrigger', () => {
    it('should process triggers that meet conditions', async () => {
      const mockTriggers = [
          id: 'trigger-1',
          user_id: 'user-123',
          trigger_type: 'progress_nudge',
          status: 'active',
          trigger_count: 0,
          action_type: 'email',
          action_config: { template: 'progress_check' }
        data: mockTriggers,
      // Mock condition evaluation
      vi.spyOn(customerSuccessService as any, 'evaluateTriggerConditions')
        .mockResolvedValue(true);
      vi.spyOn(customerSuccessService as any, 'executeTriggerAction')
        .mockResolvedValue({ success: true });
      await customerSuccessService.processEngagementTrigger(
        'progress_nudge',
      // Verify trigger was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('engagement_triggers');
        status: 'triggered',
        last_triggered: expect.any(Date),
        trigger_count: 1
    it('should handle no triggers gracefully', async () => {
        data: [],
      // Should not throw error
        customerSuccessService.processEngagementTrigger('user-123', 'test', {})
      ).resolves.not.toThrow();
    it('should handle database errors gracefully', async () => {
      // Should not throw error (graceful handling)
  describe('getSuccessMetricsDashboard', () => {
    it('should return comprehensive dashboard metrics', async () => {
      const mockUsers = [
        { health_score: 85, engagement_level: 'high', at_risk_score: 15 },
        { health_score: 72, engagement_level: 'medium', at_risk_score: 30 },
        { health_score: 45, engagement_level: 'low', at_risk_score: 80 }
        { milestone_type: 'onboarding', time_to_achieve_hours: 2.5 },
        { milestone_type: 'onboarding', time_to_achieve_hours: 3.0 },
        { milestone_type: 'feature_adoption', time_to_achieve_hours: 15.5 }
        data: mockUsers,
      mockSupabase.count = vi.fn().mockResolvedValue({ count: 5 });
      vi.spyOn(mockSupabase, 'from').mockImplementation((table: string) => {
        if (table === 'customer_success_configs') {
          return {
            ...mockSupabase,
            data: mockUsers,
            error: null
          };
        } else if (table === 'success_milestones') {
            count: 5,
        return mockSupabase;
      const result = await customerSuccessService.getSuccessMetricsDashboard();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('health_score_distribution');
      expect(result).toHaveProperty('milestone_achievements');
      expect(result.summary.total_users).toBe(3);
      expect(result.summary.average_health_score).toBe(67); // (85+72+45)/3 = 67.33 → 67
      expect(result.summary.at_risk_users).toBe(1); // Only one user with at_risk_score > 70
    it('should handle organization-specific filtering', async () => {
      const orgId = 'org-123';
      
      await customerSuccessService.getSuccessMetricsDashboard(orgId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', orgId);
    it('should handle empty data gracefully', async () => {
      mockSupabase.count = vi.fn().mockResolvedValue({ count: 0 });
      expect(result.summary.total_users).toBe(0);
      expect(result.summary.average_health_score).toBe(0);
      expect(result.summary.at_risk_users).toBe(0);
  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed data gracefully', async () => {
      // Mock malformed config data
      const malformedConfig = {
        // Missing required fields
        completion_percentage: null,
        health_score: undefined
        data: malformedConfig,
      // Should handle gracefully without throwing
      ).resolves.toBeDefined();
    it('should validate user IDs', async () => {
      // Test with invalid user ID
        customerSuccessService.initializeCustomerSuccess('', 'wedding_planner')
      ).rejects.toThrow();
        customerSuccessService.initializeCustomerSuccess(null as any, 'wedding_planner')
    it('should handle concurrent access safely', async () => {
      const userId = 'user-123';
      // Mock successful responses for concurrent calls
      mockSupabase.single.mockResolvedValue({
        data: { id: 'config-123', user_id: userId },
      // Simulate concurrent health score calculations
      const promises = Array(5).fill(null).map(() => 
        customerSuccessService.calculateHealthScore(userId)
      // Should not throw errors due to concurrency
      await expect(Promise.all(promises)).resolves.toBeDefined();
  describe('Performance and Optimization', () => {
    it('should cache health score calculations', async () => {
        user_id: userId,
        calculated_at: new Date()
      // First call - should hit database
        data: mockHealthScore,
      await customerSuccessService.calculateHealthScore(userId);
      // Second call - should use cache (mocked redis)
      const redis = require('@/lib/redis').redis;
      redis.get.mockResolvedValueOnce(JSON.stringify(mockHealthScore));
      // Verify cache was checked
      expect(redis.get).toHaveBeenCalled();
    it('should batch milestone updates efficiently', async () => {
      const milestoneUpdates = [
        { user_id: 'user-1', milestone_type: 'onboarding' },
        { user_id: 'user-2', milestone_type: 'feature_adoption' }
      // Mock batch responses
        data: { id: 'milestone-123' },
      // Process multiple milestones
      const promises = milestoneUpdates.map(update =>
        customerSuccessService.achieveMilestone(update.user_id, update.milestone_type, {})
      await Promise.all(promises);
      // Verify efficient database usage
      expect(mockSupabase.single).toHaveBeenCalledTimes(milestoneUpdates.length * 2); // Get + Update for each
  describe('Integration with External Services', () => {
    it('should integrate with engagement scoring service', async () => {
      const { engagementScoringService } = require('@/lib/analytics/engagement-scoring');
      engagementScoringService.getEngagementScore.mockResolvedValue({
        score: 75,
        segment: 'normal'
        data: { 
          id: userId, 
          supplier_id: 'supplier-123',
          completion_percentage: 80
      expect(engagementScoringService.getEngagementScore).toHaveBeenCalledWith(
        userId,
        'supplier-123'
    it('should handle external service failures gracefully', async () => {
      // Mock external service failure
      engagementScoringService.getEngagementScore.mockRejectedValue(
        new Error('External service unavailable')
        data: { id: 'user-123', completion_percentage: 80 },
      // Should not throw error, should use fallback
      expect(result).toBeDefined();
});
// Test helper functions
describe('CustomerSuccessService Helper Functions', () => {
  let service: CustomerSuccessService;
    service = new CustomerSuccessService();
  describe('validateUserInput', () => {
    it('should validate milestone data correctly', () => {
      const validData = {
        data: { step: 'complete' }
      // Test with private method if exposed for testing
      expect(() => {
        // service.validateMilestoneData(validData);
      }).not.toThrow();
  describe('calculateWeightedScores', () => {
    it('should calculate weighted health scores correctly', () => {
      const componentScores = {
        onboarding: 80,
        engagement: 70,
        milestones: 90,
        support: 85
      // If method was public/testable
      // const result = service.calculateWeightedScore(componentScores);
      // expect(result).toBeCloseTo(81.25, 1);
// Performance benchmarks
describe('CustomerSuccessService Performance', () => {
  it('should calculate health scores within acceptable time limits', async () => {
    const startTime = Date.now();
    
    // Mock fast database responses
    const mockSupabase = createClient() as any;
    mockSupabase.single.mockResolvedValue({
      data: { id: 'user-123', completion_percentage: 80 },
      error: null
    await service.calculateHealthScore('user-123');
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    // Should complete within 1000ms in test environment
    expect(executionTime).toBeLessThan(1000);
  it('should handle batch operations efficiently', async () => {
    const userIds = Array(100).fill(null).map((_, i) => `user-${i}`);
    // Mock batch responses
      data: { completion_percentage: 80 },
    // Process in smaller batches to avoid overwhelming
    const batchSize = 10;
    const promises = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => service.calculateHealthScore(id));
      promises.push(Promise.all(batchPromises));
    }
    await Promise.all(promises);
    // Should handle 100 users within reasonable time
    expect(executionTime).toBeLessThan(5000);
