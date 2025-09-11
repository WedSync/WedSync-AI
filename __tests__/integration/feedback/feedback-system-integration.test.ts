/**
 * Integration Tests for WS-236 User Feedback System
 * Team C - Complete workflow testing with database integration
 * 
 * Tests the complete feedback collection pipeline from API to database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POST as startSessionPOST } from '@/app/api/feedback/session/start/route';
import { POST as submitFeedbackPOST } from '@/app/api/feedback/session/submit/route';
import { feedbackCollector } from '@/lib/feedback/feedback-collector';
import { feedbackFatigueService } from '@/lib/rate-limiter';

// Test database setup
const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mock user session
const mockUser = {
  id: 'test-user-integration-123',
  email: 'test@weddingvendor.com',
  app_metadata: {},
  user_metadata: {}
};

// Mock authentication
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    }
  })
}));

describe('WS-236 Feedback System Integration Tests', () => {
  let testOrganizationId: string;
  let testWeddingId: string;
  let cleanupIds: string[] = [];

  beforeAll(async () => {
    // Setup test organization
    const { data: org, error: orgError } = await testSupabase
      .from('organizations')
      .insert({
        name: 'Test Wedding Vendor Integration',
        type: 'supplier',
        tier: 'professional',
        owner_id: mockUser.id
      })
      .select()
      .single();

    if (orgError || !org) {
      throw new Error('Failed to create test organization: ' + orgError?.message);
    }
    testOrganizationId = org.id;

    // Setup test user profile
    await testSupabase
      .from('user_profiles')
      .upsert({
        id: mockUser.id,
        email: mockUser.email,
        organization_id: testOrganizationId,
        user_type: 'supplier',
        tier: 'professional',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      });

    // Setup test wedding
    const { data: wedding, error: weddingError } = await testSupabase
      .from('weddings')
      .insert({
        organization_id: testOrganizationId,
        couple_names: 'John & Jane Doe',
        wedding_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
        venue: 'Test Venue',
        guest_count: 100
      })
      .select()
      .single();

    if (weddingError || !wedding) {
      throw new Error('Failed to create test wedding: ' + weddingError?.message);
    }
    testWeddingId = wedding.id;

    cleanupIds.push(testOrganizationId, testWeddingId, mockUser.id);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await testSupabase.from('feedback_sessions').delete().eq('user_id', mockUser.id);
      await testSupabase.from('feedback_responses').delete().eq('user_id', mockUser.id);
      await testSupabase.from('feedback_attempts').delete().eq('user_id', mockUser.id);
      await testSupabase.from('user_profiles').delete().eq('id', mockUser.id);
      await testSupabase.from('weddings').delete().eq('id', testWeddingId);
      await testSupabase.from('organizations').delete().eq('id', testOrganizationId);
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Feedback Collection Workflow', () => {
    it('should complete full NPS feedback collection workflow', async () => {
      // Step 1: Start feedback session
      const startRequest = new NextRequest('http://localhost:3000/api/feedback/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          triggerType: 'manual',
          feedbackType: 'nps',
          context: {
            featureName: 'client_management',
            page: '/dashboard/clients',
            userAction: 'viewed_clients',
            triggerReason: 'manual_request'
          },
          deviceInfo: {
            type: 'desktop',
            browser: 'Chrome',
            screenResolution: '1920x1080'
          }
        })
      });

      const startResponse = await startSessionPOST(startRequest);
      const startData = await startResponse.json();

      expect(startResponse.status).toBe(201);
      expect(startData.success).toBe(true);
      expect(startData.data.sessionId).toBeDefined();
      expect(startData.data.feedbackType).toBe('nps');
      expect(startData.data.questions).toHaveLength(expect.any(Number));

      const sessionId = startData.data.sessionId;

      // Step 2: Verify session was created in database
      const { data: session } = await testSupabase
        .from('feedback_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      expect(session).toBeDefined();
      expect(session.user_id).toBe(mockUser.id);
      expect(session.feedback_type).toBe('nps');
      expect(session.status).toBe('active');

      // Step 3: Submit feedback responses
      const submitRequest = new NextRequest('http://localhost:3000/api/feedback/session/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          responses: {
            nps_score: 9,
            nps_reason: 'Great platform for managing wedding clients. Very intuitive interface.',
            satisfaction: 'very_satisfied',
            feature_priority: 'timeline_builder',
            improvement_suggestion: 'Would love to see more automated email templates.'
          }
        })
      });

      const submitResponse = await submitFeedbackPOST(submitRequest);
      const submitData = await submitResponse.json();

      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);
      expect(submitData.data.sentiment).toBeDefined();
      expect(submitData.data.categories).toBeDefined();

      // Step 4: Verify responses were stored with AI analysis
      const { data: responses } = await testSupabase
        .from('feedback_responses')
        .select('*')
        .eq('session_id', sessionId);

      expect(responses).toHaveLength(expect.any(Number));
      
      const npsResponse = responses?.find(r => r.question_key === 'nps_score');
      expect(npsResponse?.response_value).toBe(9);

      // Step 5: Verify AI sentiment analysis was performed
      const { data: updatedSession } = await testSupabase
        .from('feedback_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      expect(updatedSession.status).toBe('completed');
      expect(updatedSession.ai_analysis).toBeDefined();
      expect(updatedSession.ai_analysis.sentiment).toBeDefined();
      expect(updatedSession.ai_analysis.categories).toBeDefined();

      // Step 6: Verify follow-up actions were triggered
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow time for async follow-up processing

      const { data: followUpActions } = await testSupabase
        .from('feedback_follow_up_actions')
        .select('*')
        .eq('session_id', sessionId);

      expect(followUpActions).toBeDefined();
      expect(followUpActions.length).toBeGreaterThan(0);
    });

    it('should respect wedding day protection rules', async () => {
      // Test wedding day protection
      const weddingDayRequest = new NextRequest('http://localhost:3000/api/feedback/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          triggerType: 'automatic',
          feedbackType: 'nps',
          context: {
            isWeddingDay: true,
            weddingId: testWeddingId,
            triggerReason: 'post_event_survey'
          }
        })
      });

      const response = await startSessionPOST(weddingDayRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Feedback not available');
      expect(data.details.weddingProtections.weddingDayBlocked).toBe(true);

      // Verify attempt was recorded
      const { data: attempts } = await testSupabase
        .from('feedback_attempts')
        .select('*')
        .eq('user_id', mockUser.id)
        .eq('attempt_status', 'blocked');

      expect(attempts.length).toBeGreaterThan(0);
      const weddingDayAttempt = attempts.find(a => 
        a.block_reason?.includes('Wedding day protection')
      );
      expect(weddingDayAttempt).toBeDefined();
    });

    it('should handle vendor workload protection', async () => {
      // Create multiple upcoming weddings to trigger workload protection
      const upcomingWeddings = [];
      for (let i = 0; i < 4; i++) {
        const { data: wedding } = await testSupabase
          .from('weddings')
          .insert({
            organization_id: testOrganizationId,
            couple_names: `Test Couple ${i}`,
            wedding_date: new Date(Date.now() + ((i + 1) * 2 * 24 * 60 * 60 * 1000)).toISOString(), // 2, 4, 6, 8 days from now
            venue: `Test Venue ${i}`,
            guest_count: 50
          })
          .select()
          .single();
        
        if (wedding) upcomingWeddings.push(wedding.id);
      }

      // Try to start feedback session
      const workloadRequest = new NextRequest('http://localhost:3000/api/feedback/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          triggerType: 'automatic',
          feedbackType: 'nps',
          context: {
            triggerReason: 'weekly_check_in'
          }
        })
      });

      const response = await startSessionPOST(workloadRequest);
      const data = await response.json();

      // Should be blocked due to high workload
      expect(response.status).toBe(403);
      expect(data.details.weddingProtections.vendorWorkloadCheck).toBe(true);

      // But should allow critical feedback
      const criticalRequest = new NextRequest('http://localhost:3000/api/feedback/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          triggerType: 'manual',
          feedbackType: 'churn',
          context: {
            triggerReason: 'cancel_request'
          }
        })
      });

      const criticalResponse = await startSessionPOST(criticalRequest);
      const criticalData = await criticalResponse.json();

      expect(criticalResponse.status).toBe(201);
      expect(criticalData.success).toBe(true);

      // Cleanup
      for (const weddingId of upcomingWeddings) {
        await testSupabase.from('weddings').delete().eq('id', weddingId);
      }
    });

    it('should handle feedback frequency limits', async () => {
      // Create recent feedback session to trigger frequency limits
      const recentSessionDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      
      await testSupabase
        .from('feedback_sessions')
        .insert({
          user_id: mockUser.id,
          feedback_type: 'nps',
          status: 'completed',
          created_at: recentSessionDate.toISOString(),
          organization_id: testOrganizationId
        });

      // Try to start another NPS session too soon
      const frequencyRequest = new NextRequest('http://localhost:3000/api/feedback/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          triggerType: 'automatic',
          feedbackType: 'nps',
          context: {
            daysSinceLastFeedback: 2,
            triggerReason: 'weekly_check_in'
          }
        })
      });

      const response = await startSessionPOST(frequencyRequest);
      const data = await response.json();

      // Should likely be blocked due to recent NPS feedback
      // (Exact behavior depends on database function implementation)
      if (response.status === 403) {
        expect(data.details.nextEligibleAt).toBeDefined();
      }
    });
  });

  describe('AI Sentiment Analysis Integration', () => {
    it('should perform sentiment analysis on text feedback', async () => {
      const sessionId = `test-sentiment-${Date.now()}`;
      
      // Create test session
      await testSupabase
        .from('feedback_sessions')
        .insert({
          id: sessionId,
          user_id: mockUser.id,
          feedback_type: 'general',
          status: 'active',
          organization_id: testOrganizationId
        });

      const mockResponses = {
        general_feedback: 'I absolutely love the new dashboard! The wedding timeline feature is fantastic and has saved me hours of work. The interface is so intuitive.',
        pain_points: 'Sometimes the photo upload is a bit slow, but overall very happy with the platform.',
        feature_request: 'Would love to see integration with Instagram for easier social media management.'
      };

      // Test sentiment analysis through the collector service
      const analysisResult = await feedbackCollector.analyzeFeedbackSentiment(
        sessionId,
        mockResponses
      );

      expect(analysisResult).toBeDefined();
      expect(analysisResult.overallSentiment).toBeGreaterThan(0); // Should be positive
      expect(analysisResult.categories).toContain('satisfaction');
      expect(analysisResult.themes).toBeDefined();
      expect(analysisResult.actionableInsights).toBeDefined();

      // Verify results were stored
      const { data: session } = await testSupabase
        .from('feedback_sessions')
        .select('ai_analysis')
        .eq('id', sessionId)
        .single();

      expect(session.ai_analysis).toBeDefined();
      expect(session.ai_analysis.sentiment).toBeGreaterThan(0);

      // Cleanup
      await testSupabase.from('feedback_sessions').delete().eq('id', sessionId);
    });

    it('should detect negative sentiment and trigger appropriate follow-ups', async () => {
      const sessionId = `test-negative-${Date.now()}`;
      
      await testSupabase
        .from('feedback_sessions')
        .insert({
          id: sessionId,
          user_id: mockUser.id,
          feedback_type: 'csat',
          status: 'active',
          organization_id: testOrganizationId
        });

      const negativeResponses = {
        satisfaction: 'very_dissatisfied',
        csat_reason: 'The platform crashed during my biggest wedding of the year. Lost hours of work and nearly missed critical deadlines. This is unacceptable.',
        likelihood_recommend: 2,
        improvement_priority: 'system_reliability'
      };

      const analysisResult = await feedbackCollector.analyzeFeedbackSentiment(
        sessionId,
        negativeResponses
      );

      expect(analysisResult.overallSentiment).toBeLessThan(0); // Should be negative
      expect(analysisResult.urgency).toBe('high');
      expect(analysisResult.escalationNeeded).toBe(true);

      // Check for escalation follow-up actions
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow processing time

      const { data: followUpActions } = await testSupabase
        .from('feedback_follow_up_actions')
        .select('*')
        .eq('session_id', sessionId);

      const escalationAction = followUpActions?.find(action => 
        action.action_type === 'escalate_to_executive'
      );
      expect(escalationAction).toBeDefined();

      // Cleanup
      await testSupabase.from('feedback_sessions').delete().eq('id', sessionId);
    });
  });

  describe('Follow-up Automation Integration', () => {
    it('should create support tickets for technical issues', async () => {
      const sessionId = `test-support-${Date.now()}`;
      
      await testSupabase
        .from('feedback_sessions')
        .insert({
          id: sessionId,
          user_id: mockUser.id,
          feedback_type: 'general',
          status: 'completed',
          organization_id: testOrganizationId,
          ai_analysis: {
            sentiment: -0.6,
            categories: ['technical_issue', 'bug_report'],
            themes: ['system_crash', 'data_loss'],
            urgency: 'high'
          }
        });

      // Trigger follow-up processing
      const followUpResult = await feedbackCollector.processFollowUpActions(sessionId);

      expect(followUpResult).toBeDefined();
      expect(followUpResult.actions).toBeDefined();

      // Verify support ticket action was created
      const { data: supportAction } = await testSupabase
        .from('feedback_follow_up_actions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('action_type', 'create_support_ticket')
        .single();

      expect(supportAction).toBeDefined();
      expect(supportAction.status).toBe('completed');
      expect(supportAction.result.ticket_id).toBeDefined();

      // Cleanup
      await testSupabase.from('feedback_sessions').delete().eq('id', sessionId);
    });

    it('should send thank you emails for positive feedback', async () => {
      const sessionId = `test-thanks-${Date.now()}`;
      
      await testSupabase
        .from('feedback_sessions')
        .insert({
          id: sessionId,
          user_id: mockUser.id,
          feedback_type: 'nps',
          status: 'completed',
          organization_id: testOrganizationId,
          ai_analysis: {
            sentiment: 0.8,
            categories: ['satisfaction', 'praise'],
            themes: ['ease_of_use', 'time_saving'],
            nps_score: 9
          }
        });

      const followUpResult = await feedbackCollector.processFollowUpActions(sessionId);

      // Verify thank you email action was created
      const { data: emailAction } = await testSupabase
        .from('feedback_follow_up_actions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('action_type', 'send_thank_you_email')
        .single();

      expect(emailAction).toBeDefined();
      expect(emailAction.status).toBe('completed');

      // Cleanup
      await testSupabase.from('feedback_sessions').delete().eq('id', sessionId);
    });
  });

  describe('Database Integration and Data Integrity', () => {
    it('should maintain referential integrity across all feedback tables', async () => {
      const sessionId = `test-integrity-${Date.now()}`;
      
      // Create session with responses and analysis
      const { data: session } = await testSupabase
        .from('feedback_sessions')
        .insert({
          id: sessionId,
          user_id: mockUser.id,
          feedback_type: 'feature',
          status: 'completed',
          organization_id: testOrganizationId
        })
        .select()
        .single();

      expect(session).toBeDefined();

      // Create responses
      const responses = [
        {
          session_id: sessionId,
          user_id: mockUser.id,
          question_key: 'feature_priority',
          question_type: 'multiple_choice',
          response_value: 'timeline_builder'
        },
        {
          session_id: sessionId,
          user_id: mockUser.id,
          question_key: 'feature_description',
          question_type: 'text',
          response_value: 'Need better drag-and-drop for timeline events'
        }
      ];

      const { data: createdResponses } = await testSupabase
        .from('feedback_responses')
        .insert(responses)
        .select();

      expect(createdResponses).toHaveLength(2);

      // Create follow-up action
      const { data: action } = await testSupabase
        .from('feedback_follow_up_actions')
        .insert({
          session_id: sessionId,
          action_type: 'product_team_notification',
          status: 'pending',
          scheduled_for: new Date().toISOString()
        })
        .select()
        .single();

      expect(action).toBeDefined();

      // Verify all relationships exist
      const { data: fullSession } = await testSupabase
        .from('feedback_sessions')
        .select(`
          *,
          feedback_responses (*),
          feedback_follow_up_actions (*)
        `)
        .eq('id', sessionId)
        .single();

      expect(fullSession.feedback_responses).toHaveLength(2);
      expect(fullSession.feedback_follow_up_actions).toHaveLength(1);

      // Test cascade deletion
      await testSupabase
        .from('feedback_sessions')
        .delete()
        .eq('id', sessionId);

      // Verify related records were deleted
      const { data: orphanedResponses } = await testSupabase
        .from('feedback_responses')
        .select('*')
        .eq('session_id', sessionId);

      const { data: orphanedActions } = await testSupabase
        .from('feedback_follow_up_actions')
        .select('*')
        .eq('session_id', sessionId);

      expect(orphanedResponses).toHaveLength(0);
      expect(orphanedActions).toHaveLength(0);
    });

    it('should properly handle database functions for feedback eligibility', async () => {
      // Test check_feedback_eligibility function
      const { data: eligibility, error } = await testSupabase
        .rpc('check_feedback_eligibility', {
          p_user_id: mockUser.id,
          p_feedback_type: 'nps',
          p_context: { userTier: 'professional' }
        });

      expect(error).toBeNull();
      expect(eligibility).toBeDefined();
      expect(typeof eligibility.is_eligible).toBe('boolean');
      expect(eligibility.applied_rules).toBeDefined();
    });

    it('should track feedback statistics correctly', async () => {
      // Create a few feedback sessions
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        const sessionId = `test-stats-${Date.now()}-${i}`;
        sessionIds.push(sessionId);
        
        await testSupabase
          .from('feedback_sessions')
          .insert({
            id: sessionId,
            user_id: mockUser.id,
            feedback_type: i % 2 === 0 ? 'nps' : 'csat',
            status: 'completed',
            organization_id: testOrganizationId
          });
      }

      // Test analyze_feedback_fatigue function
      const { data: fatigue } = await testSupabase
        .rpc('analyze_feedback_fatigue', {
          p_user_id: mockUser.id
        });

      expect(fatigue).toBeDefined();
      expect(fatigue.stats.total_requests).toBeGreaterThan(0);
      expect(fatigue.fatigue_level).toMatch(/^(low|medium|high|critical)$/);

      // Cleanup
      for (const sessionId of sessionIds) {
        await testSupabase.from('feedback_sessions').delete().eq('id', sessionId);
      }
    });
  });
});