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

// Rate limiting for document operations
const documentRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// File upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Document metadata validation schema
const documentUploadSchema = z.object({
  document_name: z.string().min(1).max(255),
  document_type: z.enum([
    'contract',
    'invoice',
    'photo',
    'permit',
    'design',
    'timeline',
    'budget',
    'other',
  ]),
  description: z.string().max(1000).optional(),
  category: z
    .enum([
      'legal',
      'financial',
      'design',
      'planning',
      'communication',
      'other',
    ])
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  is_confidential: z.boolean().optional(),
  access_level: z.enum(['owner', 'team', 'client']).optional(),
});

const documentUpdateSchema = z.object({
  document_name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z
    .enum([
      'legal',
      'financial',
      'design',
      'planning',
      'communication',
      'other',
    ])
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  is_confidential: z.boolean().optional(),
  access_level: z.enum(['owner', 'team', 'client']).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
});

export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await documentRateLimit.check(100, identifier);

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
      PERMISSIONS.WEDDING_VIEW,
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50'),
      100,
    );
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const documentType = url.searchParams.get('document_type');
    const category = url.searchParams.get('category');
    const onlyLatest = url.searchParams.get('only_latest') === 'true';

    // Build query
    let query = supabase
      .from('client_documents')
      .select(
        `
        id,
        document_name,
        document_type,
        file_path,
        file_size,
        mime_type,
        version_number,
        is_latest,
        description,
        tags,
        category,
        status,
        is_confidential,
        access_level,
        uploaded_at,
        uploaded_by,
        uploaded_by_name,
        modified_at,
        modified_by,
        is_signed,
        signed_at,
        metadata
      `,
      )
      .eq('client_id', params.id)
      .eq('status', 'active')
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (onlyLatest) {
      query = query.eq('is_latest', true);
    }

    const { data: documents, error } = await query;

    if (error) {
      throw error;
    }

    // Generate signed URLs for document access
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        // Generate a signed URL valid for 1 hour
        const { data: signedUrl } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(doc.file_path, 3600);

        return {
          ...doc,
          download_url: signedUrl?.signedUrl || null,
        };
      }),
    );

    return NextResponse.json({
      data: documentsWithUrls,
      pagination: {
        limit,
        offset,
        total: documentsWithUrls.length,
        hasMore: documentsWithUrls.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching client documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
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
    const { success } = await documentRateLimit.check(10, identifier);

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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 },
      );
    }

    // Parse and validate metadata
    let documentData;
    try {
      const parsedMetadata = JSON.parse(metadata);
      documentData = documentUploadSchema.parse(parsedMetadata);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid document metadata' },
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

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${params.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    // Check if this is a new version of an existing document
    let versionNumber = 1;
    let parentDocumentId = null;

    const existingDocName = sanitizeString(documentData.document_name);
    const { data: existingDoc } = await supabase
      .from('client_documents')
      .select('id, version_number')
      .eq('client_id', params.id)
      .eq('document_name', existingDocName)
      .eq('is_latest', true)
      .single();

    if (existingDoc) {
      versionNumber = existingDoc.version_number + 1;
      parentDocumentId = existingDoc.id;

      // Mark previous version as not latest
      await supabase
        .from('client_documents')
        .update({ is_latest: false })
        .eq('id', existingDoc.id);
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('client_documents')
      .insert({
        organization_id: userProfile?.organization_id,
        client_id: params.id,
        document_name: existingDocName,
        document_type: documentData.document_type,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        version_number: versionNumber,
        is_latest: true,
        parent_document_id: parentDocumentId,
        description: documentData.description
          ? sanitizeString(documentData.description)
          : null,
        tags: documentData.tags || [],
        category: documentData.category || 'other',
        is_confidential: documentData.is_confidential || false,
        access_level: documentData.access_level || 'team',
        uploaded_by: user.id,
        uploaded_by_name: userName,
        metadata: {
          original_filename: file.name,
          upload_source: 'web_app',
        },
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to clean up the uploaded file
      await supabase.storage.from('client-documents').remove([fileName]);

      throw dbError;
    }

    // Track activity
    await supabase.from('client_activities').insert({
      client_id: params.id,
      organization_id: userProfile?.organization_id,
      activity_type: 'document_uploaded',
      activity_title: `Document uploaded: ${documentData.document_name}`,
      activity_description: `${documentData.document_type} document (${(file.size / 1024).toFixed(1)}KB)`,
      activity_category: 'document',
      performed_by: user.id,
      performed_by_name: userName,
      metadata: {
        document_id: document.id,
        document_type: documentData.document_type,
        version: versionNumber,
      },
    });

    // Generate signed URL for the uploaded document
    const { data: signedUrl } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600);

    // Broadcast real-time update
    await supabase.channel(`client_documents:${params.id}`).send({
      type: 'broadcast',
      event: 'document_uploaded',
      payload: {
        ...document,
        download_url: signedUrl?.signedUrl || null,
      },
    });

    return NextResponse.json(
      {
        ...document,
        download_url: signedUrl?.signedUrl || null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error uploading document:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid document data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await documentRateLimit.check(10, identifier);

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

    // Get document ID from query
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');

    if (!documentId || !isValidUUID(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 },
      );
    }

    // Get document details
    const { data: document } = await supabase
      .from('client_documents')
      .select('file_path, document_name, uploaded_by')
      .eq('id', documentId)
      .eq('client_id', params.id)
      .single();

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    // Check if user can delete (only uploader or admin)
    const isAdmin = await rbacSystem.hasPermission(
      user.id,
      PERMISSIONS.ADMIN_FULL,
    );
    if (document.uploaded_by !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete documents you uploaded' },
        { status: 403 },
      );
    }

    // Soft delete - mark as deleted instead of removing
    const { error: updateError } = await supabase
      .from('client_documents')
      .update({
        status: 'deleted',
        modified_at: new Date().toISOString(),
        modified_by: user.id,
      })
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

    // Track activity
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, organization_id')
      .eq('user_id', user.id)
      .single();

    const userName = userProfile
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      : user.email || 'Unknown User';

    await supabase.from('client_activities').insert({
      client_id: params.id,
      organization_id: userProfile?.organization_id,
      activity_type: 'document_deleted',
      activity_title: `Document deleted: ${document.document_name}`,
      activity_description: `Document was marked as deleted`,
      activity_category: 'document',
      performed_by: user.id,
      performed_by_name: userName,
      metadata: { document_id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}
