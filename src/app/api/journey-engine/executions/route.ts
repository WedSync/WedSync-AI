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
    const status = searchParams.get('status');
    const instanceId = searchParams.get('instance_id');
    const journeyId = searchParams.get('journey_id');

    let query = supabase
      .from('journey_node_executions')
      .select(
        `
        *,
        instance:journey_instances(
          id,
          journey_id,
          client_id,
          journey:journeys(name),
          client:clients(name)
        ),
        node:journey_nodes(name, type)
      `,
      )
      .order('started_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (instanceId) {
      query = query.eq('instance_id', instanceId);
    }

    if (journeyId) {
      query = query.eq('journey_id', journeyId);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('Error fetching executions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch executions' },
        { status: 500 },
      );
    }

    // Enrich execution data
    const enrichedExecutions = (executions || []).map((execution) => ({
      ...execution,
      journey_name: execution.instance?.journey?.name || 'Unknown Journey',
      client_name: execution.instance?.client?.name || 'Unknown Client',
      node_name: execution.node?.name || 'Unknown Node',
      node_type: execution.node?.type || 'unknown',
    }));

    return NextResponse.json({
      executions: enrichedExecutions,
      total: enrichedExecutions.length,
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
      instance_id,
      journey_id,
      node_id,
      status = 'pending',
      input_data,
      started_at,
    } = body;

    // Validate required fields
    if (!instance_id || !journey_id || !node_id) {
      return NextResponse.json(
        { error: 'Missing required fields: instance_id, journey_id, node_id' },
        { status: 400 },
      );
    }

    // Create execution record
    const { data: execution, error } = await supabase
      .from('journey_node_executions')
      .insert({
        instance_id,
        journey_id,
        node_id,
        status,
        input_data,
        started_at: started_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating execution:', error);
      return NextResponse.json(
        { error: 'Failed to create execution record' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        execution_id: execution.id,
        message: 'Execution record created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
