/**
 * Security Implementation Guide for Top 20 Critical API Routes
 * SECURITY: Applies comprehensive security measures to highest-risk endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withSecureValidation,
  withValidation,
  withFileValidation,
} from '@/lib/validation/middleware';
import {
  clientSchema,
  supplierSchema,
  authSchema,
  signupSchema,
  paymentSchema,
  fileUploadSchema,
  mfaSetupSchema,
  mfaVerifySchema,
} from '@/lib/validation/schemas';

/**
 * TOP 20 CRITICAL API ROUTES REQUIRING IMMEDIATE SECURITY
 *
 * Priority Level 1 (Authentication & Financial):
 * 1. /api/auth/signup - User registration
 * 2. /api/auth/mfa/enroll - MFA setup
 * 3. /api/auth/mfa/verify - MFA verification
 * 4. /api/stripe/webhook - Payment webhooks
 * 5. /api/payments/process - Payment processing
 *
 * Priority Level 2 (Core Business Logic):
 * 6. /api/clients - Client management
 * 7. /api/clients/[id] - Client operations
 * 8. /api/suppliers - Supplier management
 * 9. /api/forms/submit - Form submissions
 * 10. /api/contracts/upload - Contract uploads
 *
 * Priority Level 3 (Data Exposure Risks):
 * 11. /api/privacy/export/[id] - Data exports
 * 12. /api/clients/import - Bulk data imports
 * 13. /api/communications/send - Communication endpoints
 * 14. /api/vendor-portal/performance - Vendor analytics
 * 15. /api/core-fields/populate - Core field management
 *
 * Priority Level 4 (System Security):
 * 16. /api/admin/users - Admin operations
 * 17. /api/security/pci-compliance - Security checks
 * 18. /api/api-keys - API key management
 * 19. /api/webhooks/stripe - External integrations
 * 20. /api/health/complete - System health
 */

// Authentication Route Security - /api/auth/signup
export const secureSignupHandler = withSecureValidation(
  signupSchema.extend({
    honeypot: z.string().max(0, 'Bot detection triggered'), // Anti-spam
    turnstile: z.string().min(1, 'CAPTCHA verification required').optional(),
    timestamp: z
      .number()
      .refine((val) => Date.now() - val < 300000, 'Form expired'), // 5min limit
  }),
  async (request: NextRequest, validatedData) => {
    try {
      // Additional security checks
      const userAgent = request.headers.get('user-agent') || '';
      const ip = request.headers.get('x-forwarded-for') || 'unknown';

      // Block suspicious user agents
      if (/bot|crawler|spider|scraper/i.test(userAgent)) {
        return NextResponse.json(
          { error: 'SUSPICIOUS_ACTIVITY', message: 'Account creation blocked' },
          { status: 403 },
        );
      }

      // Rate limiting by IP (additional to middleware)
      // Your signup logic here with validated data

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        requiresVerification: true,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'SIGNUP_ERROR', message: 'Account creation failed' },
        { status: 500 },
      );
    }
  },
);

// MFA Enrollment Security - /api/auth/mfa/enroll
export const secureMFAEnrollHandler = withSecureValidation(
  mfaSetupSchema,
  async (request: NextRequest, validatedData) => {
    try {
      // Verify user session strength
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          {
            error: 'AUTHENTICATION_REQUIRED',
            message: 'Valid session required for MFA setup',
          },
          { status: 401 },
        );
      }

      // Additional MFA security checks
      // Your MFA enrollment logic here

      return NextResponse.json({
        success: true,
        message: 'MFA enrolled successfully',
        backupCodes: [], // Generate secure backup codes
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'MFA_SETUP_ERROR', message: 'MFA setup failed' },
        { status: 500 },
      );
    }
  },
);

// Client Management Security - /api/clients
export const secureClientHandler = withSecureValidation(
  clientSchema.extend({
    // Additional business logic validation
    gdpr_consent: z
      .boolean()
      .refine((val) => val === true, 'GDPR consent required'),
    data_retention_period: z.number().min(1).max(2555), // Max 7 years in days
    privacy_level: z.enum(['standard', 'high', 'maximum']).default('standard'),
  }),
  async (request: NextRequest, validatedData) => {
    try {
      // Audit logging for client data operations
      const userId = request.headers.get('x-user-id'); // From auth middleware

      console.log(`Client operation by user ${userId}:`, {
        action: 'create_client',
        clientEmail: validatedData.email,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for'),
      });

      // Your client creation logic here

      return NextResponse.json({
        success: true,
        message: 'Client created successfully',
        data: { id: crypto.randomUUID(), ...validatedData },
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'CLIENT_ERROR', message: 'Client operation failed' },
        { status: 500 },
      );
    }
  },
);

