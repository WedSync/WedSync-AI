/**
 * Document Sharing API Routes
 * Handles creating and managing secure document sharing links
 * WS-068: Wedding Business Compliance Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { documentStorageService } from '@/lib/services/documentStorageService';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import type {
  CreateSharingLinkRequest,
  DocumentSharingLink,
  LinkType,
  SecurityLevel,
} from '@/types/documents';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/documents/[id]/share - Create new sharing link
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const shareRequest: CreateSharingLinkRequest = await request.json();

    // Verify document exists and user has access
    const { data: document, error: docError } = await supabase
      .from('business_documents')
      .select('id, title, original_filename, security_level')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    // Validate request
    if (!shareRequest.link_type) {
      return NextResponse.json(
        { error: 'Link type is required' },
        { status: 400 },
      );
    }

    // Generate unique link token
    const linkToken = nanoid(32);
    let passwordHash = null;

    // Hash password if provided
    if (shareRequest.password) {
      passwordHash = await bcrypt.hash(shareRequest.password, 12);
    }

    // Calculate expiry date
    let expiresAt = null;
    if (shareRequest.expires_in_hours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + shareRequest.expires_in_hours);
    }

    // Create sharing link record
    const sharingLinkData = {
      document_id: documentId,
      created_by: session.user.id,
      link_token: linkToken,
      link_type: shareRequest.link_type,
      password_hash: passwordHash,
      require_email: shareRequest.require_email || false,
      allowed_emails: shareRequest.allowed_emails || null,
      max_uses: shareRequest.max_uses || null,
      current_uses: 0,
      expires_at: expiresAt?.toISOString() || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data: newLink, error: linkError } = await supabase
      .from('document_sharing_links')
      .insert(sharingLinkData)
      .select()
      .single();

    if (linkError) {
      console.error('Failed to create sharing link:', linkError);
      return NextResponse.json(
        { error: 'Failed to create sharing link' },
        { status: 500 },
      );
    }

    // Generate the full sharing URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const shareUrl = `${baseUrl}/share/${linkToken}`;

    const response = {
      success: true,
      link: {
        ...newLink,
        share_url: shareUrl,
      },
      message: 'Sharing link created successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create sharing link' },
      { status: 500 },
    );
  }
}

// GET /api/documents/[id]/share - Get all sharing links for document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('business_documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    // Get all sharing links for the document
    const { data: links, error: linksError } = await supabase
      .from('document_sharing_links')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Failed to fetch sharing links:', linksError);
      return NextResponse.json(
        { error: 'Failed to fetch sharing links' },
        { status: 500 },
      );
    }

    // Add share URLs to response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const linksWithUrls = links.map((link) => ({
      ...link,
      share_url: `${baseUrl}/share/${link.link_token}`,
    }));

    return NextResponse.json({ links: linksWithUrls });
  } catch (error) {
    console.error('Share links GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sharing links' },
      { status: 500 },
    );
  }
}

// PUT /api/documents/[id]/share - Update sharing link (deactivate, update settings)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const updateData = await request.json();
    const { link_id, action, ...payload } = updateData;

    if (!link_id || !action) {
      return NextResponse.json(
        { error: 'Link ID and action are required' },
        { status: 400 },
      );
    }

    // Verify document ownership and link exists
    const { data: linkData, error: linkError } = await supabase
      .from('document_sharing_links')
      .select(
        `
        *,
        document:business_documents!inner(
          id,
          user_id
        )
      `,
      )
      .eq('id', link_id)
      .eq('document_id', documentId)
      .single();

    if (
      linkError ||
      !linkData ||
      linkData.document.user_id !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Sharing link not found' },
        { status: 404 },
      );
    }

    let updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'deactivate':
        updatePayload.is_active = false;
        break;

      case 'activate':
        updatePayload.is_active = true;
        break;

      case 'update_settings':
        // Allow updating specific settings
        const allowedFields = [
          'max_uses',
          'expires_at',
          'require_email',
          'allowed_emails',
        ];
        for (const field of allowedFields) {
          if (payload[field] !== undefined) {
            updatePayload[field] = payload[field];
          }
        }
        break;

      case 'reset_password':
        if (payload.new_password) {
          updatePayload.password_hash = await bcrypt.hash(
            payload.new_password,
            12,
          );
        } else {
          updatePayload.password_hash = null;
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    // Update the sharing link
    const { data: updatedLink, error: updateError } = await supabase
      .from('document_sharing_links')
      .update(updatePayload)
      .eq('id', link_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update sharing link:', updateError);
      return NextResponse.json(
        { error: 'Failed to update sharing link' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      link: updatedLink,
      message: `Sharing link ${action} completed successfully`,
    });
  } catch (error) {
    console.error('Share link update error:', error);
    return NextResponse.json(
      { error: 'Failed to update sharing link' },
      { status: 500 },
    );
  }
}

// DELETE /api/documents/[id]/share - Delete sharing link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('link_id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 },
      );
    }

    // Verify ownership before deletion
    const { data: linkData, error: verifyError } = await supabase
      .from('document_sharing_links')
      .select(
        `
        id,
        document:business_documents!inner(
          user_id
        )
      `,
      )
      .eq('id', linkId)
      .eq('document_id', documentId)
      .single();

    if (
      verifyError ||
      !linkData ||
      linkData.document.user_id !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Sharing link not found' },
        { status: 404 },
      );
    }

    // Delete the sharing link
    const { error: deleteError } = await supabase
      .from('document_sharing_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) {
      console.error('Failed to delete sharing link:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete sharing link' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sharing link deleted successfully',
    });
  } catch (error) {
    console.error('Share link deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete sharing link' },
      { status: 500 },
    );
  }
}
