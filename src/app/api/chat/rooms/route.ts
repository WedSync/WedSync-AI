import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateRoomRequest } from '@/types/chat';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomType = searchParams.get('room_type');
    const weddingId = searchParams.get('wedding_id');
    const isArchived = searchParams.get('is_archived') === 'true';

    let query = supabase
      .from('chat_rooms')
      .select(
        `
        *,
        participants:chat_room_participants!inner(
          *,
          user:user_id(*),
          supplier:supplier_id(*)
        ),
        last_message:chat_messages(*)
      `,
      )
      .eq('participants.user_id', user.id)
      .eq('participants.status', 'active')
      .order('last_message_at', { ascending: false });

    if (roomType) {
      query = query.eq('room_type', roomType);
    }
    if (weddingId) {
      query = query.eq('wedding_id', weddingId);
    }
    query = query.eq('is_archived', isArchived);

    const { data: rooms, error } = await query;

    if (error) {
      console.error('Error fetching rooms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rooms' },
        { status: 500 },
      );
    }

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateRoomRequest = await request.json();

    // Validate required fields
    if (!body.room_name || !body.room_type) {
      return NextResponse.json(
        { error: 'Missing required fields: room_name, room_type' },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 },
      );
    }

    // Create vendor coordination room if vendor IDs provided
    if (body.room_type === 'vendor_coordination' && body.vendor_ids?.length) {
      const { data: roomId, error: funcError } = await supabase.rpc(
        'create_vendor_coordination_room',
        {
          p_organization_id: profile.organization_id,
          p_wedding_id: body.wedding_id,
          p_client_id: body.client_id,
          p_room_name: body.room_name,
          p_vendor_ids: body.vendor_ids,
        },
      );

      if (funcError) {
        console.error('Error creating vendor coordination room:', funcError);
        return NextResponse.json(
          { error: 'Failed to create room' },
          { status: 500 },
        );
      }

      // Fetch the created room
      const { data: room, error: fetchError } = await supabase
        .from('chat_rooms')
        .select(
          `
          *,
          participants:chat_room_participants(
            *,
            user:user_id(*),
            supplier:supplier_id(*)
          )
        `,
        )
        .eq('id', roomId)
        .single();

      if (fetchError) {
        console.error('Error fetching created room:', fetchError);
        return NextResponse.json(
          { error: 'Room created but failed to fetch details' },
          { status: 500 },
        );
      }

      return NextResponse.json({ room }, { status: 201 });
    }

    // Create standard room
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({
        room_name: body.room_name,
        room_type: body.room_type,
        description: body.description,
        wedding_id: body.wedding_id,
        client_id: body.client_id,
        tags: body.tags,
        category: body.category,
        created_by: user.id,
        organization_id: profile.organization_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      return NextResponse.json(
        { error: 'Failed to create room' },
        { status: 500 },
      );
    }

    // Add creator as admin participant
    await supabase.from('chat_room_participants').insert({
      room_id: room.id,
      user_id: user.id,
      participant_type: 'planner',
      is_admin: true,
      is_moderator: true,
      can_add_participants: true,
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
