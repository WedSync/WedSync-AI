/**
 * Feedback Categories API Routes
 * Feature: WS-236 User Feedback System
 * Handles CRUD operations for feedback categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limiter';

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
    .default('#3B82F6'),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

/**
 * GET /api/feedback/categories - Get feedback categories for organization
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      max: 100,
      windowMs: 60000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers },
      );
    }

    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 403 },
      );
    }

    // Parse query parameters for filtering
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('include_inactive') === 'true';

    // Build query
    let query = supabase
      .from('feedback_categories')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    // Filter active categories unless explicitly requested
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Error fetching feedback categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback categories' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('GET /api/feedback/categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/feedback/categories - Create a new feedback category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      max: 20,
      windowMs: 60000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers },
      );
    }

    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and check admin role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (
      !userProfile?.organization_id ||
      !['admin', 'owner'].includes(userProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Check for duplicate category name
    const { data: existingCategory } = await supabase
      .from('feedback_categories')
      .select('id')
      .eq('organization_id', userProfile.organization_id)
      .eq('name', validatedData.name)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 },
      );
    }

    // Prepare category data
    const categoryData = {
      organization_id: userProfile.organization_id,
      ...validatedData,
    };

    // Insert category
    const { data: category, error: insertError } = await supabase
      .from('feedback_categories')
      .insert(categoryData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating feedback category:', insertError);
      return NextResponse.json(
        { error: 'Failed to create feedback category' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Feedback category created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/feedback/categories error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid category data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/feedback/categories - Update feedback category (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      max: 30,
      windowMs: 60000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers },
      );
    }

    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and check admin role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (
      !userProfile?.organization_id ||
      !['admin', 'owner'].includes(userProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 },
      );
    }

    const validatedData = updateCategorySchema.parse(updateData);

    // Check for duplicate category name if name is being updated
    if (validatedData.name) {
      const { data: existingCategory } = await supabase
        .from('feedback_categories')
        .select('id')
        .eq('organization_id', userProfile.organization_id)
        .eq('name', validatedData.name)
        .neq('id', id)
        .single();

      if (existingCategory) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 },
        );
      }
    }

    // Update category
    const { data: category, error: updateError } = await supabase
      .from('feedback_categories')
      .update(validatedData)
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .select()
      .single();

    if (updateError || !category) {
      console.error('Error updating feedback category:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feedback category or category not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Feedback category updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/feedback/categories error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/feedback/categories - Delete feedback category (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      max: 20,
      windowMs: 60000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers },
      );
    }

    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and check admin role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (
      !userProfile?.organization_id ||
      !['admin', 'owner'].includes(userProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Get category ID from query params
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 },
      );
    }

    // Check if category is being used by any feedback submissions
    const { data: feedbackUsingCategory, error: checkError } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('category', categoryId)
      .is('deleted_at', null)
      .limit(1);

    if (checkError) {
      console.error('Error checking category usage:', checkError);
      return NextResponse.json(
        { error: 'Failed to check category usage' },
        { status: 500 },
      );
    }

    if (feedbackUsingCategory && feedbackUsingCategory.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete category that is being used by feedback submissions. Deactivate it instead.',
        },
        { status: 409 },
      );
    }

    // Delete category
    const { data: category, error: deleteError } = await supabase
      .from('feedback_categories')
      .delete()
      .eq('id', categoryId)
      .eq('organization_id', userProfile.organization_id)
      .select('id, name')
      .single();

    if (deleteError || !category) {
      console.error('Error deleting feedback category:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete feedback category or category not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: category.id },
      message: 'Feedback category deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/feedback/categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
