/**
 * Music API Routes - Main music system API endpoints
 * Feature ID: WS-128
 * Handles music tracks, playlists, and AI recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { musicAIService } from '@/lib/services/music-ai-service';
import { getServerSession } from 'next-auth';
import type { MusicSearchRequest } from '@/types/music';

// GET /api/music - Search and list music tracks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const genre = searchParams.get('genre');
    const mood = searchParams.get('mood');
    const energyMin = searchParams.get('energy_min');
    const energyMax = searchParams.get('energy_max');
    const weddingPhase = searchParams.get('wedding_phase');
    const explicitAllowed = searchParams.get('explicit_allowed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

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
      .from('music_tracks')
      .select(
        `
        *,
        playlist_tracks!inner(count)
      `,
      )
      .eq('organization_id', userProfile.organization_id);

    // Apply filters
    if (query) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,artist.ilike.%${query}%`,
      );
    }

    if (genre) {
      queryBuilder = queryBuilder.eq('primary_genre', genre);
    }

    if (mood) {
      queryBuilder = queryBuilder.eq('mood', mood);
    }

    if (energyMin) {
      queryBuilder = queryBuilder.gte('energy_level', parseInt(energyMin));
    }

    if (energyMax) {
      queryBuilder = queryBuilder.lte('energy_level', parseInt(energyMax));
    }

    if (weddingPhase) {
      switch (weddingPhase) {
        case 'ceremony':
          queryBuilder = queryBuilder.eq('ceremony_suitable', true);
          break;
        case 'reception':
          queryBuilder = queryBuilder.eq('reception_suitable', true);
          break;
        case 'cocktails':
          queryBuilder = queryBuilder.eq('cocktail_suitable', true);
          break;
        case 'dinner':
          queryBuilder = queryBuilder.eq('dinner_suitable', true);
          break;
      }
    }

    if (!explicitAllowed) {
      queryBuilder = queryBuilder.eq('explicit_content', false);
    }

    queryBuilder = queryBuilder
      .order('popularity_score', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tracks, error } = await queryBuilder;

    if (error) {
      console.error('Failed to fetch music tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tracks: tracks || [],
      pagination: {
        limit,
        offset,
        hasMore: tracks?.length === limit,
      },
    });
  } catch (error) {
    console.error('Music API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/music - Add new music track
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      artist,
      album,
      duration_seconds,
      primary_genre,
      mood,
      energy_level,
      spotify_id,
      apple_music_id,
      youtube_id,
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

    // Analyze track with AI if we have enough information
    let aiAnalysis = {};
    if (title && artist) {
      try {
        const analysis = await musicAIService.analyzeTrack({
          trackTitle: title,
          artist: artist,
        });

        aiAnalysis = {
          emotion_tags: analysis.emotion_tags,
          recommended_moments: analysis.recommended_moments,
          wedding_appropriateness: analysis.wedding_appropriateness,
        };
      } catch (error) {
        console.warn(
          'AI analysis failed, continuing with manual entry:',
          error,
        );
      }
    }

    // Insert track
    const { data: track, error } = await supabase
      .from('music_tracks')
      .insert({
        organization_id: userProfile.organization_id,
        title,
        artist,
        album,
        duration_seconds,
        primary_genre,
        mood,
        energy_level,
        spotify_id,
        apple_music_id,
        youtube_id,
        ai_analysis: aiAnalysis,
        is_verified: true,
        verified_by: session.user.id,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create music track:', error);
      return NextResponse.json(
        { error: 'Failed to create track' },
        { status: 500 },
      );
    }

    return NextResponse.json({ track }, { status: 201 });
  } catch (error) {
    console.error('Music creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
