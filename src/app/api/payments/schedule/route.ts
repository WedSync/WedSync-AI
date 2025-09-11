import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const CreatePaymentScheduleSchema = z.object({
  wedding_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive().max(1000000),
  description: z.string().min(3).max(500).trim(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  payment_type: z
    .enum(['deposit', 'milestone', 'final', 'balance', 'gratuity'])
    .default('milestone'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  vendor_name: z.string().max(200).optional(),
  vendor_contact: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
});

const UpdatePaymentScheduleSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive().max(1000000).optional(),
  description: z.string().min(3).max(500).trim().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  payment_type: z
    .enum(['deposit', 'milestone', 'final', 'balance', 'gratuity'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  vendor_name: z.string().max(200).optional(),
  vendor_contact: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
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
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const paymentType = searchParams.get('payment_type');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build query for payment schedules
    let query = supabase
      .from('payment_schedules')
      .select(
        `
        id,
        wedding_id,
        organization_id,
        category_id,
        amount,
        description,
        due_date,
        status,
        amount_paid,
        paid_date,
        payment_method,
        transaction_reference,
        payment_type,
        priority,
        vendor_name,
        vendor_contact,
        notes,
        tags,
        created_at,
        updated_at,
        budget_categories (
          id,
          name,
          category_type,
          budgeted_amount
        ),
        payment_reminders (
          id,
          reminder_date,
          reminder_type,
          is_sent,
          delivery_status
        )
      `,
      )
      .eq('wedding_id', weddingId);

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentType) {
      query = query.eq('payment_type', paymentType);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (startDate) {
      query = query.gte('due_date', startDate);
    }

    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    // Apply sorting by due date
    query = query.order('due_date', { ascending: true });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Error fetching payment schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment schedules' },
        { status: 500 },
      );
    }

    // Calculate additional metrics
    const schedulesWithMetrics =
      schedules?.map((schedule) => {
        const isOverdue =
          schedule.status === 'pending' &&
          new Date(schedule.due_date) < new Date();
        const actualStatus = isOverdue ? 'overdue' : schedule.status;

        return {
          ...schedule,
          status: actualStatus,
          is_overdue: isOverdue,
          days_until_due: Math.ceil(
            (new Date(schedule.due_date).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          completion_percentage:
            schedule.amount_paid && schedule.amount > 0
              ? (schedule.amount_paid / schedule.amount) * 100
              : 0,
          remaining_amount: schedule.amount - (schedule.amount_paid || 0),
          category_name: schedule.budget_categories?.name || null,
          reminder_count: schedule.payment_reminders?.length || 0,
          next_reminder:
            schedule.payment_reminders?.find(
              (r) => !r.is_sent && new Date(r.reminder_date) >= new Date(),
            ) || null,
        };
      }) || [];

    // Calculate summary statistics
    const summary = {
      total_scheduled: schedulesWithMetrics.reduce(
        (sum, s) => sum + s.amount,
        0,
      ),
      total_paid: schedulesWithMetrics.reduce(
        (sum, s) => sum + (s.amount_paid || 0),
        0,
      ),
      total_pending: schedulesWithMetrics
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + s.amount, 0),
      total_overdue: schedulesWithMetrics
        .filter((s) => s.status === 'overdue')
        .reduce((sum, s) => sum + s.remaining_amount, 0),
      schedules_count: schedulesWithMetrics.length,
      overdue_count: schedulesWithMetrics.filter((s) => s.is_overdue).length,
      upcoming_count: schedulesWithMetrics.filter(
        (s) =>
          s.days_until_due >= 0 &&
          s.days_until_due <= 30 &&
          s.status === 'pending',
      ).length,
      critical_count: schedulesWithMetrics.filter(
        (s) => s.priority === 'critical',
      ).length,
    };

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('payment_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('wedding_id', weddingId);

    return NextResponse.json({
      success: true,
      data: {
        schedules: schedulesWithMetrics,
        summary,
      },
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/payments/schedule:', error);
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
    const validatedData = CreatePaymentScheduleSchema.parse(body);

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

    if (
      !['owner', 'partner', 'planner', 'financial_manager'].includes(
        teamMember.role,
      )
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create payment schedules' },
        { status: 403 },
      );
    }

    // Validate category exists and belongs to wedding if provided
    if (validatedData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('budget_categories')
        .select('id, name, wedding_id')
        .eq('id', validatedData.category_id)
        .eq('wedding_id', validatedData.wedding_id)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'Budget category not found or inactive' },
          { status: 404 },
        );
      }
    }

    // Create payment schedule
    const { data: newSchedule, error } = await supabase
      .from('payment_schedules')
      .insert([
        {
          ...validatedData,
          status: 'pending',
          created_by: user.id,
          updated_by: user.id,
        },
      ])
      .select(
        `
        *,
        budget_categories (
          id,
          name,
          category_type,
          budgeted_amount
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error creating payment schedule:', error);
      return NextResponse.json(
        { error: 'Failed to create payment schedule' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: validatedData.wedding_id,
      action: 'create_payment_schedule',
      resource_type: 'payment_schedule',
      resource_id: newSchedule.id,
      metadata: {
        payment_description: newSchedule.description,
        amount: newSchedule.amount,
        due_date: newSchedule.due_date,
        payment_type: newSchedule.payment_type,
        priority: newSchedule.priority,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newSchedule,
        message: 'Payment schedule created successfully',
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

    console.error('Unexpected error in POST /api/payments/schedule:', error);
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
    const validatedData = UpdatePaymentScheduleSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Get the schedule to check ownership and wedding access
    const { data: schedule, error: scheduleError } = await supabase
      .from('payment_schedules')
      .select('wedding_id, description, status')
      .eq('id', id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found' },
        { status: 404 },
      );
    }

    // Check user has write access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', schedule.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (
      !['owner', 'partner', 'planner', 'financial_manager'].includes(
        teamMember.role,
      )
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update payment schedules' },
        { status: 403 },
      );
    }

    // Validate category if being updated
    if (updateData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('id', updateData.category_id)
        .eq('wedding_id', schedule.wedding_id)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'Budget category not found or inactive' },
          { status: 404 },
        );
      }
    }

    // Update payment schedule
    const { data: updatedSchedule, error } = await supabase
      .from('payment_schedules')
      .update({
        ...updateData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        budget_categories (
          id,
          name,
          category_type,
          budgeted_amount
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating payment schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update payment schedule' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: schedule.wedding_id,
      action: 'update_payment_schedule',
      resource_type: 'payment_schedule',
      resource_id: updatedSchedule.id,
      metadata: {
        payment_description: updatedSchedule.description,
        changes: updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
      message: 'Payment schedule updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in PUT /api/payments/schedule:', error);
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
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Payment schedule ID is required' },
        { status: 400 },
      );
    }

    // Get the schedule to check ownership
    const { data: schedule, error: scheduleError } = await supabase
      .from('payment_schedules')
      .select('wedding_id, description, status, amount_paid')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found' },
        { status: 404 },
      );
    }

    // Check user has delete access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', schedule.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner'].includes(teamMember.role)) {
      return NextResponse.json(
        {
          error:
            'Only wedding owners/partners/planners can delete payment schedules',
        },
        { status: 403 },
      );
    }

    // Prevent deletion of paid schedules (soft delete instead)
    if (
      schedule.status === 'paid' ||
      (schedule.amount_paid && schedule.amount_paid > 0)
    ) {
      const { error } = await supabase
        .from('payment_schedules')
        .update({
          status: 'cancelled',
          updated_by: user.id,
          updated_at: new Date().toISOString(),
          notes:
            (schedule.notes || '') + ' [CANCELLED - Previously had payments]',
        })
        .eq('id', scheduleId);

      if (error) {
        console.error('Payment schedule soft delete error:', error);
        return NextResponse.json(
          { error: 'Failed to cancel payment schedule' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payment schedule cancelled (had payment history)',
      });
    } else {
      // Hard delete - no payments recorded
      const { error } = await supabase
        .from('payment_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        console.error('Payment schedule delete error:', error);
        return NextResponse.json(
          { error: 'Failed to delete payment schedule' },
          { status: 500 },
        );
      }
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: schedule.wedding_id,
      action: 'delete_payment_schedule',
      resource_type: 'payment_schedule',
      resource_id: scheduleId,
      metadata: {
        payment_description: schedule.description,
        had_payments: schedule.amount_paid && schedule.amount_paid > 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment schedule deleted successfully',
    });
  } catch (error) {
    console.error('Delete payment schedule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
