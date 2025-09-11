import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const voteSchema = z.object({
  vote_type: z.enum(['upvote', 'downvote', 'neutral']).optional(),
  remove_vote: z.boolean().default(false),
});

// Helper function to calculate vote weight based on user expertise
function calculateVoteWeight(user: any, featureRequest: any): number {
  let weight = 1.0;

  // Base weight by user type
  switch (user.user_type) {
    case 'wedding_supplier':
      weight = 1.5; // Industry professionals get higher weight
      break;
    case 'admin':
    case 'product_team':
      weight = 2.0; // Team members get highest weight
      break;
    case 'couple':
      weight = 1.0; // Standard weight
      break;
    default:
      weight = 0.5; // Guest users get lower weight
  }

  // Boost weight if user has relevant experience
  if (user.wedding_experience && featureRequest.category) {
    const hasRelevantExperience =
      user.wedding_experience[featureRequest.category] === true;
    if (hasRelevantExperience) {
      weight *= 1.2;
    }
  }

  return Math.min(3.0, weight); // Cap at 3x
}

// Helper function to calculate wedding context match
function calculateWeddingContextMatch(
  userContext: any,
  requestContext: any,
): number {
  if (!userContext || !requestContext) return 0.5;

  let matchScore = 0.0;
  let factors = 0;

  // Wedding size match
  if (userContext.wedding_size === requestContext.wedding_size) {
    matchScore += 0.3;
  }
  factors++;

  // Timeframe match
  if (userContext.timeframe === requestContext.timeframe) {
    matchScore += 0.3;
  }
  factors++;

  // Pain points overlap
  const userPainPoints = userContext.pain_points || [];
  const requestPainPoints = requestContext.pain_points || [];
  const commonPainPoints = userPainPoints.filter((point: string) =>
    requestPainPoints.includes(point),
  );

  if (commonPainPoints.length > 0) {
    matchScore +=
      (commonPainPoints.length /
        Math.max(userPainPoints.length, requestPainPoints.length)) *
      0.4;
  }
  factors++;

  return Math.min(1.0, matchScore / factors);
}

// PUT - Vote on feature request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: requestId } = params;
    const body = await request.json();
    const { vote_type, remove_vote } = voteSchema.parse(body);

    // Get authenticated user
    const user = await auth.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID format' },
        { status: 400 },
      );
    }

    // Get feature request for context matching
    const { data: featureRequest, error: fetchError } = await supabase
      .from('feature_requests')
      .select('wedding_context, user_type, category')
      .eq('id', requestId)
      .single();

    if (fetchError || !featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 },
      );
    }

    // Calculate vote weight and context match
    const voteWeight = calculateVoteWeight(user, featureRequest);
    const contextMatch = calculateWeddingContextMatch(
      user.wedding_context,
      featureRequest.wedding_context,
    );

    if (remove_vote) {
      // Remove existing vote
      const { error: deleteError } = await supabase
        .from('feature_request_votes')
        .delete()
        .eq('feature_request_id', requestId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error removing vote:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 },
        );
      }
    } else {
      if (!vote_type) {
        return NextResponse.json(
          { error: 'Vote type is required when not removing vote' },
          { status: 400 },
        );
      }

      // Upsert vote with wedding context weighting
      const { error: upsertError } = await supabase
        .from('feature_request_votes')
        .upsert({
          feature_request_id: requestId,
          user_id: user.id,
          vote_type,
          vote_weight: voteWeight,
          wedding_context_match: contextMatch,
        });

      if (upsertError) {
        console.error('Error upserting vote:', upsertError);
        return NextResponse.json(
          { error: 'Failed to record vote' },
          { status: 500 },
        );
      }
    }

    // Recalculate weighted vote count
    const { data: voteStats, error: voteStatsError } = await supabase
      .from('feature_request_votes')
      .select('vote_weight, vote_type')
      .eq('feature_request_id', requestId);

    if (voteStatsError) {
      console.error('Error fetching vote stats:', voteStatsError);
      return NextResponse.json(
        { error: 'Failed to calculate vote count' },
        { status: 500 },
      );
    }

    // Calculate weighted vote count
    const weightedVoteCount =
      voteStats?.reduce((sum, vote) => {
        const multiplier =
          vote.vote_type === 'upvote'
            ? 1
            : vote.vote_type === 'downvote'
              ? -0.5
              : 0;
        return sum + vote.vote_weight * multiplier;
      }, 0) || 0;

    // Update feature request vote count
    const { error: updateError } = await supabase
      .from('feature_requests')
      .update({
        vote_count: Math.max(0, Math.round(weightedVoteCount)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating vote count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update vote count' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      new_vote_count: Math.max(0, Math.round(weightedVoteCount)),
      vote_weight: voteWeight,
      context_match: contextMatch,
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid vote data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 },
    );
  }
}

// GET - Get vote status for current user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: requestId } = params;

    // Get authenticated user
    const user = await auth.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's vote for this request
    const { data: userVote, error } = await supabase
      .from('feature_request_votes')
      .select('vote_type, vote_weight, wedding_context_match, created_at')
      .eq('feature_request_id', requestId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user vote:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vote status' },
        { status: 500 },
      );
    }

    // Get overall vote statistics
    const { data: voteStats, error: statsError } = await supabase
      .from('feature_request_votes')
      .select('vote_type, vote_weight')
      .eq('feature_request_id', requestId);

    if (statsError) {
      console.error('Error fetching vote statistics:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch vote statistics' },
        { status: 500 },
      );
    }

    // Calculate vote breakdown
    const breakdown = voteStats?.reduce(
      (acc, vote) => {
        acc[vote.vote_type] = (acc[vote.vote_type] || 0) + vote.vote_weight;
        return acc;
      },
      { upvote: 0, downvote: 0, neutral: 0 },
    ) || { upvote: 0, downvote: 0, neutral: 0 };

    return NextResponse.json({
      user_vote: userVote,
      vote_breakdown: breakdown,
      total_weighted_votes: Object.values(breakdown).reduce(
        (sum: number, count: number) => sum + count,
        0,
      ),
    });
  } catch (error) {
    console.error('Error fetching vote status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote status' },
      { status: 500 },
    );
  }
}
