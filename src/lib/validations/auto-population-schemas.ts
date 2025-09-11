import { z } from 'zod';

// Base security schemas
export const secureUuidSchema = z.string().uuid('Invalid UUID format');
export const secureStringSchema = z
  .string()
  .min(1, 'Cannot be empty')
  .max(500, 'Too long')
  .regex(/^[a-zA-Z0-9\s\-_.,@#()]+$/, 'Contains invalid characters')
  .trim();

export const secureEmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .toLowerCase();

export const securePhoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long');

// Form field definition schema
export const FormFieldDefinitionSchema = z.object({
  id: secureUuidSchema,
  name: secureStringSchema.max(100),
  type: z.enum([
    'text',
    'email',
    'phone',
    'date',
    'number',
    'select',
    'textarea',
  ]),
  label: secureStringSchema.max(200),
  placeholder: secureStringSchema.max(200).optional(),
  required: z.boolean(),
  options: z.array(secureStringSchema.max(100)).max(50).optional(), // For select fields
});

// Population preferences schema
export const PopulationPreferencesSchema = z.object({
  onlyRequiredFields: z.boolean().optional().default(false),
  skipConfidentialFields: z.boolean().optional().default(true),
  maxAge: z.number().int().min(0).max(365).optional().default(30), // Days
  minimumConfidence: z.number().min(0).max(1).optional().default(0.5),
});

// Main populate form request schema
export const PopulateRequestSchema = z.object({
  formId: secureUuidSchema,
  clientId: secureUuidSchema,
  formFields: z
    .array(FormFieldDefinitionSchema)
    .min(1, 'At least one form field required')
    .max(200, 'Too many form fields'), // Prevent DoS attacks
  populationPreferences: PopulationPreferencesSchema.optional(),
});

// Wedding data update schema
export const WeddingDataUpdateSchema = z.object({
  weddingId: secureUuidSchema,
  updates: z
    .record(z.string().max(50), z.any())
    .refine(
      (data) => Object.keys(data).length <= 50,
      'Too many fields to update',
    ),
  source: z
    .enum(['form_submission', 'manual_entry', 'import', 'api'])
    .optional()
    .default('form_submission'),
});

// Field mapping schema
export const FieldMappingSchema = z.object({
  formFieldId: secureUuidSchema,
  coreFieldKey: z.enum([
    'couple_name_1',
    'couple_name_2',
    'wedding_date',
    'venue_name',
    'venue_address',
    'guest_count',
    'budget_amount',
    'contact_email',
    'contact_phone',
  ]),
  confidence: z.number().min(0).max(1),
  transformationRule: z.string().max(100).optional(),
  priority: z.number().int().min(1).max(999),
  isVerified: z.boolean().optional().default(false),
});

// Create mappings request schema
export const CreateMappingsSchema = z.object({
  formId: secureUuidSchema,
  mappings: z
    .array(FieldMappingSchema)
    .min(1, 'At least one mapping required')
    .max(50, 'Too many mappings'),
});

// Auto-detect mappings request schema
export const AutoDetectMappingsSchema = z.object({
  formId: secureUuidSchema,
  formFields: z
    .array(FormFieldDefinitionSchema)
    .min(1, 'At least one form field required')
    .max(200, 'Too many form fields'),
  supplierType: z
    .enum([
      'photographer',
      'venue',
      'florist',
      'caterer',
      'dj',
      'band',
      'videographer',
      'planner',
      'makeup',
      'transportation',
      'other',
    ])
    .optional(),
  formType: z
    .enum([
      'inquiry',
      'contract',
      'questionnaire',
      'timeline',
      'preferences',
      'other',
    ])
    .optional(),
});

// Session feedback schema
export const SessionFeedbackSchema = z.object({
  sessionId: secureUuidSchema,
  fieldFeedback: z
    .array(
      z.object({
        fieldId: secureUuidSchema,
        wasCorrect: z.boolean(),
        correctedValue: z.any().optional(),
        comment: secureStringSchema.max(500).optional(),
      }),
    )
    .min(1, 'At least one feedback entry required')
    .max(50, 'Too much feedback'),
});

// Population session response schema (for validation)
export const PopulationSessionResponseSchema = z.object({
  success: z.boolean(),
  sessionId: secureUuidSchema.optional(),
  weddingId: secureUuidSchema.optional(),
  populatedFields: z
    .record(
      z.string().max(50),
      z.object({
        value: z.any(),
        confidence: z.number().min(0).max(1),
        source: z.enum(['existing', 'new']),
        coreFieldKey: z.string().max(100),
      }),
    )
    .optional(),
  stats: z
    .object({
      fieldsDetected: z.number().int().min(0),
      fieldsPopulated: z.number().int().min(0),
      fieldsSkipped: z.number().int().min(0),
      averageConfidence: z.number().min(0).max(1),
      processingTimeMs: z.number().int().min(0),
    })
    .optional(),
  mappings: z
    .array(
      z.object({
        fieldId: secureUuidSchema,
        coreFieldKey: z.string().max(100),
        confidence: z.number().min(0).max(1),
      }),
    )
    .optional(),
  error: z.string().max(200).optional(),
  details: z
    .array(
      z.object({
        field: z.string().max(100),
        message: z.string().max(200),
      }),
    )
    .optional(),
});

// Core field validation schema
export const CoreFieldsSchema = z.object({
  couple_name_1: secureStringSchema.max(100).optional(),
  couple_name_2: secureStringSchema.max(100).optional(),
  wedding_date: z.string().date('Invalid date format').optional(),
  venue_name: secureStringSchema.max(200).optional(),
  venue_address: secureStringSchema.max(500).optional(),
  guest_count: z.number().int().min(0).max(2000).optional(),
  budget_amount: z.number().min(0).max(1000000).optional(), // Max £1M budget
  contact_email: secureEmailSchema.optional(),
  contact_phone: securePhoneSchema.optional(),
});

// Validation helper functions
export const validateCoreFields = (
  data: any,
): z.SafeParseReturn<typeof CoreFieldsSchema._output> => {
  return CoreFieldsSchema.safeParse(data);
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Rate limiting configuration
export const RATE_LIMITS = {
  populate: {
    requests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many population requests',
  },
  mappings: {
    requests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many mapping operations',
  },
  feedback: {
    requests: 20,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Too many feedback submissions',
  },
  autoDetect: {
    requests: 25,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many auto-detection requests',
  },
};

// Wedding industry specific validation patterns
export const WEDDING_PATTERNS = {
  weddingDate: /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  guestCount: /^([1-9]|[1-9]\d{1,3})$/, // 1-9999 guests
  budgetAmount: /^\d+(\.\d{2})?$/, // Currency format
  venueName: /^[a-zA-Z0-9\s\-',.()&]+$/, // Venue name characters
  coupleName: /^[a-zA-Z\s\-'.,]+$/, // Name characters
};

// Error messages for wedding context
export const WEDDING_ERROR_MESSAGES = {
  invalidWeddingDate: 'Wedding date must be a valid future date',
  invalidGuestCount: 'Guest count must be between 1 and 2000',
  invalidBudget: 'Budget must be a valid amount (max £1,000,000)',
  invalidVenueName: 'Venue name contains invalid characters',
  invalidCoupleName: 'Couple name contains invalid characters',
  missingRequiredField: 'This field is required for wedding planning',
  confidenceThreshold: 'Field mapping confidence too low for auto-population',
};

export type PopulateRequest = z.infer<typeof PopulateRequestSchema>;
export type WeddingDataUpdate = z.infer<typeof WeddingDataUpdateSchema>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;
export type CreateMappings = z.infer<typeof CreateMappingsSchema>;
export type AutoDetectMappings = z.infer<typeof AutoDetectMappingsSchema>;
export type SessionFeedback = z.infer<typeof SessionFeedbackSchema>;
export type PopulationSessionResponse = z.infer<
  typeof PopulationSessionResponseSchema
>;
export type CoreFields = z.infer<typeof CoreFieldsSchema>;
export type FormFieldDefinition = z.infer<typeof FormFieldDefinitionSchema>;
