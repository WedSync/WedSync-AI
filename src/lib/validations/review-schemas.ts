import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';

// Campaign validation schemas
export const reviewCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(255, 'Name too long'),
  description: z.string().optional(),
  template_message: z
    .string()
    .min(10, 'Template message must be at least 10 characters')
    .max(2000, 'Template too long'),
  auto_send_enabled: z.boolean().default(false),
  send_delay_days: z
    .number()
    .int()
    .min(0, 'Delay cannot be negative')
    .max(365, 'Delay cannot exceed 1 year')
    .default(7),
  follow_up_enabled: z.boolean().default(false),
  follow_up_delay_days: z
    .number()
    .int()
    .min(1, 'Follow-up delay must be at least 1 day')
    .max(90, 'Follow-up delay too long')
    .default(7),
  max_follow_ups: z
    .number()
    .int()
    .min(0, 'Max follow-ups cannot be negative')
    .max(5, 'Too many follow-ups')
    .default(2),
  target_platforms: z
    .array(
      z.enum(['google', 'facebook', 'yelp', 'knot', 'weddingwire', 'internal']),
    )
    .min(1, 'At least one platform required'),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
});

export const updateCampaignSchema = reviewCampaignSchema.partial();

// Review request validation schemas
export const reviewRequestSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID'),
  client_id: z.string().uuid('Invalid client ID'),
  client_email: z.string().email('Invalid email format'),
  client_name: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Name too long'),
  wedding_date: z.string().datetime('Invalid wedding date'),
  service_type: z
    .string()
    .min(1, 'Service type is required')
    .max(100, 'Service type too long'),
  send_immediately: z.boolean().default(false),
});

// Review submission validation schemas
export const reviewSubmissionSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  title: z
    .string()
    .min(1, 'Review title is required')
    .max(200, 'Title too long')
    .optional(),
  content: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review too long'),
  reviewer_name: z
    .string()
    .min(1, 'Reviewer name is required')
    .max(100, 'Name too long'),
  reviewer_email: z.string().email('Invalid email format').optional(),
  service_date: z.string().datetime('Invalid service date').optional(),
  service_type: z
    .string()
    .min(1, 'Service type is required')
    .max(100, 'Service type too long')
    .optional(),
  photos: z
    .array(z.string().url('Invalid photo URL'))
    .max(10, 'Too many photos')
    .optional(),
  video_testimonial_url: z.string().url('Invalid video URL').optional(),
  client_location: z.string().max(200, 'Location too long').optional(),
  public_permission: z.boolean().default(true),
});

// Platform integration validation schemas
export const platformCredentialsSchema = z.object({
  platform: z.enum(['google', 'facebook', 'yelp', 'knot', 'weddingwire']),
  credentials: z
    .record(z.string())
    .refine(
      (creds) => Object.keys(creds).length > 0,
      'Credentials cannot be empty',
    ),
});

export const googleCredentialsSchema = z.object({
  api_key: z.string().min(1, 'Google API key is required'),
  place_id: z.string().min(1, 'Google Place ID is required'),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});

export const facebookCredentialsSchema = z.object({
  access_token: z.string().min(1, 'Facebook access token is required'),
  page_id: z.string().min(1, 'Facebook Page ID is required'),
  app_secret: z.string().min(1, 'Facebook App Secret is required'),
});

export const yelpCredentialsSchema = z.object({
  api_key: z.string().min(1, 'Yelp API key is required'),
  business_id: z.string().min(1, 'Yelp Business ID is required'),
});

