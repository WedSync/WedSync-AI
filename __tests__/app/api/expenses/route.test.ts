import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/expenses/route';
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
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

describe('/api/expenses API Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWeddingId = '123e4567-e89b-12d3-a456-426614174001';
  const mockCategoryId = '123e4567-e89b-12d3-a456-426614174002';
  const mockExpenseId = '123e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue({});
  });

  describe('GET /api/expenses', () => {
    const mockExpenses = [
      {
        id: mockExpenseId,
        wedding_id: mockWeddingId,
        category_id: mockCategoryId,
        title: 'Wedding Photography',
        amount: 2500,
        payment_status: 'paid',
        vendor_name: 'John Photo Studio',
        expense_date: '2024-01-15T10:00:00Z',
        budget_categories: {
          id: mockCategoryId,
          name: 'Photography',
          color_code: '#FF5733',
          budgeted_amount: 5000,
        },
        created_by: {
          id: mockUserId,
          full_name: 'Wedding Owner',
          email: 'owner@test.com',
        },
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174004',
        wedding_id: mockWeddingId,
        category_id: mockCategoryId,
        title: 'Engagement Photos',
        amount: 800,
        payment_status: 'pending',
        vendor_name: 'John Photo Studio',
        expense_date: '2024-02-01T14:00:00Z',
        budget_categories: {
          id: mockCategoryId,
          name: 'Photography',
          color_code: '#FF5733',
          budgeted_amount: 5000,
        },
        created_by: {
          id: mockUserId,
          full_name: 'Wedding Owner',
          email: 'owner@test.com',
        },
      },
    ];

    it('should return expenses with summary statistics', async () => {
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

      // Mock expenses query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
          count: 2,
        }),
      });

      // Mock total count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          count: 2,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses).toHaveLength(2);
      expect(data.summary.total_expenses).toBe(2);
      expect(data.summary.total_amount).toBe(3300);
      expect(data.summary.paid_amount).toBe(2500);
      expect(data.summary.pending_amount).toBe(800);
      expect(data.summary.by_status.paid).toBe(1);
      expect(data.summary.by_status.pending).toBe(1);
      expect(data.summary.by_category.Photography.count).toBe(2);
      expect(data.summary.by_category.Photography.amount).toBe(3300);
      expect(data.pagination.total).toBe(2);
    });

    it('should filter expenses by payment status', async () => {
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

      // Mock filtered expenses query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockExpenses.filter(e => e.payment_status === 'paid'),
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ count: 1 }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}&payment_status=paid`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses).toHaveLength(1);
      expect(data.expenses[0].payment_status).toBe('paid');
    });

    it('should filter expenses by vendor name', async () => {
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
          ilike: jest.fn().mockReturnThis(),
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ count: 2 }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}&vendor_name=John`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should filter expenses by date range', async () => {
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
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnThis(),
          }),
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ count: 2 }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}&start_date=2024-01-01&end_date=2024-12-31`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}`
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

      const request = new NextRequest('http://localhost:3000/api/expenses');

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
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('POST /api/expenses', () => {
    const validExpenseData = {
      wedding_id: mockWeddingId,
      category_id: mockCategoryId,
      title: 'Wedding Cake',
      description: 'Three-tier wedding cake with flowers',
      amount: 1200,
      currency: 'USD',
      vendor_name: 'Sweet Dreams Bakery',
      vendor_contact: 'info@sweetdreams.com',
      payment_method: 'credit_card',
      payment_status: 'pending',
      invoice_number: 'INV-2024-001',
      expense_date: '2024-03-15T10:00:00Z',
      due_date: '2024-03-01T10:00:00Z',
      tags: ['catering', 'dessert'],
      notes: 'Vanilla cake with chocolate filling',
    };

    it('should create new expense', async () => {
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

      // Mock category check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCategoryId, name: 'Catering', wedding_id: mockWeddingId },
          error: null,
        }),
      });

      // Mock expense creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...validExpenseData,
            id: mockExpenseId,
            created_by_id: mockUserId,
            budget_categories: {
              id: mockCategoryId,
              name: 'Catering',
              color_code: '#00FF00',
              budgeted_amount: 5000,
            },
            created_by: {
              id: mockUserId,
              full_name: 'Wedding Owner',
              email: 'owner@test.com',
            },
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense.title).toBe('Wedding Cake');
      expect(data.expense.amount).toBe(1200);
      expect(data.expense.vendor_name).toBe('Sweet Dreams Bakery');
      expect(data.expense.created_by_id).toBe(mockUserId);
    });

    it('should validate required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const invalidData = {
        wedding_id: 'invalid-uuid',
        category_id: '',
        title: '',
        amount: -100,
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should validate category belongs to wedding', async () => {
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

      // Mock category check (not found or wrong wedding)
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

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Budget category not found or does not belong to this wedding');
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

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only wedding couple can create expenses');
    });
  });

  describe('PUT /api/expenses', () => {
    const updateData = {
      id: mockExpenseId,
      title: 'Updated Wedding Cake',
      amount: 1500,
      payment_status: 'paid',
      paid_date: '2024-03-16T10:00:00Z',
      notes: 'Paid in full, upgraded size',
    };

    it('should update expense', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing expense fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockExpenseId,
            wedding_id: mockWeddingId,
            category_id: mockCategoryId,
            created_by_id: mockUserId,
            payment_status: 'pending',
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
            category_id: mockCategoryId,
            budget_categories: {
              id: mockCategoryId,
              name: 'Catering',
              color_code: '#00FF00',
              budgeted_amount: 5000,
            },
            created_by: {
              id: mockUserId,
              full_name: 'Wedding Owner',
              email: 'owner@test.com',
            },
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expense.title).toBe('Updated Wedding Cake');
      expect(data.expense.amount).toBe(1500);
      expect(data.expense.payment_status).toBe('paid');
    });

    it('should validate category change', async () => {
      const newCategoryId = '123e4567-e89b-12d3-a456-426614174005';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing expense fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockExpenseId,
            wedding_id: mockWeddingId,
            category_id: mockCategoryId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      // Mock new category validation
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: newCategoryId, wedding_id: mockWeddingId },
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
            category_id: newCategoryId,
          },
          error: null,
        }),
      });

      const updateWithNewCategory = {
        ...updateData,
        category_id: newCategoryId,
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'PUT',
        body: JSON.stringify(updateWithNewCategory),
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent expense', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Expense not found');
    });
  });

  describe('DELETE /api/expenses', () => {
    it('should delete expense', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock existing expense fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockExpenseId,
            wedding_id: mockWeddingId,
            receipt_urls: ['https://example.com/receipt1.jpg'],
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
        `http://localhost:3000/api/expenses?id=${mockExpenseId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Expense deleted successfully');
    });

    it('should return 400 when expense ID is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Expense ID is required');
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
          data: {
            id: mockExpenseId,
            wedding_id: mockWeddingId,
            weddings: { user1_id: mockUserId, user2_id: null },
          },
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?id=${mockExpenseId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only wedding couple can delete expenses');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3000/api/expenses?wedding_id=${mockWeddingId}`
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

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});