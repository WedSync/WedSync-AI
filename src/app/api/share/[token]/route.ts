/**
 * Public Document Sharing Access API
 * Handles public access to shared documents via sharing tokens
 * WS-068: Wedding Business Compliance Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import rateLimit from '@/lib/utils/rate-limit';

interface RouteParams {
  params: {
    token: string;
  };
}

// Rate limiting for share access
const shareAccessLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // limit to 500 unique tokens per minute
});

// GET /api/share/[token] - Access shared document (view document info)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    try {
      await shareAccessLimiter.check(5, identifier); // 5 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const shareToken = params.token;

    if (!shareToken || shareToken.length < 10) {
      return NextResponse.json(
        { error: 'Invalid sharing token' },
        { status: 400 },
      );
    }

    // Get sharing link details
    const { data: shareLink, error: linkError } = await supabase
      .from('document_sharing_links')
      .select(
        `
        *,
        document:business_documents(
          id,
          title,
          original_filename,
          description,
          mime_type,
          file_size,
          created_at,
          category:document_categories(
            display_name,
            icon,
            color
          )
        )
      `,
      )
      .eq('link_token', shareToken)
      .eq('is_active', true)
      .single();

    if (linkError || !shareLink) {
      return NextResponse.json(
        { error: 'Sharing link not found or inactive' },
        { status: 404 },
      );
    }

    // Check if link is expired
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Sharing link has expired' },
        { status: 410 },
      );
    }

    // Check if max uses exceeded
    if (shareLink.max_uses && shareLink.current_uses >= shareLink.max_uses) {
      return NextResponse.json(
        { error: 'Sharing link usage limit exceeded' },
        { status: 410 },
      );
    }

    // Prepare response data (excluding sensitive information)
    const responseData = {
      document: {
        id: shareLink.document.id,
        title: shareLink.document.title,
        filename: shareLink.document.original_filename,
        description: shareLink.document.description,
        mime_type: shareLink.document.mime_type,
        file_size: shareLink.document.file_size,
        created_at: shareLink.document.created_at,
        category: shareLink.document.category,
      },
      share_info: {
        link_type: shareLink.link_type,
        requires_password: !!shareLink.password_hash,
        requires_email: shareLink.require_email,
        allowed_emails: shareLink.allowed_emails,
        expires_at: shareLink.expires_at,
        max_uses: shareLink.max_uses,
        current_uses: shareLink.current_uses,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Share access error:', error);
    return NextResponse.json(
      { error: 'Failed to access shared document' },
      { status: 500 },
    );
  }
}

// POST /api/share/[token] - Access shared document with authentication
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    try {
      await shareAccessLimiter.check(3, identifier); // 3 attempts per minute per IP
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const shareToken = params.token;
    const body = await request.json();
    const { password, email, action } = body;

    if (!shareToken) {
      return NextResponse.json(
        { error: 'Invalid sharing token' },
        { status: 400 },
      );
    }

    // Get sharing link details
    const { data: shareLink, error: linkError } = await supabase
      .from('document_sharing_links')
      .select(
        `
        *,
        document:business_documents(
          id,
          title,
          original_filename,
          storage_path,
          mime_type,
          file_size
        )
      `,
      )
      .eq('link_token', shareToken)
      .eq('is_active', true)
      .single();

    if (linkError || !shareLink) {
      return NextResponse.json(
        { error: 'Sharing link not found or inactive' },
        { status: 404 },
      );
    }

    // Check if link is expired
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Sharing link has expired' },
        { status: 410 },
      );
    }

    // Check if max uses exceeded
    if (shareLink.max_uses && shareLink.current_uses >= shareLink.max_uses) {
      return NextResponse.json(
        { error: 'Sharing link usage limit exceeded' },
        { status: 410 },
      );
    }

    // Validate password if required
    if (shareLink.password_hash) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 401 },
        );
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        shareLink.password_hash,
      );
      if (!isPasswordValid) {
        // Log failed access attempt
        await supabase.from('document_sharing_logs').insert({
          document_id: shareLink.document_id,
          share_link_id: shareLink.id,
          action: action || 'view',
          accessed_by_email: email || null,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          success: false,
          error_message: 'Invalid password',
          accessed_at: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 },
        );
      }
    }

    // Validate email if required
    if (shareLink.require_email) {
      if (!email) {
        return NextResponse.json(
          { error: 'Email address is required' },
          { status: 400 },
        );
      }

      // Check if email is in allowed list (if specified)
      if (shareLink.allowed_emails && shareLink.allowed_emails.length > 0) {
        const emailAllowed = shareLink.allowed_emails.some(
          (allowedEmail) => allowedEmail.toLowerCase() === email.toLowerCase(),
        );
        if (!emailAllowed) {
          return NextResponse.json(
            { error: 'Email address not authorized' },
            { status: 403 },
          );
        }
      }
    }

    // Handle different actions
    let response;

    switch (action) {
      case 'download':
        if (shareLink.link_type === 'view') {
          return NextResponse.json(
            { error: 'Download not allowed for view-only links' },
            { status: 403 },
          );
        }

        // Get the file from storage
        const { data: fileData, error: storageError } = await supabase.storage
          .from('business-documents')
          .download(shareLink.document.storage_path);

        if (storageError || !fileData) {
          console.error('Storage download error:', storageError);
          return NextResponse.json(
            { error: 'Failed to retrieve document file' },
            { status: 500 },
          );
        }

        // Convert blob to array buffer
        const arrayBuffer = await fileData.arrayBuffer();

        // Set download headers
        const headers = new Headers();
        headers.set(
          'Content-Type',
          shareLink.document.mime_type || 'application/octet-stream',
        );
        headers.set('Content-Length', arrayBuffer.byteLength.toString());
        headers.set(
          'Content-Disposition',
          `attachment; filename="${shareLink.document.original_filename}"`,
        );

        response = new NextResponse(arrayBuffer, { status: 200, headers });
        break;

      case 'view':
      default:
        response = NextResponse.json({
          success: true,
          message: 'Document access granted',
          document: {
            id: shareLink.document.id,
            title: shareLink.document.title,
            filename: shareLink.document.original_filename,
            mime_type: shareLink.document.mime_type,
            file_size: shareLink.document.file_size,
          },
        });
        break;
    }

    // Log successful access
    try {
      await supabase.from('document_sharing_logs').insert({
        document_id: shareLink.document_id,
        share_link_id: shareLink.id,
        action: action || 'view',
        accessed_by_email: email || null,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        success: true,
        accessed_at: new Date().toISOString(),
      });

      // Update sharing link usage count
      await supabase
        .from('document_sharing_links')
        .update({
          current_uses: shareLink.current_uses + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', shareLink.id);
    } catch (logError) {
      console.error('Failed to log document access:', logError);
      // Continue with response even if logging fails
    }

    return response;
  } catch (error) {
    console.error('Share access POST error:', error);
    return NextResponse.json(
      { error: 'Failed to access shared document' },
      { status: 500 },
    );
  }
}
