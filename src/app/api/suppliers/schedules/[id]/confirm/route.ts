import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const confirmScheduleSchema = z.object({
  status: z.enum(['confirmed', 'conditional', 'declined']),
  notes: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  signedBy: z.string(),
  digitalSignature: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = confirmScheduleSchema.parse(body);
    const scheduleId = params.id;

    // Verify the user is the supplier for this schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('supplier_schedules')
      .select(
        `
        *,
        supplier:suppliers(*)
      `,
      )
      .eq('id', scheduleId)
      .single();

    if (scheduleError) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 },
      );
    }

    // Check if user has permission to confirm this schedule
    const { data: supplierProfile } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!supplierProfile || supplierProfile.id !== schedule.supplier_id) {
      return NextResponse.json(
        { error: 'Unauthorized to confirm this schedule' },
        { status: 403 },
      );
    }

    // Create schedule confirmation record
    const { data: confirmation, error: confirmationError } = await supabase
      .from('schedule_confirmations')
      .insert({
        schedule_id: scheduleId,
        supplier_id: schedule.supplier_id,
        status: validatedData.status,
        notes: validatedData.notes,
        conditions: validatedData.conditions,
        signed_by: validatedData.signedBy,
        digital_signature: validatedData.digitalSignature,
        confirmed_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (confirmationError) {
      return NextResponse.json(
        {
          error: 'Failed to create confirmation',
          details: confirmationError.message,
        },
        { status: 500 },
      );
    }

    // Update the schedule status
    const { error: updateError } = await supabase
      .from('supplier_schedules')
      .update({
        status: validatedData.status,
        confirmed_at:
          validatedData.status === 'confirmed'
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Failed to update schedule status:', updateError);
    }

    // Create notification for the couple/planner
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        recipient_type: 'couple',
        recipient_id: schedule.client_id,
        type: 'schedule_confirmation',
        title: `Schedule ${validatedData.status === 'confirmed' ? 'Confirmed' : 'Updated'}`,
        message: `${schedule.supplier.business_name} has ${validatedData.status} their wedding schedule`,
        data: {
          scheduleId,
          supplierId: schedule.supplier_id,
          supplierName: schedule.supplier.business_name,
          status: validatedData.status,
          notes: validatedData.notes,
        },
        created_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    // Log the activity
    await supabase.from('activity_logs').insert({
      entity_type: 'schedule_confirmation',
      entity_id: scheduleId,
      action: 'confirmed',
      user_id: user.id,
      details: {
        status: validatedData.status,
        supplierName: schedule.supplier.business_name,
        notes: validatedData.notes,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      confirmation,
      message: `Schedule ${validatedData.status} successfully`,
    });
  } catch (error) {
    console.error('Schedule confirmation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = params.id;

    // Get confirmation history
    const { data: confirmations, error } = await supabase
      .from('schedule_confirmations')
      .select(
        `
        *,
        supplier:suppliers(business_name),
        creator:auth.users(email)
      `,
      )
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch confirmations' },
        { status: 500 },
      );
    }

    return NextResponse.json(confirmations);
  } catch (error) {
    console.error('Get confirmations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
