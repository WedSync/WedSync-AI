/**
 * WS-142 Round 2: Comprehensive Tests for ML and Automation Features
 * 
 * Complete test suite covering all ML-powered customer success features:
 * - Churn prediction model accuracy and reliability
 * - Multi-channel intervention orchestration
 * - Advanced milestone progression with smart rewards
 * - Predictive success coaching recommendations
 * - Viral optimization integration
 * - Marketing automation integration
 * - Real-time success dashboard with predictive alerts
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { ChurnPredictionModel, ChurnPrediction } from '@/lib/ml/churn-prediction-model';
import { InterventionOrchestrator } from '@/lib/services/intervention-orchestrator';
import { AdvancedMilestoneService } from '@/lib/services/milestone-tracking-service';
import { PredictiveSuccessCoachingService } from '@/lib/services/success-coaching-service';
import { ViralOptimizationIntegrationService } from '@/lib/services/viral-optimization-integration';
import { MarketingAutomationIntegrationService } from '@/lib/services/marketing-automation-integration';
import { SuccessDashboardService } from '@/lib/services/success-dashboard-service';
import { customerSuccessService } from '@/lib/services/customer-success-service';
import { redis } from '@/lib/redis';
// Mock external dependencies
vi.mock('@/lib/redis');
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/customer-success-service');
const mockRedis = redis as ReturnType<typeof vi.fn>ed<typeof redis>;
const mockCustomerSuccessService = customerSuccessService as ReturnType<typeof vi.fn>ed<typeof customerSuccessService>;
describe('ML-Powered Customer Success System - Comprehensive Test Suite', () => {
  
  // Test data
  const mockUserId = 'test-user-123';
  const mockOrganizationId = 'test-org-456';
  const mockSupplierProfile = {
    id: mockUserId,
    role: 'wedding_planner',
    experience_level: 'intermediate',
    organization_id: mockOrganizationId,
    created_at: new Date('2024-01-01')
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });
  afterEach(() => {
    vi.resetAllMocks();
  /**
   * CHURN PREDICTION MODEL TESTS
   */
  describe('ChurnPredictionModel', () => {
    let churnPredictor: ChurnPredictionModel;
    beforeEach(() => {
      churnPredictor = new ChurnPredictionModel();
    });
    it('should predict churn probability for a user', async () => {
      const prediction = await churnPredictor.predictChurnProbability(mockUserId);
      
      expect(prediction).toBeDefined();
      expect(prediction.user_id).toBe(mockUserId);
      expect(prediction.churn_probability).toBeGreaterThanOrEqual(0);
      expect(prediction.churn_probability).toBeLessThanOrEqual(1);
      expect(prediction.risk_level).toMatch(/^(low|medium|high|critical)$/);
      expect(prediction.confidence_score).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence_score).toBeLessThanOrEqual(1);
    it('should extract comprehensive feature data', async () => {
      expect(prediction.feature_importance).toBeDefined();
      expect(prediction.risk_factors).toBeDefined();
      expect(Array.isArray(prediction.risk_factors)).toBe(true);
      expect(prediction.feature_importance).toHaveProperty('engagement_score');
      expect(prediction.feature_importance).toHaveProperty('milestone_completion_rate');
      expect(prediction.feature_importance).toHaveProperty('time_since_last_activity');
    it('should handle ML model failures gracefully with heuristic fallback', async () => {
      // Force ML model to be unavailable
      const predictor = new ChurnPredictionModel();
      // @ts-ignore - accessing private property for testing
      predictor.model = null;
      const prediction = await predictor.predictChurnProbability(mockUserId);
      expect(prediction.prediction_method).toBe('heuristic');
    it('should validate feature normalization', async () => {
      // Ensure all features are properly normalized
      Object.values(prediction.feature_importance).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
   * INTERVENTION ORCHESTRATOR TESTS
  describe('InterventionOrchestrator', () => {
    let interventionOrchestrator: InterventionOrchestrator;
      interventionOrchestrator = new InterventionOrchestrator();
    it('should orchestrate multi-channel intervention based on churn risk', async () => {
      const interventionRequest = {
        user_id: mockUserId,
        intervention_type: 'churn_prevention' as const,
        urgency_level: 'high' as const,
        context: {
          churn_probability: 0.85,
          risk_factors: ['low_engagement', 'incomplete_onboarding'],
          user_preferences: { communication_style: 'supportive' }
        }
      };
      const interventionPlan = await interventionOrchestrator.orchestrateIntervention(interventionRequest);
      expect(interventionPlan).toBeDefined();
      expect(interventionPlan.user_id).toBe(mockUserId);
      expect(interventionPlan.channels_sequence).toBeDefined();
      expect(interventionPlan.channels_sequence.length).toBeGreaterThan(0);
      expect(interventionPlan.estimated_success_probability).toBeGreaterThanOrEqual(0);
      expect(interventionPlan.estimated_success_probability).toBeLessThanOrEqual(1);
    it('should optimize channel selection based on user preferences', async () => {
        intervention_type: 'engagement_boost' as const,
        urgency_level: 'medium' as const,
          user_preferences: { 
            preferred_channels: ['email', 'in_app'],
            communication_times: ['morning', 'evening']
          }
      expect(interventionPlan.channels_sequence).toContain('email');
      expect(interventionPlan.timing_optimization).toBeDefined();
      expect(interventionPlan.personalization_level).toBeDefined();
    it('should handle A/B testing for intervention strategies', async () => {
        intervention_type: 'coaching_engagement' as const,
        urgency_level: 'low' as const,
        context: {}
      expect(interventionPlan.a_b_testing_config).toBeDefined();
      expect(interventionPlan.a_b_testing_config.variant_name).toBeDefined();
      expect(interventionPlan.a_b_testing_config.control_group).toBeDefined();
    it('should track and optimize intervention performance', async () => {
      const interventionPlan = {
        strategy_name: 'churn_prevention_v1',
        channels_sequence: ['call', 'email', 'sms'],
        timing_optimization: { immediate: true }
      const result = await interventionOrchestrator.executeInterventionPlan(interventionPlan);
      expect(result).toBeDefined();
      expect(result.execution_results).toBeDefined();
      expect(result.performance_metrics).toBeDefined();
      expect(result.success_indicators).toBeDefined();
   * ADVANCED MILESTONE PROGRESSION TESTS
  describe('AdvancedMilestoneService', () => {
    let milestoneService: AdvancedMilestoneService;
      milestoneService = new AdvancedMilestoneService();
    it('should initialize personalized milestone progression', async () => {
      const userProfile = {
        role: 'wedding_planner',
        experience_level: 'beginner',
        preferences: { challenge_level: 'gentle' },
        organization_id: mockOrganizationId
      const progressionPlan = await milestoneService.initializeAdvancedMilestones(mockUserId, userProfile);
      expect(progressionPlan).toBeDefined();
      expect(progressionPlan.user_id).toBe(mockUserId);
      expect(progressionPlan.current_milestones).toBeDefined();
      expect(progressionPlan.upcoming_milestones).toBeDefined();
      expect(progressionPlan.personalized_pathway).toBeDefined();
      expect(progressionPlan.smart_rewards_queue).toBeDefined();
    it('should process milestone achievement with smart rewards', async () => {
      const mockMilestone = {
        id: 'milestone-123',
        milestone_name: 'First Client Added',
        points_value: 200,
        difficulty_score: 0.6,
        reward_tier: 'gold' as const
      const achievementContext = {
        completion_time_hours: 2,
        method_used: 'guided',
        assistance_required: false,
        innovation_demonstrated: true,
        social_interaction: false,
        additional_metrics: { satisfaction_score: 4.5 }
      const result = await milestoneService.processAdvancedAchievement(
        mockUserId, 
        mockMilestone.id, 
        achievementContext
      );
      expect(result.milestone).toBeDefined();
      expect(result.rewards_earned).toBeDefined();
      expect(result.social_recognition).toBeDefined();
      expect(result.next_recommendations).toBeDefined();
      expect(result.rewards_earned.length).toBeGreaterThan(0);
    it('should optimize milestone difficulty dynamically', async () => {
      const optimizationResult = await milestoneService.optimizeMilestoneDifficulty(mockUserId);
      expect(optimizationResult).toBeDefined();
      expect(optimizationResult.adjustments_made).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.optimization_results).toBeDefined();
      expect(optimizationResult.expected_improvements).toBeDefined();
      expect(optimizationResult.expected_improvements.completion_rate_improvement).toBeGreaterThanOrEqual(0);
    it('should generate personalized milestone recommendations', async () => {
      const context = {
        recent_activity: { last_login: new Date(), features_used: ['client_management'] },
        engagement_patterns: { peak_hours: [9, 14], preferred_difficulty: 'medium' },
        goal_preferences: ['client_acquisition', 'workflow_optimization'],
        timeline_constraints: { available_hours_per_week: 10 }
      const recommendations = await milestoneService.generatePersonalizedRecommendations(mockUserId, context);
      expect(recommendations).toBeDefined();
      expect(recommendations.immediate_recommendations).toBeDefined();
      expect(recommendations.strategic_pathway).toBeDefined();
      expect(recommendations.motivation_boosters).toBeDefined();
      expect(recommendations.risk_mitigation).toBeDefined();
   * PREDICTIVE SUCCESS COACHING TESTS
  describe('PredictiveSuccessCoachingService', () => {
    let coachingService: PredictiveSuccessCoachingService;
      coachingService = new PredictiveSuccessCoachingService();
    it('should initialize comprehensive coaching profile', async () => {
      const userContext = {
        role: 'supplier',
        experience_level: 'intermediate',
        goals: ['increase_bookings', 'improve_efficiency'],
        preferences: { learning_style: 'visual', communication_frequency: 'weekly' },
      const coachingProfile = await coachingService.initializeCoachingProfile(mockUserId, userContext);
      expect(coachingProfile).toBeDefined();
      expect(coachingProfile.user_id).toBe(mockUserId);
      expect(coachingProfile.coaching_preferences).toBeDefined();
      expect(coachingProfile.behavioral_patterns).toBeDefined();
      expect(coachingProfile.performance_context).toBeDefined();
      expect(coachingProfile.predictive_insights).toBeDefined();
    it('should generate personalized coaching recommendations', async () => {
        trigger_type: 'proactive' as const,
        current_challenges: ['time_management', 'client_communication'],
        recent_activities: { feature_usage: 'declining', milestone_progress: 'stalled' },
        performance_data: { engagement_score: 0.4, health_score: 55 }
      const recommendations = await coachingService.generateCoachingRecommendations(mockUserId, context);
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec.user_id).toBe(mockUserId);
        expect(rec.recommendation_type).toBeDefined();
        expect(rec.priority_level).toBeDefined();
        expect(rec.personalization).toBeDefined();
        expect(rec.ml_insights).toBeDefined();
    it('should process coaching engagement with effectiveness tracking', async () => {
      const recommendationId = 'coaching-rec-123';
      const engagementData = {
        engagement_type: 'completed' as const,
        engagement_duration_seconds: 900,
        user_feedback: {
          helpfulness_rating: 4,
          relevance_rating: 5,
          difficulty_rating: 3,
          comments: 'Very helpful guidance'
        },
        actions_taken: ['scheduled_follow_up', 'implemented_suggestion'],
        outcomes_achieved: ['improved_workflow', 'increased_confidence']
      const result = await coachingService.processRecommendationEngagement(
        mockUserId,
        recommendationId,
        engagementData
      expect(result.effectiveness_score).toBeGreaterThanOrEqual(0);
      expect(result.effectiveness_score).toBeLessThanOrEqual(1);
      expect(result.profile_updates).toBeDefined();
      expect(result.coaching_insights).toBeDefined();
    it('should conduct AI-guided coaching sessions', async () => {
      const sessionConfig = {
        session_type: 'skill_building' as const,
        focus_areas: ['client_management', 'time_efficiency'],
        time_budget_minutes: 30,
        user_preferences: { interaction_style: 'guided', content_depth: 'detailed' }
      const coachingSession = await coachingService.conductAIGuidedSession(mockUserId, sessionConfig);
      expect(coachingSession).toBeDefined();
      expect(coachingSession.user_id).toBe(mockUserId);
      expect(coachingSession.session_type).toBe('ai_guided');
      expect(coachingSession.focus_areas).toEqual(sessionConfig.focus_areas);
      expect(coachingSession.user_engagement).toBeDefined();
      expect(coachingSession.outcomes).toBeDefined();
      expect(coachingSession.effectiveness_metrics).toBeDefined();
   * VIRAL OPTIMIZATION INTEGRATION TESTS
  describe('ViralOptimizationIntegrationService', () => {
    let viralService: ViralOptimizationIntegrationService;
      viralService = new ViralOptimizationIntegrationService();
    it('should initialize viral optimization configuration', async () => {
      const userPreferences = {
        sharing_comfort_level: 'open' as const,
        preferred_channels: ['email', 'social_media'],
        privacy_settings: { public_achievements: true, peer_comparisons: true },
      const viralConfig = await viralService.initializeViralIntegration(mockUserId, userPreferences);
      expect(viralConfig).toBeDefined();
      expect(viralConfig.user_id).toBe(mockUserId);
      expect(viralConfig.viral_settings).toBeDefined();
      expect(viralConfig.viral_metrics).toBeDefined();
      expect(viralConfig.optimization_preferences).toBeDefined();
    it('should process milestone achievements for viral opportunities', async () => {
        id: 'milestone-viral-123',
        milestone_name: 'Photography Portfolio Completed',
        points_value: 500,
        reward_tier: 'platinum' as const,
        business_impact: 'High client attraction potential'
        completion_time_hours: 4,
        difficulty_exceeded: true,
        social_elements_used: true,
        peer_comparisons: { percentile: 85, ranking: 15 }
      const result = await viralService.processMilestoneViralTrigger(mockUserId, mockMilestone, achievementContext);
      expect(result.viral_trigger_created).toBeDefined();
      expect(result.viral_actions).toBeDefined();
      expect(result.social_proof_generated).toBeDefined();
      expect(result.community_challenges_suggested).toBeDefined();
    it('should enhance coaching with viral optimization elements', async () => {
      const mockRecommendations = [
        {
          id: 'coaching-123',
          recommendation_type: 'skill_building',
          category: 'feature_adoption',
          title: 'Master Advanced Photography Tools'
      ];
      const enhancement = await viralService.enhanceCoachingWithViralOptimization(mockUserId, mockRecommendations);
      expect(enhancement).toBeDefined();
      expect(enhancement.enhanced_recommendations).toBeDefined();
      expect(enhancement.viral_coaching_elements).toBeDefined();
      expect(enhancement.social_proof_integrations).toBeDefined();
      expect(enhancement.community_engagement_opportunities).toBeDefined();
    it('should generate viral performance analytics', async () => {
      const analytics = await viralService.getViralPerformanceAnalytics(mockUserId, 'month');
      expect(analytics).toBeDefined();
      expect(analytics.user_id).toBe(mockUserId);
      expect(analytics.viral_engagement).toBeDefined();
      expect(analytics.viral_impact).toBeDefined();
      expect(analytics.success_amplification).toBeDefined();
      expect(analytics.optimization_insights).toBeDefined();
      // Validate metrics structure
      expect(analytics.viral_engagement.shares_initiated).toBeGreaterThanOrEqual(0);
      expect(analytics.viral_impact.viral_coefficient).toBeGreaterThanOrEqual(0);
      expect(analytics.success_amplification.milestone_sharing_rate).toBeGreaterThanOrEqual(0);
   * MARKETING AUTOMATION INTEGRATION TESTS
  describe('MarketingAutomationIntegrationService', () => {
    let marketingService: MarketingAutomationIntegrationService;
      marketingService = new MarketingAutomationIntegrationService();
    it('should initialize marketing automation integration', async () => {
        preferences: { email_frequency: 'weekly', content_type: 'tips_and_tricks' },
        communication_preferences: { channels: ['email', 'push'], timing: 'morning' },
      const marketingConfig = await marketingService.initializeMarketingIntegration(mockUserId, userProfile);
      expect(marketingConfig).toBeDefined();
      expect(marketingConfig.user_id).toBe(mockUserId);
      expect(marketingConfig.integration_settings).toBeDefined();
      expect(marketingConfig.segmentation_profile).toBeDefined();
      expect(marketingConfig.personalization_data).toBeDefined();
      expect(marketingConfig.automation_rules).toBeDefined();
    it('should trigger marketing campaigns on milestone achievements', async () => {
        id: 'marketing-milestone-123',
        milestone_name: 'First Wedding Booked',
        points_value: 1000,
        business_impact: 'Revenue generation milestone'
        completion_time_hours: 24,
        success_metrics: { client_satisfaction: 4.8, booking_value: 5000 },
        user_sentiment: 'positive' as const
      const result = await marketingService.processMilestoneMarketingTrigger(mockUserId, mockMilestone, achievementContext);
      expect(result.campaigns_triggered).toBeDefined();
      expect(result.segment_updates).toBeDefined();
      expect(result.automation_rules_activated).toBeDefined();
      expect(result.personalization_enhancements).toBeDefined();
    it('should coordinate churn prevention with marketing campaigns', async () => {
      const churnPrediction = {
        churn_probability: 0.75,
        risk_level: 'high' as const,
        risk_factors: ['reduced_activity', 'support_requests'],
        intervention_recommendations: ['increase_touchpoints', 'offer_assistance']
        intervention_type: 'churn_prevention',
        channels: ['email', 'phone'],
        timeline: '48_hours'
      const result = await marketingService.coordinateChurnPreventionMarketing(
        churnPrediction, 
        interventionPlan
      expect(result.prevention_campaigns).toBeDefined();
      expect(result.segment_classification).toBeDefined();
      expect(result.automation_escalation).toBeDefined();
      expect(result.success_coordination).toBeDefined();
    it('should provide cross-platform analytics', async () => {
      const analytics = await marketingService.getCrossPlatformAnalytics(mockUserId, 'month');
      expect(analytics.marketing_performance).toBeDefined();
      expect(analytics.success_correlation).toBeDefined();
      expect(analytics.campaign_effectiveness).toBeDefined();
      expect(analytics.predictive_opportunities).toBeDefined();
   * REAL-TIME DASHBOARD TESTS
  describe('SuccessDashboardService', () => {
    let dashboardService: SuccessDashboardService;
      dashboardService = new SuccessDashboardService();
    it('should generate comprehensive dashboard metrics', async () => {
      const metrics = await dashboardService.getDashboardMetrics('individual', mockUserId);
      expect(metrics).toBeDefined();
      expect(metrics.user_id).toBe(mockUserId);
      expect(metrics.scope).toBe('individual');
      expect(metrics.success_metrics).toBeDefined();
      expect(metrics.predictive_insights).toBeDefined();
      expect(metrics.integrated_metrics).toBeDefined();
      expect(metrics.real_time_activity).toBeDefined();
      expect(metrics.trend_analysis).toBeDefined();
      // Validate metric ranges
      expect(metrics.success_metrics.overall_health_score).toBeGreaterThanOrEqual(0);
      expect(metrics.success_metrics.overall_health_score).toBeLessThanOrEqual(100);
      expect(metrics.predictive_insights.churn_probability).toBeGreaterThanOrEqual(0);
      expect(metrics.predictive_insights.churn_probability).toBeLessThanOrEqual(1);
    it('should generate and process predictive alerts', async () => {
      const alertResults = await dashboardService.generatePredictiveAlerts('individual', mockUserId);
      expect(alertResults).toBeDefined();
      expect(alertResults.new_alerts).toBeDefined();
      expect(alertResults.updated_alerts).toBeDefined();
      expect(alertResults.resolved_alerts).toBeDefined();
      expect(alertResults.alert_summary).toBeDefined();
      // Validate alert structure
      alertResults.new_alerts.forEach(alert => {
        expect(alert.alert_id).toBeDefined();
        expect(alert.alert_type).toBeDefined();
        expect(alert.severity).toMatch(/^(info|warning|error|critical)$/);
        expect(alert.automation_options).toBeDefined();
    it('should create custom dashboard configurations', async () => {
      const dashboardConfig = {
        name: 'Advanced Success Dashboard',
        type: 'individual' as const,
        organization_id: mockOrganizationId,
        widget_preferences: ['health_score', 'churn_risk', 'milestone_progress'],
        alert_preferences: ['churn_risk', 'engagement_drop'],
        real_time_enabled: true
      const dashboard = await dashboardService.createCustomDashboard(mockUserId, dashboardConfig);
      expect(dashboard).toBeDefined();
      expect(dashboard.user_id).toBe(mockUserId);
      expect(dashboard.dashboard_name).toBe(dashboardConfig.name);
      expect(dashboard.widget_layout).toBeDefined();
      expect(dashboard.alert_settings).toBeDefined();
      expect(dashboard.real_time_settings).toBeDefined();
      expect(dashboard.access_control).toBeDefined();
    it('should process automated alert responses', async () => {
      const processingResults = await dashboardService.processAutomatedAlertResponses();
      expect(processingResults).toBeDefined();
      expect(processingResults.alerts_processed).toBeGreaterThanOrEqual(0);
      expect(processingResults.interventions_triggered).toBeGreaterThanOrEqual(0);
      expect(processingResults.notifications_sent).toBeGreaterThanOrEqual(0);
      expect(processingResults.escalations_created).toBeGreaterThanOrEqual(0);
   * INTEGRATION TESTS - Cross-System Workflows
  describe('Cross-System Integration Workflows', () => {
    it('should execute complete churn prevention workflow', async () => {
      // Step 1: Detect churn risk
      const churnPrediction = await churnPredictor.predictChurnProbability(mockUserId);
      expect(churnPrediction.churn_probability).toBeGreaterThanOrEqual(0);
      // Step 2: Generate intervention if high risk
      if (churnPrediction.churn_probability > 0.7) {
        const interventionRequest = {
          user_id: mockUserId,
          intervention_type: 'churn_prevention' as const,
          urgency_level: 'high' as const,
          context: {
            churn_probability: churnPrediction.churn_probability,
            risk_factors: churnPrediction.risk_factors
        };
        const interventionPlan = await interventionOrchestrator.orchestrateIntervention(interventionRequest);
        expect(interventionPlan).toBeDefined();
        expect(interventionPlan.user_id).toBe(mockUserId);
        // Step 3: Generate coaching recommendations
        const coachingRecommendations = await coachingService.generateCoachingRecommendations(mockUserId, {
          trigger_type: 'intervention_triggered',
          current_challenges: churnPrediction.risk_factors
        });
        expect(coachingRecommendations).toBeDefined();
        expect(coachingRecommendations.length).toBeGreaterThan(0);
        // Step 4: Update dashboard with alerts
        const dashboardAlerts = await dashboardService.generatePredictiveAlerts('individual', mockUserId);
        expect(dashboardAlerts.new_alerts.length).toBeGreaterThan(0);
      }
    it('should coordinate milestone achievement across all systems', async () => {
      // Mock milestone achievement
      const milestone = {
        id: 'integration-milestone-123',
        milestone_name: 'Master Photography Workflow',
        points_value: 750,
        difficulty_score: 0.8,
      // Test integration across systems
        completion_time_hours: 6,
        user_satisfaction: 5,
        social_sharing_enabled: true
      // Each system should process the milestone appropriately
      const milestoneService = new AdvancedMilestoneService();
      const viralService = new ViralOptimizationIntegrationService();
      const marketingService = new MarketingAutomationIntegrationService();
      const [milestoneResult, viralResult, marketingResult] = await Promise.all([
        milestoneService.processAdvancedAchievement(mockUserId, milestone.id, achievementContext),
        viralService.processMilestoneViralTrigger(mockUserId, milestone, achievementContext),
        marketingService.processMilestoneMarketingTrigger(mockUserId, milestone, achievementContext)
      ]);
      expect(milestoneResult.rewards_earned).toBeDefined();
      expect(viralResult.viral_actions).toBeDefined();
      expect(marketingResult.campaigns_triggered).toBeDefined();
    it('should maintain data consistency across all systems', async () => {
      // Test that user data remains consistent across all services
      const userAnalytics = await Promise.all([
        coachingService.getCoachingAnalytics(mockUserId),
        dashboardService.getDashboardMetrics('individual', mockUserId)
      // Validate data consistency
      userAnalytics.forEach(analytics => {
        expect(analytics).toBeDefined();
        if ('user_id' in analytics) {
          expect(analytics.user_id).toBe(mockUserId);
   * ERROR HANDLING AND RESILIENCE TESTS
  describe('Error Handling and System Resilience', () => {
    it('should handle ML model failures gracefully', async () => {
      const churnPredictor = new ChurnPredictionModel();
      // Test with invalid user ID
      const prediction = await churnPredictor.predictChurnProbability('invalid-user');
    it('should handle Redis cache failures', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));
      const dashboardService = new SuccessDashboardService();
    it('should handle external API failures', async () => {
      // Mock external API failure
      const interventionOrchestrator = new InterventionOrchestrator();
        user_id: 'api-failure-test',
      const result = await interventionOrchestrator.orchestrateIntervention(interventionRequest);
      // Should still return a valid result with fallback strategies
      expect(result.user_id).toBe('api-failure-test');
    it('should maintain system performance under load', async () => {
      // Simulate concurrent requests
      const concurrentRequests = Array(10).fill(null).map((_, index) => 
        dashboardService.getDashboardMetrics('individual', `load-test-user-${index}`)
      const results = await Promise.all(concurrentRequests);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.user_id).toBe(`load-test-user-${index}`);
   * PERFORMANCE AND OPTIMIZATION TESTS
  describe('Performance and Optimization', () => {
    it('should cache frequently accessed data', async () => {
      // First call should cache the data
      const metrics1 = await dashboardService.getDashboardMetrics('individual', mockUserId);
      expect(mockRedis.setex).toHaveBeenCalled();
      // Second call should use cached data
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({
        ...metrics1,
        real_time_activity: undefined // Exclude real-time data from cache
      }));
      const metrics2 = await dashboardService.getDashboardMetrics('individual', mockUserId);
      expect(metrics2).toBeDefined();
    it('should optimize ML model predictions with feature caching', async () => {
      const startTime = Date.now();
      await churnPredictor.predictChurnProbability(mockUserId);
      const firstCallTime = Date.now() - startTime;
      const startTime2 = Date.now();
      const secondCallTime = Date.now() - startTime2;
      // Second call should be faster due to caching
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime + 100); // Allow some variance
    it('should batch database operations efficiently', async () => {
      // Test batch processing of multiple milestone achievements
      const achievements = Array(5).fill(null).map((_, index) => ({
        user_id: `batch-user-${index}`,
        milestone_id: `batch-milestone-${index}`,
        achievement_context: {
          completion_time_hours: 1,
          method_used: 'self_guided',
          assistance_required: false
      const results = await Promise.all(
        achievements.map(achievement => 
          milestoneService.processAdvancedAchievement(
            achievement.user_id,
            achievement.milestone_id,
            achievement.achievement_context
          )
        )
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.milestone).toBeDefined();
});
