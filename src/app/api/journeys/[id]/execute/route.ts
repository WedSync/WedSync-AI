import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { JourneyExecutor } from '@/lib/journey/executor';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const { id: journeyId } = params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { clientId, variables = {} } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 },
      );
    }

    // Verify journey exists and user has access
    const { data: journey, error: journeyError } = await supabase
      .from('journey_templates')
      .select('*, vendor:vendors!inner(*)')
      .eq('id', journeyId)
      .eq('vendor.user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Verify client exists and belongs to vendor
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('vendor_id', journey.vendor_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if journey is active
    if (journey.status !== 'active') {
      return NextResponse.json(
        { error: 'Journey is not active' },
        { status: 400 },
      );
    }

    // Create journey execution instance
    const { data: execution, error: executionError } = await supabase
      .from('journey_executions')
      .insert({
        template_id: journeyId,
        client_id: clientId,
        vendor_id: journey.vendor_id,
        organization_id: journey.organization_id,
        status: 'pending',
        context: {
          ...variables,
          client_name: `${client.first_name} ${client.last_name}`,
          client_email: client.email,
          client_phone: client.phone,
          vendor_name: journey.vendor.business_name,
          vendor_email: journey.vendor.email,
          started_at: new Date().toISOString(),
        },
        metadata: {
          initiated_by: user.id,
          initiated_at: new Date().toISOString(),
          journey_version: journey.version || 1,
        },
      })
      .select()
      .single();

    if (executionError || !execution) {
      console.error('Failed to create execution:', executionError);
      return NextResponse.json(
        { error: 'Failed to create journey execution' },
        { status: 500 },
      );
    }

    // Start execution asynchronously
    const executor = new JourneyExecutor();

    // Execute in background (don't await)
    executor.executeJourney(execution.id).catch((error) => {
      console.error('Journey execution failed:', error);
      // Update execution status to failed
      supabase
        .from('journey_executions')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id)
        .then(() => {
          console.log('Updated failed execution status');
        });
    });

    // Return immediate response
    return NextResponse.json(
      {
        success: true,
        execution: {
          id: execution.id,
          status: execution.status,
          journey_id: journeyId,
          client_id: clientId,
          started_at: execution.created_at,
        },
        message: 'Journey execution started successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Journey execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute journey' },
      { status: 500 },
    );
  }
}

// Get execution status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const { id: journeyId } = params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get execution ID from query params
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      // Return all executions for this journey
      const { data: executions, error } = await supabase
        .from('journey_executions')
        .select(
          `
          *,
          client:clients(first_name, last_name, email),
          step_executions(*)
        `,
        )
        .eq('template_id', journeyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get executions:', error);
        return NextResponse.json(
          { error: 'Failed to get executions' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        executions,
        total: executions?.length || 0,
      });
    }

    // Get specific execution
    const { data: execution, error } = await supabase
      .from('journey_executions')
      .select(
        `
        *,
        client:clients(first_name, last_name, email),
        step_executions(*),
        journey_execution_logs(*)
      `,
      )
      .eq('id', executionId)
      .eq('template_id', journeyId)
      .single();

    if (error || !execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 },
      );
    }

    // Calculate progress
    const totalSteps = execution.step_executions?.length || 0;
    const completedSteps =
      execution.step_executions?.filter((s: any) => s.status === 'completed')
        .length || 0;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return NextResponse.json({
      execution: {
        ...execution,
        progress: Math.round(progress),
      },
    });
  } catch (error) {
    console.error('Get execution error:', error);
    return NextResponse.json(
      { error: 'Failed to get execution status' },
      { status: 500 },
    );
  }
}

// Cancel execution
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const { id: journeyId } = params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get execution ID from query params
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 },
      );
    }

    // Update execution status to cancelled
    const { error } = await supabase
      .from('journey_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        metadata: {
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
        },
      })
      .eq('id', executionId)
      .eq('template_id', journeyId);

    if (error) {
      console.error('Failed to cancel execution:', error);
      return NextResponse.json(
        { error: 'Failed to cancel execution' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Journey execution cancelled',
    });
  } catch (error) {
    console.error('Cancel execution error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 },
    );
  }
}
