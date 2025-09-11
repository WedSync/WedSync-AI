import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';
import {
  isValidUUID,
  validateAndSanitizeObject,
  sanitizeString,
} from '@/lib/security/input-validation';
import { rbacSystem, PERMISSIONS } from '@/lib/security/rbac-system';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for notes operations
const notesRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// Note validation schema
const noteCreateSchema = z.object({
  content: z.string().min(1).max(10000),
  note_type: z.enum([
    'client',
    'internal',
    'follow_up',
    'meeting',
    'important',
  ]),
  visibility: z.enum(['public', 'internal', 'private']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  follow_up_date: z.string().optional().nullable(),
});

const noteUpdateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  note_type: z
    .enum(['client', 'internal', 'follow_up', 'meeting', 'important'])
    .optional(),
  visibility: z.enum(['public', 'internal', 'private']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  follow_up_date: z.string().optional().nullable(),
  is_pinned: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await notesRateLimit.check(100, identifier);

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

    // Check basic viewing permissions
    const hasViewPermission = await rbacSystem.hasPermission(
      user.id,
      PERMISSIONS.WEDDING_VIEW,
    );

    if (!hasViewPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Check if user can view internal notes
    const canViewInternal = await rbacSystem.hasPermission(
      user.id,
      PERMISSIONS.SETTINGS_VIEW,
    );

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50'),
      100,
    );
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const noteType = url.searchParams.get('note_type');
    const visibility = url.searchParams.get('visibility');

    // Build query with visibility filtering
    let query = supabase
      .from('client_notes')
      .select(
        `
        id,
        content,
        note_type,
        visibility,
        tags,
        created_at,
        updated_at,
        created_by,
        created_by_name,
        updated_by,
        updated_by_name,
        is_pinned,
        follow_up_date,
        priority
      `,
      )
      .eq('client_id', params.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by note type
    if (noteType) {
      query = query.eq('note_type', noteType);
    }

    // Filter by visibility
    if (visibility) {
      query = query.eq('visibility', visibility);
    }

    const { data: allNotes, error } = await query;

    if (error) {
      throw error;
    }

    // Filter notes based on permissions
    const filteredNotes = (allNotes || []).filter((note) => {
      // Public notes are visible to all
      if (note.visibility === 'public') return true;

      // Internal notes require special permission
      if (note.visibility === 'internal') return canViewInternal;

      // Private notes are only visible to the creator
      if (note.visibility === 'private') return note.created_by === user.id;

      return false;
    });

    return NextResponse.json({
      data: filteredNotes,
      pagination: {
        limit,
        offset,
        total: filteredNotes.length,
        hasMore: filteredNotes.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching client notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
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
    const { success } = await notesRateLimit.check(20, identifier);

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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = noteCreateSchema.parse(body);

    // Sanitize content
    const sanitizedContent = sanitizeString(validatedData.content);
    if (!sanitizedContent) {
      return NextResponse.json(
        { error: 'Invalid note content' },
        { status: 400 },
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, organization_id')
      .eq('user_id', user.id)
      .single();

    const userName = userProfile
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      : user.email || 'Unknown User';

    // Check if user can create internal notes
    const canCreateInternal = await rbacSystem.hasPermission(
      user.id,
      PERMISSIONS.SETTINGS_VIEW,
    );

    if (validatedData.visibility === 'internal' && !canCreateInternal) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create internal notes' },
        { status: 403 },
      );
    }

    // Create note record
    const { data: note, error } = await supabase
      .from('client_notes')
      .insert({
        client_id: params.id,
        organization_id: userProfile?.organization_id,
        content: sanitizedContent,
        note_type: validatedData.note_type,
        visibility: validatedData.visibility,
        priority: validatedData.priority || 'medium',
        tags: validatedData.tags || [],
        follow_up_date: validatedData.follow_up_date || null,
        created_by: user.id,
        created_by_name: userName,
        updated_by: user.id,
        updated_by_name: userName,
        is_pinned: false,
      })
      .select(
        `
        id,
        content,
        note_type,
        visibility,
        tags,
        created_at,
        updated_at,
        created_by,
        created_by_name,
        updated_by,
        updated_by_name,
        is_pinned,
        follow_up_date,
        priority
      `,
      )
      .single();

    if (error) {
      throw error;
    }

    // Create activity record
    await supabase.from('client_activities').insert({
      client_id: params.id,
      organization_id: userProfile?.organization_id,
      activity_type: 'note_added',
      activity_title: `${validatedData.note_type.charAt(0).toUpperCase() + validatedData.note_type.slice(1)} note added`,
      activity_description:
        sanitizedContent.substring(0, 100) +
        (sanitizedContent.length > 100 ? '...' : ''),
      performed_by: user.id,
      performed_by_name: userName,
      metadata: { note_id: note.id, note_type: validatedData.note_type },
    });

    // Broadcast real-time update
    await supabase.channel(`client_notes:${params.id}`).send({
      type: 'broadcast',
      event: 'note_added',
      payload: note,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating client note:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid note data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 },
    );
  }
}
