import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { rateLimit } from '@/lib/rate-limit';
import { auditLogger } from '@/lib/middleware/audit';
import {
  AIEmailVariant,
  PersonalizationRule,
  ClientContext,
  EmailPreviewData,
} from '@/types/ai-email';

// Security schemas
const secureStringSchema = z
  .string()
  .min(0)
  .max(1000)
  .regex(
    /^[a-zA-Z0-9\s\-_.,!?()'"@#$%&*+=<>{}[\]/\\|`~\n\r]*$/,
    'Invalid characters detected',
  );

const personalizeEmailRequestSchema = z.object({
  variant: z.object({
    id: z.string(),
    subject: secureStringSchema,
    content: secureStringSchema,
  }),
  personalization_rules: z.array(
    z.object({
      id: z.string(),
      token: z
        .string()
        .regex(/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/, 'Invalid token format'),
      display_name: secureStringSchema,
      description: secureStringSchema.optional(),
      default_value: secureStringSchema,
      is_required: z.boolean(),
      data_source: z.enum(['client', 'vendor', 'form', 'manual']),
      auto_populate: z.boolean(),
      validation_pattern: z.string().optional(),
    }),
  ),
  merge_tag_values: z.record(z.string(), secureStringSchema),
  client_data: z
    .object({
      couple_names: secureStringSchema.optional(),
      wedding_date: z.string().optional(),
      venue_name: secureStringSchema.optional(),
      venue_type: z.enum(['indoor', 'outdoor', 'hybrid']).optional(),
      guest_count: z.number().int().min(1).max(1000).optional(),
    })
    .optional(),
});

// Rate limiting - higher limit for personalization (10 per minute)
const rateLimitConfig = {
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 10,
};

// Security headers
const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; script-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'email_personalization',
    timestamp: new Date().toISOString(),
    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
  };

  try {
    // 1. Authentication Check
    const session = await getServerSession();
    if (!session?.user?.id) {
      auditData.status = 'unauthorized';
      await auditLog(auditData);

      return NextResponse.json(
        { error: 'Authentication required' },
        {
          status: 401,
          headers: securityHeaders,
        },
      );
    }

    auditData.user_id = session.user.id;

    // 2. Rate Limiting
    const rateLimitResult = await rateLimit(
      request.headers.get('x-forwarded-for') || 'unknown',
      rateLimitConfig,
    );

    if (!rateLimitResult.success) {
      auditData.status = 'rate_limited';
      await auditLog(auditData);

      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            ...securityHeaders,
            'Retry-After': '60',
          },
        },
      );
    }

    // 3. Request Body Validation
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      auditData.status = 'invalid_json';
      await auditLog(auditData);

      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        {
          status: 400,
          headers: securityHeaders,
        },
      );
    }

    // 4. Zod Validation
    const validationResult =
      personalizeEmailRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      auditData.status = 'validation_failed';
      auditData.validation_errors = validationResult.error.issues;
      await auditLog(auditData);

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        {
          status: 400,
          headers: securityHeaders,
        },
      );
    }

    const validatedData = validationResult.data;

    // 5. Personalize Email Content
    const personalizedEmail = personalizeEmailContent(
      validatedData.variant,
      validatedData.personalization_rules,
      validatedData.merge_tag_values,
      validatedData.client_data,
    );

    // 6. Generate Preview Data
    const previewData: EmailPreviewData = {
      subject: validatedData.variant.subject,
      html_content: validatedData.variant.content,
      text_content: htmlToText(validatedData.variant.content),
      personalized_subject: personalizedEmail.subject,
      personalized_html_content: personalizedEmail.content,
      personalized_text_content: htmlToText(personalizedEmail.content),
      merge_tags_used: personalizedEmail.tokensReplaced,
      preview_client: validatedData.client_data || {},
      estimated_render_time: Date.now() - startTime,
      content_warnings: validateContent(personalizedEmail.content),
    };

    // 7. Audit Log Success
    auditData.status = 'success';
    auditData.tokens_replaced = personalizedEmail.tokensReplaced.length;
    auditData.processing_time_ms = Date.now() - startTime;
    await auditLog(auditData);

    return NextResponse.json(previewData, {
      status: 200,
      headers: {
        ...securityHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    auditData.status = 'error';
    auditData.error_type =
      error instanceof Error ? error.constructor.name : 'unknown';
    auditData.processing_time_ms = Date.now() - startTime;
    await auditLog(auditData);

    console.error('Email Personalization Error:', error);

    return NextResponse.json(
      { error: 'Failed to personalize email' },
      {
        status: 500,
        headers: securityHeaders,
      },
    );
  }
}

// Personalize email content with merge tags
function personalizeEmailContent(
  variant: { subject: string; content: string },
  rules: PersonalizationRule[],
  mergeTagValues: Record<string, string>,
  clientData?: ClientContext,
) {
  let subject = variant.subject;
  let content = variant.content;
  const tokensReplaced: string[] = [];

  // Replace merge tags with values
  Object.entries(mergeTagValues).forEach(([token, value]) => {
    if (value) {
      // Escape HTML to prevent XSS
      const escapedValue = escapeHtml(value);

      // Replace in subject
      const subjectRegex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
      if (subject.match(subjectRegex)) {
        subject = subject.replace(subjectRegex, escapedValue);
        tokensReplaced.push(token);
      }

      // Replace in content
      const contentRegex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
      if (content.match(contentRegex)) {
        content = content.replace(contentRegex, escapedValue);
        if (!tokensReplaced.includes(token)) {
          tokensReplaced.push(token);
        }
      }
    }
  });

  // Auto-populate from client data if available
  if (clientData) {
    const autoMappings = {
      '{couple_names}': clientData.couple_names,
      '{wedding_date}': clientData.wedding_date
        ? formatDate(clientData.wedding_date)
        : undefined,
      '{venue_name}': clientData.venue_name,
      '{guest_count}': clientData.guest_count?.toString(),
    };

    Object.entries(autoMappings).forEach(([token, value]) => {
      if (value && !tokensReplaced.includes(token)) {
        const escapedValue = escapeHtml(value);

        const subjectRegex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
        const contentRegex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');

        if (subject.match(subjectRegex)) {
          subject = subject.replace(subjectRegex, escapedValue);
          tokensReplaced.push(token);
        }

        if (content.match(contentRegex)) {
          content = content.replace(contentRegex, escapedValue);
          if (!tokensReplaced.includes(token)) {
            tokensReplaced.push(token);
          }
        }
      }
    });
  }

  return {
    subject,
    content,
    tokensReplaced,
  };
}

// Escape HTML to prevent XSS attacks
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (match) => map[match]);
}

// Convert HTML to plain text
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, ' ') // Replace HTML entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Format date for display
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Validate content for potential issues
function validateContent(content: string): string[] {
  const warnings: string[] = [];

  // Check for potentially problematic patterns
  if (content.includes('<script')) {
    warnings.push('Content contains script tags');
  }

  if (content.includes('javascript:')) {
    warnings.push('Content contains JavaScript URLs');
  }

  if (content.match(/\{[^}]+\}/)) {
    warnings.push('Content contains unreplaced merge tags');
  }

  if (content.length > 10000) {
    warnings.push('Content is very long and may be truncated by email clients');
  }

  // Check for excessive capitalization
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.3) {
    warnings.push('Content has excessive capitalization');
  }

  return warnings;
}
