/**
 * WS-208: Journey AI Validation Schemas
 * Comprehensive validation schemas for AI-powered journey suggestions API
 * Team B - Secure validation with comprehensive input sanitization
 */

import { z } from 'zod';

// Base security schemas
const secureStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .regex(/^[a-zA-Z0-9\s\-_.@(),!?'"&]+$/, 'Contains invalid characters');

const sanitizedTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(5000)
  .transform((str) => str.replace(/<[^>]*>/g, '')); // Remove HTML tags

const uuidSchema = z.string().uuid('Invalid UUID format');

const positiveIntegerSchema = z.number().int().min(1).max(1000);

// Enum schemas with strict validation
export const VendorTypeSchema = z.enum([
  'photographer',
  'dj',
  'caterer',
  'venue',
  'planner',
  'florist',
  'videographer',
]);

export const ServiceLevelSchema = z.enum(['basic', 'premium', 'luxury']);

export const CommunicationStyleSchema = z
  .enum(['formal', 'friendly', 'casual'])
  .optional();

export const FrequencySchema = z
  .enum(['minimal', 'regular', 'frequent'])
  .optional();

export const ChannelPreferenceSchema = z
  .enum(['email', 'sms', 'phone', 'mixed'])
  .optional();

// Client preferences schema
export const ClientPreferencesSchema = z
  .object({
    communicationStyle: CommunicationStyleSchema,
    frequency: FrequencySchema,
    channelPreference: ChannelPreferenceSchema,
    specialRequests: z
      .array(sanitizedTextSchema)
      .max(10, 'Too many special requests')
      .optional()
      .transform((arr) => arr?.slice(0, 10)), // Limit array size for security
  })
  .strict();

// Journey suggestion request schema
export const JourneySuggestionRequestSchema = z
  .object({
    supplierId: uuidSchema,
    vendorType: VendorTypeSchema,
    serviceLevel: ServiceLevelSchema,
    weddingTimeline: z
      .number()
      .int()
      .min(1, 'Wedding timeline must be at least 1 month')
      .max(36, 'Wedding timeline cannot exceed 36 months'),
    clientPreferences: ClientPreferencesSchema.optional(),
    existingJourneyId: uuidSchema.optional(),
  })
  .strict();

// Journey optimization request schema
export const JourneyOptimizationRequestSchema = z
  .object({
    existingJourneyId: uuidSchema,
    supplierId: uuidSchema,
    vendorType: VendorTypeSchema,
    serviceLevel: ServiceLevelSchema,
    weddingTimeline: positiveIntegerSchema,
    optimizationGoals: z
      .array(
        z.enum([
          'increase_completion_rate',
          'improve_satisfaction',
          'reduce_communication_burden',
          'enhance_personalization',
          'optimize_timing',
        ]),
      )
      .min(1)
      .max(3),
    clientPreferences: ClientPreferencesSchema.optional(),
  })
  .strict();

// Get patterns request schema
export const GetPatternsRequestSchema = z
  .object({
    vendorType: VendorTypeSchema,
    serviceLevel: ServiceLevelSchema.optional(),
    timelineMonths: z.number().int().min(1).max(36).optional(),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();

// Journey node validation for responses
export const JourneyNodeSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum(['email', 'sms', 'call', 'meeting', 'task', 'milestone']),
    name: secureStringSchema,
    timing: z.object({
      days_from_booking: z.number().int().min(0),
      days_before_wedding: z.number().int().min(0),
    }),
    content: z.object({
      subject: secureStringSchema.optional(),
      template_key: z.string().max(200).optional(),
      personalization_fields: z.array(z.string().max(100)).max(20).optional(),
      description: sanitizedTextSchema.optional(),
    }),
    triggers: z.array(z.string().max(100)).max(10),
    next_nodes: z.array(z.string().max(100)).max(5),
    vendor_specific_data: z.record(z.any()).optional(),
    required: z.boolean(),
    category: z.enum(['communication', 'planning', 'execution', 'follow_up']),
  })
  .strict();

// Generated journey response validation
export const GeneratedJourneySchema = z
  .object({
    id: uuidSchema,
    journey_name: secureStringSchema,
    total_duration_days: positiveIntegerSchema,
    nodes: z.array(JourneyNodeSchema).min(1).max(50),
    conditional_branches: z
      .array(
        z.object({
          condition: secureStringSchema,
          true_path: z.array(z.string().max(100)).max(10),
          false_path: z.array(z.string().max(100)).max(10),
        }),
      )
      .max(10),
    metadata: z.object({
      generatedAt: z.string(),
      basedOn: JourneySuggestionRequestSchema,
      confidence: z.number().min(0).max(1),
      estimatedPerformance: z.object({
        predicted_completion_rate: z.number().min(0).max(1),
        predicted_engagement_score: z.number().min(0).max(1),
        confidence_score: z.number().min(0).max(1),
        generation_time_ms: z.number().int().min(0),
        token_usage: z.number().int().min(0),
        complexity_score: z.number().min(0).max(1),
      }),
      ai_model: z.string().max(50),
      token_usage: z.number().int().min(0),
      generation_time_ms: z.number().int().min(0),
    }),
  })
  .strict();

// Performance tracking schemas
export const PerformanceDataSchema = z
  .object({
    journeyId: uuidSchema,
    aiSuggestionId: uuidSchema.optional(),
    actualCompletionRate: z.number().min(0).max(1).optional(),
    clientSatisfactionScore: z.number().int().min(1).max(5).optional(),
    supplierRating: z.number().int().min(1).max(5).optional(),
    engagementMetrics: z
      .object({
        email_open_rate: z.number().min(0).max(1).default(0),
        sms_response_rate: z.number().min(0).max(1).default(0),
        task_completion_time_avg: z.number().int().min(0).default(0),
        client_initiated_contact: z.number().int().min(0).default(0),
        milestone_hit_rate: z.number().min(0).max(1).default(0),
      })
      .optional(),
    modificationsReason: z.array(sanitizedTextSchema).max(10).optional(),
    performanceNotes: sanitizedTextSchema.optional(),
    weddingOutcome: z
      .enum(['successful', 'issues_minor', 'issues_major', 'cancelled'])
      .optional(),
  })
  .strict();

// Audit log schema for API compliance
export const AuditLogRequestSchema = z
  .object({
    requestType: z.enum(['generate_new', 'optimize_existing', 'get_patterns']),
    requestData: z.record(z.any()),
    aiModelUsed: z.string().max(50).default('gpt-4'),
    promptTokens: z.number().int().min(0).default(0),
    completionTokens: z.number().int().min(0).default(0),
    totalTokens: z.number().int().min(0).default(0),
    processingTimeMs: z.number().int().min(0).default(0),
  })
  .strict();

// Error response schema
export const APIErrorSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    details: z.string().optional(),
    timestamp: z.string(),
    requestId: z.string().optional(),
  })
  .strict();

