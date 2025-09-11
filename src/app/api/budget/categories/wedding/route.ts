import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const CreateBudgetCategorySchema = z.object({
  wedding_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  budgeted_amount: z.number().min(0),
  color_code: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  alert_threshold_percent: z.number().int().min(0).max(100).default(80),
  category_type: z.enum(['predefined', 'custom']).default('custom'),
});

const UpdateBudgetCategorySchema = CreateBudgetCategorySchema.partial().extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
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
    const categoryType = searchParams.get('category_type');

    if (!weddingId) {
      return NextResponse.json(
        { error: 'wedding_id parameter is required' },
        { status: 400 },
      );
    }

    // Verify user has access to this wedding
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, user1_id, user2_id')
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    const isWeddingOwner =
      wedding.user1_id === user.id || wedding.user2_id === user.id;
    if (!isWeddingOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('budget_categories')
      .select(
        `
        id,
        wedding_id,
        name,
        description,
        category_type,
        budgeted_amount,
        spent_amount,
        is_active,
        sort_order,
        color_code,
        icon,
        alert_threshold_percent,
        alert_enabled,
        last_alert_sent_at,
        created_at,
        updated_at
      `,
      )
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (categoryType) {
      query = query.eq('category_type', categoryType);
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
    const categoriesWithMetrics = categories.map((category) => {
      const percentageSpent =
        category.budgeted_amount > 0
          ? (category.spent_amount / category.budgeted_amount) * 100
          : 0;
      const remainingAmount = category.budgeted_amount - category.spent_amount;
      const isOverspent = category.spent_amount > category.budgeted_amount;
      const overspendAmount = Math.max(
        0,
        category.spent_amount - category.budgeted_amount,
      );
      const isNearThreshold =
        percentageSpent >= category.alert_threshold_percent && !isOverspent;
      const status = isOverspent
        ? 'overspent'
        : isNearThreshold
          ? 'warning'
          : percentageSpent > 50
            ? 'moderate'
            : 'good';

      return {
        ...category,
        remaining_amount: remainingAmount,
        percentage_spent: Math.round(percentageSpent * 100) / 100,
        is_overspent: isOverspent,
        overspend_amount: overspendAmount,
        is_near_threshold: isNearThreshold,
        status,
        budget_health: status,
      };
    });

    // Calculate overall budget summary
    const summary = {
      total_categories: categoriesWithMetrics.length,
      active_categories: categoriesWithMetrics.filter((cat) => cat.is_active)
        .length,
      total_budgeted: categoriesWithMetrics.reduce(
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
      categories_overspent: categoriesWithMetrics.filter(
        (cat) => cat.is_overspent,
      ).length,
      categories_near_threshold: categoriesWithMetrics.filter(
        (cat) => cat.is_near_threshold,
      ).length,
      overall_percentage:
        categoriesWithMetrics.reduce(
          (sum, cat) => sum + cat.budgeted_amount,
          0,
        ) > 0
          ? (categoriesWithMetrics.reduce(
              (sum, cat) => sum + cat.spent_amount,
              0,
            ) /
              categoriesWithMetrics.reduce(
                (sum, cat) => sum + cat.budgeted_amount,
                0,
              )) *
            100
          : 0,
    };

    return NextResponse.json({
      categories: categoriesWithMetrics,
      summary,
    });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/budget/categories/wedding:',
      error,
    );
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
    const validatedData = CreateBudgetCategorySchema.parse(body);

    // Verify user has access to this wedding
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, user1_id, user2_id')
      .eq('id', validatedData.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    const isWeddingOwner =
      wedding.user1_id === user.id || wedding.user2_id === user.id;
    if (!isWeddingOwner) {
      return NextResponse.json(
        { error: 'Only wedding couple can create budget categories' },
        { status: 403 },
      );
    }

    // Check if category name already exists for this wedding
    const { data: existingCategory } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('wedding_id', validatedData.wedding_id)
      .eq('name', validatedData.name)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists for this wedding' },
        { status: 400 },
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
          spent_amount: 0, // Start with 0 spent
          is_active: true,
          alert_enabled: true,
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

    // Add calculated fields to response
    const categoryWithMetrics = {
      ...newCategory,
      remaining_amount: newCategory.budgeted_amount - newCategory.spent_amount,
      percentage_spent: 0,
      is_overspent: false,
      overspend_amount: 0,
      is_near_threshold: false,
      status: 'good',
      budget_health: 'good',
    };

    return NextResponse.json(
      { category: categoryWithMetrics },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error(
      'Unexpected error in POST /api/budget/categories/wedding:',
      error,
    );
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateBudgetCategorySchema.parse(body);
    const { id: categoryId, ...updateData } = validatedData;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 },
      );
    }

    // Get existing category and verify permissions
    const { data: existingCategory, error: fetchError } = await supabase
      .from('budget_categories')
      .select(
        `
        id,
        wedding_id,
        name,
        weddings!inner(
          user1_id,
          user2_id
        )
      `,
      )
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    const isWeddingOwner =
      existingCategory.weddings.user1_id === user.id ||
      existingCategory.weddings.user2_id === user.id;
    if (!isWeddingOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If changing name, check for duplicates
    if (updateData.name && updateData.name !== existingCategory.name) {
      const { data: duplicateCategory } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('wedding_id', existingCategory.wedding_id)
        .eq('name', updateData.name)
        .neq('id', categoryId)
        .single();

      if (duplicateCategory) {
        return NextResponse.json(
          {
            error: 'A category with this name already exists for this wedding',
          },
          { status: 400 },
        );
      }
    }

    // Update category
    const { data: updatedCategory, error } = await supabase
      .from('budget_categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating budget category:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 },
      );
    }

    // Add calculated fields to response
    const percentageSpent =
      updatedCategory.budgeted_amount > 0
        ? (updatedCategory.spent_amount / updatedCategory.budgeted_amount) * 100
        : 0;
    const remainingAmount =
      updatedCategory.budgeted_amount - updatedCategory.spent_amount;
    const isOverspent =
      updatedCategory.spent_amount > updatedCategory.budgeted_amount;
    const overspendAmount = Math.max(
      0,
      updatedCategory.spent_amount - updatedCategory.budgeted_amount,
    );
    const isNearThreshold =
      percentageSpent >= updatedCategory.alert_threshold_percent &&
      !isOverspent;
    const status = isOverspent
      ? 'overspent'
      : isNearThreshold
        ? 'warning'
        : percentageSpent > 50
          ? 'moderate'
          : 'good';

    const categoryWithMetrics = {
      ...updatedCategory,
      remaining_amount: remainingAmount,
      percentage_spent: Math.round(percentageSpent * 100) / 100,
      is_overspent: isOverspent,
      overspend_amount: overspendAmount,
      is_near_threshold: isNearThreshold,
      status,
      budget_health: status,
    };

    return NextResponse.json({ category: categoryWithMetrics });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error(
      'Unexpected error in PUT /api/budget/categories/wedding:',
      error,
    );
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

    // Get category ID from query params
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 },
      );
    }

    // Get existing category and verify permissions
    const { data: existingCategory, error: fetchError } = await supabase
      .from('budget_categories')
      .select(
        `
        id,
        wedding_id,
        name,
        weddings!inner(
          user1_id,
          user2_id
        )
      `,
      )
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    const isWeddingOwner =
      existingCategory.weddings.user1_id === user.id ||
      existingCategory.weddings.user2_id === user.id;
    if (!isWeddingOwner) {
      return NextResponse.json(
        { error: 'Only wedding couple can delete budget categories' },
        { status: 403 },
      );
    }

    // Check if category has expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (expensesError) {
      console.error('Error checking category expenses:', expensesError);
      return NextResponse.json(
        { error: 'Failed to check category usage' },
        { status: 500 },
      );
    }

    if (expenses && expenses.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete category that has expenses. Please move or delete the expenses first.',
        },
        { status: 400 },
      );
    }

    // Delete category
    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting budget category:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/budget/categories/wedding:',
      error,
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
