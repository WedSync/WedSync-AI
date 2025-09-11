import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Maximum field lengths to prevent oversized inputs
const MAX_FIELD_NAME_LENGTH = 100;
const MAX_STRING_LENGTH = 500;
const MAX_TEXT_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 20;
const MAX_URL_LENGTH = 2048;

// Regex patterns for validation
const FIELD_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const PHONE_REGEX =
  /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
const SAFE_STRING_REGEX = /^[^<>{}]*$/; // Basic XSS prevention

// Sanitization helper
export function sanitizeInput(input: string): string {
  // Remove any HTML/script tags
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Additional sanitization for common injection patterns
  return cleaned
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Core field value schema with sanitization
export const CoreFieldValueSchema = z
  .object({
    // Text fields
    bride_first_name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),
    bride_last_name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),
    groom_first_name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),
    groom_last_name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),

    // Email fields with validation
    bride_email: z.string().email().max(MAX_EMAIL_LENGTH).optional(),
    groom_email: z.string().email().max(MAX_EMAIL_LENGTH).optional(),

    // Phone fields with validation
    bride_phone: z
      .string()
      .max(MAX_PHONE_LENGTH)
      .regex(PHONE_REGEX, 'Invalid phone number format')
      .transform(sanitizeInput)
      .optional(),
    groom_phone: z
      .string()
      .max(MAX_PHONE_LENGTH)
      .regex(PHONE_REGEX, 'Invalid phone number format')
      .transform(sanitizeInput)
      .optional(),

    // Date fields
    wedding_date: z.string().datetime().or(z.date()).optional(),
    ceremony_time: z.string().transform(sanitizeInput).optional(),
    reception_time: z.string().transform(sanitizeInput).optional(),

    // Venue information
    venue_name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),
    venue_address: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),
    venue_city: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeInput)
      .optional(),
    venue_state: z.string().max(50).transform(sanitizeInput).optional(),
    venue_zip: z.string().max(20).transform(sanitizeInput).optional(),
    venue_country: z.string().max(100).transform(sanitizeInput).optional(),

    // Numbers
    guest_count: z.number().int().min(0).max(10000).optional(),
    budget: z.number().min(0).max(10000000).optional(),

    // Long text fields
    notes: z.string().max(MAX_TEXT_LENGTH).transform(sanitizeInput).optional(),
    special_requests: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .transform(sanitizeInput)
      .optional(),
  })
  .strict(); // Reject unknown fields

// Schema for field names
export const CoreFieldNameSchema = z
  .string()
  .min(1, 'Field name cannot be empty')
  .max(
    MAX_FIELD_NAME_LENGTH,
    `Field name too long (max ${MAX_FIELD_NAME_LENGTH} chars)`,
  )
  .regex(
    FIELD_NAME_REGEX,
    'Field name can only contain letters, numbers, underscores, and hyphens',
  );

// Schema for field mapping
export const CoreFieldMappingSchema = z.object({
  form_field_id: z.string().uuid('Invalid form field ID'),
  core_field_key: CoreFieldNameSchema,
  confidence: z.number().min(0).max(1).optional(),
  sync_direction: z
    .enum(['read_only', 'write_only', 'bidirectional'])
    .optional(),
});

// Schema for form field
export const FormFieldSchema = z.object({
  id: z.string().uuid('Invalid field ID'),
  label: z.string().max(MAX_STRING_LENGTH).transform(sanitizeInput),
  type: z.enum([
    'text',
    'email',
    'phone',
    'date',
    'time',
    'number',
    'currency',
    'select',
    'checkbox',
    'radio',
    'textarea',
    'file',
  ]),
  value: z.any().optional(),
});

// Schema for wedding data update
export const WeddingDataUpdateSchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID'),
  updates: CoreFieldValueSchema,
  source: z.enum(['form_submission', 'manual_edit', 'api_update']).optional(),
});

// Schema for populate request
export const PopulateRequestSchema = z.object({
  formId: z.string().uuid('Invalid form ID'),
  clientId: z.string().uuid('Invalid client ID'),
  formFields: z.array(FormFieldSchema),
});

// Schema for share with vendor
export const ShareWithVendorSchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID'),
  vendorOrganizationId: z.string().uuid('Invalid vendor organization ID'),
  permissions: z
    .object({
      canWrite: z.boolean().optional(),
      allowedCategories: z
        .array(
          z.enum([
            'couple_info',
            'wedding_details',
            'venue_info',
            'vendor_info',
            'guest_info',
          ]),
        )
        .optional(),
    })
    .optional(),
});

// Validate a single core field value
export function validateCoreFieldValue(
  fieldName: string,
  value: any,
): { valid: boolean; error?: string; sanitized?: any } {
  try {
    // First validate the field name
    const nameResult = CoreFieldNameSchema.safeParse(fieldName);
    if (!nameResult.success) {
      return {
        valid: false,
        error: `Invalid field name: ${nameResult.error.issues[0].message}`,
      };
    }

    // Check for SQL injection patterns in the value
    if (typeof value === 'string') {
      const suspiciousPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|INTO|FROM|WHERE)\b)/gi,
        /(--|\/\*|\*\/|;|\||\\x|\\0|<script|<\/script|javascript:|onerror=|onclick=)/gi,
        /(\'; DROP TABLE|1=1|OR 1=1|' OR ')/gi,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return {
            valid: false,
            error: 'Input contains potentially malicious content',
          };
        }
      }

      // Check for oversized inputs
      if (value.length > MAX_TEXT_LENGTH) {
        return {
          valid: false,
          error: `Input too long (max ${MAX_TEXT_LENGTH} characters)`,
        };
      }
    }

    // Validate against the schema if the field exists
    const schemaField =
      CoreFieldValueSchema.shape[
        fieldName as keyof typeof CoreFieldValueSchema.shape
      ];
    if (schemaField) {
      const result = schemaField.safeParse(value);
      if (!result.success) {
        return {
          valid: false,
          error: result.error.issues[0].message,
        };
      }
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    // For unknown fields, apply basic sanitization
    if (typeof value === 'string') {
      return {
        valid: true,
        sanitized: sanitizeInput(value),
      };
    }

    return { valid: true, sanitized: value };
  } catch (error) {
    return {
      valid: false,
      error: 'Validation error occurred',
    };
  }
}

// Batch validate multiple fields
export function validateCoreFields(fields: Record<string, any>): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, any>;
} {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, any> = {};
  let valid = true;

  for (const [key, value] of Object.entries(fields)) {
    const result = validateCoreFieldValue(key, value);
    if (!result.valid) {
      valid = false;
      errors[key] = result.error || 'Validation failed';
    } else {
      sanitized[key] = result.sanitized ?? value;
    }
  }

  return { valid, errors, sanitized };
}

// Export type definitions
export type CoreFieldValue = z.infer<typeof CoreFieldValueSchema>;
export type CoreFieldMapping = z.infer<typeof CoreFieldMappingSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type WeddingDataUpdate = z.infer<typeof WeddingDataUpdateSchema>;
export type PopulateRequest = z.infer<typeof PopulateRequestSchema>;
export type ShareWithVendor = z.infer<typeof ShareWithVendorSchema>;