// Email validation schemas
export const emailTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(100, 'Name too long'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long'),
  html_template: z.string().min(1, 'HTML template is required'),
  text_template: z.string().min(1, 'Text template is required'),
  variables: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export const emailRequestSchema = z.object({
  to: z.string().email('Invalid recipient email'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long'),
  html: z.string().min(1, 'HTML content is required'),
  text: z.string().optional(),
  from: z.string().email('Invalid sender email').optional(),
  reply_to: z.string().email('Invalid reply-to email').optional(),
  template_variables: z.record(z.string()).optional(),
});

// Analytics and reporting validation schemas
export const analyticsQuerySchema = z
  .object({
    campaign_id: z.string().uuid('Invalid campaign ID').optional(),
    date_from: z.string().datetime('Invalid start date').optional(),
    date_to: z.string().datetime('Invalid end date').optional(),
    platform: z
      .enum(['google', 'facebook', 'yelp', 'knot', 'weddingwire', 'internal'])
      .optional(),
    metrics: z
      .array(
        z.enum([
          'rating_trends',
          'platform_breakdown',
          'response_rates',
          'sentiment_analysis',
          'competitor_comparison',
        ]),
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.date_from && data.date_to) {
        return new Date(data.date_from) <= new Date(data.date_to);
      }
      return true;
    },
    {
      message: 'Start date must be before end date',
      path: ['date_from'],
    },
  );

// Webhook validation schemas
export const webhookPayloadSchema = z.object({
  platform: z.enum(['google', 'facebook', 'yelp']),
  event_type: z.enum([
    'review_created',
    'review_updated',
    'review_deleted',
    'response_added',
  ]),
  timestamp: z.string().datetime('Invalid timestamp'),
  data: z.record(z.unknown()),
  signature: z.string().min(1, 'Signature is required'),
});

export const googleWebhookSchema = z.object({
  platform: z.literal('google'),
  event_type: z.enum(['review_created', 'review_updated', 'review_deleted']),
  timestamp: z.string().datetime(),
  data: z.object({
    review_id: z.string(),
    place_id: z.string(),
    author_name: z.string(),
    rating: z.number().min(1).max(5),
    text: z.string(),
    time: z.string(),
    author_url: z.string().optional(),
  }),
  signature: z.string(),
});

export const facebookWebhookSchema = z.object({
  platform: z.literal('facebook'),
  event_type: z.enum(['review_created', 'review_updated', 'review_deleted']),
  timestamp: z.string().datetime(),
  data: z.object({
    review_id: z.string(),
    page_id: z.string(),
    reviewer: z.object({
      name: z.string(),
      id: z.string(),
    }),
    rating: z.number().min(1).max(5),
    review_text: z.string(),
    created_time: z.string(),
  }),
  signature: z.string(),
});

export const yelpWebhookSchema = z.object({
  platform: z.literal('yelp'),
  event_type: z.enum(['review_created', 'review_updated', 'review_deleted']),
  timestamp: z.string().datetime(),
  data: z.object({
    review_id: z.string(),
    business_id: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
    }),
    rating: z.number().min(1).max(5),
    text: z.string(),
    time_created: z.string(),
  }),
  signature: z.string(),
});

// Client preferences validation schemas
export const clientPreferencesSchema = z
  .object({
    client_id: z.string().uuid('Invalid client ID'),
    allow_review_requests: z.boolean().default(true),
    preferred_contact_method: z
      .enum(['email', 'sms', 'both', 'none'])
      .default('email'),
    preferred_platforms: z
      .array(
        z.enum([
          'google',
          'facebook',
          'yelp',
          'knot',
          'weddingwire',
          'internal',
        ]),
      )
      .default([]),
    blocked_platforms: z
      .array(
        z.enum([
          'google',
          'facebook',
          'yelp',
          'knot',
          'weddingwire',
          'internal',
        ]),
      )
      .default([]),
    min_days_after_wedding: z
      .number()
      .int()
      .min(0, 'Min days cannot be negative')
      .max(365, 'Min days too large')
      .default(7),
    max_days_after_wedding: z
      .number()
      .int()
      .min(1, 'Max days must be at least 1')
      .max(365, 'Max days too large')
      .default(60),
    preferred_send_time: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
      .default('10:00'),
    preferred_send_days: z
      .array(z.number().int().min(1).max(7))
      .min(1, 'At least one day required')
      .default([1, 2, 3, 4, 5]),
    max_requests_per_year: z.number().int().min(0).max(12).default(2),
  })
  .refine((data) => data.min_days_after_wedding < data.max_days_after_wedding, {
    message: 'Min days must be less than max days',
    path: ['min_days_after_wedding'],
  });

