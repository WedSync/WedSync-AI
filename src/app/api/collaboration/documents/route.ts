import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import * as Y from 'yjs';
import { YjsDocumentService } from '@/lib/services/yjs-document-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const yjsService = new YjsDocumentService();

// Validation schemas
const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  document_type: z.enum(['form', 'timeline', 'questionnaire', 'contract']),
  content: z.record(z.any()).optional(),
  permissions: z
    .object({
      read: z.array(z.string().uuid()),
      write: z.array(z.string().uuid()),
      admin: z.array(z.string().uuid()),
    })
    .optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.any()).optional(),
  yjs_update: z.array(z.number()).optional(),
  create_version: z.boolean().optional(),
  version_description: z.string().max(500).optional(),
});

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    throw new Error('Missing authorization header');
  }

  const token = authorization.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Invalid token');
  }

  return data.user;
}

// POST /api/collaboration/documents - Create new collaborative document
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const rateLimitResult = await rateLimit(identifier, {
      windowMs: 60000,
      max: 20,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const user = await getAuthenticatedUser(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createDocumentSchema.parse(body);

    // Create collaboration document
    const documentId = crypto.randomUUID();

    // Initialize Y.js document
    const yjsResult = await yjsService.initializeDocument(documentId, user.id);
    if (!yjsResult.success) {
      console.error('Y.js initialization failed:', yjsResult.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initialize collaborative document',
        },
        { status: 500 },
      );
    }

    // Set initial content if provided
    if (validatedData.content) {
      const contentResult = await yjsService.setMapValue(
        documentId,
        'document',
        'content',
        validatedData.content,
      );

      if (!contentResult.success) {
        console.error('Failed to set initial content:', contentResult.error);
      }
    }

    // Create database record
    const { data: document, error: documentError } = await supabase
      .from('collaboration_documents')
      .insert({
        id: documentId,
        title: validatedData.title,
        document_type: validatedData.document_type,
        status: 'active',
        created_by: user.id,
        organization_id: user.user_metadata?.organization_id,
        permissions: validatedData.permissions || {
          read: [user.id],
          write: [user.id],
          admin: [user.id],
        },
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (documentError) {
      // Cleanup Y.js document if database insertion fails
      yjsService.destroyDocument(documentId);
      console.error('Document creation error:', documentError);
      return NextResponse.json(
        { success: false, error: 'Failed to create document' },
        { status: 500 },
      );
    }

    // Create initial version record
    await supabase.from('document_versions').insert({
      document_id: documentId,
      version: '1.0.0',
      description: 'Initial version',
      created_by: user.id,
      created_at: new Date().toISOString(),
      content_snapshot: validatedData.content || {},
    });

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    console.error('Document creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/collaboration/documents - Get user's accessible documents
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await getAuthenticatedUser(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const documentType = searchParams.get('document_type');
    const search = searchParams.get('search');
    const includeYjs = searchParams.get('include_yjs') === 'true';

    const offset = (page - 1) * limit;

    // Build query for documents user has access to
    let query = supabase
      .from('collaboration_documents')
      .select(
        `
        id,
        title,
        document_type,
        status,
        version,
        created_at,
        updated_at,
        created_by,
        permissions
      `,
      )
      .or(
        `
        permissions->>read @> '["${user.id}"]',
        permissions->>write @> '["${user.id}"]',
        permissions->>admin @> '["${user.id}"]',
        created_by.eq.${user.id}
      `,
      )
      .eq('status', 'active');

    // Apply filters
    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Execute query with pagination
    const {
      data: documents,
      error,
      count,
    } = await query
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Documents fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch documents' },
        { status: 500 },
      );
    }

    // Include Y.js document state if requested
    if (includeYjs && documents) {
      for (const doc of documents) {
        const yjsContent = await yjsService.getMapEntries(doc.id, 'document');
        if (yjsContent.success) {
          (doc as any).yjsContent = Object.fromEntries(
            yjsContent.entries || [],
          );
        }
      }
    }

    // Calculate pagination info
    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      success: true,
      data: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    console.error('Documents fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/collaboration/documents/[id] - Update document
export async function PUT(request: NextRequest) {
  try {
    // Authentication
    const user = await getAuthenticatedUser(request);

    // Extract document ID from URL
    const url = new URL(request.url);
    const documentId = url.pathname.split('/').pop();

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID format' },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateDocumentSchema.parse(body);

    // Check write permissions
    const { data: hasPermission } = await supabase.rpc(
      'user_has_document_permission',
      {
        document_uuid: documentId,
        user_uuid: user.id,
        required_permission: 'write',
      },
    );

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Handle Y.js update if provided
    if (validatedData.yjs_update) {
      const updateArray = new Uint8Array(validatedData.yjs_update);
      const yjsDoc = yjsService.getDocument(documentId);

      if (yjsDoc) {
        // Apply Y.js update
        try {
          Y.applyUpdate(yjsDoc, updateArray);
        } catch (yjsError) {
          console.error('Y.js update error:', yjsError);
          return NextResponse.json(
            { success: false, error: 'Failed to apply document update' },
            { status: 400 },
          );
        }
      } else {
        // Initialize document if not exists
        const initResult = await yjsService.initializeDocument(
          documentId,
          user.id,
        );
        if (!initResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to initialize document for update',
            },
            { status: 500 },
          );
        }

        const newDoc = yjsService.getDocument(documentId);
        if (newDoc) {
          Y.applyUpdate(newDoc, updateArray);
        }
      }

      // Record operation in database
      await supabase.from('document_operations').insert({
        document_id: documentId,
        user_id: user.id,
        operation_type: 'yjs_update',
        operation_data: validatedData.yjs_update,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle content update
    if (validatedData.content) {
      const contentResult = await yjsService.setMapValue(
        documentId,
        'document',
        'content',
        validatedData.content,
      );

      if (!contentResult.success) {
        console.error('Content update error:', contentResult.error);
      }
    }

    // Update database record
    const updateFields: any = {
      updated_at: new Date().toISOString(),
      last_modified_by: user.id,
    };

    if (validatedData.title) {
      updateFields.title = validatedData.title;
    }

    const { data: document, error: updateError } = await supabase
      .from('collaboration_documents')
      .update(updateFields)
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      console.error('Document update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update document' },
        { status: 500 },
      );
    }

    // Create version if requested
    if (validatedData.create_version) {
      const currentContent = await yjsService.getMapEntries(
        documentId,
        'document',
      );
      const newVersion = await this.generateVersionNumber(document.version);

      await supabase.from('document_versions').insert({
        document_id: documentId,
        version: newVersion,
        description: validatedData.version_description || 'Version update',
        created_by: user.id,
        created_at: new Date().toISOString(),
        content_snapshot: currentContent.success
          ? Object.fromEntries(currentContent.entries || [])
          : {},
      });

      // Update document version
      await supabase
        .from('collaboration_documents')
        .update({ version: newVersion })
        .eq('id', documentId);

      document.version = newVersion;
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    console.error('Document update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/collaboration/documents/[id] - Delete document
export async function DELETE(request: NextRequest) {
  try {
    // Authentication
    const user = await getAuthenticatedUser(request);

    // Extract document ID from URL
    const url = new URL(request.url);
    const documentId = url.pathname.split('/').pop();
    const permanent = url.searchParams.get('permanent') === 'true';

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 },
      );
    }

    // Check admin permissions
    const { data: hasPermission } = await supabase.rpc(
      'user_has_document_permission',
      {
        document_uuid: documentId,
        user_uuid: user.id,
        required_permission: 'admin',
      },
    );

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    if (permanent) {
      // Permanent deletion - cleanup Y.js document and database record
      yjsService.destroyDocument(documentId);

      const { error: deleteError } = await supabase
        .from('collaboration_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Document permanent deletion error:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to permanently delete document' },
          { status: 500 },
        );
      }

      // Also cleanup related records
      await Promise.all([
        supabase
          .from('document_versions')
          .delete()
          .eq('document_id', documentId),
        supabase
          .from('document_operations')
          .delete()
          .eq('document_id', documentId),
      ]);
    } else {
      // Soft delete - update status
      const { error: deleteError } = await supabase
        .from('collaboration_documents')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (deleteError) {
        console.error('Document soft deletion error:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to delete document' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Document permanently deleted' : 'Document deleted',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    console.error('Document deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to generate version numbers
function generateVersionNumber(currentVersion: string): string {
  const parts = currentVersion.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1; // Increment patch version
  return parts.join('.');
}
