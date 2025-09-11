// Security validation for bulk messaging - WS-155
import { z } from 'zod';
// Note: DOMPurify needs to be imported differently in server/client environments
// import DOMPurify from 'dompurify'
import {
  BulkMessageData,
  CreateBulkMessageRequest,
} from '@/types/communications';

// Mock rateLimit function for now - this should be implemented properly
const rateLimit = async (options: any) => {
  return { success: true, remaining: options.maxRequests - 1 };
};

// Mock DOMPurify for server-side usage
const DOMPurify = {
  sanitize: (content: string, options?: any) => {
    // Basic HTML sanitization - in production, use a proper server-side sanitizer
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
};

// Rate limiting constants
const MESSAGING_RATE_LIMIT = {
  maxRequests: 5, // Max 5 bulk sends per hour
  windowMs: 60 * 60 * 1000, // 1 hour window
  identifier: 'bulk-messaging',
} as const;

// Content validation schemas
const messageContentSchema = z.object({
  subject: z.string().max(200).optional(),
  html_content: z.string().max(50000).min(1, 'Message content is required'),
  text_content: z.string().max(10000).min(1, 'Text content is required'),
});

const bulkMessageValidationSchema = z.object({
  couple_id: z.string().uuid('Invalid couple ID'),
  recipient_ids: z
    .array(z.string().uuid())
    .min(1, 'At least one recipient is required')
    .max(500, 'Too many recipients'),
  segmentation_criteria: z.object({
    rsvp_status: z
      .array(z.enum(['pending', 'attending', 'declined', 'maybe']))
      .optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    age_groups: z.array(z.enum(['adult', 'child', 'infant'])).optional(),
    categories: z
      .array(z.enum(['family', 'friends', 'work', 'other']))
      .optional(),
    sides: z.array(z.enum(['partner1', 'partner2', 'mutual'])).optional(),
    has_plus_one: z.boolean().optional(),
    has_dietary_restrictions: z.boolean().optional(),
    has_special_needs: z.boolean().optional(),
    table_numbers: z.array(z.number()).optional(),
    tags: z.array(z.string()).optional(),
    custom_filters: z.record(z.any()).optional(),
  }),
  message_content: messageContentSchema,
  delivery_options: z.object({
    channels: z
      .array(z.enum(['email', 'sms', 'whatsapp']))
      .min(1, 'At least one delivery channel is required'),
    send_immediately: z.boolean(),
    scheduled_for: z.string().datetime().optional(),
    test_mode: z.boolean().default(false),
    batch_size: z.number().min(1).max(200).optional(),
    delay_between_batches: z.number().min(1).max(300).optional(),
  }),
  personalization_tokens: z.array(
    z.object({
      token: z.string(),
      display_name: z.string(),
      description: z.string(),
      example_value: z.string(),
      required: z.boolean(),
      type: z.enum(['text', 'date', 'number', 'boolean']),
    }),
  ),
  template_id: z.string().uuid().optional(),
});

// Security validation functions
export class CommunicationsSecurity {
  /**
   * Validate that couple owns all recipient guests
   */
  static async validateGuestOwnership(
    coupleId: string,
    recipientIds: string[],
  ): Promise<{ isValid: boolean; invalidGuestIds: string[] }> {
    try {
      // TODO: Replace with actual database query
      // This should query the database to ensure all guest IDs belong to the couple
      const response = await fetch(`/api/guests/validate-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: coupleId, guest_ids: recipientIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate guest ownership');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Guest ownership validation error:', error);
      // Fail securely - if we can't validate, assume invalid
      return { isValid: false, invalidGuestIds: recipientIds };
    }
  }

  /**
   * Apply rate limiting for bulk messaging
   */
  static async rateLimitMessaging(coupleId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    dailyLimit: number;
  }> {
    try {
      const result = await rateLimit({
        ...MESSAGING_RATE_LIMIT,
        identifier: `${MESSAGING_RATE_LIMIT.identifier}:${coupleId}`,
      });

      return {
        allowed: result.success,
        remaining: result.remaining || 0,
        resetTime: new Date(Date.now() + MESSAGING_RATE_LIMIT.windowMs),
        dailyLimit: MESSAGING_RATE_LIMIT.maxRequests,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail securely - if rate limiting fails, deny the request
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + MESSAGING_RATE_LIMIT.windowMs),
        dailyLimit: MESSAGING_RATE_LIMIT.maxRequests,
      };
    }
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(htmlContent: string): string {
    // Configure DOMPurify to allow only safe HTML tags and attributes
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'blockquote',
        'div',
        'span',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target'],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });

    return cleanHtml;
  }

  /**
   * Validate email addresses
   */
  static validateEmailAddresses(emails: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach((email) => {
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return { valid, invalid };
  }

  /**
   * Validate phone numbers (basic validation)
   */
  static validatePhoneNumbers(phones: string[]): {
    valid: string[];
    invalid: string[];
  } {
    // Basic international phone number regex
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    phones.forEach((phone) => {
      const cleanPhone = phone.replace(/\s/g, '');
      if (phoneRegex.test(cleanPhone)) {
        valid.push(phone);
      } else {
        invalid.push(phone);
      }
    });

    return { valid, invalid };
  }

  /**
   * Comprehensive validation of bulk message request
   */
  static async validateBulkMessageRequest(
    request: CreateBulkMessageRequest,
  ): Promise<{
    isValid: boolean;
    errors: Array<{
      field: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
    warnings: string[];
    sanitizedRequest?: CreateBulkMessageRequest;
  }> {
    const errors: Array<{
      field: string;
      message: string;
      severity: 'error' | 'warning';
    }> = [];
    const warnings: string[] = [];

    try {
      // 1. Schema validation
      const validatedData = bulkMessageValidationSchema.parse(request);

      // 2. Guest ownership validation
      const ownershipValidation = await this.validateGuestOwnership(
        request.couple_id,
        request.recipient_ids,
      );

      if (!ownershipValidation.isValid) {
        errors.push({
          field: 'recipient_ids',
          message: `Invalid guest IDs: ${ownershipValidation.invalidGuestIds.join(', ')}`,
          severity: 'error',
        });
      }

      // 3. Rate limiting check
      const rateLimitResult = await this.rateLimitMessaging(request.couple_id);
      if (!rateLimitResult.allowed) {
        errors.push({
          field: 'couple_id',
          message: `Rate limit exceeded. ${rateLimitResult.remaining} requests remaining. Resets at ${rateLimitResult.resetTime.toISOString()}`,
          severity: 'error',
        });
      }

      // 4. Content sanitization
      const sanitizedHtml = this.sanitizeHTML(
        request.message_content.html_content,
      );
      if (sanitizedHtml !== request.message_content.html_content) {
        warnings.push(
          'HTML content has been sanitized to remove potentially unsafe elements',
        );
      }

      // 5. Schedule validation
      if (
        !request.delivery_options.send_immediately &&
        request.delivery_options.scheduled_for
      ) {
        const scheduledTime = new Date(request.delivery_options.scheduled_for);
        const now = new Date();
        const minScheduleTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

        if (scheduledTime < minScheduleTime) {
          errors.push({
            field: 'scheduled_for',
            message: 'Scheduled time must be at least 15 minutes in the future',
            severity: 'error',
          });
        }
      }

      // 6. Content length warnings
      if (request.message_content.html_content.length > 10000) {
        warnings.push(
          'Message is quite long and may be truncated in some email clients',
        );
      }

      if (request.message_content.text_content.length > 1600) {
        warnings.push(
          'SMS content exceeds recommended length and may be split into multiple messages',
        );
      }

      // 7. Batch size validation
      if (
        request.recipient_ids.length > 100 &&
        (!request.delivery_options.batch_size ||
          request.delivery_options.batch_size > 50)
      ) {
        warnings.push(
          'Consider using smaller batch sizes for large recipient lists to improve deliverability',
        );
      }

      // Create sanitized request
      const sanitizedRequest: CreateBulkMessageRequest = {
        ...request,
        message_content: {
          ...request.message_content,
          html_content: sanitizedHtml,
        },
      };

      return {
        isValid: errors.filter((e) => e.severity === 'error').length === 0,
        errors,
        warnings,
        sanitizedRequest,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to our error format
        error.issues.forEach((err) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            severity: 'error',
          });
        });
      } else {
        errors.push({
          field: 'general',
          message: 'Unexpected validation error occurred',
          severity: 'error',
        });
      }

      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Create unsubscribe token for guest privacy
   */
  static generateUnsubscribeToken(coupleId: string, guestId: string): string {
    // In production, this should use proper cryptographic signing
    // For now, using a simple base64 encoding (NOT secure for production)
    const payload = JSON.stringify({
      coupleId,
      guestId,
      timestamp: Date.now(),
    });

    return Buffer.from(payload).toString('base64url');
  }

  /**
   * Validate and decode unsubscribe token
   */
  static validateUnsubscribeToken(token: string): {
    isValid: boolean;
    coupleId?: string;
    guestId?: string;
  } {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());

      // Check if token is not too old (30 days max)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (Date.now() - payload.timestamp > maxAge) {
        return { isValid: false };
      }

      return {
        isValid: true,
        coupleId: payload.coupleId,
        guestId: payload.guestId,
      };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    event:
      | 'rate_limit_exceeded'
      | 'invalid_guest_ownership'
      | 'content_sanitized'
      | 'suspicious_activity',
    coupleId: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      // TODO: Replace with actual security logging service
      console.warn('Security Event:', {
        event,
        coupleId,
        details,
        timestamp: new Date().toISOString(),
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      });

      // In production, this would send to a security monitoring service
      // await securityMonitoringService.log(event, { coupleId, details })
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

// Middleware function for API routes
export async function withSecureValidation<T>(
  handler: (validatedData: T) => Promise<any>,
  validationSchema: z.ZodSchema<T>,
) {
  return async (request: any) => {
    try {
      const validatedData = validationSchema.parse(request);
      return await handler(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        };
      }
      throw error;
    }
  };
}

// Export validation schemas for use in API routes
export { messageContentSchema, bulkMessageValidationSchema };
