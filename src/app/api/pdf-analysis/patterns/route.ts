/**
 * PDF Analysis Patterns API Endpoint
 * WS-242: AI PDF Analysis System - Wedding Field Pattern Management
 *
 * Manages wedding industry field patterns for improved extraction accuracy
 * Includes pattern creation, optimization, and performance tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';

// Pattern validation schema
const createPatternSchema = z.object({
  patternName: z.string().min(1).max(100),
  fieldType: z.enum([
    'client_name',
    'email',
    'phone',
    'wedding_date',
    'venue_name',
    'budget',
    'guest_count',
    'other',
  ]),
  regex: z.string().min(1),
  priority: z.number().int().min(1).max(100).default(50),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  contextKeywords: z.array(z.string()).optional(),
  validationRules: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      format: z.string().optional(),
      required: z.boolean().optional(),
    })
    .optional(),
});

const updatePatternSchema = createPatternSchema.partial().extend({
  id: z.string().uuid(),
});

const bulkPatternSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'test']),
  patternIds: z.array(z.string().uuid()),
  testText: z.string().optional(), // For testing action
});

/**
 * GET /api/pdf-analysis/patterns
 * Get all wedding field patterns with filtering and performance metrics
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = new URL(request.url).searchParams;
    const fieldType = searchParams.get('fieldType');
    const isActive = searchParams.get('isActive');
    const includeMetrics = searchParams.get('includeMetrics') === 'true';
    const sortBy = searchParams.get('sortBy') || 'success_rate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get user's organization for context
    const { data: organizations, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);

    if (orgError || !organizations?.length) {
      return NextResponse.json(
        { error: 'No organization access', code: 'NO_ACCESS' },
        { status: 403 },
      );
    }

    const repository = createPDFAnalysisRepository();

    // Get patterns with optional filtering
    const filters = {
      ...(fieldType && { fieldType }),
      ...(isActive !== null && { isActive: isActive === 'true' }),
    };

    const patterns = await repository.getWeddingFieldPatterns(filters, {
      includeMetrics,
      sortBy,
      sortOrder,
    });

    // Calculate system-wide pattern statistics
    const systemStats = {
      totalPatterns: patterns.length,
      activePatterns: patterns.filter((p) => p.is_active).length,
      patternsByFieldType: patterns.reduce((acc: any, pattern) => {
        acc[pattern.field_type] = (acc[pattern.field_type] || 0) + 1;
        return acc;
      }, {}),
      averageSuccessRate:
        patterns.reduce((sum, p) => sum + (p.success_rate || 0), 0) /
          patterns.length || 0,
      topPerformingPatterns: patterns
        .filter((p) => p.success_rate && p.success_rate > 0.8)
        .slice(0, 5),
      lowPerformingPatterns: patterns
        .filter((p) => p.success_rate && p.success_rate < 0.3)
        .slice(0, 5),
    };

    return NextResponse.json({
      success: true,
      data: {
        patterns: patterns.map((pattern) => ({
          id: pattern.id,
          patternName: pattern.pattern_name,
          fieldType: pattern.field_type,
          regex: pattern.regex_pattern,
          priority: pattern.priority,
          isActive: pattern.is_active,
          description: pattern.description,
          contextKeywords: pattern.context_keywords,
          validationRules: pattern.validation_rules,
          // Performance metrics (if requested)
          ...(includeMetrics && {
            successRate: pattern.success_rate,
            usageCount: pattern.usage_count,
            averageConfidence: pattern.avg_confidence,
            lastUsed: pattern.last_used_at,
            falsePositiveRate: pattern.false_positive_rate,
          }),
          createdAt: pattern.created_at,
          updatedAt: pattern.updated_at,
        })),
        statistics: systemStats,
      },
      meta: {
        includeMetrics,
        filters: filters,
        total: patterns.length,
      },
    });
  } catch (error) {
    console.error('Patterns retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve patterns',
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
 * POST /api/pdf-analysis/patterns
 * Create new wedding field patterns
 */
