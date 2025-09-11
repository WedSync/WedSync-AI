import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentSecurityManager } from '@/lib/security/payment-security';
import { z } from 'zod';

const UpdatePaymentScheduleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  amount: z.number().positive().max(1000000).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'upcoming']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  reminderSettings: z
    .object({
      enabled: z.boolean(),
      daysBefore: z.array(z.number().min(0).max(365)),
      notificationTypes: z.array(z.enum(['push', 'email', 'sms'])),
    })
    .optional(),
  paymentMethod: z
    .object({
      type: z.enum(['check', 'transfer', 'card', 'cash']),
      reference: z.string().optional(),
    })
    .optional(),
  paidDate: z.string().datetime().optional(),
  paidAmount: z.number().positive().optional(),
  encryptedPaymentData: z.string().optional(),
});

const securityManager = new PaymentSecurityManager();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const scheduleId = params.id;

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get payment schedule with access check
    const { data: schedule, error } = await supabase
      .from('payment_schedules')
      .select(
        `
        *,
        vendor:vendors(id, name, category, contact_info),
        wedding:weddings!inner(
          id,
          wedding_access!inner(user_id, role)
        )
      `,
      )
      .eq('id', scheduleId)
      .eq('wedding.wedding_access.user_id', user.id)
      .single();

    if (error || !schedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found or access denied' },
        { status: 404 },
      );
    }

    // Decrypt sensitive data if present
    let decryptedData = {};
    if (schedule.encrypted_payment_data) {
      try {
        decryptedData = await securityManager.decryptPaymentData(
          schedule.encrypted_payment_data,
        );
      } catch (error) {
        console.error('Failed to decrypt payment data:', error);
      }
    }

    const responseSchedule = {
      id: schedule.id,
      weddingId: schedule.wedding_id,
      title: schedule.title,
      description: schedule.description,
      amount: schedule.amount,
      dueDate: schedule.due_date,
      vendor: {
        id: schedule.vendor?.id || schedule.vendor_id,
        name: schedule.vendor?.name || 'Unknown Vendor',
        category: schedule.vendor?.category || 'Other',
        contact: schedule.vendor?.contact_info,
      },
      status: schedule.status,
      priority: schedule.priority,
      reminderSettings: {
        enabled: schedule.reminder_enabled || false,
        daysBefore: schedule.reminder_days_before || [7, 3, 1],
        notificationTypes: schedule.notification_types || ['push'],
      },
      paymentMethod: schedule.payment_method,
      paidDate: schedule.paid_date,
      paidAmount: schedule.paid_amount,
      attachments: schedule.attachments || [],
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
      createdBy: schedule.created_by,
      ...decryptedData,
    };

    return NextResponse.json({ schedule: responseSchedule });
  } catch (error) {
    console.error('GET /api/payments/schedules/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const scheduleId = params.id;
    const body = await request.json();

    // Validate request body
    const validatedData = UpdatePaymentScheduleSchema.parse(body);

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing schedule with access check
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('payment_schedules')
      .select(
        `
        *,
        wedding:weddings!inner(
          id,
          wedding_access!inner(user_id, role)
        )
      `,
      )
      .eq('id', scheduleId)
      .eq('wedding.wedding_access.user_id', user.id)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found or access denied' },
        { status: 404 },
      );
    }

    // Check permissions for updates
    const userRole = existingSchedule.wedding.wedding_access[0]?.role;
    if (!['admin', 'planner', 'couple'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update payment schedules' },
        { status: 403 },
      );
    }

    // Special handling for payment completion
    if (validatedData.status === 'paid') {
      if (!validatedData.paidDate) {
        validatedData.paidDate = new Date().toISOString();
      }
      if (!validatedData.paidAmount) {
        validatedData.paidAmount = existingSchedule.amount;
      }

      // Log payment completion for audit trail
      await supabase.from('payment_audit_log').insert({
        payment_schedule_id: scheduleId,
        action: 'payment_completed',
        user_id: user.id,
        old_status: existingSchedule.status,
        new_status: 'paid',
        amount_paid: validatedData.paidAmount,
        payment_date: validatedData.paidDate,
        metadata: {
          payment_method: validatedData.paymentMethod,
          completed_via: 'mobile_app',
        },
      });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.title !== undefined)
      updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.amount !== undefined)
      updateData.amount = validatedData.amount;
    if (validatedData.dueDate !== undefined)
      updateData.due_date = validatedData.dueDate;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;
    if (validatedData.priority !== undefined)
      updateData.priority = validatedData.priority;
    if (validatedData.paidDate !== undefined)
      updateData.paid_date = validatedData.paidDate;
    if (validatedData.paidAmount !== undefined)
      updateData.paid_amount = validatedData.paidAmount;
    if (validatedData.paymentMethod !== undefined)
      updateData.payment_method = validatedData.paymentMethod;
    if (validatedData.encryptedPaymentData !== undefined)
      updateData.encrypted_payment_data = validatedData.encryptedPaymentData;

    if (validatedData.reminderSettings) {
      updateData.reminder_enabled = validatedData.reminderSettings.enabled;
      updateData.reminder_days_before =
        validatedData.reminderSettings.daysBefore;
      updateData.notification_types =
        validatedData.reminderSettings.notificationTypes;
    }

    // Update payment schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .select(
        `
        *,
        vendor:vendors(id, name, category, contact_info)
      `,
      )
      .single();

    if (updateError) {
      console.error('Database error updating schedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment schedule' },
        { status: 500 },
      );
    }

    // Send real-time notification for status changes
    if (
      validatedData.status &&
      validatedData.status !== existingSchedule.status
    ) {
      await supabase.from('notifications').insert({
        wedding_id: updatedSchedule.wedding_id,
        type: 'payment_status_change',
        title: `Payment ${validatedData.status === 'paid' ? 'Completed' : 'Updated'}`,
        message: `Payment for "${updatedSchedule.title}" has been marked as ${validatedData.status}`,
        data: {
          payment_schedule_id: scheduleId,
          old_status: existingSchedule.status,
          new_status: validatedData.status,
          amount: updatedSchedule.amount,
        },
        created_by: user.id,
      });

      // Send real-time update via Supabase channels
      await supabase.channel(`wedding-${updatedSchedule.wedding_id}`).send({
        type: 'broadcast',
        event: 'payment_schedule_updated',
        payload: {
          scheduleId,
          status: validatedData.status,
          updatedBy: user.id,
        },
      });
    }

    // Format response
    const responseSchedule = {
      id: updatedSchedule.id,
      weddingId: updatedSchedule.wedding_id,
      title: updatedSchedule.title,
      description: updatedSchedule.description,
      amount: updatedSchedule.amount,
      dueDate: updatedSchedule.due_date,
      vendor: {
        id: updatedSchedule.vendor.id,
        name: updatedSchedule.vendor.name,
        category: updatedSchedule.vendor.category,
        contact: updatedSchedule.vendor.contact_info,
      },
      status: updatedSchedule.status,
      priority: updatedSchedule.priority,
      reminderSettings: {
        enabled: updatedSchedule.reminder_enabled,
        daysBefore: updatedSchedule.reminder_days_before,
        notificationTypes: updatedSchedule.notification_types,
      },
      paymentMethod: updatedSchedule.payment_method,
      paidDate: updatedSchedule.paid_date,
      paidAmount: updatedSchedule.paid_amount,
      createdAt: updatedSchedule.created_at,
      updatedAt: updatedSchedule.updated_at,
      createdBy: updatedSchedule.created_by,
    };

    return NextResponse.json({
      schedule: responseSchedule,
      message: 'Payment schedule updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error('PUT /api/payments/schedules/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const scheduleId = params.id;

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing schedule with access check
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('payment_schedules')
      .select(
        `
        *,
        wedding:weddings!inner(
          id,
          wedding_access!inner(user_id, role)
        )
      `,
      )
      .eq('id', scheduleId)
      .eq('wedding.wedding_access.user_id', user.id)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found or access denied' },
        { status: 404 },
      );
    }

    // Check permissions for deletion (only admin and planner can delete)
    const userRole = existingSchedule.wedding.wedding_access[0]?.role;
    if (!['admin', 'planner'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete payment schedules' },
        { status: 403 },
      );
    }

    // Prevent deletion of paid schedules
    if (existingSchedule.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete paid payment schedules' },
        { status: 409 },
      );
    }

    // Log deletion for audit trail
    await supabase.from('payment_audit_log').insert({
      payment_schedule_id: scheduleId,
      action: 'schedule_deleted',
      user_id: user.id,
      metadata: {
        deleted_schedule: existingSchedule,
        deleted_via: 'mobile_app',
      },
    });

    // Delete the schedule
    const { error: deleteError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('id', scheduleId);

    if (deleteError) {
      console.error('Database error deleting schedule:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete payment schedule' },
        { status: 500 },
      );
    }

    // Send real-time notification
    await supabase.from('notifications').insert({
      wedding_id: existingSchedule.wedding_id,
      type: 'payment_schedule_deleted',
      title: 'Payment Schedule Deleted',
      message: `Payment schedule for "${existingSchedule.title}" has been deleted`,
      data: {
        payment_schedule_id: scheduleId,
        schedule_title: existingSchedule.title,
        amount: existingSchedule.amount,
      },
      created_by: user.id,
    });

    // Send real-time update via Supabase channels
    await supabase.channel(`wedding-${existingSchedule.wedding_id}`).send({
      type: 'broadcast',
      event: 'payment_schedule_deleted',
      payload: {
        scheduleId,
        deletedBy: user.id,
      },
    });

    return NextResponse.json({
      message: 'Payment schedule deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/payments/schedules/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
