import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const CreateCategorySchema = z.object({
  wedding_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
  category_type: z.enum([
    'VENUE',
    'CATERING',
    'PHOTOGRAPHY',
    'VIDEOGRAPHY',
    'MUSIC',
    'FLOWERS',
    'ATTIRE',
    'TRANSPORTATION',
    'ACCESSORIES',
    'CUSTOM',
  ]),
  budgeted_amount: z.number().nonnegative().max(10000000),
  alert_threshold: z.number().min(0).max(1).optional(),
  allows_overspend: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).trim().optional(),
  budgeted_amount: z.number().nonnegative().max(10000000).optional(),
  alert_threshold: z.number().min(0).max(1).optional(),
  allows_overspend: z.boolean().optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    if (!weddingId) {
      return NextResponse.json(
        { error: 'wedding_id parameter is required' },
        { status: 400 },
      );
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query for wedding-specific categories
    let query = supabase
      .from('budget_categories')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Error fetching budget categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 },
      );
    }

    // Calculate additional metrics
    const categoriesWithMetrics =
      categories?.map((category) => ({
        ...category,
        percentage_spent:
          category.budgeted_amount > 0
            ? (category.spent_amount / category.budgeted_amount) * 100
            : 0,
        is_overspent: category.spent_amount > category.budgeted_amount,
        overspend_amount: Math.max(
          0,
          category.spent_amount - category.budgeted_amount,
        ),
      })) || [];

    const summary = {
      total_budget: categoriesWithMetrics.reduce(
        (sum, cat) => sum + cat.budgeted_amount,
        0,
      ),
      total_spent: categoriesWithMetrics.reduce(
        (sum, cat) => sum + cat.spent_amount,
        0,
      ),
      total_remaining: categoriesWithMetrics.reduce(
        (sum, cat) => sum + cat.remaining_amount,
        0,
      ),
      categories_count: categoriesWithMetrics.length,
      overspent_categories: categoriesWithMetrics.filter(
        (cat) => cat.is_overspent,
      ).length,
      categories_near_limit: categoriesWithMetrics.filter(
        (cat) =>
          cat.alert_threshold &&
          cat.spent_amount >= cat.budgeted_amount * cat.alert_threshold,
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesWithMetrics,
        summary,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/budget/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateCategorySchema.parse(body);

    // Check user has write access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', validatedData.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Check if category name already exists for this wedding
    const { data: existingCategory } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('wedding_id', validatedData.wedding_id)
      .eq('name', validatedData.name)
      .eq('is_active', true)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 },
      );
    }

    // Get the highest sort_order for this wedding
    const { data: lastCategory } = await supabase
      .from('budget_categories')
      .select('sort_order')
      .eq('wedding_id', validatedData.wedding_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastCategory?.sort_order || 0) + 1;

    // Create new category
    const { data: newCategory, error } = await supabase
      .from('budget_categories')
      .insert([
        {
          ...validatedData,
          sort_order: nextSortOrder,
          created_by: user.id,
          updated_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating budget category:', error);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: validatedData.wedding_id,
      action: 'create_budget_category',
      resource_type: 'budget_category',
      resource_id: newCategory.id,
      metadata: {
        category_name: newCategory.name,
        category_type: newCategory.category_type,
        budgeted_amount: newCategory.budgeted_amount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newCategory,
        message: 'Budget category created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in POST /api/budget/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = UpdateCategorySchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Get the category to check ownership and wedding access
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('wedding_id, name')
      .eq('id', id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Budget category not found' },
        { status: 404 },
      );
    }

    // Check user has write access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', category.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // If updating name, check for duplicates within wedding
    if (updateData.name && updateData.name !== category.name) {
      const { data: existingCategory } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('wedding_id', category.wedding_id)
        .eq('name', updateData.name)
        .eq('is_active', true)
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
    const { data: updatedCategory, error } = await supabase
      .from('budget_categories')
      .update({
        ...updateData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating budget category:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: category.wedding_id,
      action: 'update_budget_category',
      resource_type: 'budget_category',
      resource_id: updatedCategory.id,
      metadata: {
        category_name: updatedCategory.name,
        changes: updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: 'Budget category updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in PUT /api/budget/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 },
      );
    }

    // Get the category to check ownership
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('wedding_id, name')
      .eq('id', categoryId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Budget category not found' },
        { status: 404 },
      );
    }

    // Check user has delete access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', category.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Only wedding owners/partners can delete categories' },
        { status: 403 },
      );
    }

    // Check if category has transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('budget_transactions')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (transactionsError) {
      console.error('Transactions check error:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to check category dependencies' },
        { status: 500 },
      );
    }

    if (transactions && transactions.length > 0) {
      // Soft delete - mark as inactive instead of hard delete
      const { data, error } = await supabase
        .from('budget_categories')
        .update({
          is_active: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Category soft delete error:', error);
        return NextResponse.json(
          { error: 'Failed to delete budget category' },
          { status: 500 },
        );
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        wedding_id: category.wedding_id,
        action: 'soft_delete_budget_category',
        resource_type: 'budget_category',
        resource_id: categoryId,
        metadata: {
          category_name: category.name,
          reason: 'has_transactions',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Budget category archived (has existing transactions)',
      });
    } else {
      // Hard delete - no transactions exist
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error('Category delete error:', error);
        return NextResponse.json(
          { error: 'Failed to delete budget category' },
          { status: 500 },
        );
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        wedding_id: category.wedding_id,
        action: 'delete_budget_category',
        resource_type: 'budget_category',
        resource_id: categoryId,
        metadata: {
          category_name: category.name,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Budget category deleted successfully',
      });
    }
  } catch (error) {
    console.error('Delete budget category API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
