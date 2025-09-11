/**
 * Guest Music Requests API
 * Feature ID: WS-128
 * Handles guest song requests for wedding playlists
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { musicAIService } from '@/lib/services/music-ai-service';
import { getServerSession } from 'next-auth';
import type { GuestRequestMusicRequest } from '@/types/music';

// GET /api/music/guest-requests - Get guest requests for playlists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlist_id');
    const status = searchParams.get('status');

    if (!playlistId) {
      return NextResponse.json(
        { error: 'playlist_id is required' },
        { status: 400 },
      );
    }

    // Get user's organization and verify access to playlist
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    const { data: playlist } = await supabase
      .from('music_playlists')
      .select('id, organization_id, created_by, shared_with')
      .eq('id', playlistId)
      .single();

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 },
      );
    }

    // Check access permissions
    const hasAccess =
      playlist.organization_id === userProfile.organization_id &&
      (playlist.created_by === session.user.id ||
        playlist.shared_with?.includes(session.user.id));

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No access to this playlist' },
        { status: 403 },
      );
    }

    // Build query
    let queryBuilder = supabase
      .from('guest_music_requests')
      .select('*')
      .eq('playlist_id', playlistId);

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    queryBuilder = queryBuilder.order('requested_at', { ascending: false });

    const { data: requests, error } = await queryBuilder;

    if (error) {
      console.error('Failed to fetch guest requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch guest requests' },
        { status: 500 },
      );
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Guest requests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/music/guest-requests - Submit a guest music request (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body: GuestRequestMusicRequest & { playlist_id: string } =
      await request.json();
    const {
      playlist_id,
      guest_name,
      guest_email,
      track_title,
      artist_name,
      special_message,
      dedication,
    } = body;

    if (!playlist_id || !guest_name || !track_title || !artist_name) {
      return NextResponse.json(
        {
          error:
            'playlist_id, guest_name, track_title, and artist_name are required',
        },
        { status: 400 },
      );
    }

    // Verify playlist exists and accepts guest requests
    const { data: playlist } = await supabase
      .from('music_playlists')
      .select('id, guest_requests_enabled, organization_id')
      .eq('id', playlist_id)
      .single();

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 },
      );
    }

    if (!playlist.guest_requests_enabled) {
      return NextResponse.json(
        {
          error: 'Guest requests are not enabled for this playlist',
        },
        { status: 403 },
      );
    }

    // Get client IP for tracking
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(/, /)[0]
      : request.headers.get('x-real-ip') || 'unknown';

    // Create guest request
    const { data: guestRequest, error } = await supabase
      .from('guest_music_requests')
      .insert({
        playlist_id,
        guest_name,
        guest_email,
        track_title,
        artist_name,
        special_message,
        dedication,
        ip_address: ip,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create guest request:', error);
      return NextResponse.json(
        { error: 'Failed to submit request' },
        { status: 500 },
      );
    }

    // Try to find matching tracks in the music database
    try {
      const matchResults = await musicAIService.matchGuestRequest(
        track_title,
        artist_name,
        playlist.organization_id,
      );

      // If we found matches, include them in the response for the playlist owner to review
      if (matchResults.exactMatch || matchResults.suggestions.length > 0) {
        return NextResponse.json(
          {
            request: guestRequest,
            matches: matchResults,
            message: 'Request submitted successfully with suggested matches',
          },
          { status: 201 },
        );
      }
    } catch (error) {
      console.warn('Failed to find matching tracks:', error);
    }

    return NextResponse.json(
      {
        request: guestRequest,
        message: 'Request submitted successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Guest request creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/music/guest-requests/[id] - Update guest request status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { status, rejection_reason, add_to_playlist } = body;

    if (!['approved', 'rejected', 'added'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Verify access to the request
    const { data: guestRequest } = await supabase
      .from('guest_music_requests')
      .select(
        `
        *,
        playlist:music_playlists!inner(
          organization_id,
          created_by,
          shared_with
        )
      `,
      )
      .eq('id', requestId)
      .single();

    if (!guestRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess =
      guestRequest.playlist.organization_id === userProfile.organization_id &&
      (guestRequest.playlist.created_by === session.user.id ||
        guestRequest.playlist.shared_with?.includes(session.user.id));

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No access to this request' },
        { status: 403 },
      );
    }

    // Update request
    const { data: updatedRequest, error } = await supabase
      .from('guest_music_requests')
      .update({
        status,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update guest request:', error);
      return NextResponse.json(
        { error: 'Failed to update request' },
        { status: 500 },
      );
    }

    // If approved and add_to_playlist is true, try to add the track
    if (status === 'approved' && add_to_playlist) {
      try {
        const matchResults = await musicAIService.matchGuestRequest(
          guestRequest.track_title,
          guestRequest.artist_name,
          guestRequest.playlist.organization_id,
        );

        if (matchResults.exactMatch) {
          // Get next order index
          const { data: lastTrack } = await supabase
            .from('playlist_tracks')
            .select('order_index')
            .eq('playlist_id', guestRequest.playlist_id)
            .order('order_index', { ascending: false })
            .limit(1)
            .single();

          const nextIndex = (lastTrack?.order_index || 0) + 1;

          // Add track to playlist
          await supabase.from('playlist_tracks').insert({
            playlist_id: guestRequest.playlist_id,
            track_id: matchResults.exactMatch.id,
            order_index: nextIndex,
            user_added: true,
            user_notes: `Guest request from ${guestRequest.guest_name}`,
          });

          // Update request status to 'added'
          await supabase
            .from('guest_music_requests')
            .update({ status: 'added' })
            .eq('id', requestId);
        }
      } catch (error) {
        console.warn('Failed to add track to playlist:', error);
      }
    }

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Guest request update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
