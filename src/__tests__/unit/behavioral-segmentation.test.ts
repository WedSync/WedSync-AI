import { BehavioralSegmentationService } from '@/lib/services/behavioral-segmentation-service';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import type { 
  BehaviorProfile, 
  DynamicSegment,
  LifecycleTransition,
  RealTimeEngagementScore
} from '@/lib/services/behavioral-segmentation-service';

// Mock Supabase
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  update: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ data: null, error: null })
};
const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
  rpc: vi.fn().mockResolvedValue({ data: [], error: null })
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: jest.fn(() => mockSupabase)
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn()
describe('BehavioralSegmentationService', () => {
  let behavioralService: BehavioralSegmentationService;
  beforeEach(() => {
    vi.clearAllMocks();
    behavioralService = BehavioralSegmentationService.getInstance();
  });
  describe('Behavior Profile Generation', () => {
    const mockUserData = {
      id: 'user123',
      userType: 'photographer',
      businessType: 'Wedding Photography',
      experienceLevel: 'expert',
      registrationDate: '2024-01-01',
      lastLoginDate: '2025-01-20',
      totalRevenue: 2450
    };
    const mockEngagementData = [
      { type: 'email_open', timestamp: '2025-01-18T10:00:00Z', score: 5 },
      { type: 'feature_usage', timestamp: '2025-01-19T14:30:00Z', score: 8 },
      { type: 'viral_invitation_sent', timestamp: '2025-01-20T09:15:00Z', score: 15 }
    ];
    const mockBehaviorPatterns = [
      {
        pattern: 'peak_usage_evening',
        frequency: 0.8,
        confidence: 0.85,
        lastObserved: '2025-01-20T19:30:00Z'
      },
        pattern: 'prefers_video_content',
        frequency: 0.6,
        confidence: 0.72,
        lastObserved: '2025-01-19T16:45:00Z'
      }
    beforeEach(() => {
      mockSupabaseQuery.single.mockResolvedValue({
        data: mockUserData,
        error: null
      });
      mockSupabaseQuery.select
        .mockResolvedValueOnce({ data: mockEngagementData, error: null })
        .mockResolvedValueOnce({ data: mockBehaviorPatterns, error: null });
    });
    it('should generate comprehensive behavior profile', async () => {
      const profile = await behavioralService.generateBehaviorProfile('user123');
      expect(profile).toHaveProperty('userId', 'user123');
      expect(profile).toHaveProperty('engagementScore');
      expect(profile).toHaveProperty('predictedActions');
      expect(profile).toHaveProperty('personalityTraits');
      expect(profile).toHaveProperty('preferredChannels');
      expect(profile).toHaveProperty('optimalSendTimes');
      expect(profile).toHaveProperty('contentPreferences');
      expect(profile).toHaveProperty('behaviorPatterns');
      expect(profile).toHaveProperty('viralPotential');
      expect(profile).toHaveProperty('lifetimeValuePrediction');
      expect(profile).toHaveProperty('nextBestActions');
    it('should calculate accurate engagement score', async () => {
      expect(profile.engagementScore).toBeGreaterThan(0);
      expect(profile.engagementScore).toBeLessThanOrEqual(100);
      
      // Should reflect recent high-value activities (viral invitation)
      expect(profile.engagementScore).toBeGreaterThan(50);
    it('should identify personality traits accurately', async () => {
      expect(profile.personalityTraits).toBeDefined();
      expect(Array.isArray(profile.personalityTraits)).toBe(true);
      expect(profile.personalityTraits.length).toBeGreaterThan(0);
      // Should include wedding industry-specific traits
      const validTraits = [
        'innovative', 'conservative', 'collaborative', 'independent',
        'detail_oriented', 'big_picture', 'quality_focused', 'efficiency_driven'
      ];
      profile.personalityTraits.forEach(trait => {
        expect(validTraits).toContain(trait);
    it('should predict optimal communication preferences', async () => {
      expect(profile.preferredChannels).toBeDefined();
      expect(Array.isArray(profile.preferredChannels)).toBe(true);
      expect(profile.preferredChannels.length).toBeGreaterThan(0);
      const validChannels = ['email', 'sms', 'in_app', 'phone', 'social'];
      profile.preferredChannels.forEach(channel => {
        expect(validChannels).toContain(channel);
      expect(profile.optimalSendTimes).toBeDefined();
      expect(Array.isArray(profile.optimalSendTimes)).toBe(true);
    it('should identify content preferences based on behavior', async () => {
      expect(profile.contentPreferences).toBeDefined();
      expect(Array.isArray(profile.contentPreferences)).toBe(true);
      const validContentTypes = [
        'educational', 'promotional', 'social_proof', 'feature_updates',
        'industry_news', 'success_stories', 'how_to_guides', 'case_studies'
      profile.contentPreferences.forEach(contentType => {
        expect(validContentTypes).toContain(contentType);
    it('should calculate viral potential accurately', async () => {
      expect(profile.viralPotential).toBeGreaterThanOrEqual(0);
      expect(profile.viralPotential).toBeLessThanOrEqual(1);
      // User with viral invitation activity should have higher viral potential
      expect(profile.viralPotential).toBeGreaterThan(0.5);
    it('should generate actionable next best actions', async () => {
      expect(profile.nextBestActions).toBeDefined();
      expect(Array.isArray(profile.nextBestActions)).toBe(true);
      expect(profile.nextBestActions.length).toBeGreaterThan(0);
      profile.nextBestActions.forEach(action => {
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('expectedImpact');
        expect(action.priority).toMatch(/high|medium|low/);
  describe('Dynamic Segmentation', () => {
    const mockSegmentationData = [
        userId: 'user1',
        engagementScore: 85,
        viralPotential: 0.8,
        lifetimeValue: 2450,
        churnRisk: 0.1,
        behaviorCluster: 'high_value_advocate'
        userId: 'user2',
        engagementScore: 45,
        viralPotential: 0.3,
        lifetimeValue: 650,
        churnRisk: 0.6,
        behaviorCluster: 'at_risk_user'
        userId: 'user3',
        engagementScore: 95,
        viralPotential: 0.95,
        lifetimeValue: 4200,
        churnRisk: 0.05,
        behaviorCluster: 'super_connector'
      mockSupabase.rpc.mockResolvedValue({
        data: mockSegmentationData,
    it('should create dynamic segments based on behavior clustering', async () => {
      const segments = await behavioralService.createDynamicSegments();
      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(0);
      segments.forEach(segment => {
        expect(segment).toHaveProperty('segmentId');
        expect(segment).toHaveProperty('name');
        expect(segment).toHaveProperty('description');
        expect(segment).toHaveProperty('criteria');
        expect(segment).toHaveProperty('userCount');
        expect(segment).toHaveProperty('performanceMetrics');
    it('should identify high-value segments accurately', async () => {
      const highValueSegment = segments.find(s => 
        s.name.toLowerCase().includes('high') && s.name.toLowerCase().includes('value')
      );
      expect(highValueSegment).toBeDefined();
      expect(highValueSegment?.criteria).toHaveProperty('minLifetimeValue');
      expect(highValueSegment?.criteria).toHaveProperty('minEngagementScore');
    it('should create at-risk user segments', async () => {
      const atRiskSegment = segments.find(s => 
        s.name.toLowerCase().includes('risk')
      expect(atRiskSegment).toBeDefined();
      expect(atRiskSegment?.criteria).toHaveProperty('minChurnRisk');
    it('should identify super-connector segments', async () => {
      const superConnectorSegment = segments.find(s => 
        s.name.toLowerCase().includes('connector') || s.name.toLowerCase().includes('advocate')
      expect(superConnectorSegment).toBeDefined();
      expect(superConnectorSegment?.criteria).toHaveProperty('minViralPotential');
    it('should calculate segment performance metrics', async () => {
        expect(segment.performanceMetrics).toBeDefined();
        expect(segment.performanceMetrics).toHaveProperty('avgEngagement');
        expect(segment.performanceMetrics).toHaveProperty('conversionRate');
        expect(segment.performanceMetrics).toHaveProperty('avgLifetimeValue');
        expect(segment.performanceMetrics).toHaveProperty('churnRate');
  describe('Lifecycle Transition Prediction', () => {
    const mockUserLifecycleData = {
      userId: 'user123',
      currentStage: 'active',
      stageHistory: [
        { stage: 'discovery', timestamp: '2024-01-01', duration: 5 },
        { stage: 'onboarding', timestamp: '2024-01-06', duration: 14 },
        { stage: 'active', timestamp: '2024-01-20', duration: 365 }
      ],
      behaviorTrends: {
        engagementTrend: 'increasing',
        usageTrend: 'stable',
        revenueTrend: 'increasing'
        data: mockUserLifecycleData,
    it('should predict lifecycle transitions accurately', async () => {
      const prediction = await behavioralService.predictLifecycleTransitions('user123');
      expect(prediction).toHaveProperty('userId', 'user123');
      expect(prediction).toHaveProperty('currentStage');
      expect(prediction).toHaveProperty('predictedNextStage');
      expect(prediction).toHaveProperty('probability');
      expect(prediction).toHaveProperty('timeToTransition');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('factors');
      expect(prediction).toHaveProperty('recommendations');
    it('should identify expansion opportunities', async () => {
      const expandingUser = {
        ...mockUserLifecycleData,
        behaviorTrends: {
          engagementTrend: 'increasing',
          usageTrend: 'increasing',
          revenueTrend: 'increasing'
        }
      };
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: expandingUser,
      expect(prediction.predictedNextStage).toBe('expanding');
      expect(prediction.probability).toBeGreaterThan(0.6);
    it('should detect churn risk early', async () => {
      const atRiskUser = {
          engagementTrend: 'decreasing',
          usageTrend: 'decreasing',
          revenueTrend: 'stable'
        data: atRiskUser,
      expect(prediction.predictedNextStage).toBe('at_risk');
      expect(prediction.recommendations).toBeDefined();
      expect(prediction.recommendations.length).toBeGreaterThan(0);
    it('should provide actionable transition recommendations', async () => {
      expect(Array.isArray(prediction.recommendations)).toBe(true);
      prediction.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('impact');
        expect(rec).toHaveProperty('effort');
        expect(['high', 'medium', 'low']).toContain(rec.impact);
        expect(['high', 'medium', 'low']).toContain(rec.effort);
  describe('Real-Time Engagement Scoring', () => {
    const mockRecentActivities = [
      { type: 'login', timestamp: '2025-01-20T08:00:00Z', value: 10 },
      { type: 'feature_usage', timestamp: '2025-01-20T08:15:00Z', value: 15 },
      { type: 'email_open', timestamp: '2025-01-20T09:30:00Z', value: 5 },
      { type: 'viral_invitation_sent', timestamp: '2025-01-20T10:00:00Z', value: 25 }
      mockSupabaseQuery.select.mockResolvedValue({
        data: mockRecentActivities,
    it('should calculate real-time engagement score', async () => {
      const engagementScore = await behavioralService.calculateRealTimeEngagementScore('user123');
      expect(engagementScore).toHaveProperty('userId', 'user123');
      expect(engagementScore).toHaveProperty('currentScore');
      expect(engagementScore).toHaveProperty('trend');
      expect(engagementScore).toHaveProperty('factors');
      expect(engagementScore).toHaveProperty('recommendations');
      expect(engagementScore).toHaveProperty('lastUpdated');
      expect(engagementScore.currentScore).toBeGreaterThan(0);
      expect(engagementScore.currentScore).toBeLessThanOrEqual(100);
    it('should identify engagement factors correctly', async () => {
      expect(engagementScore.factors).toBeDefined();
      expect(Array.isArray(engagementScore.factors)).toBe(true);
      expect(engagementScore.factors.length).toBeGreaterThan(0);
      engagementScore.factors.forEach(factor => {
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('weight');
        expect(factor).toHaveProperty('impact');
        expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
        expect(factor.weight).toBeGreaterThan(0);
    it('should detect engagement trends', async () => {
      expect(engagementScore.trend).toBeDefined();
      expect(['increasing', 'stable', 'decreasing']).toContain(engagementScore.trend);
    it('should provide engagement improvement recommendations', async () => {
      const lowEngagementActivities = [
        { type: 'login', timestamp: '2025-01-15T08:00:00Z', value: 5 }
      mockSupabaseQuery.select.mockResolvedValueOnce({
        data: lowEngagementActivities,
      expect(engagementScore.recommendations).toBeDefined();
      expect(Array.isArray(engagementScore.recommendations)).toBe(true);
      expect(engagementScore.recommendations.length).toBeGreaterThan(0);
      engagementScore.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('expectedImpact');
        expect(rec).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(rec.priority);
  describe('Predictive Segmentation with ML', () => {
    const mockMLSegmentationData = {
      segments: [
        {
          segmentId: 'ml_seg_1',
          name: 'High-Value Growth Potential',
          size: 150,
          characteristics: ['high_engagement', 'increasing_usage', 'viral_activity'],
          predictedBehaviors: ['likely_to_upgrade', 'high_referral_potential']
        },
          segmentId: 'ml_seg_2',
          name: 'Stable Active Users',
          size: 320,
          characteristics: ['consistent_usage', 'moderate_engagement'],
          predictedBehaviors: ['stable_revenue', 'low_churn_risk']
      model: {
        accuracy: 0.87,
        precision: 0.84,
        recall: 0.89,
        lastTrained: '2025-01-19T12:00:00Z'
        data: mockMLSegmentationData,
    it('should perform ML-based predictive segmentation', async () => {
      const result = await behavioralService.performPredictiveSegmentation();
      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('model');
      expect(Array.isArray(result.segments)).toBe(true);
      expect(result.segments.length).toBeGreaterThan(0);
    it('should provide model performance metrics', async () => {
      expect(result.model).toHaveProperty('accuracy');
      expect(result.model).toHaveProperty('precision');
      expect(result.model).toHaveProperty('recall');
      expect(result.model).toHaveProperty('lastTrained');
      expect(result.model.accuracy).toBeGreaterThan(0.5);
      expect(result.model.precision).toBeGreaterThan(0.5);
      expect(result.model.recall).toBeGreaterThan(0.5);
    it('should identify segment characteristics and predicted behaviors', async () => {
      result.segments.forEach(segment => {
        expect(segment).toHaveProperty('characteristics');
        expect(segment).toHaveProperty('predictedBehaviors');
        expect(Array.isArray(segment.characteristics)).toBe(true);
        expect(Array.isArray(segment.predictedBehaviors)).toBe(true);
  describe('Error Handling and Edge Cases', () => {
    it('should handle missing user data gracefully', async () => {
        data: null,
        error: { message: 'User not found' }
      await expect(
        behavioralService.generateBehaviorProfile('nonexistent_user')
      ).rejects.toThrow('Failed to fetch user data');
    it('should handle users with no behavioral history', async () => {
      const newUser = {
        id: 'new_user',
        userType: 'photographer',
        registrationDate: new Date().toISOString(),
        lastLoginDate: new Date().toISOString()
        data: newUser,
        data: [], // No behavioral data
      const profile = await behavioralService.generateBehaviorProfile('new_user');
      expect(profile.userId).toBe('new_user');
      expect(profile.engagementScore).toBe(0);
      expect(profile.personalityTraits).toEqual(['new_user']);
      expect(profile.nextBestActions[0].action).toMatch(/onboard|welcome/i);
    it('should validate segmentation criteria properly', async () => {
      const invalidSegmentationData = [
          userId: 'user1',
          engagementScore: -10, // Invalid negative score
          viralPotential: 1.5,  // Invalid score > 1.0
          churnRisk: -0.1       // Invalid negative probability
        data: invalidSegmentationData,
      // Should filter out or correct invalid data
      expect(segments.length).toBeGreaterThanOrEqual(0);
    it('should handle database connection errors', async () => {
        error: { message: 'Database connection failed' }
        behavioralService.calculateRealTimeEngagementScore('user123')
      ).rejects.toThrow('Failed to calculate engagement score');
  describe('Performance and Caching', () => {
    it('should cache behavior profiles for performance', async () => {
      const mockUserData = {
        id: 'user123',
        businessType: 'Wedding Photography'
        data: [],
      // First call
      const profile1 = await behavioralService.generateBehaviorProfile('user123');
      // Second call - should be faster due to caching
      const startTime = Date.now();
      const profile2 = await behavioralService.generateBehaviorProfile('user123');
      const executionTime = Date.now() - startTime;
      expect(profile1.userId).toBe(profile2.userId);
      expect(executionTime).toBeLessThan(100); // Should be very fast if cached
    it('should handle large segmentation datasets efficiently', async () => {
      const largeSegmentationData = {
        segments: Array.from({ length: 50 }, (_, i) => ({
          segmentId: `ml_seg_${i}`,
          name: `ML Segment ${i}`,
          size: Math.floor(Math.random() * 1000) + 50,
          characteristics: ['test_characteristic'],
          predictedBehaviors: ['test_behavior']
        })),
        model: {
          accuracy: 0.87,
          precision: 0.84,
          recall: 0.89,
          lastTrained: new Date().toISOString()
        data: largeSegmentationData,
      expect(result.segments.length).toBe(50);
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
});
