import { z } from 'zod';
import { XSSProtection, XSSSafeSchemas } from '@/lib/security/xss-protection';
import {
  fieldBaseSchema,
  formSectionSchema,
  formSettingsSchema,
  fieldValueSchema,
  emailPattern,
  phonePattern,
  urlPattern,
} from '@/lib/validations/forms';

// Enhanced field types for advanced form builder
const advancedFieldTypes = z.enum([
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
  'datetime-local',
  'file',
  'signature',
  'heading',
  'paragraph',
  'divider',
  // Advanced field types
  'multi-select',
  'rating',
  'slider',
  'color',
  'url',
  'password',
  'rich-text',
  'address',
  'payment',
  'table',
  'repeater',
  'image-upload',
  'video-upload',
  'audio-upload',
  'document-upload',
  'calendar-booking',
  'location-picker',
  'guest-list',
  'seating-chart',
  'budget-calculator',
  'timeline-builder',
  'vendor-selector',
]);

// Conditional logic operators
const logicOperators = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'greater_or_equal',
  'less_or_equal',
  'is_empty',
  'is_not_empty',
  'starts_with',
  'ends_with',
  'regex_match',
  'in_list',
  'not_in_list',
  'date_before',
  'date_after',
]);

// Conditional logic actions
const logicActions = z.enum([
  'show_field',
  'hide_field',
  'enable_field',
  'disable_field',
  'make_required',
  'make_optional',
  'set_value',
  'clear_value',
  'show_section',
  'hide_section',
  'jump_to_step',
  'calculate_value',
  'trigger_webhook',
  'send_email',
  'update_database',
]);

// Enhanced validation rules schema
const advancedValidationSchema = z.object({
  required: z.boolean().default(false),
  minLength: z.number().int().min(0).max(100000).optional(),
  maxLength: z.number().int().min(0).max(100000).optional(),
  pattern: z.string().max(1000).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  // Advanced validation rules
  customRule: z.string().max(5000).optional(),
  errorMessage: XSSSafeSchemas.safeText(200).optional(),
  warningMessage: XSSSafeSchemas.safeText(200).optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().positive().optional(),
  minFiles: z.number().int().min(0).optional(),
  maxFiles: z.number().int().min(1).optional(),
  dateRange: z
    .object({
      min: z.string().date().optional(),
      max: z.string().date().optional(),
    })
    .optional(),
  numberRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().positive().optional(),
    })
    .optional(),
  uniqueValues: z.boolean().default(false),
  crossFieldValidation: z
    .array(
      z.object({
        fieldId: z.string().uuid(),
        operator: logicOperators,
        value: z.any(),
      }),
    )
    .optional(),
});

// Conditional logic condition schema
const conditionalLogicConditionSchema = z.object({
  id: z.string().uuid(),
  sourceField: z.string().uuid(),
  operator: logicOperators,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
  logicalOperator: z.enum(['AND', 'OR']).default('AND'),
});

// Conditional logic action schema
const conditionalLogicActionSchema = z.object({
  id: z.string().uuid(),
  type: logicActions,
  targetField: z.string().uuid().optional(),
  targetSection: z.string().uuid().optional(),
  value: z.any().optional(),
  delay: z.number().int().min(0).max(5000).optional().default(0),
  animation: z.enum(['fade', 'slide', 'bounce', 'none']).default('fade'),
});

// Conditional logic rule schema
const conditionalLogicRuleSchema = z.object({
  id: z.string().uuid(),
  name: XSSSafeSchemas.safeText(100),
  description: XSSSafeSchemas.safeText(500).optional(),
  conditions: z.array(conditionalLogicConditionSchema).min(1).max(10),
  actions: z.array(conditionalLogicActionSchema).min(1).max(10),
  priority: z.number().int().min(1).max(100).default(50),
  isActive: z.boolean().default(true),
});

// Enhanced field schema with advanced features
export const advancedFieldSchema = fieldBaseSchema.extend({
  type: advancedFieldTypes,
  validation: advancedValidationSchema.optional(),
  conditionalLogic: z.array(conditionalLogicRuleSchema).optional(),
  // Advanced field properties
  styling: z
    .object({
      width: z
        .enum(['full', 'half', 'third', 'quarter', 'auto'])
        .default('full'),
      height: z.enum(['auto', 'small', 'medium', 'large']).optional(),
      cssClass: XSSSafeSchemas.safeText(100).optional(),
      customCSS: z.string().max(2000).optional(),
    })
    .optional(),
  accessibility: z
    .object({
      ariaLabel: XSSSafeSchemas.safeText(200).optional(),
      ariaDescription: XSSSafeSchemas.safeText(500).optional(),
      tabIndex: z.number().int().optional(),
      role: z.string().max(50).optional(),
    })
    .optional(),
  // Field-specific configurations
  fieldConfig: z.record(z.any()).optional(),
  // Wedding industry specific
  weddingContext: z
    .object({
      category: z
        .enum([
          'venue',
          'catering',
          'photography',
          'music',
          'flowers',
          'dress',
          'rings',
          'transportation',
          'guest',
          'budget',
          'timeline',
        ])
        .optional(),
      priority: z
        .enum(['critical', 'important', 'optional'])
        .default('optional'),
      phase: z
        .enum(['planning', 'booking', 'confirmation', 'day-of'])
        .optional(),
    })
    .optional(),
});

