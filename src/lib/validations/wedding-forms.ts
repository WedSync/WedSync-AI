import { z } from 'zod';

/**
 * Wedding Industry Specific Validation Rules
 * Handles edge cases specific to wedding planning scenarios
 */

// Wedding date validation with industry-specific rules
export const weddingDateSchema = z
  .date()
  .min(new Date(), 'Wedding date cannot be in the past')
  .max(
    new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
    'Wedding date cannot be more than 5 years in the future',
  )
  .refine((date) => {
    // Avoid major holidays when venues might be closed/expensive
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Christmas season (December 20-31)
    if (month === 12 && day >= 20) {
      return false;
    }

    // New Year's week (January 1-7)
    if (month === 1 && day <= 7) {
      return false;
    }

    // Valentine's Day (February 14) - premium pricing
    if (month === 2 && day === 14) {
      return false;
    }

    return true;
  }, 'Selected date may have limited venue availability or premium pricing')
  .refine((date) => {
    // Warn about peak wedding season (May-October)
    const month = date.getMonth() + 1;
    return month < 5 || month > 10;
  }, 'Peak wedding season (May-October) may have higher costs and limited availability');

// Guest count with realistic wedding limits
export const guestCountSchema = z
  .number()
  .min(2, 'Wedding must have at least 2 people (the couple)')
  .max(2000, 'Guest count exceeds reasonable venue capacity')
  .int('Guest count must be a whole number')
  .refine((count) => {
    // Warn about small intimate weddings (under 20)
    if (count < 20) {
      return true; // Allow but note it's intimate
    }
    // Warn about very large weddings (over 500)
    if (count > 500) {
      return true; // Allow but note it's very large
    }
    return true;
  }, 'Please confirm guest count - this seems unusually large or small');

// Wedding budget validation with industry ranges
export const budgetSchema = z
  .number()
  .min(500, 'Minimum budget for basic wedding services')
  .max(2000000, 'Budget exceeds typical luxury wedding spending')
  .refine(
    (budget) => budget % 50 === 0,
    'Budget should be rounded to nearest $50',
  )
  .refine((budget) => {
    // Industry average is $20k-$35k
    if (budget < 5000) {
      return true; // Micro wedding
    }
    if (budget > 100000) {
      return true; // Luxury wedding
    }
    return true;
  }, 'Budget amount seems unusual for typical wedding costs');

// Vendor contact validation
export const vendorContactSchema = z.object({
  name: z
    .string()
    .min(2, 'Vendor name too short')
    .max(100, 'Vendor name too long')
    .refine(
      (name) => !name.toLowerCase().includes('test'),
      "Vendor name cannot contain 'test'",
    ),

  email: z
    .string()
    .email('Invalid email address')
    .refine(
      (email) => !email.includes('+'),
      'Business email preferred (avoid + aliases)',
    ),

  phone: z
    .string()
    .regex(
      /^(\+1|1)?[\s-.]?\(?[0-9]{3}\)?[\s-.]?[0-9]{3}[\s-.]?[0-9]{4}$/,
      'Invalid phone number format',
    )
    .transform((phone) => phone.replace(/\D/g, '')), // Strip formatting

  category: z.enum([
    'photographer',
    'videographer',
    'florist',
    'caterer',
    'venue',
    'band',
    'dj',
    'coordinator',
    'baker',
    'transportation',
    'hair_makeup',
    'officiant',
    'other',
  ]),

  availability: z.array(z.date()).optional(),

  pricing: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
      currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']).default('USD'),
    })
    .optional()
    .refine((pricing) => {
      if (pricing && pricing.min > pricing.max) {
        return false;
      }
      return true;
    }, 'Minimum price cannot exceed maximum price'),
});

// Client information with wedding-specific fields
export const weddingClientSchema = z.object({
  // Primary contact (usually bride/groom)
  primaryContact: z.object({
    firstName: z.string().min(1, 'First name required').max(50),
    lastName: z.string().min(1, 'Last name required').max(50),
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .regex(
        /^(\+1|1)?[\s-.]?\(?[0-9]{3}\)?[\s-.]?[0-9]{3}[\s-.]?[0-9]{4}$/,
        'Invalid phone format',
      ),
    preferredContact: z.enum(['email', 'phone', 'text']).default('email'),
  }),

  // Partner information (optional for some scenarios)
  partner: z
    .object({
      firstName: z.string().max(50).optional(),
      lastName: z.string().max(50).optional(),
      email: z.string().email().optional(),
      phone: z
        .string()
        .regex(/^(\+1|1)?[\s-.]?\(?[0-9]{3}\)?[\s-.]?[0-9]{3}[\s-.]?[0-9]{4}$/)
        .optional(),
    })
    .optional(),

  // Wedding details
  weddingDetails: z.object({
    date: weddingDateSchema,
    venue: z.string().max(200).optional(),
    guestCount: guestCountSchema,
    budget: budgetSchema,
    style: z
      .enum([
        'traditional',
        'modern',
        'rustic',
        'bohemian',
        'destination',
        'intimate',
        'luxury',
      ])
      .optional(),
    ceremony: z
      .object({
        type: z
          .enum(['religious', 'civil', 'spiritual', 'cultural'])
          .optional(),
        location: z.string().max(200).optional(),
      })
      .optional(),
    reception: z
      .object({
        location: z.string().max(200).optional(),
        style: z
          .enum(['seated_dinner', 'buffet', 'cocktail', 'brunch', 'lunch'])
          .optional(),
      })
      .optional(),
  }),

  // Emergency contact
  emergencyContact: z
    .object({
      name: z.string().min(1).max(100),
      relationship: z.string().max(50),
      phone: z
        .string()
        .regex(/^(\+1|1)?[\s-.]?\(?[0-9]{3}\)?[\s-.]?[0-9]{3}[\s-.]?[0-9]{4}$/),
      email: z.string().email().optional(),
    })
    .optional(),

  // Special requirements/notes
  specialRequirements: z
    .object({
      dietary: z.array(z.string()).optional(),
      accessibility: z.array(z.string()).optional(),
      cultural: z.array(z.string()).optional(),
      other: z.string().max(1000).optional(),
    })
    .optional(),
});

