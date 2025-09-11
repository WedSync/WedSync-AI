/**
 * Music Playlists API Routes
 * Feature ID: WS-128
 * Handles playlist creation, management, and track assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { musicAIService } from '@/lib/services/music-ai-service';
import { getServerSession } from 'next-auth';
import type { CreatePlaylistRequest } from '@/types/music';

// GET /api/music/playlists - List user's playlists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const playlistType = searchParams.get('playlist_type');
    const includePublic = searchParams.get('include_public') === 'true';

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

    // Build query
    let queryBuilder = supabase
      .from('music_playlists')
      .select(
        `
        *,
        playlist_tracks(
          id,
          order_index,
          track:music_tracks(
            id,
            title,
            artist,
            duration_seconds,
            mood,
            energy_level
          )
        )
      `,
      )
      .eq('organization_id', userProfile.organization_id);

    // Apply filters
    if (clientId) {
      queryBuilder = queryBuilder.eq('client_id', clientId);
    }

    if (playlistType) {
      queryBuilder = queryBuilder.eq('playlist_type', playlistType);
    }

    if (!includePublic) {
      queryBuilder = queryBuilder.or(
        `created_by.eq.${session.user.id},shared_with.cs.{"${session.user.id}"}}`,
      );
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data: playlists, error } = await queryBuilder;

    if (error) {
      console.error('Failed to fetch playlists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch playlists' },
        { status: 500 },
      );
    }

    return NextResponse.json({ playlists: playlists || [] });
  } catch (error) {
    console.error('Playlists API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/music/playlists - Create new playlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePlaylistRequest = await request.json();
    const {
      name,
      client_id,
      playlist_type,
      wedding_phase,
      auto_generate = false,
      generation_criteria,
    } = body;

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

    // Create playlist
    const { data: playlist, error } = await supabase
      .from('music_playlists')
      .insert({
        organization_id: userProfile.organization_id,
        client_id,
        name,
        playlist_type,
        wedding_phase,
        auto_generate,
        generation_criteria,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create playlist:', error);
      return NextResponse.json(
        { error: 'Failed to create playlist' },
        { status: 500 },
      );
    }

    // If auto-generate is enabled, generate AI recommendations
    if (auto_generate && client_id) {
      try {
        const recommendation = await musicAIService.generateRecommendations({
          client_id,
          recommendation_type: 'new_playlist',
          context: {
            wedding_phase: wedding_phase?.[0],
            ...generation_criteria,
          },
          limit: 20,
        });

        // Add recommended tracks to playlist
        if (recommendation.recommended_tracks.length > 0) {
          const playlistTracks = recommendation.recommended_tracks.map(
            (rec, index) => ({
              playlist_id: playlist.id,
              track_id: rec.track_id,
              order_index: index + 1,
              ai_suggested: true,
              confidence_score: rec.confidence_score,
              suggestion_reason: rec.reason,
            }),
          );

          await supabase.from('playlist_tracks').insert(playlistTracks);
        }
      } catch (error) {
        console.warn(
          'Failed to generate AI recommendations for playlist:',
          error,
        );
      }
    }

    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) {
    console.error('Playlist creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
