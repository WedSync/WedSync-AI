import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formSchema, formSubmissionSchema } from '@/lib/validations/forms';
import { generateSecureId } from '@/lib/crypto-utils';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for form operations
const formRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// CSRF token validation
function validateCSRFToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionToken = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return false;
  }

  return true;
}

// Sanitize form data with DOMPurify
function sanitizeFormData(data: any): any {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeFormData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeFormData(value);
    }
    return sanitized;
  }

  return data;
}

// GET /api/forms - List forms for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await formRateLimit.check(100, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('forms')
      .select(
        `
        id,
        title,
        description,
        status,
        is_published,
        created_at,
        updated_at,
        _count:form_submissions(count)
      `,
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: forms, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      forms: forms || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Form list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 },
    );
  }
}

// POST /api/forms - Create new form
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await formRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many form creation requests' },
        { status: 429 },
      );
    }

    // CSRF protection
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeFormData(rawBody);

    // Validate form data
    const validatedForm = formSchema.parse(sanitizedBody);

    // Generate secure form ID
    const formId = generateSecureId(16);

    // Create form in database
    const { data: form, error: dbError } = await supabase
      .from('forms')
      .insert({
        id: formId,
        title: validatedForm.title,
        description: validatedForm.description,
        sections: validatedForm.sections,
        settings: validatedForm.settings,
        status: validatedForm.isPublished ? 'published' : 'draft',
        is_published: validatedForm.isPublished,
        slug: validatedForm.slug,
        created_by: user.id,
        organization_id: user.user_metadata?.organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        form,
        message: 'Form created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Form creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid form data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create form',
      },
      { status: 500 },
    );
  }
}

// POST /api/forms/submit - Submit form data (internal function)
async function POST_SUBMIT(request: NextRequest) {
  try {
    // Rate limiting for submissions
    const identifier = request.ip || 'anonymous';
    const { success } = await formRateLimit.check(20, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many submission attempts' },
        { status: 429 },
      );
    }

    // CSRF protection
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Parse and sanitize submission data
    const rawBody = await request.json();
    const sanitizedBody = sanitizeFormData(rawBody);

    // Validate submission
    const validatedSubmission = formSubmissionSchema.parse(sanitizedBody);

    // Verify form exists and is published
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, status, settings, sections')
      .eq('id', validatedSubmission.formId)
      .eq('status', 'published')
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or not published' },
        { status: 404 },
      );
    }

    // Check if authentication is required
    if (form.settings?.requireLogin) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }
    }

    // Validate submission data against form schema
    const submissionErrors: string[] = [];

    for (const section of form.sections) {
      for (const field of section.fields) {
        const value = validatedSubmission.data[field.id];

        // Check required fields
        if (
          field.validation?.required &&
          (value === null || value === undefined || value === '')
        ) {
          submissionErrors.push(`${field.label} is required`);
        }

        // Validate field-specific rules
        if (value && typeof value === 'string') {
          if (
            field.validation?.minLength &&
            value.length < field.validation.minLength
          ) {
            submissionErrors.push(`${field.label} is too short`);
          }
          if (
            field.validation?.maxLength &&
            value.length > field.validation.maxLength
          ) {
            submissionErrors.push(`${field.label} is too long`);
          }
          if (
            field.validation?.pattern &&
            !new RegExp(field.validation.pattern).test(value)
          ) {
            submissionErrors.push(`${field.label} format is invalid`);
          }
        }
      }
    }

    if (submissionErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: submissionErrors,
        },
        { status: 400 },
      );
    }

    // Generate secure submission ID
    const submissionId = generateSecureId(16);

    // Save submission
    const { data: submission, error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        id: submissionId,
        form_id: validatedSubmission.formId,
        data: validatedSubmission.data,
        metadata: {
          ...validatedSubmission.metadata,
          ipAddress: request.ip,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        },
        status: 'completed',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (submitError) {
      throw new Error(`Submission failed: ${submitError.message}`);
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message:
        form.settings?.successMessage || 'Thank you for your submission!',
    });
  } catch (error) {
    console.error('Form submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid submission data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Submission failed',
      },
      { status: 500 },
    );
  }
}
