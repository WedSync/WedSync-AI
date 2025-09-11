import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET /api/journeys/[id] - Get a specific journey canvas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: canvas, error } = await supabase
      .from('journey_canvases')
      .select(
        `
        *,
        journey_canvas_versions (
          id,
          version_number,
          change_summary,
          created_at
        )
      `,
      )
      .eq('id', id)
      .eq('created_by', session.user.id)
      .single();

    if (error || !canvas) {
      console.error('Failed to fetch canvas:', error);
      return NextResponse.json(
        { error: 'Journey canvas not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(canvas);
  } catch (error) {
    console.error('Journey fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/journeys/[id] - Update a journey canvas
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, canvas_data, canvas_config, status } = body;

    // Build update object dynamically
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (canvas_data !== undefined) updateData.canvas_data = canvas_data;
    if (canvas_config !== undefined) updateData.canvas_config = canvas_config;
    if (status !== undefined) updateData.status = status;

    // Increment version if canvas data changed
    if (canvas_data) {
      const { data: currentCanvas } = await supabase
        .from('journey_canvases')
        .select('version')
        .eq('id', id)
        .eq('created_by', session.user.id)
        .single();

      if (currentCanvas) {
        updateData.version = currentCanvas.version + 1;
      }
    }

    const { data: canvas, error } = await supabase
      .from('journey_canvases')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', session.user.id)
      .select()
      .single();

    if (error || !canvas) {
      console.error('Failed to update canvas:', error);
      return NextResponse.json(
        { error: 'Failed to update journey canvas' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      canvas,
      message: 'Journey canvas updated successfully',
    });
  } catch (error) {
    console.error('Journey update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/journeys/[id] - Delete (archive) a journey canvas
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Archive instead of hard delete
    const { data: canvas, error } = await supabase
      .from('journey_canvases')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('created_by', session.user.id)
      .select()
      .single();

    if (error || !canvas) {
      console.error('Failed to archive canvas:', error);
      return NextResponse.json(
        { error: 'Failed to archive journey canvas' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Journey canvas archived successfully',
    });
  } catch (error) {
    console.error('Journey deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/journeys/[id] - Auto-save canvas data
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { canvas_data } = body;

    if (!canvas_data) {
      return NextResponse.json(
        { error: 'canvas_data is required' },
        { status: 400 },
      );
    }

    // Auto-save without incrementing version
    const { data: canvas, error } = await supabase
      .from('journey_canvases')
      .update({
        canvas_data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', session.user.id)
      .select()
      .single();

    if (error || !canvas) {
      console.error('Failed to auto-save canvas:', error);
      return NextResponse.json(
        { error: 'Failed to auto-save journey canvas' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      canvas,
      message: 'Canvas auto-saved',
    });
  } catch (error) {
    console.error('Journey auto-save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
