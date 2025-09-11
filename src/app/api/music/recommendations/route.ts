/**
 * Music AI Recommendations API
 * Feature ID: WS-128
 * Handles AI-powered music recommendations and preference learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { musicAIService } from '@/lib/services/music-ai-service';
import { getServerSession } from 'next-auth';
import type { GenerateMusicRecommendationsRequest } from '@/types/music';

// GET /api/music/recommendations - Get existing recommendations for a client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const recommendationType = searchParams.get('recommendation_type');

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 },
      );
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

    // Build query
    let queryBuilder = supabase
      .from('music_recommendations')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString());

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    if (recommendationType) {
      queryBuilder = queryBuilder.eq('recommendation_type', recommendationType);
    }

    queryBuilder = queryBuilder.order('generated_at', { ascending: false });

    const { data: recommendations, error } = await queryBuilder;

    if (error) {
      console.error('Failed to fetch recommendations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: 500 },
      );
    }

    return NextResponse.json({ recommendations: recommendations || [] });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/music/recommendations - Generate new AI recommendations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateMusicRecommendationsRequest = await request.json();
    const { client_id, recommendation_type, context, preferences, limit } =
      body;

    if (!client_id || !recommendation_type) {
      return NextResponse.json(
        { error: 'client_id and recommendation_type are required' },
        { status: 400 },
      );
    }

    // Verify user has access to this client
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

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or no access' },
        { status: 404 },
      );
    }

    // Generate AI recommendations
    const recommendation = await musicAIService.generateRecommendations({
      client_id,
      recommendation_type,
      context: context || {},
      preferences,
      limit: limit || 10,
    });

    return NextResponse.json(
      {
        recommendation,
        message: `Generated ${recommendation.recommended_tracks.length} recommendations with ${Math.round(recommendation.confidence_score * 100)}% confidence`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Recommendation generation error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate recommendations',
      },
      { status: 500 },
    );
  }
}

// PATCH /api/music/recommendations/[id] - Update recommendation status/feedback
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('id');

    if (!recommendationId) {
      return NextResponse.json(
        { error: 'Recommendation ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { status, feedback_score, feedback_notes } = body;

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

    // Update recommendation
    const { data: recommendation, error } = await supabase
      .from('music_recommendations')
      .update({
        status: status || 'viewed',
        feedback_score,
        feedback_notes,
      })
      .eq('id', recommendationId)
      .eq('organization_id', userProfile.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update recommendation:', error);
      return NextResponse.json(
        { error: 'Failed to update recommendation' },
        { status: 500 },
      );
    }

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Recommendation update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
