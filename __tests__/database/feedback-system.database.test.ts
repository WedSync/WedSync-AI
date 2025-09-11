/**
 * WS-236 User Feedback System Database Tests
 * Team D: Platform Implementation - Database Layer Testing
 * 
 * Comprehensive test suite for feedback system database schema,
 * performance functions, and data integrity.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/testing-library/jest-dom';
import { supabase } from '@/lib/supabase';

// Test data factories
const createTestUser = async (userType: 'supplier' | 'couple', vendorType?: string) => {
  const { data: user } = await supabase.auth.signUp({
    email: `test-${userType}-${Date.now()}@example.com`,
    password: 'testpassword123'
  });
  
  if (user.user) {
    await supabase.from('user_profiles').insert({
      user_id: user.user.id,
      user_type: userType,
      vendor_type: vendorType,
      business_name: `Test ${vendorType || userType} Business`,
      tier: 'professional'
    });
  }
  
  return user.user;
};

const createTestFeedbackSession = async (userId: string, sessionType: string) => {
  const { data: session, error } = await supabase
    .from('feedback_sessions')
    .insert({
      user_id: userId,
      session_type: sessionType,
      trigger_reason: 'test_trigger',
      user_type: 'supplier',
      user_tier: 'professional',
      account_age_days: 30,
      engagement_score: 0.75,
      device_type: 'desktop',
      browser: 'chrome',
      page_url: '/dashboard'
    })
    .select()
    .single();
    
  if (error) throw error;
  return session;
};

describe('WS-236 Feedback System Database Schema', () => {
  let testUser: any;
  let testSession: any;
  
  beforeEach(async () => {
    // Create test user for each test
    testUser = await createTestUser('supplier', 'photographer');
  });
  
  afterEach(async () => {
    // Cleanup test data
    if (testUser) {
      await supabase.from('feedback_sessions').delete().eq('user_id', testUser.id);
      await supabase.from('user_profiles').delete().eq('user_id', testUser.id);
      await supabase.auth.admin.deleteUser(testUser.id);
    }
  });

  describe('Feedback Sessions Table', () => {
    it('should create feedback session with wedding industry context', async () => {
      const sessionData = {
        user_id: testUser.id,
        session_type: 'nps',
        trigger_reason: 'milestone_reached',
        trigger_context: {
          feature: 'form_builder',
          usage_count: 5,
          wedding_season: 'peak'
        },
        user_type: 'supplier',
        user_tier: 'professional',
        account_age_days: 45,
        engagement_score: 0.85,
        device_type: 'mobile',
        browser: 'safari',
        page_url: '/forms/builder'
      };

      const { data: session, error } = await supabase
        .from('feedback_sessions')
        .insert(sessionData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(session).toBeDefined();
      expect(session.session_type).toBe('nps');
      expect(session.user_type).toBe('supplier');
      expect(session.trigger_context).toEqual(sessionData.trigger_context);
      expect(session.engagement_score).toBe(0.85);
    });

    it('should enforce session type constraints', async () => {
      const invalidSessionData = {
        user_id: testUser.id,
        session_type: 'invalid_type',
        trigger_reason: 'test',
        user_type: 'supplier',
        user_tier: 'professional',
        account_age_days: 30
      };

      const { error } = await supabase
        .from('feedback_sessions')
        .insert(invalidSessionData);

      expect(error).toBeDefined();
      expect(error.message).toContain('session_type');
    });

    it('should enforce completion date validation', async () => {
      const session = await createTestFeedbackSession(testUser.id, 'nps');
      
      // Try to set completion date before start date
      const { error } = await supabase
        .from('feedback_sessions')
        .update({
          completed_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          started_at: new Date().toISOString() // now
        })
        .eq('id', session.id);

      expect(error).toBeDefined();
      expect(error.message).toContain('valid_completion');
    });
  });

  describe('Feedback Responses Table', () => {
    beforeEach(async () => {
      testSession = await createTestFeedbackSession(testUser.id, 'nps');
    });

    it('should create NPS response with proper validation', async () => {
      const responseData = {
        session_id: testSession.id,
        question_key: 'nps_score',
        question_text: 'How likely are you to recommend WedSync?',
        question_type: 'nps',
        nps_score: 9,
        time_to_respond_seconds: 15,
        question_order: 1,
        is_required: true
      };

      const { data: response, error } = await supabase
        .from('feedback_responses')
        .insert(responseData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.nps_score).toBe(9);
      expect(response.question_type).toBe('nps');
    });

    it('should create text response with sentiment analysis fields', async () => {
      const responseData = {
        session_id: testSession.id,
        question_key: 'nps_reason',
        question_text: 'What\'s the main reason for your score?',
        question_type: 'text',
        text_value: 'WedSync has made managing my wedding clients so much easier. The form builder saves me hours.',
        sentiment_score: 0.8,
        keywords: ['easier', 'form builder', 'saves', 'hours'],
        themes: ['efficiency', 'time_saving', 'client_management'],
        confidence_score: 0.92,
        time_to_respond_seconds: 45,
        question_order: 2
      };

      const { data: response, error } = await supabase
        .from('feedback_responses')
        .insert(responseData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(response.text_value).toBe(responseData.text_value);
      expect(response.sentiment_score).toBe(0.8);
      expect(response.keywords).toEqual(['easier', 'form builder', 'saves', 'hours']);
      expect(response.themes).toEqual(['efficiency', 'time_saving', 'client_management']);
    });

    it('should enforce single response value constraint', async () => {
      const invalidResponseData = {
        session_id: testSession.id,
        question_key: 'invalid_response',
        question_text: 'Invalid question',
        question_type: 'rating',
        nps_score: 8,
        rating_value: 4 // Can't have both NPS score and rating
      };

      const { error } = await supabase
        .from('feedback_responses')
        .insert(invalidResponseData);

      expect(error).toBeDefined();
      expect(error.message).toContain('single_response_value');
    });
  });

  describe('NPS Surveys Table', () => {
    beforeEach(async () => {
      testSession = await createTestFeedbackSession(testUser.id, 'nps');
    });

    it('should create NPS survey with wedding industry context', async () => {
      const npsData = {
        user_id: testUser.id,
        session_id: testSession.id,
        score: 9,
        category: 'promoter',
        feedback_text: 'Amazing platform for wedding photographers!',
        trigger_reason: 'quarterly_survey',
        user_journey_stage: 'power_user',
        vendor_type: 'photographer',
        wedding_season_context: 'peak_season',
        recent_feature_usage: {
          form_builder: 15,
          journey_canvas: 8,
          client_portal: 22
        },
        recent_support_interactions: 0
      };

      const { data: nps, error } = await supabase
        .from('nps_surveys')
        .insert(npsData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(nps.score).toBe(9);
      expect(nps.category).toBe('promoter');
      expect(nps.vendor_type).toBe('photographer');
      expect(nps.recent_feature_usage).toEqual(npsData.recent_feature_usage);
    });

    it('should enforce NPS score validation', async () => {
      const invalidNpsData = {
        user_id: testUser.id,
        session_id: testSession.id,
        score: 15, // Invalid - must be 0-10
        category: 'promoter',
        trigger_reason: 'test'
      };

      const { error } = await supabase
        .from('nps_surveys')
        .insert(invalidNpsData);

      expect(error).toBeDefined();
      expect(error.message).toContain('score');
    });
  });

  describe('Feature Feedback Table', () => {
    beforeEach(async () => {
      testSession = await createTestFeedbackSession(testUser.id, 'feature');
    });

    it('should create feature feedback with wedding context', async () => {
      const featureFeedbackData = {
        user_id: testUser.id,
        session_id: testSession.id,
        feature_name: 'form_builder',
        feature_version: '2.1.0',
        usage_context: 'creating_client_questionnaire',
        satisfaction_rating: 4,
        ease_of_use_rating: 5,
        value_rating: 5,
        usage_frequency: 'weekly',
        feature_discovery_method: 'onboarding',
        liked_aspects: 'Drag and drop interface, wedding-specific templates',
        disliked_aspects: 'Could use more customization options',
        improvement_suggestions: 'Add more dietary restriction fields',
        would_recommend: true,
        wedding_phase: 'planning',
        vendor_type: 'photographer',
        client_context: 'Planning spring wedding with 150 guests'
      };

      const { data: feedback, error } = await supabase
        .from('feature_feedback')
        .insert(featureFeedbackData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(feedback.feature_name).toBe('form_builder');
      expect(feedback.satisfaction_rating).toBe(4);
      expect(feedback.wedding_phase).toBe('planning');
      expect(feedback.would_recommend).toBe(true);
    });

    it('should enforce rating constraints', async () => {
      const invalidFeedbackData = {
        user_id: testUser.id,
        session_id: testSession.id,
        feature_name: 'form_builder',
        satisfaction_rating: 0, // Invalid - must be 1-5
        ease_of_use_rating: 3,
        value_rating: 4
      };

      const { error } = await supabase
        .from('feature_feedback')
        .insert(invalidFeedbackData);

      expect(error).toBeDefined();
      expect(error.message).toContain('satisfaction_rating');
    });
  });

  describe('Rate Limiting Table', () => {
    it('should create rate limit record with proper defaults', async () => {
      const rateLimitData = {
        user_id: testUser.id,
        month_reset_at: new Date().toISOString().split('T')[0], // Today
        quarter_reset_at: new Date().toISOString().split('T')[0]
      };

      const { data: rateLimit, error } = await supabase
        .from('feedback_rate_limits')
        .insert(rateLimitData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(rateLimit.feedback_count_this_month).toBe(0);
      expect(rateLimit.feedback_count_this_quarter).toBe(0);
      expect(rateLimit.nps_count_this_quarter).toBe(0);
    });

    it('should enforce user uniqueness', async () => {
      // Create first record
      await supabase.from('feedback_rate_limits').insert({
        user_id: testUser.id,
        month_reset_at: new Date().toISOString().split('T')[0],
        quarter_reset_at: new Date().toISOString().split('T')[0]
      });

      // Try to create duplicate
      const { error } = await supabase
        .from('feedback_rate_limits')
        .insert({
          user_id: testUser.id,
          month_reset_at: new Date().toISOString().split('T')[0],
          quarter_reset_at: new Date().toISOString().split('T')[0]
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('duplicate key value');
    });
  });
});

describe('WS-236 Feedback System Performance Functions', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser('supplier', 'photographer');
  });

  afterEach(async () => {
    if (testUser) {
      await supabase.from('feedback_rate_limits').delete().eq('user_id', testUser.id);
      await supabase.from('user_profiles').delete().eq('user_id', testUser.id);
      await supabase.auth.admin.deleteUser(testUser.id);
    }
  });

  describe('check_user_feedback_eligibility function', () => {
    it('should return eligible status for new user', async () => {
      const { data, error } = await supabase.rpc('check_user_feedback_eligibility', {
        p_user_id: testUser.id,
        p_feedback_type: 'nps'
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const eligibilityResult = JSON.parse(data);
      expect(eligibilityResult.eligible).toBe(true);
      expect(eligibilityResult.reason).toBe('eligible');
      expect(eligibilityResult.limits).toBeDefined();
    });

    it('should return ineligible when monthly limit exceeded', async () => {
      // Set up rate limit record with high counts
      await supabase.from('feedback_rate_limits').insert({
        user_id: testUser.id,
        feedback_count_this_month: 2,
        feedback_count_this_quarter: 2,
        month_reset_at: new Date().toISOString().split('T')[0],
        quarter_reset_at: new Date().toISOString().split('T')[0]
      });

      const { data, error } = await supabase.rpc('check_user_feedback_eligibility', {
        p_user_id: testUser.id,
        p_feedback_type: 'nps'
      });

      expect(error).toBeNull();
      const eligibilityResult = JSON.parse(data);
      expect(eligibilityResult.eligible).toBe(false);
      expect(eligibilityResult.reason).toBe('monthly_limit_exceeded');
    });
  });

  describe('get_nps_metrics function', () => {
    beforeEach(async () => {
      // Create test NPS surveys with different scores
      const session1 = await createTestFeedbackSession(testUser.id, 'nps');
      const session2 = await createTestFeedbackSession(testUser.id, 'nps');
      
      await supabase.from('nps_surveys').insert([
        {
          user_id: testUser.id,
          session_id: session1.id,
          score: 9,
          category: 'promoter',
          trigger_reason: 'quarterly_survey',
          completed_at: new Date().toISOString(),
          vendor_type: 'photographer'
        },
        {
          user_id: testUser.id,
          session_id: session2.id,
          score: 6,
          category: 'detractor',
          trigger_reason: 'milestone_reached',
          completed_at: new Date().toISOString(),
          vendor_type: 'photographer'
        }
      ]);

      // Update session user types
      await supabase
        .from('feedback_sessions')
        .update({ user_type: 'supplier' })
        .in('id', [session1.id, session2.id]);
    });

    it('should calculate NPS metrics with wedding industry segmentation', async () => {
      const { data, error } = await supabase.rpc('get_nps_metrics', {
        p_start_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        p_end_date: new Date().toISOString().split('T')[0] // Today
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      const npsMetrics = JSON.parse(data);
      expect(npsMetrics.overall).toBeDefined();
      expect(npsMetrics.overall.nps_score).toBeDefined();
      expect(npsMetrics.overall.promoters).toBe(1);
      expect(npsMetrics.overall.detractors).toBe(1);
      expect(npsMetrics.by_user_type).toBeDefined();
      expect(npsMetrics.by_vendor_type).toBeDefined();
    });
  });
});

describe('WS-236 Feedback System Analytics Functions', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser('supplier', 'photographer');
  });

  afterEach(async () => {
    if (testUser) {
      await supabase.from('feedback_analytics_daily').delete().gte('date', '2025-01-01');
      await supabase.rpc('cleanup_test_feedback_data', { test_user_id: testUser.id });
    }
  });

  describe('calculate_daily_feedback_analytics function', () => {
    it('should calculate and store daily analytics', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase.rpc('calculate_daily_feedback_analytics', {
        target_date: today
      });

      expect(error).toBeNull();

      // Verify analytics record was created
      const { data: analytics } = await supabase
        .from('feedback_analytics_daily')
        .select('*')
        .eq('date', today)
        .single();

      expect(analytics).toBeDefined();
      expect(analytics.date).toBe(today);
      expect(analytics.surveys_triggered).toBeGreaterThanOrEqual(0);
      expect(analytics.completion_rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('feedback_dashboard_summary materialized view', () => {
    it('should provide real-time dashboard metrics', async () => {
      const { data: summary, error } = await supabase
        .from('feedback_dashboard_summary')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(summary).toBeDefined();
      expect(summary.total_responses_30d).toBeGreaterThanOrEqual(0);
      expect(summary.nps_score_30d).toBeGreaterThanOrEqual(-100);
      expect(summary.nps_score_30d).toBeLessThanOrEqual(100);
      expect(summary.last_refreshed_at).toBeDefined();
    });
  });
});

describe('WS-236 Row Level Security Policies', () => {
  let supplierUser: any;
  let coupleUser: any;
  let adminUser: any;

  beforeEach(async () => {
    supplierUser = await createTestUser('supplier', 'photographer');
    coupleUser = await createTestUser('couple');
    
    // Create admin user
    adminUser = await createTestUser('supplier', 'planner');
    await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('user_id', adminUser.id);
  });

  afterEach(async () => {
    // Cleanup all test users
    for (const user of [supplierUser, coupleUser, adminUser]) {
      if (user) {
        await supabase.from('feedback_sessions').delete().eq('user_id', user.id);
        await supabase.from('user_profiles').delete().eq('user_id', user.id);
        await supabase.auth.admin.deleteUser(user.id);
      }
    }
  });

  it('should allow users to see only their own feedback sessions', async () => {
    // Create feedback session for supplier
    const supplierSession = await createTestFeedbackSession(supplierUser.id, 'nps');
    
    // Authenticate as supplier and try to read sessions
    await supabase.auth.signInWithPassword({
      email: supplierUser.email,
      password: 'testpassword123'
    });

    const { data: sessions, error } = await supabase
      .from('feedback_sessions')
      .select('*');

    expect(error).toBeNull();
    expect(sessions).toBeDefined();
    expect(sessions.length).toBe(1);
    expect(sessions[0].user_id).toBe(supplierUser.id);
  });

  it('should prevent users from seeing other users\' feedback', async () => {
    // Create sessions for both users
    await createTestFeedbackSession(supplierUser.id, 'nps');
    await createTestFeedbackSession(coupleUser.id, 'feature');
    
    // Authenticate as supplier
    await supabase.auth.signInWithPassword({
      email: supplierUser.email,
      password: 'testpassword123'
    });

    const { data: sessions } = await supabase
      .from('feedback_sessions')
      .select('*');

    // Should only see supplier's own session
    expect(sessions.length).toBe(1);
    expect(sessions[0].user_id).toBe(supplierUser.id);
  });

  it('should allow admin users to see all feedback data', async () => {
    // Create sessions for both regular users
    await createTestFeedbackSession(supplierUser.id, 'nps');
    await createTestFeedbackSession(coupleUser.id, 'feature');
    
    // Authenticate as admin
    await supabase.auth.signInWithPassword({
      email: adminUser.email,
      password: 'testpassword123'
    });

    const { data: sessions } = await supabase
      .from('feedback_sessions')
      .select('*');

    // Admin should see all sessions
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });
});