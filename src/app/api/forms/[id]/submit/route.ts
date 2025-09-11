import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  formSubmissionSchema,
  sanitizeFieldValue,
} from '@/lib/validations/forms';
import { generateSecureId } from '@/lib/crypto-utils';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from '@/lib/rate-limit';
import { EmailService } from '@/lib/email/service';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';

// Rate limiting for form submissions
const submitRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
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

// Comprehensive input sanitization
function sanitizeSubmissionData(data: any): any {
  if (typeof data === 'string') {
    // Remove all script tags and event handlers
    const sanitized = DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true,
      SAFE_FOR_TEMPLATES: true,
    });

    // Additional XSS prevention
    return sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeSubmissionData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeSubmissionData(value);
    }
    return sanitized;
  }

  return data;
}

// Validate UUID format
const uuidSchema = z.string().uuid();

// POST /api/forms/[id]/submit - Submit form data
export async function POST(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting based on IP address
    const clientIP = request.ip || 'anonymous';
    const { success } = await submitRateLimit.check(20, clientIP);

    if (!success) {
      return NextResponse.json(
        {
          error:
            'Too many submission attempts. Please wait before trying again.',
        },
        { status: 429 },
      );
    }

    // CSRF protection for authenticated users
    const hasCSRFToken = request.headers.get('x-csrf-token');
    if (hasCSRFToken && !validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 },
      );
    }

    // Validate form ID format
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Get form details with security checks
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(
        `
        id,
        title,
        status,
        form_data,
        expires_at,
        max_submissions,
        sharing_settings,
        settings,
        clients!inner(
          id,
          company_name,
          user_id
        )
      `,
      )
      .eq('id', formId)
      .eq('status', 'published')
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check if form has expired
    if (form.expires_at && new Date(form.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: 'This form has expired and is no longer accepting submissions',
        },
        { status: 403 },
      );
    }

    // Check submission limit
    if (form.max_submissions) {
      const { count: submissionCount } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', form.id)
        .eq('status', 'completed');

      if (submissionCount && submissionCount >= form.max_submissions) {
        return NextResponse.json(
          { error: 'This form has reached its maximum number of submissions' },
          { status: 403 },
        );
      }
    }

    // Authentication check if required
    let submittedBy: string | null = null;
    if (form.settings?.requireLogin) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required for this form' },
          { status: 401 },
        );
      }
      submittedBy = user.id;
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const sanitizedData = sanitizeSubmissionData(rawBody.data);

    // Validate submission structure
    const submissionData = {
      formId,
      data: sanitizedData,
      metadata: {
        userAgent: request.headers.get('user-agent')?.substring(0, 500),
        ipAddress: clientIP,
        timestamp: new Date().toISOString(),
        sessionId: rawBody.sessionId,
      },
    };

    const validatedSubmission = formSubmissionSchema.parse(submissionData);

    // Comprehensive field validation against form schema
    const validationErrors: string[] = [];
    const sanitizedFields: Record<string, any> = {};

    // Handle both legacy (sections) and new (form_data) structures
    const fields = form.form_data?.fields || [];
    if (form.sections) {
      // Legacy format - flatten sections into fields
      form.sections.forEach((section: any) => {
        if (section.fields) {
          fields.push(...section.fields);
        }
      });
    }

    for (const field of fields) {
      const rawValue = validatedSubmission.data[field.id];
      const sanitizedValue = sanitizeFieldValue(rawValue, field.type);

      // Store sanitized value
      sanitizedFields[field.id] = sanitizedValue;

      // Required field validation
      if (field.validation?.required) {
        if (
          sanitizedValue === null ||
          sanitizedValue === undefined ||
          sanitizedValue === ''
        ) {
          validationErrors.push(`${field.label} is required`);
          continue;
        }
      }

      // Skip validation for empty optional fields
      if (
        sanitizedValue === null ||
        sanitizedValue === undefined ||
        sanitizedValue === ''
      ) {
        continue;
      }

      // Type-specific validation
      switch (field.type) {
        case 'text':
        case 'textarea':
          if (typeof sanitizedValue === 'string') {
            if (
              field.validation?.minLength &&
              sanitizedValue.length < field.validation.minLength
            ) {
              validationErrors.push(
                `${field.label} must be at least ${field.validation.minLength} characters`,
              );
            }
            if (
              field.validation?.maxLength &&
              sanitizedValue.length > field.validation.maxLength
            ) {
              validationErrors.push(
                `${field.label} must not exceed ${field.validation.maxLength} characters`,
              );
            }
          }
          break;

        case 'email':
          if (typeof sanitizedValue === 'string' && sanitizedValue) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedValue)) {
              validationErrors.push(
                `${field.label} must be a valid email address`,
              );
            }
          }
          break;

        case 'number':
          if (typeof sanitizedValue === 'number') {
            if (
              field.validation?.min !== undefined &&
              sanitizedValue < field.validation.min
            ) {
              validationErrors.push(
                `${field.label} must be at least ${field.validation.min}`,
              );
            }
            if (
              field.validation?.max !== undefined &&
              sanitizedValue > field.validation.max
            ) {
              validationErrors.push(
                `${field.label} must not exceed ${field.validation.max}`,
              );
            }
          }
          break;

        case 'tel':
          if (typeof sanitizedValue === 'string' && sanitizedValue) {
            const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,20}$/;
            if (!phoneRegex.test(sanitizedValue)) {
              validationErrors.push(
                `${field.label} must be a valid phone number`,
              );
            }
          }
          break;

        case 'file':
          if (sanitizedValue && typeof sanitizedValue === 'object') {
            // File validation would be handled by separate upload endpoint
            const allowedTypes = [
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp',
              'application/pdf',
              'text/plain',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];

            if (
              sanitizedValue.type &&
              !allowedTypes.includes(sanitizedValue.type)
            ) {
              validationErrors.push(`${field.label} file type is not allowed`);
            }

            if (sanitizedValue.size && sanitizedValue.size > 50 * 1024 * 1024) {
              validationErrors.push(
                `${field.label} file size exceeds 50MB limit`,
              );
            }
          }
          break;
      }

      // Custom pattern validation
      if (field.validation?.pattern && typeof sanitizedValue === 'string') {
        try {
          const pattern = new RegExp(field.validation.pattern);
          if (!pattern.test(sanitizedValue)) {
            validationErrors.push(`${field.label} format is invalid`);
          }
        } catch (e) {
          console.error('Invalid regex pattern:', field.validation.pattern);
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // Check for duplicate submissions if not allowed
    if (!form.settings?.allowMultipleSubmissions && submittedBy) {
      const { data: existingSubmission } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('form_id', formId)
        .eq('submitted_by', submittedBy)
        .limit(1);

      if (existingSubmission && existingSubmission.length > 0) {
        return NextResponse.json(
          { error: 'You have already submitted this form' },
          { status: 409 },
        );
      }
    }

    // Generate secure submission ID
    const submissionId = generateSecureId(16);

    // Save submission with comprehensive metadata
    const submissionRecord = {
      form_id: formId,
      client_id: form.clients.id,
      form_data: sanitizedFields,
      status: 'completed',
      session_id: validatedSubmission.metadata?.sessionId,
      user_agent: request.headers.get('user-agent')?.substring(0, 500),
      ip_address: clientIP,
      referrer_url: request.headers.get('referer')?.substring(0, 500),
      submitted_by: submittedBy,
      completed_at: new Date().toISOString(),
    };

    const { data: submission, error: submitError } = await supabase
      .from('form_submissions')
      .insert(submissionRecord)
      .select(
        `
        id,
        created_at,
        metadata
      `,
      )
      .single();

    if (submitError) {
      console.error('Submission database error:', submitError);
      throw new Error(`Failed to save submission: ${submitError.message}`);
    }

    // Send notification emails
    try {
      // Send notification to vendor/form owner
      if (form.settings?.notificationEmail || form.clients.user_id) {
        const recipientEmail =
          form.settings?.notificationEmail ||
          (await supabase.auth.admin
            .getUserById(form.clients.user_id)
            .then((res) => res.data?.user?.email));

        if (recipientEmail) {
          await EmailService.sendFormSubmissionNotification({
            recipientEmail,
            recipientName: form.clients.company_name || 'Vendor',
            formName: form.title,
            submissionId: submission.id,
            clientName:
              sanitizedFields.name || sanitizedFields.fullName || 'Guest',
            clientId: submittedBy || 'anonymous',
            weddingDate:
              sanitizedFields.eventDate || sanitizedFields.weddingDate,
            organizationId: form.clients.id,
            organizationName: form.clients.company_name,
          });
        }
      }

      // Send confirmation email to submitter if email field exists
      const submitterEmail =
        sanitizedFields.email ||
        sanitizedFields.Email ||
        sanitizedFields.contact_email ||
        sanitizedFields.contactEmail;

      if (submitterEmail && form.settings?.sendConfirmation !== false) {
        // For now, use the form submission notification for confirmations
        // TODO: Create a dedicated confirmation email template
        console.log(`Sending confirmation email to: ${submitterEmail}`);

        // We can extend the EmailService with a confirmation method later
        // For now, log the confirmation request
        await supabase.from('email_notifications').insert({
          organization_id: form.clients.id,
          recipient_email: submitterEmail,
          recipient_name: sanitizedFields.name || 'Guest',
          recipient_type: 'client',
          template_type: 'form_confirmation',
          subject: `Thank you for submitting: ${form.title}`,
          html_content: `
              <h2>Submission Received</h2>
              <p>Thank you for submitting the ${form.title} form.</p>
              <p>We have received your information and will be in touch soon.</p>
              <p>Submission ID: ${submission.id}</p>
              <p>Submitted at: ${new Date(submission.created_at).toLocaleString()}</p>
            `,
          text_content: `Submission Received\n\nThank you for submitting the ${form.title} form.\nWe have received your information and will be in touch soon.\nSubmission ID: ${submission.id}\nSubmitted at: ${new Date(submission.created_at).toLocaleString()}`,
          status: 'pending',
          provider: 'resend',
          priority: 'normal',
          variables: {
            formTitle: form.title,
            submissionId: submission.id,
            submittedAt: submission.created_at,
          },
        });
      }
    } catch (emailError) {
      // Log email error but don't fail the submission
      console.error('Failed to send notification emails:', emailError);
      // Store email failure in submission metadata for retry
      await supabase
        .from('form_submissions')
        .update({
          metadata: {
            ...submission.metadata,
            emailStatus: 'failed',
            emailError: emailError.message,
          },
        })
        .eq('id', submission.id);
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        submissionId: submission.id,
        message:
          form.settings?.successMessage || 'Thank you for your submission!',
        submittedAt: submission.created_at,
      },
      { status: 201 },
    );
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
        success: false,
      },
      { status: 500 },
    );
  }
}

