/**
 * Documents API Route
 * Handles document upload, listing, and management operations
 * WS-068: Wedding Business Compliance Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { documentStorageService } from '@/lib/services/documentStorageService';
import type {
  DocumentUploadRequest,
  DocumentLibraryFilters,
  DocumentWithCategory,
} from '@/types/documents';

// GET /api/documents - List documents with filtering
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const filters: DocumentLibraryFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      category_ids: searchParams
        .get('category_ids')
        ?.split(',')
        .filter(Boolean),
      compliance_status: searchParams
        .get('compliance_status')
        ?.split(',')
        .filter(Boolean) as any,
      security_level: searchParams
        .get('security_level')
        ?.split(',')
        .filter(Boolean) as any,
      sort_by: (searchParams.get('sort_by') as any) || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      expiry_date_from: searchParams.get('expiry_date_from') || undefined,
      expiry_date_to: searchParams.get('expiry_date_to') || undefined,
      created_at_from: searchParams.get('created_at_from') || undefined,
      created_at_to: searchParams.get('created_at_to') || undefined,
    };

    const response = await documentStorageService.getDocumentLibrary(
      session.user.id,
      filters,
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Documents API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

// POST /api/documents - Upload new document
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse upload request data
    const uploadRequest: DocumentUploadRequest = {
      file,
      category_id: formData.get('category_id') as string,
      title: (formData.get('title') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      tags: formData.get('tags')
        ? (formData.get('tags') as string)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      issued_date: (formData.get('issued_date') as string) || undefined,
      expiry_date: (formData.get('expiry_date') as string) || undefined,
      expiry_warning_days: formData.get('expiry_warning_days')
        ? parseInt(formData.get('expiry_warning_days') as string)
        : 30,
      is_compliance_required: formData.get('is_compliance_required') === 'true',
      security_level: (formData.get('security_level') as any) || 'standard',
    };

    // Validate required fields
    if (!uploadRequest.category_id) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 },
      );
    }

    // Upload document
    const document = await documentStorageService.uploadDocument(
      uploadRequest,
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      document,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Documents API POST error:', error);

    // Handle specific error types
    if (error.message?.includes('File too large')) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit' },
        { status: 413 },
      );
    }

    if (error.message?.includes('Invalid file type')) {
      return NextResponse.json(
        { error: 'File type not supported' },
        { status: 415 },
      );
    }

    if (error.message?.includes('Security scan failed')) {
      return NextResponse.json(
        { error: 'File failed security validation' },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}

// PUT /api/documents - Bulk operations (delete, update categories, etc.)
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { action, document_ids, ...payload } = body;

    if (!action || !document_ids || !Array.isArray(document_ids)) {
      return NextResponse.json(
        { error: 'Invalid bulk operation request' },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case 'delete':
        // Bulk delete documents
        const deletePromises = document_ids.map((id) =>
          documentStorageService.deleteDocument(id, session.user.id),
        );
        await Promise.all(deletePromises);
        result = { deleted_count: document_ids.length };
        break;

      case 'update_category':
        if (!payload.category_id) {
          return NextResponse.json(
            { error: 'Category ID required for category update' },
            { status: 400 },
          );
        }

        // Bulk update category
        const { data: updateResult } = await supabase
          .from('business_documents')
          .update({
            category_id: payload.category_id,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
          .in('id', document_ids);

        result = { updated_count: document_ids.length };
        break;

      case 'update_security_level':
        if (!payload.security_level) {
          return NextResponse.json(
            { error: 'Security level required for security update' },
            { status: 400 },
          );
        }

        // Bulk update security level
        const { data: securityResult } = await supabase
          .from('business_documents')
          .update({
            security_level: payload.security_level,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
          .in('id', document_ids);

        result = { updated_count: document_ids.length };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown bulk action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Bulk ${action} completed successfully`,
    });
  } catch (error) {
    console.error('Documents API PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 },
    );
  }
}
