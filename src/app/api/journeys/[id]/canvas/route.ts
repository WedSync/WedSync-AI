import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export interface Journey {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  canvas_data: any;
  canvas_position: { x: number; y: number };
  canvas_zoom: number;
  created_at: string;
  updated_at: string;
}

export interface JourneyNode {
  id: string;
  journey_id: string;
  node_id: string;
  type: string;
  name: string;
  canvas_position: { x: number; y: number };
  config: any;
  timeline_config?: any;
}

export interface JourneyConnection {
  id: string;
  journey_id: string;
  source_node_id: string;
  target_node_id: string;
  connection_type: string;
  condition_config: any;
}

export interface GetJourneyCanvasResponse {
  journey: Journey;
  nodes: JourneyNode[];
  connections: JourneyConnection[];
  executions: {
    active: number;
    completed: number;
    paused: number;
    failed: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const journeyId = params.id;

    // Get journey data
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Get journey nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('journey_nodes')
      .select('*')
      .eq('journey_id', journeyId)
      .order('created_at');

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to fetch journey nodes' },
        { status: 500 },
      );
    }

    // Get journey connections
    const { data: connections, error: connectionsError } = await supabase
      .from('journey_connections')
      .select('*')
      .eq('journey_id', journeyId)
      .order('created_at');

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch journey connections' },
        { status: 500 },
      );
    }

    // Get execution statistics
    const { data: executionStats, error: statsError } = await supabase
      .from('journey_executions')
      .select('status')
      .eq('journey_id', journeyId);

    if (statsError) {
      console.error('Error fetching execution stats:', statsError);
    }

    // Calculate execution statistics
    const executions = {
      active: 0,
      completed: 0,
      paused: 0,
      failed: 0,
    };

    if (executionStats) {
      executionStats.forEach((execution) => {
        executions[execution.status as keyof typeof executions]++;
      });
    }

    const response: GetJourneyCanvasResponse = {
      journey,
      nodes: nodes || [],
      connections: connections || [],
      executions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Canvas GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export interface UpdateJourneyCanvasRequest {
  nodes: JourneyNode[];
  connections: JourneyConnection[];
  canvas_data: {
    zoom: number;
    position: { x: number; y: number };
    viewport?: any;
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const journeyId = params.id;
    const body: UpdateJourneyCanvasRequest = await request.json();

    // Validate journey exists and user has access
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id')
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Use the database function to save canvas state
    const { data: result, error: saveError } = await supabase.rpc(
      'save_journey_canvas',
      {
        p_journey_id: journeyId,
        p_canvas_data: body.canvas_data,
        p_nodes: body.nodes,
        p_connections: body.connections,
      },
    );

    if (saveError) {
      console.error('Error saving canvas:', saveError);
      return NextResponse.json(
        { error: 'Failed to save canvas' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Canvas PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
