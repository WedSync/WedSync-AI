/**
 * Document Download API Route
 * Handles secure document downloads with access control and logging
 * WS-068: Wedding Business Compliance Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/documents/[id]/download - Download document with security checks
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
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('token'); // For shared link access

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('business_documents')
      .select(
        `
        *,
        category:document_categories(*)
      `,
      )
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    let hasAccess = false;
    let accessMethod = 'direct';
    let shareLink = null;

    // Check if user owns the document
    if (document.user_id === session.user.id) {
      hasAccess = true;
      accessMethod = 'owner';
    }
    // Check if accessing via sharing link
    else if (shareToken) {
      const { data: linkData, error: linkError } = await supabase
        .from('document_sharing_links')
        .select('*')
        .eq('document_id', documentId)
        .eq('link_token', shareToken)
        .eq('is_active', true)
        .single();

      if (linkData && !linkError) {
        // Check if link is expired
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          return NextResponse.json(
            { error: 'Sharing link has expired' },
            { status: 403 },
          );
        }

        // Check if max uses exceeded
        if (linkData.max_uses && linkData.current_uses >= linkData.max_uses) {
          return NextResponse.json(
            { error: 'Sharing link usage limit exceeded' },
            { status: 403 },
          );
        }

        // Check if download is allowed for this link type
        if (linkData.link_type === 'view') {
          return NextResponse.json(
            { error: 'Download not allowed for view-only links' },
            { status: 403 },
          );
        }

        hasAccess = true;
        accessMethod = 'share_link';
        shareLink = linkData;
      }
    }
    // Check if user has explicit access control
    else {
      const { data: accessControl, error: accessError } = await supabase
        .from('document_access_control')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (accessControl && !accessError) {
        // Check if access has expired
        if (
          accessControl.expires_at &&
          new Date(accessControl.expires_at) < new Date()
        ) {
          return NextResponse.json(
            { error: 'Document access has expired' },
            { status: 403 },
          );
        }

        // Check if download is allowed for this access level
        if (
          !['download', 'share', 'manage'].includes(accessControl.access_level)
        ) {
          return NextResponse.json(
            { error: 'Download not allowed for your access level' },
            { status: 403 },
          );
        }

        hasAccess = true;
        accessMethod = 'access_control';
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('business-documents')
      .download(document.storage_path);

    if (storageError || !fileData) {
      console.error('Storage download error:', storageError);
      return NextResponse.json(
        { error: 'Failed to retrieve document file' },
        { status: 500 },
      );
    }

    // Log the download access
    try {
      const logData = {
        document_id: documentId,
        user_id: session.user.id,
        action: 'download',
        access_method: accessMethod,
        share_link_id: shareLink?.id || null,
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        success: true,
        accessed_at: new Date().toISOString(),
      };

      // Insert access log
      await supabase.from('document_sharing_logs').insert(logData);

      // Update sharing link usage count if applicable
      if (shareLink) {
        await supabase
          .from('document_sharing_links')
          .update({
            current_uses: shareLink.current_uses + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', shareLink.id);
      }

      // Update access control last accessed time if applicable
      if (accessMethod === 'access_control') {
        await supabase
          .from('document_access_control')
          .update({
            last_accessed_at: new Date().toISOString(),
          })
          .eq('document_id', documentId)
          .eq('user_id', session.user.id);
      }
    } catch (logError) {
      console.error('Failed to log document access:', logError);
      // Continue with download even if logging fails
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set(
      'Content-Type',
      document.mime_type || 'application/octet-stream',
    );
    headers.set('Content-Length', arrayBuffer.byteLength.toString());
    headers.set(
      'Content-Disposition',
      `attachment; filename="${document.original_filename}"`,
    );
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Document download error:', error);

    // Log failed access attempt
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await supabase.from('document_sharing_logs').insert({
          document_id: params.id,
          user_id: session.user.id,
          action: 'download',
          access_method: 'unknown',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          success: false,
          error_message: error.message,
          accessed_at: new Date().toISOString(),
        });
      }
    } catch (logError) {
      console.error('Failed to log failed download attempt:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 },
    );
  }
}
