// WS-129: Floral AI Feedback System
// API endpoint for collecting user feedback on floral recommendations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { floralAIService } from '@/lib/ml/floral-ai-service';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recommendation_id, feedback, details, selected_arrangements } =
      body;

    // Validate required fields
    if (!recommendation_id || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: recommendation_id, feedback' },
        { status: 400 },
      );
    }

    // Validate feedback type
    const validFeedback = ['loved', 'liked', 'neutral', 'disliked', 'rejected'];
    if (!validFeedback.includes(feedback)) {
      return NextResponse.json(
        {
          error:
            'Invalid feedback type. Must be one of: ' +
            validFeedback.join(', '),
        },
        { status: 400 },
      );
    }

    // Process feedback through AI service
    await floralAIService.processFeedback(recommendation_id, feedback, {
      details,
      selected_arrangements,
      feedback_timestamp: new Date().toISOString(),
      user_id: user.id,
    });

    // Also update the database record directly for additional analytics
    const supabase = createClient();
    const { error } = await supabase
      .from('floral_ai_recommendations')
      .update({
        user_feedback: feedback,
        feedback_details: {
          details,
          selected_arrangements,
          feedback_timestamp: new Date().toISOString(),
          user_id: user.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendation_id);

    if (error) {
      console.error('Failed to update feedback in database:', error);
      // Don't fail the request as AI service already processed it
    }

    return NextResponse.json({
      success: true,
      message:
        'Feedback recorded successfully. Thank you for helping us improve!',
    });
  } catch (error) {
    console.error('Floral feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('recommendation_id');

    if (!recommendationId) {
      return NextResponse.json(
        { error: 'recommendation_id parameter is required' },
        { status: 400 },
      );
    }

    // Get feedback for specific recommendation
    const { data: feedback, error } = await supabase
      .from('floral_ai_recommendations')
      .select(
        `
        id,
        user_feedback,
        feedback_details,
        selected_arrangements,
        created_at,
        updated_at
      `,
      )
      .eq('id', recommendationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Floral feedback retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 },
    );
  }
}
