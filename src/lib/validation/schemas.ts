/**
 * Comprehensive Zod validation schemas for WedSync API security
 * SECURITY: Prevents SQL injection, XSS, and malformed data attacks
 */

import { z } from 'zod';

// Base validation primitives
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long')
  .transform((email) => email.toLowerCase().trim());

export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character',
  );

// Secure string schema - prevents SQL injection and XSS
export const secureStringSchema = z
  .string()
  .transform((val) => val.trim())
  .refine(
    (val) =>
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'String contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
    'String contains potentially dangerous XSS patterns',
  );

export const safeTextSchema = z
  .string()
  .min(1, 'Text cannot be empty')
  .max(1000, 'Text too long')
  .transform((val) => val.trim())
  .refine(
    (val) =>
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'String contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
    'String contains potentially dangerous XSS patterns',
  );

export const safeNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .transform((val) => val.trim())
  .refine(
    (val) =>
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'String contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
    'String contains potentially dangerous XSS patterns',
  );

// Client validation schema
export const clientSchema = z.object({
  id: uuidSchema.optional(),
  name: safeNameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  wedding_date: z.string().datetime('Invalid date format').optional(),
  budget: z
    .number()
    .min(0, 'Budget cannot be negative')
    .max(10000000, 'Budget too large')
    .optional(),
  guest_count: z
    .number()
    .int()
    .min(1, 'Guest count must be at least 1')
    .max(10000, 'Guest count too large')
    .optional(),
  venue: safeTextSchema.optional(),
  notes: z.string().max(5000, 'Notes too long').optional(),
  status: z
    .enum(['active', 'inactive', 'pending', 'completed'])
    .default('active'),
  partner_name: safeNameSchema.optional(),
  partner_email: emailSchema.optional(),
  partner_phone: phoneSchema.optional(),
});

// Supplier validation schema
export const supplierSchema = z.object({
  id: uuidSchema.optional(),
  name: safeNameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  category: z.enum([
    'photographer',
    'videographer',
    'florist',
    'caterer',
    'venue',
    'band',
    'dj',
    'other',
  ]),
  website: z
    .string()
    .url('Invalid website URL')
    .max(255, 'URL too long')
    .optional(),
  location: safeTextSchema.optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  price_range: z.enum(['budget', 'mid', 'luxury']).optional(),
  rating: z.number().min(0).max(5).optional(),
  verified: z.boolean().default(false),
});

// Communication validation schema
export const communicationSchema = z.object({
  id: uuidSchema.optional(),
  client_id: uuidSchema,
  supplier_id: uuidSchema.optional(),
  subject: z
    .string()
    .min(1, 'Subject cannot be empty')
    .max(200, 'Subject too long')
    .transform((val) => val.trim())
    .refine(
      (val) =>
        !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
          val,
        ),
      'Subject contains potentially dangerous SQL patterns',
    ),
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long'),
  type: z.enum(['email', 'sms', 'call', 'meeting', 'note']),
  status: z
    .enum(['draft', 'sent', 'delivered', 'read', 'replied'])
    .default('draft'),
  scheduled_at: z.string().datetime('Invalid date format').optional(),
  attachments: z
    .array(z.string().uuid())
    .max(10, 'Too many attachments')
    .optional(),
});

// Payment validation schema
export const paymentSchema = z.object({
  id: uuidSchema.optional(),
  client_id: uuidSchema,
  supplier_id: uuidSchema.optional(),
  amount: z
    .number()
    .min(0.01, 'Amount must be positive')
    .max(1000000, 'Amount too large'),
  currency: z.string().length(3, 'Invalid currency code').default('USD'),
  description: safeTextSchema,
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'refunded'])
    .default('pending'),
  payment_method: z.enum(['card', 'bank_transfer', 'paypal', 'cash', 'check']),
  stripe_payment_intent_id: z.string().optional(),
  due_date: z.string().datetime('Invalid date format').optional(),
});

