/**
 * WS-130 Round 3: Photography AI Coordinator Unit Tests
 * Tests the master orchestration service coordinating all team integrations
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { PhotographyAICoordinator } from '@/lib/integrations/photography-ai-coordinator';
import { MoodBoardService } from '@/lib/ai/photography/mood-board-service';
import { MusicAIService } from '@/lib/services/music-ai-service';
import { FloralAIService } from '@/lib/ml/floral-ai-service';
import { FeatureGateService } from '@/lib/billing/featureGating';
import { TrialService } from '@/lib/trial/TrialService';
import { photographyCache } from '@/lib/cache/photography-cache';
import { photographyRateLimiter } from '@/lib/ratelimit/photography-rate-limiter';
// Mock all dependencies
vi.mock('@/lib/ai/photography/mood-board-service');
vi.mock('@/lib/services/music-ai-service');
vi.mock('@/lib/ml/floral-ai-service');
vi.mock('@/lib/billing/featureGating');
vi.mock('@/lib/trial/TrialService');
vi.mock('@/lib/cache/photography-cache');
vi.mock('@/lib/ratelimit/photography-rate-limiter');
const mockMoodBoardService = MoodBoardService as ReturnType<typeof vi.fn>edClass<typeof MoodBoardService>;
const mockMusicAIService = MusicAIService as ReturnType<typeof vi.fn>edClass<typeof MusicAIService>;
const mockFloralAIService = FloralAIService as ReturnType<typeof vi.fn>edClass<typeof FloralAIService>;
const mockFeatureGateService = FeatureGateService as ReturnType<typeof vi.fn>edClass<typeof FeatureGateService>;
const mockTrialService = TrialService as ReturnType<typeof vi.fn>edClass<typeof TrialService>;
const mockRequest = {
  client_id: 'test-client-123',
  user_id: 'test-user-123',
  wedding_style: 'romantic',
  preferred_colors: ['#F5F5DC', '#8B4513', '#228B22'],
  wedding_date: new Date('2024-06-15T18:00:00Z'),
  mood_board_images: [
    'https://example.com/wedding1.jpg',
    'https://example.com/wedding2.jpg'
  ],
  budget_range: {
    min: 2000,
    max: 5000
  },
  integration_preferences: {
    sync_with_music: true,
    sync_with_floral: true,
    track_usage: true
  }
};
describe('PhotographyAICoordinator', () => {
  let coordinator: PhotographyAICoordinator;
  beforeEach(() => {
    vi.clearAllMocks();
    coordinator = new PhotographyAICoordinator();
    // Setup default mocks
    (photographyRateLimiter.checkLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      remaining: 99
    });
    (photographyCache.getCachedMoodBoard as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });
  afterEach(() => {
  describe('analyzeWithFullIntegration', () => {
    test('should orchestrate all team integrations successfully', async () => {
      // Mock all service responses
      const mockMoodBoardResponse = {
        mood_board_id: 'mood-123',
        dominant_colors: ['#F5F5DC', '#8B4513'],
        style_analysis: {
          primary_style: 'romantic',
          secondary_styles: ['vintage'],
          confidence_score: 0.92
        },
        recommendations: [
          {
            type: 'color_palette',
            suggestion: 'Add sage green accents',
            confidence: 0.87
          }
        ]
      };
      const mockMusicResponse = {
        style_match_score: 0.89,
        recommended_tracks: [
            track_name: 'Perfect by Ed Sheeran',
            style_compatibility: 0.91,
            moment: 'first_dance'
      const mockFloralResponse = {
        color_harmony_score: 0.94,
        recommended_flowers: [
            flower_type: 'Garden Roses',
            color: '#F5F5DC',
            harmony_score: 0.96
      const mockPricingInsights = {
        estimated_cost: 3500,
        feature_accessibility: 'premium_tier',
        usage_impact: 'moderate'
      const mockTrialMetrics = {
        usage_count: 1,
        remaining_uses: 99,
        roi_prediction: 0.78,
        conversion_likelihood: 0.65
      // Setup mocks
      mockMoodBoardService.prototype.generateMoodBoard = vi.fn().mockResolvedValue(mockMoodBoardResponse);
      mockMusicAIService.prototype.analyzeStyleConsistency = vi.fn().mockResolvedValue(mockMusicResponse);
      mockFloralAIService.prototype.analyzeColorHarmony = vi.fn().mockResolvedValue(mockFloralResponse);
      mockFeatureGateService.calculatePricingInsights = vi.fn().mockResolvedValue(mockPricingInsights);
      mockTrialService.prototype.trackUsageAndAnalyze = vi.fn().mockResolvedValue(mockTrialMetrics);
      // Execute
      const result = await coordinator.analyzeWithFullIntegration(mockRequest);
      // Verify all services were called
      expect(mockMoodBoardService.prototype.generateMoodBoard).toHaveBeenCalledWith({
        client_id: mockRequest.client_id,
        wedding_style: mockRequest.wedding_style,
        color_preferences: mockRequest.preferred_colors,
        inspiration_images: mockRequest.mood_board_images,
        budget_range: mockRequest.budget_range
      });
      expect(mockMusicAIService.prototype.analyzeStyleConsistency).toHaveBeenCalledWith({
        photography_colors: mockMoodBoardResponse.dominant_colors,
        wedding_date: mockRequest.wedding_date
      expect(mockFloralAIService.prototype.analyzeColorHarmony).toHaveBeenCalledWith({
        photo_colors: mockMoodBoardResponse.dominant_colors,
        preferred_colors: mockRequest.preferred_colors,
        subscriptionId: expect.any(String),
        organizationId: expect.any(String)
      // Verify integration scores are calculated
      expect(result.integration_metrics.overall_coherence_score).toBeGreaterThan(0.8);
      expect(result.integration_metrics.teams_integrated).toEqual([
        'music_ai', 'floral_ai', 'pricing', 'trials'
      ]);
      // Verify all team outputs are included
      expect(result.photography_analysis).toEqual(mockMoodBoardResponse);
      expect(result.style_consistency.team_a_integration_score).toBeGreaterThan(0.8);
      expect(result.color_harmony.team_b_integration_score).toBeGreaterThan(0.8);
      expect(result.pricing_insights.team_d_integration_score).toBeGreaterThan(0.8);
      expect(result.trial_metrics.team_e_integration_score).toBeGreaterThan(0.8);
    test('should handle partial integration when some services are disabled', async () => {
      const requestWithoutMusic = {
        ...mockRequest,
        integration_preferences: {
          sync_with_music: false,
          sync_with_floral: true,
          track_usage: true
        }
        dominant_colors: ['#F5F5DC'],
        style_analysis: { primary_style: 'romantic', confidence_score: 0.9 },
        recommendations: []
      mockFloralAIService.prototype.analyzeColorHarmony = vi.fn().mockResolvedValue({
        color_harmony_score: 0.85
      mockTrialService.prototype.trackUsageAndAnalyze = vi.fn().mockResolvedValue({
        usage_count: 1
      const result = await coordinator.analyzeWithFullIntegration(requestWithoutMusic);
      // Verify music AI was not called
      expect(mockMusicAIService.prototype.analyzeStyleConsistency).not.toHaveBeenCalled();
      // Verify partial integration
        'floral_ai', 'pricing', 'trials'
      expect(result.style_consistency).toBeUndefined();
      expect(result.color_harmony).toBeDefined();
    test('should handle service failures gracefully', async () => {
      // Mock music AI service failure
      mockMoodBoardService.prototype.generateMoodBoard = vi.fn().mockResolvedValue({
        dominant_colors: ['#F5F5DC']
      
      mockMusicAIService.prototype.analyzeStyleConsistency = vi.fn().mockRejectedValue(
        new Error('Music AI service unavailable')
      );
      // Verify graceful handling
      expect(result.style_consistency.error).toBeDefined();
      expect(result.style_consistency.error.message).toContain('Music AI service unavailable');
      // Verify integration metrics reflect the failure
      expect(result.integration_metrics.failed_integrations).toEqual(['music_ai']);
    test('should utilize caching effectively', async () => {
      const cachedMoodBoard = {
        mood_board_id: 'cached-mood-123',
        style_analysis: { primary_style: 'romantic', confidence_score: 0.95 }
      (photographyCache.getCachedMoodBoard as ReturnType<typeof vi.fn>).mockResolvedValue(cachedMoodBoard);
      // Verify cached data was used
      expect(mockMoodBoardService.prototype.generateMoodBoard).not.toHaveBeenCalled();
      expect(result.photography_analysis).toEqual(cachedMoodBoard);
      expect(result.integration_metrics.cache_hit_rate).toBe(1.0);
    test('should handle rate limiting appropriately', async () => {
      (photographyRateLimiter.checkLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        remaining: 0,
        retryAfter: 3600
      await expect(coordinator.analyzeWithFullIntegration(mockRequest))
        .rejects.toThrow('Rate limit exceeded');
    test('should calculate integration scores accurately', async () => {
      // Mock high-quality responses from all services
        style_analysis: { confidence_score: 0.95 }
      mockMusicAIService.prototype.analyzeStyleConsistency = vi.fn().mockResolvedValue({
        style_match_score: 0.92,
        cross_domain_coherence: 0.89
        seasonal_alignment: 0.87
      // Verify team integration scores are calculated properly
      expect(result.style_consistency.team_a_integration_score).toBeCloseTo(0.90, 2);
      expect(result.color_harmony.team_b_integration_score).toBeCloseTo(0.90, 2);
      expect(result.integration_metrics.overall_coherence_score).toBeCloseTo(0.90, 2);
    test('should handle budget constraints correctly', async () => {
      const lowBudgetRequest = {
        budget_range: { min: 500, max: 1000 }
        mood_board_id: 'budget-mood-123',
          { type: 'budget_conscious', suggestion: 'Use seasonal flowers' }
      mockFeatureGateService.calculatePricingInsights = vi.fn().mockResolvedValue({
        estimated_cost: 800,
        budget_recommendations: ['Consider DIY options'],
        feature_accessibility: 'starter_tier'
      const result = await coordinator.analyzeWithFullIntegration(lowBudgetRequest);
      expect(result.pricing_insights.estimated_cost).toBe(800);
      expect(result.pricing_insights.budget_recommendations).toContain('Consider DIY options');
    test('should handle async processing correctly', async () => {
      // Mock services with varying response times
      mockMoodBoardService.prototype.generateMoodBoard = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ mood_board_id: 'mood-123' }), 100))
      mockMusicAIService.prototype.analyzeStyleConsistency = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ style_match_score: 0.9 }), 200))
      mockFloralAIService.prototype.analyzeColorHarmony = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ color_harmony_score: 0.85 }), 150))
      const startTime = Date.now();
      const endTime = Date.now();
      // Verify concurrent processing (should take ~200ms, not 450ms)
      expect(endTime - startTime).toBeLessThan(300);
      expect(result.integration_metrics.processing_time_ms).toBeGreaterThan(0);
    test('should validate request parameters', async () => {
      const invalidRequest = {
        client_id: '', // Invalid client_id
        preferred_colors: [] // Empty colors array
      await expect(coordinator.analyzeWithFullIntegration(invalidRequest))
        .rejects.toThrow('Invalid request parameters');
    test('should handle feature gate restrictions', async () => {
      mockFeatureGateService.checkFeatureAccess = vi.fn().mockResolvedValue({
        hasAccess: false,
        reason: 'PLAN_LIMIT_EXCEEDED'
        .rejects.toThrow('Feature access denied: PLAN_LIMIT_EXCEEDED');
  describe('Performance and Optimization', () => {
    test('should optimize for frequently requested combinations', async () => {
      const commonRequest = {
        wedding_style: 'romantic', // Common style
        preferred_colors: ['#FFFFFF', '#F5F5DC'] // Common colors
      // Mock cached optimization data
      (photographyCache.getCachedStyleConsistency as ReturnType<typeof vi.fn>).mockResolvedValue({
        cached: true
      const result = await coordinator.analyzeWithFullIntegration(commonRequest);
      expect(result.integration_metrics.cache_hit_rate).toBeGreaterThan(0);
      expect(result.integration_metrics.api_efficiency).toBeGreaterThan(0.8);
    test('should handle memory constraints gracefully', async () => {
      // Mock large response data
      const largeResponse = {
        mood_board_id: 'large-mood-123',
        detailed_analysis: new Array(1000).fill('large_data_chunk').join(''),
        recommendations: new Array(100).fill({ type: 'detailed', data: 'large' })
      mockMoodBoardService.prototype.generateMoodBoard = vi.fn().mockResolvedValue(largeResponse);
      // Verify response is optimized for size
      expect(result.photography_analysis).toBeDefined();
      expect(result.integration_metrics.memory_optimized).toBe(true);
  describe('Error Recovery', () => {
    test('should retry failed operations with backoff', async () => {
      let attemptCount = 0;
      mockMusicAIService.prototype.analyzeStyleConsistency = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Temporary service error'));
        return Promise.resolve({ style_match_score: 0.88 });
        mood_board_id: 'mood-123'
      expect(attemptCount).toBe(3);
      expect(result.style_consistency.style_match_score).toBe(0.88);
      expect(result.integration_metrics.retry_count).toBeGreaterThan(0);
    test('should provide meaningful error context', async () => {
      mockMoodBoardService.prototype.generateMoodBoard = vi.fn().mockRejectedValue(
        new Error('OpenAI API quota exceeded')
      try {
        await coordinator.analyzeWithFullIntegration(mockRequest);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('OpenAI API quota exceeded');
        expect(error.context).toBeDefined();
        expect(error.context.service).toBe('photography_analysis');
        expect(error.context.request_id).toBeDefined();
      }
});
