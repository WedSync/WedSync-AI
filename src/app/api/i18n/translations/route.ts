/**
 * Translation Management API Endpoint
 *
 * Handles CRUD operations for WedSync's multilingual platform system.
 * Supports namespaced translations, bulk operations, versioning, and fuzzy search.
 *
 * @fileoverview Translation API for WedSync multilingual support
 * @author WedSync Development Team
 * @since 2025-01-09
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

// ===== TYPE DEFINITIONS =====

/**
 * Translation record structure
 */
interface Translation {
  id: string;
  key: string;
  value: string;
  locale: string;
  namespace: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  is_active: boolean;
  completion_status: 'draft' | 'review' | 'approved' | 'deprecated';
}

/**
 * Translation history record
 */
interface TranslationHistory {
  id: string;
  translation_id: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
  change_reason?: string;
}

/**
 * API response wrapper
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

// ===== VALIDATION SCHEMAS =====

/**
 * Schema for GET request query parameters
 */
const getTranslationsSchema = z.object({
  locale: z.string().min(2).max(10).optional(),
  namespace: z.string().min(1).max(50).optional(),
  key: z.string().min(1).max(100).optional(),
  search: z.string().min(1).max(100).optional(),
  status: z.enum(['draft', 'review', 'approved', 'deprecated']).optional(),
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
  include_inactive: z.coerce.boolean().default(false),
});

/**
 * Schema for creating new translations
 */
const createTranslationSchema = z.object({
  key: z
    .string()
    .min(1, 'Translation key is required')
    .max(100, 'Translation key too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid key format'),
  value: z
    .string()
    .min(1, 'Translation value is required')
    .max(5000, 'Translation value too long'),
  locale: z
    .string()
    .min(2, 'Locale code required')
    .max(10, 'Locale code too long')
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid locale format'),
  namespace: z
    .string()
    .min(1, 'Namespace is required')
    .max(50, 'Namespace too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid namespace format'),
  completion_status: z.enum(['draft', 'review', 'approved']).default('draft'),
});

/**
 * Schema for bulk translation operations
 */
const bulkTranslationsSchema = z.object({
  translations: z
    .array(createTranslationSchema)
    .min(1, 'At least one translation required')
    .max(100, 'Too many translations in bulk operation'),
  replace_existing: z.boolean().default(false),
});

/**
 * Schema for updating translations
 */
const updateTranslationSchema = z
  .object({
    id: z.string().uuid('Invalid translation ID'),
    value: z
      .string()
      .min(1, 'Translation value is required')
      .max(5000, 'Translation value too long')
      .optional(),
    completion_status: z
      .enum(['draft', 'review', 'approved', 'deprecated'])
      .optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.value !== undefined ||
      data.completion_status !== undefined ||
      data.is_active !== undefined,
    { message: 'At least one field must be updated' },
  );

/**
 * Schema for deleting translations
 */
const deleteTranslationsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
  soft_delete: z.boolean().default(true),
});

// ===== UTILITY FUNCTIONS =====

/**
 * Creates a standardized API response
 */
function createResponse<T>(
  success: boolean,
  data?: T,
  error?: ApiResponse['error'],
  meta?: ApiResponse['meta'],
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = { success };

  if (data !== undefined) response.data = data;
  if (error) response.error = error;
  if (meta) response.meta = meta;

  const status = success ? 200 : error?.code === 'VALIDATION_ERROR' ? 400 : 500;

  return NextResponse.json(response, { status });
}

/**
 * Simple rate limiting using in-memory store
 * Note: In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60000,
): { success: boolean; reset?: number } {
  const now = Date.now();
  const key = identifier;

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  if (record.count >= limit) {
    return { success: false, reset: record.resetTime };
  }

  record.count++;
  return { success: true };
}

/**
 * Validates user permissions for admin operations
 */
async function validateAdminPermissions(
  supabase: any,
  userId: string,
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('id', userId)
      .single();

    if (error || !profile) return false;

    // Check if user has admin role or specific i18n permissions
    return (
      profile.role === 'admin' ||
      profile.role === 'super_admin' ||
      (profile.permissions &&
        profile.permissions.includes('manage_translations'))
    );
  } catch (error) {
    console.error('Permission validation error:', error);
    return false;
  }
}

/**
 * Performs fuzzy search on translation keys and values
 */
function buildFuzzySearchQuery(search: string) {
  // Create search pattern for PostgreSQL full-text search
  const searchTerms = search.trim().toLowerCase().split(/\s+/);
  return searchTerms.map((term) => `${term}:*`).join(' | ');
}

