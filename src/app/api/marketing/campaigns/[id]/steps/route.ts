import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and verify campaign access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify campaign belongs to user's organization
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 },
      );
    }

    const { data: steps, error } = await supabase
      .from('marketing_campaign_steps')
      .select(
        `
        *,
        true_next_step:marketing_campaign_steps!true_next_step_id(*),
        false_next_step:marketing_campaign_steps!false_next_step_id(*)
      `,
      )
      .eq('campaign_id', params.id)
      .order('step_order');

    if (error) {
      console.error('Error fetching campaign steps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaign steps' },
        { status: 500 },
      );
    }

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and verify campaign access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify campaign belongs to user's organization
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 },
      );
    }

    // Prevent modification of active campaigns
    if (campaign.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot modify steps of active campaign' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      step_name,
      step_type,
      step_order,
      config = {},
      template_id,
      conditions,
      true_next_step_id,
      false_next_step_id,
    } = body;

    // Validate required fields
    if (!step_name || !step_type || step_order === undefined) {
      return NextResponse.json(
        { error: 'Step name, type, and order are required' },
        { status: 400 },
      );
    }

    // Validate step type
    const validTypes = [
      'email',
      'sms',
      'delay',
      'condition',
      'webhook',
      'update_profile',
    ];
    if (!validTypes.includes(step_type)) {
      return NextResponse.json({ error: 'Invalid step type' }, { status: 400 });
    }

    // Get current max step order for auto-positioning
    const { data: maxOrderStep } = await supabase
      .from('marketing_campaign_steps')
      .select('step_order')
      .eq('campaign_id', params.id)
      .order('step_order', { ascending: false })
      .limit(1)
      .single();

    const finalStepOrder =
      step_order !== undefined
        ? step_order
        : (maxOrderStep?.step_order || 0) + 1;

    const { data: step, error } = await supabase
      .from('marketing_campaign_steps')
      .insert({
        campaign_id: params.id,
        step_name,
        step_type,
        step_order: finalStepOrder,
        config,
        template_id,
        conditions,
        true_next_step_id,
        false_next_step_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign step:', error);
      return NextResponse.json(
        { error: 'Failed to create campaign step' },
        { status: 500 },
      );
    }

    return NextResponse.json({ step }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { steps } = body;

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'Steps array is required' },
        { status: 400 },
      );
    }

    // Get user's organization and verify campaign access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify campaign belongs to user's organization
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 },
      );
    }

    // Prevent modification of active campaigns
    if (campaign.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot modify steps of active campaign' },
        { status: 400 },
      );
    }

    // Update steps in transaction
    const updatePromises = steps
      .map((step: any) => {
        if (!step.id) {
          return null; // Skip steps without IDs
        }

        const updateData: any = {};
        if (step.step_name !== undefined) updateData.step_name = step.step_name;
        if (step.step_order !== undefined)
          updateData.step_order = step.step_order;
        if (step.config !== undefined) updateData.config = step.config;
        if (step.template_id !== undefined)
          updateData.template_id = step.template_id;
        if (step.conditions !== undefined)
          updateData.conditions = step.conditions;
        if (step.true_next_step_id !== undefined)
          updateData.true_next_step_id = step.true_next_step_id;
        if (step.false_next_step_id !== undefined)
          updateData.false_next_step_id = step.false_next_step_id;

        return supabase
          .from('marketing_campaign_steps')
          .update(updateData)
          .eq('id', step.id)
          .eq('campaign_id', params.id)
          .select()
          .single();
      })
      .filter(Boolean);

    const results = await Promise.allSettled(updatePromises);

    const updatedSteps: any[] = [];
    const errors: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data) {
        updatedSteps.push(result.value.data);
      } else if (result.status === 'rejected') {
        errors.push(`Step ${index}: ${result.reason}`);
      }
    });

    if (errors.length > 0) {
      console.error('Error updating some steps:', errors);
    }

    return NextResponse.json({
      updatedSteps,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
