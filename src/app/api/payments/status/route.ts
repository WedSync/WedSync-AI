import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const UpdatePaymentStatusSchema = z.object({
  payment_schedule_id: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled', 'partial']),
  amount_paid: z.number().min(0).max(1000000).optional(),
  paid_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  payment_method: z.string().max(50).optional(),
  transaction_reference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  change_reason: z.string().max(200).optional(),
});

export async function PATCH(request: NextRequest) {
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
    const validatedData = UpdatePaymentStatusSchema.parse(body);

    // Get existing schedule to validate access and current status
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('payment_schedules')
      .select(
        `
        id,
        wedding_id,
        amount,
        status,
        amount_paid,
        description,
        due_date,
        payment_type
      `,
      )
      .eq('id', validatedData.payment_schedule_id)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found' },
        { status: 404 },
      );
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', existingSchedule.wedding_id)
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
        { error: 'Insufficient permissions to update payment status' },
        { status: 403 },
      );
    }

    // Validate status transition and payment amounts
    const statusValidation = validateStatusTransition(
      existingSchedule.status,
      validatedData.status,
      existingSchedule.amount,
      existingSchedule.amount_paid || 0,
      validatedData.amount_paid,
    );

    if (!statusValidation.valid) {
      return NextResponse.json(
        { error: statusValidation.error },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Handle amount_paid based on status
    if (validatedData.status === 'paid') {
      updateData.amount_paid =
        validatedData.amount_paid || existingSchedule.amount;
      updateData.paid_date =
        validatedData.paid_date || new Date().toISOString().split('T')[0];
    } else if (validatedData.status === 'partial') {
      if (!validatedData.amount_paid || validatedData.amount_paid <= 0) {
        return NextResponse.json(
          { error: 'amount_paid is required for partial payments' },
          { status: 400 },
        );
      }
      if (validatedData.amount_paid >= existingSchedule.amount) {
        return NextResponse.json(
          {
            error: 'Partial payment amount cannot equal or exceed total amount',
          },
          { status: 400 },
        );
      }
      updateData.amount_paid = validatedData.amount_paid;
    } else if (validatedData.status === 'cancelled') {
      // Keep existing amount_paid for cancelled payments
      updateData.amount_paid = existingSchedule.amount_paid;
    }

    // Add optional fields
    if (validatedData.payment_method) {
      updateData.payment_method = validatedData.payment_method;
    }
    if (validatedData.transaction_reference) {
      updateData.transaction_reference = validatedData.transaction_reference;
    }
    if (validatedData.notes) {
      updateData.notes = validatedData.notes;
    }

    // Update payment schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', validatedData.payment_schedule_id)
      .select(
        `
        *,
        budget_categories (
          id,
          name,
          category_type
        )
      `,
      )
      .single();

    if (updateError) {
      console.error('Error updating payment schedule status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 },
      );
    }

    // Handle reminder updates based on status change
    if (validatedData.status === 'paid') {
      // Cancel pending reminders for paid payments
      await supabase
        .from('payment_reminders')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'Payment completed',
        })
        .eq('payment_schedule_id', validatedData.payment_schedule_id)
        .eq('is_sent', false)
        .eq('is_cancelled', false);
    } else if (validatedData.status === 'overdue') {
      // Create overdue notification reminder
      await supabase.from('payment_reminders').insert({
        payment_schedule_id: validatedData.payment_schedule_id,
        reminder_date: new Date().toISOString(),
        reminder_type: 'overdue_notification',
        reminder_priority: 'urgent',
        message: `OVERDUE: ${existingSchedule.description} was due on ${existingSchedule.due_date}`,
        created_by: user.id,
      });
    }

    // Log activity with detailed status change information
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: existingSchedule.wedding_id,
      action: 'update_payment_status',
      resource_type: 'payment_schedule',
      resource_id: updatedSchedule.id,
      metadata: {
        previous_status: existingSchedule.status,
        new_status: validatedData.status,
        previous_amount_paid: existingSchedule.amount_paid || 0,
        new_amount_paid: updateData.amount_paid || 0,
        payment_method: validatedData.payment_method,
        transaction_reference: validatedData.transaction_reference,
        change_reason:
          validatedData.change_reason ||
          `Status changed from ${existingSchedule.status} to ${validatedData.status}`,
        payment_description: existingSchedule.description,
        payment_type: existingSchedule.payment_type,
      },
    });

    // Calculate additional metrics for response
    const response = {
      ...updatedSchedule,
      remaining_amount:
        updatedSchedule.amount - (updatedSchedule.amount_paid || 0),
      completion_percentage:
        updatedSchedule.amount_paid && updatedSchedule.amount > 0
          ? Math.round(
              (updatedSchedule.amount_paid / updatedSchedule.amount) * 100,
            )
          : 0,
      status_change: {
        from: existingSchedule.status,
        to: validatedData.status,
        changed_at: updateData.updated_at,
        changed_by: user.id,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: `Payment status updated to ${validatedData.status}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in PATCH /api/payments/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

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

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('schedule_id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'schedule_id parameter is required' },
        { status: 400 },
      );
    }

    // Verify user has access to the payment schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('payment_schedules')
      .select(
        `
        id,
        wedding_id,
        description,
        amount,
        status
      `,
      )
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found' },
        { status: 404 },
      );
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', schedule.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get payment status history
    const { data: history, error: historyError } = await supabase
      .from('payment_schedule_history')
      .select(
        `
        id,
        previous_status,
        new_status,
        previous_amount_paid,
        new_amount_paid,
        payment_method,
        transaction_reference,
        change_reason,
        status_changed_at,
        changed_by,
        changed_by_role,
        notes
      `,
      )
      .eq('payment_schedule_id', scheduleId)
      .order('status_changed_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching payment status history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch payment status history' },
        { status: 500 },
      );
    }

    // Get user information for history records
    const userIds = [
      ...new Set(history?.map((h) => h.changed_by).filter(Boolean)),
    ];
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    // Format history with user information
    const formattedHistory =
      history?.map((record) => ({
        id: record.id,
        previous_status: record.previous_status,
        new_status: record.new_status,
        previous_amount_paid: record.previous_amount_paid,
        new_amount_paid: record.new_amount_paid,
        payment_method: record.payment_method,
        transaction_reference: record.transaction_reference,
        change_reason: record.change_reason,
        status_changed_at: record.status_changed_at,
        changed_by: {
          id: record.changed_by,
          name: userMap.get(record.changed_by)?.full_name || 'Unknown User',
          email: userMap.get(record.changed_by)?.email || null,
          role: record.changed_by_role,
        },
        notes: record.notes,
      })) || [];

    return NextResponse.json({
      success: true,
      data: {
        schedule: {
          id: schedule.id,
          description: schedule.description,
          amount: schedule.amount,
          current_status: schedule.status,
        },
        history: formattedHistory,
        summary: {
          total_changes: formattedHistory.length,
          current_status: schedule.status,
          last_updated: formattedHistory[0]?.status_changed_at || null,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/payments/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to validate status transitions
function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  totalAmount: number,
  currentAmountPaid: number,
  newAmountPaid?: number,
): { valid: boolean; error?: string } {
  // Allow same status (no-op updates)
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Validate status transition logic
  const validTransitions = {
    pending: ['paid', 'partial', 'overdue', 'cancelled'],
    partial: ['paid', 'cancelled', 'overdue'],
    overdue: ['paid', 'partial', 'cancelled'],
    cancelled: ['pending'], // Allow reactivation
    paid: [], // Paid payments cannot change status (should be rare exception)
  };

  const allowedNextStates =
    validTransitions[currentStatus as keyof typeof validTransitions] || [];

  if (!allowedNextStates.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Validate amount logic for specific statuses
  if (newStatus === 'paid') {
    const expectedPaidAmount = newAmountPaid || totalAmount;
    if (expectedPaidAmount !== totalAmount) {
      return {
        valid: false,
        error: 'Paid amount must equal total amount for completed payments',
      };
    }
  }

  if (newStatus === 'partial') {
    if (!newAmountPaid || newAmountPaid <= 0) {
      return {
        valid: false,
        error: 'Partial payment amount must be greater than 0',
      };
    }
    if (newAmountPaid >= totalAmount) {
      return {
        valid: false,
        error: 'Partial payment amount must be less than total amount',
      };
    }
    if (newAmountPaid <= currentAmountPaid) {
      return {
        valid: false,
        error:
          'Partial payment amount must be greater than current amount paid',
      };
    }
  }

  return { valid: true };
}