// Multi-step form support
const formStepSchema = z.object({
  id: z.string().uuid(),
  title: XSSSafeSchemas.safeText(200),
  description: XSSSafeSchemas.safeText(1000).optional(),
  order: z.number().int().min(0).max(100),
  sections: z.array(formSectionSchema).min(0).max(10),
  conditions: z.array(conditionalLogicConditionSchema).optional(),
  navigation: z
    .object({
      allowPrevious: z.boolean().default(true),
      allowNext: z.boolean().default(true),
      requireCompletion: z.boolean().default(false),
      customNextButton: XSSSafeSchemas.safeText(50).optional(),
      customPrevButton: XSSSafeSchemas.safeText(50).optional(),
    })
    .optional(),
});

// Advanced form settings
const advancedFormSettingsSchema = formSettingsSchema.extend({
  // Multi-step configuration
  isMultiStep: z.boolean().default(false),
  progressIndicator: z
    .enum(['steps', 'progress-bar', 'percentage', 'none'])
    .default('steps'),
  saveProgress: z.boolean().default(false),
  // Advanced features
  conditionalLogicEnabled: z.boolean().default(false),
  realTimeValidation: z.boolean().default(true),
  autoSaveInterval: z.number().int().min(10).max(300).optional(), // seconds
  // Security settings
  honeypotProtection: z.boolean().default(true),
  rateLimitSubmissions: z.number().int().min(1).max(1000).default(10),
  requireCaptcha: z.boolean().default(false),
  blockDisposableEmails: z.boolean().default(false),
  // Notification settings
  webhookUrl: z.string().url().optional(),
  emailNotifications: z
    .object({
      enabled: z.boolean().default(true),
      recipients: z.array(XSSSafeSchemas.safeEmail()).max(10),
      includeSubmissionData: z.boolean().default(true),
      customTemplate: z.string().max(10000).optional(),
    })
    .optional(),
  // Wedding industry specific
  weddingSettings: z
    .object({
      requireWeddingDate: z.boolean().default(false),
      requireVenueInfo: z.boolean().default(false),
      guestEstimateRequired: z.boolean().default(false),
      budgetTrackingEnabled: z.boolean().default(false),
      timelineIntegration: z.boolean().default(false),
    })
    .optional(),
  // GDPR compliance
  gdprCompliance: z
    .object({
      enabled: z.boolean().default(true),
      consentText: XSSSafeSchemas.safeText(1000),
      dataRetentionDays: z.number().int().min(30).max(2555).default(1095), // 3 years default
      allowDataExport: z.boolean().default(true),
      allowDataDeletion: z.boolean().default(true),
    })
    .optional(),
});

// Advanced form schema
export const advancedFormSchema = z
  .object({
    title: XSSSafeSchemas.safeText(200).refine(
      (val) => val.length > 0,
      'Title is required',
    ),
    description: XSSSafeSchemas.safeText(2000).optional(),
    // Support both single-step and multi-step forms
    sections: z.array(formSectionSchema).optional(),
    steps: z.array(formStepSchema).optional(),
    settings: advancedFormSettingsSchema,
    conditionalLogic: z.array(conditionalLogicRuleSchema).optional(),
    isPublished: z.boolean().default(false),
    slug: XSSSafeSchemas.safeSlug(100).refine(
      (val) => val.length > 0,
      'Slug is required',
    ),
    // Advanced form metadata
    metadata: z
      .object({
        version: z
          .string()
          .regex(/^\d+\.\d+\.\d+$/)
          .default('1.0.0'),
        tags: z.array(XSSSafeSchemas.safeText(50)).max(10).optional(),
        category: z
          .enum([
            'client-intake',
            'booking',
            'questionnaire',
            'feedback',
            'consultation',
            'contract',
            'payment',
            'other',
          ])
          .optional(),
        estimatedCompletionTime: z.number().int().min(1).max(180).optional(), // minutes
        difficulty: z
          .enum(['beginner', 'intermediate', 'advanced'])
          .default('beginner'),
      })
      .optional(),
  })
  .refine((data) => data.sections || data.steps, {
    message: 'Form must have either sections or steps',
    path: ['sections'],
  });