// User authentication validation schema
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string(),
    name: safeNameSchema,
    phone: phoneSchema.optional(),
    company_name: safeTextSchema.optional(),
    terms_accepted: z
      .boolean()
      .refine((val) => val === true, 'Terms must be accepted'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

// API Key validation schema
export const apiKeySchema = z.object({
  id: uuidSchema.optional(),
  name: safeNameSchema,
  permissions: z
    .array(z.enum(['read', 'write', 'delete', 'admin']))
    .min(1, 'At least one permission required'),
  expires_at: z.string().datetime('Invalid date format').optional(),
  rate_limit: z
    .number()
    .int()
    .min(100, 'Rate limit too low')
    .max(100000, 'Rate limit too high')
    .default(1000),
});

// File upload validation schema
export const fileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters'),
  content_type: z
    .string()
    .regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+$/, 'Invalid content type'),
  size: z
    .number()
    .int()
    .min(1, 'File cannot be empty')
    .max(100 * 1024 * 1024, 'File too large (max 100MB)'),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sort_by: z
    .string()
    .regex(/^[a-zA-Z_]+$/, 'Invalid sort field')
    .optional(),
});

export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query required')
    .max(100, 'Search query too long')
    .transform((val) => val.trim())
    .refine(
      (val) =>
        !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
          val,
        ),
      'String contains potentially dangerous SQL patterns',
    )
    .refine(
      (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
      'String contains potentially dangerous XSS patterns',
    ),
  category: z
    .string()
    .regex(/^[a-zA-Z_]+$/, 'Invalid category')
    .optional(),
  filters: z
    .record(
      z.string(),
      z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid filter value'),
    )
    .optional(),
});

// MFA validation schemas
export const mfaSetupSchema = z.object({
  secret: z.string().length(32, 'Invalid secret length'),
  code: z
    .string()
    .length(6, 'MFA code must be 6 digits')
    .regex(/^\d{6}$/, 'MFA code must be numeric'),
});

export const mfaVerifySchema = z.object({
  code: z
    .string()
    .length(6, 'MFA code must be 6 digits')
    .regex(/^\d{6}$/, 'MFA code must be numeric'),
});

// Webhook validation schemas
export const stripeWebhookSchema = z.object({
  id: z.string().min(1, 'Stripe event ID required'),
  type: z.string().min(1, 'Stripe event type required'),
  data: z.record(z.string(), z.unknown()),
});

// Security validation helpers
export const validateRequestBody = <T>(schema: z.ZodSchema<T>) => {
  return (
    body: unknown,
  ): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const validatedData = schema.parse(body);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(
          (err) => `${err.path.join('.')}: ${err.message}`,
        );
        return { success: false, errors };
      }
      return { success: false, errors: ['Invalid request body'] };
    }
  };
};

// Create type-safe validation middleware
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return validateRequestBody(schema);
};

// WS-159: Task Tracking Validation Schemas
export const taskTrackingStatusSchema = z.enum([
  'pending',
  'accepted',
  'in_progress',
  'blocked',
  'review',
  'completed',
  'cancelled',
]);

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const taskCategorySchema = z.enum([
  'venue_management',
  'vendor_coordination',
  'client_management',
  'logistics',
  'design',
  'photography',
  'catering',
  'florals',
  'music',
  'transportation',
]);

// Task status update validation schema
export const taskStatusUpdateSchema = z.object({
  assignment_id: uuidSchema,
  new_status: taskTrackingStatusSchema,
  progress_percentage: z
    .number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100%')
    .optional(),
  notes: z
    .string()
    .max(2000, 'Notes too long')
    .optional()
    .transform((val) => (val ? val.trim() : val))
    .refine(
      (val) =>
        !val ||
        !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
          val,
        ),
      'Notes contain potentially dangerous SQL patterns',
    )
    .refine(
      (val) =>
        !val || !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
      'Notes contain potentially dangerous XSS patterns',
    ),
  completion_photos: z
    .array(z.string().url('Invalid photo URL'))
    .max(10, 'Too many photos')
    .optional(),
  verification_required: z.boolean().optional().default(false),
});

