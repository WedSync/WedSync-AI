import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ConversionOptimizer } from '@/lib/services/conversion-optimizer';

/**
 * GET /api/viral/ab-tests/[testId]/results
 * Get detailed results for a specific A/B test
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const testId = params.testId;

    // Verify test ownership
    const { data: test, error: testError } = await supabase
      .from('viral_ab_tests')
      .select('*')
      .eq('id', testId)
      .eq('created_by', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'A/B test not found', code: 'TEST_NOT_FOUND' },
        { status: 404 },
      );
    }

    const optimizer = new ConversionOptimizer(supabase);
    const results = await optimizer.getConversionTestResults(testId);

    // Calculate summary statistics
    const totalInvitations = results.reduce(
      (sum, r) => sum + r.total_invitations,
      0,
    );
    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);
    const overallConversionRate =
      totalInvitations > 0 ? (totalConversions / totalInvitations) * 100 : 0;

    // Find best performing variant
    const bestVariant = results.reduce(
      (best, current) =>
        current.conversion_rate > (best?.conversion_rate || 0) ? current : best,
      null,
    );

    // Calculate confidence levels
    const hasStatisticalSignificance = results.some(
      (r) => r.statistical_significance,
    );
    const recommendedAction = this.generateTestRecommendation(
      test,
      results,
      hasStatisticalSignificance,
    );

    return NextResponse.json({
      success: true,
      data: {
        test: {
          id: test.id,
          name: test.name,
          test_type: test.test_type,
          status: test.status,
          start_date: test.start_date,
          end_date: test.end_date,
          target_metrics: test.target_metrics,
          minimum_sample_size: test.minimum_sample_size,
          confidence_level: test.confidence_level,
        },
        results: {
          variant_results: results,
          summary: {
            total_invitations: totalInvitations,
            total_conversions: totalConversions,
            overall_conversion_rate: overallConversionRate,
            has_statistical_significance: hasStatisticalSignificance,
            sample_size_reached: totalInvitations >= test.minimum_sample_size,
            test_duration_days: test.start_date
              ? Math.ceil(
                  (new Date().getTime() - new Date(test.start_date).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0,
          },
          best_variant: bestVariant,
          recommendation: recommendedAction,
        },
      },
      metadata: {
        generated_at: new Date().toISOString(),
        test_id: testId,
        user_id: user.id,
      },
    });
  } catch (error) {
    console.error('Get A/B test results error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve test results',
        code: 'RESULTS_ERROR',
      },
      { status: 500 },
    );
  }
}

// Helper function to generate recommendations
function generateTestRecommendation(
  test: any,
  results: any[],
  hasSignificance: boolean,
): {
  action: 'continue' | 'conclude' | 'stop' | 'extend';
  reason: string;
  next_steps: string[];
} {
  const totalInvitations = results.reduce(
    (sum, r) => sum + r.total_invitations,
    0,
  );
  const bestVariant = results.reduce(
    (best, current) =>
      current.conversion_rate > (best?.conversion_rate || 0) ? current : best,
    null,
  );

  // If minimum sample size not reached
  if (totalInvitations < test.minimum_sample_size) {
    return {
      action: 'continue',
      reason: `Test needs ${test.minimum_sample_size - totalInvitations} more invitations to reach minimum sample size.`,
      next_steps: [
        'Continue running the test',
        'Monitor daily traffic allocation',
        'Check back when sample size is reached',
      ],
    };
  }

  // If has statistical significance
  if (hasSignificance && bestVariant) {
    const improvement = bestVariant.improvement_over_control;

    if (improvement > 10) {
      return {
        action: 'conclude',
        reason: `Variant "${bestVariant.variant_id}" shows significant ${improvement.toFixed(1)}% improvement over control.`,
        next_steps: [
          'Implement winning variant for all users',
          'Document learnings for future tests',
          'Plan follow-up optimization tests',
        ],
      };
    } else if (improvement > 5) {
      return {
        action: 'extend',
        reason: `Modest ${improvement.toFixed(1)}% improvement detected. Extend test for higher confidence.`,
        next_steps: [
          'Run test for 1-2 more weeks',
          'Increase sample size if possible',
          'Consider segmented analysis',
        ],
      };
    }
  }

  // Default recommendation
  const testDuration = test.start_date
    ? Math.ceil(
        (new Date().getTime() - new Date(test.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  if (testDuration > 30) {
    return {
      action: 'stop',
      reason: 'Test has run for over 30 days without conclusive results.',
      next_steps: [
        'Analyze why no clear winner emerged',
        'Consider testing more dramatic differences',
        'Review test design and targeting',
      ],
    };
  }

  return {
    action: 'continue',
    reason: 'Test is running normally. Monitor for statistical significance.',
    next_steps: [
      'Continue monitoring results',
      'Check weekly for significance',
      'Ensure balanced traffic allocation',
    ],
  };
}
