/**
 * INTEGRATION TESTS: WS-236 Wedding Industry Context & Triggers
 * Team E - Batch 2, Round 1
 *
 * Testing real wedding industry scenarios and feedback triggers
 * Integration with actual database, user context, and business logic
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { FeedbackCollector } from '@/lib/feedback/feedback-collector';
import { NPSManager } from '@/lib/feedback/nps-manager';
import { FeedbackTriggerEngine } from '@/lib/feedback/trigger-engine';

const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const testSupabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);

interface TestSupplier {
  id: string;
  email: string;
  userType: 'supplier';
  vendorType: string;
  tier: string;
  createdAt: Date;
  weddingSeasonBusy?: boolean;
}

interface TestCouple {
  id: string;
  email: string;
  userType: 'couple';
  tier: string;
  weddingDate?: Date;
  planningPhase: string;
}

describe('Wedding Industry Context Integration Tests', () => {
  let testSuppliers: TestSupplier[] = [];
  let testCouples: TestCouple[] = [];
  let feedbackCollector: FeedbackCollector;
  let npsManager: NPSManager;
  let triggerEngine: FeedbackTriggerEngine;

  beforeAll(async () => {
    // Initialize services
    feedbackCollector = FeedbackCollector.getInstance();
    npsManager = new NPSManager();
    triggerEngine = new FeedbackTriggerEngine();

    // Create test users with wedding industry context
    await createTestWeddingUsers();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Reset any session data between tests
    await clearActiveFeedbackSessions();
  });

  describe('Vendor Type Specific Feedback Triggers', () => {
    it('should trigger photographer-specific NPS after client form completion milestone', async () => {
      const photographer = testSuppliers.find(
        (s) => s.vendorType === 'photographer',
      )!;

      // Simulate photographer completing multiple client forms (milestone trigger)
      await simulateClientFormCompletions(photographer.id, 5);

      // Check if NPS feedback is triggered
      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        photographer.id,
        'nps',
      );
      expect(eligibility.eligible).toBe(true);

      // Start feedback session
      const session = await feedbackCollector.startFeedbackSession({
        userId: photographer.id,
        feedbackType: 'nps',
        triggerReason: 'client_milestone_reached',
        context: {
          milestone: 'forms_completed',
          count: 5,
          vendorType: 'photographer',
          recentFeatures: ['form_builder', 'client_gallery'],
        },
        userAgent: 'test-browser',
      });

      expect(session.userType).toBe('supplier');
      expect(session.triggerReason).toBe('client_milestone_reached');

      // Should have photographer-specific questions
      const photographerQ = session.questions.find(
        (q) =>
          q.text.toLowerCase().includes('photographer') ||
          q.text.toLowerCase().includes('photo'),
      );
      expect(photographerQ).toBeDefined();

      // Should include wedding business impact question
      const businessQ = session.questions.find(
        (q) => q.key === 'nps_business_impact',
      );
      expect(businessQ?.text).toContain('wedding business');
    });

    it('should trigger venue-specific feature feedback after booking system usage', async () => {
      const venue = testSuppliers.find((s) => s.vendorType === 'venue')!;

      // Simulate venue using booking system extensively
      await simulateFeatureUsage(venue.id, 'booking_system', 12);

      // Check feature feedback eligibility
      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        venue.id,
        'feature',
      );
      expect(eligibility.eligible).toBe(true);

      // Start feature feedback session
      const session = await feedbackCollector.startFeedbackSession({
        userId: venue.id,
        feedbackType: 'feature',
        triggerReason: 'feature_power_usage',
        context: {
          featureName: 'booking_system',
          usageCount: 12,
          vendorType: 'venue',
          averageSessionTime: 180,
        },
        userAgent: 'test-browser',
      });

      expect(session.type).toBe('feature');
      expect(session.triggerContext.featureName).toBe('booking_system');

      // Should have venue-specific context in questions
      const venueContextQ = session.questions.find(
        (q) =>
          q.text.toLowerCase().includes('venue') ||
          q.text.toLowerCase().includes('booking'),
      );
      expect(venueContextQ).toBeDefined();
    });

    it('should trigger planner-specific churn prevention feedback after reduced activity', async () => {
      const planner = testSuppliers.find(
        (s) => s.vendorType === 'wedding_planner',
      )!;

      // Simulate reduced activity pattern (churn risk)
      await simulateChurnRiskPattern(planner.id);

      // Check churn feedback eligibility
      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        planner.id,
        'churn',
      );
      expect(eligibility.eligible).toBe(true);

      // Start churn prevention feedback
      const session = await feedbackCollector.startFeedbackSession({
        userId: planner.id,
        feedbackType: 'churn',
        triggerReason: 'inactivity_risk',
        context: {
          vendorType: 'wedding_planner',
          activityReduction: 0.7,
          lastActiveDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          previousEngagement: 0.8,
        },
        userAgent: 'test-browser',
      });

      expect(session.type).toBe('churn');

      // Should have leaving reason question
      const leavingQ = session.questions.find(
        (q) => q.key === 'leaving_reason',
      );
      expect(leavingQ).toBeDefined();
      expect(leavingQ?.choices).toContain('Not enough clients/bookings');
      expect(leavingQ?.choices).toContain('Business priorities changed');
    });
  });

  describe('Wedding Season Context Integration', () => {
    it('should adapt feedback timing and content during peak wedding season', async () => {
      const photographer = testSuppliers.find(
        (s) => s.vendorType === 'photographer',
      )!;

      // Set wedding season context (June - peak season)
      const peakSeasonDate = new Date('2025-06-15');

      // Mock current date to be in wedding season
      jest.useFakeTimers();
      jest.setSystemTime(peakSeasonDate);

      const session = await feedbackCollector.startFeedbackSession({
        userId: photographer.id,
        feedbackType: 'nps',
        triggerReason: 'seasonal_check',
        context: {
          currentSeason: 'peak_wedding_season',
          monthlyBookings: 8,
          seasonalWorkload: 'very_busy',
        },
        userAgent: 'test-browser',
      });

      // Should include wedding season context question
      const seasonQ = session.questions.find(
        (q) => q.key === 'current_wedding_season',
      );
      expect(seasonQ).toBeDefined();
      expect(seasonQ?.choices).toContain('Very busy (peak season)');

      // Should have seasonal context in business impact question
      const businessQ = session.questions.find(
        (q) => q.key === 'nps_business_impact',
      );
      expect(businessQ?.placeholder).toContain('business');

      jest.useRealTimers();
    });

    it('should handle off-season feedback differently for suppliers', async () => {
      const florist = testSuppliers.find((s) => s.vendorType === 'florist')!;

      // Set off-season context (February)
      const offSeasonDate = new Date('2025-02-15');

      jest.useFakeTimers();
      jest.setSystemTime(offSeasonDate);

      const session = await feedbackCollector.startFeedbackSession({
        userId: florist.id,
        feedbackType: 'feature',
        triggerReason: 'off_season_optimization',
        context: {
          currentSeason: 'off_season',
          planningMode: true,
          focusArea: 'business_development',
        },
        userAgent: 'test-browser',
      });

      // Should adapt questions for off-season planning
      const seasonQ = session.questions.find(
        (q) => q.key === 'current_wedding_season',
      );
      expect(seasonQ?.choices).toContain('Off-season/break');

      jest.useRealTimers();
    });

    it('should calculate seasonal NPS trends for wedding industry', async () => {
      // Create seasonal NPS data
      await createSeasonalNPSData();

      const seasonalNPS =
        await npsManager.calculateWeddingIndustryNPS('yearly');

      expect(seasonalNPS.seasonality).toBeDefined();
      expect(seasonalNPS.seasonality.weddingSeason).toBeDefined();
      expect(seasonalNPS.seasonality.offSeason).toBeDefined();

      // Wedding season should typically have different scores than off-season
      expect(typeof seasonalNPS.seasonality.weddingSeason.score).toBe('number');
      expect(typeof seasonalNPS.seasonality.offSeason.score).toBe('number');
    });
  });

  describe('Couple Wedding Planning Phase Context', () => {
    it('should trigger onboarding feedback for newly engaged couples', async () => {
      const newCouple = testCouples.find(
        (c) => c.planningPhase === 'newly_engaged',
      )!;

      const session = await feedbackCollector.startFeedbackSession({
        userId: newCouple.id,
        feedbackType: 'onboarding',
        triggerReason: 'new_user_setup',
        context: {
          userType: 'couple',
          planningPhase: 'newly_engaged',
          weddingDate: new Date('2025-10-15'),
          monthsToWedding: 8,
        },
        userAgent: 'test-mobile',
      });

      expect(session.userType).toBe('couple');
      expect(session.type).toBe('onboarding');

      // Should not have supplier-specific questions
      const businessQ = session.questions.find(
        (q) => q.key === 'business_setup_completion',
      );
      expect(businessQ).toBeUndefined();

      // Should have couple-specific onboarding questions
      const easeQ = session.questions.find(
        (q) => q.key === 'onboarding_overall_ease',
      );
      expect(easeQ).toBeDefined();
    });

    it('should provide planning phase appropriate feature feedback', async () => {
      const activePlanningCouple = testCouples.find(
        (c) => c.planningPhase === 'active_planning',
      )!;

      const session = await feedbackCollector.startFeedbackSession({
        userId: activePlanningCouple.id,
        feedbackType: 'feature',
        triggerReason: 'feature_milestone',
        context: {
          featureName: 'vendor_directory',
          planningPhase: 'active_planning',
          vendorsContacted: 15,
          weddingDate: new Date('2025-09-20'),
        },
        userAgent: 'test-mobile',
      });

      expect(session.type).toBe('feature');
      expect(session.triggerContext.featureName).toBe('vendor_directory');

      // Should have wedding planning value question
      const valueQ = session.questions.find(
        (q) => q.key === 'feature_wedding_value',
      );
      expect(valueQ?.text).toContain('wedding planning');

      // Should not have business-specific questions
      expect(
        session.questions.every(
          (q) => !q.text.toLowerCase().includes('business workflow'),
        ),
      ).toBe(true);
    });

    it('should handle final details phase with urgency context', async () => {
      const finalDetailsCouple = testCouples.find(
        (c) => c.planningPhase === 'final_details',
      )!;

      const session = await feedbackCollector.startFeedbackSession({
        userId: finalDetailsCouple.id,
        feedbackType: 'nps',
        triggerReason: 'pre_wedding_check',
        context: {
          planningPhase: 'final_details',
          weddingDate: new Date('2025-03-15'),
          daysToWedding: 30,
          stressLevel: 'high',
        },
        userAgent: 'test-mobile',
      });

      expect(session.userType).toBe('couple');
      expect(session.triggerContext.planningPhase).toBe('final_details');

      // Should have appropriate empathy in questions for stressful planning phase
      const npsQ = session.questions.find((q) => q.key === 'nps_score');
      expect(npsQ?.helpText).toContain('honest feedback');
    });
  });

  describe('Cross-User Type Feedback Triggers', () => {
    it('should trigger feedback when supplier imports couple as client', async () => {
      const photographer = testSuppliers.find(
        (s) => s.vendorType === 'photographer',
      )!;
      const couple = testCouples.find(
        (c) => c.planningPhase === 'active_planning',
      )!;

      // Simulate client import/connection
      await simulateClientConnection(photographer.id, couple.id);

      // Both parties should be eligible for relationship feedback
      const supplierEligibility =
        await feedbackCollector.checkFeedbackEligibility(
          photographer.id,
          'feature',
        );
      const coupleEligibility =
        await feedbackCollector.checkFeedbackEligibility(couple.id, 'feature');

      expect(supplierEligibility.eligible).toBe(true);
      expect(coupleEligibility.eligible).toBe(true);

      // Supplier should get client management feedback
      const supplierSession = await feedbackCollector.startFeedbackSession({
        userId: photographer.id,
        feedbackType: 'feature',
        triggerReason: 'client_connection',
        context: {
          featureName: 'client_management',
          clientCount: 1,
          connectionType: 'imported_client',
        },
        userAgent: 'test-browser',
      });

      expect(supplierSession.triggerContext.featureName).toBe(
        'client_management',
      );

      // Couple should get vendor connection feedback
      const coupleSession = await feedbackCollector.startFeedbackSession({
        userId: couple.id,
        feedbackType: 'feature',
        triggerReason: 'vendor_connection',
        context: {
          featureName: 'vendor_collaboration',
          vendorCount: 1,
          connectionType: 'invited_by_vendor',
        },
        userAgent: 'test-mobile',
      });

      expect(coupleSession.triggerContext.featureName).toBe(
        'vendor_collaboration',
      );
    });

    it('should coordinate feedback timing to avoid survey fatigue', async () => {
      const photographer = testSuppliers.find(
        (s) => s.vendorType === 'photographer',
      )!;

      // Create recent feedback session
      await createRecentFeedbackSession(photographer.id, 'nps', 2); // 2 days ago

      // Should prevent new feedback due to recency
      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        photographer.id,
        'feature',
      );
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('feedback_fatigue');
    });
  });

  describe('Business Impact and ROI Context', () => {
    it('should correlate feedback with business metrics for suppliers', async () => {
      const venue = testSuppliers.find((s) => s.vendorType === 'venue')!;

      // Simulate business growth metrics
      await updateBusinessMetrics(venue.id, {
        monthlyBookings: 12,
        averageBookingValue: 8500,
        clientSatisfaction: 4.8,
        responseTimeImprovement: 0.3,
      });

      const session = await feedbackCollector.startFeedbackSession({
        userId: venue.id,
        feedbackType: 'nps',
        triggerReason: 'business_growth_milestone',
        context: {
          businessMetrics: {
            bookingIncrease: 0.25,
            efficiencyGain: 0.3,
            clientSatisfactionImprovement: 0.2,
          },
        },
        userAgent: 'test-browser',
      });

      // Should include business impact context in questions
      const businessQ = session.questions.find(
        (q) => q.key === 'nps_business_impact',
      );
      expect(businessQ?.text).toContain('wedding business');
      expect(businessQ?.placeholder).toContain('business');
    });

    it('should track feature ROI through feedback correlation', async () => {
      const planner = testSuppliers.find(
        (s) => s.vendorType === 'wedding_planner',
      )!;

      // Simulate feature usage with measurable impact
      await simulateFeatureROI(planner.id, 'automation_workflows', {
        timeSaved: 120, // minutes per week
        clientCommunicationImprovement: 0.4,
        errorReduction: 0.6,
      });

      const session = await feedbackCollector.startFeedbackSession({
        userId: planner.id,
        feedbackType: 'feature',
        triggerReason: 'roi_milestone',
        context: {
          featureName: 'automation_workflows',
          measuredROI: {
            timeSaved: 120,
            efficiencyGain: 0.4,
          },
        },
        userAgent: 'test-browser',
      });

      // Should include ROI context in value question
      const valueQ = session.questions.find(
        (q) => q.key === 'feature_wedding_value',
      );
      expect(valueQ).toBeDefined();
      expect(valueQ?.labels).toContain('Extremely Valuable');
    });
  });

  // Helper functions for test data and simulations
  async function createTestWeddingUsers() {
    // Create test suppliers with different vendor types
    testSuppliers = await Promise.all([
      createTestUser({
        email: 'test.photographer@wedsync.test',
        userType: 'supplier',
        vendorType: 'photographer',
        tier: 'professional',
      }),
      createTestUser({
        email: 'test.venue@wedsync.test',
        userType: 'supplier',
        vendorType: 'venue',
        tier: 'scale',
      }),
      createTestUser({
        email: 'test.planner@wedsync.test',
        userType: 'supplier',
        vendorType: 'wedding_planner',
        tier: 'professional',
      }),
      createTestUser({
        email: 'test.florist@wedsync.test',
        userType: 'supplier',
        vendorType: 'florist',
        tier: 'starter',
      }),
    ]);

    // Create test couples in different planning phases
    testCouples = await Promise.all([
      createTestUser({
        email: 'newcouple@wedsync.test',
        userType: 'couple',
        tier: 'free',
        planningPhase: 'newly_engaged',
        weddingDate: new Date('2025-10-15'),
      }),
      createTestUser({
        email: 'activecouple@wedsync.test',
        userType: 'couple',
        tier: 'free',
        planningPhase: 'active_planning',
        weddingDate: new Date('2025-09-20'),
      }),
      createTestUser({
        email: 'finalcouple@wedsync.test',
        userType: 'couple',
        tier: 'free',
        planningPhase: 'final_details',
        weddingDate: new Date('2025-03-15'),
      }),
    ]);
  }

  async function createTestUser(userData: any): Promise<any> {
    const { data: user } = await testSupabase.auth.signUp({
      email: userData.email,
      password: 'TestPassword123!',
    });

    if (user.user) {
      await testSupabase.from('user_profiles').insert({
        id: user.user.id,
        email: userData.email,
        user_type: userData.userType,
        vendor_type: userData.vendorType,
        subscription_tier: userData.tier,
        planning_phase: userData.planningPhase,
        wedding_date: userData.weddingDate,
        created_at: userData.createdAt || new Date(),
        engagement_score: 0.5,
      });

      return {
        id: user.user.id,
        email: userData.email,
        userType: userData.userType,
        vendorType: userData.vendorType,
        tier: userData.tier,
        planningPhase: userData.planningPhase,
        weddingDate: userData.weddingDate,
        createdAt: userData.createdAt || new Date(),
      };
    }
    throw new Error('Failed to create test user');
  }

  async function simulateClientFormCompletions(userId: string, count: number) {
    const formCompletions = Array.from({ length: count }, (_, i) => ({
      user_id: userId,
      form_type: 'client_questionnaire',
      completed_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      client_id: `client-${i + 1}`,
    }));

    await testSupabase.from('form_submissions').insert(formCompletions);
  }

  async function simulateFeatureUsage(
    userId: string,
    featureName: string,
    usageCount: number,
  ) {
    const usageRecords = Array.from({ length: usageCount }, (_, i) => ({
      user_id: userId,
      feature_name: featureName,
      used_at: new Date(Date.now() - i * 2 * 60 * 60 * 1000), // Every 2 hours
      session_duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
    }));

    await testSupabase.from('feature_usage').insert(usageRecords);
  }

  async function simulateChurnRiskPattern(userId: string) {
    // Create pattern of decreasing activity
    const activities = [
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), score: 0.8 },
      { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), score: 0.6 },
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), score: 0.3 },
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), score: 0.1 },
    ];

    await testSupabase.from('user_engagement_daily').insert(
      activities.map((activity) => ({
        user_id: userId,
        date: activity.date.toISOString().split('T')[0],
        engagement_score: activity.score,
      })),
    );
  }

  async function createSeasonalNPSData() {
    const seasonalData = [
      // Wedding season (May-July, September-October)
      {
        score: 9,
        completed_at: '2025-06-01',
        user_type: 'supplier',
        vendor_type: 'photographer',
      },
      {
        score: 8,
        completed_at: '2025-06-15',
        user_type: 'supplier',
        vendor_type: 'venue',
      },
      { score: 10, completed_at: '2025-07-01', user_type: 'couple' },
      {
        score: 9,
        completed_at: '2025-09-15',
        user_type: 'supplier',
        vendor_type: 'florist',
      },
      {
        score: 8,
        completed_at: '2025-10-01',
        user_type: 'supplier',
        vendor_type: 'photographer',
      },

      // Off season (January-April, November-December)
      {
        score: 7,
        completed_at: '2025-02-01',
        user_type: 'supplier',
        vendor_type: 'photographer',
      },
      {
        score: 6,
        completed_at: '2025-03-15',
        user_type: 'supplier',
        vendor_type: 'venue',
      },
      { score: 8, completed_at: '2025-04-01', user_type: 'couple' },
      {
        score: 7,
        completed_at: '2025-11-15',
        user_type: 'supplier',
        vendor_type: 'florist',
      },
      {
        score: 6,
        completed_at: '2025-12-01',
        user_type: 'supplier',
        vendor_type: 'wedding_planner',
      },
    ];

    await testSupabase.from('nps_surveys').insert(
      seasonalData.map((data) => ({
        user_id: testSuppliers[0].id, // Use first test supplier
        score: data.score,
        category:
          data.score >= 9
            ? 'promoter'
            : data.score >= 7
              ? 'passive'
              : 'detractor',
        completed_at: data.completed_at,
        trigger_reason: 'seasonal_test_data',
      })),
    );
  }

  async function simulateClientConnection(
    supplierId: string,
    coupleId: string,
  ) {
    await testSupabase.from('client_connections').insert({
      supplier_id: supplierId,
      couple_id: coupleId,
      connection_type: 'imported',
      connected_at: new Date(),
      status: 'active',
    });
  }

  async function createRecentFeedbackSession(
    userId: string,
    type: string,
    daysAgo: number,
  ) {
    await testSupabase.from('feedback_sessions').insert({
      user_id: userId,
      session_type: type,
      started_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      status: 'completed',
    });
  }

  async function updateBusinessMetrics(userId: string, metrics: any) {
    await testSupabase.from('supplier_business_metrics').upsert({
      user_id: userId,
      monthly_bookings: metrics.monthlyBookings,
      average_booking_value: metrics.averageBookingValue,
      client_satisfaction: metrics.clientSatisfaction,
      response_time_improvement: metrics.responseTimeImprovement,
      updated_at: new Date(),
    });
  }

  async function simulateFeatureROI(
    userId: string,
    featureName: string,
    roiData: any,
  ) {
    await testSupabase.from('feature_roi_tracking').insert({
      user_id: userId,
      feature_name: featureName,
      time_saved_minutes: roiData.timeSaved,
      efficiency_improvement: roiData.clientCommunicationImprovement,
      error_reduction: roiData.errorReduction,
      measured_at: new Date(),
    });
  }

  async function clearActiveFeedbackSessions() {
    // Clear any active sessions from previous tests
    await testSupabase
      .from('feedback_sessions')
      .update({ status: 'abandoned' })
      .eq('status', 'active');
  }

  async function cleanupTestData() {
    // Clean up all test data
    const userIds = [...testSuppliers, ...testCouples].map((u) => u.id);

    await Promise.all([
      testSupabase.from('feedback_sessions').delete().in('user_id', userIds),
      testSupabase.from('nps_surveys').delete().in('user_id', userIds),
      testSupabase.from('feature_feedback').delete().in('user_id', userIds),
      testSupabase.from('form_submissions').delete().in('user_id', userIds),
      testSupabase.from('feature_usage').delete().in('user_id', userIds),
      testSupabase
        .from('user_engagement_daily')
        .delete()
        .in('user_id', userIds),
      testSupabase
        .from('client_connections')
        .delete()
        .in('supplier_id', userIds),
      testSupabase
        .from('supplier_business_metrics')
        .delete()
        .in('user_id', userIds),
      testSupabase.from('feature_roi_tracking').delete().in('user_id', userIds),
      testSupabase.from('user_profiles').delete().in('id', userIds),
    ]);

    // Delete auth users
    for (const user of [...testSuppliers, ...testCouples]) {
      await testSupabase.auth.admin.deleteUser(user.id);
    }
  }
});
