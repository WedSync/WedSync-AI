import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

// Update timeline schema (all fields optional for partial updates)
const updateTimelineSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Timeline name is required')
      .max(255, 'Timeline name too long')
      .optional(),
    wedding_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .refine((dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date >= now;
      }, 'Wedding date cannot be in the past')
      .optional(),
    timezone: z.string().max(50).optional(),
    start_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
      .optional(),
    end_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
      .optional(),
    buffer_time_minutes: z.number().min(0).max(60).optional(),
    allow_vendor_edits: z.boolean().optional(),
    require_approval: z.boolean().optional(),
    status: z.enum(['draft', 'review', 'approved', 'final']).optional(),
  })
  .refine((data) => {
    // Validate start_time is before end_time if both are provided
    if (data.start_time && data.end_time) {
      const startTime = new Date(`2000-01-01 ${data.start_time}`);
      const endTime = new Date(`2000-01-01 ${data.end_time}`);
      return startTime < endTime;
    }
    return true;
  }, 'Start time must be before end time');

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function verifyTimelineAccess(
  supabase: any,
  timelineId: string,
  userId: string,
  requireEdit: boolean = false,
) {
  // Get user's organization
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile?.organization_id) {
    throw new Error('UNAUTHORIZED: User organization not found');
  }

  // Check if timeline exists and user has access
  const { data: timeline, error: timelineError } = await supabase
    .from('wedding_timelines')
    .select(
      `
      id,
      organization_id,
      name,
      status,
      created_by,
      timeline_collaborators!inner (
        user_id,
        role,
        can_edit,
        status
      )
    `,
    )
    .eq('id', timelineId)
    .eq('organization_id', profile.organization_id)
    .eq('timeline_collaborators.user_id', userId)
    .eq('timeline_collaborators.status', 'active')
    .single();

  if (timelineError || !timeline) {
    throw new Error('FORBIDDEN: Timeline not found or access denied');
  }

  // Check edit permissions if required
  if (requireEdit) {
    const collaborator = timeline.timeline_collaborators[0];
    if (!collaborator.can_edit && timeline.created_by !== userId) {
      throw new Error('FORBIDDEN: Edit permission required');
    }
  }

  return { timeline, profile };
}

// =====================================================
// GET /api/timeline/[id] - Get timeline details
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify access to timeline
    const { timeline } = await verifyTimelineAccess(
      supabase,
      params.id,
      user.id,
    );

    // Get full timeline details
    const { data: timelineDetails, error: detailsError } = await supabase
      .from('wedding_timelines')
      .select(
        `
        id,
        name,
        wedding_date,
        timezone,
        start_time,
        end_time,
        buffer_time_minutes,
        allow_vendor_edits,
        require_approval,
        version,
        published_version,
        is_published,
        published_at,
        status,
        created_at,
        updated_at,
        clients:client_id (
          id,
          name,
          email
        ),
        timeline_events (
          id,
          title,
          description,
          event_type,
          category,
          start_time,
          end_time,
          duration_minutes,
          location,
          location_details,
          priority,
          status,
          is_locked,
          is_flexible,
          weather_dependent,
          color,
          icon,
          display_order,
          layer,
          internal_notes,
          vendor_notes
        ),
        timeline_collaborators (
          id,
          user_id,
          role,
          can_edit,
          can_comment,
          can_share,
          status,
          last_viewed_at,
          is_currently_viewing,
          user_profiles:user_id (
            first_name,
            last_name,
            email
          )
        )
      `,
      )
      .eq('id', params.id)
      .single();

    if (detailsError) {
      console.error('Error fetching timeline details:', detailsError);
      return NextResponse.json(
        { error: 'Failed to fetch timeline details' },
        { status: 500 },
      );
    }

    // Get timeline statistics
    const { data: statistics } = await supabase
      .rpc('get_timeline_statistics', { p_timeline_id: params.id })
      .single();

    // Get unresolved conflicts
    const { data: conflicts } = await supabase
      .from('timeline_conflicts')
      .select(
        `
        id,
        conflict_type,
        severity,
        description,
        suggestion,
        is_resolved,
        detected_at,
        timeline_events:event_id_1 (
          id,
          title
        ),
        timeline_events_2:event_id_2 (
          id,
          title
        )
      `,
      )
      .eq('timeline_id', params.id)
      .eq('is_resolved', false);

    // Sort events by start_time
    if (timelineDetails.timeline_events) {
      timelineDetails.timeline_events.sort(
        (a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...timelineDetails,
        statistics: statistics || {
          total_events: 0,
          confirmed_events: 0,
          total_vendors: 0,
          confirmed_vendors: 0,
          total_duration_hours: 0,
          unresolved_conflicts: 0,
        },
        conflicts: conflicts || [],
      },
    });
  } catch (error) {
    console.error('Timeline get error:', error);
    const status =
      error instanceof Error && error.message.startsWith('UNAUTHORIZED')
        ? 401
        : error instanceof Error && error.message.startsWith('FORBIDDEN')
          ? 403
          : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status },
    );
  }
}