// GET /api/forms/[id]/submit - Get submission status or form info for submission
export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  // Extract async params - Next.js 15 requirement
  const params = await extractParams(context.params);
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await submitRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Get basic form info for submission page
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(
        `
        id,
        title,
        description,
        status,
        is_published,
        settings,
        sections
      `,
      )
      .eq('id', formId)
      .eq('status', 'published')
      .eq('is_published', true)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or not published' },
        { status: 404 },
      );
    }

    // Sanitize form data for public display
    const sanitizedForm = {
      id: form.id,
      title: DOMPurify.sanitize(form.title, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      }),
      description: form.description
        ? DOMPurify.sanitize(form.description, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true,
          })
        : undefined,
      settings: {
        requireLogin: form.settings?.requireLogin || false,
        allowMultipleSubmissions:
          form.settings?.allowMultipleSubmissions || false,
        submitButtonText: form.settings?.submitButtonText
          ? DOMPurify.sanitize(form.settings.submitButtonText, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
              KEEP_CONTENT: true,
            })
          : 'Submit',
      },
      sections: form.sections
        .map((section: any) => ({
          id: section.id,
          title: section.title
            ? DOMPurify.sanitize(section.title, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
              })
            : undefined,
          description: section.description
            ? DOMPurify.sanitize(section.description, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
                KEEP_CONTENT: true,
              })
            : undefined,
          fields: section.fields
            .map((field: any) => ({
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
              validation: {
                required: field.validation?.required || false,
                minLength: field.validation?.minLength,
                maxLength: field.validation?.maxLength,
                min: field.validation?.min,
                max: field.validation?.max,
                pattern: field.validation?.pattern,
              },
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
              width: field.width || 'full',
              order: field.order || 0,
            }))
            .sort((a: any, b: any) => a.order - b.order),
        }))
        .sort((a: any, b: any) => a.order - b.order),
    };

    return NextResponse.json({
      form: sanitizedForm,
      canSubmit: true,
    });
  } catch (error) {
    console.error('Form submission info error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to get form information' },
      { status: 500 },
    );
  }
}
