import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface ActionRequest {
  action: 'start' | 'pause' | 'stop';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = createServerComponentClient({ cookies });
    const testId = id;

    // Get user session
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization ID from user
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 },
      );
    }

    const body: ActionRequest = await request.json();
    const { action } = body;

    if (!['start', 'pause', 'stop'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the test
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Validate state transitions
    const validTransitions: { [key: string]: string[] } = {
      draft: ['start'],
      running: ['pause', 'stop'],
      paused: ['start', 'stop'],
      completed: [],
    };

    if (!validTransitions[test.status]?.includes(action)) {
      return NextResponse.json(
        { error: `Cannot ${action} test in ${test.status} state` },
        { status: 400 },
      );
    }

    // Update test status
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'start':
        updates.status = 'running';
        if (test.status === 'draft') {
          updates.started_at = new Date().toISOString();
        }
        break;
      case 'pause':
        updates.status = 'paused';
        break;
      case 'stop':
        updates.status = 'completed';
        updates.ended_at = new Date().toISOString();

        // Calculate final statistical significance if not already done
        if (!test.statistical_significance) {
          const { data: variants } = await supabase
            .from('ab_test_variants')
            .select('*')
            .eq('test_id', testId);

          if (variants && variants.length >= 2) {
            // Import statistical functions
            const { calculateSignificance } = await import(
              '@/lib/statistics/significance'
            );

            const control = variants.find((v) => v.is_control);
            const variant = variants.find((v) => !v.is_control);

            if (
              control &&
              variant &&
              control.total_exposures > 0 &&
              variant.total_exposures > 0
            ) {
              const result = calculateSignificance(
                {
                  variant: control.name,
                  conversions: control.conversions,
                  total: control.total_exposures,
                  conversionRate: control.conversion_rate,
                },
                {
                  variant: variant.name,
                  conversions: variant.conversions,
                  total: variant.total_exposures,
                  conversionRate: variant.conversion_rate,
                },
                (100 - test.confidence_level) / 100,
              );

              updates.statistical_significance = 1 - result.pValue;
              if (result.isSignificant) {
                const winnerVariant =
                  variant.conversion_rate > control.conversion_rate
                    ? variant
                    : control;
                updates.winner_variant_id = winnerVariant.id;
              }
            }
          }
        }
        break;
    }

    const { data: updatedTest, error: updateError } = await supabase
      .from('ab_tests')
      .update(updates)
      .eq('id', testId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the action for audit trail
    await supabase.from('ab_test_results').insert({
      test_id: testId,
      variant_id: null, // System action, not variant-specific
      client_id: null,
      event_type: 'system_action',
      event_data: {
        action,
        performed_by: session.user.id,
        previous_status: test.status,
        new_status: updates.status,
      },
    });

    return NextResponse.json({
      test: updatedTest,
      message: `Test ${action === 'start' ? 'started' : action === 'pause' ? 'paused' : 'stopped'} successfully`,
    });
  } catch (error) {
    console.error('Error performing test action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