// =====================================================
// PUT /api/timeline/[id] - Update timeline
// =====================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return await withSecureValidation(
    updateTimelineSchema,
    async (
      req: NextRequest,
      validatedData: z.infer<typeof updateTimelineSchema>,
    ) => {
      try {
        const supabase = await createClient();

        // Get authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 },
          );
        }

        // Verify edit access to timeline
        await verifyTimelineAccess(supabase, params.id, user.id, true);

        // If updating the timeline date, validate it doesn't conflict with existing events
        if (validatedData.wedding_date) {
          const { data: events } = await supabase
            .from('timeline_events')
            .select('id, title, start_time')
            .eq('timeline_id', params.id)
            .limit(1);

          if (events && events.length > 0) {
            // Check if the new date is compatible with existing events
            const newWeddingDate = new Date(validatedData.wedding_date);
            const existingEventDate = new Date(events[0].start_time);

            if (
              newWeddingDate.toDateString() !== existingEventDate.toDateString()
            ) {
              return NextResponse.json(
                {
                  error: 'DATE_CONFLICT',
                  message:
                    'Cannot change wedding date when events are already scheduled',
                  suggestion:
                    'Please delete all events first or create a new timeline',
                },
                { status: 400 },
              );
            }
          }
        }

        // Get current version for increment
        const { data: currentTimeline } = await supabase
          .from('wedding_timelines')
          .select('version')
          .eq('id', params.id)
          .single();

        // Update the timeline
        const updateData: any = {
          ...validatedData,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };

        // Increment version on significant changes
        if (
          validatedData.wedding_date ||
          validatedData.start_time ||
          validatedData.end_time
        ) {
          updateData.version = (currentTimeline?.version || 1) + 1;
        }

        const { data: updatedTimeline, error: updateError } = await supabase
          .from('wedding_timelines')
          .update(updateData)
          .eq('id', params.id)
          .select(
            `
            id,
            name,
            wedding_date,
            timezone,
            start_time,
            end_time,
            buffer_time_minutes,
            allow_vendor_edits,
            require_approval,
            version,
            status,
            updated_at,
            clients:client_id (
              id,
              name
            )
          `,
          )
          .single();

        if (updateError) {
          console.error('Error updating timeline:', updateError);
          return NextResponse.json(
            { error: 'Failed to update timeline' },
            { status: 500 },
          );
        }

        // Get updated statistics
        const { data: statistics } = await supabase
          .rpc('get_timeline_statistics', { p_timeline_id: params.id })
          .single();

        return NextResponse.json({
          success: true,
          data: {
            ...updatedTimeline,
            statistics: statistics || {
              total_events: 0,
              confirmed_events: 0,
              total_vendors: 0,
              confirmed_vendors: 0,
              total_duration_hours: 0,
              unresolved_conflicts: 0,
            },
          },
        });
      } catch (error) {
        console.error('Timeline update error:', error);
        const status =
          error instanceof Error && error.message.startsWith('UNAUTHORIZED')
            ? 401
            : error instanceof Error && error.message.startsWith('FORBIDDEN')
              ? 403
              : 500;
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : 'Internal server error',
          },
          { status },
        );
      }
    },
  )(request);
}

// =====================================================
// DELETE /api/timeline/[id] - Delete timeline
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify access to timeline (only owner or admin can delete)
    const { timeline } = await verifyTimelineAccess(
      supabase,
      params.id,
      user.id,
    );

    // Check if user is the owner or has admin role
    const { data: collaborator } = await supabase
      .from('timeline_collaborators')
      .select('role')
      .eq('timeline_id', params.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (
      !collaborator ||
      (collaborator.role !== 'owner' && timeline.created_by !== user.id)
    ) {
      return NextResponse.json(
        { error: 'FORBIDDEN: Only timeline owners can delete timelines' },
        { status: 403 },
      );
    }

    // Get timeline details to check if published
    const { data: timelineDetails } = await supabase
      .from('wedding_timelines')
      .select('is_published')
      .eq('id', params.id)
      .single();

    // Check if timeline is published (require special handling)
    if (timelineDetails?.is_published) {
      return NextResponse.json(
        {
          error: 'TIMELINE_PUBLISHED',
          message: 'Cannot delete a published timeline',
          suggestion:
            'Unpublish the timeline first or create an archive instead',
        },
        { status: 400 },
      );
    }

    // Get count of events for confirmation
    const { count: eventCount } = await supabase
      .from('timeline_events')
      .select('id', { count: 'exact' })
      .eq('timeline_id', params.id);

    // Delete the timeline (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('wedding_timelines')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting timeline:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete timeline' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Timeline deleted successfully',
      deleted_events_count: eventCount || 0,
    });
  } catch (error) {
    console.error('Timeline delete error:', error);
    const status =
      error instanceof Error && error.message.startsWith('UNAUTHORIZED')
        ? 401
        : error instanceof Error && error.message.startsWith('FORBIDDEN')
          ? 403
          : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status },
    );
  }
}

// Configure runtime options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
