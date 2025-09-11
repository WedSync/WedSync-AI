/**
 * WS-235: Support Tickets API - Comprehensive Test Suite
 *
 * Tests the complete support ticket management system including:
 * - CRUD operations for tickets
 * - Wedding day priority handling
 * - SLA deadline calculation
 * - Multi-tenant data isolation
 * - Tier-based access controls
 * - Agent assignment workflows
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
import { NextRequest } from 'next/server';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  testOrgId: 'test-org-' + Date.now(),
  testUserId: 'test-user-' + Date.now(),
};

// Initialize test client
const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
);

// Mock request helper
function createMockRequest(
  method: string,
  body?: any,
  headers?: Record<string, string>,
) {
  return {
    method,
    json: async () => body || {},
    headers: new Headers(headers),
    url: 'http://localhost:3000/api/support/tickets',
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  } as NextRequest;
}

describe('WS-235: Support Tickets API Tests', () => {
  let testOrganizationId: string;
  let testUserId: string;
  let testAgentId: string;
  let sampleTicketId: string;

  beforeAll(async () => {
    // Setup test data
    console.log('🔧 Setting up test data...');

    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Wedding Photography Studio',
        domain: 'test-studio.com',
        subscription_tier: 'PROFESSIONAL',
        settings: {
          support_enabled: true,
          wedding_day_alerts: true,
        },
      })
      .select()
      .single();

    if (orgError)
      throw new Error(`Failed to create test org: ${orgError.message}`);
    testOrganizationId = org.id;

    // Create test user
    const { data: user, error: userError } =
      await supabase.auth.admin.createUser({
        email: `test-${Date.now()}@wedsync-test.com`,
        password: 'test-password-123',
        email_confirm: true,
      });

    if (userError)
      throw new Error(`Failed to create test user: ${userError.message}`);
    testUserId = user.user.id;

    // Create user profile
    await supabase.from('user_profiles').insert({
      user_id: testUserId,
      organization_id: testOrganizationId,
      role: 'admin',
      first_name: 'Test',
      last_name: 'User',
    });

    // Create test support agent
    const { data: agent, error: agentError } = await supabase
      .from('support_agents')
      .insert({
        organization_id: testOrganizationId,
        user_id: testUserId,
        role: 'agent',
        skills: ['technical', 'billing', 'wedding_day'],
        is_available: true,
        is_wedding_day_specialist: true,
        max_concurrent_tickets: 10,
        current_ticket_count: 0,
      })
      .select()
      .single();

    if (agentError)
      throw new Error(`Failed to create test agent: ${agentError.message}`);
    testAgentId = agent.id;

    console.log('✅ Test data setup complete');
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('🧹 Cleaning up test data...');

    try {
      // Delete in reverse dependency order
      await supabase
        .from('support_tickets')
        .delete()
        .eq('organization_id', testOrganizationId);
      await supabase
        .from('support_agents')
        .delete()
        .eq('organization_id', testOrganizationId);
      await supabase.from('user_profiles').delete().eq('user_id', testUserId);
      await supabase
        .from('organizations')
        .delete()
        .eq('id', testOrganizationId);
      await supabase.auth.admin.deleteUser(testUserId);
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    console.log('✅ Test data cleanup complete');
  });

  beforeEach(() => {
    // Reset any test state between tests
    jest.clearAllMocks();
  });

  describe('POST /api/support/tickets - Create Ticket', () => {
    it('should create a basic support ticket successfully', async () => {
      const ticketData = {
        subject: 'Test Support Ticket',
        description: 'This is a test support ticket for the API',
        priority: 'medium',
        category: 'technical',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
      };

      // Import the actual route handler
      const { POST } = await import('../../app/api/support/tickets/route');
      const request = createMockRequest('POST', ticketData);

      // Mock auth session
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

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.ticket).toHaveProperty('id');
      expect(responseData.ticket.subject).toBe(ticketData.subject);
      expect(responseData.ticket.status).toBe('open');

      // Store for later tests
      sampleTicketId = responseData.ticket.id;
    });

    it('should handle wedding day emergency tickets with highest priority', async () => {
      const weddingDate = new Date();
      weddingDate.setHours(weddingDate.getHours() + 4); // 4 hours from now

      const emergencyTicket = {
        subject: 'URGENT: Website down on wedding day!',
        description:
          'Our website is completely down and the wedding is in 4 hours. Guests cannot access their invitations!',
        priority: 'high',
        category: 'technical',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: weddingDate.toISOString(),
        isWeddingDayIssue: true,
      };

      const { POST } = await import('../../app/api/support/tickets/route');
      const request = createMockRequest('POST', emergencyTicket);

      // Mock auth session
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

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.ticket.priority).toBe('critical'); // Should be auto-escalated
      expect(responseData.ticket.is_wedding_day_issue).toBe(true);
      expect(responseData.ticket.urgency_score).toBeGreaterThanOrEqual(9);

      // Should have very short SLA deadline (1 hour for wedding day emergency)
      const slaDeadline = new Date(responseData.ticket.sla_response_deadline);
      const now = new Date();
      const deadlineHours =
        (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(deadlineHours).toBeLessThanOrEqual(1);
    });

    it('should assign ticket to wedding day specialist for wedding issues', async () => {
      const weddingTicket = {
        subject: 'Guest list not syncing properly',
        description:
          'The guest list changes are not showing up on the wedding website',
        priority: 'high',
        category: 'guest_management',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 1 week from now
        requestAutoAssignment: true,
      };

      const { POST } = await import('../../app/api/support/tickets/route');
      const request = createMockRequest('POST', weddingTicket);

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

      expect(response.status).toBe(201);
      expect(responseData.ticket.assigned_agent_id).toBe(testAgentId);
      expect(responseData.assignment_reasoning).toContain('wedding');
    });

    it('should respect tier-based SLA deadlines', async () => {
      const testCases = [
        { tier: 'ENTERPRISE', expectedHours: 0.5 }, // 30 minutes for critical
        { tier: 'PROFESSIONAL', expectedHours: 2 }, // 2 hours for critical
        { tier: 'STARTER', expectedHours: 4 }, // 4 hours for critical
        { tier: 'FREE', expectedHours: 24 }, // 24 hours for critical
      ];

      for (const testCase of testCases) {
        const ticketData = {
          subject: `Critical issue for ${testCase.tier} tier`,
          description: 'This is a critical priority ticket',
          priority: 'critical',
          category: 'technical',
          organizationId: testOrganizationId,
          userTier: testCase.tier,
        };

        const { POST } = await import('../../app/api/support/tickets/route');
        const request = createMockRequest('POST', ticketData);

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

        expect(response.status).toBe(201);

        // Check SLA deadline matches tier expectations
        const slaDeadline = new Date(responseData.ticket.sla_response_deadline);
        const now = new Date();
        const deadlineHours =
          (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        expect(deadlineHours).toBeCloseTo(testCase.expectedHours, 1);
      }
    });

    it('should reject tickets with missing required fields', async () => {
      const invalidTickets = [
        { description: 'Missing subject' }, // No subject
        { subject: 'Missing description' }, // No description
        { subject: 'Test', description: 'Test' }, // No organizationId
      ];

      const { POST } = await import('../../app/api/support/tickets/route');

      for (const invalidTicket of invalidTickets) {
        const request = createMockRequest('POST', invalidTicket);
        const response = await POST(request);

        expect(response.status).toBe(400);
        const responseData = await response.json();
        expect(responseData.error).toContain('required');
      }
    });

    it('should enforce multi-tenant data isolation', async () => {
      // Create another organization
      const { data: otherOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Other Test Studio',
          domain: 'other-test.com',
          subscription_tier: 'STARTER',
        })
        .select()
        .single();

      const ticketData = {
        subject: 'Unauthorized access attempt',
        description: 'Trying to create ticket for different organization',
        priority: 'medium',
        category: 'technical',
        organizationId: otherOrg.id, // Different organization
        userTier: 'PROFESSIONAL',
      };

      const { POST } = await import('../../app/api/support/tickets/route');
      const request = createMockRequest('POST', ticketData);

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId }, // User belongs to testOrganizationId, not otherOrg.id
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

      expect(response.status).toBe(403);
      const responseData = await response.json();
      expect(responseData.error).toContain('Access denied');

      // Cleanup
      await supabase.from('organizations').delete().eq('id', otherOrg.id);
    });
  });

  describe('GET /api/support/tickets - List Tickets', () => {
    it('should list tickets with proper filtering and pagination', async () => {
      // Create test tickets with different statuses
      const testTickets = [
        { subject: 'Open Ticket 1', status: 'open', priority: 'high' },
        {
          subject: 'In Progress Ticket',
          status: 'in_progress',
          priority: 'medium',
        },
        { subject: 'Closed Ticket', status: 'closed', priority: 'low' },
      ];

      for (const ticket of testTickets) {
        await supabase.from('support_tickets').insert({
          ...ticket,
          description: 'Test ticket description',
          organization_id: testOrganizationId,
          user_tier: 'PROFESSIONAL',
          category: 'technical',
        });
      }

      const { GET } = await import('../../app/api/support/tickets/route');

      // Test basic listing
      let request = createMockRequest('GET');
      request.nextUrl.searchParams.set('status', 'open');

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

      let response = await GET(request);
      let responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.tickets).toHaveLength(2); // Open + In Progress (both active)
      expect(responseData.pagination).toHaveProperty('total');

      // Test priority filtering
      request = createMockRequest('GET');
      request.nextUrl.searchParams.set('priority', 'high');

      response = await GET(request);
      responseData = await response.json();

      expect(response.status).toBe(200);
      const highPriorityTickets = responseData.tickets.filter(
        (t) => t.priority === 'high',
      );
      expect(highPriorityTickets.length).toBeGreaterThan(0);
    });

    it("should only return tickets from user's organization", async () => {
      // Create ticket in another organization
      const { data: otherOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Another Studio',
          domain: 'another.com',
          subscription_tier: 'PROFESSIONAL',
        })
        .select()
        .single();

      await supabase.from('support_tickets').insert({
        subject: 'Other Organization Ticket',
        description: 'This should not be visible',
        organization_id: otherOrg.id,
        status: 'open',
        priority: 'high',
        category: 'technical',
        user_tier: 'PROFESSIONAL',
      });

      const { GET } = await import('../../app/api/support/tickets/route');
      const request = createMockRequest('GET');

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

      // Verify all tickets belong to the user's organization
      responseData.tickets.forEach((ticket) => {
        expect(ticket.organization_id).toBe(testOrganizationId);
      });

      // Cleanup
      await supabase
        .from('support_tickets')
        .delete()
        .eq('organization_id', otherOrg.id);
      await supabase.from('organizations').delete().eq('id', otherOrg.id);
    });
  });

  describe('PUT /api/support/tickets/[id] - Update Ticket', () => {
    it('should update ticket status and track SLA events', async () => {
      // Create a test ticket first
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Test Update Ticket',
          description: 'Ticket for testing updates',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'medium',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
        })
        .select()
        .single();

      const updateData = {
        status: 'in_progress',
        assigned_agent_id: testAgentId,
        resolution_notes: 'Working on this issue now',
      };

      const { PUT } = await import('../../app/api/support/tickets/[id]/route');
      const request = createMockRequest('PUT', updateData);

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

      // Mock the dynamic route parameter
      const response = await PUT(request, { params: { id: ticket.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.ticket.status).toBe('in_progress');
      expect(responseData.ticket.assigned_agent_id).toBe(testAgentId);

      // Verify first response time was recorded
      expect(responseData.ticket.first_response_at).toBeTruthy();
    });

    it('should prevent unauthorized updates across organizations', async () => {
      // Create ticket in another organization
      const { data: otherOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Unauthorized Studio',
          domain: 'unauthorized.com',
          subscription_tier: 'PROFESSIONAL',
        })
        .select()
        .single();

      const { data: unauthorizedTicket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Unauthorized Access Test',
          description: 'Should not be updateable',
          organization_id: otherOrg.id,
          status: 'open',
          priority: 'medium',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
        })
        .select()
        .single();

      const { PUT } = await import('../../app/api/support/tickets/[id]/route');
      const request = createMockRequest('PUT', { status: 'closed' });

      jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: { id: testUserId }, // User from testOrganizationId trying to update otherOrg ticket
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const response = await PUT(request, {
        params: { id: unauthorizedTicket.id },
      });

      expect(response.status).toBe(404); // Should not find ticket due to RLS

      // Cleanup
      await supabase
        .from('support_tickets')
        .delete()
        .eq('id', unauthorizedTicket.id);
      await supabase.from('organizations').delete().eq('id', otherOrg.id);
    });
  });

  describe('Wedding Day Emergency Scenarios', () => {
    it('should handle Saturday wedding emergency with maximum urgency', async () => {
      // Create a Saturday wedding date (tomorrow if not Saturday, otherwise today)
      const now = new Date();
      const dayOfWeek = now.getDay();
      let saturdayWedding = new Date(now);

      if (dayOfWeek === 6) {
        // Today is Saturday
        saturdayWedding.setHours(now.getHours() + 2); // 2 hours from now
      } else {
        // Next Saturday
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
        saturdayWedding.setDate(now.getDate() + daysUntilSaturday);
        saturdayWedding.setHours(14, 0, 0); // 2 PM ceremony
      }

      const emergencyTicket = {
        subject: 'CRITICAL: Payment system down on wedding day!',
        description:
          'The entire payment processing system is down and guests cannot pay for their meals. The wedding reception starts in 2 hours!',
        priority: 'critical',
        category: 'billing',
        subcategory: 'payment_processing',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
        weddingDate: saturdayWedding.toISOString(),
        isWeddingDayIssue: true,
        requestAutoAssignment: true,
      };

      const { POST } = await import('../../app/api/support/tickets/route');
      const request = createMockRequest('POST', emergencyTicket);

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

      expect(response.status).toBe(201);
      expect(responseData.ticket.priority).toBe('critical');
      expect(responseData.ticket.urgency_score).toBe(10); // Maximum urgency
      expect(responseData.ticket.is_wedding_day_issue).toBe(true);

      // Should be assigned to wedding day specialist
      expect(responseData.ticket.assigned_agent_id).toBe(testAgentId);

      // Should have immediate SLA (15-30 minutes max)
      const slaDeadline = new Date(responseData.ticket.sla_response_deadline);
      const slaMinutes = (slaDeadline.getTime() - now.getTime()) / (1000 * 60);
      expect(slaMinutes).toBeLessThanOrEqual(30);
    });

    it('should escalate unresponded wedding day tickets immediately', async () => {
      // Create a wedding day ticket that's overdue
      const weddingDate = new Date();
      weddingDate.setHours(weddingDate.getHours() + 6);

      const { data: overdueTicket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Wedding venue access issue',
          description: 'Cannot access wedding venue management portal',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'critical',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          is_wedding_day_issue: true,
          hours_until_wedding: 6,
          wedding_date: weddingDate.toISOString(),
          sla_response_deadline: new Date(
            Date.now() - 30 * 60 * 1000,
          ).toISOString(), // 30 minutes ago
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // Created 45 minutes ago
        })
        .select()
        .single();

      // Test the escalation API
      const { POST: escalationPOST } = await import(
        '../../app/api/support/escalation/route'
      );
      const escalationRequest = createMockRequest('POST', {
        action: 'escalate_ticket',
        ticketId: overdueTicket.id,
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

      const escalationResponse = await escalationPOST(escalationRequest);
      const escalationData = await escalationResponse.json();

      expect(escalationResponse.status).toBe(200);
      expect(escalationData.success).toBe(true);
      expect(escalationData.message).toContain('escalated');

      // Verify escalation was logged
      const { data: escalation } = await supabase
        .from('support_escalations')
        .select('*')
        .eq('ticket_id', overdueTicket.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(escalation).toBeTruthy();
      expect(escalation.escalation_level).toBeGreaterThan(0);
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle peak wedding season load (100+ concurrent tickets)', async () => {
      const startTime = Date.now();
      const concurrentTickets = [];

      // Create 100 tickets concurrently (simulating peak wedding season)
      for (let i = 0; i < 100; i++) {
        const ticketData = {
          subject: `Peak Season Ticket ${i + 1}`,
          description: `This is test ticket number ${i + 1} for load testing`,
          priority: i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : 'medium',
          category: [
            'technical',
            'billing',
            'guest_management',
            'vendor_management',
          ][i % 4],
          organizationId: testOrganizationId,
          userTier: ['ENTERPRISE', 'PROFESSIONAL', 'STARTER'][i % 3],
          weddingDate:
            i % 10 === 0
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : undefined,
        };

        const { POST } = await import('../../app/api/support/tickets/route');
        const request = createMockRequest('POST', ticketData);

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

        concurrentTickets.push(POST(request));
      }

      // Wait for all tickets to be created
      const responses = await Promise.all(concurrentTickets);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all tickets were created successfully
      let successCount = 0;
      for (const response of responses) {
        if (response.status === 201) {
          successCount++;
        }
      }

      expect(successCount).toBe(100);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(
        `✅ Load test completed: 100 tickets created in ${duration}ms`,
      );

      // Verify database consistency
      const { data: createdTickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('organization_id', testOrganizationId)
        .like('subject', 'Peak Season Ticket%');

      expect(createdTickets?.length).toBe(100);
    }, 45000); // 45 second timeout for load test
  });

  describe('AI Categorization Integration', () => {
    it('should automatically categorize wedding industry tickets correctly', async () => {
      const testCases = [
        {
          subject: 'Website is completely down',
          description: 'Our wedding photography website is not loading at all',
          expectedCategory: 'technical',
          expectedSubcategory: 'website',
        },
        {
          subject: 'Payment failed for guest RSVP',
          description:
            'Guest tried to pay for meal selection but Stripe declined the payment',
          expectedCategory: 'billing',
          expectedSubcategory: 'payment_processing',
        },
        {
          subject: 'Guest list not syncing with venue',
          description:
            'The guest list changes are not showing up in the venue portal',
          expectedCategory: 'guest_management',
          expectedSubcategory: 'sync',
        },
        {
          subject: 'How do I set up my account?',
          description: "I'm new to WedSync and need help getting started",
          expectedCategory: 'onboarding',
          expectedSubcategory: 'account_setup',
        },
      ];

      for (const testCase of testCases) {
        const { POST: aiPOST } = await import(
          '../../app/api/support/ai/categorize/route'
        );
        const request = createMockRequest('POST', {
          subject: testCase.subject,
          description: testCase.description,
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

        const response = await aiPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.classification.category).toBe(
          testCase.expectedCategory,
        );
        expect(responseData.classification.confidence).toBeGreaterThan(70);
      }
    });
  });

  describe('Security and Access Control', () => {
    it('should prevent SQL injection in ticket queries', async () => {
      const maliciousInputs = [
        "'; DROP TABLE support_tickets; --",
        "' OR '1'='1",
        "'; INSERT INTO support_tickets (subject) VALUES ('hacked'); --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const ticketData = {
          subject: maliciousInput,
          description: 'Testing SQL injection prevention',
          priority: 'medium',
          category: 'technical',
          organizationId: testOrganizationId,
          userTier: 'PROFESSIONAL',
        };

        const { POST } = await import('../../app/api/support/tickets/route');
        const request = createMockRequest('POST', ticketData);

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

        // Should either create ticket safely or reject, but never execute SQL
        const response = await POST(request);
        expect([200, 201, 400, 422]).toContain(response.status);
      }

      // Verify support_tickets table still exists
      const { data: tableCheck } = await supabase
        .from('support_tickets')
        .select('id')
        .limit(1);

      expect(tableCheck).toBeDefined(); // Table should still exist
    });

    it('should enforce rate limiting for ticket creation', async () => {
      const rateLimitPromises = [];
      const ticketData = {
        subject: 'Rate Limit Test',
        description: 'Testing rate limiting functionality',
        priority: 'medium',
        category: 'technical',
        organizationId: testOrganizationId,
        userTier: 'PROFESSIONAL',
      };

      // Attempt to create 20 tickets rapidly
      for (let i = 0; i < 20; i++) {
        const { POST } = await import('../../app/api/support/tickets/route');
        const request = createMockRequest('POST', {
          ...ticketData,
          subject: `Rate Limit Test ${i + 1}`,
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

        rateLimitPromises.push(POST(request));
      }

      const responses = await Promise.all(rateLimitPromises);

      // Should have some successful creates and some rate limited
      const successfulRequests = responses.filter((r) => r.status === 201);
      const rateLimitedRequests = responses.filter((r) => r.status === 429);

      expect(successfulRequests.length).toBeGreaterThan(0);
      expect(successfulRequests.length).toBeLessThan(20); // Some should be rate limited

      console.log(
        `Rate limiting test: ${successfulRequests.length} successful, ${rateLimitedRequests.length} rate limited`,
      );
    });
  });
});
