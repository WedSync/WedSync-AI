import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const deliverableSchema = z.object({
  deliverable_name: z.string().min(1).max(255),
  description: z.string().optional(),
  deliverable_type: z.enum([
    'document',
    'service',
    'product',
    'milestone',
    'approval',
  ]),
  category: z.string().max(100).optional(),
  due_date: z.string().datetime(),
  estimated_hours: z.number().positive().optional(),
  dependency_ids: z.array(z.string().uuid()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  requirements: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  assigned_to: z.string().uuid().optional(),
  assigned_team: z.string().max(100).optional(),
  reminder_enabled: z.boolean().default(true),
  reminder_days_before: z.number().int().min(0).default(3),
  escalation_enabled: z.boolean().default(false),
  escalation_days: z.number().int().min(1).default(1),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateDeliverableSchema = deliverableSchema.partial().extend({
  status: z
    .enum([
      'pending',
      'in_progress',
      'review_required',
      'completed',
      'overdue',
      'cancelled',
    ])
    .optional(),
  progress_percentage: z.number().int().min(0).max(100).optional(),
  started_date: z.string().datetime().optional(),
  completed_date: z.string().datetime().optional(),
  approved_date: z.string().datetime().optional(),
  approved_by: z.string().uuid().optional(),
  quality_score: z.number().int().min(1).max(5).optional(),
  review_notes: z.string().optional(),
  revision_count: z.number().int().min(0).optional(),
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assigned_to = searchParams.get('assigned_to');

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

    let query = supabase
      .from('contract_deliverables')
      .select(
        `
        *,
        assigned_user:user_profiles!contract_deliverables_assigned_to_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        approved_by_user:user_profiles!contract_deliverables_approved_by_fkey(
          id,
          first_name,
          last_name
        )
      `,
      )
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    const { data: deliverables, error } = await query.order('due_date', {
      ascending: true,
    });

    if (error) {
      console.error('Error fetching deliverables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deliverables' },
        { status: 500 },
      );
    }

    return NextResponse.json({ deliverables });
  } catch (error) {
    console.error('Deliverables GET error:', error);
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
    const validatedData = deliverableSchema.parse(body);

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
      .select('id, title, contract_number, service_start_date')
      .eq('id', contractId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 },
      );
    }

    // Validate due date is not after service start date (if applicable)
    if (contract.service_start_date) {
      const dueDate = new Date(validatedData.due_date);
      const serviceDate = new Date(contract.service_start_date);

      if (dueDate > serviceDate) {
        return NextResponse.json(
          {
            error: 'Deliverable due date cannot be after service start date',
          },
          { status: 400 },
        );
      }
    }

    // Validate dependency IDs exist
    if (
      validatedData.dependency_ids &&
      validatedData.dependency_ids.length > 0
    ) {
      const { data: dependencies } = await supabase
        .from('contract_deliverables')
        .select('id')
        .eq('contract_id', contractId)
        .in('id', validatedData.dependency_ids);

      if (dependencies?.length !== validatedData.dependency_ids.length) {
        return NextResponse.json(
          {
            error: 'One or more dependency deliverables do not exist',
          },
          { status: 400 },
        );
      }
    }

    // Validate assigned user exists in organization
    if (validatedData.assigned_to) {
      const { data: assignedUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', validatedData.assigned_to)
        .eq('organization_id', profile.organization_id)
        .single();

      if (!assignedUser) {
        return NextResponse.json(
          {
            error: 'Assigned user not found in organization',
          },
          { status: 400 },
        );
      }
    }

    // Create deliverable
    const { data: deliverable, error } = await supabase
      .from('contract_deliverables')
      .insert({
        ...validatedData,
        contract_id: contractId,
        organization_id: profile.organization_id,
        due_date: new Date(validatedData.due_date).toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deliverable:', error);
      return NextResponse.json(
        { error: 'Failed to create deliverable' },
        { status: 500 },
      );
    }

    // Create alert for deliverable
    if (validatedData.reminder_enabled) {
      const alertDate = new Date(validatedData.due_date);
      alertDate.setDate(
        alertDate.getDate() - validatedData.reminder_days_before,
      );

      await supabase.from('contract_alerts').insert({
        organization_id: profile.organization_id,
        deliverable_id: deliverable.id,
        alert_type: 'deliverable_due',
        title: `Deliverable Due: ${validatedData.deliverable_name}`,
        message: `Deliverable "${validatedData.deliverable_name}" is due on ${new Date(validatedData.due_date).toLocaleDateString()}`,
        priority: validatedData.priority === 'critical' ? 'critical' : 'medium',
        trigger_date: alertDate.toISOString().split('T')[0],
        days_before_due: validatedData.reminder_days_before,
        status: 'scheduled',
        recipient_user_ids: validatedData.assigned_to
          ? [validatedData.assigned_to]
          : [],
      });
    }

    // Get deliverable with relations
    const { data: fullDeliverable } = await supabase
      .from('contract_deliverables')
      .select(
        `
        *,
        assigned_user:user_profiles!contract_deliverables_assigned_to_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq('id', deliverable.id)
      .single();

    return NextResponse.json({ deliverable: fullDeliverable }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Create deliverable error:', error);
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
    const { deliverable_id, ...updateData } = body;

    // Validate input
    const validatedData = updateDeliverableSchema.parse(updateData);

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

    // Verify deliverable exists and user has access
    const { data: existingDeliverable } = await supabase
      .from('contract_deliverables')
      .select('id, status, progress_percentage, assigned_to')
      .eq('id', deliverable_id)
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!existingDeliverable) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 },
      );
    }

    // Validate progress percentage constraints
    if (validatedData.progress_percentage !== undefined) {
      if (validatedData.progress_percentage === 100 && !validatedData.status) {
        validatedData.status = 'completed';
        validatedData.completed_date = new Date().toISOString();
      }
    }

    // Validate user can approve (must be different from assigned user)
    if (
      validatedData.approved_by &&
      validatedData.approved_by === existingDeliverable.assigned_to
    ) {
      return NextResponse.json(
        {
          error: 'User cannot approve their own deliverable',
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

    if (validatedData.started_date) {
      updateFields.started_date = new Date(validatedData.started_date)
        .toISOString()
        .split('T')[0];
    }

    if (validatedData.completed_date) {
      updateFields.completed_date = new Date(validatedData.completed_date)
        .toISOString()
        .split('T')[0];
    }

    if (validatedData.approved_date) {
      updateFields.approved_date = new Date(validatedData.approved_date)
        .toISOString()
        .split('T')[0];
    }

    // Auto-set dates based on status
    if (
      validatedData.status === 'in_progress' &&
      !existingDeliverable.started_date
    ) {
      updateFields.started_date = new Date().toISOString().split('T')[0];
    }

    if (
      validatedData.status === 'completed' &&
      !existingDeliverable.completed_date
    ) {
      updateFields.completed_date = new Date().toISOString().split('T')[0];
      updateFields.progress_percentage = 100;
    }

    // Update deliverable
    const { data: deliverable, error } = await supabase
      .from('contract_deliverables')
      .update(updateFields)
      .eq('id', deliverable_id)
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id)
      .select(
        `
        *,
        assigned_user:user_profiles!contract_deliverables_assigned_to_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        approved_by_user:user_profiles!contract_deliverables_approved_by_fkey(
          id,
          first_name,
          last_name
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating deliverable:', error);
      return NextResponse.json(
        { error: 'Failed to update deliverable' },
        { status: 500 },
      );
    }

    // Create alerts for status changes
    if (
      validatedData.status === 'completed' &&
      existingDeliverable.status !== 'completed'
    ) {
      await supabase.from('contract_alerts').insert({
        organization_id: profile.organization_id,
        deliverable_id: deliverable.id,
        alert_type: 'deliverable_due',
        title: `Deliverable Completed: ${deliverable.deliverable_name}`,
        message: `Deliverable "${deliverable.deliverable_name}" has been completed.`,
        priority: 'low',
        trigger_date: new Date().toISOString().split('T')[0],
        status: 'sent',
      });
    }

    if (validatedData.status === 'review_required') {
      await supabase.from('contract_alerts').insert({
        organization_id: profile.organization_id,
        deliverable_id: deliverable.id,
        alert_type: 'deliverable_due',
        title: `Review Required: ${deliverable.deliverable_name}`,
        message: `Deliverable "${deliverable.deliverable_name}" requires review and approval.`,
        priority: 'medium',
        trigger_date: new Date().toISOString().split('T')[0],
        status: 'scheduled',
      });
    }

    return NextResponse.json({ deliverable });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Update deliverable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const contractId = id;
    const { searchParams } = new URL(request.url);
    const deliverable_id = searchParams.get('deliverable_id');

    if (!deliverable_id) {
      return NextResponse.json(
        { error: 'Deliverable ID is required' },
        { status: 400 },
      );
    }

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

    // Check if deliverable has dependencies
    const { data: dependentDeliverables } = await supabase
      .from('contract_deliverables')
      .select('id, deliverable_name')
      .eq('contract_id', contractId)
      .contains('dependency_ids', [deliverable_id]);

    if (dependentDeliverables && dependentDeliverables.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete deliverable that has dependencies',
          dependencies: dependentDeliverables,
        },
        { status: 400 },
      );
    }

    // Delete deliverable
    const { error } = await supabase
      .from('contract_deliverables')
      .delete()
      .eq('id', deliverable_id)
      .eq('contract_id', contractId)
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error('Error deleting deliverable:', error);
      return NextResponse.json(
        { error: 'Failed to delete deliverable' },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Deliverable deleted successfully' });
  } catch (error) {
    console.error('Delete deliverable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
