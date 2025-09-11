/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/collaboration/save/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers');

// Mock Y.js
jest.mock('yjs', () => ({
  encodeStateAsUpdate: jest.fn(() => new Uint8Array([1, 2, 3])),
  encodeStateVector: jest.fn(() => new Uint8Array([4, 5, 6])),
}));

// Helper functions to reduce function nesting - REFACTORED TO MEET 4-LEVEL LIMIT

/**
 * Creates a mock Supabase client with standard methods - EXTRACTED TO REDUCE NESTING
 */
function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => createMockFromChain()),
    channel: jest.fn(() => createMockChannel()),
  };
}

/**
 * Creates mock 'from' method chain - EXTRACTED TO REDUCE NESTING
 */
function createMockFromChain() {
  return {
    select: jest.fn(() => createMockSelectChain()),
    update: jest.fn(() => createMockUpdateChain()),
    insert: jest.fn(),
  };
}

/**
 * Creates mock 'select' method chain - EXTRACTED TO REDUCE NESTING
 */
function createMockSelectChain() {
  return {
    eq: jest.fn(() => createMockEqChain()),
  };
}

/**
 * Creates mock 'eq' method chain - EXTRACTED TO REDUCE NESTING
 */
function createMockEqChain() {
  return {
    eq: jest.fn(() => createMockEqChain()),
    single: jest.fn(),
  };
}

/**
 * Creates mock select-single chain for updates - EXTRACTED TO REDUCE NESTING BELOW 4 LEVELS
 */
function createMockSelectSingleChain() {
  return {
    single: jest.fn(),
  };
}

/**
 * Creates mock 'update' method chain - EXTRACTED TO REDUCE NESTING
 */
function createMockUpdateChain() {
  return {
    eq: jest.fn(() => ({
      select: jest.fn(() => createMockSelectSingleChain()),
    })),
  };
}

/**
 * Creates mock channel - EXTRACTED TO REDUCE NESTING
 */
function createMockChannel() {
  return {
    send: jest.fn(),
  };
}

/**
 * Sets up authenticated user mock - EXTRACTED TO REDUCE NESTING
 */
function mockAuthenticatedUser(mockSupabase: any, user = { id: 'user-123', email: 'test@example.com' }) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });
}

/**
 * Sets up unauthenticated user mock - EXTRACTED TO REDUCE NESTING
 */
function mockUnauthenticatedUser(mockSupabase: any) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

/**
 * Sets up edit permission mock - EXTRACTED TO REDUCE NESTING
 */
function mockEditPermission(mockSupabase: any, canEdit = true) {
  mockSupabase
    .from()
    .select()
    .eq()
    .single.mockResolvedValue({
      data: { can_edit: canEdit },
      error: null,
    });
}

/**
 * Sets up document update success mock - EXTRACTED TO REDUCE NESTING
 */
function mockDocumentUpdateSuccess(mockSupabase: any, docData = {}) {
  const defaultDocData = {
    id: 'doc-123',
    version: 1642781234567,
    updated_at: '2024-01-21T12:00:00Z',
    ...docData,
  };

  mockSupabase
    .from()
    .update()
    .eq()
    .select()
    .single.mockResolvedValue({
      data: defaultDocData,
      error: null,
    });
}

/**
 * Sets up document update error mock - EXTRACTED TO REDUCE NESTING
 */
function mockDocumentUpdateError(mockSupabase: any, errorMessage = 'Database error') {
  mockSupabase
    .from()
    .update()
    .eq()
    .select()
    .single.mockResolvedValue({
      data: null,
      error: { message: errorMessage },
    });
}

/**
 * Sets up activity logging success mock - EXTRACTED TO REDUCE NESTING
 */
function mockActivityLoggingSuccess(mockSupabase: any) {
  mockSupabase.from().insert.mockResolvedValue({
    data: {},
    error: null,
  });
}

/**
 * Creates a POST request for collaboration save - EXTRACTED TO REDUCE NESTING
 */
