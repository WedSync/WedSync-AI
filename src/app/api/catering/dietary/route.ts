// /api/catering/dietary/route.ts
// WS-254: Dietary Requirements Management API - SECURED
// Handles CRUD operations for guest dietary requirements with security validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/security/withSecureValidation';

// Validation schemas
const DietaryRequirementSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required').max(100),
  weddingId: z.string().uuid('Invalid wedding ID'),
  category: z.enum(['allergy', 'diet', 'medical', 'preference'], {
    errorMap: () => ({
      message: 'Category must be allergy, diet, medical, or preference',
    }),
  }),
  severity: z.number().min(1).max(5, 'Severity must be between 1-5'),
  notes: z.string().min(1, 'Dietary requirement notes are required').max(1000),
  verified: z.boolean().optional().default(false),
  emergencyContact: z.string().optional(),
});

const UpdateDietaryRequirementSchema =
  DietaryRequirementSchema.partial().extend({
    id: z.string().uuid('Invalid requirement ID'),
  });

// GET /api/catering/dietary - List dietary requirements (SECURED)
export async function GET(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ user, request: validatedRequest }) => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Parse and validate query parameters
        const url = new URL(validatedRequest.url);
        const weddingId = url.searchParams.get('wedding_id');
        const category = url.searchParams.get('category');
        const severityMin = url.searchParams.get('severity_min');
        const verified = url.searchParams.get('verified');
        const limit = Math.min(
          parseInt(url.searchParams.get('limit') || '50'),
          100,
        );
        const offset = Math.max(
          parseInt(url.searchParams.get('offset') || '0'),
          0,
        );

        // Build query with RLS security (user.id is supplier_id)
        let query = supabase
          .from('dietary_requirements')
          .select(
            `
            id,
            guest_name,
            wedding_id,
            category,
            severity,
            notes,
            verified,
            emergency_contact,
            created_at,
            updated_at
          `,
          )
          .eq('supplier_id', user.id)
          .order('severity', { ascending: false })
          .order('created_at', { ascending: false });

        // Apply filters securely
        if (
          weddingId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            weddingId,
          )
        ) {
          query = query.eq('wedding_id', weddingId);
        }

        if (
          category &&
          ['allergy', 'diet', 'medical', 'preference'].includes(category)
        ) {
          query = query.eq('category', category);
        }

        if (severityMin && !isNaN(parseInt(severityMin))) {
          const minSeverity = Math.max(1, Math.min(5, parseInt(severityMin)));
          query = query.gte('severity', minSeverity);
        }

        if (verified === 'true' || verified === 'false') {
          query = query.eq('verified', verified === 'true');
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: requirements, error, count } = await query;

        if (error) {
          throw new Error(`Database query failed: ${error.message}`);
        }

        // Get summary statistics
        const { data: stats } = await supabase
          .from('dietary_requirements')
          .select('category, severity, verified')
          .eq('supplier_id', user.id);

        const summary = {
          total: count || 0,
          by_category: (stats || []).reduce(
            (acc, req) => {
              acc[req.category] = (acc[req.category] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
          high_severity: (stats || []).filter((req) => req.severity >= 4)
            .length,
          unverified: (stats || []).filter((req) => !req.verified).length,
        };

        return NextResponse.json({
          success: true,
          data: {
            requirements: requirements || [],
            summary,
            pagination: {
              offset,
              limit,
              total: count || 0,
              has_more: (count || 0) > offset + limit,
            },
          },
          meta: {
            generated_at: new Date().toISOString(),
            data_freshness: 'real-time',
          },
        });
      } catch (error) {
        console.error('Failed to fetch dietary requirements:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch dietary requirements',
            code: 'FETCH_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      rateLimit: { requests: 60, window: '1m' }, // 60 requests per minute for read operations
      validateBody: false, // GET request, no body to validate
    },
  )();
}

// POST /api/catering/dietary - Create new dietary requirement (SECURED)
export async function POST(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ body, user, request: validatedRequest }) => {
      try {
        // Validate request body against schema
        const validatedData = DietaryRequirementSchema.parse(body);

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Verify user has access to the wedding (RLS will handle this, but double-check)
        const { data: wedding, error: weddingError } = await supabase
          .from('weddings')
          .select('id')
          .eq('id', validatedData.weddingId)
          .eq('supplier_id', user.id)
          .single();

        if (weddingError || !wedding) {
          return NextResponse.json(
            {
              success: false,
              error: 'Wedding not found or access denied',
              code: 'ACCESS_DENIED',
            },
            { status: 403 },
          );
        }

        // Check for duplicate guest in same wedding
        const { data: existing } = await supabase
          .from('dietary_requirements')
          .select('id')
          .eq('wedding_id', validatedData.weddingId)
          .eq('guest_name', validatedData.guestName)
          .eq('supplier_id', user.id);

        if (existing && existing.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Dietary requirement already exists for guest: ${validatedData.guestName}`,
              code: 'DUPLICATE_GUEST',
            },
            { status: 409 },
          );
        }

        // Insert new requirement
        const { data: requirement, error: insertError } = await supabase
          .from('dietary_requirements')
          .insert({
            guest_name: validatedData.guestName,
            wedding_id: validatedData.weddingId,
            supplier_id: user.id,
            category: validatedData.category,
            severity: validatedData.severity,
            notes: validatedData.notes,
            verified: validatedData.verified || false,
            emergency_contact: validatedData.emergencyContact,
          })
          .select(
            `
            id,
            guest_name,
            wedding_id,
            category,
            severity,
            notes,
            verified,
            emergency_contact,
            created_at,
            updated_at
          `,
          )
          .single();

        if (insertError) {
          throw new Error(
            `Failed to create dietary requirement: ${insertError.message}`,
          );
        }

        return NextResponse.json(
          {
            success: true,
            data: requirement,
            message: 'Dietary requirement created successfully',
          },
          { status: 201 },
        );
      } catch (error) {
        console.error('Failed to create dietary requirement:', error);

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: error.errors,
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create dietary requirement',
            code: 'CREATE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      rateLimit: { requests: 30, window: '1m' }, // 30 creates per minute
      validateBody: true,
      logSensitiveData: false, // Don't log dietary information
    },
  )();
}

// PUT /api/catering/dietary - Update dietary requirement (SECURED)
export async function PUT(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ body, user, request: validatedRequest }) => {
      try {
        const validatedData = UpdateDietaryRequirementSchema.parse(body);
        const { id, ...updateData } = validatedData;

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Verify requirement exists and user has access (RLS will enforce this)
        const { data: existing, error: fetchError } = await supabase
          .from('dietary_requirements')
          .select('id, wedding_id, guest_name')
          .eq('id', id)
          .eq('supplier_id', user.id)
          .single();

        if (fetchError || !existing) {
          return NextResponse.json(
            {
              success: false,
              error: 'Dietary requirement not found or access denied',
              code: 'NOT_FOUND',
            },
            { status: 404 },
          );
        }

        // If guest name is being changed, check for duplicates
        if (
          updateData.guestName &&
          updateData.guestName !== existing.guest_name
        ) {
          const { data: duplicate } = await supabase
            .from('dietary_requirements')
            .select('id')
            .eq('wedding_id', existing.wedding_id)
            .eq('guest_name', updateData.guestName)
            .eq('supplier_id', user.id)
            .neq('id', id);

          if (duplicate && duplicate.length > 0) {
            return NextResponse.json(
              {
                success: false,
                error: `Another dietary requirement already exists for guest: ${updateData.guestName}`,
                code: 'DUPLICATE_GUEST',
              },
              { status: 409 },
            );
          }
        }

        // Convert camelCase to snake_case for database
        const dbUpdateData: any = {};
        if (updateData.guestName)
          dbUpdateData.guest_name = updateData.guestName;
        if (updateData.weddingId)
          dbUpdateData.wedding_id = updateData.weddingId;
        if (updateData.category) dbUpdateData.category = updateData.category;
        if (updateData.severity) dbUpdateData.severity = updateData.severity;
        if (updateData.notes) dbUpdateData.notes = updateData.notes;
        if (updateData.verified !== undefined)
          dbUpdateData.verified = updateData.verified;
        if (updateData.emergencyContact)
          dbUpdateData.emergency_contact = updateData.emergencyContact;

        // Update the requirement
        const { data: updated, error: updateError } = await supabase
          .from('dietary_requirements')
          .update(dbUpdateData)
          .eq('id', id)
          .eq('supplier_id', user.id)
          .select(
            `
            id,
            guest_name,
            wedding_id,
            category,
            severity,
            notes,
            verified,
            emergency_contact,
            created_at,
            updated_at
          `,
          )
          .single();

        if (updateError) {
          throw new Error(
            `Failed to update dietary requirement: ${updateError.message}`,
          );
        }

        return NextResponse.json({
          success: true,
          data: updated,
          message: 'Dietary requirement updated successfully',
        });
      } catch (error) {
        console.error('Failed to update dietary requirement:', error);

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: error.errors,
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to update dietary requirement',
            code: 'UPDATE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      rateLimit: { requests: 20, window: '1m' }, // 20 updates per minute
      validateBody: true,
      logSensitiveData: false,
    },
  )();
}

// DELETE /api/catering/dietary - Delete dietary requirement (SECURED)
export async function DELETE(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ user, request: validatedRequest }) => {
      try {
        const url = new URL(validatedRequest.url);
        const id = url.searchParams.get('id');

        if (!id) {
          return NextResponse.json(
            {
              success: false,
              error: 'Requirement ID is required',
              code: 'MISSING_ID',
            },
            { status: 400 },
          );
        }

        // Verify UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid requirement ID format',
              code: 'INVALID_ID',
            },
            { status: 400 },
          );
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Verify requirement exists and user has access
        const { data: existing, error: fetchError } = await supabase
          .from('dietary_requirements')
          .select('id, guest_name, severity, category')
          .eq('id', id)
          .eq('supplier_id', user.id)
          .single();

        if (fetchError || !existing) {
          return NextResponse.json(
            {
              success: false,
              error: 'Dietary requirement not found or access denied',
              code: 'NOT_FOUND',
            },
            { status: 404 },
          );
        }

        // Security check: High severity requirements (4-5) need additional confirmation
        if (existing.severity >= 4) {
          const confirmDelete = validatedRequest.headers.get(
            'x-confirm-delete-high-severity',
          );
          if (confirmDelete !== 'true') {
            return NextResponse.json(
              {
                success: false,
                error:
                  'High severity dietary requirements require confirmation',
                code: 'CONFIRMATION_REQUIRED',
                details: {
                  guest_name: existing.guest_name,
                  severity: existing.severity,
                  category: existing.category,
                  warning:
                    'This is a high-severity dietary requirement. Deletion could create safety risks.',
                },
              },
              { status: 409 },
            );
          }
        }

        // Delete the requirement
        const { error: deleteError } = await supabase
          .from('dietary_requirements')
          .delete()
          .eq('id', id)
          .eq('supplier_id', user.id);

        if (deleteError) {
          throw new Error(
            `Failed to delete dietary requirement: ${deleteError.message}`,
          );
        }

        return NextResponse.json({
          success: true,
          message: `Dietary requirement for ${existing.guest_name} deleted successfully`,
          data: {
            id: existing.id,
            guest_name: existing.guest_name,
            deleted_at: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to delete dietary requirement:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to delete dietary requirement',
            code: 'DELETE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      rateLimit: { requests: 10, window: '1m' }, // 10 deletes per minute (more restrictive)
      validateBody: false,
      logSensitiveData: false,
    },
  )();
}
