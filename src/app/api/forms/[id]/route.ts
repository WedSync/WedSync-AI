import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formSchema } from '@/lib/validations/forms';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from '@/lib/rate-limit';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';

// Rate limiting for individual form operations
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

// Validate UUID format
const uuidSchema = z.string().uuid();

// GET /api/forms/[id] - Get single form
export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await formRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Check if this is a public form request (no auth required for published forms)
    const isPublicRequest =
      request.nextUrl.searchParams.get('public') === 'true';

    if (!isPublicRequest) {
      // Authentication required for private access
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get form with ownership check
      const { data: form, error } = await supabase
        .from('forms')
        .select(
          `
          *,
          form_submissions(count),
          organization:organizations(name, slug)
        `,
        )
        .eq('id', formId)
        .eq('created_by', user.id)
        .single();

      if (error || !form) {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }

      return NextResponse.json({ form });
    } else {
      // Public access - only return published forms with limited data
      const { data: form, error } = await supabase
        .from('forms')
        .select(
          `
          id,
          title,
          description,
          sections,
          settings,
          slug,
          organization:organizations(name, slug)
        `,
        )
        .eq('id', formId)
        .eq('status', 'published')
        .eq('is_published', true)
        .single();

      if (error || !form) {
        return NextResponse.json(
          { error: 'Form not found or not published' },
          { status: 404 },
        );
      }

      // Sanitize form data for public consumption
      const publicForm = {
        ...form,
        sections: form.sections.map((section: any) => ({
          ...section,
          fields: section.fields.map((field: any) => ({
            id: field.id,
            type: field.type,
            label: DOMPurify.sanitize(field.label, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
              KEEP_CONTENT: true,
            }),
            placeholder: field.placeholder
              ? DOMPurify.sanitize(field.placeholder, {
                  ALLOWED_TAGS: [],
                  ALLOWED_ATTR: [],
                  KEEP_CONTENT: true,
                })
              : undefined,
            helperText: field.helperText
              ? DOMPurify.sanitize(field.helperText, {
                  ALLOWED_TAGS: [],
                  ALLOWED_ATTR: [],
                  KEEP_CONTENT: true,
                })
              : undefined,
            required: field.validation?.required || false,
            validation: field.validation,
            options: field.options?.map((opt: any) => ({
              id: opt.id,
              label: DOMPurify.sanitize(opt.label, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
              }),
              value: DOMPurify.sanitize(opt.value, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
              }),
            })),
            width: field.width,
            order: field.order,
          })),
        })),
      };

      return NextResponse.json({ form: publicForm });
    }
  } catch (error) {
    console.error('Form fetch error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 },
    );
  }
}

// PUT /api/forms/[id] - Update form
export async function PUT(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await formRateLimit.check(20, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many update requests' },
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

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify form ownership
    const { data: existingForm, error: ownershipError } = await supabase
      .from('forms')
      .select('id, created_by')
      .eq('id', formId)
      .eq('created_by', user.id)
      .single();

    if (ownershipError || !existingForm) {
      return NextResponse.json(
        { error: 'Form not found or access denied' },
        { status: 404 },
      );
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeFormData(rawBody);

    // Validate form data
    const validatedForm = formSchema.parse(sanitizedBody);

    // Update form in database
    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update({
        title: validatedForm.title,
        description: validatedForm.description,
        sections: validatedForm.sections,
        settings: validatedForm.settings,
        status: validatedForm.isPublished ? 'published' : 'draft',
        is_published: validatedForm.isPublished,
        slug: validatedForm.slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', formId)
      .eq('created_by', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      form: updatedForm,
      message: 'Form updated successfully',
    });
  } catch (error) {
    console.error('Form update error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to update form',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/forms/[id] - Delete form
export async function DELETE(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await formRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many delete requests' },
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

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if form has submissions (prevent accidental data loss)
    const { data: submissions, error: submissionError } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('form_id', formId)
      .limit(1);

    if (submissionError) {
      throw new Error(`Error checking submissions: ${submissionError.message}`);
    }

    if (submissions && submissions.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete form with existing submissions',
          message: 'Archive the form instead to preserve submission data',
        },
        { status: 400 },
      );
    }

    // Delete form (with ownership verification)
    const { error: deleteError } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId)
      .eq('created_by', user.id);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error) {
    console.error('Form deletion error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete form',
      },
      { status: 500 },
    );
  }
}
