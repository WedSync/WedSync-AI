import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { withSecureValidation } from '@/lib/validation/middleware';
import {
  budgetQuerySchema,
  budgetUpdateSchema,
} from '@/lib/validations/budget-schemas';

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per interval
});

export const GET = withSecureValidation(
  budgetQuerySchema,
  async (
    request: NextRequest,
    validatedData,
    { params }: { params: { weddingId: string } },
  ) => {
    try {
      // Rate limiting
      const rateLimitResult = await limiter(request);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': new Date(
                rateLimitResult.reset,
              ).toISOString(),
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            },
          },
        );
      }

      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verify user has access to this wedding
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .select('id, couple_id')
        .eq('id', params.weddingId)
        .maybeSingle();

      if (weddingError || !wedding) {
        return NextResponse.json(
          { error: 'Wedding not found' },
          { status: 404 },
        );
      }

      // Check if user is couple or has helper/vendor access
      const hasAccess = await checkWeddingAccess(user.id, params.weddingId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      // Fetch budget data with RLS automatically enforced
      const { data: categories, error } = await supabase
        .from('budget_categories')
        .select(
          `
          id,
          name,
          allocated_amount,
          spent_amount,
          color_code,
          icon,
          display_order,
          created_at,
          updated_at,
          budget_transactions (
            id,
            amount,
            description,
            transaction_date,
            payment_status,
            receipt_url
          )
        `,
        )
        .eq('wedding_id', params.weddingId)
        .order('display_order');

      if (error) {
        console.error('Budget fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch budget data' },
          { status: 500 },
        );
      }

      // Calculate totals securely on server side
      const totalBudget =
        categories?.reduce(
          (sum, cat) => sum + (cat.allocated_amount || 0),
          0,
        ) || 0;
      const totalSpent =
        categories?.reduce((sum, cat) => sum + (cat.spent_amount || 0), 0) || 0;

      // Log activity for audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        wedding_id: params.weddingId,
        action: 'view_budget_summary',
        resource_type: 'budget',
        resource_id: params.weddingId,
        metadata: { categories_count: categories?.length || 0 },
      });

      return NextResponse.json(
        {
          categories: categories || [],
          totalBudget,
          totalSpent,
          remainingBudget: totalBudget - totalSpent,
          lastUpdated: new Date().toISOString(),
        },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        },
      );
    } catch (error) {
      console.error('Budget API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  },
);

export const POST = withSecureValidation(
  z.object({
    name: z
      .string()
      .min(1, 'Category name is required')
      .max(100, 'Category name too long'),
    allocated_amount: z
      .number()
      .positive('Amount must be positive')
      .max(1000000, 'Amount too large'),
    color_code: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
    icon: z
      .string()
      .min(1, 'Icon is required')
      .max(50, 'Icon name too long')
      .optional(),
  }),
  async (
    request: NextRequest,
    validatedData,
    { params }: { params: { weddingId: string } },
  ) => {
    try {
      // Stricter rate limiting for writes
      const rateLimitResult = await limiter(request);
      if (!rateLimitResult.success || rateLimitResult.remaining < 30) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }

      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check access
      const hasAccess = await checkWeddingAccess(user.id, params.weddingId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      // Get next display order
      const { data: existingCategories } = await supabase
        .from('budget_categories')
        .select('display_order')
        .eq('wedding_id', params.weddingId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextDisplayOrder =
        (existingCategories?.[0]?.display_order || 0) + 1;

      // Create new category
      const { data: newCategory, error } = await supabase
        .from('budget_categories')
        .insert({
          ...validatedData,
          wedding_id: params.weddingId,
          display_order: nextDisplayOrder,
          spent_amount: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Category creation error:', error);
        return NextResponse.json(
          { error: 'Failed to create category' },
          { status: 500 },
        );
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        wedding_id: params.weddingId,
        action: 'create_budget_category',
        resource_type: 'budget_category',
        resource_id: newCategory.id,
        metadata: { category_name: validatedData.name },
      });

      return NextResponse.json(newCategory, { status: 201 });
    } catch (error) {
      console.error('Budget POST error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  },
);

export const PUT = withSecureValidation(
  z.object({
    categoryId: z.string().uuid('Invalid category ID format'),
    updates: budgetUpdateSchema,
  }),
  async (
    request: NextRequest,
    validatedData,
    { params }: { params: { weddingId: string } },
  ) => {
    try {
      const rateLimitResult = await limiter(request);
      if (!rateLimitResult.success || rateLimitResult.remaining < 30) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }

      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check access
      const hasAccess = await checkWeddingAccess(user.id, params.weddingId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      // Update category
      const { data: updatedCategory, error } = await supabase
        .from('budget_categories')
        .update(validatedData.updates)
        .eq('id', validatedData.categoryId)
        .eq('wedding_id', params.weddingId) // Extra security check
        .select()
        .single();

      if (error) {
        console.error('Category update error:', error);
        return NextResponse.json(
          { error: 'Failed to update category' },
          { status: 500 },
        );
      }

      if (!updatedCategory) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 },
        );
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        wedding_id: params.weddingId,
        action: 'update_budget_category',
        resource_type: 'budget_category',
        resource_id: validatedData.categoryId,
        metadata: { updates: validatedData.updates },
      });

      return NextResponse.json(updatedCategory);
    } catch (error) {
      console.error('Budget PUT error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withSecureValidation(
  z.object({
    categoryId: z.string().uuid('Invalid category ID format'),
  }),
  async (
    request: NextRequest,
    validatedData,
    { params }: { params: { weddingId: string } },
  ) => {
    try {
      // Very strict rate limiting for deletions
      const rateLimitResult = await limiter(request);
      if (!rateLimitResult.success || rateLimitResult.remaining < 10) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }

      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check access
      const hasAccess = await checkWeddingAccess(user.id, params.weddingId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      // Check if category has transactions
      const { data: transactions } = await supabase
        .from('budget_transactions')
        .select('id')
        .eq('budget_category_id', validatedData.categoryId)
        .limit(1);

      if (transactions && transactions.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete category with existing transactions' },
          { status: 400 },
        );
      }

      // Delete category
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', validatedData.categoryId)
        .eq('wedding_id', params.weddingId); // Extra security check

      if (error) {
        console.error('Category deletion error:', error);
        return NextResponse.json(
          { error: 'Failed to delete category' },
          { status: 500 },
        );
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        wedding_id: params.weddingId,
        action: 'delete_budget_category',
        resource_type: 'budget_category',
        resource_id: validatedData.categoryId,
        metadata: {},
      });

      return NextResponse.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Budget DELETE error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  },
);

async function checkWeddingAccess(
  userId: string,
  weddingId: string,
): Promise<boolean> {
  const supabase = createClient();

  // Check if user is the couple
  const { data: wedding } = await supabase
    .from('weddings')
    .select('couple_id')
    .eq('id', weddingId)
    .single();

  if (wedding && wedding.couple_id === userId) {
    return true;
  }

  // Check if user is a helper or vendor with access
  const { data: access } = await supabase
    .from('wedding_access')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .single();

  return !!access;
}
