import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

// POST track analytics event
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user (optional for view events)
    const { data: user } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      creatorId,
      templateId,
      eventType,
      eventData = {},
      sessionId,
      weddingSeason,
      weddingType,
      referrerCategory,
    } = body;

    // Validate required fields
    if (!creatorId || !templateId || !eventType || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Validate event type
    const validEventTypes = [
      'view',
      'click',
      'purchase',
      'bundle_view',
      'download',
      'preview',
    ];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 },
      );
    }

    // Get IP address and user agent
    const headersList = headers();
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Determine wedding season if not provided
    let season = weddingSeason;
    if (!season) {
      const month = new Date().getMonth();
      if (month >= 2 && month <= 4) season = 'spring';
      else if (month >= 5 && month <= 7) season = 'summer';
      else if (month >= 8 && month <= 10) season = 'fall';
      else season = 'winter';
    }

    // Track the event
    const { error: eventError } = await supabase
      .from('creator_analytics_events')
      .insert({
        creator_id: creatorId,
        template_id: templateId,
        event_type: eventType,
        event_data: eventData,
        user_id: user?.id || null,
        session_id: sessionId,
        wedding_season: season,
        wedding_type: weddingType,
        referrer_category: referrerCategory,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (eventError) {
      console.error('Error tracking event:', eventError);
      return NextResponse.json(
        { error: 'Failed to track event' },
        { status: 500 },
      );
    }

    // Update daily metrics for significant events
    if (['view', 'click', 'purchase'].includes(eventType)) {
      const today = new Date().toISOString().split('T')[0];
      const updates: any = {};

      if (eventType === 'view') {
        updates.template_views = 1;
      } else if (eventType === 'click') {
        updates.template_clicks = 1;
      } else if (eventType === 'purchase') {
        updates.purchases = 1;
        updates.gross_revenue = eventData.revenue || 0;
      }

      // Check if this is a unique visitor
      const { data: existingEvents } = await supabase
        .from('creator_analytics_events')
        .select('id')
        .eq('session_id', sessionId)
        .eq('creator_id', creatorId)
        .limit(2);

      if (existingEvents && existingEvents.length === 1) {
        updates.unique_visitors = 1;
      }

      await supabase.rpc('increment_daily_metrics', {
        p_creator_id: creatorId,
        p_date: today,
        p_updates: updates,
      });
    }

    // Check for A/B test participation
    if (eventType === 'view' || eventType === 'purchase') {
      const { data: activeTest } = await supabase
        .from('creator_ab_tests')
        .select('*')
        .eq('template_id', templateId)
        .eq('status', 'running')
        .single();

      if (activeTest) {
        // Determine if user should see control or test variant
        const isTestVariant = Math.random() < activeTest.traffic_allocation;

        // Update test metrics
        const updateFields: any = {};
        if (eventType === 'view') {
          updateFields[isTestVariant ? 'test_visitors' : 'control_visitors'] =
            activeTest[isTestVariant ? 'test_visitors' : 'control_visitors'] +
            1;
        } else if (eventType === 'purchase') {
          updateFields[
            isTestVariant ? 'test_conversions' : 'control_conversions'
          ] =
            activeTest[
              isTestVariant ? 'test_conversions' : 'control_conversions'
            ] + 1;
        }

        await supabase
          .from('creator_ab_tests')
          .update(updateFields)
          .eq('id', activeTest.id);

        // Return variant information for frontend to apply
        return NextResponse.json({
          success: true,
          abTest: {
            testId: activeTest.id,
            variant: isTestVariant ? 'test' : 'control',
            changes: isTestVariant
              ? activeTest.test_variant
              : activeTest.control_variant,
          },
        });
      }
    }

    // Send real-time update for purchase events
    if (eventType === 'purchase') {
      await supabase.channel(`creator_${creatorId}`).send({
        type: 'broadcast',
        event: 'new_purchase',
        payload: {
          templateId,
          revenue: eventData.revenue || 0,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET analytics events for debugging/monitoring
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('templateId');
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('creator_analytics_events')
      .select(
        `
        *,
        marketplace_templates!inner(id, title)
      `,
      )
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error, count } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      events,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
