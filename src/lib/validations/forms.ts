import { z } from 'zod';
import { XSSProtection, XSSSafeSchemas } from '@/lib/security/xss-protection';

// Base validation patterns - enhanced with XSS protection
const safeTextPattern = /^[a-zA-Z0-9\s\-_.,!?()'"@#$%&*+=:;/<>\[\]{}|~`^\\]*$/;
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phonePattern = /^[\+]?[\d\s\-\(\)]{10,20}$/;
const urlPattern = /^https?:\/\/([\w.-]+)\.([a-zA-Z]{2,})(\/.*)?$/;

// Core field validation schema
const fieldBaseSchema = z.object({
  id: z.string().uuid().describe('Field unique identifier'),
  type: z
    .enum([
      'text',
      'email',
      'tel',
      'number',
      'textarea',
      'select',
      'radio',
      'checkbox',
      'date',
      'time',
      'file',
      'signature',
      'heading',
      'paragraph',
      'divider',
    ])
    .describe('Field input type'),
  label: XSSSafeSchemas.safeText(200).refine(
    (val) => val.length > 0,
    'Label is required',
  ),
  placeholder: XSSSafeSchemas.safeText(300).optional(),
  helperText: XSSSafeSchemas.safeText(500).optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0).max(1000),
  validation: z
    .object({
      required: z.boolean().default(false),
      minLength: z.number().int().min(0).max(10000).optional(),
      maxLength: z.number().int().min(0).max(10000).optional(),
      pattern: z.string().max(500).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  options: z
    .array(
      z.object({
        id: XSSSafeSchemas.safeUuid(),
        label: XSSSafeSchemas.safeText(100).refine(
          (val) => val.length > 0,
          'Option label is required',
        ),
        value: XSSSafeSchemas.safeText(100).refine(
          (val) => val.length > 0,
          'Option value is required',
        ),
      }),
    )
    .optional(),
  width: z.enum(['full', 'half', 'third', 'quarter']).default('full'),
  defaultValue: z
    .union([
      XSSSafeSchemas.safeText(1000),
      z.number(),
      z.boolean(),
      z.array(XSSSafeSchemas.safeText(100)),
    ])
    .optional(),
});

// Form section schema
const formSectionSchema = z.object({
  id: XSSSafeSchemas.safeUuid(),
  title: XSSSafeSchemas.safeText(200).refine(
    (val) => val.length > 0,
    'Section title is required',
  ),
  description: XSSSafeSchemas.safeText(1000).optional(),
  fields: z.array(fieldBaseSchema).min(0).max(50),
  order: z.number().int().min(0).max(100),
});

// Form settings schema
const formSettingsSchema = z.object({
  name: XSSSafeSchemas.safeText(200).refine(
    (val) => val.length > 0,
    'Form name is required',
  ),
  description: XSSSafeSchemas.safeText(1000).optional(),
  submitButtonText: XSSSafeSchemas.safeText(50)
    .refine((val) => val.length > 0, 'Button text is required')
    .default('Submit'),
  successMessage: XSSSafeSchemas.safeText(500)
    .refine((val) => val.length > 0, 'Success message is required')
    .default('Thank you for your submission!'),
  notificationEmail: XSSSafeSchemas.safeEmail().optional().or(z.literal('')),
  autoSave: z.boolean().default(false),
  requireLogin: z.boolean().default(false),
  allowMultipleSubmissions: z.boolean().default(false),
  collectEmail: z.boolean().default(true),
});

// Form creation/update schema
export const formSchema = z.object({
  title: XSSSafeSchemas.safeText(200).refine(
    (val) => val.length > 0,
    'Title is required',
  ),
  description: XSSSafeSchemas.safeText(1000).optional(),
  sections: z
    .array(formSectionSchema)
    .min(1, 'At least one section required')
    .max(20),
  settings: formSettingsSchema,
  isPublished: z.boolean().default(false),
  slug: XSSSafeSchemas.safeSlug(100).refine(
    (val) => val.length > 0,
    'Slug is required',
  ),
});

// Form submission field value validation
const fieldValueSchema = z.union([
  // Text inputs
  z
    .string()
    .max(10000)
    .regex(safeTextPattern, 'Field value contains invalid characters'),
  // Number inputs
  z.number().min(-999999999).max(999999999),
  // Boolean (checkbox)
  z.boolean(),
  // Multiple values (checkbox groups)
  z.record(z.string(), z.boolean()),
  // File metadata
  z.object({
    name: z
      .string()
      .max(255)
      .regex(/^[a-zA-Z0-9\-_\.\s]+$/, 'Invalid filename'),
    size: z.number().max(50 * 1024 * 1024), // 50MB max
    type: z.enum([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
  }),
  // Empty/null values
  z.null(),
  z.undefined(),
]);

// Form submission schema
export const formSubmissionSchema = z.object({
  formId: z.string().uuid('Invalid form ID'),
  data: z
    .record(z.string().uuid(), fieldValueSchema)
    .refine(
      (data) => Object.keys(data).length > 0,
      'Submission cannot be empty',
    )
    .refine(
      (data) => Object.keys(data).length <= 100,
      'Too many fields in submission',
    ),
  metadata: z
    .object({
      userAgent: z.string().max(500).optional(),
      ipAddress: z
        .string()
        .regex(
          /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
        )
        .optional(),
      timestamp: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/),
      sessionId: z.string().uuid().optional(),
    })
    .optional(),
});

// Field update schema for form builder
export const fieldUpdateSchema = fieldBaseSchema.partial().extend({
  id: z.string().uuid(), // ID is always required for updates
});

// Bulk field operations
export const bulkFieldOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'reorder']),
  fields: z.array(fieldBaseSchema).max(50),
  sectionId: z.string().uuid(),
});

// Enhanced security validation helpers with comprehensive XSS protection
export function sanitizeFieldValue(value: unknown, fieldType: string): unknown {
  return XSSProtection.sanitizeFormField(value, fieldType);
}

// File upload validation
export const fileUploadSchema = z.object({
  file: z.object({
    name: z
      .string()
      .min(1, 'Filename required')
      .max(255, 'Filename too long')
      .regex(/^[a-zA-Z0-9\-_\.\s]+$/, 'Invalid characters in filename'),
    size: z
      .number()
      .min(1, 'File cannot be empty')
      .max(50 * 1024 * 1024, 'File too large (max 50MB)'),
    type: z.enum(
      [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      'File type not allowed',
    ),
  }),
  fieldId: z.string().uuid(),
  formId: z.string().uuid(),
});

// Export all schemas for use in API routes and components
export {
  fieldBaseSchema,
  formSectionSchema,
  formSettingsSchema,
  fieldValueSchema,
  safeTextPattern,
  emailPattern,
  phonePattern,
  urlPattern,
};