// Search and filtering validation schemas
export const reviewSearchSchema = z
  .object({
    query: z.string().max(200, 'Search query too long').optional(),
    supplier_id: z.string().uuid('Invalid supplier ID').optional(),
    platform: z
      .enum(['google', 'facebook', 'yelp', 'knot', 'weddingwire', 'internal'])
      .optional(),
    rating_min: z.number().min(1).max(5).optional(),
    rating_max: z.number().min(1).max(5).optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    status: z.enum(['pending', 'approved', 'hidden', 'flagged']).optional(),
    has_response: z.boolean().optional(),
    sort: z
      .enum(['newest', 'oldest', 'rating_high', 'rating_low', 'helpful'])
      .default('newest'),
    page: z.number().int().min(1).default(1),
    per_page: z.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) => {
      if (data.rating_min && data.rating_max) {
        return data.rating_min <= data.rating_max;
      }
      return true;
    },
    {
      message: 'Minimum rating must be less than or equal to maximum rating',
      path: ['rating_min'],
    },
  )
  .refine(
    (data) => {
      if (data.date_from && data.date_to) {
        return new Date(data.date_from) <= new Date(data.date_to);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['date_from'],
    },
  );

// Bulk operations validation schemas
export const bulkCampaignSchema = z.object({
  campaigns: z
    .array(reviewCampaignSchema)
    .min(1, 'At least one campaign required')
    .max(50, 'Too many campaigns'),
});

export const bulkRequestSchema = z.object({
  requests: z
    .array(reviewRequestSchema)
    .min(1, 'At least one request required')
    .max(100, 'Too many requests'),
});

// Import/export validation schemas
export const importReviewsSchema = z.object({
  reviews: z
    .array(
      z.object({
        platform: z.enum([
          'google',
          'facebook',
          'yelp',
          'knot',
          'weddingwire',
          'internal',
        ]),
        platform_review_id: z.string().optional(),
        rating: z.number().min(1).max(5),
        content: z.string().min(1).max(5000),
        reviewer_name: z.string().min(1).max(100),
        review_date: z.string().datetime(),
        supplier_id: z.string().uuid(),
      }),
    )
    .min(1, 'At least one review required')
    .max(1000, 'Too many reviews'),
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  include_fields: z.array(z.string()).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  platform: z
    .enum(['google', 'facebook', 'yelp', 'knot', 'weddingwire', 'internal'])
    .optional(),
});

// Type exports for use in API routes
export type CreateCampaignRequest = z.infer<typeof reviewCampaignSchema>;
export type UpdateCampaignRequest = z.infer<typeof updateCampaignSchema>;
export type ReviewRequestData = z.infer<typeof reviewRequestSchema>;
export type ReviewSubmissionData = z.infer<typeof reviewSubmissionSchema>;
export type PlatformCredentialsData = z.infer<typeof platformCredentialsSchema>;
export type EmailTemplateData = z.infer<typeof emailTemplateSchema>;
export type EmailRequestData = z.infer<typeof emailRequestSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type ClientPreferencesData = z.infer<typeof clientPreferencesSchema>;
export type ReviewSearchQuery = z.infer<typeof reviewSearchSchema>;
export type BulkCampaignData = z.infer<typeof bulkCampaignSchema>;
export type BulkRequestData = z.infer<typeof bulkRequestSchema>;
export type ImportReviewsData = z.infer<typeof importReviewsSchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;

// Validation helper functions
export const validateCampaignData = (data: unknown): CreateCampaignRequest => {
  return reviewCampaignSchema.parse(data);
};

export const validateReviewSubmission = (
  data: unknown,
): ReviewSubmissionData => {
  return reviewSubmissionSchema.parse(data);
};

export const validateWebhookPayload = (data: unknown): WebhookPayload => {
  return webhookPayloadSchema.parse(data);
};

export const validateAnalyticsQuery = (data: unknown): AnalyticsQuery => {
  return analyticsQuerySchema.parse(data);
};

export const validateSearchQuery = (data: unknown): ReviewSearchQuery => {
  return reviewSearchSchema.parse(data);
};

// Custom validation error formatter
export const formatValidationError = (error: z.ZodError) => {
  return {
    message: 'Validation failed',
    errors: error.errors.map((err) => ({
      field: err.path.join('.'),
      code: err.code,
      message: err.message,
      value: 'input' in err ? err.input : undefined,
    })),
  };
};

// Sanitization helpers
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

export const sanitizeForDisplay = (input: string): string => {
  return sanitizeHtml(input).trim();
};

// Rate limiting schemas
export const rateLimitSchema = z.object({
  endpoint: z.string(),
  limit: z.number().int().min(1),
  window: z.number().int().min(1),
  identifier: z.string(),
});

// Webhook signature validation
export const validateWebhookSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  return timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex'),
  );
};

// Email validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// URL validation helpers
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Date validation helpers
export const isValidDateRange = (
  startDate: string,
  endDate: string,
): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

export const formatDateForValidation = (date: Date): string => {
  return date.toISOString();
};

// Business logic validation
export const validateBusinessRules = {
  maxCampaignsPerSupplier: (campaignCount: number): boolean =>
    campaignCount <= 10,
  maxRequestsPerCampaign: (requestCount: number): boolean =>
    requestCount <= 10000,
  maxFollowUps: (followUpCount: number): boolean => followUpCount <= 5,
  maxReviewLength: (content: string): boolean => content.length <= 5000,
  validRatingRange: (rating: number): boolean => rating >= 1 && rating <= 5,
};

// Security validation helpers
export const isSafeContent = (content: string): boolean => {
  // Check for potentially malicious content
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
};

export const validateApiKey = (apiKey: string): boolean => {
  // Basic API key format validation
  const apiKeyRegex = /^[a-zA-Z0-9_-]{32,}$/;
  return apiKeyRegex.test(apiKey);
};
