import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';
import { isValidUUID } from '@/lib/security/input-validation';
import { rbacSystem, PERMISSIONS } from '@/lib/security/rbac-system';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for activity operations
const activityRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await activityRateLimit.check(100, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate client ID format
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions using RBAC system
    const hasPermission = await rbacSystem.hasPermission(
      user.id,
      PERMISSIONS.WEDDING_VIEW,
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Get query parameters for pagination and filtering
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50'),
      100,
    );
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const activityType = url.searchParams.get('activity_type');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    // Build query with filters
    let query = supabase
      .from('client_activities')
      .select(
        `
        id,
        activity_type,
        activity_title,
        activity_description,
        performed_by,
        performed_by_name,
        created_at,
        metadata
      `,
      )
      .eq('client_id', params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: activities, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('client_activities')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', params.id);

    if (activityType) {
      countQuery = countQuery.eq('activity_type', activityType);
    }

    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      data: activities,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error fetching client activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await activityRateLimit.check(20, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate client ID format
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await rbacSystem.hasPermission(
      user.id,
      PERMISSIONS.WEDDING_EDIT,
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.activity_type || !body.activity_title) {
      return NextResponse.json(
        { error: 'Missing required fields: activity_type, activity_title' },
        { status: 400 },
      );
    }

    // Get user profile for name
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, organization_id')
      .eq('user_id', user.id)
      .single();

    const userName = userProfile
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      : user.email || 'Unknown User';

    // Create activity record
    const { data: activity, error } = await supabase
      .from('client_activities')
      .insert({
        client_id: params.id,
        organization_id: userProfile?.organization_id,
        activity_type: body.activity_type,
        activity_title: body.activity_title,
        activity_description: body.activity_description || null,
        performed_by: user.id,
        performed_by_name: userName,
        metadata: body.metadata || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Broadcast real-time update using Team E's notification system
    await supabase.channel(`client_activities:${params.id}`).send({
      type: 'broadcast',
      event: 'activity_added',
      payload: activity,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating client activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 },
    );
  }
}
