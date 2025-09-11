import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const PhotoGroupSchema = z.object({
  couple_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  photo_type: z
    .enum([
      'family',
      'friends',
      'bridal_party',
      'groomsmen',
      'bridesmaids',
      'children',
      'special',
      'formal',
      'candid',
    ])
    .optional(),
  priority: z.number().int().min(0).optional(),
  estimated_time_minutes: z.number().int().min(1).max(120).default(5),
  location: z.string().max(200).optional(),
  timeline_slot: z.string().max(100).optional(),
  photographer_notes: z.string().optional(),
  guest_ids: z.array(z.string().uuid()).optional(),
});

const PhotoGroupAssignmentSchema = z.object({
  photo_group_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  is_primary: z.boolean().default(false),
  position_notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coupleId = searchParams.get('couple_id');

  if (!coupleId) {
    return NextResponse.json(
      { error: 'couple_id is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', coupleId)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('photo_groups')
      .select(
        `
        *,
        assignments:photo_group_assignments(
          id,
          guest_id,
          is_primary,
          position_notes,
          guest:guests(
            id,
            first_name,
            last_name,
            side,
            category
          )
        )
      `,
      )
      .eq('couple_id', coupleId)
      .order('priority');

    if (error) {
      console.error('Error fetching photo groups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photo groups' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Photo groups GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guest_ids, ...photoGroupData } = PhotoGroupSchema.parse(body);

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', photoGroupData.couple_id)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get next priority if not specified
    if (!photoGroupData.priority) {
      const { data: maxPriority } = await supabase
        .from('photo_groups')
        .select('priority')
        .eq('couple_id', photoGroupData.couple_id)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      photoGroupData.priority = (maxPriority?.priority || 0) + 1;
    }

    // Create photo group
    const { data: photoGroup, error: groupError } = await supabase
      .from('photo_groups')
      .insert(photoGroupData)
      .select()
      .single();

    if (groupError) {
      console.error('Error creating photo group:', groupError);
      return NextResponse.json(
        { error: 'Failed to create photo group' },
        { status: 500 },
      );
    }

    // Add guest assignments if provided
    if (guest_ids && guest_ids.length > 0) {
      const assignments = guest_ids.map((guest_id) => ({
        photo_group_id: photoGroup.id,
        guest_id,
        is_primary: false,
      }));

      const { error: assignmentError } = await supabase
        .from('photo_group_assignments')
        .insert(assignments);

      if (assignmentError) {
        console.error('Error creating guest assignments:', assignmentError);
        // Don't fail the request, but log the error
      }
    }

    // Fetch the complete photo group with assignments
    const { data: completeGroup } = await supabase
      .from('photo_groups')
      .select(
        `
        *,
        assignments:photo_group_assignments(
          id,
          guest_id,
          is_primary,
          position_notes,
          guest:guests(
            id,
            first_name,
            last_name,
            side,
            category
          )
        )
      `,
      )
      .eq('id', photoGroup.id)
      .single();

    return NextResponse.json(completeGroup, { status: 201 });
  } catch (error) {
    console.error('Photo groups POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Photo group ID is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guest_ids, ...updates } = PhotoGroupSchema.partial().parse(body);

    // Verify user has access to this photo group
    const { data: photoGroup } = await supabase
      .from('photo_groups')
      .select(
        `
        id,
        couple_id,
        clients!inner(
          user_profiles!inner(user_id)
        )
      `,
      )
      .eq('id', id)
      .eq('clients.user_profiles.user_id', user.id)
      .single();

    if (!photoGroup) {
      return NextResponse.json(
        { error: 'Photo group not found or access denied' },
        { status: 403 },
      );
    }

    // Update photo group
    const { data: updatedGroup, error: updateError } = await supabase
      .from('photo_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating photo group:', updateError);
      return NextResponse.json(
        { error: 'Failed to update photo group' },
        { status: 500 },
      );
    }

    // Update guest assignments if provided
    if (guest_ids !== undefined) {
      // Delete existing assignments
      await supabase
        .from('photo_group_assignments')
        .delete()
        .eq('photo_group_id', id);

      // Add new assignments
      if (guest_ids.length > 0) {
        const assignments = guest_ids.map((guest_id: string) => ({
          photo_group_id: id,
          guest_id,
          is_primary: false,
        }));

        const { error: assignmentError } = await supabase
          .from('photo_group_assignments')
          .insert(assignments);

        if (assignmentError) {
          console.error('Error updating guest assignments:', assignmentError);
        }
      }
    }

    // Fetch the complete updated photo group
    const { data: completeGroup } = await supabase
      .from('photo_groups')
      .select(
        `
        *,
        assignments:photo_group_assignments(
          id,
          guest_id,
          is_primary,
          position_notes,
          guest:guests(
            id,
            first_name,
            last_name,
            side,
            category
          )
        )
      `,
      )
      .eq('id', id)
      .single();

    return NextResponse.json(completeGroup);
  } catch (error) {
    console.error('Photo groups PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Photo group ID is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this photo group
    const { data: photoGroup } = await supabase
      .from('photo_groups')
      .select(
        `
        id,
        couple_id,
        clients!inner(
          user_profiles!inner(user_id)
        )
      `,
      )
      .eq('id', id)
      .eq('clients.user_profiles.user_id', user.id)
      .single();

    if (!photoGroup) {
      return NextResponse.json(
        { error: 'Photo group not found or access denied' },
        { status: 403 },
      );
    }

    const { error } = await supabase.from('photo_groups').delete().eq('id', id);

    if (error) {
      console.error('Error deleting photo group:', error);
      return NextResponse.json(
        { error: 'Failed to delete photo group' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo groups DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Update priorities endpoint
export async function PATCH(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'reorder') {
    try {
      const supabase = await createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { group_orders } = z
        .object({
          group_orders: z.array(
            z.object({
              id: z.string().uuid(),
              priority: z.number().int().min(1),
            }),
          ),
        })
        .parse(body);

      // Update priorities in batch
      const updates = group_orders.map(({ id, priority }) =>
        supabase
          .from('photo_groups')
          .update({
            priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id),
      );

      await Promise.all(updates);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Photo groups PATCH error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid data', details: error.errors },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
