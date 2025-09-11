/**
 * WS-130: AI Shot List Generator API Endpoint
 * Generates comprehensive wedding photography shot lists using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shotListGenerator } from '@/lib/ml/shot-list-generator';
import { z } from 'zod';

const shotListRequestSchema = z.object({
  wedding_details: z.object({
    style: z.enum([
      'traditional',
      'modern',
      'artistic',
      'documentary',
      'photojournalistic',
      'vintage',
      'boho',
    ]),
    venue_type: z.enum([
      'indoor',
      'outdoor',
      'mixed',
      'beach',
      'garden',
      'church',
      'ballroom',
      'rustic',
    ]),
    guest_count: z.number().min(10).max(500),
    duration_hours: z.number().min(4).max(12),
    special_traditions: z.array(z.string()).optional(),
    key_moments: z.array(z.string()).optional(),
    photo_priorities: z.array(z.string()).optional(),
  }),
  preferences: z.object({
    must_have_shots: z.array(z.string()),
    avoid_shots: z.array(z.string()).optional(),
    family_dynamics: z.string().optional(),
    special_requests: z.string().optional(),
  }),
  logistics: z.object({
    prep_time_hours: z.number().min(1).max(8),
    ceremony_type: z.enum(['religious', 'civil', 'outdoor', 'destination']),
    reception_details: z.string().optional(),
    lighting_conditions: z
      .enum(['natural', 'mixed', 'indoor', 'low_light'])
      .optional(),
  }),
});

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

    const body = await request.json();
    const shotListRequest = shotListRequestSchema.parse(body);

    // Generate shot list using AI
    const generatedShotList =
      await shotListGenerator.generateShotList(shotListRequest);

    // Store shot list session in database
    const { data: sessionData, error: sessionError } = await supabase
      .from('shot_list_sessions')
      .insert({
        id: generatedShotList.session_id,
        user_id: user.id,
        wedding_details: shotListRequest.wedding_details,
        preferences: shotListRequest.preferences,
        logistics: shotListRequest.logistics,
        generated_shot_list: generatedShotList,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to store shot list session:', sessionError);
      // Continue anyway - shot list is still returned
    }

    return NextResponse.json({
      success: true,
      shot_list: {
        session_id: generatedShotList.session_id,
        wedding_style: generatedShotList.wedding_style,
        summary: {
          total_shots: generatedShotList.total_shots,
          estimated_duration_hours: Math.round(
            generatedShotList.estimated_duration / 60,
          ),
          categories_count: Object.keys(generatedShotList.categories).length,
        },
        categories: Object.entries(generatedShotList.categories).map(
          ([name, data]) => ({
            name,
            shot_count: data.count,
            estimated_time_minutes: data.estimated_time,
            priority_breakdown: this.getPriorityBreakdown(data.shots),
            sample_shots: data.shots.slice(0, 3).map((shot) => ({
              name: shot.shot_name,
              priority: shot.priority,
              timing: shot.best_timing,
            })),
          }),
        ),
        timeline: generatedShotList.timeline_suggestions,
        equipment_recommendations: generatedShotList.equipment_recommendations,
        lighting_plan: generatedShotList.lighting_plan,
        backup_plans: generatedShotList.backup_plans,
      },
    });
  } catch (error) {
    console.error('Shot list generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Shot list generation failed', message: error.message },
      { status: 500 },
    );
  }
}

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
    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      // Get specific session
      const { data: session, error: sessionError } = await supabase
        .from('shot_list_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Shot list session not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          created_at: session.created_at,
          wedding_details: session.wedding_details,
          shot_list: session.generated_shot_list,
        },
      });
    }

    // Get all sessions for user
    const { data: sessions, error: sessionsError } = await supabase
      .from('shot_list_sessions')
      .select('id, created_at, wedding_details, generated_shot_list')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (sessionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch shot list sessions' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        created_at: session.created_at,
        wedding_style: session.wedding_details.style,
        venue_type: session.wedding_details.venue_type,
        total_shots: session.generated_shot_list.total_shots,
        estimated_duration_hours: Math.round(
          session.generated_shot_list.estimated_duration / 60,
        ),
      })),
    });
  } catch (error) {
    console.error('Fetch shot list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shot list data' },
      { status: 500 },
    );
  }
}

// Helper function to get priority breakdown
function getPriorityBreakdown(shots: any[]): { [priority: string]: number } {
  return shots.reduce((acc, shot) => {
    acc[shot.priority] = (acc[shot.priority] || 0) + 1;
    return acc;
  }, {});
}
