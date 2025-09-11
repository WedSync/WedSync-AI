/**
 * WS-132 Trial Management System - Unit Tests
 * Comprehensive test suite for TrialService business logic
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { TrialService } from '@/lib/trial/TrialService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { 
  TrialConfig, 
  TrialOnboardingData, 
  MilestoneType,
  TrialStatus 
} from '@/types/trial';
// Create a more robust mock that handles complex chaining
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  rpc: vi.fn().mockReturnThis()
};
// Mock Supabase client that returns the same builder
const mockSupabase = {
  from: vi.fn().mockReturnValue(mockQueryBuilder),
  rpc: vi.fn().mockReturnValue(mockQueryBuilder),
  ...mockQueryBuilder
// Mock SubscriptionService
const mockSubscriptionService = {
  getUserSubscription: vi.fn(),
  getPlanByName: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn()
} as unknown as SubscriptionService;
describe('TrialService', () => {
  let trialService: TrialService;
  let mockUserId: string;
  let mockTrialData: TrialConfig;
  let mockOnboardingData: TrialOnboardingData;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset queryBuilder methods to return this for chaining
    Object.keys(mockQueryBuilder).forEach(key => {
      if (key !== 'single' && key !== 'rpc' && mockQueryBuilder[key].mockReturnThis) {
        mockQueryBuilder[key].mockReturnThis();
      }
    });
    trialService = new TrialService(mockSupabase as any, mockSubscriptionService);
    mockUserId = 'user-123';
    mockTrialData = {
      id: 'trial-123',
      user_id: mockUserId,
      business_type: 'wedding_planner',
      business_goals: ['save_time', 'grow_business'],
      current_workflow_pain_points: ['manual_tasks', 'communication'],
      expected_time_savings_hours: 10,
      hourly_rate: 75,
      trial_start: new Date('2025-01-01'),
      trial_end: new Date('2025-01-31'),
      status: 'active',
      onboarding_completed: true,
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01')
    };
    mockOnboardingData = {
      business_name: 'Dream Weddings',
      primary_goals: ['save_time', 'grow_business'],
      current_challenges: ['manual_tasks', 'communication'],
      weekly_time_spent_hours: 40,
      estimated_hourly_value: 75,
      team_size: 3,
      current_client_count: 15,
      growth_goals: 'Scale to 50 weddings per year'
  });
  describe('startTrial', () => {
    it('should successfully start a new trial', async () => {
      // Arrange
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // No existing trial
      mockSubscriptionService.getUserSubscription = vi.fn().mockResolvedValue(null); // No existing subscription
      mockSubscriptionService.getPlanByName = vi.fn().mockResolvedValue({
        id: 'plan-123',
        stripe_price_id: 'price_123',
        name: 'professional'
      });
      mockSubscriptionService.createSubscription = vi.fn().mockResolvedValue({
        subscription: { id: 'sub_123' }
      
      mockQueryBuilder.single.mockResolvedValueOnce({ data: mockTrialData, error: null });
      // Act
      const result = await trialService.startTrial(mockUserId, 'professional', mockOnboardingData);
      // Assert
      expect(result.success).toBe(true);
      expect(result.trial_id).toBe(mockTrialData.id);
      expect(result.onboarding_required).toBe(false);
      expect(result.next_steps).toHaveLength(4);
      expect(mockSubscriptionService.createSubscription).toHaveBeenCalledWith({
        userId: mockUserId,
        priceId: 'price_123',
        trialPeriodDays: 30
    it('should prevent starting trial if user already has active trial', async () => {
      // Act & Assert
      await expect(
        trialService.startTrial(mockUserId, 'professional', mockOnboardingData)
      ).rejects.toThrow('User already has an active trial');
    it('should prevent starting trial if user has active subscription', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // No trial
      mockSubscriptionService.getUserSubscription = vi.fn().mockResolvedValue({
        status: 'active'
      ).rejects.toThrow('User already has an active subscription');
  describe('getActiveTrial', () => {
    it('should return active trial for user', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: mockTrialData, error: null });
      const result = await trialService.getActiveTrial(mockUserId);
      expect(result).toEqual(mockTrialData);
      expect(mockSupabase.from).toHaveBeenCalledWith('trial_configs');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
    it('should return null if no active trial found', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      expect(result).toBeNull();
    it('should throw error for database errors', async () => {
      mockQueryBuilder.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST500', message: 'Database error' } 
      await expect(trialService.getActiveTrial(mockUserId)).rejects.toThrow('Failed to fetch trial: Database error');
  describe('trackFeatureUsage', () => {
    it('should track feature usage for active trial', async () => {
      mockQueryBuilder.upsert.mockResolvedValue({ data: null, error: null });
      mockQueryBuilder.rpc.mockResolvedValue({ data: null, error: null });
      await trialService.trackFeatureUsage(
        mockUserId, 
        'client_onboarding', 
        'Client Onboarding',
        30,
        { client_id: 'client-123' }
      );
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_id: mockTrialData.id,
          feature_key: 'client_onboarding',
          feature_name: 'Client Onboarding',
          time_saved_minutes: 30
        }),
        { onConflict: 'trial_id,feature_key', ignoreDuplicates: false }
      expect(mockQueryBuilder.rpc).toHaveBeenCalledWith('increment_feature_usage', {
        p_trial_id: mockTrialData.id,
        p_feature_key: 'client_onboarding',
        p_time_saved: 30
    it('should handle no active trial gracefully', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      // Act - should not throw
        30
      expect(mockQueryBuilder.upsert).not.toHaveBeenCalled();
  describe('achieveMilestone', () => {
    it('should achieve milestone successfully', async () => {
      const mockMilestone = {
        id: 'milestone-123',
        trial_id: mockTrialData.id,
        milestone_type: 'first_client_connected' as MilestoneType,
        achieved: false
      };
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockTrialData, error: null }) // getActiveTrial
        .mockResolvedValueOnce({ data: mockMilestone, error: null }) // get milestone
        .mockResolvedValueOnce({ 
          data: { ...mockMilestone, achieved: true, achieved_at: new Date() }, 
          error: null 
        }); // update milestone
      const result = await trialService.achieveMilestone(
        mockUserId,
        'first_client_connected'
      expect(result.achieved).toBe(true);
      expect(result.achieved_at).toBeDefined();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
          achieved: true,
          achieved_at: expect.any(Date),
          time_to_achieve_hours: expect.any(Number)
        })
    it('should return existing milestone if already achieved', async () => {
      const achievedMilestone = {
        achieved: true,
        achieved_at: new Date('2025-01-15')
        .mockResolvedValueOnce({ data: mockTrialData, error: null })
        .mockResolvedValueOnce({ data: achievedMilestone, error: null });
      expect(result).toEqual(achievedMilestone);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    it('should throw error if no active trial', async () => {
        trialService.achieveMilestone(mockUserId, 'first_client_connected')
      ).rejects.toThrow('No active trial found');
  describe('convertTrial', () => {
    it('should convert trial to paid subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripe_subscription_id: 'sub_stripe_123',
        status: 'trialing',
        plan_id: 'plan-123',
        current_period_end: '2025-02-01'
      mockSubscriptionService.getUserSubscription = vi.fn().mockResolvedValue(mockSubscription);
      mockSubscriptionService.updateSubscription = vi.fn().mockResolvedValue({ status: 'active' });
      mockSubscriptionService.getPlan = vi.fn().mockResolvedValue({
        display_name: 'Professional',
        price: 49
      mockQueryBuilder.update.mockResolvedValue({ data: null, error: null });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });
      const result = await trialService.convertTrial(mockUserId, 'pm_123');
      expect(result.subscription_id).toBe(mockSubscription.id);
      expect(result.plan_name).toBe('Professional');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'converted',
        updated_at: expect.any(Date)
        trialService.convertTrial(mockUserId, 'pm_123')
    it('should throw error if no trialing subscription', async () => {
        status: 'active' // Not trialing
      ).rejects.toThrow('No trialing subscription found');
  describe('cancelTrial', () => {
    it('should cancel trial successfully', async () => {
        stripe_subscription_id: 'sub_123',
        status: 'trialing'
      mockSubscriptionService.cancelSubscription = vi.fn().mockResolvedValue({});
      await trialService.cancelTrial(mockUserId, 'Not the right fit');
      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith('sub_123', false);
        status: 'cancelled',
    it('should handle cancellation without subscription', async () => {
      mockSubscriptionService.getUserSubscription = vi.fn().mockResolvedValue(null);
      await trialService.cancelTrial(mockUserId);
  describe('ROI Calculation', () => {
    it('should calculate ROI metrics correctly', async () => {
      // This tests the private calculateROI method through getTrialStatus
      // Arrange - create trial with feature usage and milestones
      const mockFeatureUsage = [
        { time_saved_minutes: 120, usage_count: 4 }, // 2 hours saved
        { time_saved_minutes: 90, usage_count: 3 }   // 1.5 hours saved
      ];
      const mockMilestones = [
        { achieved: true, value_impact_score: 8 },
        { achieved: true, value_impact_score: 9 },
        { achieved: false, value_impact_score: 7 }
      mockQueryBuilder.single.mockResolvedValueOnce({ data: mockTrialData, error: null }); // for calculateTrialProgress
      mockQueryBuilder.select.mockResolvedValueOnce({ data: mockMilestones, error: null });
      mockQueryBuilder.select.mockResolvedValueOnce({ data: mockFeatureUsage, error: null });
      mockQueryBuilder.select.mockResolvedValueOnce({ data: mockMilestones.filter(m => m.achieved), error: null });
      mockQueryBuilder.eq.mockResolvedValue({ data: mockMilestones, error: null });
      const result = await trialService.getTrialStatus(mockUserId);
      expect(result.progress.roi_metrics.total_time_saved_hours).toBe(3.5); // 2 + 1.5 hours
      expect(result.progress.roi_metrics.estimated_cost_savings).toBe(262.5); // 3.5 * 75
      expect(result.progress.roi_metrics.milestones_achieved_count).toBe(2);
      expect(result.progress.roi_metrics.features_adopted_count).toBe(2);
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
        error: { message: 'Connection failed', code: 'PGRST500' } 
      await expect(trialService.getActiveTrial(mockUserId)).rejects.toThrow('Failed to fetch trial: Connection failed');
    it('should handle missing plan errors', async () => {
      // Mock successful trial creation to reach the plan lookup
      mockQueryBuilder.single.mockResolvedValueOnce({ data: { id: 'trial-123', ...mockTrialData }, error: null });
      mockSubscriptionService.getPlanByName = vi.fn().mockResolvedValue(null);
      ).rejects.toThrow('Plan professional not found');
});
describe('TrialService Integration Tests', () => {
  // These would test actual database operations in a test environment
  // Skipped for now but would be important for full test coverage
  
  it.skip('should handle full trial lifecycle', async () => {
    // Test full lifecycle: start -> track usage -> achieve milestones -> convert
  it.skip('should handle trial expiration correctly', async () => {
    // Test automatic trial expiration
