// ==========================================
// WS-243: AI Chatbot Validation Schemas
// ==========================================

import { z } from 'zod';

// ==========================================
// Base Validation Schemas
// ==========================================

export const ConversationStatusSchema = z.enum([
  'active',
  'archived',
  'escalated',
  'closed',
]);

export const MessageRoleSchema = z.enum([
  'user',
  'assistant',
  'system',
  'function',
]);

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const JSONSchema = z.record(z.unknown()).default({});

// Secure text validation (prevent XSS, limit length)
export const SecureTextSchema = z
  .string()
  .min(1, 'Text cannot be empty')
  .max(10000, 'Text too long (max 10000 characters)')
  .transform((text) => {
    // Basic XSS prevention - strip HTML tags and suspicious characters
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  });

export const ShortTextSchema = z
  .string()
  .min(1, 'Text cannot be empty')
  .max(255, 'Text too long (max 255 characters)')
  .transform((text) => text.trim());

// ==========================================
// Pagination Schemas
// ==========================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ==========================================
// Conversation Schemas
// ==========================================

export const CreateConversationSchema = z.object({
  title: ShortTextSchema.optional().default('New Conversation'),
  client_id: UUIDSchema.optional(),
  wedding_id: UUIDSchema.optional(),
  context_data: JSONSchema.optional(),
});

export const UpdateConversationSchema = z.object({
  title: ShortTextSchema.optional(),
  status: ConversationStatusSchema.optional(),
  context_data: JSONSchema.optional(),
});

export const ConversationQuerySchema = z.object({
  status: ConversationStatusSchema.optional(),
  client_id: UUIDSchema.optional(),
  wedding_id: UUIDSchema.optional(),
  search: z.string().max(100).optional(),
  ...PaginationSchema.shape,
});

// ==========================================
// Message Schemas
// ==========================================

export const CreateMessageSchema = z.object({
  content: SecureTextSchema,
  role: MessageRoleSchema.default('user'),
  wedding_context: JSONSchema.optional(),
});

export const MessageQuerySchema = z.object({
  role: MessageRoleSchema.optional(),
  since: z.string().datetime().optional(),
  ...PaginationSchema.shape,
});

// ==========================================
// AI Service Schemas
// ==========================================

export const AIRequestSchema = z.object({
  message: SecureTextSchema,
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().min(1).max(4000).default(1000),
  stream: z.boolean().default(false),
  include_context: z.boolean().default(true),
});

// ==========================================
// Analytics Schemas
// ==========================================

export const UpdateAnalyticsSchema = z.object({
  satisfaction_rating: z.number().int().min(1).max(5).optional(),
  satisfaction_feedback: SecureTextSchema.optional(),
  escalated_to_human: z.boolean().optional(),
  escalation_reason: SecureTextSchema.optional(),
  led_to_booking: z.boolean().optional(),
  led_to_upsell: z.boolean().optional(),
  inquiry_category: z.string().max(100).optional(),
});

// ==========================================
// Rate Limiting Schemas
// ==========================================

export const RateLimitSchema = z.object({
  user_id: UUIDSchema,
  organization_id: UUIDSchema,
  action: z.enum(['message', 'conversation', 'ai_request']),
  window_ms: z.number().int().min(1000).default(60000), // 1 minute default
  max_requests: z.number().int().min(1).default(10),
});

// ==========================================
// Webhook & Real-time Schemas
// ==========================================

export const WebhookEventSchema = z.object({
  type: z.enum([
    'message_created',
    'conversation_updated',
    'escalation_requested',
  ]),
  conversation_id: UUIDSchema,
  data: JSONSchema,
  timestamp: z.string().datetime(),
});

// ==========================================
// Validation Helper Functions
// ==========================================

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    }
    throw error;
  }
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return validateAndSanitize(schema, data);
  };
}

// ==========================================
// Organization Access Validation
// ==========================================

export const OrganizationAccessSchema = z.object({
  user_id: UUIDSchema,
  organization_id: UUIDSchema,
  required_permissions: z.array(z.string()).default([]),
});

// ==========================================
// Content Security Schemas
// ==========================================

export const ContentSecuritySchema = z.object({
  content: SecureTextSchema,
  check_profanity: z.boolean().default(true),
  check_spam: z.boolean().default(true),
  max_links: z.number().int().min(0).max(5).default(2),
});

// Helper function to validate content security
export function validateContentSecurity(content: string): {
  isValid: boolean;
  issues: string[];
  cleanContent: string;
} {
  const issues: string[] = [];
  let cleanContent = content;

  // Check for excessive links
  const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
  if (linkCount > 2) {
    issues.push(`Too many links (${linkCount}/2)`);
  }

  // Check for potential spam patterns
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /[A-Z]{20,}/, // Excessive caps
    /\$\d+|\d+\$/, // Money mentions (suspicious in chat)
  ];

  spamPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      issues.push('Content flagged as potential spam');
    }
  });

  // Basic profanity check (simple word list - in production use a service)
  const profanityWords = ['spam', 'scam', 'fake', 'fraud'];
  const containsProfanity = profanityWords.some((word) =>
    content.toLowerCase().includes(word.toLowerCase()),
  );

  if (containsProfanity) {
    issues.push('Content contains inappropriate language');
  }

  return {
    isValid: issues.length === 0,
    issues,
    cleanContent: cleanContent.trim(),
  };
}