// Rate limiting schema
export const RateLimitInfoSchema = z
  .object({
    limit: z.number().int(),
    remaining: z.number().int(),
    resetTime: z.number().int(),
    retryAfter: z.number().int().optional(),
  })
  .strict();

// Success response wrapper
export const APISuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      success: z.literal(true),
      data: dataSchema,
      meta: z
        .object({
          timestamp: z.string(),
          processingTime: z.number().int().min(0),
          requestId: z.string().optional(),
          rateLimit: RateLimitInfoSchema.optional(),
        })
        .optional(),
    })
    .strict();

// Input sanitization utilities
export const sanitizeAIPromptInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s\-_.@(),!?'"&]/g, '') // Remove special characters except common punctuation
    .trim()
    .slice(0, 5000); // Limit length
};

export const sanitizeJSONInput = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeAIPromptInput(input);
  }
  if (Array.isArray(input)) {
    return input.slice(0, 100).map(sanitizeJSONInput); // Limit array size and recursively sanitize
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    let keyCount = 0;
    for (const [key, value] of Object.entries(input)) {
      if (keyCount >= 50) break; // Limit object size
      const sanitizedKey = sanitizeAIPromptInput(key);
      if (sanitizedKey.length > 0) {
        sanitized[sanitizedKey] = sanitizeJSONInput(value);
        keyCount++;
      }
    }
    return sanitized;
  }
  return input;
};

// Validation helpers
export const validateVendorAccess = async (
  supplierId: string,
  userId: string,
  supabase: any,
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select(
        `
        id,
        organization_id,
        user_profiles!inner (
          id,
          user_id
        )
      `,
      )
      .eq('id', supplierId)
      .eq('user_profiles.user_id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Vendor access validation failed:', error);
    return false;
  }
};

export const validateSubscriptionTier = async (
  organizationId: string,
  supabase: any,
): Promise<{ tier: string; hasAIAccess: boolean }> => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      return { tier: 'FREE', hasAIAccess: false };
    }

    const hasAIAccess =
      ['PROFESSIONAL', 'SCALE', 'ENTERPRISE'].includes(
        data.subscription_tier,
      ) && data.subscription_status === 'active';

    return {
      tier: data.subscription_tier || 'FREE',
      hasAIAccess,
    };
  } catch (error) {
    console.error('Subscription validation failed:', error);
    return { tier: 'FREE', hasAIAccess: false };
  }
};

// Export all schemas for use in API routes
export {
  secureStringSchema,
  sanitizedTextSchema,
  uuidSchema,
  positiveIntegerSchema,
};

// Type exports
export type JourneySuggestionRequest = z.infer<
  typeof JourneySuggestionRequestSchema
>;
export type JourneyOptimizationRequest = z.infer<
  typeof JourneyOptimizationRequestSchema
>;
export type GetPatternsRequest = z.infer<typeof GetPatternsRequestSchema>;
export type JourneyNode = z.infer<typeof JourneyNodeSchema>;
export type GeneratedJourney = z.infer<typeof GeneratedJourneySchema>;
export type PerformanceData = z.infer<typeof PerformanceDataSchema>;
export type AuditLogRequest = z.infer<typeof AuditLogRequestSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;
export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;
