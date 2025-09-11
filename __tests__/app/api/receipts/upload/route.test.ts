import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/receipts/upload/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers');
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 1200,
      height: 800,
      hasAlpha: false,
    }),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image-data')),
  }));
});

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
    single: jest.fn(),
    flatMap: jest.fn(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
};

// Mock File and FormData for Node.js environment
class MockFile {
  constructor(
    public bits: BlobPart[],
    public name: string,
    public options: FilePropertyBag = {}
  ) {}

  get type() {
    return this.options.type || '';
  }

  get size() {
    if (Array.isArray(this.bits) && this.bits.length > 0) {
      return this.bits.reduce((sum, bit) => {
        if (typeof bit === 'string') return sum + bit.length;
        if (bit instanceof ArrayBuffer) return sum + bit.byteLength;
        return sum + 1000; // default size for mock
      }, 0);
    }
    return 1000; // default size for mock
  }

  async arrayBuffer() {
    return new ArrayBuffer(this.size);
  }

  stream() {
    return new ReadableStream();
  }

  text() {
    return Promise.resolve('mock-file-content');
  }
}

global.File = MockFile as any;

describe('/api/receipts/upload API Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWeddingId = '123e4567-e89b-12d3-a456-426614174001';
  const mockExpenseId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue({});
  });

  describe('POST /api/receipts/upload', () => {
    it('should upload image file successfully', async () => {
      const mockFile = new MockFile(
        ['image-data'],
        'receipt.jpg',
        { type: 'image/jpeg' }
      );

      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('wedding_id', mockWeddingId);
      formData.append('expense_id', mockExpenseId);

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

      // Mock expense check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: mockExpenseId, wedding_id: mockWeddingId },
          error: null,
        }),
      });

      // Mock storage upload
      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path/receipt.webp' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/test-path/receipt.webp' },
        }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      // Mock expense update with receipt URL
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { receipt_urls: [] },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      // Mock formData method
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.file.url).toBe('https://storage.example.com/test-path/receipt.webp');
      expect(data.file.file_name).toBe('receipt.jpg');
      expect(data.file.file_type).toBe('image/webp'); // Converted to WebP
    });

    it('should upload PDF file successfully', async () => {
      const mockFile = new MockFile(
        ['pdf-data'],
        'invoice.pdf',
        { type: 'application/pdf' }
      );

      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('wedding_id', mockWeddingId);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
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

      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path/invoice.pdf' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/test-path/invoice.pdf' },
        }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.file.file_type).toBe('application/pdf');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const formData = new FormData();
      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when file is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const formData = new FormData();
      formData.append('wedding_id', mockWeddingId);

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File is required');
    });

    it('should return 400 when wedding_id is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockFile = new MockFile(['data'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile as any);

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('wedding_id is required');
    });

    it('should return 400 for oversized file', async () => {
      const oversizedFile = new MockFile(
        [new ArrayBuffer(6 * 1024 * 1024)], // 6MB - over the 5MB limit
        'large-file.jpg',
        { type: 'image/jpeg' }
      );

      const formData = new FormData();
      formData.append('file', oversizedFile as any);
      formData.append('wedding_id', mockWeddingId);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size too large');
    });

    it('should return 400 for invalid file type', async () => {
      const invalidFile = new MockFile(
        ['data'],
        'document.txt',
        { type: 'text/plain' }
      );

      const formData = new FormData();
      formData.append('file', invalidFile as any);
      formData.append('wedding_id', mockWeddingId);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
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

      const mockFile = new MockFile(['data'], 'receipt.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('wedding_id', mockWeddingId);

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should validate expense belongs to wedding', async () => {
      const mockFile = new MockFile(['data'], 'receipt.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('wedding_id', mockWeddingId);
      formData.append('expense_id', 'wrong-expense-id');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
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

      // Mock expense check (not found)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Expense not found or does not belong to this wedding');
    });
  });

  describe('DELETE /api/receipts/upload', () => {
    const mockStoragePath = `${mockWeddingId}/test-receipt.jpg`;
    const mockReceiptUrl = 'https://storage.example.com/receipts/test-receipt.jpg';

    it('should delete receipt file successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
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

      // Mock storage removal
      const mockStorageBucket = {
        remove: jest.fn().mockResolvedValue({
          error: null,
        }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      // Mock expense update (remove URL)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { receipt_urls: [mockReceiptUrl, 'other-url.jpg'] },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/receipts/upload?storage_path=${encodeURIComponent(mockStoragePath)}&expense_id=${mockExpenseId}&receipt_url=${encodeURIComponent(mockReceiptUrl)}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Receipt deleted successfully');
      expect(mockStorageBucket.remove).toHaveBeenCalledWith([mockStoragePath]);
    });

    it('should return 400 when storage_path is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('storage_path is required');
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

      const request = new NextRequest(
        `http://localhost:3000/api/receipts/upload?storage_path=${encodeURIComponent(mockStoragePath)}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('GET /api/receipts/upload', () => {
    it('should return receipts for expense', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockExpenses = [
        {
          id: mockExpenseId,
          title: 'Photography',
          receipt_urls: ['https://example.com/receipt1.jpg', 'https://example.com/receipt2.jpg'],
          weddings: { user1_id: mockUserId, user2_id: null },
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/receipts/upload?expense_id=${mockExpenseId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.receipts).toHaveLength(2);
      expect(data.receipts[0].expense_id).toBe(mockExpenseId);
      expect(data.receipts[0].expense_title).toBe('Photography');
    });

    it('should return receipts for wedding', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockExpenses = [
        {
          id: mockExpenseId,
          title: 'Photography',
          receipt_urls: ['https://example.com/receipt1.jpg'],
          weddings: { user1_id: mockUserId, user2_id: null },
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/receipts/upload?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.receipts).toHaveLength(1);
    });

    it('should return 400 when both expense_id and wedding_id are missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/receipts/upload');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either expense_id or wedding_id is required');
    });

    it('should return 403 for user with no access to wedding', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'different-user' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [
            {
              id: mockExpenseId,
              weddings: { user1_id: mockUserId, user2_id: null },
            },
          ],
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/receipts/upload?expense_id=${mockExpenseId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage upload errors', async () => {
      const mockFile = new MockFile(['data'], 'receipt.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('wedding_id', mockWeddingId);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
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

      // Mock storage upload failure
      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage upload failed' },
        }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload file');
    });

    it('should handle image processing errors gracefully', async () => {
      // Mock Sharp to throw an error
      const sharp = require('sharp');
      sharp.mockImplementation(() => {
        throw new Error('Image processing failed');
      });

      const mockFile = new MockFile(['data'], 'receipt.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('wedding_id', mockWeddingId);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
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

      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.jpg' },
        }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const request = new NextRequest('http://localhost:3000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);

      // Should still succeed, falling back to original file
      expect(response.status).toBe(201);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        `http://localhost:3000/api/receipts/upload?expense_id=${mockExpenseId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});