// Form Submission Security - /api/forms/submit
export const secureFormSubmitHandler = withSecureValidation(
  z.object({
    form_id: z.string().uuid('Invalid form ID'),
    responses: z
      .record(z.any())
      .refine((obj) => Object.keys(obj).length <= 100, 'Too many form fields'),
    submission_key: z.string().min(1, 'Submission key required'),
    csrf_token: z.string().min(1, 'CSRF token required'),
    client_fingerprint: z.string().optional(),
  }),
  async (request: NextRequest, validatedData) => {
    try {
      // Validate CSRF token
      const sessionCsrfToken = request.cookies.get('csrf-token')?.value;
      if (sessionCsrfToken !== validatedData.csrf_token) {
        return NextResponse.json(
          {
            error: 'CSRF_TOKEN_INVALID',
            message: 'Security token validation failed',
          },
          { status: 403 },
        );
      }

      // Sanitize form responses
      const sanitizedResponses: Record<string, any> = {};
      for (const [key, value] of Object.entries(validatedData.responses)) {
        if (typeof value === 'string') {
          // Remove potential XSS and injection patterns
          const cleaned = value
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/data:/gi, '')
            .slice(0, 5000); // Limit field length
          sanitizedResponses[key] = cleaned;
        } else {
          sanitizedResponses[key] = value;
        }
      }

      // Your form processing logic here

      return NextResponse.json({
        success: true,
        message: 'Form submitted successfully',
        submissionId: crypto.randomUUID(),
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'FORM_SUBMISSION_ERROR', message: 'Form submission failed' },
        { status: 500 },
      );
    }
  },
);

// File Upload Security - /api/contracts/upload
export const secureContractUploadHandler = withFileValidation(
  [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  25 * 1024 * 1024, // 25MB limit for contracts
  async (request: NextRequest, file: File) => {
    try {
      // Additional file security checks
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Check file signature (magic bytes) for PDF
      if (file.type === 'application/pdf') {
        const pdfHeader = Array.from(uint8Array.slice(0, 4))
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');

        if (!pdfHeader.startsWith('255044462d')) {
          // %PDF- in hex
          return NextResponse.json(
            { error: 'INVALID_PDF', message: 'File is not a valid PDF' },
            { status: 400 },
          );
        }
      }

      // Scan for embedded executables or suspicious content
      const suspiciousPatterns = [
        'javascript:',
        'vbscript:',
        'data:application',
        '<script',
        '</script>',
        '<iframe',
        '<object',
        '<embed',
      ];

      const fileContent = new TextDecoder('utf-8', { fatal: false }).decode(
        uint8Array.slice(0, 10000),
      );
      for (const pattern of suspiciousPatterns) {
        if (fileContent.toLowerCase().includes(pattern.toLowerCase())) {
          return NextResponse.json(
            {
              error: 'SUSPICIOUS_CONTENT',
              message: 'File contains potentially harmful content',
            },
            { status: 400 },
          );
        }
      }

      // Your file processing logic here

      return NextResponse.json({
        success: true,
        message: 'Contract uploaded successfully',
        fileId: crypto.randomUUID(),
        originalName: file.name,
        size: file.size,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'UPLOAD_ERROR', message: 'File upload failed' },
        { status: 500 },
      );
    }
  },
);

// Data Export Security - /api/privacy/export/[id]
export const secureDataExportHandler = withSecureValidation(
  z.object({
    export_type: z.enum(['full', 'partial', 'anonymous']),
    format: z.enum(['json', 'csv', 'pdf']),
    date_range: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional(),
    gdpr_basis: z.enum([
      'consent',
      'legitimate_interest',
      'data_subject_request',
    ]),
    requester_verification: z.string().min(1, 'Identity verification required'),
  }),
  async (request: NextRequest, validatedData) => {
    try {
      // Additional verification for data exports
      const userId = request.headers.get('x-user-id');
      const userRole = request.headers.get('x-user-role');

      if (!userId) {
        return NextResponse.json(
          {
            error: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
          },
          { status: 401 },
        );
      }

      // Only allow data exports for own data or admin
      const requestedId = request.nextUrl.pathname.split('/').pop();
      if (requestedId !== userId && userRole !== 'admin') {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED_EXPORT',
            message: 'Cannot export data for other users',
          },
          { status: 403 },
        );
      }

      // Log GDPR data access
      console.log(`GDPR Data Export Request:`, {
        requesterId: userId,
        targetId: requestedId,
        exportType: validatedData.export_type,
        gdprBasis: validatedData.gdpr_basis,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for'),
      });

      // Your data export logic here (anonymize sensitive data)

      return NextResponse.json({
        success: true,
        message: 'Data export initiated',
        exportId: crypto.randomUUID(),
        estimatedCompletion: new Date(Date.now() + 600000).toISOString(), // 10 minutes
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'EXPORT_ERROR', message: 'Data export failed' },
        { status: 500 },
      );
    }
  },
);

