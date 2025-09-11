/**
 * WS-166: Budget Export Validation Schemas
 * Team B: Comprehensive input validation for budget export functionality
 * SECURITY: Prevents injection attacks and validates all export parameters
 */

import { z } from 'zod';
import { secureStringSchema, uuidSchema } from './schemas';

// Export format validation
export const exportFormatSchema = z.enum(['pdf', 'csv', 'excel']);

// Payment status filter validation
export const paymentStatusSchema = z.enum([
  'paid',
  'pending',
  'planned',
  'all',
]);

// Date range validation
export const dateRangeSchema = z
  .object({
    start: z
      .string()
      .datetime('Invalid start date format')
      .refine(
        (date) => new Date(date) <= new Date(),
        'Start date cannot be in the future',
      ),
    end: z
      .string()
      .datetime('Invalid end date format')
      .refine(
        (date) => new Date(date) <= new Date(),
        'End date cannot be in the future',
      ),
  })
  .refine((data) => new Date(data.start) <= new Date(data.end), {
    message: 'Start date must be before or equal to end date',
  });

// Amount range validation
export const amountRangeSchema = z
  .object({
    min: z
      .number()
      .min(0, 'Minimum amount cannot be negative')
      .max(10000000, 'Minimum amount too large'),
    max: z
      .number()
      .min(0, 'Maximum amount cannot be negative')
      .max(10000000, 'Maximum amount too large'),
  })
  .refine((data) => data.min <= data.max, {
    message: 'Minimum amount must be less than or equal to maximum amount',
  });

// Export filters validation schema
export const exportFiltersSchema = z.object({
  categories: z
    .array(secureStringSchema)
    .max(20, 'Too many categories selected')
    .optional(),
  date_range: dateRangeSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  vendor_ids: z
    .array(uuidSchema)
    .max(100, 'Too many vendors selected')
    .optional(),
  amount_range: amountRangeSchema.optional(),
  include_notes: z.boolean().default(false),
  include_attachments: z.boolean().default(false),
});

// Page orientation validation
export const pageOrientationSchema = z.enum(['portrait', 'landscape']);

// Font size validation
export const fontSizeSchema = z.enum(['small', 'medium', 'large']);

// Export options validation schema
export const exportOptionsSchema = z.object({
  include_charts: z.boolean().default(true),
  include_timeline: z.boolean().default(false),
  include_photos: z.boolean().default(false),
  email_delivery: z.boolean().default(false),
  custom_title: secureStringSchema.max(100, 'Custom title too long').optional(),
  watermark: z.boolean().default(false),
  page_orientation: pageOrientationSchema.default('portrait'),
  font_size: fontSizeSchema.default('medium'),
});

// Main export request validation schema
export const exportRequestSchema = z
  .object({
    format: exportFormatSchema,
    filters: exportFiltersSchema.default({
      include_notes: false,
      include_attachments: false,
    }),
    options: exportOptionsSchema.default({
      include_charts: true,
      include_timeline: false,
      include_photos: false,
      email_delivery: false,
      watermark: false,
      page_orientation: 'portrait' as const,
      font_size: 'medium' as const,
    }),
  })
  .refine(
    (data) => {
      // PDF-specific validations
      if (data.format === 'pdf') {
        // PDF files with photos enabled cannot exceed certain limits for performance
        if (
          data.options.include_photos &&
          data.filters.categories &&
          data.filters.categories.length > 10
        ) {
          return false;
        }
      }

      // Email delivery validation
      if (data.options.email_delivery) {
        // Large exports with email delivery need smaller file sizes
        if (
          data.format === 'pdf' &&
          data.options.include_photos &&
          data.options.include_timeline
        ) {
          return false;
        }
      }

      return true;
    },
    {
      message:
        'Invalid combination of export options. PDF exports with photos and email delivery have size limitations.',
    },
  );

// Export status update schema (for internal use)
export const exportStatusUpdateSchema = z.object({
  export_id: uuidSchema,
  status: z.enum(['generating', 'completed', 'failed', 'expired']),
  file_url: z.string().url('Invalid file URL').optional(),
  file_size_bytes: z
    .number()
    .int()
    .min(0)
    .max(100 * 1024 * 1024)
    .optional(), // Max 100MB
  error_message: secureStringSchema.max(500).optional(),
});

