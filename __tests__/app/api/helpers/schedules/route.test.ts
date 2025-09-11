import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/helpers/schedules/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers');

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

describe('/api/helpers/schedules API Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWeddingId = '123e4567-e89b-12d3-a456-426614174001';
  const mockHelperId = '123e4567-e89b-12d3-a456-426614174002';
  const mockAssignmentId = '123e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue({});
  });

  describe('GET /api/helpers/schedules', () => {
    it('should return assignments for authenticated wedding owner', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId, email: 'test@example.com' } },
        error: null,
      });

      // Mock wedding check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockWeddingId, user1_id: mockUserId, user2_id: null },
          error: null,
        }),
      });

      // Mock assignments query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [
            {
              id: mockAssignmentId,
              wedding_id: mockWeddingId,
              helper_id: mockHelperId,
              title: 'Test Assignment',
              category: 'photography',
              status: 'pending',
              priority: 'high',
              helper: { id: mockHelperId, full_name: 'John Helper', email: 'helper@test.com' },
              assigned_by: { id: mockUserId, full_name: 'Wedding Owner', email: 'owner@test.com' },
            },
          ],
          error: null,
          count: 1,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignments).toHaveLength(1);
      expect(data.assignments[0].title).toBe('Test Assignment');
      expect(data.summary.total).toBe(1);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when wedding_id is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('wedding_id parameter is required');
    });

    it('should return 404 when wedding not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Wedding not found');
    });

    it('should allow helper to access their own assignments', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockHelperId } },
        error: null,
      });

      // Mock wedding check (user is not owner)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockWeddingId, user1_id: mockUserId, user2_id: null },
          error: null,
        }),
      });

      // Mock helper assignment check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [{ id: mockAssignmentId }],
            error: null,
          }),
        }),
      });

      // Mock assignments query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [
            {
              id: mockAssignmentId,
              helper_id: mockHelperId,
              title: 'Helper Assignment',
            },
          ],
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/helpers/schedules', () => {
    const validAssignmentData = {
      wedding_id: mockWeddingId,
      helper_id: mockHelperId,
      title: 'Photography Setup',
      description: 'Set up photography equipment',
      category: 'photography',
      priority: 'high',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      estimated_hours: 4,
    };

    it('should create assignment for wedding owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId, email: 'test@example.com' } },
        error: null,
      });

      // Mock wedding check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockWeddingId, user1_id: mockUserId, user2_id: null },
          error: null,
        }),
      });

      // Mock helper check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockHelperId, full_name: 'Helper Name', email: 'helper@test.com' },
          error: null,
        }),
      });

      // Mock assignment creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...validAssignmentData,
            id: mockAssignmentId,
            assigned_by_id: mockUserId,
            status: 'pending',
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules', {
        method: 'POST',
        body: JSON.stringify(validAssignmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.assignment.title).toBe('Photography Setup');
      expect(data.assignment.status).toBe('pending');
    });

    it('should return 403 for non-wedding-owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'different-user' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockWeddingId, user1_id: mockUserId, user2_id: null },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules', {
        method: 'POST',
        body: JSON.stringify(validAssignmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only wedding couple can create helper assignments');
    });

    it('should validate required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const invalidData = {
        wedding_id: 'invalid-uuid',
        title: '',
      };

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });
  });

  describe('PUT /api/helpers/schedules', () => {
    const updateData = {
      id: mockAssignmentId,
      status: 'accepted',
      notes: 'Assignment accepted',
    };

    it('should allow helper to update their assignment status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockHelperId } },
        error: null,
      });

      // Mock existing assignment fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockAssignmentId,
            helper_id: mockHelperId,
            assigned_by_id: mockUserId,
            wedding_id: mockWeddingId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...updateData,
            helper: { id: mockHelperId, full_name: 'Helper Name' },
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignment.status).toBe('accepted');
    });

    it('should prevent helper from updating restricted fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockHelperId } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockAssignmentId,
            helper_id: mockHelperId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      const restrictedUpdate = {
        id: mockAssignmentId,
        title: 'New Title',
        priority: 'urgent',
      };

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules', {
        method: 'PUT',
        body: JSON.stringify(restrictedUpdate),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Helpers can only update');
    });
  });

  describe('DELETE /api/helpers/schedules', () => {
    it('should allow wedding owner to delete assignment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing assignment fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockAssignmentId,
            wedding_id: mockWeddingId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      // Mock delete
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?id=${mockAssignmentId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Assignment deleted successfully');
    });

    it('should prevent non-owners from deleting assignments', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockHelperId } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockAssignmentId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?id=${mockAssignmentId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only wedding couple can delete assignments');
    });

    it('should return 400 when assignment ID is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/helpers/schedules', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Assignment ID is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3000/api/helpers/schedules?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});