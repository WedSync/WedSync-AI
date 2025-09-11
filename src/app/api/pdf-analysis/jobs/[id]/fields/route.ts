/**
 * PDF Analysis Job Fields API Endpoint
 * WS-242: AI PDF Analysis System - Field Management
 *
 * Manages extracted form fields for individual PDF analysis jobs
 * Includes validation, correction, and approval workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';

// Field validation schema
const fieldUpdateSchema = z.object({
  fieldName: z.string().min(1),
  extractedValue: z.string(),
  validatedValue: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  isCorrect: z.boolean().optional(),
  needsReview: z.boolean().optional(),
  validatorNotes: z.string().optional(),
});

const bulkFieldUpdateSchema = z.object({
  fields: z.array(fieldUpdateSchema),
  approvalStatus: z.enum(['approved', 'needs_review', 'rejected']).optional(),
  reviewNotes: z.string().optional(),
});

/**
 * GET /api/pdf-analysis/jobs/[id]/fields
 * Get all extracted fields for a specific job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const jobId = params.id;

    // Verify job exists and user has access
    const { data: job, error: jobError } = await supabase
      .from('pdf_analysis_jobs')
      .select(
        `
        id,
        job_name,
        status,
        supplier_id,
        supplier:suppliers(organization_id)
      `,
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access to organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', job.supplier.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Get fields with validation status
    const repository = createPDFAnalysisRepository();
    const fields = await repository.getJobFields(jobId, {
      includeValidations: true,
      includeConfidenceScores: true,
      groupByFieldType: false,
    });

    // Calculate field statistics
    const stats = {
      totalFields: fields.length,
      validatedFields: fields.filter((f) => f.is_validated).length,
      fieldsNeedingReview: fields.filter((f) => f.needs_manual_review).length,
      averageConfidence:
        fields.reduce((sum, f) => sum + (f.confidence_score || 0), 0) /
          fields.length || 0,
      fieldTypes: [...new Set(fields.map((f) => f.field_type))],
      highConfidenceFields: fields.filter(
        (f) => (f.confidence_score || 0) > 0.8,
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: job.id,
          name: job.job_name,
          status: job.status,
        },
        fields: fields.map((field) => ({
          id: field.id,
          fieldName: field.field_name,
          fieldType: field.field_type,
          extractedValue: field.extracted_value,
          validatedValue: field.validated_value,
          confidence: field.confidence_score,
          isValidated: field.is_validated,
          needsReview: field.needs_manual_review,
          boundingBox: field.bounding_box,
          extractionMethod: field.extraction_method,
          validatedAt: field.validated_at,
          validatedBy: field.validated_by_user_id,
          createdAt: field.created_at,
        })),
        statistics: stats,
      },
    });
  } catch (error) {
    console.error('Fields retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve fields',
        code: 'RETRIEVAL_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/pdf-analysis/jobs/[id]/fields
 * Update multiple fields for a job (validation/correction)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const jobId = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = bulkFieldUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid field data',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { fields, approvalStatus, reviewNotes } = validationResult.data;

    // Verify job access (same as GET)
    const { data: job, error: jobError } = await supabase
      .from('pdf_analysis_jobs')
      .select(
        `
        id,
        status,
        supplier_id,
        supplier:suppliers(organization_id)
      `,
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access to organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', job.supplier.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    const repository = createPDFAnalysisRepository();

    // Update fields in batch
    const updatedFields = await repository.updateFieldsBatch(
      jobId,
      fields.map((field) => ({
        fieldName: field.fieldName,
        validatedValue: field.validatedValue || field.extractedValue,
        isCorrect: field.isCorrect ?? true,
        needsReview: field.needsReview ?? false,
        validatorNotes: field.validatorNotes,
        validatedByUserId: user.id,
      })),
    );

    // Update job status if approval status provided
    if (approvalStatus) {
      await repository.updateJobValidationStatus(jobId, {
        status: approvalStatus,
        reviewNotes,
        reviewedByUserId: user.id,
        reviewedAt: new Date().toISOString(),
      });
    }

    // Calculate updated statistics
    const allFields = await repository.getJobFields(jobId);
    const validationStats = {
      totalFields: allFields.length,
      validatedFields: allFields.filter((f) => f.is_validated).length,
      fieldsNeedingReview: allFields.filter((f) => f.needs_manual_review)
        .length,
      averageConfidence:
        allFields.reduce((sum, f) => sum + (f.confidence_score || 0), 0) /
          allFields.length || 0,
      completionPercentage:
        (allFields.filter((f) => f.is_validated).length / allFields.length) *
        100,
    };

    return NextResponse.json({
      success: true,
      message: `${updatedFields.length} fields updated successfully`,
      data: {
        updatedFields,
        validationStats,
        jobStatus: job.status,
      },
    });
  } catch (error) {
    console.error('Fields update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update fields',
        code: 'UPDATE_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pdf-analysis/jobs/[id]/fields
 * Quick validation actions (approve all, reject all, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const jobId = params.id;
    const { action, fieldIds, notes } = await request.json();

    // Verify job access
    const { data: job, error: jobError } = await supabase
      .from('pdf_analysis_jobs')
      .select(
        `
        id,
        supplier_id,
        supplier:suppliers(organization_id)
      `,
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access to organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', job.supplier.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    const repository = createPDFAnalysisRepository();
    let result;

    switch (action) {
      case 'approve_all':
        result = await repository.approveAllFields(jobId, {
          validatedByUserId: user.id,
          notes,
        });
        break;

      case 'approve_high_confidence':
        result = await repository.approveHighConfidenceFields(jobId, {
          confidenceThreshold: 0.8,
          validatedByUserId: user.id,
          notes,
        });
        break;

      case 'flag_for_review':
        if (!fieldIds || !Array.isArray(fieldIds)) {
          return NextResponse.json(
            {
              error: 'Field IDs required for flag action',
              code: 'INVALID_REQUEST',
            },
            { status: 400 },
          );
        }
        result = await repository.flagFieldsForReview(fieldIds, {
          flaggedByUserId: user.id,
          notes,
        });
        break;

      case 'clear_review_flags':
        result = await repository.clearReviewFlags(jobId, {
          clearedByUserId: user.id,
          notes,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action', code: 'INVALID_ACTION' },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: `Action '${action}' completed successfully`,
      data: result,
    });
  } catch (error) {
    console.error('Field action error:', error);
    return NextResponse.json(
      {
        error: 'Action failed',
        code: 'ACTION_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}
