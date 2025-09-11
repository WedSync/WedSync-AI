import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { TicketManager } from '@/lib/support/ticket-manager';
import { AITicketClassifier } from '@/lib/support/ai-classifier';
import { SlaMonitor } from '@/lib/support/sla-monitor';

// Mock Supabase client with more comprehensive mocking
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: jest.fn(() =>
      Promise.resolve({ data: { id: 'test-ticket-id' }, error: null }),
    ),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  })),
  rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    ),
  },
};

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(() =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      category: 'technical_support',
                      subcategory: 'login_issues',
                      priority: 'high',
                      confidence: 0.9,
                      reasoning: 'User cannot access account',
                    }),
                  },
                },
              ],
            }),
          ),
        },
      },
    })),
  };
});

describe('Support Ticket Management System Integration', () => {
  let ticketManager: TicketManager;
  let classifier: AITicketClassifier;
  let slaMonitor: SlaMonitor;

  beforeAll(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ticketManager = new TicketManager();
    classifier = new AITicketClassifier();
    slaMonitor = new SlaMonitor();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('End-to-End Ticket Creation Flow', () => {
    it('should create, classify, and monitor a standard support ticket', async () => {
      // Mock customer data
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            name: 'John Smith',
            email: 'john@example.com',
            tier: 'professional',
            organization_id: 'org-123',
          },
          error: null,
        });

      // Mock ticket creation
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: {
          id: 'ticket-456',
          title: 'Cannot access my timeline',
          description:
            'I keep getting error messages when trying to view my wedding timeline',
          customer_id: 'customer-123',
          status: 'open',
          priority: 'high',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      // Create ticket through the complete flow
      const ticketData = {
        title: 'Cannot access my timeline',
        description:
          'I keep getting error messages when trying to view my wedding timeline',
        customer_email: 'john@example.com',
        source: 'web_form' as const,
      };

      const result = await ticketManager.createTicket(ticketData);

      // Verify ticket creation
      expect(result.success).toBe(true);
      expect(result.ticket_id).toBe('ticket-456');

      // Verify classification occurred
      expect(mockSupabase.from).toHaveBeenCalledWith('support_tickets');
      expect(mockSupabase.from().insert).toHaveBeenCalled();

      // Verify SLA tracking started
      expect(mockSupabase.from).toHaveBeenCalledWith('support_sla_tracking');
    });

    it('should handle wedding emergency tickets with elevated priority', async () => {
      // Mock customer data
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            id: 'customer-emergency',
            name: 'Sarah Johnson',
            email: 'sarah@weddingtoday.com',
            tier: 'enterprise',
            organization_id: 'org-456',
          },
          error: null,
        });

      // Mock emergency ticket creation
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: {
          id: 'emergency-ticket-789',
          title: 'URGENT: Wedding is TODAY - vendor no-show',
          description:
            "My wedding is happening in 2 hours and my photographer hasn't arrived!",
          customer_id: 'customer-emergency',
          status: 'open',
          priority: 'wedding_emergency',
          is_wedding_emergency: true,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const emergencyTicket = {
        title: 'URGENT: Wedding is TODAY - vendor no-show',
        description:
          "My wedding is happening in 2 hours and my photographer hasn't arrived!",
        customer_email: 'sarah@weddingtoday.com',
        source: 'phone' as const,
      };

      const result = await ticketManager.createTicket(emergencyTicket);

      expect(result.success).toBe(true);
      expect(result.is_wedding_emergency).toBe(true);
      expect(result.priority).toBe('wedding_emergency');

      // Should have immediate SLA requirements
      const insertCall = mockSupabase
        .from()
        .insert.mock.calls.find((call) => call[0]?.sla_type === 'response');
      expect(insertCall[0]?.target_minutes).toBeLessThanOrEqual(5); // Emergency response time
    });

    it('should integrate AI classification with SLA assignment', async () => {
      // Mock OpenAI response for billing inquiry
      const mockOpenAI = require('openai').default();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'billing_payments',
                subcategory: 'subscription_changes',
                priority: 'medium',
                confidence: 0.85,
                reasoning: 'Customer wants to upgrade subscription',
              }),
            },
          },
        ],
      });

      const billingTicket = {
        title: 'Upgrade to Enterprise plan',
        description:
          'I want to upgrade my subscription to get more features for my wedding planning business',
        customer_email: 'business@weddingplanner.com',
        source: 'web_form' as const,
      };

      // Mock customer lookup
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            id: 'business-customer',
            name: 'Wedding Planner Pro',
            email: 'business@weddingplanner.com',
            tier: 'professional',
            organization_id: 'org-business',
          },
          error: null,
        });

      const result = await ticketManager.createTicket(billingTicket);

      expect(result.success).toBe(true);
      expect(result.category).toBe('billing_payments');
      expect(result.priority).toBe('medium');

      // Verify appropriate SLA was set for Professional + Medium priority
      const slaInsert = mockSupabase
        .from()
        .insert.mock.calls.find((call) => call[0]?.target_minutes);
      expect(slaInsert[0]?.target_minutes).toBe(60); // Professional medium priority response time
    });
  });

  describe('Ticket Lifecycle Management', () => {
    it('should handle complete ticket lifecycle from creation to resolution', async () => {
      const ticketId = 'lifecycle-ticket-123';

      // 1. Ticket Assignment
      mockSupabase
        .from()
        .update()
        .eq.mockResolvedValueOnce({
          data: {
            id: ticketId,
            assigned_agent: 'agent-sarah',
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          },
          error: null,
        });

      const assignResult = await ticketManager.assignTicket(
        ticketId,
        'agent-sarah',
      );
      expect(assignResult.success).toBe(true);

      // 2. First Response
      const firstResponse = await ticketManager.addResponse(ticketId, {
        content:
          "Thank you for contacting support. I'm looking into your issue now.",
        is_internal: false,
        agent_id: 'agent-sarah',
      });
      expect(firstResponse.success).toBe(true);

      // 3. Resolution
      const resolution = await ticketManager.resolveTicket(ticketId, {
        resolution_summary:
          'Issue resolved by clearing browser cache and cookies',
        resolution_category: 'user_education',
        agent_id: 'agent-sarah',
      });
      expect(resolution.success).toBe(true);

      // Verify all lifecycle events were recorded
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolved_at: expect.any(String),
        }),
      );
    });

    it('should handle escalation workflow correctly', async () => {
      const ticketId = 'escalation-ticket-456';

      // Mock current ticket data
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            id: ticketId,
            title: 'Critical system outage',
            priority: 'high',
            customer_tier: 'enterprise',
            assigned_agent: 'junior-agent',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          },
          error: null,
        });

      const escalationResult = await ticketManager.escalateTicket(ticketId, {
        reason: 'SLA breach - no response for 2 hours',
        escalate_to: 'senior_support',
        escalated_by: 'system',
        urgency_level: 'high',
      });

      expect(escalationResult.success).toBe(true);

      // Verify escalation record was created
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: ticketId,
          escalated_to_role: 'senior_support',
          reason: 'SLA breach - no response for 2 hours',
          urgency_level: 'high',
        }),
      );

      // Verify ticket priority was updated
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent', // Escalated from high to urgent
        }),
      );
    });
  });

  describe('SLA Monitoring Integration', () => {
    it('should monitor SLA compliance throughout ticket lifecycle', async () => {
      jest.useFakeTimers();

      // Create ticket with SLA tracking
      const ticketId = 'sla-test-ticket';
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: { id: ticketId },
        error: null,
      });

      await ticketManager.createTicket({
        title: 'Test SLA monitoring',
        description: 'Testing SLA compliance',
        customer_email: 'test@slatest.com',
        source: 'email',
      });

      // Fast-forward to near SLA breach
      jest.advanceTimersByTime(55 * 60 * 1000); // 55 minutes

      // Mock approaching breach detection
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            ticket_id: ticketId,
            sla_type: 'response',
            target_minutes: 60,
            minutes_elapsed: 55,
            status: 'active',
          },
        ],
        error: null,
      });

      const breaches = await slaMonitor.checkBreaches();
      expect(breaches).toHaveLength(1);
      expect(breaches[0].breach_type).toBe('approaching');

      // Fast-forward past SLA
      jest.advanceTimersByTime(10 * 60 * 1000); // +10 minutes = 65 total

      // Mock actual breach
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            ticket_id: ticketId,
            sla_type: 'response',
            target_minutes: 60,
            minutes_elapsed: 65,
            status: 'active',
          },
        ],
        error: null,
      });

      const actualBreaches = await slaMonitor.checkBreaches();
      expect(actualBreaches[0].breach_type).toBe('breached');

      jest.useRealTimers();
    });

    it('should calculate accurate SLA metrics across multiple tickets', async () => {
      // Mock SLA performance data
      const performanceData = [
        {
          status: 'met',
          sla_type: 'response',
          customer_tier: 'enterprise',
          actual_minutes: 10,
        },
        {
          status: 'met',
          sla_type: 'response',
          customer_tier: 'enterprise',
          actual_minutes: 12,
        },
        {
          status: 'breached',
          sla_type: 'response',
          customer_tier: 'professional',
          actual_minutes: 90,
        },
        {
          status: 'met',
          sla_type: 'resolution',
          customer_tier: 'professional',
          actual_minutes: 300,
        },
        {
          status: 'breached',
          sla_type: 'resolution',
          customer_tier: 'free',
          actual_minutes: 3000,
        },
      ];

      mockSupabase.from().select().gte().lte.mockResolvedValueOnce({
        data: performanceData,
        error: null,
      });

      const metrics = await slaMonitor.getSlaMetrics(
        '2024-01-01',
        '2024-01-31',
      );

      expect(metrics.total_tickets).toBe(5);
      expect(metrics.total_breaches).toBe(2);
      expect(metrics.response_sla_compliance).toBe(66.67); // 2/3 response SLAs met
      expect(metrics.resolution_sla_compliance).toBe(50); // 1/2 resolution SLAs met
      expect(metrics.avg_response_time_by_tier.enterprise).toBe(11); // (10+12)/2
    });
  });

  describe('Real-time Notifications Integration', () => {
    it('should trigger appropriate notifications for different ticket events', async () => {
      const notificationEvents: any[] = [];

      // Mock notification handler
      const mockNotificationHandler = jest.fn((event) => {
        notificationEvents.push(event);
      });

      // Setup notification listener (in real app this would be through WebSocket)
      ticketManager.onTicketEvent = mockNotificationHandler;

      // Create wedding emergency
      await ticketManager.createTicket({
        title: 'WEDDING EMERGENCY - venue locked',
        description:
          "Wedding starts in 1 hour and we can't get into the venue!",
        customer_email: 'emergency@wedding.com',
        source: 'phone',
      });

      // Should trigger wedding emergency notification
      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wedding_emergency',
          priority: 'wedding_emergency',
          requires_immediate_action: true,
        }),
      );

      // Simulate SLA breach
      const breachEvent = {
        ticket_id: 'breach-ticket',
        breach_type: 'breached' as const,
        sla_type: 'response',
        time_over_minutes: 15,
        customer_tier: 'enterprise',
      };

      await slaMonitor.processEscalation(breachEvent);

      // Should trigger SLA breach notification
      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sla_breach',
          severity: 'high',
        }),
      );
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent ticket creation efficiently', async () => {
      const concurrentTickets = 20;
      const startTime = Date.now();

      // Mock successful creation for all tickets
      mockSupabase.from().insert.mockResolvedValue({
        data: { id: 'concurrent-ticket' },
        error: null,
      });

      const ticketPromises = Array.from({ length: concurrentTickets }, (_, i) =>
        ticketManager.createTicket({
          title: `Concurrent ticket ${i}`,
          description: `Test ticket number ${i}`,
          customer_email: `test${i}@concurrent.com`,
          source: 'web_form',
        }),
      );

      const results = await Promise.all(ticketPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All tickets should be created successfully
      expect(results.every((r) => r.success)).toBe(true);

      // Should complete within reasonable time (10 seconds for 20 tickets)
      expect(duration).toBeLessThan(10000);

      // Should have made appropriate number of database calls
      expect(mockSupabase.from().insert).toHaveBeenCalledTimes(
        concurrentTickets * 2,
      ); // ticket + SLA tracking
    });

    it('should maintain performance under high SLA monitoring load', async () => {
      jest.useFakeTimers();

      // Mock many active tickets for SLA monitoring
      const activeTickets = Array.from({ length: 100 }, (_, i) => ({
        ticket_id: `active-ticket-${i}`,
        sla_type: 'response',
        target_minutes: 60,
        minutes_elapsed: 30 + i, // Varying elapsed times
        status: 'active',
      }));

      mockSupabase.rpc.mockResolvedValue({
        data: activeTickets,
        error: null,
      });

      const startTime = Date.now();

      // Trigger SLA check
      await slaMonitor.checkBreaches();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 100 tickets in under 5 seconds
      expect(duration).toBeLessThan(5000);

      jest.useRealTimers();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database failures gracefully', async () => {
      // Mock database error
      mockSupabase
        .from()
        .insert.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await ticketManager.createTicket({
        title: 'Test ticket',
        description: 'This should fail gracefully',
        customer_email: 'test@error.com',
        source: 'email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');

      // Should not crash the system
      expect(() => {
        // System should still be responsive
        ticketManager.getTicketStats();
      }).not.toThrow();
    });

    it('should handle OpenAI API failures with fallback classification', async () => {
      // Mock OpenAI failure
      const mockOpenAI = require('openai').default();
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API Error'),
      );

      const result = await classifier.classifyTicket({
        title: 'Login problem',
        description: 'Cannot access my account',
        customer_tier: 'professional',
      });

      // Should still classify using pattern matching fallback
      expect(result).toBeDefined();
      expect(result.category).toBe('technical_support');
      expect(result.confidence_score).toBeLessThan(0.8); // Lower confidence for fallback
    });

    it('should recover from temporary notification system failures', async () => {
      const notificationErrors: Error[] = [];

      // Mock failing notification handler
      ticketManager.onTicketEvent = jest.fn().mockImplementation(() => {
        throw new Error('Notification service unavailable');
      });

      // Should continue processing despite notification failures
      const result = await ticketManager.createTicket({
        title: 'Test notification failure',
        description: 'System should handle this gracefully',
        customer_email: 'test@notification.com',
        source: 'web_form',
      });

      expect(result.success).toBe(true); // Ticket creation should still succeed
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity across related tables', async () => {
      const ticketId = 'integrity-test-ticket';

      // Create ticket with all related records
      mockSupabase
        .from()
        .insert.mockResolvedValueOnce({ data: { id: ticketId }, error: null }) // tickets
        .mockResolvedValueOnce({ data: {}, error: null }) // sla_tracking
        .mockResolvedValueOnce({ data: {}, error: null }) // classification_history
        .mockResolvedValueOnce({ data: {}, error: null }); // ticket_messages

      await ticketManager.createTicket({
        title: 'Integrity test',
        description: 'Testing referential integrity',
        customer_email: 'integrity@test.com',
        source: 'web_form',
      });

      // Verify all related records reference the ticket correctly
      const insertCalls = mockSupabase.from().insert.mock.calls;

      // SLA tracking should reference ticket
      const slaInsert = insertCalls.find(
        (call) => call[0]?.ticket_id === ticketId,
      );
      expect(slaInsert).toBeDefined();

      // Classification history should reference ticket
      const classificationInsert = insertCalls.find(
        (call) => call[0]?.classification_data,
      );
      expect(classificationInsert).toBeDefined();
    });

    it('should handle concurrent updates without data corruption', async () => {
      const ticketId = 'concurrent-update-ticket';

      // Simulate concurrent updates to the same ticket
      const updatePromises = [
        ticketManager.addResponse(ticketId, {
          content: 'First response',
          agent_id: 'agent-1',
          is_internal: false,
        }),
        ticketManager.updateTicketStatus(ticketId, 'in_progress'),
        ticketManager.assignTicket(ticketId, 'agent-2'),
      ];

      const results = await Promise.allSettled(updatePromises);

      // Should handle concurrent updates without errors
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });
  });
});
