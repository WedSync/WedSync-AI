/**
 * WS-189 Touch Preferences Recommendations API
 * AI-powered touch optimization suggestions based on usage patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Helper function to hash user identifiers
function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex');
}

/**
 * GET /api/touch/preferences/recommendations
 * AI-powered touch optimization suggestions based on usage patterns
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const deviceId = searchParams.get('deviceId');
    const workflowType = searchParams.get('workflowType');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = createClient();
    const hashedUserId = hashUserId(userId);

    // Get user's current preferences
    const { data: preferences } = await supabase
      .from('user_touch_preferences')
      .select('*')
      .eq('hashed_user_id', hashedUserId)
      .eq('device_id', deviceId)
      .single();

    // Get user's touch analytics for pattern analysis
    const { data: analytics } = await supabase
      .from('touch_analytics')
      .select('*')
      .eq('hashed_user_id', hashedUserId)
      .gte(
        'timestamp',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ) // Last 7 days
      .order('timestamp', { ascending: false })
      .limit(1000);

    // Generate AI-powered recommendations
    const recommendations = await generateIntelligentRecommendations(
      preferences,
      analytics,
      workflowType,
    );

    // Get benchmarking data for context
    const benchmarkData = await getBenchmarkData(supabase, workflowType);

    return NextResponse.json({
      success: true,
      recommendations,
      benchmark_context: benchmarkData,
      analysis_period: '7 days',
      data_points: analytics?.length || 0,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 },
    );
  }
}

// Helper Functions

async function generateIntelligentRecommendations(
  preferences: any,
  analytics: any[],
  workflowType?: string,
) {
  const recommendations = [];

  if (!analytics || analytics.length === 0) {
    return recommendations;
  }

  // Performance analysis
  const avgResponseTime =
    analytics.reduce((sum, a) => sum + a.response_time, 0) / analytics.length;
  const successRate =
    analytics.filter((a) => a.success).length / analytics.length;

  // Generate context-aware recommendations
  if (workflowType === 'photo-coordination' && avgResponseTime > 75) {
    recommendations.push({
      type: 'workflow_specific',
      title: 'Optimize for Photo Coordination',
      description:
        'Switch to large touch targets for faster photo confirmations during shoots.',
      priority: 'high',
      implementation: {
        setting: 'touch_target_size',
        value: 'large',
        context: 'photo-coordination',
      },
    });
  }

  if (
    successRate < 0.85 &&
    preferences?.preferences?.visual_feedback === false
  ) {
    recommendations.push({
      type: 'accuracy_improvement',
      title: 'Enable Visual Feedback',
      description:
        'Visual confirmation can improve touch accuracy by up to 20%.',
      priority: 'medium',
      implementation: {
        setting: 'visual_feedback',
        value: true,
      },
    });
  }

  return recommendations;
}

async function getBenchmarkData(supabase: any, workflowType?: string) {
  try {
    let query = supabase.from('touch_performance_benchmarks').select('*');

    if (workflowType) {
      query = query.eq('workflow_type', workflowType);
    }

    const { data: benchmarks } = await query.limit(5);

    return benchmarks || [];
  } catch (error) {
    console.error('Failed to fetch benchmark data:', error);
    return [];
  }
}