function createCollaborationSaveRequest(data: {
  documentId: string;
  content: string;
  weddingId: string;
  yDocState?: string;
}) {
  return new NextRequest('http://localhost:3000/api/collaboration/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Creates a GET request for collaboration save - EXTRACTED TO REDUCE NESTING
 */
function createCollaborationGetRequest(documentId: string, weddingId?: string) {
  const url = weddingId
    ? `http://localhost:3000/api/collaboration/save?documentId=${documentId}&weddingId=${weddingId}`
    : `http://localhost:3000/api/collaboration/save?documentId=${documentId}`;
  
  return new NextRequest(url);
}

// Expected data objects - EXTRACTED TO REDUCE NESTING BELOW 4 LEVELS
const EXPECTED_BROADCAST_PAYLOAD = {
  documentId: 'doc-123',
  updatedBy: 'user-123',
  version: 1642781234567,
  timestamp: '2024-01-21T12:00:00Z',
};

const EXPECTED_PERMISSIONS = {
  can_edit: true,
  can_comment: true,
  can_share: false,
};

/**
 * Sets up document retrieval success mock - EXTRACTED TO REDUCE NESTING
 */
function mockDocumentRetrievalSuccess(mockSupabase: any, docData = {}) {
  const defaultDocData = {
    id: 'doc-123',
    title: 'Guest List',
    content: 'Wedding content',
    type: 'guest_list',
    version: 1642781234567,
    yjs_state: 'base64state',
    updated_at: '2024-01-21T12:00:00Z',
    collaborative_permissions: [
      {
        can_edit: true,
        can_comment: true,
        can_share: false,
      },
    ],
    ...docData,
  };

  mockSupabase
    .from()
    .select()
    .eq()
    .eq()
    .eq()
    .single.mockResolvedValue({
      data: defaultDocData,
      error: null,
    });
}

/**
 * Sets up document retrieval error mock - EXTRACTED TO REDUCE NESTING
 */
function mockDocumentRetrievalError(mockSupabase: any) {
  mockSupabase
    .from()
    .select()
    .eq()
    .eq()
    .eq()
    .single.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });
}

