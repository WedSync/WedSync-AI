import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  created_at: string;
  started_at?: string;
  ended_at?: string;
  variants: ABTestVariant[];
  metrics: string[];
  target_audience?: any;
  sample_size?: number;
  confidence_level: number;
  statistical_significance?: number;
  winner_variant_id?: string;
  organization_id: string;
}

export interface ABTestVariant {
  id: string;
  test_id: string;
  name: string;
  content: any;
  traffic_percentage: number;
  conversions: number;
  total_exposures: number;
  conversion_rate: number;
  is_control: boolean;
}

export interface CreateABTestRequest {
  name: string;
  description?: string;
  variants: {
    name: string;
    content: any;
    traffic_percentage: number;
    is_control: boolean;
  }[];
  metrics: string[];
  target_audience?: any;
  confidence_level?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });

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

    // Fetch A/B tests for the organization
    const { data: tests, error } = await supabase
      .from('ab_tests')
      .select(
        `
        *,
        variants:ab_test_variants(*),
        results:ab_test_results(*)
      `,
      )
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tests });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });

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

    const body: CreateABTestRequest = await request.json();

    // Validate input
    if (!body.name || !body.variants || body.variants.length < 2) {
      return NextResponse.json(
        { error: 'Test name and at least 2 variants are required' },
        { status: 400 },
      );
    }

    // Validate traffic percentages sum to 100
    const totalTraffic = body.variants.reduce(
      (sum, variant) => sum + variant.traffic_percentage,
      0,
    );
    if (Math.abs(totalTraffic - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Traffic percentages must sum to 100%' },
        { status: 400 },
      );
    }

    // Validate exactly one control variant
    const controlVariants = body.variants.filter((v) => v.is_control);
    if (controlVariants.length !== 1) {
      return NextResponse.json(
        { error: 'Exactly one variant must be marked as control' },
        { status: 400 },
      );
    }

    // Create A/B test
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .insert({
        name: body.name,
        description: body.description,
        status: 'draft',
        metrics: body.metrics,
        target_audience: body.target_audience,
        confidence_level: body.confidence_level || 95,
        organization_id: profile.organization_id,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (testError) {
      return NextResponse.json({ error: testError.message }, { status: 500 });
    }

    // Create variants
    const variants = body.variants.map((variant) => ({
      test_id: test.id,
      name: variant.name,
      content: variant.content,
      traffic_percentage: variant.traffic_percentage,
      is_control: variant.is_control,
      conversions: 0,
      total_exposures: 0,
      conversion_rate: 0,
    }));

    const { data: createdVariants, error: variantsError } = await supabase
      .from('ab_test_variants')
      .insert(variants)
      .select();

    if (variantsError) {
      // Clean up test if variant creation fails
      await supabase.from('ab_tests').delete().eq('id', test.id);
      return NextResponse.json(
        { error: variantsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        test: {
          ...test,
          variants: createdVariants,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
