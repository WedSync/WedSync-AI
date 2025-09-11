/**
 * WS-016: Notes Feature - API Tests
 * Tests for the private client notes system API endpoints
 */

import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/clients/[id]/notes/route';
import { GET as getNoteById, PATCH, DELETE } from '@/app/api/notes/[id]/route';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/security/rbac-system');
jest.mock('@/lib/rate-limit');

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis()
  })),
  channel: jest.fn(() => ({
    send: jest.fn()
  }))
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

const mockUserProfile = {
  first_name: 'John',
  last_name: 'Doe',
  organization_id: 'org-123'
};

const mockNote = {
  id: 'note-123',
  client_id: 'client-123',
  content: 'Test note content',
  note_type: 'client',
  visibility: 'public',
  priority: 'medium',
  tags: ['test'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'user-123',
  created_by_name: 'John Doe',
  is_pinned: false,
  follow_up_date: null
};

describe('Notes API - GET /api/clients/[id]/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase client
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabaseClient);
    
    // Mock rate limiting
    require('@/lib/rate-limit').default.mockReturnValue({
      check: jest.fn().mockResolvedValue({ success: true })
    });
    
    // Mock RBAC system
    require('@/lib/security/rbac-system').rbacSystem = {
      hasPermission: jest.fn().mockResolvedValue(true)
    };
  });

  it('should return notes for a valid client ID', async () => {
    // Setup mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabaseClient.from().single.mockResolvedValue({ data: null, error: null });
    
    const mockQuery = {
      data: [mockNote],
      error: null
    };
    
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue(mockQuery)
    });

    const { req } = createMocks({
      method: 'GET',
      url: '/api/clients/client-123/notes',
      headers: {
        'content-type': 'application/json'
      }
    });

    const context = {
      params: Promise.resolve({ id: 'client-123' })
    };

    const response = await GET(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toHaveLength(1);
    expect(responseData.data[0].id).toBe('note-123');
  });

  it('should return 400 for invalid client ID format', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/clients/invalid-id/notes'
    });

    const context = {
      params: Promise.resolve({ id: 'invalid-id' })
    };

    const response = await GET(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('Invalid client ID format');
  });

  it('should return 401 for unauthorized user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { req } = createMocks({
      method: 'GET',
      url: '/api/clients/123e4567-e89b-12d3-a456-426614174000/notes'
    });

    const context = {
      params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })
    };

    const response = await GET(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBe('Unauthorized');
  });

  it('should filter out private notes from other users', async () => {
    const privateNote = {
      ...mockNote,
      id: 'private-note',
      visibility: 'private',
      created_by: 'other-user'
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [mockNote, privateNote],
        error: null
      })
    });

    const { req } = createMocks({
      method: 'GET',
      url: '/api/clients/client-123/notes'
    });

    const context = {
      params: Promise.resolve({ id: 'client-123' })
    };

    const response = await GET(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toHaveLength(1);
    expect(responseData.data[0].id).toBe('note-123');
  });
});

describe('Notes API - POST /api/clients/[id]/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabaseClient);
    require('@/lib/rate-limit').default.mockReturnValue({
      check: jest.fn().mockResolvedValue({ success: true })
    });
    require('@/lib/security/rbac-system').rbacSystem = {
      hasPermission: jest.fn().mockResolvedValue(true)
    };
  });

  it('should create a new note successfully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({ 
      data: mockUserProfile, 
      error: null 
    });
    mockSupabaseClient.from().insert().select().single.mockResolvedValue({ 
      data: mockNote, 
      error: null 
    });
    mockSupabaseClient.from().insert.mockResolvedValue({ data: null, error: null });

    const { req } = createMocks({
      method: 'POST',
      url: '/api/clients/client-123/notes',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        content: 'New test note',
        note_type: 'client',
        visibility: 'public',
        priority: 'medium',
        tags: ['test']
      }
    });

    const context = {
      params: Promise.resolve({ id: 'client-123' })
    };

    const response = await POST(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.content).toBe('Test note content');
  });

  it('should return 400 for invalid note data', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const { req } = createMocks({
      method: 'POST',
      url: '/api/clients/client-123/notes',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        content: '', // Invalid empty content
        note_type: 'invalid_type', // Invalid type
        visibility: 'public'
      }
    });

    const context = {
      params: Promise.resolve({ id: 'client-123' })
    };

    const response = await POST(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('Invalid note data');
  });
});

describe('Notes API - PATCH /api/notes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabaseClient);
    require('@/lib/rate-limit').default.mockReturnValue({
      check: jest.fn().mockResolvedValue({ success: true })
    });
    require('@/lib/security/rbac-system').rbacSystem = {
      hasPermission: jest.fn().mockResolvedValue(true)
    };
  });

  it('should update a note successfully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock getting existing note
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: { ...mockNote, created_by: mockUser.id },
      error: null
    });
    
    // Mock getting user profile
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: mockUserProfile,
      error: null
    });
    
    // Mock update operation
    const updatedNote = { ...mockNote, content: 'Updated content' };
    mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
      data: updatedNote,
      error: null
    });
    
    // Mock activity insert
    mockSupabaseClient.from().insert.mockResolvedValue({ data: null, error: null });

    const { req } = createMocks({
      method: 'PATCH',
      url: '/api/notes/note-123',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        content: 'Updated content'
      }
    });

    const context = {
      params: Promise.resolve({ id: 'note-123' })
    };

    const response = await PATCH(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.content).toBe('Updated content');
  });

  it('should return 403 when trying to edit another user\'s note', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock getting existing note owned by different user
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: { ...mockNote, created_by: 'other-user' },
      error: null
    });
    
    // Mock hasPermission to return false for admin check
    require('@/lib/security/rbac-system').rbacSystem.hasPermission
      .mockResolvedValueOnce(true) // WEDDING_EDIT permission
      .mockResolvedValueOnce(false); // SYSTEM_ADMIN permission

    const { req } = createMocks({
      method: 'PATCH',
      url: '/api/notes/note-123',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        content: 'Updated content'
      }
    });

    const context = {
      params: Promise.resolve({ id: 'note-123' })
    };

    const response = await PATCH(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error).toBe('Can only edit your own notes');
  });
});

describe('Notes API - DELETE /api/notes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabaseClient);
    require('@/lib/rate-limit').default.mockReturnValue({
      check: jest.fn().mockResolvedValue({ success: true })
    });
    require('@/lib/security/rbac-system').rbacSystem = {
      hasPermission: jest.fn().mockResolvedValue(true)
    };
  });

  it('should delete a note successfully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock getting existing note
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: { ...mockNote, created_by: mockUser.id },
      error: null
    });
    
    // Mock delete operation
    mockSupabaseClient.from().delete().eq.mockResolvedValue({ 
      data: null, 
      error: null 
    });
    
    // Mock getting user profile
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: mockUserProfile,
      error: null
    });
    
    // Mock activity insert
    mockSupabaseClient.from().insert.mockResolvedValue({ data: null, error: null });

    const { req } = createMocks({
      method: 'DELETE',
      url: '/api/notes/note-123'
    });

    const context = {
      params: Promise.resolve({ id: 'note-123' })
    };

    const response = await DELETE(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });

  it('should return 404 for non-existent note', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock note not found
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' } // Supabase not found error code
    });

    const { req } = createMocks({
      method: 'DELETE',
      url: '/api/notes/non-existent-note'
    });

    const context = {
      params: Promise.resolve({ id: 'non-existent-note' })
    };

    const response = await DELETE(req as any, context as any);
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBe('Note not found');
  });
});