describe('/api/collaboration/save', () => {
  // Use extracted helper function - REDUCED NESTING FROM 6 TO 2 LEVELS
  const mockSupabase = createMockSupabaseClient();

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue(new Map());
  });

  describe('POST /api/collaboration/save', () => {
    it('saves document successfully with valid data', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 5-6 TO 3-4 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockEditPermission(mockSupabase, true);
      mockDocumentUpdateSuccess(mockSupabase);
      mockActivityLoggingSuccess(mockSupabase);

      const request = createCollaborationSaveRequest({
        documentId: 'doc-123',
        content: 'Updated wedding guest list content',
        weddingId: 'wedding-456',
        yDocState: 'base64encodedstate',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Document saved successfully');
      expect(data.document).toEqual({
        id: 'doc-123',
        version: 1642781234567,
        updated_at: '2024-01-21T12:00:00Z',
      });
    });

    it('returns 401 when user is not authenticated', async () => {
      // Use extracted helper functions - REDUCED NESTING
      mockUnauthenticatedUser(mockSupabase);

      const request = createCollaborationSaveRequest({
        documentId: 'doc-123',
        content: 'Content',
        weddingId: 'wedding-456',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 403 when user lacks edit permission', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 5 TO 3 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockEditPermission(mockSupabase, false);

      const request = createCollaborationSaveRequest({
        documentId: 'doc-123',
        content: 'Content',
        weddingId: 'wedding-456',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Permission denied');
    });

    it('validates request data with Zod schema', async () => {
      // Use extracted helper functions - REDUCED NESTING
      mockAuthenticatedUser(mockSupabase, mockUser);

      const request = createCollaborationSaveRequest({
        documentId: 'invalid-uuid',
        content: 'Content',
        weddingId: 'wedding-456',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('handles database update errors', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockEditPermission(mockSupabase, true);
      mockDocumentUpdateError(mockSupabase, 'Database error');

      const request = createCollaborationSaveRequest({
        documentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        content: 'Content',
        weddingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save document');
    });

    it('logs collaboration activity', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockEditPermission(mockSupabase, true);
      mockDocumentUpdateSuccess(mockSupabase);
      mockActivityLoggingSuccess(mockSupabase);

      const request = createCollaborationSaveRequest({
        documentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        content: 'Wedding planning content',
        weddingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
      });

      await POST(request);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        document_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: 'user-123',
        action: 'edit',
        changes_size: 24, // Length of content
        timestamp: expect.any(String),
      });
    });

    it('broadcasts real-time updates to collaborators', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockEditPermission(mockSupabase, true);
      mockDocumentUpdateSuccess(mockSupabase);
      mockActivityLoggingSuccess(mockSupabase);

      const mockChannel = {
        send: jest.fn(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      const request = createCollaborationSaveRequest({
        documentId: 'doc-123',
        content: 'Content',
        weddingId: 'wedding-456',
      });

      await POST(request);

      expect(mockSupabase.channel).toHaveBeenCalledWith('document-doc-123');
      // REDUCED NESTING TO 4 LEVELS - using module-level payload object
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'document_updated',
        payload: EXPECTED_BROADCAST_PAYLOAD,
      });
    });
  });

  describe('GET /api/collaboration/save', () => {
    it('retrieves document successfully', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockDocumentRetrievalSuccess(mockSupabase);

      const request = createCollaborationGetRequest('doc-123', 'wedding-456');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // REDUCED NESTING TO 4 LEVELS - using module-level permissions object
      expect(data.document).toEqual({
        id: 'doc-123',
        title: 'Guest List',
        content: 'Wedding content',
        type: 'guest_list',
        version: 1642781234567,
        yjs_state: 'base64state',
        updated_at: '2024-01-21T12:00:00Z',
        permissions: EXPECTED_PERMISSIONS,
      });
    });

    it('returns 400 when missing query parameters', async () => {
      // Use extracted helper function - REDUCED NESTING
      const request = createCollaborationGetRequest('doc-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing documentId or weddingId');
    });

    it('returns 404 when document not found', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
      mockAuthenticatedUser(mockSupabase, mockUser);
      mockDocumentRetrievalError(mockSupabase);

      const request = createCollaborationGetRequest('doc-123', 'wedding-456');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found or access denied');
    });
  });
});

// Helper to create wedding context mock user - EXTRACTED TO REDUCE NESTING
const createWeddingContextMockUser = () => ({
  id: 'bride-123',
  email: 'bride@wedding.com',
});

describe('Collaboration Save API - Wedding Context', () => {
  // Use extracted helper function - REDUCED NESTING FROM 6 TO 2 LEVELS
  const mockSupabase = createMockSupabaseClient();
  const mockUser = createWeddingContextMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue(new Map());
  });

  it('handles guest list document saves', async () => {
    // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
    mockAuthenticatedUser(mockSupabase, mockUser);
    mockEditPermission(mockSupabase, true);
    mockDocumentUpdateSuccess(mockSupabase, {
      id: 'guest-list-doc',
      version: 1642781234567,
      updated_at: '2024-01-21T12:00:00Z',
    });
    mockActivityLoggingSuccess(mockSupabase);

    const guestListContent = `
John Doe - Confirmed - Table 1 - Vegetarian
Jane Smith - Pending - Table 2 - No restrictions
Mike Johnson - Confirmed - Table 1 - Gluten-free
    `.trim();

    const request = createCollaborationSaveRequest({
      documentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      content: guestListContent,
      weddingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('handles vendor selection document saves', async () => {
    // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
    mockAuthenticatedUser(mockSupabase, mockUser);
    mockEditPermission(mockSupabase, true);
    mockDocumentUpdateSuccess(mockSupabase, {
      id: 'vendor-doc',
      version: 1642781234567,
      updated_at: '2024-01-21T12:00:00Z',
    });
    mockActivityLoggingSuccess(mockSupabase);

    const vendorContent = `
Photography:
- Studio A: £2,500 - SELECTED ✅
- Studio B: £3,200 - Good portfolio
- Studio C: £1,800 - Budget option

Catering:
- Delicious Bites: £45/person - Confirmed ✅
- Gourmet Catering: £55/person - Expensive
    `.trim();

    const request = createCollaborationSaveRequest({
      documentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      content: vendorContent,
      weddingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles timeline document saves', async () => {
    // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
    mockAuthenticatedUser(mockSupabase, mockUser);
    mockEditPermission(mockSupabase, true);
    mockDocumentUpdateSuccess(mockSupabase, {
      id: 'timeline-doc',
      version: 1642781234567,
      updated_at: '2024-01-21T12:00:00Z',
    });
    mockActivityLoggingSuccess(mockSupabase);

    const timelineContent = `
Wedding Day Timeline - June 15, 2024

9:00 AM - Hair & Makeup begins
10:30 AM - Photographer arrives
12:00 PM - Bridal party ready
1:00 PM - Ceremony starts
2:00 PM - Photos & cocktails
6:00 PM - Reception begins
11:00 PM - Last dance
    `.trim();

    const request = createCollaborationSaveRequest({
      documentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      content: timelineContent,
      weddingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('tracks wedding-specific activity metrics', async () => {
    // Use extracted helper functions - REDUCED NESTING FROM 6 TO 3 LEVELS
    mockAuthenticatedUser(mockSupabase, mockUser);
    mockEditPermission(mockSupabase, true);
    mockDocumentUpdateSuccess(mockSupabase, {
      id: 'wedding-doc',
      version: 1642781234567,
      updated_at: '2024-01-21T12:00:00Z',
    });
    mockActivityLoggingSuccess(mockSupabase);

    const weddingContent = 'Wedding planning updates...';

    const request = createCollaborationSaveRequest({
      documentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      content: weddingContent,
      weddingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    });

    await POST(request);

    // Should log activity with wedding context
    expect(mockSupabase.from().insert).toHaveBeenCalledWith({
      document_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      user_id: 'bride-123',
      action: 'edit',
      changes_size: weddingContent.length,
      timestamp: expect.any(String),
    });
  });
});
