import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import {
  CreateMappingsSchema,
  secureUuidSchema,
  RATE_LIMITS,
} from '@/lib/validations/auto-population-schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// Rate limiter for mapping operations
const mappingsRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.mappings.windowMs,
  max: RATE_LIMITS.mappings.requests,
  message: RATE_LIMITS.mappings.message,
  keyGenerator: (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      return `mappings:${authHeader}`;
    }
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    return `mappings-ip:${forwarded?.split(',')[0] || realIp || '127.0.0.1'}`;
  },
});

/**
 * POST /api/auto-population/mappings
 * Create or update field mappings for supplier forms
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await mappingsRateLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many mapping requests',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        },
      );
    }

    // Authentication
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = CreateMappingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mapping data',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { formId, mappings } = validationResult.data;

    // Get user organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', authResult.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 403 },
      );
    }

    // Prepare mapping inserts
    const mappingInserts = mappings.map((mapping) => ({
      organization_id: profile.organization_id,
      form_id: formId,
      form_field_id: mapping.formFieldId,
      form_field_name: `field_${mapping.formFieldId}`, // Placeholder - should be from form definition
      core_field_key: mapping.coreFieldKey,
      confidence: mapping.confidence,
      transformation_rule: mapping.transformationRule,
      priority: mapping.priority,
      is_verified: mapping.isVerified || false,
      is_active: true,
      usage_count: 0,
      accuracy_score: mapping.confidence, // Start with confidence as initial accuracy
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: authResult.user.id,
    }));

    // Upsert mappings (update if exists, insert if new)
    const { data, error } = await supabase
      .from('form_field_mappings')
      .upsert(mappingInserts, {
        onConflict: 'organization_id,form_id,form_field_id',
      })
      .select();

    if (error) {
      console.error('Error creating mappings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create field mappings' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Field mappings created successfully',
        mappingsCreated: data?.length || 0,
        mappings: data?.map((m) => ({
          id: m.id,
          formFieldId: m.form_field_id,
          coreFieldKey: m.core_field_key,
          confidence: m.confidence,
          priority: m.priority,
          isVerified: m.is_verified,
        })),
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        },
      },
    );
  } catch (error) {
    console.error('Create mappings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create mappings' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auto-population/mappings?formId=xxx
 * Get existing field mappings for a form
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await mappingsRateLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        },
      );
    }

    // Authentication
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get and validate form ID from query params
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'Form ID required' },
        { status: 400 },
      );
    }

    // Validate form ID format
    const formIdValidation = secureUuidSchema.safeParse(formId);
    if (!formIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid form ID format' },
        { status: 400 },
      );
    }

    // Get user organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', authResult.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 403 },
      );
    }

    // Get existing mappings for this organization and form
    const { data: mappings, error } = await supabase
      .from('form_field_mappings')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('form_id', formIdValidation.data)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Failed to get mappings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get field mappings' },
        { status: 500 },
      );
    }

    // Get core field definitions for reference
    const coreFieldDefinitions = [
      { key: 'couple_name_1', label: 'Partner 1 Name', type: 'text' },
      { key: 'couple_name_2', label: 'Partner 2 Name', type: 'text' },
      { key: 'wedding_date', label: 'Wedding Date', type: 'date' },
      { key: 'venue_name', label: 'Venue Name', type: 'text' },
      { key: 'venue_address', label: 'Venue Address', type: 'text' },
      { key: 'guest_count', label: 'Number of Guests', type: 'number' },
      { key: 'budget_amount', label: 'Wedding Budget', type: 'number' },
      { key: 'contact_email', label: 'Contact Email', type: 'email' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'phone' },
    ];

    return NextResponse.json(
      {
        success: true,
        mappings:
          mappings?.map((m) => ({
            id: m.id,
            formFieldId: m.form_field_id,
            formFieldName: m.form_field_name,
            coreFieldKey: m.core_field_key,
            confidence: m.confidence,
            transformationRule: m.transformation_rule,
            priority: m.priority,
            isVerified: m.is_verified,
            usageCount: m.usage_count,
            accuracyScore: m.accuracy_score,
            lastUsedAt: m.last_used_at,
            createdAt: m.created_at,
          })) || [],
        coreFieldDefinitions,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        },
      },
    );
  } catch (error) {
    console.error('Get mappings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get mappings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/auto-population/mappings
 * Update existing field mappings
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await mappingsRateLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        },
      );
    }

    // Authentication
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = CreateMappingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mapping data',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { formId, mappings } = validationResult.data;

    // Get user organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', authResult.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 403 },
      );
    }

    // Update mappings one by one to maintain data integrity
    const updatePromises = mappings.map(async (mapping) => {
      return supabase
        .from('form_field_mappings')
        .update({
          core_field_key: mapping.coreFieldKey,
          confidence: mapping.confidence,
          transformation_rule: mapping.transformationRule,
          priority: mapping.priority,
          is_verified: mapping.isVerified || false,
          updated_at: new Date().toISOString(),
          verified_by: mapping.isVerified ? authResult.user.id : null,
          verified_at: mapping.isVerified ? new Date().toISOString() : null,
        })
        .eq('organization_id', profile.organization_id)
        .eq('form_id', formId)
        .eq('form_field_id', mapping.formFieldId)
        .select();
    });

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Error updating mappings:', errors);
      return NextResponse.json(
        { success: false, error: 'Failed to update some mappings' },
        { status: 500 },
      );
    }

    const updatedCount = results.reduce(
      (count, result) => count + (result.data?.length || 0),
      0,
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Field mappings updated successfully',
        mappingsUpdated: updatedCount,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        },
      },
    );
  } catch (error) {
    console.error('Update mappings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update mappings' },
      { status: 500 },
    );
  }
}