// Queue priority schema
export const queuePrioritySchema = z.number().int().min(1).max(5).default(1);

// Export queue item schema
export const exportQueueItemSchema = z.object({
  export_id: uuidSchema,
  priority: queuePrioritySchema,
  retry_count: z.number().int().min(0).max(3).default(0),
  error_message: secureStringSchema.max(1000).optional(),
});

// File upload validation for custom logos/headers
export const customFileSchema = z.object({
  file_name: z
    .string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(
      /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png)$/i,
      'Only JPEG and PNG files allowed',
    ),
  file_size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(2 * 1024 * 1024, 'File too large (max 2MB)'),
  content_type: z.enum(['image/jpeg', 'image/png'], {
    errorMap: () => ({ message: 'Only JPEG and PNG images allowed' }),
  }),
});

// Rate limiting schema
export const rateLimitSchema = z.object({
  max_exports_per_hour: z.number().int().min(1).max(20).default(5),
  max_concurrent_exports: z.number().int().min(1).max(5).default(2),
});

// Budget data query schema for internal data fetching
export const budgetDataQuerySchema = z.object({
  couple_id: uuidSchema,
  include_categories: z.boolean().default(true),
  include_items: z.boolean().default(true),
  include_payments: z.boolean().default(true),
  include_attachments: z.boolean().default(false),
  date_filter: dateRangeSchema.optional(),
  status_filter: z.array(paymentStatusSchema).optional(),
});

// Export analytics schema
export const exportAnalyticsSchema = z.object({
  couple_id: uuidSchema,
  export_format: exportFormatSchema,
  export_options: z.record(z.string(), z.boolean()),
  generation_time_ms: z.number().int().min(0),
  file_size_bytes: z.number().int().min(0),
  success: z.boolean(),
  error_type: secureStringSchema.max(100).optional(),
});

// Batch export schema (for future enhancement)
export const batchExportSchema = z.object({
  couples: z.array(uuidSchema).min(1).max(10),
  format: exportFormatSchema,
  shared_options: exportOptionsSchema,
  notification_email: z.string().email().optional(),
});

// Export template schema (for future use)
export const exportTemplateSchema = z.object({
  name: secureStringSchema.min(1).max(100),
  description: secureStringSchema.max(500).optional(),
  default_format: exportFormatSchema,
  default_filters: exportFiltersSchema,
  default_options: exportOptionsSchema,
  is_public: z.boolean().default(false),
});

// Validation error response schema
export const validationErrorSchema = z.object({
  error: z.literal('VALIDATION_ERROR'),
  message: z.string(),
  errors: z.array(z.string()),
  timestamp: z.string().datetime(),
  request_id: z.string().uuid().optional(),
});

// Success response schema
export const exportSuccessSchema = z.object({
  exportId: uuidSchema,
  status: z.enum(['generating', 'completed']),
  downloadUrl: z.string().url().optional(),
  estimatedCompletionTime: z.number().int().min(0).optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

// Export the commonly used validation functions
export const validateExportRequest = (data: unknown) =>
  exportRequestSchema.safeParse(data);
export const validateExportFilters = (data: unknown) =>
  exportFiltersSchema.safeParse(data);
export const validateExportOptions = (data: unknown) =>
  exportOptionsSchema.safeParse(data);
export const validateBudgetDataQuery = (data: unknown) =>
  budgetDataQuerySchema.safeParse(data);

// Constants for validation
export const EXPORT_VALIDATION_CONSTANTS = {
  MAX_CATEGORIES: 20,
  MAX_VENDORS: 100,
  MAX_CUSTOM_TITLE_LENGTH: 100,
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_EXPORTS_PER_HOUR: 5,
  MAX_CONCURRENT_EXPORTS: 2,
  MAX_RETRY_ATTEMPTS: 3,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png'],
  SUPPORTED_EXPORT_FORMATS: ['pdf', 'csv', 'excel'] as const,
} as const;
