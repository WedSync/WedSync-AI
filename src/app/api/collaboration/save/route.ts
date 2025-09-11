/**
 * Collaborative Document Save API - Mobile-optimized real-time saving
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 *
 * Features:
 * - Save collaborative documents with Y.js state
 * - Wedding-specific validation and permissions
 * - Real-time broadcasting to collaborators
 * - Mobile-optimized payload handling
 * - Conflict detection and resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import * as Y from 'yjs';
import { ratelimit } from '@/lib/rate-limit';

// Validation schema for save request
const saveDocumentSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format'),
  weddingId: z.string().uuid('Invalid wedding ID format'),
  content: z.string().max(50000, 'Content too long (max 50,000 characters)'),
  yDocState: z.string().optional(), // Base64 encoded Y.js state
  version: z.number().optional(),
  documentType: z
    .enum(['guest_list', 'vendor_selection', 'timeline', 'family_input'])
    .optional(),
  collaborativeOperations: z
    .array(
      z.object({
        type: z.string(),
        position: z.number(),
        content: z.string(),
        timestamp: z.string(),
      }),
    )
    .optional(),
});

// Rate limiting - 30 saves per minute per user
const saveRateLimit = ratelimit({
  limiter: 'sliding_window_log',
  max: 30,
  window: '1m',
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authentication check
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

    // Rate limiting
    const rateLimitResult = await saveRateLimit.limit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many save requests',
          retryAfter: rateLimitResult.reset,
          remaining: rateLimitResult.remaining,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const {
      documentId,
      weddingId,
      content,
      yDocState,
      version,
      documentType,
      collaborativeOperations,
    } = saveDocumentSchema.parse(body);

    // Check permissions
    const { data: document, error: docError } = await supabase
      .from('collaborative_documents')
      .select(
        `
        id,
        version,
        wedding_id,
        type,
        created_by,
        collaborative_document_permissions (
          user_id,
          can_write
        ),
        weddings (
          id,
          status
        )
      `,
      )
      .eq('id', documentId)
      .eq('wedding_id', weddingId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 },
      );
    }

    // Check write permissions
    const userPermissions = document.collaborative_document_permissions?.find(
      (p: any) => p.user_id === user.id,
    );

    if (!userPermissions?.can_write) {
      // Check if user is part of wedding team with write access
      const { data: teamMember } = await supabase
        .from('wedding_team_members')
        .select('role')
        .eq('wedding_id', weddingId)
        .eq('user_id', user.id)
        .single();

      if (!teamMember || teamMember.role === 'viewer') {
        return NextResponse.json(
          { error: 'Insufficient permissions to edit this document' },
          { status: 403 },
        );
      }
    }

    // Version conflict check
    if (version && version < document.version) {
      return NextResponse.json(
        {
          error: 'Version conflict detected',
          currentVersion: document.version,
          clientVersion: version,
          requiresResolution: true,
        },
        { status: 409 },
      );
    }

    // Wedding status check (prevent edits for completed weddings)
    if (document.weddings?.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot edit documents for completed weddings' },
        { status: 422 },
      );
    }

    // Prepare update data
    const updateData: any = {
      content,
      version: (document.version || 0) + 1,
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    };

    // Handle Y.js state if provided
    if (yDocState) {
      try {
        // Validate Y.js state format
        const stateBuffer = Buffer.from(yDocState, 'base64');
        if (stateBuffer.length > 1024 * 1024) {
          // 1MB limit for Y.js state
          return NextResponse.json(
            { error: 'Y.js state too large (max 1MB)' },
            { status: 413 },
          );
        }
        updateData.yjs_state = yDocState;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid Y.js state format' },
          { status: 400 },
        );
      }
    }

    // Save document with optimistic locking
    const { data: updatedDocument, error: updateError } = await supabase
      .from('collaborative_documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('wedding_id', weddingId)
      .eq('version', document.version) // Optimistic locking
      .select('id, version, updated_at')
      .single();

    if (updateError) {
      // Check if it's a version conflict
      if (updateError.message.includes('version')) {
        return NextResponse.json(
          {
            error: 'Version conflict - document was updated by another user',
            requiresReload: true,
          },
          { status: 409 },
        );
      }

      console.error('Document update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 },
      );
    }

    // Log the save operation for audit trail
    await supabase.from('collaborative_document_history').insert({
      document_id: documentId,
      user_id: user.id,
      action: 'save',
      content_length: content.length,
      has_yjs_state: !!yDocState,
      operation_count: collaborativeOperations?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // Update user's session activity
    await supabase.from('collaborative_document_sessions').upsert(
      {
        document_id: documentId,
        user_id: user.id,
        last_active: new Date().toISOString(),
        is_typing: false,
      },
      {
        onConflict: 'document_id,user_id',
      },
    );

    // Real-time broadcast to other collaborators
    try {
      await supabase.channel(`document-${documentId}`).send({
        type: 'broadcast',
        event: 'document_saved',
        payload: {
          documentId,
          userId: user.id,
          version: updatedDocument.version,
          contentLength: content.length,
          timestamp: updatedDocument.updated_at,
          hasConflicts: false,
        },
      });
    } catch (broadcastError) {
      // Non-critical error - log but don't fail the request
      console.warn('Failed to broadcast document save:', broadcastError);
    }

    // Wedding-specific notifications for important documents
    if (['guest_list', 'timeline'].includes(document.type)) {
      try {
        // Notify wedding team about important updates
        const { data: teamMembers } = await supabase
          .from('wedding_team_members')
          .select('user_id, role, user_profiles(email, full_name)')
          .eq('wedding_id', weddingId)
          .neq('user_id', user.id);

        if (teamMembers?.length) {
          await supabase.from('notifications').insert(
            teamMembers
              .filter((member) => ['owner', 'planner'].includes(member.role))
              .map((member) => ({
                user_id: member.user_id,
                type: 'document_updated',
                title: 'Document Updated',
                message: `${document.type.replace('_', ' ')} has been updated`,
                data: {
                  document_id: documentId,
                  document_type: document.type,
                  updated_by: user.id,
                },
                created_at: new Date().toISOString(),
              })),
          );
        }
      } catch (notificationError) {
        // Non-critical error
        console.warn('Failed to send notifications:', notificationError);
      }
    }

    // Return success response with mobile-friendly format
    return NextResponse.json({
      success: true,
      document: {
        id: updatedDocument.id,
        version: updatedDocument.version,
        updated_at: updatedDocument.updated_at,
      },
      metadata: {
        contentLength: content.length,
        hasYjsState: !!yDocState,
        operationsCount: collaborativeOperations?.length || 0,
        rateLimitRemaining: rateLimitResult.remaining,
      },
    });
  } catch (error) {
    console.error('Collaboration save API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS in development
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
