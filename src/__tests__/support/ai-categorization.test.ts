/**
 * WS-235: AI Categorization System - Test Suite
 *
 * Tests the AI-powered ticket categorization and routing system including:
 * - Pattern matching for wedding industry issues
 * - OpenAI GPT-4 classification fallback
 * - Wedding day urgency detection
 * - Agent assignment recommendations
 * - Multi-tier SLA calculations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY,
};

const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
);

// Mock request helper
function createMockRequest(method: string, body?: any) {
  return {
    method,
    json: async () => body || {},
    headers: new Headers(),
    url: 'http://localhost:3000/api/support/ai/categorize',
  };
}

describe('WS-235: AI Categorization System Tests', () => {
  let testOrganizationId: string;
  let testUserId: string;
  let testAgentId: string;

  beforeAll(async () => {
    console.log('🔧 Setting up AI categorization test data...');

    // Create test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'AI Test Wedding Studio',
        domain: 'ai-test-studio.com',
        subscription_tier: 'PROFESSIONAL',
      })
      .select()
      .single();

    testOrganizationId = org.id;

    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: `ai-test-${Date.now()}@wedsync-test.com`,
      password: 'test-password-123',
      email_confirm: true,
    });

    testUserId = user.user.id;

    await supabase.from('user_profiles').insert({
      user_id: testUserId,
      organization_id: testOrganizationId,
      role: 'admin',
    });

    // Create test agents with different specializations
    const { data: agent } = await supabase
      .from('support_agents')
      .insert({
        organization_id: testOrganizationId,
        user_id: testUserId,
        role: 'agent',
        skills: ['technical', 'wedding_day', 'billing'],
        is_available: true,
        is_wedding_day_specialist: true,
        max_concurrent_tickets: 5,
        current_ticket_count: 0,
        satisfaction_score: 4.8,
      })
      .select()
      .single();

    testAgentId = agent.id;

    console.log('✅ AI categorization test setup complete');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up AI categorization test data...');

    await supabase
      .from('ticket_classifications')
      .delete()
      .eq('organization_id', testOrganizationId);
    await supabase
      .from('support_agents')
      .delete()
      .eq('organization_id', testOrganizationId);
    await supabase.from('user_profiles').delete().eq('user_id', testUserId);
    await supabase.from('organizations').delete().eq('id', testOrganizationId);
    await supabase.auth.admin.deleteUser(testUserId);

    console.log('✅ AI categorization test cleanup complete');
  });

  describe('Pattern Matching Classification', () => {
    const patternTestCases = [
      {
        name: 'Website Down Emergency',
        subject: 'URGENT: Website completely down!',
        description:
          'Our photography website is not loading at all. Error 500 server error.',
        expectedCategory: 'technical',
        expectedSubcategory: 'website',
        expectedPriority: 'critical',
        expectedSlaLevel: 1,
        expectedConfidence: { min: 80, max: 100 },
      },
      {
        name: 'Payment Processing Failure',
        subject: 'Stripe payment failed for client',
        description: 'Payment was declined and invoice generation failed.',
        expectedCategory: 'billing',
        expectedSubcategory: 'payment_processing',
        expectedPriority: 'high',
        expectedSlaLevel: 2,
        expectedConfidence: { min: 70, max: 100 },
      },
      {
        name: 'Guest List Management',
        subject: 'Guest RSVP not working',
        description:
          'Guests cannot submit their RSVP responses and dietary requirements.',
        expectedCategory: 'guest_management',
        expectedSubcategory: 'rsvp',
        expectedPriority: 'high',
        expectedSlaLevel: 2,
        expectedConfidence: { min: 75, max: 100 },
      },
      {
        name: 'CRM Integration Issue',
        subject: 'Tave sync not working',
        description: 'Client data is not syncing from Tave to WedSync.',
        expectedCategory: 'integrations',
        expectedSubcategory: 'crm',
        expectedPriority: 'medium',
        expectedSlaLevel: 3,
        expectedConfidence: { min: 80, max: 100 },
      },
      {
        name: 'Account Setup Help',
        subject: 'How do I get started?',
        description:
          'I need help setting up my wedding photography business account.',
        expectedCategory: 'onboarding',
        expectedSubcategory: 'account_setup',
        expectedPriority: 'low',
        expectedSlaLevel: 4,
        expectedConfidence: { min: 70, max: 100 },
      },
    ];

    patternTestCases.forEach((testCase) => {
      it(`should correctly classify ${testCase.name} via pattern matching`, async () => {
        const { POST } = await import(
          '../../app/api/support/ai/categorize/route'
        );
        const request = createMockRequest('POST', {
          subject: testCase.subject,
          description: testCase.description,
          organizationId: testOrganizationId,
          userTier: 'PROFESSIONAL',
          requestAutoAssignment: true,
        });

        // Mock auth
        jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId },
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              expires_in: 3600,
              expires_at: Date.now() + 3600000,
              token_type: 'bearer',
            },
          },
          error: null,
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);

        const classification = responseData.classification;
        expect(classification.category).toBe(testCase.expectedCategory);
        expect(classification.slaLevel).toBe(testCase.expectedSlaLevel);
        expect(classification.confidence).toBeGreaterThanOrEqual(
          testCase.expectedConfidence.min,
        );
        expect(classification.confidence).toBeLessThanOrEqual(
          testCase.expectedConfidence.max,
        );

        // Should be classified via pattern matching for high confidence
        if (classification.confidence >= 70) {
          expect(classification.method).toBe('pattern');
        }

        console.log(
          `✅ ${testCase.name}: ${classification.confidence}% confidence, method: ${classification.method}`,
        );
      });
    });
  });

  describe('Wedding Day Urgency Detection', () => {
    it('should detect wedding day emergency (ceremony today)', async () => {
      const weddingToday = new Date();
      weddingToday.setHours(weddingToday.getHours() + 4); // 4 hours from now

      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', {
        subject: 'EMERGENCY: Photo gallery not working on wedding day!',
        description:
          "The couple's photo gallery is completely broken and the reception is in 4 hours. Guests cannot view or download photos!",
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: weddingToday.toISOString(),
        requestAutoAssignment: true,
      });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.urgency.urgencyScore).toBe(10); // Maximum urgency
      expect(responseData.urgency.isWeddingDayIssue).toBe(true);
      expect(responseData.urgency.hoursUntilWedding).toBeLessThanOrEqual(6);

      // Should be classified as critical priority
      expect(responseData.classification.priority).toBe('critical');
      expect(responseData.classification.slaLevel).toBe(1);

      // Should require wedding specialist
      expect(responseData.requirements.requiresWeddingSpecialist).toBe(true);

      // Should recommend wedding day specialist
      expect(responseData.agentRecommendation).toBeTruthy();
      expect(responseData.agentRecommendation.recommendedAgentId).toBe(
        testAgentId,
      );
    });

    it('should detect high urgency for wedding within 48 hours', async () => {
      const weddingTomorrow = new Date();
      weddingTomorrow.setHours(weddingTomorrow.getHours() + 24); // 24 hours from now

      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', {
        subject: 'Payment portal issues before wedding',
        description:
          'Final payment reminders are not being sent to guests and the wedding is tomorrow.',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: weddingTomorrow.toISOString(),
        requestAutoAssignment: true,
      });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.urgency.urgencyScore).toBeGreaterThanOrEqual(8);
      expect(responseData.urgency.isWeddingDayIssue).toBe(false); // Not same day
      expect(responseData.urgency.hoursUntilWedding).toBeCloseTo(24, 1);

      // Should have elevated priority
      expect(['high', 'critical']).toContain(
        responseData.classification.priority,
      );
    });

    it('should handle normal urgency for wedding in distant future', async () => {
      const futureWedding = new Date();
      futureWedding.setMonth(futureWedding.getMonth() + 3); // 3 months from now

      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', {
        subject: 'Question about guest list features',
        description:
          'How do I set up guest list management for my upcoming wedding?',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: futureWedding.toISOString(),
      });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.urgency.urgencyScore).toBeLessThanOrEqual(5);
      expect(responseData.urgency.isWeddingDayIssue).toBe(false);
      expect(responseData.classification.priority).toBe('low');
    });
  });

  describe('Agent Assignment Recommendations', () => {
    it('should recommend wedding specialist for wedding day issues', async () => {
      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', {
        subject: 'Venue coordination problem',
        description:
          "Having trouble coordinating with the wedding venue for tomorrow's event",
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), // 20 hours from now
        requestAutoAssignment: true,
      });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agentRecommendation).toBeTruthy();
      expect(responseData.agentRecommendation.recommendedAgentId).toBe(
        testAgentId,
      );
      expect(responseData.agentRecommendation.assignmentReason).toContain(
        'wedding',
      );
    });

    it('should handle no available agents gracefully', async () => {
      // Make agent unavailable
      await supabase
        .from('support_agents')
        .update({ is_available: false })
        .eq('id', testAgentId);

      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', {
        subject: 'Need help with technical issue',
        description:
          'Having a technical problem that needs immediate attention',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        requestAutoAssignment: true,
      });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(
        responseData.agentRecommendation.recommendedAgentId,
      ).toBeUndefined();
      expect(responseData.agentRecommendation.assignmentReason).toContain(
        'No available agents',
      );

      // Restore agent availability
      await supabase
        .from('support_agents')
        .update({ is_available: true })
        .eq('id', testAgentId);
    });
  });

  describe('Tier-based SLA Configuration', () => {
    const tierTestCases = [
      {
        tier: 'ENTERPRISE',
        priority: 'critical',
        expectedHours: 0.5,
        expectedLevel: 1,
      },
      {
        tier: 'PROFESSIONAL',
        priority: 'critical',
        expectedHours: 2,
        expectedLevel: 1,
      },
      {
        tier: 'STARTER',
        priority: 'critical',
        expectedHours: 4,
        expectedLevel: 1,
      },
      {
        tier: 'FREE',
        priority: 'critical',
        expectedHours: 24,
        expectedLevel: 1,
      },
      {
        tier: 'PROFESSIONAL',
        priority: 'high',
        expectedHours: 8,
        expectedLevel: 2,
      },
      {
        tier: 'PROFESSIONAL',
        priority: 'medium',
        expectedHours: 24,
        expectedLevel: 3,
      },
      {
        tier: 'PROFESSIONAL',
        priority: 'low',
        expectedHours: 72,
        expectedLevel: 4,
      },
    ];

    tierTestCases.forEach((testCase) => {
      it(`should set correct SLA for ${testCase.tier} tier ${testCase.priority} priority`, async () => {
        const { POST } = await import(
          '../../app/api/support/ai/categorize/route'
        );
        const request = createMockRequest('POST', {
          subject: `${testCase.priority.toUpperCase()} issue for ${testCase.tier}`,
          description: `This is a ${testCase.priority} priority issue that needs appropriate SLA`,
          organizationId: testOrganizationId,
          userTier: testCase.tier,
        });

        jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId },
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              expires_in: 3600,
              expires_at: Date.now() + 3600000,
              token_type: 'bearer',
            },
          },
          error: null,
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.classification.slaLevel).toBe(
          testCase.expectedLevel,
        );

        // Check SLA deadline is approximately correct
        const slaDeadline = new Date(responseData.classification.slaDeadline);
        const now = new Date();
        const deadlineHours =
          (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        expect(deadlineHours).toBeCloseTo(testCase.expectedHours, 1);

        console.log(
          `✅ ${testCase.tier} ${testCase.priority}: SLA level ${responseData.classification.slaLevel}, deadline in ${deadlineHours.toFixed(1)} hours`,
        );
      });
    });
  });

  describe('OpenAI Integration (if available)', () => {
    it('should fallback to AI classification for complex cases', async () => {
      if (!TEST_CONFIG.openaiApiKey) {
        console.log('⏭️ Skipping OpenAI tests - API key not configured');
        return;
      }

      const complexTicket = {
        subject: 'Strange issue with photo upload system',
        description:
          'Sometimes when I upload photos they appear corrupted but only on mobile devices when viewing in landscape mode during specific weather conditions.',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
      };

      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', complexTicket);

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      // For complex cases with low pattern matching confidence, should use AI
      if (responseData.classification.confidence < 70) {
        expect(responseData.classification.method).toBe('ai');
        expect(responseData.classification.reasoning).toBeTruthy();
      }

      console.log(
        `AI Classification: ${responseData.classification.category}/${responseData.classification.subcategory} (${responseData.classification.confidence}% confidence via ${responseData.classification.method})`,
      );
    }, 15000); // 15 second timeout for AI calls

    it('should handle AI service failures gracefully', async () => {
      // Test with invalid API key to simulate AI service failure
      const originalApiKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'invalid-key-12345';

      const { POST } = await import(
        '../../app/api/support/ai/categorize/route'
      );
      const request = createMockRequest('POST', {
        subject: 'Complex categorization test',
        description:
          'This is a complex issue that should trigger AI classification but fail',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
      });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      // Should fallback to default classification
      expect(responseData.classification.category).toBeDefined();
      expect(responseData.classification.reasoning).toContain('Fallback');

      // Restore original API key
      process.env.OPENAI_API_KEY = originalApiKey;
    });
  });

  describe('GET /api/support/ai/categorize - Analytics', () => {
    it('should return classification patterns', async () => {
      const { GET } = await import('../../app/api/support/ai/categorize/route');
      const request = createMockRequest('GET');
      request.url += '?action=patterns';

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.patterns).toBeDefined();
      expect(Array.isArray(responseData.patterns)).toBe(true);
      expect(responseData.patterns.length).toBeGreaterThan(0);

      // Check pattern structure
      const firstPattern = responseData.patterns[0];
      expect(firstPattern).toHaveProperty('id');
      expect(firstPattern).toHaveProperty('category');
      expect(firstPattern).toHaveProperty('priority');
      expect(firstPattern).toHaveProperty('keywords');
    });

    it('should return classification statistics', async () => {
      // First create some classification records
      await supabase.from('ticket_classifications').insert([
        {
          organization_id: testOrganizationId,
          user_id: testUserId,
          subject: 'Test Classification 1',
          description: 'Test',
          category: 'technical',
          priority: 'high',
          classification_method: 'pattern',
          confidence_score: 85,
        },
        {
          organization_id: testOrganizationId,
          user_id: testUserId,
          subject: 'Test Classification 2',
          description: 'Test',
          category: 'billing',
          priority: 'medium',
          classification_method: 'ai',
          confidence_score: 72,
        },
      ]);

      const { GET } = await import('../../app/api/support/ai/categorize/route');
      const request = createMockRequest('GET');
      request.url += '?action=stats';

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.stats).toBeDefined();
      expect(responseData.stats.totalClassifications).toBeGreaterThanOrEqual(2);
      expect(responseData.stats.categoryDistribution).toHaveProperty(
        'technical',
      );
      expect(responseData.stats.categoryDistribution).toHaveProperty('billing');
      expect(responseData.stats.methodDistribution).toHaveProperty('pattern');
      expect(responseData.stats.methodDistribution).toHaveProperty('ai');
      expect(responseData.stats.averageConfidence).toBeGreaterThan(0);
    });
  });
});
