/**
 * TicketManager Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Tests for the core ticket management service
 */

import TicketManager from '@/lib/support/ticket-manager';
import type { CreateTicketRequest, Ticket, TicketPriority } from '@/lib/support/ticket-manager';
import { AITicketClassifier } from '@/lib/support/ai-classifier';

// Mock dependencies
jest.mock('@/lib/support/ai-classifier');
jest.mock('@/lib/support/ticket-router');
jest.mock('@/lib/support/sla-monitor');

// Mock Supabase
const mockSupabaseInsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => ({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    rpc: mockSupabaseRpc
  }
}));

describe('TicketManager', () => {
  let ticketManager: TicketManager;
  let mockClassifier: jest.Mocked<AITicketClassifier>;

  const mockTicket: Ticket = {
    id: 'ticket-123',
    ticket_number: 'WS-001',
    organization_id: 'org-123',
    customer_id: 'customer-123',
    customer_name: 'John Photographer',
    customer_email: 'john@example.com',
    customer_tier: 'professional',
    vendor_type: 'photographer',
    subject: 'Payment issue with subscription',
    description: 'Credit card was declined',
    category: 'billing',
    type: 'billing',
    priority: 'high',
    status: 'open',
    assigned_to: null,
    tags: ['payment', 'urgent'],
    is_wedding_emergency: false,
    urgency_score: 7,
    sla_target_response: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    sla_target_resolution: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    escalation_level: 0,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    first_response_at: null,
    resolved_at: null
  };

  const mockCreateRequest: CreateTicketRequest = {
    organization_id: 'org-123',
    customer_id: 'customer-123',
    customer_name: 'John Photographer',
    customer_email: 'john@example.com',
    customer_tier: 'professional',
    vendor_type: 'photographer',
    subject: 'Payment issue with subscription',
    description: 'Credit card was declined when trying to upgrade',
    browser_info: 'Chrome 91.0',
    urgency_keywords: ['urgent', 'declined']
  };

  beforeEach(() => {
    ticketManager = new TicketManager();
    mockClassifier = new AITicketClassifier() as jest.Mocked<AITicketClassifier>;

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockSupabaseInsert.mockReturnValue({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: { ...mockTicket },
          error: null
        }))
      }))
    });

    mockSupabaseSelect.mockReturnValue({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: { id: 1, current_count: 0 },
          error: null
        }))
      }))
    });

    mockClassifier.classify = jest.fn().mockResolvedValue({
      category: 'billing',
      type: 'billing',
      priority: 'high',
      vendorType: 'photographer',
      tags: ['payment', 'urgent'],
      confidence: 0.9,
      method: 'ai_classification',
      reasoning: 'Payment issue detected',
      isWeddingEmergency: false,
      urgencyScore: 7,
      suggestedTemplate: 'payment_failure_help',
      estimatedResolutionTime: 480
    });
  });

  describe('createTicket', () => {
    it('should create a ticket with proper classification', async () => {
      const result = await ticketManager.createTicket(mockCreateRequest);

      expect(result).toBeDefined();
      expect(result.ticket_number).toMatch(/^WS-\d+$/);
      expect(result.category).toBe('billing');
      expect(result.priority).toBe('high');
      expect(result.urgency_score).toBe(7);
      expect(mockClassifier.classify).toHaveBeenCalledWith({
        subject: mockCreateRequest.subject,
        description: mockCreateRequest.description,
        userType: 'supplier',
        userTier: mockCreateRequest.customer_tier,
        browserInfo: mockCreateRequest.browser_info,
        urgencyKeywords: mockCreateRequest.urgency_keywords
      });
    });

    it('should handle wedding emergency tickets with critical priority', async () => {
      const emergencyRequest: CreateTicketRequest = {
        ...mockCreateRequest,
        subject: 'URGENT: Wedding ceremony in 2 hours - photos not uploading!',
        description: 'Bride and groom photos not syncing for todays ceremony'
      };

      mockClassifier.classify = jest.fn().mockResolvedValue({
        category: 'technical_support',
        type: 'technical',
        priority: 'critical',
        vendorType: 'photographer',
        tags: ['wedding_day', 'emergency', 'time_sensitive'],
        confidence: 0.95,
        method: 'pattern_match',
        reasoning: 'Wedding day emergency detected',
        isWeddingEmergency: true,
        urgencyScore: 10,
        suggestedTemplate: 'wedding_day_emergency',
        estimatedResolutionTime: 30
      });

      const result = await ticketManager.createTicket(emergencyRequest);

      expect(result.is_wedding_emergency).toBe(true);
      expect(result.priority).toBe('critical');
      expect(result.urgency_score).toBe(10);
      expect(result.sla_target_response.getTime()).toBeLessThan(
        Date.now() + 15 * 60 * 1000 // Should be within 15 minutes for emergencies
      );
    });

    it('should generate unique ticket numbers', async () => {
      const tickets = await Promise.all([
        ticketManager.createTicket(mockCreateRequest),
        ticketManager.createTicket(mockCreateRequest),
        ticketManager.createTicket(mockCreateRequest)
      ]);

      const ticketNumbers = tickets.map(t => t.ticket_number);
      const uniqueNumbers = new Set(ticketNumbers);
      
      expect(uniqueNumbers.size).toBe(ticketNumbers.length);
      ticketNumbers.forEach(number => {
        expect(number).toMatch(/^WS-\d+$/);
      });
    });

    it('should calculate SLA targets based on tier and emergency status', async () => {
      const testCases = [
        {
          tier: 'enterprise' as const,
          isEmergency: false,
          expectedResponseMinutes: 15,
          expectedResolutionHours: 2
        },
        {
          tier: 'professional' as const, 
          isEmergency: false,
          expectedResponseMinutes: 120, // 2 hours
          expectedResolutionHours: 8
        },
        {
          tier: 'free' as const,
          isEmergency: false,
          expectedResponseMinutes: 24 * 60, // 24 hours
          expectedResolutionHours: 48
        },
        {
          tier: 'free' as const,
          isEmergency: true,
          expectedResponseMinutes: 5, // Emergency overrides tier
          expectedResolutionHours: 1
        }
      ];

      for (const testCase of testCases) {
        mockClassifier.classify = jest.fn().mockResolvedValue({
          category: 'technical_support',
          type: 'technical',
          priority: testCase.isEmergency ? 'critical' : 'medium',
          vendorType: 'photographer',
          tags: ['test'],
          confidence: 0.8,
          method: 'ai_classification',
          reasoning: 'Test case',
          isWeddingEmergency: testCase.isEmergency,
          urgencyScore: testCase.isEmergency ? 10 : 5,
          estimatedResolutionTime: 240
        });

        const request: CreateTicketRequest = {
          ...mockCreateRequest,
          customer_tier: testCase.tier
        };

        const result = await ticketManager.createTicket(request);
        const now = Date.now();

        const responseTime = new Date(result.sla_target_response).getTime() - now;
        const resolutionTime = new Date(result.sla_target_resolution).getTime() - now;

        expect(responseTime).toBeLessThanOrEqual(
          testCase.expectedResponseMinutes * 60 * 1000 + 1000 // 1 second tolerance
        );
        expect(resolutionTime).toBeLessThanOrEqual(
          testCase.expectedResolutionHours * 60 * 60 * 1000 + 1000 // 1 second tolerance
        );
      }
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      });

      await expect(ticketManager.createTicket(mockCreateRequest))
        .rejects.toThrow('Database connection failed');
    });

    it('should sanitize input data', async () => {
      const maliciousRequest: CreateTicketRequest = {
        ...mockCreateRequest,
        subject: '<script>alert("XSS")</script>Payment issue',
        description: '<img src=x onerror=alert("XSS")>Credit card declined',
        customer_name: 'John<script>alert("XSS")</script>Photographer'
      };

      const result = await ticketManager.createTicket(maliciousRequest);

      expect(result.subject).not.toContain('<script>');
      expect(result.description).not.toContain('<img');
      expect(result.customer_name).not.toContain('<script>');
    });

    it('should track ticket creation metrics', async () => {
      await ticketManager.createTicket(mockCreateRequest);

      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'track_ticket_creation',
        expect.objectContaining({
          organization_id: mockCreateRequest.organization_id,
          category: 'billing',
          priority: 'high',
          is_wedding_emergency: false
        })
      );
    });
  });

  describe('updateTicketStatus', () => {
    const ticketId = 'ticket-123';

    beforeEach(() => {
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { ...mockTicket, status: 'in_progress' },
              error: null
            }))
          }))
        }))
      });
    });

    it('should update ticket status successfully', async () => {
      const result = await ticketManager.updateTicketStatus(ticketId, 'in_progress', 'agent-123');

      expect(result).toBeTruthy();
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          assigned_to: 'agent-123',
          updated_at: expect.any(String)
        })
      );
    });

    it('should record first response time when status changes from open', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { ...mockTicket, status: 'open', first_response_at: null },
            error: null
          }))
        }))
      });

      await ticketManager.updateTicketStatus(ticketId, 'in_progress', 'agent-123');

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          first_response_at: expect.any(String)
        })
      );
    });

    it('should record resolution time when status changes to resolved', async () => {
      await ticketManager.updateTicketStatus(ticketId, 'resolved', 'agent-123');

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolved_at: expect.any(String)
        })
      );
    });

    it('should validate status transitions', async () => {
      // Try invalid status
      await expect(ticketManager.updateTicketStatus(ticketId, 'invalid_status' as any, 'agent-123'))
        .rejects.toThrow('Invalid ticket status');
    });

    it('should handle concurrent updates', async () => {
      // Simulate concurrent updates
      const updates = [
        ticketManager.updateTicketStatus(ticketId, 'in_progress', 'agent-123'),
        ticketManager.updateTicketStatus(ticketId, 'in_progress', 'agent-456')
      ];

      const results = await Promise.allSettled(updates);
      
      // At least one should succeed
      expect(results.some(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('getTicketById', () => {
    it('should retrieve ticket with all related data', async () => {
      const mockTicketData = {
        ...mockTicket,
        support_agents: {
          id: 'agent-123',
          name: 'Support Agent',
          email: 'agent@example.com'
        },
        ticket_messages: [
          {
            id: 'msg-1',
            content: 'Thank you for contacting support',
            sent_by: 'agent-123',
            created_at: new Date().toISOString()
          }
        ]
      };

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockTicketData,
            error: null
          }))
        }))
      });

      const result = await ticketManager.getTicketById('ticket-123');

      expect(result).toEqual(mockTicketData);
    });

    it('should return null for non-existent tickets', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116', message: 'The result contains 0 rows' }
          }))
        }))
      });

      const result = await ticketManager.getTicketById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('addTicketMessage', () => {
    const ticketId = 'ticket-123';
    const messageData = {
      content: 'Thank you for your message',
      sent_by: 'agent-123',
      message_type: 'response' as const,
      is_internal: false,
      attachments: []
    };

    it('should add message to ticket', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'msg-123',
              ticket_id: ticketId,
              ...messageData,
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      });

      const result = await ticketManager.addTicketMessage(ticketId, messageData);

      expect(result).toBeDefined();
      expect(result.ticket_id).toBe(ticketId);
      expect(result.content).toBe(messageData.content);
      expect(result.sent_by).toBe(messageData.sent_by);
    });

    it('should update first response time for first agent message', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { ...mockTicket, first_response_at: null },
            error: null
          }))
        }))
      });

      await ticketManager.addTicketMessage(ticketId, messageData);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          first_response_at: expect.any(String)
        })
      );
    });

    it('should sanitize message content', async () => {
      const maliciousMessage = {
        ...messageData,
        content: '<script>alert("XSS")</script>This is a response'
      };

      mockSupabaseInsert.mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { ...maliciousMessage, content: 'This is a response' },
            error: null
          }))
        }))
      });

      const result = await ticketManager.addTicketMessage(ticketId, maliciousMessage);

      expect(result.content).not.toContain('<script>');
      expect(result.content).toBe('This is a response');
    });
  });

  describe('escalateTicket', () => {
    it('should escalate ticket with proper level increment', async () => {
      const escalationData = {
        escalated_by: 'agent-123',
        escalation_reason: 'Customer requested manager',
        escalated_to: 'manager-456',
        notes: 'Customer not satisfied with initial response'
      };

      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { ...mockTicket, escalation_level: 0 },
            error: null
          }))
        }))
      });

      const result = await ticketManager.escalateTicket('ticket-123', escalationData);

      expect(result).toBeTruthy();
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          escalation_level: 1,
          assigned_to: escalationData.escalated_to,
          priority: 'high', // Should upgrade priority
          updated_at: expect.any(String)
        })
      );
    });

    it('should create escalation audit trail', async () => {
      const escalationData = {
        escalated_by: 'agent-123',
        escalation_reason: 'SLA breach imminent',
        escalated_to: 'manager-456',
        notes: 'Response time exceeded threshold'
      };

      await ticketManager.escalateTicket('ticket-123', escalationData);

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-123',
          escalated_by: escalationData.escalated_by,
          escalated_to: escalationData.escalated_to,
          escalation_reason: escalationData.escalation_reason,
          notes: escalationData.notes,
          escalation_level: 1
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockSupabaseInsert.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      await expect(ticketManager.createTicket(mockCreateRequest))
        .rejects.toThrow('Network timeout');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        ...mockCreateRequest,
        subject: '', // Empty subject
        customer_email: 'invalid-email' // Invalid email
      };

      await expect(ticketManager.createTicket(invalidRequest))
        .rejects.toThrow(/validation/i);
    });
  });

  describe('performance', () => {
    it('should handle high volume ticket creation', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        ...mockCreateRequest,
        subject: `Test ticket ${i}`,
        customer_email: `customer${i}@example.com`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => ticketManager.createTicket(req))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});