import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InvitationManager } from '@/lib/services/invitation-manager';
import { z } from 'zod';

const CreateInvitationSchema = z.object({
  recipient_email: z.string().email(),
  recipient_name: z.string().optional(),
  invitation_type: z.enum([
    'vendor_to_couple',
    'couple_to_vendor',
    'vendor_to_vendor',
  ]),
  channel: z.enum(['email', 'sms', 'whatsapp']).default('email'),
  template_id: z.string().optional(),
  personalized_message: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateInvitationSchema = z.object({
  status: z
    .enum([
      'pending',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'accepted',
      'declined',
      'expired',
    ])
    .optional(),
  personalized_message: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/viral/invitations
 * Retrieve invitations with filtering and pagination
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const queryParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 100),
      type: url.searchParams.get('type'),
      status: url.searchParams.get('status'),
      channel: url.searchParams.get('channel'),
      sender_id: url.searchParams.get('sender_id'),
      date_from: url.searchParams.get('date_from'),
      date_to: url.searchParams.get('date_to'),
      search: url.searchParams.get('search'),
    };

    const invitationManager = new InvitationManager(supabase);
    const result = await invitationManager.getInvitations({
      userId: user.id,
      ...queryParams,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      metadata: {
        total: result.total,
        page: queryParams.page,
        limit: queryParams.limit,
        filters: {
          type: queryParams.type,
          status: queryParams.status,
          channel: queryParams.channel,
        },
      },
    });
  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve invitations',
        code: 'FETCH_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/viral/invitations
 * Create new invitation
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = CreateInvitationSchema.parse(body);

    const invitationManager = new InvitationManager(supabase);
    const invitation = await invitationManager.createInvitation({
      ...validatedData,
      sender_id: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: invitation,
        message: 'Invitation created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Invitation creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid invitation data',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create invitation',
        code: 'CREATION_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/viral/invitations
 * Bulk update invitations
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { invitation_ids, updates } = body;

    if (!Array.isArray(invitation_ids) || invitation_ids.length === 0) {
      return NextResponse.json(
        {
          error: 'invitation_ids must be a non-empty array',
          code: 'INVALID_IDS',
        },
        { status: 400 },
      );
    }

    const validatedUpdates = UpdateInvitationSchema.parse(updates);

    const invitationManager = new InvitationManager(supabase);
    const result = await invitationManager.bulkUpdateInvitations({
      invitationIds: invitation_ids,
      updates: validatedUpdates,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        updated_count: result.updatedCount,
        updated_invitations: result.updatedInvitations,
      },
      message: `${result.updatedCount} invitations updated successfully`,
    });
  } catch (error) {
    console.error('Bulk invitation update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update invitations',
        code: 'UPDATE_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/viral/invitations
 * Bulk delete invitations (soft delete)
 */
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { invitation_ids } = body;

    if (!Array.isArray(invitation_ids) || invitation_ids.length === 0) {
      return NextResponse.json(
        {
          error: 'invitation_ids must be a non-empty array',
          code: 'INVALID_IDS',
        },
        { status: 400 },
      );
    }

    const invitationManager = new InvitationManager(supabase);
    const result = await invitationManager.deleteInvitations({
      invitationIds: invitation_ids,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted_count: result.deletedCount,
      },
      message: `${result.deletedCount} invitations deleted successfully`,
    });
  } catch (error) {
    console.error('Bulk invitation delete error:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete invitations',
        code: 'DELETE_ERROR',
      },
      { status: 500 },
    );
  }
}