// Task progress update validation schema
export const taskProgressUpdateSchema = z.object({
  assignment_id: uuidSchema,
  progress_percentage: z
    .number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100%'),
  status_notes: z
    .string()
    .max(1000, 'Status notes too long')
    .optional()
    .transform((val) => (val ? val.trim() : val))
    .refine(
      (val) =>
        !val ||
        !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
          val,
        ),
      'Status notes contain potentially dangerous SQL patterns',
    )
    .refine(
      (val) =>
        !val || !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
      'Status notes contain potentially dangerous XSS patterns',
    ),
  milestone_reached: z
    .string()
    .max(200, 'Milestone description too long')
    .optional()
    .transform((val) => (val ? val.trim() : val)),
  estimated_completion: z
    .string()
    .datetime('Invalid completion date')
    .optional(),
  blocking_issues: z
    .string()
    .max(1000, 'Blocking issues description too long')
    .optional()
    .transform((val) => (val ? val.trim() : val)),
});

// Photo evidence upload validation schema
export const photoEvidenceSchema = z.object({
  task_id: uuidSchema,
  file_name: z
    .string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(
      /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i,
      'Invalid file name or type',
    ),
  file_size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  content_type: z.enum(
    ['image/jpeg', 'image/png', 'image/webp'],
    'Only JPEG, PNG, and WebP images allowed',
  ),
  description: z
    .string()
    .max(500, 'Description too long')
    .optional()
    .transform((val) => (val ? val.trim() : val)),
  is_completion_proof: z.boolean().default(false),
});

// Task query parameters validation
export const taskQuerySchema = z.object({
  wedding_id: uuidSchema.optional(),
  status: taskTrackingStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: taskCategorySchema.optional(),
  assigned_to: uuidSchema.optional(),
  include_history: z.boolean().default(false),
  include_photos: z.boolean().default(false),
  ...paginationSchema.shape,
});

// Task creation schema (extended from existing)
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title required')
    .max(255, 'Title too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(2000, 'Description too long')
    .optional()
    .transform((val) => (val ? val.trim() : val)),
  wedding_id: uuidSchema,
  category: taskCategorySchema,
  priority: taskPrioritySchema.default('medium'),
  assigned_to: uuidSchema.optional(),
  estimated_duration: z
    .number()
    .min(0.25, 'Duration must be at least 15 minutes')
    .max(168, 'Duration cannot exceed 1 week'),
  buffer_time: z
    .number()
    .min(0, 'Buffer time cannot be negative')
    .max(48, 'Buffer time cannot exceed 48 hours')
    .default(0),
  deadline: z.string().datetime('Invalid deadline format'),
  notes: safeTextSchema.optional(),
  tracking_enabled: z.boolean().default(true),
  requires_photo_evidence: z.boolean().default(false),
});

// Export common validation combinations
export const createClientValidation = createValidationMiddleware(clientSchema);
export const createSupplierValidation =
  createValidationMiddleware(supplierSchema);
export const createCommunicationValidation =
  createValidationMiddleware(communicationSchema);
export const createPaymentValidation =
  createValidationMiddleware(paymentSchema);
export const createAuthValidation = createValidationMiddleware(authSchema);
export const createSignupValidation = createValidationMiddleware(signupSchema);

// WS-159: Task Tracking Validations
export const createTaskStatusValidation = createValidationMiddleware(
  taskStatusUpdateSchema,
);
export const createTaskProgressValidation = createValidationMiddleware(
  taskProgressUpdateSchema,
);
export const createPhotoEvidenceValidation =
  createValidationMiddleware(photoEvidenceSchema);
export const createTaskQueryValidation =
  createValidationMiddleware(taskQuerySchema);
export const createTaskValidation =
  createValidationMiddleware(createTaskSchema);
