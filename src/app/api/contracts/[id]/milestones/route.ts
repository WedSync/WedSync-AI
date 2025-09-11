import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const milestoneSchema = z.object({
  milestone_name: z.string().min(1).max(255),
  description: z.string().optional(),
  milestone_type: z.enum([
    'deposit',
    'progress_payment',
    'final_payment',
    'penalty',
    'refund',
  ]),
  sequence_order: z.number().int().positive(),
  amount: z.number().positive(),
  percentage_of_total: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).default('GBP'),
  due_date: z.string().datetime(),
  grace_period_days: z.number().int().min(0).default(0),
  reminder_days_before: z.number().int().min(0).default(7),
  auto_reminder_enabled: z.boolean().default(true),
  notes: z.string().optional(),
});

const updateMilestoneSchema = milestoneSchema.partial().extend({
  status: z
    .enum([
      'pending',
      'overdue',
      'partially_paid',
      'paid',
      'waived',
      'cancelled',
    ])
    .optional(),
  paid_amount: z.number().min(0).optional(),
  paid_date: z.string().datetime().optional(),
  payment_reference: z.string().max(100).optional(),
  payment_method: z.string().max(50).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const contractId = id;

    // Get user's organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify contract exists and user has access
    const { data: contract } = await supabase
      .from('wedding_contracts')
      .select('id, title, contract_number')
      .eq('id', contractId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 },
      );
    }

    // Get milestones
    const { data: milestones, error } = await supabase
      .from('contract_payment_milestones')
      .select('*')
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id)
      .order('sequence_order', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json(
        { error: 'Failed to fetch milestones' },
        { status: 500 },
      );
    }

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('Milestones GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const contractId = id;
    const body = await request.json();

    // Validate input
    const validatedData = milestoneSchema.parse(body);

    // Get user's organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify contract exists and user has access
    const { data: contract } = await supabase
      .from('wedding_contracts')
      .select('id, total_amount, currency')
      .eq('id', contractId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 },
      );
    }

    // Validate milestone amount doesn't exceed contract total
    if (validatedData.amount > contract.total_amount) {
      return NextResponse.json(
        {
          error: 'Milestone amount cannot exceed contract total amount',
        },
        { status: 400 },
      );
    }

    // Check if sequence order is unique
    const { data: existingMilestone } = await supabase
      .from('contract_payment_milestones')
      .select('id')
      .eq('contract_id', contractId)
      .eq('sequence_order', validatedData.sequence_order)
      .single();

    if (existingMilestone) {
      return NextResponse.json(
        {
          error: 'Sequence order already exists. Please use a different order.',
        },
        { status: 400 },
      );
    }

    // Create milestone
    const { data: milestone, error } = await supabase
      .from('contract_payment_milestones')
      .insert({
        ...validatedData,
        contract_id: contractId,
        organization_id: profile.organization_id,
        due_date: new Date(validatedData.due_date).toISOString().split('T')[0],
        currency: validatedData.currency || contract.currency,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return NextResponse.json(
        { error: 'Failed to create milestone' },
        { status: 500 },
      );
    }

    // Create alert for milestone
    const alertDate = new Date(validatedData.due_date);
    alertDate.setDate(alertDate.getDate() - validatedData.reminder_days_before);

    await supabase.from('contract_alerts').insert({
      organization_id: profile.organization_id,
      milestone_id: milestone.id,
      alert_type: 'payment_due',
      title: `Payment Due: ${validatedData.milestone_name}`,
      message: `Payment milestone "${validatedData.milestone_name}" is due on ${new Date(validatedData.due_date).toLocaleDateString()}`,
      priority: 'medium',
      trigger_date: alertDate.toISOString().split('T')[0],
      days_before_due: validatedData.reminder_days_before,
      status: 'scheduled',
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Create milestone error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const contractId = id;
    const body = await request.json();
    const { milestone_id, ...updateData } = body;

    // Validate input
    const validatedData = updateMilestoneSchema.parse(updateData);

    // Get user's organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify milestone exists and user has access
    const { data: existingMilestone } = await supabase
      .from('contract_payment_milestones')
      .select('id, amount, paid_amount')
      .eq('id', milestone_id)
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!existingMilestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 },
      );
    }

    // Validate paid amount doesn't exceed milestone amount
    if (
      validatedData.paid_amount &&
      validatedData.paid_amount > existingMilestone.amount
    ) {
      return NextResponse.json(
        {
          error: 'Paid amount cannot exceed milestone amount',
        },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateFields: any = { ...validatedData };

    if (validatedData.due_date) {
      updateFields.due_date = new Date(validatedData.due_date)
        .toISOString()
        .split('T')[0];
    }

    if (validatedData.paid_date) {
      updateFields.paid_date = new Date(validatedData.paid_date)
        .toISOString()
        .split('T')[0];
    }

    // Update milestone
    const { data: milestone, error } = await supabase
      .from('contract_payment_milestones')
      .update(updateFields)
      .eq('id', milestone_id)
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating milestone:', error);
      return NextResponse.json(
        { error: 'Failed to update milestone' },
        { status: 500 },
      );
    }

    // If milestone was marked as paid, create alert
    if (
      validatedData.status === 'paid' &&
      existingMilestone.paid_amount === 0
    ) {
      await supabase.from('contract_alerts').insert({
        organization_id: profile.organization_id,
        milestone_id: milestone.id,
        alert_type: 'milestone_approaching',
        title: `Payment Received: ${milestone.milestone_name}`,
        message: `Payment for milestone "${milestone.milestone_name}" has been received.`,
        priority: 'low',
        trigger_date: new Date().toISOString().split('T')[0],
        status: 'sent',
      });
    }

    return NextResponse.json({ milestone });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Update milestone error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