// Form submission validation with anti-spam measures
export const formSubmissionSchema = z
  .object({
    formId: z.string().uuid('Invalid form ID'),

    responses: z.record(z.string(), z.any()).refine((responses) => {
      // Check for spam patterns
      const responseText = Object.values(responses).join(' ').toLowerCase();
      const spamKeywords = [
        'viagra',
        'casino',
        'lottery',
        'bitcoin',
        'crypto',
        'investment opportunity',
      ];

      return !spamKeywords.some((keyword) => responseText.includes(keyword));
    }, 'Submission appears to contain spam content'),

    metadata: z
      .object({
        userAgent: z.string().optional(),
        ipAddress: z.string().optional(),
        timestamp: z.date().default(() => new Date()),
        honeypot: z.string().max(0, 'Bot detection triggered').optional(), // Should be empty
      })
      .optional(),

    clientId: z.string().uuid().optional(),
  })
  .refine((submission) => {
    // Honeypot validation
    if (
      submission.metadata?.honeypot &&
      submission.metadata.honeypot.length > 0
    ) {
      return false;
    }
    return true;
  }, 'Invalid submission detected');

// File upload validation for wedding documents/photos
export const weddingFileUploadSchema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, 'Must be a valid file')
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'File size must be less than 10MB',
    )
    .refine((file) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic', // iPhone photos
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      return allowedTypes.includes(file.type);
    }, 'File type not supported. Please upload images, PDFs, or Word documents'),

  category: z.enum([
    'inspiration',
    'contract',
    'invoice',
    'timeline',
    'guest_list',
    'vendor_info',
    'venue_photos',
    'other',
  ]),

  description: z.string().max(500).optional(),

  isPrivate: z.boolean().default(false),
});

// Payment information validation
export const paymentInfoSchema = z.object({
  amount: z
    .number()
    .min(1, 'Payment amount must be greater than 0')
    .max(100000, 'Payment amount exceeds maximum limit'),

  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']).default('USD'),

  type: z.enum(['deposit', 'partial', 'final', 'refund']),

  dueDate: z.date().min(new Date(), 'Due date cannot be in the past'),

  vendorId: z.string().uuid('Invalid vendor ID'),

  description: z.string().max(200),

  paymentMethod: z.enum(['card', 'bank_transfer', 'check', 'cash']).optional(),
});

// Timeline/schedule validation
export const weddingTimelineSchema = z
  .object({
    date: weddingDateSchema,

    events: z
      .array(
        z.object({
          time: z
            .string()
            .regex(
              /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
              'Invalid time format (HH:MM)',
            ),
          title: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          location: z.string().max(200).optional(),
          duration: z.number().min(15).max(720).optional(), // 15 minutes to 12 hours
          vendors: z.array(z.string().uuid()).optional(),
          isFixed: z.boolean().default(false), // Cannot be moved/edited
        }),
      )
      .min(1, 'Timeline must have at least one event'),

    bufferTime: z.number().min(0).max(60).default(15), // Minutes between events
  })
  .refine((timeline) => {
    // Validate no overlapping events
    const events = timeline.events.sort((a, b) => a.time.localeCompare(b.time));

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];

      if (current.duration) {
        const currentEnd = new Date(`2000-01-01 ${current.time}`);
        currentEnd.setMinutes(
          currentEnd.getMinutes() + current.duration + timeline.bufferTime,
        );

        const nextStart = new Date(`2000-01-01 ${next.time}`);

        if (currentEnd > nextStart) {
          return false;
        }
      }
    }

    return true;
  }, 'Timeline events overlap - please adjust times or durations');

// Export all schemas for use in API routes
export const weddingValidationSchemas = {
  weddingDate: weddingDateSchema,
  guestCount: guestCountSchema,
  budget: budgetSchema,
  vendorContact: vendorContactSchema,
  weddingClient: weddingClientSchema,
  formSubmission: formSubmissionSchema,
  fileUpload: weddingFileUploadSchema,
  paymentInfo: paymentInfoSchema,
  timeline: weddingTimelineSchema,
};

// Helper function to validate and format wedding data
export function validateWeddingData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: result.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}