// Enhanced form submission with advanced features
export const advancedFormSubmissionSchema = z.object({
  formId: z.string().uuid('Invalid form ID'),
  stepId: z.string().uuid().optional(), // For multi-step forms
  data: z
    .record(z.string().uuid(), fieldValueSchema)
    .refine(
      (data) => Object.keys(data).length > 0,
      'Submission cannot be empty',
    )
    .refine(
      (data) => Object.keys(data).length <= 500,
      'Too many fields in submission',
    ),
  metadata: z
    .object({
      userAgent: z.string().max(1000).optional(),
      ipAddress: z
        .string()
        .regex(
          /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
        )
        .optional(),
      timestamp: z.string().datetime(),
      sessionId: z.string().uuid().optional(),
      // Advanced metadata
      startTime: z.string().datetime().optional(),
      completionTime: z.string().datetime(),
      timeSpentSeconds: z.number().int().min(0).optional(),
      pageViews: z.number().int().min(1).optional(),
      fieldsVisited: z.array(z.string().uuid()).optional(),
      validationErrors: z.number().int().min(0).optional(),
      deviceInfo: z
        .object({
          type: z.enum(['desktop', 'tablet', 'mobile']).optional(),
          os: z.string().max(50).optional(),
          browser: z.string().max(50).optional(),
          screenResolution: z.string().max(20).optional(),
        })
        .optional(),
      location: z
        .object({
          country: z.string().max(2).optional(), // ISO country code
          timezone: z.string().max(50).optional(),
        })
        .optional(),
    })
    .optional(),
  // Wedding industry context
  weddingContext: z
    .object({
      weddingDate: z.string().date().optional(),
      venue: XSSSafeSchemas.safeText(200).optional(),
      guestCount: z.number().int().min(1).max(10000).optional(),
      budget: z.number().positive().optional(),
      weddingType: z
        .enum(['traditional', 'destination', 'elopement', 'civil', 'religious'])
        .optional(),
    })
    .optional(),
});

// File upload with virus scanning
export const secureFileUploadSchema = z.object({
  file: z.object({
    name: z
      .string()
      .min(1, 'Filename required')
      .max(255, 'Filename too long')
      .regex(
        /^[a-zA-Z0-9\-_\.\s()]+\.[a-zA-Z0-9]{1,10}$/,
        'Invalid filename format',
      ),
    size: z
      .number()
      .min(1, 'File cannot be empty')
      .max(100 * 1024 * 1024, 'File too large (max 100MB)'),
    type: z.enum(
      [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // Documents
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Audio/Video for wedding content
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
      ],
      'File type not allowed',
    ),
    lastModified: z.number().optional(),
    webkitRelativePath: z.string().optional(),
  }),
  fieldId: z.string().uuid(),
  formId: z.string().uuid(),
  // Security options
  scanForViruses: z.boolean().default(true),
  quarantineIfSuspicious: z.boolean().default(true),
  allowExecutables: z.boolean().default(false),
  encryptFile: z.boolean().default(false),
});

// Form analytics schema
export const formAnalyticsSchema = z.object({
  formId: z.string().uuid(),
  period: z.enum(['hour', 'day', 'week', 'month', 'year']),
  metrics: z.object({
    views: z.number().int().min(0),
    starts: z.number().int().min(0),
    completions: z.number().int().min(0),
    conversionRate: z.number().min(0).max(100),
    averageCompletionTime: z.number().min(0),
    dropoffRate: z.number().min(0).max(100),
    fieldAnalytics: z.array(
      z.object({
        fieldId: z.string().uuid(),
        interactions: z.number().int().min(0),
        completionRate: z.number().min(0).max(100),
        averageTime: z.number().min(0),
        errorRate: z.number().min(0).max(100),
      }),
    ),
  }),
});

// Webhook delivery schema
export const webhookDeliverySchema = z.object({
  formId: z.string().uuid(),
  submissionId: z.string().uuid(),
  webhookUrl: z.string().url(),
  payload: z.record(z.any()),
  headers: z.record(z.string()).optional(),
  retryCount: z.number().int().min(0).max(10).default(0),
  maxRetries: z.number().int().min(0).max(10).default(3),
  status: z.enum(['pending', 'delivered', 'failed', 'max_retries_exceeded']),
  responseCode: z.number().int().optional(),
  responseBody: z.string().optional(),
  errorMessage: z.string().optional(),
  deliveredAt: z.string().datetime().optional(),
});

// Export all schemas
export {
  advancedFieldTypes,
  logicOperators,
  logicActions,
  advancedValidationSchema,
  conditionalLogicConditionSchema,
  conditionalLogicActionSchema,
  conditionalLogicRuleSchema,
  formStepSchema,
  advancedFormSettingsSchema,
};
