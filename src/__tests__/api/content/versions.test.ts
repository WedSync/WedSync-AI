/**
 * WS-223 Content Versioning and Publishing Workflow Tests
 * Team B - Tests for version control and publishing workflow
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, PATCH } from '@/app/api/content/versions/route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};
(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('/api/content/versions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/content/versions', () => {
    it('should fetch version history for content', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
        title: 'Test Article',
        status: 'published',
      };

      const mockVersions = [
        {
          id: 'version-1',
          version_number: 2,
          version_note: 'Updated content',
          is_major_version: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'version-2',
          version_number: 1,
          version_note: 'Initial version',
          is_major_version: true,
          created_at: new Date().toISOString(),
        },
      ];

      const mockWorkflow = {
        content_id: 'content-123',
        workflow_status: 'published',
        published_at: new Date().toISOString(),
      };

      // Mock content ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock versions fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockVersions,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 2,
          }),
        }),
      });

      // Mock workflow fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkflow,
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/versions?content_id=content-123&organization_id=org-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.versions).toHaveLength(2);
      expect(data.data.content_info.workflow.workflow_status).toBe('published');
    });

    it('should include content when requested', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
        title: 'Test Article',
        status: 'published',
      };

      const mockVersionsWithContent = [
        {
          id: 'version-1',
          version_number: 1,
          title: 'Test Article',
          rich_content: '<p>Content</p>',
          plain_content: 'Content',
          metadata: {},
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockVersionsWithContent,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1 }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/versions?content_id=content-123&organization_id=org-123&include_content=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.versions[0].rich_content).toBeDefined();
    });

    it('should prevent access to unauthorized content', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'different-org',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/versions?content_id=content-123&organization_id=org-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/content/versions', () => {
    it('should create new version successfully', async () => {
      const mockCurrentContent = {
        id: 'content-123',
        organization_id: 'org-123',
        title: 'Test Article',
        rich_content: '<p>Updated content</p>',
        plain_content: 'Updated content',
        metadata: {},
        version: 1,
      };

      const mockLatestVersion = {
        version_number: 1,
        rich_content: '<p>Original content</p>',
        plain_content: 'Original content',
      };

      const mockNewVersion = {
        id: 'version-2',
        content_id: 'content-123',
        version_number: 2,
        version_note: 'Updated version',
      };

      // Mock current content fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock latest version fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLatestVersion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Mock version creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockNewVersion,
              error: null,
            }),
          }),
        }),
      });

      // Mock content version update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        version_note: 'Updated version',
        is_major_version: false,
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.version.version_number).toBe(2);
      expect(data.data.change_summary).toBeDefined();
    });

    it('should calculate content differences', async () => {
      const mockCurrentContent = {
        id: 'content-123',
        organization_id: 'org-123',
        rich_content: '<p>This is new updated content with more words</p>',
        plain_content: 'This is new updated content with more words',
        version: 1,
      };

      const mockLatestVersion = {
        version_number: 1,
        rich_content: '<p>This is old content</p>',
        plain_content: 'This is old content',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLatestVersion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'version-2', version_number: 2 },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.change_summary.characters_added).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/content/versions - Publishing Workflow', () => {
    it('should submit content for review', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
        status: 'draft',
      };

      const mockWorkflow = {
        content_id: 'content-123',
        workflow_status: 'draft',
      };

      const mockUpdatedWorkflow = {
        ...mockWorkflow,
        workflow_status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      // Mock content ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock workflow fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkflow,
              error: null,
            }),
          }),
        }),
      });

      // Mock workflow update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedWorkflow,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock content status update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        action: 'submit',
        note: 'Ready for review',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.workflow.workflow_status).toBe('submitted');
      expect(data.data.action_performed).toBe('submit');
    });

    it('should publish approved content', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
        status: 'approved',
      };

      const mockWorkflow = {
        content_id: 'content-123',
        workflow_status: 'approved',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkflow,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockWorkflow, workflow_status: 'published' },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        action: 'publish',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.workflow.workflow_status).toBe('published');
    });

    it('should schedule content for future publication', async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
        status: 'approved',
      };

      const mockWorkflow = {
        content_id: 'content-123',
        workflow_status: 'approved',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkflow,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockWorkflow,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        action: 'schedule',
        scheduled_at: futureDate,
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
    });

    it('should reject content with reason', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
      };

      const mockWorkflow = {
        content_id: 'content-123',
        workflow_status: 'submitted',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkflow,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockWorkflow, workflow_status: 'rejected' },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        action: 'reject',
        note: 'Content needs more detail',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.workflow.workflow_status).toBe('rejected');
    });

    it('should validate workflow state transitions', async () => {
      const mockContent = {
        id: 'content-123',
        organization_id: 'org-123',
      };

      const mockWorkflow = {
        content_id: 'content-123',
        workflow_status: 'draft',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkflow,
              error: null,
            }),
          }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        action: 'publish', // Can't publish from draft
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('must be approved to publish');
    });
  });

  describe('PATCH /api/content/versions - Rollback', () => {
    it('should rollback to previous version', async () => {
      const mockCurrentContent = {
        id: 'content-123',
        organization_id: 'org-123',
        title: 'Current Title',
        rich_content: '<p>Current content</p>',
        version: 3,
      };

      const mockTargetVersion = {
        id: 'version-2',
        content_id: 'content-123',
        version_number: 2,
        title: 'Previous Title',
        rich_content: '<p>Previous content</p>',
        plain_content: 'Previous content',
        metadata: {},
      };

      const mockRolledBackContent = {
        ...mockCurrentContent,
        title: 'Previous Title',
        rich_content: '<p>Previous content</p>',
        version: 4,
        status: 'draft',
      };

      // Mock content ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock target version fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockTargetVersion,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock backup version creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock rollback update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockRolledBackContent,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock rollback version creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'version-5', version_number: 5 },
              error: null,
            }),
          }),
        }),
      });

      // Mock final version number update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock workflow reset
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        target_version: 2,
        rollback_note: 'Rolling back to stable version',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.target_version).toBe(2);
      expect(data.data.backup_version_created).toBe(4);
    });

    it('should return 404 for non-existent target version', async () => {
      const mockCurrentContent = {
        id: 'content-123',
        organization_id: 'org-123',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentContent,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const requestBody = {
        content_id: 'content-123',
        target_version: 999,
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Version 999 not found');
    });
  });

  describe('Validation and Security', () => {
    it('should validate required parameters', async () => {
      const request = new NextRequest('http://localhost/api/content/versions');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Content ID and Organization ID are required');
    });

    it('should validate UUID format', async () => {
      const requestBody = {
        content_id: 'invalid-uuid',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/versions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/versions?content_id=content-123&organization_id=org-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(404);
    });
  });
});
