import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const state = searchParams.get('state');
    const journeyId = searchParams.get('journey_id');

    let query = supabase
      .from('journey_instances')
      .select(
        `
        *,
        journey:journeys(name),
        client:clients(name, email),
        current_node:journey_nodes!inner(name)
      `,
      )
      .order('started_at', { ascending: false })
      .limit(limit);

    if (state) {
      query = query.eq('state', state);
    }

    if (journeyId) {
      query = query.eq('journey_id', journeyId);
    }

    const { data: instances, error } = await query;

    if (error) {
      console.error('Error fetching instances:', error);
      return NextResponse.json(
        { error: 'Failed to fetch instances' },
        { status: 500 },
      );
    }

    // Calculate progress for each instance
    const enrichedInstances = await Promise.all(
      (instances || []).map(async (instance) => {
        // Get total steps for the journey
        const { data: journeyNodes } = await supabase
          .from('journey_nodes')
          .select('id')
          .eq('journey_id', instance.journey_id);

        const totalSteps = journeyNodes?.length || 0;
        const currentStep = instance.current_step || 0;
        const progressPercentage =
          totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

        return {
          ...instance,
          journey_name: instance.journey?.name || 'Unknown Journey',
          client_name: instance.client?.name || 'Unknown Client',
          current_node_name: instance.current_node?.name || null,
          total_steps: totalSteps,
          progress_percentage: progressPercentage,
        };
      }),
    );

    return NextResponse.json({
      instances: enrichedInstances,
      total: enrichedInstances.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      journey_id,
      client_id,
      vendor_id,
      variables = {},
      trigger_event,
    } = body;

    // Validate required fields
    if (!journey_id || !client_id || !vendor_id) {
      return NextResponse.json(
        { error: 'Missing required fields: journey_id, client_id, vendor_id' },
        { status: 400 },
      );
    }

    // Check if journey exists and is active
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journey_id)
      .eq('status', 'active')
      .single();

    if (journeyError || !journey) {
      return NextResponse.json(
        { error: 'Journey not found or not active' },
        { status: 404 },
      );
    }

    // Check for existing active instance
    const { data: existingInstance } = await supabase
      .from('journey_instances')
      .select('id')
      .eq('journey_id', journey_id)
      .eq('client_id', client_id)
      .eq('state', 'active')
      .single();

    if (existingInstance) {
      return NextResponse.json(
        { error: 'Client already has an active instance for this journey' },
        { status: 409 },
      );
    }

    // Get the start node
    const { data: startNode, error: nodeError } = await supabase
      .from('journey_nodes')
      .select('*')
      .eq('journey_id', journey_id)
      .eq('type', 'start')
      .single();

    if (nodeError || !startNode) {
      return NextResponse.json(
        { error: 'No start node found in journey' },
        { status: 400 },
      );
    }

    // Create instance
    const { data: instance, error: instanceError } = await supabase
      .from('journey_instances')
      .insert({
        journey_id,
        vendor_id,
        client_id,
        state: 'active',
        current_node_id: startNode.node_id,
        current_step: 0,
        variables,
        entry_source: trigger_event ? 'trigger' : 'manual',
        entry_trigger: trigger_event,
        retry_count: 0,
        max_retries: 3,
        execution_path: [startNode.node_id],
        error_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (instanceError || !instance) {
      console.error('Instance creation error:', instanceError);
      return NextResponse.json(
        { error: 'Failed to create journey instance' },
        { status: 500 },
      );
    }

    // Start execution by triggering the journey executor
    try {
      const { journeyExecutor } = await import('@/lib/journey-engine/executor');

      // Execute the start node immediately
      await journeyExecutor.executeNode(
        instance.id,
        startNode.node_id,
        variables,
      );

      return NextResponse.json(
        {
          instance_id: instance.id,
          message: 'Journey instance created and started successfully',
          status: 'active',
          current_node: startNode.name,
        },
        { status: 201 },
      );
    } catch (executionError) {
      console.error('Execution start error:', executionError);

      // Instance was created but execution failed
      // Mark instance as failed
      await supabase
        .from('journey_instances')
        .update({
          state: 'failed',
          failed_at: new Date().toISOString(),
          last_error:
            executionError instanceof Error
              ? executionError.message
              : 'Unknown execution error',
        })
        .eq('id', instance.id);

      return NextResponse.json(
        {
          instance_id: instance.id,
          message: 'Journey instance created but execution failed',
          error:
            executionError instanceof Error
              ? executionError.message
              : 'Unknown execution error',
        },
        { status: 201 },
      ); // Still return 201 since instance was created
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
