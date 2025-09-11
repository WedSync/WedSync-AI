/**
 * WS-223 Content Media Management API Tests
 * Team B - Comprehensive tests for media upload and security
 */

import { NextRequest } from 'next/server';
import { POST, GET, PUT, DELETE } from '@/app/api/content/media/route';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('crypto');
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080 }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('optimized-image')),
  })),
}));

const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    })),
  },
};
(createClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock crypto
(crypto.createHash as jest.Mock).mockReturnValue({
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mockedhash123'),
});
(crypto.randomBytes as jest.Mock).mockReturnValue({
  toString: jest.fn().mockReturnValue('randomstring'),
});

describe('/api/content/media', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Date.now = jest.fn().mockReturnValue(1640995200000); // Fixed timestamp
  });

  describe('POST /api/content/media', () => {
    it('should upload image successfully with optimization', async () => {
      const mockFile = new File(['image content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');
      formData.append('alt_text', 'Test image');

      // Mock file doesn't exist (no duplicate)
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

      // Mock successful upload
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'org-123/1640995200000-randomstring.jpg' },
        error: null,
      });

      // Mock public URL
      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/file.jpg' },
      });

      // Mock database save
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'media-123',
                filename: 'org-123/1640995200000-randomstring.jpg',
                file_url: 'https://storage.url/file.jpg',
                media_type: 'image',
                width: 1920,
                height: 1080,
              },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.media.media_type).toBe('image');
      expect(data.data.optimization_stats).toBeDefined();
    });

    it('should reject files that are too large', async () => {
      const mockFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toContain('File size exceeds maximum limit');
    });

    it('should reject unsupported file types', async () => {
      const mockFile = new File(['executable content'], 'virus.exe', {
        type: 'application/x-msdownload',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(415);
      const data = await response.json();
      expect(data.error).toContain('File type');
      expect(data.error).toContain('is not allowed');
    });

    it('should detect and reject files with suspicious content', async () => {
      const mockFile = new File(
        ['<script>alert("xss")</script>'],
        'script.html',
        { type: 'text/html' },
      );
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      // This should be rejected by file type, but if it somehow gets through:
      const response = await POST(request);

      // Should be rejected for file type
      expect(response.status).toBe(415);
    });

    it('should handle duplicate files correctly', async () => {
      const mockFile = new File(['image content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      // Mock existing file found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'existing-123',
                  file_url: 'https://storage.url/existing.jpg',
                  filename: 'existing.jpg',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('already exists');
    });

    it('should validate form data', async () => {
      const mockFile = new File(['image content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      // Missing organization_id

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid form data');
    });

    it('should handle storage upload failures', async () => {
      const mockFile = new File(['image content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      // Mock no duplicate
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

      // Mock storage upload failure
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to upload file');
    });
  });

  describe('GET /api/content/media', () => {
    it('should list media files with pagination', async () => {
      const mockMedia = [
        {
          id: 'media-1',
          filename: 'image1.jpg',
          media_type: 'image',
          created_at: new Date().toISOString(),
        },
        {
          id: 'media-2',
          filename: 'video1.mp4',
          media_type: 'video',
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockMedia,
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

      const request = new NextRequest(
        'http://localhost/api/content/media?organization_id=org-123&page=1&limit=20',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.media).toHaveLength(2);
      expect(data.data.pagination.total).toBe(2);
    });

    it('should filter by media type', async () => {
      const mockImages = [
        {
          id: 'media-1',
          filename: 'image1.jpg',
          media_type: 'image',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockImages,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        'http://localhost/api/content/media?organization_id=org-123&media_type=image',
      );
      await GET(request);

      // Verify media_type filter was applied
      expect(mockQuery.eq).toHaveBeenCalledWith('media_type', 'image');
    });

    it('should require organization_id', async () => {
      const request = new NextRequest('http://localhost/api/content/media');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Organization ID is required');
    });
  });

  describe('PUT /api/content/media', () => {
    it('should update media metadata', async () => {
      const mockMedia = {
        id: 'media-123',
        organization_id: 'org-123',
      };

      const mockUpdatedMedia = {
        ...mockMedia,
        alt_text: 'Updated alt text',
        caption: 'Updated caption',
      };

      // Mock ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMedia,
              error: null,
            }),
          }),
        }),
      });

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedMedia,
                error: null,
              }),
            }),
          }),
        }),
      });

      const requestBody = {
        id: 'media-123',
        alt_text: 'Updated alt text',
        caption: 'Updated caption',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.media.alt_text).toBe('Updated alt text');
    });

    it('should prevent unauthorized updates', async () => {
      const mockMedia = {
        id: 'media-123',
        organization_id: 'different-org',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMedia,
              error: null,
            }),
          }),
        }),
      });

      const requestBody = {
        id: 'media-123',
        alt_text: 'Updated alt text',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/content/media', () => {
    it('should delete media file and clean up storage', async () => {
      const mockMedia = {
        id: 'media-123',
        organization_id: 'org-123',
        file_path: 'org-123/image.jpg',
      };

      // Mock ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMedia,
              error: null,
            }),
          }),
        }),
      });

      // Mock storage deletion
      mockSupabase.storage.from().remove.mockResolvedValue({
        error: null,
      });

      // Mock database deletion
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/media?id=media-123&organization_id=org-123',
      );
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Media deleted successfully');

      // Verify storage cleanup was attempted
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith([
        'org-123/image.jpg',
      ]);
    });

    it('should continue with database deletion even if storage fails', async () => {
      const mockMedia = {
        id: 'media-123',
        organization_id: 'org-123',
        file_path: 'org-123/image.jpg',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMedia,
              error: null,
            }),
          }),
        }),
      });

      // Mock storage deletion failure
      mockSupabase.storage.from().remove.mockResolvedValue({
        error: { message: 'Storage service unavailable' },
      });

      // Mock successful database deletion
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/media?id=media-123&organization_id=org-123',
      );
      const response = await DELETE(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Security features', () => {
    it('should generate secure filenames', async () => {
      const mockFile = new File(['image content'], 'test image.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      // Mock successful flow
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

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'org-123/1640995200000-randomstring.jpg' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/file.jpg' },
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'media-123' },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // Verify secure filename was used
      expect(mockSupabase.storage.from().upload).toHaveBeenCalledWith(
        'org-123/1640995200000-randomstring.jpg',
        expect.any(Buffer),
        expect.any(Object),
      );
    });

    it('should calculate and store file hashes', async () => {
      const mockFile = new File(['image content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('organization_id', 'org-123');

      // Mock successful flow
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

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'org-123/1640995200000-randomstring.jpg' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/file.jpg' },
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'media-123' },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/content/media', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // Verify file hash was calculated and stored
      const insertCall = mockSupabase.from().insert.mock.calls[0][0];
      expect(insertCall.file_hash).toBe('mockedhash123');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });
});