export async function POST(request: NextRequest) {
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

    // Only allow admin users to create patterns
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (userProfile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'ADMIN_REQUIRED' },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Support both single pattern and array of patterns
    const isArray = Array.isArray(body);
    const patterns = isArray ? body : [body];

    // Validate all patterns
    const validationResults = patterns.map((pattern) =>
      createPatternSchema.safeParse(pattern),
    );
    const hasErrors = validationResults.some((result) => !result.success);

    if (hasErrors) {
      const errors = validationResults
        .map((result, index) => ({
          index,
          errors: result.success ? null : result.error.issues,
        }))
        .filter((item) => item.errors);

      return NextResponse.json(
        {
          error: 'Invalid pattern data',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        { status: 400 },
      );
    }

    const validPatterns = validationResults.map((result) => result.data!);

    // Test patterns for basic regex validity
    const regexTests = validPatterns.map((pattern, index) => {
      try {
        new RegExp(pattern.regex);
        return { index, valid: true };
      } catch (error) {
        return { index, valid: false, error: error.message };
      }
    });

    const invalidRegex = regexTests.filter((test) => !test.valid);
    if (invalidRegex.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid regex patterns',
          code: 'INVALID_REGEX',
          details: invalidRegex,
        },
        { status: 400 },
      );
    }

    const repository = createPDFAnalysisRepository();

    // Create patterns
    const createdPatterns = await repository.createWeddingFieldPatterns(
      validPatterns.map((pattern) => ({
        patternName: pattern.patternName,
        fieldType: pattern.fieldType,
        regexPattern: pattern.regex,
        priority: pattern.priority,
        isActive: pattern.isActive,
        description: pattern.description,
        contextKeywords: pattern.contextKeywords || [],
        validationRules: pattern.validationRules || {},
        createdByUserId: user.id,
      })),
    );

    return NextResponse.json(
      {
        success: true,
        message: `${createdPatterns.length} pattern${createdPatterns.length === 1 ? '' : 's'} created successfully`,
        data: {
          patterns: createdPatterns,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Pattern creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create patterns',
        code: 'CREATION_ERROR',
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
 * PUT /api/pdf-analysis/patterns
 * Update existing patterns
 */
export async function PUT(request: NextRequest) {
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

    // Only allow admin users to update patterns
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (userProfile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'ADMIN_REQUIRED' },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Support both single pattern and array of patterns
    const isArray = Array.isArray(body);
    const patterns = isArray ? body : [body];

    // Validate all patterns
    const validationResults = patterns.map((pattern) =>
      updatePatternSchema.safeParse(pattern),
    );
    const hasErrors = validationResults.some((result) => !result.success);

    if (hasErrors) {
      const errors = validationResults
        .map((result, index) => ({
          index,
          errors: result.success ? null : result.error.issues,
        }))
        .filter((item) => item.errors);

      return NextResponse.json(
        {
          error: 'Invalid pattern data',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        { status: 400 },
      );
    }

    const validPatterns = validationResults.map((result) => result.data!);

    // Test regex patterns if provided
    const patternsWithRegex = validPatterns.filter((p) => p.regex);
    for (const pattern of patternsWithRegex) {
      try {
        new RegExp(pattern.regex!);
      } catch (error) {
        return NextResponse.json(
          {
            error: `Invalid regex pattern for ${pattern.patternName}: ${error.message}`,
            code: 'INVALID_REGEX',
          },
          { status: 400 },
        );
      }
    }

    const repository = createPDFAnalysisRepository();

    // Update patterns
    const updatedPatterns = await repository.updateWeddingFieldPatterns(
      validPatterns.map((pattern) => ({
        id: pattern.id,
        ...(pattern.patternName && { patternName: pattern.patternName }),
        ...(pattern.fieldType && { fieldType: pattern.fieldType }),
        ...(pattern.regex && { regexPattern: pattern.regex }),
        ...(pattern.priority !== undefined && { priority: pattern.priority }),
        ...(pattern.isActive !== undefined && { isActive: pattern.isActive }),
        ...(pattern.description !== undefined && {
          description: pattern.description,
        }),
        ...(pattern.contextKeywords && {
          contextKeywords: pattern.contextKeywords,
        }),
        ...(pattern.validationRules && {
          validationRules: pattern.validationRules,
        }),
        updatedByUserId: user.id,
      })),
    );

    return NextResponse.json({
      success: true,
      message: `${updatedPatterns.length} pattern${updatedPatterns.length === 1 ? '' : 's'} updated successfully`,
      data: {
        patterns: updatedPatterns,
      },
    });
  } catch (error) {
    console.error('Pattern update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update patterns',
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
 * PATCH /api/pdf-analysis/patterns
 * Bulk operations on patterns (activate, deactivate, test, etc.)
 */
export async function PATCH(request: NextRequest) {
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

    // Only allow admin users for bulk operations
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (userProfile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'ADMIN_REQUIRED' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validationResult = bulkPatternSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid bulk operation data',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { action, patternIds, testText } = validationResult.data;
    const repository = createPDFAnalysisRepository();
    let result;

    switch (action) {
      case 'activate':
        result = await repository.bulkUpdatePatternStatus(
          patternIds,
          true,
          user.id,
        );
        break;

      case 'deactivate':
        result = await repository.bulkUpdatePatternStatus(
          patternIds,
          false,
          user.id,
        );
        break;

      case 'delete':
        result = await repository.bulkDeletePatterns(patternIds, user.id);
        break;

      case 'test':
        if (!testText) {
          return NextResponse.json(
            {
              error: 'Test text required for test action',
              code: 'INVALID_REQUEST',
            },
            { status: 400 },
          );
        }
        result = await repository.testPatternsAgainstText(patternIds, testText);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid bulk action', code: 'INVALID_ACTION' },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: result,
    });
  } catch (error) {
    console.error('Bulk pattern operation error:', error);
    return NextResponse.json(
      {
        error: 'Bulk operation failed',
        code: 'BULK_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}