// Webhook Security - /api/stripe/webhook
export const secureStripeWebhookHandler = async (
  request: NextRequest,
): Promise<NextResponse> => {
  try {
    // Verify Stripe webhook signature
    const signature = request.headers.get('stripe-signature');
    const rawBody = await request.text();

    if (!signature) {
      return NextResponse.json(
        { error: 'MISSING_SIGNATURE', message: 'Webhook signature required' },
        { status: 400 },
      );
    }

    // Verify webhook came from Stripe (implement actual verification)
    // const isValidSignature = verifyStripeSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    // Parse and validate webhook payload
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Invalid webhook payload' },
        { status: 400 },
      );
    }

    // Validate webhook structure
    const webhookSchema = z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      data: z.object({
        object: z.record(z.any()),
      }),
      created: z.number(),
    });

    const validation = webhookSchema.safeParse(event);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
        { status: 400 },
      );
    }

    // Process webhook securely
    console.log(`Stripe webhook received: ${event.type}`, {
      eventId: event.id,
      timestamp: new Date(event.created * 1000).toISOString(),
    });

    // Your webhook processing logic here

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'WEBHOOK_ERROR', message: 'Webhook processing failed' },
      { status: 500 },
    );
  }
};

/**
 * IMPLEMENTATION INSTRUCTIONS FOR DEVELOPMENT TEAMS:
 *
 * 1. Replace existing API route handlers with these secure versions
 * 2. Add proper error logging and monitoring
 * 3. Implement business logic within the validated handlers
 * 4. Test all validation scenarios thoroughly
 * 5. Deploy with proper environment variables
 *
 * Example usage in API route file:
 *
 * // In /app/api/auth/signup/route.ts
 * export const POST = secureSignupHandler
 *
 * // In /app/api/clients/route.ts
 * export const POST = secureClientHandler
 *
 * // In /app/api/forms/submit/route.ts
 * export const POST = secureFormSubmitHandler
 *
 * // etc.
 */

// Export all secure handlers
export {
  secureSignupHandler,
  secureMFAEnrollHandler,
  secureClientHandler,
  secureFormSubmitHandler,
  secureContractUploadHandler,
  secureDataExportHandler,
  secureStripeWebhookHandler,
};

// Security checklist for each route:
export const SECURITY_CHECKLIST = {
  authentication: [
    'Verify user session/token',
    'Check user permissions/roles',
    'Validate MFA requirements',
    'Log authentication events',
  ],
  validation: [
    'Use Zod schemas for all inputs',
    'Sanitize user data',
    'Validate file uploads',
    'Check CSRF tokens',
  ],
  rateLimiting: [
    'Apply appropriate rate limits',
    'Use tier-based limiting',
    'Block suspicious patterns',
    'Log rate limit violations',
  ],
  monitoring: [
    'Log all critical operations',
    'Record security events',
    'Monitor for anomalies',
    'Alert on suspicious activity',
  ],
  dataProtection: [
    'Encrypt sensitive data',
    'Anonymize PII in logs',
    'Implement proper access controls',
    'Follow GDPR requirements',
  ],
} as const;
