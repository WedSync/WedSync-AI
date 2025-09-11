import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const CreateExpenseSchema = z.object({
  wedding_id: z.string().uuid(),
  category_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  vendor_name: z.string().max(200).optional(),
  vendor_contact: z.string().max(200).optional(),
  payment_method: z.string().max(50).optional(),
  payment_status: z
    .enum(['pending', 'paid', 'overdue', 'cancelled', 'refunded'])
    .default('pending'),
  invoice_number: z.string().max(100).optional(),
  reference_number: z.string().max(100).optional(),
  expense_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  paid_date: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_pattern: z.enum(['weekly', 'monthly', 'yearly']).optional(),
});

const UpdateExpenseSchema = CreateExpenseSchema.partial().extend({
  id: z.string().uuid(),
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
    const categoryId = searchParams.get('category_id');
    const paymentStatus = searchParams.get('payment_status');
    const vendorName = searchParams.get('vendor_name');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const tags = searchParams.get('tags')?.split(',');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sort_by') || 'expense_date';
    const sortOrder = searchParams.get('sort_order') || 'desc';

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
      .from('expenses')
      .select(
        `
        id,
        wedding_id,
        category_id,
        created_by_id,
        title,
        description,
        amount,
        currency,
        vendor_name,
        vendor_contact,
        payment_method,
        payment_status,
        receipt_urls,
        invoice_number,
        reference_number,
        expense_date,
        due_date,
        paid_date,
        tags,
        notes,
        is_recurring,
        recurring_pattern,
        created_at,
        updated_at,
        budget_categories!inner(
          id,
          name,
          color_code,
          budgeted_amount
        ),
        created_by:created_by_id(
          id,
          full_name,
          email
        )
      `,
      )
      .eq('wedding_id', weddingId);

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (vendorName) {
      query = query.ilike('vendor_name', `%${vendorName}%`);
    }

    if (startDate) {
      query = query.gte('expense_date', startDate);
    }

    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: expenses, error, count } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    const totalAmount =
      expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const paidAmount =
      expenses
        ?.filter((e) => e.payment_status === 'paid')
        .reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const pendingAmount =
      expenses
        ?.filter((e) => e.payment_status === 'pending')
        .reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const overdueAmount =
      expenses
        ?.filter((e) => e.payment_status === 'overdue')
        .reduce((sum, expense) => sum + expense.amount, 0) || 0;

    const summary = {
      total_expenses: expenses?.length || 0,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      overdue_amount: overdueAmount,
      by_status:
        expenses?.reduce((acc: Record<string, number>, expense) => {
          acc[expense.payment_status] = (acc[expense.payment_status] || 0) + 1;
          return acc;
        }, {}) || {},
      by_category:
        expenses?.reduce(
          (
            acc: Record<
              string,
              { count: number; amount: number; name: string }
            >,
            expense,
          ) => {
            const categoryName = expense.budget_categories.name;
            if (!acc[categoryName]) {
              acc[categoryName] = { count: 0, amount: 0, name: categoryName };
            }
            acc[categoryName].count += 1;
            acc[categoryName].amount += expense.amount;
            return acc;
          },
          {},
        ) || {},
    };

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('wedding_id', weddingId);

    return NextResponse.json({
      expenses: expenses || [],
      summary,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/expenses:', error);
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
    const validatedData = CreateExpenseSchema.parse(body);

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
        { error: 'Only wedding couple can create expenses' },
        { status: 403 },
      );
    }

    // Verify category exists and belongs to this wedding
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id, name, wedding_id')
      .eq('id', validatedData.category_id)
      .eq('wedding_id', validatedData.wedding_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        {
          error: 'Budget category not found or does not belong to this wedding',
        },
        { status: 404 },
      );
    }

    // Create expense
    const expenseData = {
      ...validatedData,
      created_by_id: user.id,
      expense_date: validatedData.expense_date || new Date().toISOString(),
    };

    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert([expenseData])
      .select(
        `
        id,
        wedding_id,
        category_id,
        created_by_id,
        title,
        description,
        amount,
        currency,
        vendor_name,
        vendor_contact,
        payment_method,
        payment_status,
        receipt_urls,
        invoice_number,
        reference_number,
        expense_date,
        due_date,
        paid_date,
        tags,
        notes,
        is_recurring,
        recurring_pattern,
        created_at,
        updated_at,
        budget_categories!inner(
          id,
          name,
          color_code,
          budgeted_amount
        ),
        created_by:created_by_id(
          id,
          full_name,
          email
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json(
        { error: 'Failed to create expense' },
        { status: 500 },
      );
    }

    return NextResponse.json({ expense: newExpense }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in POST /api/expenses:', error);
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
    const validatedData = UpdateExpenseSchema.parse(body);
    const { id: expenseId, ...updateData } = validatedData;

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 },
      );
    }

    // Get existing expense and verify permissions
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select(
        `
        id,
        wedding_id,
        category_id,
        created_by_id,
        payment_status,
        weddings!inner(
          user1_id,
          user2_id
        )
      `,
      )
      .eq('id', expenseId)
      .single();

    if (fetchError || !existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const isWeddingOwner =
      existingExpense.weddings.user1_id === user.id ||
      existingExpense.weddings.user2_id === user.id;
    if (!isWeddingOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If changing category, verify new category belongs to wedding
    if (updateData.category_id) {
      const { data: newCategory, error: categoryError } = await supabase
        .from('budget_categories')
        .select('id, wedding_id')
        .eq('id', updateData.category_id)
        .eq('wedding_id', existingExpense.wedding_id)
        .single();

      if (categoryError || !newCategory) {
        return NextResponse.json(
          {
            error: 'New category not found or does not belong to this wedding',
          },
          { status: 404 },
        );
      }
    }

    // Update expense
    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select(
        `
        id,
        wedding_id,
        category_id,
        created_by_id,
        title,
        description,
        amount,
        currency,
        vendor_name,
        vendor_contact,
        payment_method,
        payment_status,
        receipt_urls,
        invoice_number,
        reference_number,
        expense_date,
        due_date,
        paid_date,
        tags,
        notes,
        is_recurring,
        recurring_pattern,
        created_at,
        updated_at,
        budget_categories!inner(
          id,
          name,
          color_code,
          budgeted_amount
        ),
        created_by:created_by_id(
          id,
          full_name,
          email
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return NextResponse.json(
        { error: 'Failed to update expense' },
        { status: 500 },
      );
    }

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in PUT /api/expenses:', error);
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

    // Get expense ID from query params
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('id');

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 },
      );
    }

    // Get existing expense and verify permissions
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select(
        `
        id,
        wedding_id,
        receipt_urls,
        weddings!inner(
          user1_id,
          user2_id
        )
      `,
      )
      .eq('id', expenseId)
      .single();

    if (fetchError || !existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const isWeddingOwner =
      existingExpense.weddings.user1_id === user.id ||
      existingExpense.weddings.user2_id === user.id;
    if (!isWeddingOwner) {
      return NextResponse.json(
        { error: 'Only wedding couple can delete expenses' },
        { status: 403 },
      );
    }

    // Note: Receipt files in Supabase Storage will be handled by storage policies
    // The receipt_urls array contains the file paths, but we don't need to manually delete them
    // as they should be cleaned up by storage policies or background jobs

    // Delete expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('Error deleting expense:', error);
      return NextResponse.json(
        { error: 'Failed to delete expense' },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/expenses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