/**
 * Records translation change in history table
 */
async function recordTranslationHistory(
  supabase: any,
  translationId: string,
  oldValue: string,
  newValue: string,
  userId: string,
  reason?: string,
): Promise<void> {
  try {
    await supabase.from('translation_history').insert({
      translation_id: translationId,
      old_value: oldValue,
      new_value: newValue,
      changed_by: userId,
      change_reason: reason,
      changed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to record translation history:', error);
    // Don't throw - history is nice-to-have, not critical
  }
}

// ===== API HANDLERS =====

/**
 * GET /api/i18n/translations
 *
 * Retrieves translations based on query parameters.
 * Supports filtering, searching, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('remote-addr') ??
      'anonymous';
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.success) {
      return createResponse(false, null, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: { reset_time: rateLimitResult.reset },
      });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const validationResult = getTranslationsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: validationResult.error.flatten(),
      });
    }

    const params = validationResult.data;

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
      cookies: () => cookieStore,
    });

    // Build query
    let query = supabase.from('translations').select('*', { count: 'exact' });

    // Apply filters
    if (params.locale) {
      query = query.eq('locale', params.locale);
    }

    if (params.namespace) {
      query = query.eq('namespace', params.namespace);
    }

    if (params.key) {
      query = query.eq('key', params.key);
    }

    if (params.status) {
      query = query.eq('completion_status', params.status);
    }

    if (!params.include_inactive) {
      query = query.eq('is_active', true);
    }

    // Apply fuzzy search
    if (params.search) {
      query = query.or(
        `key.ilike.%${params.search}%,value.ilike.%${params.search}%`,
      );
    }

    // Apply pagination
    const offset = (params.page - 1) * params.per_page;
    query = query
      .range(offset, offset + params.per_page - 1)
      .order('updated_at', { ascending: false });

    // Execute query
    const { data: translations, error, count } = await query;

    if (error) {
      console.error('Database query error:', error);
      return createResponse(false, null, {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve translations',
        details: { database_error: error.message },
      });
    }

    // Calculate pagination meta
    const totalPages = count ? Math.ceil(count / params.per_page) : 0;
    const hasMore = params.page < totalPages;

    return createResponse(true, translations, undefined, {
      total: count || 0,
      page: params.page,
      per_page: params.per_page,
      has_more: hasMore,
    });
  } catch (error) {
    console.error('GET /api/i18n/translations error:', error);
    return createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: { error: String(error) },
    });
  }
}

/**
 * POST /api/i18n/translations
 *
 * Creates new translations (single or bulk).
 * Requires admin permissions.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('remote-addr') ??
      'anonymous';
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.success) {
      return createResponse(false, null, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      });
    }

    // Initialize Supabase client and get user
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
      cookies: () => cookieStore,
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createResponse(false, null, {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Validate admin permissions
    const hasPermissions = await validateAdminPermissions(supabase, user.id);
    if (!hasPermissions) {
      return createResponse(false, null, {
        code: 'FORBIDDEN',
        message: 'Admin permissions required for this operation',
      });
    }

    // Parse request body
    const body = await request.json();

    // Determine if this is a bulk operation
    const isBulkOperation = Array.isArray(body.translations);

    let validationResult;
    if (isBulkOperation) {
      validationResult = bulkTranslationsSchema.safeParse(body);
    } else {
      validationResult = createTranslationSchema.safeParse(body);
    }

    if (!validationResult.success) {
      return createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid translation data',
        details: validationResult.error.flatten(),
      });
    }

    const validatedData = validationResult.data;

    // Prepare translations for insertion
    const translationsToInsert = isBulkOperation
      ? validatedData.translations
      : [validatedData];

    const insertData = translationsToInsert.map((translation: any) => ({
      ...translation,
      version: 1,
      created_by: user.id,
      updated_by: user.id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Handle existing translations if replace_existing is true
    if (isBulkOperation && validatedData.replace_existing) {
      const keys = translationsToInsert.map((t: any) => t.key);
      const locales = translationsToInsert.map((t: any) => t.locale);
      const namespaces = translationsToInsert.map((t: any) => t.namespace);

      await supabase
        .from('translations')
        .update({ is_active: false })
        .in('key', keys)
        .in('locale', locales)
        .in('namespace', namespaces);
    }

    // Insert new translations
    const { data: insertedTranslations, error: insertError } = await supabase
      .from('translations')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Translation insertion error:', insertError);

      // Handle unique constraint violations
      if (insertError.code === '23505') {
        return createResponse(false, null, {
          code: 'DUPLICATE_TRANSLATION',
          message:
            'Translation with this key, locale, and namespace already exists',
        });
      }

      return createResponse(false, null, {
        code: 'DATABASE_ERROR',
        message: 'Failed to create translations',
        details: { database_error: insertError.message },
      });
    }

    // Log successful creation
    console.log(
      `Created ${insertedTranslations.length} translations by user ${user.id}`,
    );

    return createResponse(true, insertedTranslations);
  } catch (error) {
    console.error('POST /api/i18n/translations error:', error);
    return createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: { error: String(error) },
    });
  }
}

/**
 * PUT /api/i18n/translations
 *
 * Updates existing translations.
 * Requires admin permissions and maintains version history.
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const identifier =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('remote-addr') ??
      'anonymous';
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.success) {
      return createResponse(false, null, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      });
    }

    // Initialize Supabase client and get user
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
      cookies: () => cookieStore,
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createResponse(false, null, {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Validate admin permissions
    const hasPermissions = await validateAdminPermissions(supabase, user.id);
    if (!hasPermissions) {
      return createResponse(false, null, {
        code: 'FORBIDDEN',
        message: 'Admin permissions required for this operation',
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTranslationSchema.safeParse(body);

    if (!validationResult.success) {
      return createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid update data',
        details: validationResult.error.flatten(),
      });
    }

    const { id, ...updateData } = validationResult.data;

    // Get current translation for history tracking
    const { data: currentTranslation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentTranslation) {
      return createResponse(false, null, {
        code: 'NOT_FOUND',
        message: 'Translation not found',
      });
    }

    // Prepare update data
    const updatePayload = {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      version: currentTranslation.version + 1,
    };

    // Update translation
    const { data: updatedTranslation, error: updateError } = await supabase
      .from('translations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Translation update error:', updateError);
      return createResponse(false, null, {
        code: 'DATABASE_ERROR',
        message: 'Failed to update translation',
        details: { database_error: updateError.message },
      });
    }

    // Record history if value changed
    if (updateData.value && updateData.value !== currentTranslation.value) {
      await recordTranslationHistory(
        supabase,
        id,
        currentTranslation.value,
        updateData.value,
        user.id,
        'Translation updated via API',
      );
    }

    console.log(`Updated translation ${id} by user ${user.id}`);

    return createResponse(true, updatedTranslation);
  } catch (error) {
    console.error('PUT /api/i18n/translations error:', error);
    return createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: { error: String(error) },
    });
  }
}

/**
 * DELETE /api/i18n/translations
 *
 * Deletes translations (soft delete by default).
 * Requires admin permissions.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const identifier =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('remote-addr') ??
      'anonymous';
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.success) {
      return createResponse(false, null, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      });
    }

    // Initialize Supabase client and get user
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
      cookies: () => cookieStore,
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createResponse(false, null, {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Validate admin permissions
    const hasPermissions = await validateAdminPermissions(supabase, user.id);
    if (!hasPermissions) {
      return createResponse(false, null, {
        code: 'FORBIDDEN',
        message: 'Admin permissions required for this operation',
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = deleteTranslationsSchema.safeParse(body);

    if (!validationResult.success) {
      return createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid delete request',
        details: validationResult.error.flatten(),
      });
    }

    const { ids, soft_delete } = validationResult.data;

    let result;

    if (soft_delete) {
      // Soft delete - set is_active to false
      result = await supabase
        .from('translations')
        .update({
          is_active: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select();
    } else {
      // Hard delete - permanently remove
      result = await supabase
        .from('translations')
        .delete()
        .in('id', ids)
        .select();
    }

    const { data: deletedTranslations, error: deleteError } = result;

    if (deleteError) {
      console.error('Translation deletion error:', deleteError);
      return createResponse(false, null, {
        code: 'DATABASE_ERROR',
        message: 'Failed to delete translations',
        details: { database_error: deleteError.message },
      });
    }

    if (!deletedTranslations || deletedTranslations.length === 0) {
      return createResponse(false, null, {
        code: 'NOT_FOUND',
        message: 'No translations found with provided IDs',
      });
    }

    console.log(
      `${soft_delete ? 'Soft' : 'Hard'} deleted ${deletedTranslations.length} translations by user ${user.id}`,
    );

    return createResponse(true, {
      deleted_count: deletedTranslations.length,
      soft_delete,
      deleted_translations: deletedTranslations,
    });
  } catch (error) {
    console.error('DELETE /api/i18n/translations error:', error);
    return createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: { error: String(error) },
    });
  }
}
