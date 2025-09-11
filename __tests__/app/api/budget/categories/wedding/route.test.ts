import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/budget/categories/wedding/route';
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
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

describe('/api/budget/categories/wedding API Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWeddingId = '123e4567-e89b-12d3-a456-426614174001';
  const mockCategoryId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue({});
  });

  describe('GET /api/budget/categories/wedding', () => {
    const mockCategories = [
      {
        id: mockCategoryId,
        wedding_id: mockWeddingId,
        name: 'Photography',
        budgeted_amount: 5000,
        spent_amount: 2000,
        is_active: true,
        sort_order: 1,
        category_type: 'predefined',
        alert_threshold_percent: 80,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        wedding_id: mockWeddingId,
        name: 'Catering',
        budgeted_amount: 10000,
        spent_amount: 8500,
        is_active: true,
        sort_order: 2,
        category_type: 'predefined',
        alert_threshold_percent: 85,
      },
    ];

    it('should return budget categories with calculated metrics', async () => {
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

      // Mock categories query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnThis(),
          }),
        }),
        then: jest.fn().mockResolvedValue({
          data: mockCategories,
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/budget/categories/wedding?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toHaveLength(2);
      
      // Check calculated metrics
      const photoCategory = data.categories.find((c: any) => c.name === 'Photography');
      expect(photoCategory.remaining_amount).toBe(3000);
      expect(photoCategory.percentage_spent).toBe(40);
      expect(photoCategory.status).toBe('good');
      expect(photoCategory.is_overspent).toBe(false);

      const cateringCategory = data.categories.find((c: any) => c.name === 'Catering');
      expect(cateringCategory.remaining_amount).toBe(1500);
      expect(cateringCategory.percentage_spent).toBe(85);
      expect(cateringCategory.status).toBe('warning');
      expect(cateringCategory.is_near_threshold).toBe(true);

      // Check summary
      expect(data.summary.total_categories).toBe(2);
      expect(data.summary.total_budgeted).toBe(15000);
      expect(data.summary.total_spent).toBe(10500);
      expect(data.summary.categories_near_threshold).toBe(1);
    });

    it('should filter by category type', async () => {
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

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnThis(),
            }),
          }),
        }),
        then: jest.fn().mockResolvedValue({
          data: mockCategories.filter(c => c.category_type === 'predefined'),
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/budget/categories/wedding?wedding_id=${mockWeddingId}&category_type=predefined`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toHaveLength(2);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/budget/categories/wedding?wedding_id=${mockWeddingId}`
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

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('wedding_id parameter is required');
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
        `http://localhost:3000/api/budget/categories/wedding?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('POST /api/budget/categories/wedding', () => {
    const validCategoryData = {
      wedding_id: mockWeddingId,
      name: 'Flowers',
      description: 'Bridal bouquet and decorations',
      budgeted_amount: 1500,
      color_code: '#FF5733',
      alert_threshold_percent: 75,
    };

    it('should create new budget category', async () => {
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

      // Mock existing category check (none found)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // Mock last category sort order check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { sort_order: 5 },
          error: null,
        }),
      });

      // Mock category creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...validCategoryData,
            id: mockCategoryId,
            sort_order: 6,
            spent_amount: 0,
            is_active: true,
            alert_enabled: true,
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'POST',
        body: JSON.stringify(validCategoryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.category.name).toBe('Flowers');
      expect(data.category.budgeted_amount).toBe(1500);
      expect(data.category.remaining_amount).toBe(1500);
      expect(data.category.percentage_spent).toBe(0);
      expect(data.category.status).toBe('good');
    });

    it('should prevent duplicate category names', async () => {
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

      // Mock existing category check (found duplicate)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-id' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'POST',
        body: JSON.stringify(validCategoryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('A category with this name already exists for this wedding');
    });

    it('should validate required fields and formats', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const invalidData = {
        wedding_id: 'invalid-uuid',
        name: '',
        budgeted_amount: -100,
        color_code: 'invalid-color',
      };

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
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

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'POST',
        body: JSON.stringify(validCategoryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only wedding couple can create budget categories');
    });
  });

  describe('PUT /api/budget/categories/wedding', () => {
    const updateData = {
      id: mockCategoryId,
      name: 'Updated Photography',
      budgeted_amount: 6000,
      alert_threshold_percent: 90,
    };

    it('should update budget category', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing category fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockCategoryId,
            wedding_id: mockWeddingId,
            name: 'Photography',
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
            wedding_id: mockWeddingId,
            spent_amount: 2000,
            category_type: 'predefined',
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category.name).toBe('Updated Photography');
      expect(data.category.budgeted_amount).toBe(6000);
      expect(data.category.remaining_amount).toBe(4000);
      expect(data.category.percentage_spent).toBe(33.33);
    });

    it('should prevent duplicate names when updating', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing category fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockCategoryId,
            wedding_id: mockWeddingId,
            name: 'Photography',
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      // Mock duplicate name check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnThis(),
          }),
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: 'other-category-id' },
          error: null,
        }),
      });

      const duplicateNameUpdate = {
        id: mockCategoryId,
        name: 'Catering', // Assuming this name already exists
      };

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'PUT',
        body: JSON.stringify(duplicateNameUpdate),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('A category with this name already exists for this wedding');
    });

    it('should return 404 for non-existent category', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Category not found');
    });
  });

  describe('DELETE /api/budget/categories/wedding', () => {
    it('should delete empty category', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing category fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockCategoryId,
            wedding_id: mockWeddingId,
            name: 'Photography',
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      // Mock expenses check (none found)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
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
        `http://localhost:3000/api/budget/categories/wedding?id=${mockCategoryId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Category deleted successfully');
    });

    it('should prevent deletion of category with expenses', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockCategoryId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      // Mock expenses check (found expenses)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'expense-id' }],
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/budget/categories/wedding?id=${mockCategoryId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete category that has expenses');
    });

    it('should return 400 when category ID is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Category ID is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        `http://localhost:3000/api/budget/categories/wedding?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/budget/categories/wedding', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});