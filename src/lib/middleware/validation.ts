// lib/middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
// import { randomUUID } from 'crypto'; // Edge Runtime compatibility

export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  violations?: ValidationViolation[];
  sanitizedData?: any;
}

export interface ValidationViolation {
  field: string;
  message: string;
  code: string;
  receivedValue?: any;
  expectedType?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WeddingValidationContext {
  userType: 'supplier' | 'couple' | 'admin';
  subscriptionTier: string;
  weddingDate?: string;
  supplierType?: string;
  isWeddingSeason: boolean;
}

export class RequestValidationMiddleware {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Wedding industry specific validation schemas
  private readonly WEDDING_SCHEMAS = {
    // Client/Couple validation
    coupleProfile: z.object({
      couple_name: z
        .string()
        .min(2)
        .max(100)
        .regex(/^[a-zA-Z\s&-']+$/, 'Invalid characters in couple name'),
      wedding_date: z
        .string()
        .datetime()
        .refine((date) => {
          const weddingDate = new Date(date);
          const today = new Date();
          const maxDate = new Date(
            today.getFullYear() + 5,
            today.getMonth(),
            today.getDate(),
          );
          return weddingDate > today && weddingDate <= maxDate;
        }, 'Wedding date must be in the future but within 5 years'),
      venue_name: z.string().min(2).max(200).optional(),
      guest_count: z.number().int().min(1).max(2000).optional(),
      budget_range: z
        .enum([
          'under_5k',
          '5k_10k',
          '10k_25k',
          '25k_50k',
          '50k_100k',
          'over_100k',
        ])
        .optional(),
      contact_email: z.string().email().max(255),
      contact_phone: z
        .string()
        .regex(/^\+?[\d\s\-\(\)]{10,20}$/, 'Invalid phone number format')
        .optional(),
    }),

    // Supplier profile validation
    supplierProfile: z.object({
      name: z
        .string()
        .min(2)
        .max(100)
        .regex(/^[a-zA-Z\s&\-'\.]+$/, 'Invalid characters in supplier name'),
      supplier_type: z.enum([
        'photographer',
        'videographer',
        'florist',
        'caterer',
        'venue',
        'dj',
        'band',
        'planner',
        'other',
      ]),
      business_address: z.string().min(10).max(500),
      service_areas: z.array(z.string().min(2).max(100)).min(1).max(20),
      years_experience: z.number().int().min(0).max(100),
      specialties: z.array(z.string().min(2).max(50)).max(10).optional(),
      portfolio_url: z.string().url().optional(),
      instagram_handle: z
        .string()
        .regex(/^@?[a-zA-Z0-9_.]{1,30}$/)
        .optional(),
    }),

    // Form submission validation
    formSubmission: z.object({
      form_id: z.string().uuid(),
      responses: z.record(
        z.string(),
        z.union([
          z.string().max(10000),
          z.number(),
          z.boolean(),
          z.array(z.string().max(1000)),
        ]),
      ),
      client_signature: z.string().min(10).max(500).optional(),
      submission_metadata: z
        .object({
          ip_address: z.string().ip().optional(),
          user_agent: z.string().max(500).optional(),
          submission_time: z.string().datetime(),
        })
        .optional(),
    }),

    // Booking validation
    bookingCreation: z.object({
      supplier_id: z.string().uuid(),
      service_type: z.string().min(2).max(100),
      event_date: z.string().datetime(),
      event_duration: z.number().int().min(1).max(24), // hours
      venue_address: z.string().min(10).max(500),
      guest_count: z.number().int().min(1).max(2000),
      special_requirements: z.string().max(2000).optional(),
      package_selected: z.string().max(100).optional(),
      estimated_cost: z.number().positive().max(1000000), // £1M max
    }),

    // Payment validation
    paymentIntent: z.object({
      amount: z.number().int().positive().max(10000000), // £100k max in pence
      currency: z.literal('gbp'),
      payment_method_types: z
        .array(z.enum(['card', 'bacs_debit', 'bank_transfer']))
        .min(1),
      booking_id: z.string().uuid(),
      client_id: z.string().uuid(),
      supplier_id: z.string().uuid(),
      description: z.string().min(5).max(500),
    }),
  };

  // Dangerous input patterns that could indicate attacks
  private readonly SECURITY_PATTERNS = [
    // SQL Injection patterns
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(['"][\s]*;[\s]*--)/i,
    /([\s]*or[\s]+[\d\w"']+[\s]*=[\s]*[\d\w"']+)/i,

    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,

    // Command injection patterns
    /(\b(cat|ls|pwd|whoami|id|ps|netstat|ifconfig|ping)\b)/i,
    /(;|\||&&|\$\(|\`)/,

    // Directory traversal patterns
    /(\.\.\/|\.\.\\)/g,
    /\/etc\/passwd|\/windows\/system32/i,

    // Wedding industry specific patterns
    /\b(test|sample|demo|fake|dummy)\b.*wedding/i,
  ];

  async validateRequest(
    request: NextRequest,
    schemaKey: keyof typeof this.WEDDING_SCHEMAS,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    try {
      // Extract request body
      const body = await this.extractRequestBody(request);
      if (!body.success) {
        return body;
      }

      const schema = this.WEDDING_SCHEMAS[schemaKey];

      // First pass: Schema validation
      const schemaResult = schema.safeParse(body.data);
      if (!schemaResult.success) {
        const violations = this.formatZodErrors(schemaResult.error);
        await this.logValidationViolations(request, violations, context);

        return {
          success: false,
          error: 'Request validation failed',
          violations,
        };
      }

      // Second pass: Security validation
      const securityResult = await this.validateSecurity(
        schemaResult.data,
        context,
      );
      if (!securityResult.success) {
        await this.logSecurityViolation(request, securityResult, context);
        return securityResult;
      }

      // Third pass: Business logic validation
      const businessResult = await this.validateBusinessLogic(
        schemaResult.data,
        schemaKey,
        context,
      );
      if (!businessResult.success) {
        return businessResult;
      }

      // Fourth pass: Sanitization
      const sanitizedData = await this.sanitizeData(
        schemaResult.data,
        schemaKey,
      );

      // Log successful validation
      await this.logSuccessfulValidation(request, schemaKey, context);

      return {
        success: true,
        data: schemaResult.data,
        sanitizedData,
      };
    } catch (error) {
      console.error('Request validation error:', error);
      await this.logValidationError(request, error, context);

      return {
        success: false,
        error: 'Internal validation error',
      };
    }
  }

  private async extractRequestBody(
    request: NextRequest,
  ): Promise<ValidationResult> {
    try {
      const contentType = request.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const data = await request.json();
        return { success: true, data };
      }

      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());
        return { success: true, data };
      }

      if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        const data: any = {};

        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            data[key] = {
              name: value.name,
              size: value.size,
              type: value.type,
              lastModified: value.lastModified,
            };
          } else {
            data[key] = value;
          }
        }

        return { success: true, data };
      }

      return {
        success: false,
        error: 'Unsupported content type',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse request body',
      };
    }
  }

  private formatZodErrors(error: z.ZodError): ValidationViolation[] {
    return error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      receivedValue: err.received,
      expectedType: err.expected,
      severity: this.classifyErrorSeverity(err),
    }));
  }

  private classifyErrorSeverity(
    error: z.ZodIssue,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Security-related validation failures
    if (error.code === 'custom' && error.message.includes('security')) {
      return 'critical';
    }

    // High: Required fields, type mismatches
    if (error.code === 'invalid_type' || error.code === 'too_small') {
      return 'high';
    }

    // Medium: Format issues, length issues
    if (error.code === 'invalid_string' || error.code === 'too_big') {
      return 'medium';
    }

    return 'low';
  }

  private async validateSecurity(
    data: any,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];

    // Check all string values for security patterns
    const checkValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        for (const pattern of this.SECURITY_PATTERNS) {
          if (pattern.test(value)) {
            violations.push({
              field: path,
              message: 'Potentially dangerous input detected',
              code: 'security_violation',
              receivedValue: value.substring(0, 100) + '...',
              severity: 'critical',
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, path ? `${path}.${key}` : key);
        }
      }
    };

    checkValue(data);

    if (violations.length > 0) {
      return {
        success: false,
        error: 'Security validation failed',
        violations,
      };
    }

    return { success: true };
  }

  private async validateBusinessLogic(
    data: any,
    schemaKey: keyof typeof this.WEDDING_SCHEMAS,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    try {
      switch (schemaKey) {
        case 'coupleProfile':
          return await this.validateCoupleBusinessLogic(data, context);

        case 'supplierProfile':
          return await this.validateSupplierBusinessLogic(data, context);

        case 'formSubmission':
          return await this.validateFormSubmissionBusinessLogic(data, context);

        case 'bookingCreation':
          return await this.validateBookingBusinessLogic(data, context);

        case 'paymentIntent':
          return await this.validatePaymentBusinessLogic(data, context);

        default:
          return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Business logic validation failed',
      };
    }
  }

  private async validateCoupleBusinessLogic(
    data: any,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    // Check for reasonable wedding dates during peak season
    if (data.wedding_date && context.isWeddingSeason) {
      const weddingDate = new Date(data.wedding_date);
      const currentYear = new Date().getFullYear();
      const isCurrentYear = weddingDate.getFullYear() === currentYear;

      // Wedding season bookings should be reasonable
      if (isCurrentYear && data.guest_count > 500) {
        return {
          success: false,
          error:
            'Large weddings during peak season require additional verification',
        };
      }
    }

    return { success: true };
  }

  private async validateSupplierBusinessLogic(
    data: any,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    // Validate service areas are realistic
    if (data.service_areas && data.service_areas.length > 10) {
      return {
        success: false,
        error: 'Too many service areas specified - maximum 10 allowed',
      };
    }

    // Check for reasonable experience claims
    if (data.years_experience > 50) {
      return {
        success: false,
        error: 'Years of experience seems unrealistic',
      };
    }

    return { success: true };
  }

  private async validateFormSubmissionBusinessLogic(
    data: any,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    // Verify form exists and is accessible
    const { data: form } = await this.supabase
      .from('forms')
      .select('id, supplier_id, is_active, max_responses')
      .eq('id', data.form_id)
      .single();

    if (!form) {
      return {
        success: false,
        error: 'Form not found',
      };
    }

    if (!form.is_active) {
      return {
        success: false,
        error: 'Form is no longer accepting responses',
      };
    }

    // Check response limits if applicable
    if (form.max_responses) {
      const { count } = await this.supabase
        .from('form_responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', data.form_id);

      if (count && count >= form.max_responses) {
        return {
          success: false,
          error: 'Form has reached maximum number of responses',
        };
      }
    }

    return { success: true };
  }

  private async validateBookingBusinessLogic(
    data: any,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    // Check supplier availability
    const { data: existingBookings } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('supplier_id', data.supplier_id)
      .eq('event_date', data.event_date)
      .eq('status', 'confirmed');

    if (existingBookings && existingBookings.length > 0) {
      return {
        success: false,
        error: 'Supplier is not available on the selected date',
      };
    }

    // Validate event date is in the future
    const eventDate = new Date(data.event_date);
    if (eventDate <= new Date()) {
      return {
        success: false,
        error: 'Event date must be in the future',
      };
    }

    return { success: true };
  }

  private async validatePaymentBusinessLogic(
    data: any,
    context: WeddingValidationContext,
  ): Promise<ValidationResult> {
    // Verify booking exists and belongs to the parties involved
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('id, client_id, supplier_id, estimated_cost, status')
      .eq('id', data.booking_id)
      .single();

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
      };
    }

    if (
      booking.client_id !== data.client_id ||
      booking.supplier_id !== data.supplier_id
    ) {
      return {
        success: false,
        error: 'Payment authorization mismatch',
      };
    }

    // Check amount is reasonable compared to estimated cost
    const estimatedCostPence = booking.estimated_cost * 100;
    if (data.amount > estimatedCostPence * 1.5) {
      return {
        success: false,
        error: 'Payment amount exceeds expected booking cost by too much',
      };
    }

    return { success: true };
  }

  private async sanitizeData(
    data: any,
    schemaKey: keyof typeof this.WEDDING_SCHEMAS,
  ): Promise<any> {
    const sanitized = { ...data };

    // Sanitization rules for each schema type
    const sanitizeString = (str: string): string => {
      return str
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\w\s@.,!?()-]/g, ''); // Remove special characters except allowed ones
    };

    const sanitizeRecursively = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursively);
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = sanitizeRecursively(value);
        }
        return result;
      }
      return obj;
    };

    return sanitizeRecursively(sanitized);
  }

  private async logValidationViolations(
    request: NextRequest,
    violations: ValidationViolation[],
    context: WeddingValidationContext,
  ): Promise<void> {
    const url = new URL(request.url);

    await this.supabase.from('security_events').insert({
      event_type: 'validation_failure',
      request_id: crypto.randomUUID(),
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent'),
      request_path: url.pathname,
      request_method: request.method,
      severity: this.getMaxSeverity(violations),
      description: `Request validation failed with ${violations.length} violations`,
      additional_data: {
        violations: violations.slice(0, 5), // Limit to prevent data overflow
        user_type: context.userType,
        subscription_tier: context.subscriptionTier,
      },
      created_at: new Date().toISOString(),
    });
  }

  private async logSecurityViolation(
    request: NextRequest,
    result: ValidationResult,
    context: WeddingValidationContext,
  ): Promise<void> {
    const url = new URL(request.url);

    await this.supabase.from('security_events').insert({
      event_type: 'security_validation_failure',
      request_id: crypto.randomUUID(),
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent'),
      request_path: url.pathname,
      request_method: request.method,
      severity: 'critical',
      description: 'Security validation detected potentially malicious input',
      action_taken: 'blocked',
      additional_data: {
        violations: result.violations?.slice(0, 3), // Limit sensitive data
        user_type: context.userType,
      },
      created_at: new Date().toISOString(),
    });
  }

  private async logValidationError(
    request: NextRequest,
    error: any,
    context: WeddingValidationContext,
  ): Promise<void> {
    console.error('Validation middleware error:', error);
  }

  private async logSuccessfulValidation(
    request: NextRequest,
    schemaKey: string,
    context: WeddingValidationContext,
  ): Promise<void> {
    // Optional: Log successful validations for analytics
  }

  private getMaxSeverity(violations: ValidationViolation[]): string {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    let maxSeverity = 'low';
    let maxLevel = 1;

    for (const violation of violations) {
      const level = severityLevels[violation.severity];
      if (level > maxLevel) {
        maxLevel = level;
        maxSeverity = violation.severity;
      }
    }

    return maxSeverity;
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      '0.0.0.0'
    );
  }

  // Convenience method for creating middleware wrapper
  createValidationMiddleware(schemaKey: keyof typeof this.WEDDING_SCHEMAS) {
    return async (
      request: NextRequest,
      context: WeddingValidationContext,
      next: () => Promise<NextResponse>,
    ): Promise<NextResponse> => {
      const result = await this.validateRequest(request, schemaKey, context);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error,
            violations: result.violations,
          },
          { status: 400 },
        );
      }

      // Add validated data to request context for downstream handlers
      // Note: This would require extending the request object
      return next();
    };
  }
}

export const requestValidator = new RequestValidationMiddleware();

// Export convenience functions
export const validateRequest = (
  request: NextRequest,
  schemaKey: keyof (typeof requestValidator)['WEDDING_SCHEMAS'],
  context: WeddingValidationContext,
) => requestValidator.validateRequest(request, schemaKey, context);
