/**
 * Tickets API Integration Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Tests for the tickets API endpoints
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { GET as getTickets, POST as createTicket } from '@/app/api/tickets/route';
import { GET as getTicket, PUT as updateTicket } from '@/app/api/tickets/[id]/route';
import { POST as addMessage } from '@/app/api/tickets/[id]/messages/route';

// Mock Supabase
const mockSupabaseUser = {
  id: 'user-123',
  email: 'agent@example.com'
};

const mockTicket = {
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
  sla_target_response: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  sla_target_resolution: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  escalation_level: 0,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  first_response_at: null,
  resolved_at: null
};

const mockProfile = {
  id: 'user-123',
  role: 'support_agent',
  organizations: {
    id: 'org-123',
    name: 'Test Organization',
    subscription_tier: 'professional'
  }
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: mockSupabaseUser },
        error: null
      }))
    },
    from: jest.fn((table: string) => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        insert: jest.fn(() => mockQuery),
        update: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        single: jest.fn(() => {
          if (table === 'user_profiles') {
            return { data: mockProfile, error: null };
          }
          if (table === 'support_tickets') {
            return { data: mockTicket, error: null };
          }
          return { data: null, error: null };
        }),
        data: [mockTicket],
        error: null,
        count: 1
      };
      return mockQuery;
    }),
    rpc: jest.fn(() => ({
      data: null,
      error: null
    }))
  }))
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

// Mock TicketManager
jest.mock('@/lib/support/ticket-manager', () => {
  return jest.fn().mockImplementation(() => ({
    createTicket: jest.fn().mockResolvedValue(mockTicket),
    getTicketById: jest.fn().mockResolvedValue(mockTicket),
    updateTicketStatus: jest.fn().mockResolvedValue(true),
    addTicketMessage: jest.fn().mockResolvedValue({
      id: 'msg-123',
      ticket_id: 'ticket-123',
      content: 'Thank you for contacting support',
      sent_by: 'user-123',
      created_at: new Date().toISOString()
    }),
    searchTickets: jest.fn().mockResolvedValue({
      tickets: [mockTicket],
      total_count: 1,
      has_more: false
    })
  }));
});

describe('/api/tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tickets', () => {
    it('should return tickets for authenticated user', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/tickets'
      });

      const request = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'GET'
      });

      const response = await getTickets(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.tickets).toBeDefined();
      expect(responseData.pagination).toBeDefined();
    });

    it('should filter tickets by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets?status=open', {
        method: 'GET'
      });

      const response = await getTickets(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.tickets).toBeDefined();
    });

    it('should filter tickets by priority', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets?priority=critical', {
        method: 'GET'
      });

      const response = await getTickets(request);
      expect(response.status).toBe(200);
    });

    it('should filter tickets by wedding emergency status', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets?is_wedding_emergency=true', {
        method: 'GET'
      });

      const response = await getTickets(request);
      expect(response.status).toBe(200);
    });

    it('should paginate results correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets?page=1&limit=10', {
        method: 'GET'
      });

      const response = await getTickets(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.pagination.current_page).toBe(1);
      expect(responseData.pagination.per_page).toBe(10);
    });

    it('should search tickets by query', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets?search=payment', {
        method: 'GET'
      });

      const response = await getTickets(request);
      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: null },
            error: { message: 'No user found' }
          }))
        }
      });

      const request = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'GET'
      });

      const response = await getTickets(request);
      expect(response.status).toBe(401);
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets?page=invalid&limit=999', {
        method: 'GET'
      });

      const response = await getTickets(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid query parameters');
    });
  });

  describe('POST /api/tickets', () => {
    const validTicketData = {
      customer_name: 'John Photographer',
      customer_email: 'john@example.com',
      customer_tier: 'professional',
      vendor_type: 'photographer',
      subject: 'Payment issue with subscription',
      description: 'My credit card was declined when trying to upgrade',
      urgency_keywords: ['urgent', 'payment']
    };

    it('should create a new ticket', async () => {
      const request = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validTicketData)
      });

      const response = await createTicket(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message).toBe('Ticket created successfully');
      expect(responseData.ticket).toBeDefined();
      expect(responseData.ticket.ticket_number).toMatch(/^WS-\d+$/);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        customer_name: 'John',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const response = await createTicket(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid ticket data');
      expect(responseData.details).toBeDefined();
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        ...validTicketData,
        subject: '<script>alert("XSS")</script>Payment issue',
        description: '<img src=x onerror=alert("XSS")>Credit card declined'
      };

      const request = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousData)
      });

      const response = await createTicket(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.ticket.subject).not.toContain('<script>');
      expect(responseData.ticket.description).not.toContain('<img');
    });

    it('should handle wedding emergencies with critical priority', async () => {
      const emergencyData = {
        ...validTicketData,
        subject: 'URGENT: Wedding ceremony in 2 hours - photos not uploading!',
        description: 'Bride and groom photos not syncing for todays ceremony',
        urgency_keywords: ['urgent', 'emergency', 'wedding', 'today']
      };

      const request = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emergencyData)
      });

      const response = await createTicket(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.ticket.is_wedding_emergency).toBe(true);
      expect(responseData.ticket.priority).toBe('critical');
    });

    it('should apply rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 6 }, () => 
        new NextRequest('http://localhost:3000/api/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validTicketData)
        })
      );

      const responses = await Promise.all(
        requests.map(req => createTicket(req))
      );

      // Should have at least one rate-limited response
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});

describe('/api/tickets/[id]', () => {
  const ticketId = 'ticket-123';

  describe('GET /api/tickets/[id]', () => {
    it('should return specific ticket', async () => {
      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
        method: 'GET'
      });

      const response = await getTicket(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.ticket).toBeDefined();
      expect(responseData.ticket.id).toBe(ticketId);
    });

    it('should return 404 for non-existent ticket', async () => {
      // Mock ticket not found
      const TicketManager = require('@/lib/support/ticket-manager');
      const mockTicketManager = new TicketManager();
      mockTicketManager.getTicketById.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/tickets/non-existent', {
        method: 'GET'
      });

      const response = await getTicket(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should include SLA information', async () => {
      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
        method: 'GET'
      });

      const response = await getTicket(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.sla_status).toBeDefined();
      expect(responseData.sla_status.response_time_remaining).toBeDefined();
      expect(responseData.sla_status.resolution_time_remaining).toBeDefined();
    });

    it('should check access permissions', async () => {
      // Mock unauthorized user
      const createServerComponentClient = require('@supabase/auth-helpers-nextjs').createServerComponentClient;
      createServerComponentClient.mockReturnValueOnce({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: { id: 'other-user' } },
            error: null
          }))
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: { message: 'Access denied' }
              }))
            }))
          }))
        }))
      });

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
        method: 'GET'
      });

      const response = await getTicket(request, { params: { id: ticketId } });
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/tickets/[id]', () => {
    it('should update ticket status', async () => {
      const updateData = {
        status: 'in_progress',
        assigned_to: 'agent-123'
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await updateTicket(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Ticket updated successfully');
      expect(responseData.ticket.status).toBe('in_progress');
    });

    it('should validate status transitions', async () => {
      const invalidUpdate = {
        status: 'invalid_status'
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidUpdate)
      });

      const response = await updateTicket(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid update data');
    });

    it('should track update history', async () => {
      const updateData = {
        status: 'resolved',
        resolution_notes: 'Issue resolved by updating payment method'
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await updateTicket(request, { params: { id: ticketId } });
      expect(response.status).toBe(200);

      // Verify audit trail creation
      const TicketManager = require('@/lib/support/ticket-manager');
      const mockTicketManager = new TicketManager();
      expect(mockTicketManager.updateTicketStatus).toHaveBeenCalledWith(
        ticketId,
        'resolved',
        expect.any(String)
      );
    });
  });
});

describe('/api/tickets/[id]/messages', () => {
  const ticketId = 'ticket-123';

  describe('POST /api/tickets/[id]/messages', () => {
    it('should add message to ticket', async () => {
      const messageData = {
        content: 'Thank you for contacting support. I will help you resolve this issue.',
        message_type: 'response',
        is_internal: false
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      const response = await addMessage(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message).toBeDefined();
      expect(responseData.message.content).toBe(messageData.content);
    });

    it('should sanitize message content', async () => {
      const maliciousMessage = {
        content: '<script>alert("XSS")</script>This is a response',
        message_type: 'response',
        is_internal: false
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousMessage)
      });

      const response = await addMessage(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message.content).not.toContain('<script>');
    });

    it('should handle attachments', async () => {
      const messageWithAttachments = {
        content: 'Please see attached screenshot',
        message_type: 'response',
        is_internal: false,
        attachments: [
          {
            filename: 'screenshot.png',
            file_size: 1024000,
            content_type: 'image/png',
            url: 'https://example.com/screenshot.png'
          }
        ]
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageWithAttachments)
      });

      const response = await addMessage(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message.attachments).toBeDefined();
      expect(responseData.message.attachments).toHaveLength(1);
    });

    it('should validate message content length', async () => {
      const longMessage = {
        content: 'a'.repeat(10000), // Very long message
        message_type: 'response',
        is_internal: false
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(longMessage)
      });

      const response = await addMessage(request, { params: { id: ticketId } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid message data');
    });

    it('should update first response time', async () => {
      const firstResponse = {
        content: 'This is our first response to your ticket',
        message_type: 'response',
        is_internal: false
      };

      const request = new NextRequest(`http://localhost:3000/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(firstResponse)
      });

      const response = await addMessage(request, { params: { id: ticketId } });
      expect(response.status).toBe(201);

      // Verify first response time was recorded
      const TicketManager = require('@/lib/support/ticket-manager');
      const mockTicketManager = new TicketManager();
      expect(mockTicketManager.addTicketMessage).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          content: firstResponse.content,
          sent_by: mockSupabaseUser.id
        })
      );
    });
  });
});