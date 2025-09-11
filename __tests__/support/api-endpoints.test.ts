import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
  channel: jest.fn()
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}));

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabase
}));

// Mock rate limiter
const mockRateLimit = jest.fn();
jest.mock('@/lib/rate-limiter', () => ({
  __esModule: true,
  default: () => ({
    check: mockRateLimit
  })
}));

// Mock services
jest.mock('@/lib/support/ticket-manager');
jest.mock('@/lib/support/ai-classifier');

describe('Support Tickets API Endpoints', () => {
  let mockQuery: any;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn()
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockRateLimit.mockResolvedValue(true);
  });

  describe('GET /api/support/tickets', () => {
    test('should return tickets for authenticated user', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          title: 'Test Ticket',
          description: 'Test description',
          status: 'open',
          priority: 'medium',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          created_at: new Date().toISOString()
        }
      ];

      mockQuery.then.mockImplementation((callback) => 
        callback({ data: mockTickets, error: null })
      );

      // Import the handler after mocks are set up
      const { GET } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tickets).toEqual(mockTickets);
      expect(mockSupabase.from).toHaveBeenCalledWith('support_tickets');
    });

    test('should handle authentication failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const { GET } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should handle rate limiting', async () => {
      mockRateLimit.mockRejectedValue(new Error('Rate limit exceeded'));

      const { GET } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    test('should apply filters from query parameters', async () => {
      const { GET } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets?status=open&priority=high&wedding_urgency=today');
      const response = await GET(request);

      // Verify filters were applied to query
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'open');
    });

    test('should handle database errors', async () => {
      mockQuery.then.mockImplementation((callback) => 
        callback({ data: null, error: { message: 'Database error' } })
      );

      const { GET } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch tickets');
    });
  });

  describe('POST /api/support/tickets', () => {
    const validTicketData = {
      title: 'Wedding Day Emergency',
      description: 'Photographer did not show up',
      category: 'vendor',
      priority: 'critical',
      customer_name: 'Jane Doe',
      customer_email: 'jane@example.com',
      wedding_date: '2025-09-03T15:00:00Z',
      tags: ['wedding_day', 'emergency']
    };

    test('should create ticket successfully', async () => {
      const createdTicket = {
        id: 'ticket-new',
        ...validTicketData,
        status: 'open',
        created_at: new Date().toISOString(),
        customer_id: mockUser.id,
        organization_id: 'org-123'
      };

      mockQuery.single.mockResolvedValue({
        data: createdTicket,
        error: null
      });

      const { POST } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(validTicketData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.ticket.id).toBe('ticket-new');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const invalidData = {
        title: '', // Empty title
        description: 'Some description'
      };

      const { POST } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    test('should handle wedding day emergency creation', async () => {
      const emergencyTicket = {
        ...validTicketData,
        title: 'URGENT: Wedding photographer no-show',
        priority: 'wedding_day',
        wedding_date: new Date().toISOString() // Today
      };

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'emergency-ticket',
          ...emergencyTicket,
          is_escalated: true
        },
        error: null
      });

      const { POST } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(emergencyTicket),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ticket.is_escalated).toBe(true);
    });

    test('should enforce rate limiting on ticket creation', async () => {
      mockRateLimit.mockRejectedValue(new Error('Rate limit exceeded'));

      const { POST } = await import('@/app/api/support/tickets/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(validTicketData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });

  describe('GET /api/support/tickets/[id]', () => {
    const ticketId = 'ticket-123';

    test('should return specific ticket', async () => {
      const mockTicket = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test description',
        status: 'open',
        priority: 'medium',
        customer_id: mockUser.id,
        created_at: new Date().toISOString()
      };

      mockQuery.single.mockResolvedValue({
        data: mockTicket,
        error: null
      });

      const { GET } = await import('@/app/api/support/tickets/[id]/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}`);
      const response = await GET(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket.id).toBe(ticketId);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', ticketId);
    });

    test('should return 404 for non-existent ticket', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const { GET } = await import('@/app/api/support/tickets/[id]/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}`);
      const response = await GET(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Ticket not found');
    });

    test('should enforce ownership for customer users', async () => {
      const otherUserTicket = {
        id: ticketId,
        customer_id: 'other-user-456',
        title: 'Other user ticket'
      };

      mockQuery.single.mockResolvedValue({
        data: otherUserTicket,
        error: null
      });

      const { GET } = await import('@/app/api/support/tickets/[id]/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}`);
      const response = await GET(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Ticket not found');
    });
  });

  describe('PATCH /api/support/tickets/[id]', () => {
    const ticketId = 'ticket-123';

    test('should update ticket status successfully', async () => {
      const updates = { status: 'in_progress' };
      
      const updatedTicket = {
        id: ticketId,
        ...updates,
        updated_at: new Date().toISOString()
      };

      mockQuery.single.mockResolvedValue({
        data: updatedTicket,
        error: null
      });

      const { PATCH } = await import('@/app/api/support/tickets/[id]/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket.status).toBe('in_progress');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      );
    });

    test('should handle priority updates with SLA recalculation', async () => {
      const updates = { priority: 'critical' };
      
      mockQuery.single.mockResolvedValue({
        data: { id: ticketId, ...updates },
        error: null
      });

      const { PATCH } = await import('@/app/api/support/tickets/[id]/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: ticketId } });

      expect(response.status).toBe(200);
      expect(mockQuery.update).toHaveBeenCalled();
    });

    test('should validate update data', async () => {
      const invalidUpdates = { status: 'invalid_status' };

      const { PATCH } = await import('@/app/api/support/tickets/[id]/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdates),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('POST /api/support/tickets/[id]/messages', () => {
    const ticketId = 'ticket-123';

    test('should add message to ticket', async () => {
      const messageData = {
        content: 'Thank you for your message, I will help you right away!',
        is_internal: false
      };

      const createdMessage = {
        id: 'message-123',
        ticket_id: ticketId,
        ...messageData,
        author_id: mockUser.id,
        author_name: mockUser.user_metadata.full_name,
        author_role: 'agent',
        created_at: new Date().toISOString()
      };

      mockQuery.single.mockResolvedValue({
        data: createdMessage,
        error: null
      });

      const { POST } = await import('@/app/api/support/tickets/[id]/messages/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message.content).toBe(messageData.content);
      expect(data.message.author_role).toBe('agent');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    test('should handle message with voice note', async () => {
      const messageWithVoice = {
        content: 'Please listen to my voice message',
        voice_note_url: 'https://example.com/voice-note.mp3',
        voice_note_duration: 45
      };

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'voice-message',
          ...messageWithVoice,
          ticket_id: ticketId
        },
        error: null
      });

      const { POST } = await import('@/app/api/support/tickets/[id]/messages/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageWithVoice),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message.voice_note_url).toBe(messageWithVoice.voice_note_url);
      expect(data.message.voice_note_duration).toBe(messageWithVoice.voice_note_duration);
    });

    test('should validate message content', async () => {
      const invalidMessage = {
        content: '' // Empty content
      };

      const { POST } = await import('@/app/api/support/tickets/[id]/messages/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify(invalidMessage),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    test('should enforce rate limiting on messages', async () => {
      mockRateLimit.mockRejectedValue(new Error('Rate limit exceeded'));

      const { POST } = await import('@/app/api/support/tickets/[id]/messages/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Test message' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });

  describe('POST /api/support/tickets/[id]/assign', () => {
    const ticketId = 'ticket-123';

    test('should assign ticket to agent', async () => {
      const assignmentData = {
        agent_id: 'agent-456'
      };

      mockQuery.single.mockResolvedValue({
        data: {
          id: ticketId,
          assigned_agent_id: assignmentData.agent_id,
          status: 'in_progress',
          assigned_at: new Date().toISOString()
        },
        error: null
      });

      const { POST } = await import('@/app/api/support/tickets/[id]/assign/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify(assignmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: { id: ticketId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket.assigned_agent_id).toBe(assignmentData.agent_id);
      expect(data.ticket.status).toBe('in_progress');
    });

    test('should handle auto-assignment based on skills', async () => {
      const autoAssignData = {
        auto_assign: true,
        required_skills: ['wedding_emergency', 'vendor_management']
      };

      mockQuery.single.mockResolvedValue({
        data: {
          id: ticketId,
          assigned_agent_id: 'wedding-specialist-789',
          status: 'in_progress'
        },
        error: null
      });

      const { POST } = await import('@/app/api/support/tickets/[id]/assign/route');
      
      const request = new NextRequest(`http://localhost:3000/api/support/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify(autoAssignData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: { id: ticketId } });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/support/escalation', () => {
    test('should escalate tickets based on SLA breaches', async () => {
      const escalationData = {
        ticket_ids: ['ticket-1', 'ticket-2'],
        escalation_reason: 'SLA breach detected',
        notify_management: true
      };

      mockQuery.then.mockImplementation((callback) => 
        callback({ 
          data: escalationData.ticket_ids.map(id => ({
            id,
            is_escalated: true,
            escalated_at: new Date().toISOString()
          })), 
          error: null 
        })
      );

      const { POST } = await import('@/app/api/support/escalation/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/escalation', {
        method: 'POST',
        body: JSON.stringify(escalationData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.escalated_count).toBe(2);
    });

    test('should handle wedding day emergency escalations', async () => {
      const weddingEscalation = {
        ticket_ids: ['wedding-emergency-123'],
        escalation_reason: 'Wedding day emergency requiring immediate attention',
        priority_override: 'wedding_day',
        notify_management: true,
        alert_on_call_team: true
      };

      mockQuery.then.mockImplementation((callback) => 
        callback({ 
          data: [{
            id: 'wedding-emergency-123',
            is_escalated: true,
            priority: 'wedding_day',
            escalated_at: new Date().toISOString()
          }], 
          error: null 
        })
      );

      const { POST } = await import('@/app/api/support/escalation/route');
      
      const request = new NextRequest('http://localhost:3000/api/support/escalation', {
        method: 'POST',
        body: JSON.stringify(weddingEscalation),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.wedding_day_escalation).toBe(true);
    });
  });
});