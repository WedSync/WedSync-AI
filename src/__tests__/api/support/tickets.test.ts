import { jest } from '@jest/globals';
import { GET, POST } from '@/app/api/support/tickets/route';
import { createMocks } from 'node-mocks-http';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() =>
        Promise.resolve({ data: { path: 'test-path' }, error: null }),
      ),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'https://test.com/file' },
      })),
    })),
  },
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabase,
}));

// Mock rate limiter
jest.mock('@/lib/ratelimit', () => ({
  ratelimit: {
    limit: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('/api/support/tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { organization_id: 'test-org-id' },
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/support/tickets', () => {
    test('returns tickets for authenticated user', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          ticket_number: 'T-001',
          title: 'Test Ticket 1',
          description: 'Test description',
          priority: 'medium',
          status: 'new',
          category: 'technical',
          organization_id: 'test-org-id',
          created_by: 'test-user-id',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockTickets,
        error: null,
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets',
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockTickets);

      expect(mockSupabase.from).toHaveBeenCalledWith(
        'support_tickets_with_details',
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        'organization_id',
        'test-org-id',
      );
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    test('supports pagination', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets?page=2&limit=5',
      });

      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await GET(req as any);

      expect(mockSupabase.limit).toHaveBeenCalledWith(5);
      // Note: In real implementation, you'd also test the offset calculation
    });

    test('supports filtering by status', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets?status=new',
      });

      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await GET(req as any);

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'new');
    });

    test('supports filtering by priority', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets?priority=urgent',
      });

      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await GET(req as any);

      expect(mockSupabase.eq).toHaveBeenCalledWith('priority', 'urgent');
    });

    test('returns 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets',
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    test('handles database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error', code: '500' },
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets',
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch tickets');
      expect(responseData.details).toBe('Database connection error');
    });
  });

  describe('POST /api/support/tickets', () => {
    const validTicketData = {
      title: 'Test Support Ticket',
      description: 'This is a test ticket description',
      priority: 'medium',
      category: 'technical',
      venue_name: 'Test Venue',
      wedding_date: '2024-06-15',
    };

    test('creates a new ticket successfully', async () => {
      const mockCreatedTicket = {
        id: 'new-ticket-id',
        ticket_number: 'T-002',
        ...validTicketData,
        status: 'new',
        organization_id: 'test-org-id',
        created_by: 'test-user-id',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCreatedTicket,
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: validTicketData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockCreatedTicket);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validTicketData.title,
          description: validTicketData.description,
          priority: validTicketData.priority,
          category: validTicketData.category,
          organization_id: 'test-org-id',
          created_by: 'test-user-id',
        }),
      );
    });

    test('validates required fields', async () => {
      const invalidData = {
        description: 'Missing title',
      };

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: invalidData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
      expect(responseData.details).toContain('title');
    });

    test('validates title length', async () => {
      const invalidData = {
        ...validTicketData,
        title: 'a'.repeat(201), // Too long
      };

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: invalidData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });

    test('validates priority values', async () => {
      const invalidData = {
        ...validTicketData,
        priority: 'invalid_priority',
      };

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: invalidData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });

    test('handles wedding day emergency priority', async () => {
      const emergencyData = {
        ...validTicketData,
        priority: 'wedding_day_emergency',
        location: JSON.stringify({
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10,
        }),
      };

      const mockEmergencyTicket = {
        id: 'emergency-ticket-id',
        ticket_number: 'T-EMERGENCY-001',
        ...emergencyData,
        status: 'new',
        organization_id: 'test-org-id',
        created_by: 'test-user-id',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEmergencyTicket,
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: emergencyData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.data.priority).toBe('wedding_day_emergency');

      // Should auto-assign to on-call agent for wedding emergencies
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'wedding_day_emergency',
          auto_assigned: true,
        }),
      );
    });

    test('handles voice note upload', async () => {
      const dataWithVoiceNote = {
        ...validTicketData,
        voice_note_data:
          'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEA...',
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'ticket-with-voice', ticket_number: 'T-003' },
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: dataWithVoiceNote,
      });

      const response = await POST(req as any);

      expect(response.status).toBe(201);
      expect(mockSupabase.storage.from().upload).toHaveBeenCalled();
    });

    test('applies rate limiting', async () => {
      const mockRateLimit = require('@/lib/ratelimit');
      mockRateLimit.ratelimit.limit.mockResolvedValueOnce({ success: false });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: validTicketData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Too many requests');
    });

    test('requires authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: validTicketData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    test('handles database insertion errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation', code: '23505' },
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: validTicketData,
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to create ticket');
    });

    test('sanitizes input to prevent XSS', async () => {
      const maliciousData = {
        ...validTicketData,
        title: '<script>alert("xss")</script>Malicious Title',
        description:
          '<img src="x" onerror="alert(\'xss\')" />Malicious description',
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'sanitized-ticket', ticket_number: 'T-004' },
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: maliciousData,
      });

      const response = await POST(req as any);

      expect(response.status).toBe(201);

      // Check that script tags were sanitized
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.title).not.toContain('<script>');
      expect(insertCall.description).not.toContain('<img');
      expect(insertCall.title).toContain('Malicious Title'); // Content preserved
    });

    test('handles file attachment metadata', async () => {
      const dataWithAttachments = {
        ...validTicketData,
        attachments: [
          {
            name: 'screenshot.png',
            type: 'image/png',
            size: 125000,
            data: 'base64-encoded-image-data',
          },
          {
            name: 'log.txt',
            type: 'text/plain',
            size: 5000,
            data: 'base64-encoded-text-data',
          },
        ],
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'ticket-with-attachments', ticket_number: 'T-005' },
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: dataWithAttachments,
      });

      const response = await POST(req as any);

      expect(response.status).toBe(201);

      // Should upload both attachments
      expect(mockSupabase.storage.from().upload).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('handles network timeouts gracefully', async () => {
      mockSupabase.single.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 100),
          ),
      );

      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets',
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toMatch(/failed|error/i);
    });

    test('handles malformed JSON gracefully', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toMatch(/invalid|json/i);
    });

    test('handles missing organization_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {}, // No organization_id
          },
        },
        error: null,
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/support/tickets',
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toMatch(/organization/i);
    });
  });

  describe('Wedding-Specific Features', () => {
    test('automatically escalates Saturday tickets', async () => {
      // Mock Saturday date (day 6 = Saturday)
      const saturdayDate = new Date('2024-06-15T14:30:00Z'); // Saturday
      jest.spyOn(Date, 'now').mockReturnValue(saturdayDate.getTime());

      const weekendTicketData = {
        ...validTicketData,
        wedding_date: '2024-06-15', // Same day as current date
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'weekend-ticket', ticket_number: 'T-SAT-001' },
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: weekendTicketData,
      });

      const response = await POST(req as any);

      expect(response.status).toBe(201);

      // Should auto-escalate to urgent for Saturday tickets
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: expect.stringMatching(/urgent|high/),
          auto_escalated: true,
          escalation_reason: expect.stringContaining('weekend'),
        }),
      );
    });

    test('tags venue-related tickets appropriately', async () => {
      const venueTicketData = {
        ...validTicketData,
        category: 'venue',
        venue_name: 'The Royal Wedding Hall',
        description: 'Issues with the sound system in the main hall',
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'venue-ticket', ticket_number: 'T-VENUE-001' },
        error: null,
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/support/tickets',
        body: venueTicketData,
      });

      const response = await POST(req as any);

      expect(response.status).toBe(201);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'venue',
          venue_name: 'The Royal Wedding Hall',
          tags: expect.arrayContaining(['venue', 'audio']),
        }),
      );
    });
  });
});
