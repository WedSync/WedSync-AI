/**
 * Individual Document API Routes
 * Handles operations on specific documents (view, update, delete, download)
 * WS-068: Wedding Business Compliance Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { documentStorageService } from '@/lib/services/documentStorageService';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/documents/[id] - Get single document details
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

    // Get document with category information
    const { data: document, error } = await supabase
      .from('business_documents')
      .select(
        `
        *,
        category:document_categories(*)
      `,
      )
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Document GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    );
  }
}

// PUT /api/documents/[id] - Update document metadata
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

    // Verify document ownership
    const { data: existingDoc, error: verifyError } = await supabase
      .from('business_documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();

    if (verifyError || !existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    // Prepare update payload
    const allowedFields = [
      'title',
      'description',
      'tags',
      'issued_date',
      'expiry_date',
      'expiry_warning_days',
      'is_compliance_required',
      'security_level',
      'category_id',
    ];

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    // Only include allowed fields that are present in the request
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updatePayload[field] = updateData[field];
      }
    }

    // Update document
    const { data: updatedDoc, error: updateError } = await supabase
      .from('business_documents')
      .update(updatePayload)
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .select(
        `
        *,
        category:document_categories(*)
      `,
      )
      .single();

    if (updateError) {
      console.error('Document update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 },
      );
    }

    // Update compliance status if expiry date changed
    if (updateData.expiry_date !== undefined) {
      await documentStorageService.updateComplianceStatus(documentId);
    }

    return NextResponse.json({
      success: true,
      document: updatedDoc,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Document PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 },
    );
  }
}

// DELETE /api/documents/[id] - Delete document
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

    // Verify document exists and get storage path
    const { data: document, error: verifyError } = await supabase
      .from('business_documents')
      .select('id, storage_path, original_filename')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();

    if (verifyError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    try {
      // Delete using service method (handles file deletion and database cleanup)
      await documentStorageService.deleteDocument(documentId, session.user.id);

      return NextResponse.json({
        success: true,
        message: `Document "${document.original_filename}" deleted successfully`,
      });
    } catch (deleteError) {
      console.error('Document deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Document DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}
