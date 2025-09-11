/**
 * WS-238 Knowledge Base System - Comprehensive Zod Validation Schemas
 * SECURITY: Prevents SQL injection, XSS, and malformed data attacks for KB system
 * Wedding Industry Specific: Tailored for supplier content management and search
 */

import { z } from 'zod';
import {
  uuidSchema,
  secureStringSchema,
  safeTextSchema,
  paginationSchema,
  createValidationMiddleware,
} from './schemas';

// =============================================================================
// KNOWLEDGE BASE ENUM SCHEMAS
// =============================================================================

// Wedding industry categories for articles
export const kbCategorySchema = z.enum([
  'photography',
  'videography',
  'venues',
  'catering',
  'planning',
  'flowers',
  'music_entertainment',
  'transport',
  'decor_styling',
  'beauty',
  'stationery',
  'cakes_desserts',
  'legal_insurance',
  'honeymoon_travel',
  'gifts_favors',
  'technology',
  'marketing',
  'business_operations',
  'client_management',
  'general',
]);

// Content difficulty levels
export const kbDifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

// Article status for editorial workflow
export const kbStatusSchema = z.enum([
  'draft',
  'review',
  'published',
  'archived',
  'scheduled',
]);

// Content types for different formats
export const kbContentTypeSchema = z.enum([
  'article',
  'tutorial',
  'faq',
  'checklist',
  'template',
  'video',
  'podcast',
  'case_study',
  'best_practice',
]);

// Access levels based on subscription tiers
export const kbAccessLevelSchema = z.enum([
  'free', // Available to all (including trial)
  'starter', // Requires Starter plan or higher
  'professional', // Requires Professional plan or higher
  'scale', // Requires Scale plan or higher
  'enterprise', // Enterprise only
]);

// Feedback types for analytics
export const kbFeedbackTypeSchema = z.enum([
  'helpful',
  'not_helpful',
  'rating',
  'comment',
  'suggestion',
  'correction',
]);

// =============================================================================
// CORE ARTICLE SCHEMAS
// =============================================================================

// Secure article slug schema - SEO friendly and injection safe
export const kbSlugSchema = z
  .string()
  .min(3, 'Slug too short')
  .max(200, 'Slug too long')
  .regex(
    /^[a-z0-9-]+$/,
    'Slug must contain only lowercase letters, numbers, and hyphens',
  )
  .refine(
    (val) => !val.startsWith('-') && !val.endsWith('-'),
    'Slug cannot start or end with hyphen',
  )
  .refine(
    (val) => !val.includes('--'),
    'Slug cannot contain consecutive hyphens',
  )
  .transform((val) => val.toLowerCase().trim());

// Article title schema with wedding industry considerations
export const kbTitleSchema = z
  .string()
  .min(10, 'Title must be at least 10 characters for SEO')
  .max(500, 'Title too long')
  .transform((val) => val.trim())
  .refine(
    (val) =>
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'Title contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
    'Title contains potentially dangerous XSS patterns',
  );

// Article content schema with comprehensive security
export const kbContentSchema = z
  .string()
  .min(100, 'Article content must be at least 100 characters')
  .max(50000, 'Article content too long (max 50,000 characters)')
  .transform((val) => val.trim())
  .refine(
    (val) =>
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'Content contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) => !/<script[^>]*>[\s\S]*?<\/script>/gi.test(val),
    'Content contains script tags',
  )
  .refine(
    (val) => !/<iframe[^>]*>[\s\S]*?<\/iframe>/gi.test(val),
    'Content contains iframe tags',
  );

// Article excerpt schema
export const kbExcerptSchema = z
  .string()
  .min(20, 'Excerpt too short')
  .max(500, 'Excerpt too long')
  .transform((val) => val.trim())
  .refine(
    (val) =>
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'Excerpt contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
    'Excerpt contains potentially dangerous XSS patterns',
  );

// Tags array schema with wedding industry validation
export const kbTagsSchema = z
  .array(
    z
      .string()
      .min(2, 'Tag too short')
      .max(50, 'Tag too long')
      .regex(/^[a-zA-Z0-9\s_-]+$/, 'Tag contains invalid characters')
      .transform((val) => val.toLowerCase().trim()),
  )
  .min(1, 'At least one tag required')
  .max(20, 'Too many tags (max 20)');

// SEO metadata schema
export const kbSeoSchema = z.object({
  meta_title: z
    .string()
    .min(30, 'Meta title too short for SEO')
    .max(200, 'Meta title too long')
    .optional(),
  meta_description: z
    .string()
    .min(120, 'Meta description too short for SEO')
    .max(500, 'Meta description too long')
    .optional(),
  canonical_url: z
    .string()
    .url('Invalid canonical URL')
    .max(255, 'URL too long')
    .optional(),
});

// =============================================================================
// ARTICLE CREATION AND MANAGEMENT SCHEMAS
// =============================================================================

// Complete article creation schema
export const createKbArticleSchema = z.object({
  title: kbTitleSchema,
  slug: kbSlugSchema,
  excerpt: kbExcerptSchema,
  content: kbContentSchema,
  featured_image_url: z
    .string()
    .url('Invalid image URL')
    .max(500, 'URL too long')
    .optional(),

  // Classification
  category: kbCategorySchema,
  subcategory: z
    .string()
    .max(100, 'Subcategory too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Subcategory contains invalid characters')
    .optional(),
  tags: kbTagsSchema,
  difficulty: kbDifficultySchema.default('beginner'),
  content_type: kbContentTypeSchema.default('article'),

  // Access control
  access_level: kbAccessLevelSchema.default('free'),
  is_featured: z.boolean().default(false),

  // SEO
  ...kbSeoSchema.shape,

  // Publishing
  status: kbStatusSchema.default('draft'),
  scheduled_for: z.string().datetime('Invalid schedule date').optional(),

  // Content metadata
  external_links: z
    .array(z.string().url('Invalid external link'))
    .max(10, 'Too many external links')
    .optional(),
  related_article_ids: z
    .array(uuidSchema)
    .max(5, 'Too many related articles')
    .optional(),
});

// Article update schema (allows partial updates)
export const updateKbArticleSchema = createKbArticleSchema.partial().extend({
  id: uuidSchema,
});

// Article publishing workflow schema
export const publishKbArticleSchema = z
  .object({
    id: uuidSchema,
    status: z.literal('published'),
    publish_now: z.boolean().default(true),
    scheduled_for: z.string().datetime('Invalid schedule date').optional(),
  })
  .refine((data) => data.publish_now || data.scheduled_for, {
    message: 'Must either publish now or provide schedule date',
  });

// =============================================================================
// SEARCH AND QUERY SCHEMAS
// =============================================================================

// Knowledge base search schema with wedding industry filters
export const kbSearchSchema = z.object({
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
      'Search query contains potentially dangerous SQL patterns',
    )
    .refine(
      (val) => !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
      'Search query contains potentially dangerous XSS patterns',
    ),
  category: kbCategorySchema.optional(),
  difficulty: kbDifficultySchema.optional(),
  content_type: kbContentTypeSchema.optional(),
  access_levels: z
    .array(kbAccessLevelSchema)
    .max(5, 'Too many access levels')
    .optional(),
  tags: z
    .array(z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid tag format'))
    .max(10, 'Too many tag filters')
    .optional(),
  featured_only: z.boolean().default(false),
  trending_only: z.boolean().default(false),

  // Search configuration
  include_content: z.boolean().default(false), // For performance - only include full content if needed
  highlight_matches: z.boolean().default(true),

  // Pagination
  ...paginationSchema.shape,
});

// Article suggestion parameters
export const kbSuggestionsSchema = z.object({
  current_article_id: uuidSchema.optional(),
  user_category: kbCategorySchema.optional(), // User's supplier type
  user_experience_level: kbDifficultySchema.optional(),
  recent_searches: z
    .array(secureStringSchema)
    .max(10, 'Too many recent searches')
    .optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

// Popular articles query
export const kbPopularSchema = z.object({
  timeframe: z
    .enum(['daily', 'weekly', 'monthly', 'all_time'])
    .default('weekly'),
  category: kbCategorySchema.optional(),
  supplier_type: kbCategorySchema.optional(), // Filter by supplier type
  access_level: kbAccessLevelSchema.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

// =============================================================================
// FEEDBACK AND RATING SCHEMAS
// =============================================================================

// Article feedback submission schema
export const kbFeedbackSchema = z.object({
  article_id: uuidSchema,
  feedback_type: kbFeedbackTypeSchema,
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional()
    .refine((val, ctx) => {
      // Rating is required when feedback_type is 'rating'
      if (ctx.parent.feedback_type === 'rating' && val === undefined) {
        return false;
      }
      return true;
    }, 'Rating is required when feedback type is rating'),
  comment: z
    .string()
    .max(1000, 'Comment too long')
    .optional()
    .transform((val) => (val ? val.trim() : val))
    .refine(
      (val) =>
        !val ||
        !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
          val,
        ),
      'Comment contains potentially dangerous SQL patterns',
    )
    .refine(
      (val) =>
        !val || !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
      'Comment contains potentially dangerous XSS patterns',
    ),
  suggestion: z
    .string()
    .max(1000, 'Suggestion too long')
    .optional()
    .transform((val) => (val ? val.trim() : val))
    .refine(
      (val) =>
        !val ||
        !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
          val,
        ),
      'Suggestion contains potentially dangerous SQL patterns',
    ),
  user_experience_level: z
    .enum(['beginner', 'experienced', 'expert'])
    .optional(),
  business_type: kbCategorySchema.optional(), // Which type of wedding business they run
});

// Feedback moderation schema (admin only)
export const kbModerateFeedbackSchema = z.object({
  feedback_id: uuidSchema,
  is_approved: z.boolean(),
  moderation_notes: z
    .string()
    .max(500, 'Moderation notes too long')
    .optional()
    .transform((val) => (val ? val.trim() : val)),
  is_spam: z.boolean().default(false),
});

// =============================================================================
// ANALYTICS SCHEMAS
// =============================================================================

// Search analytics logging schema
export const kbSearchAnalyticsSchema = z.object({
  search_query: secureStringSchema.min(1).max(100),
  search_filters: z.record(z.string(), z.unknown()).optional(), // Store filter state as JSON
  results_count: z.number().int().min(0),
  clicked_article_id: uuidSchema.optional(),
  click_position: z.number().int().min(1).max(100).optional(), // Position in search results
  time_to_click_seconds: z.number().min(0).max(300).optional(), // Max 5 minutes

  // Context data
  search_source: z
    .enum(['search_bar', 'suggestion', 'related', 'category_filter'])
    .default('search_bar'),
  referrer_url: z.string().url().max(500).optional(),
  user_agent: z.string().max(500).optional(),
  device_type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  session_id: z.string().uuid().optional(),
  user_tier: z
    .enum(['free', 'trial', 'starter', 'professional', 'scale', 'enterprise'])
    .optional(),

  // Wedding context
  wedding_date: z.string().date().optional(),
  wedding_phase: z
    .enum(['planning', 'week_of', 'post_wedding', 'general'])
    .optional(),
});

// Article view analytics schema
export const kbArticleViewSchema = z.object({
  article_id: uuidSchema,
  view_duration_seconds: z.number().min(0).max(3600).optional(), // Max 1 hour
  scroll_percentage: z.number().min(0).max(100).optional(),
  referrer_url: z.string().url().max(500).optional(),
  device_type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  user_tier: z
    .enum(['free', 'trial', 'starter', 'professional', 'scale', 'enterprise'])
    .optional(),
});

// Bulk analytics submission schema
export const kbBulkAnalyticsSchema = z.object({
  search_events: z
    .array(kbSearchAnalyticsSchema)
    .max(100, 'Too many search events')
    .optional(),
  view_events: z
    .array(kbArticleViewSchema)
    .max(100, 'Too many view events')
    .optional(),
  batch_id: z.string().uuid().optional(), // For deduplication
});

// Analytics dashboard request schema
export const kbAnalyticsSchema = z.object({
  date_range: z.enum(['7d', '30d', '90d', '365d']).default('30d'),
  metrics: z
    .array(
      z.enum([
        'content_performance',
        'search_analytics',
        'user_engagement',
        'feedback_analytics',
        'revenue_impact',
        'industry_insights',
      ]),
    )
    .min(1, 'At least one metric must be requested'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  category_filter: kbCategorySchema.optional(),
  user_tier_filter: z
    .enum(['free', 'trial', 'starter', 'professional', 'scale', 'enterprise'])
    .optional(),
  include_trends: z.boolean().default(false),
  include_comparisons: z.boolean().default(false),
});

// =============================================================================
// ADMIN AND MANAGEMENT SCHEMAS
// =============================================================================

// Article categories management
export const kbCategoriesQuerySchema = z.object({
  include_counts: z.boolean().default(true),
  access_level: kbAccessLevelSchema.optional(),
  only_published: z.boolean().default(true),
});

// Content performance query
export const kbPerformanceQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  metric: z.enum(['views', 'searches', 'ratings', 'feedback']).default('views'),
  category: kbCategorySchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// Batch operations schema
export const kbBatchOperationSchema = z.object({
  article_ids: z
    .array(uuidSchema)
    .min(1, 'At least one article required')
    .max(50, 'Too many articles'),
  operation: z.enum([
    'publish',
    'unpublish',
    'archive',
    'delete',
    'update_category',
    'update_access_level',
  ]),
  parameters: z.record(z.string(), z.unknown()).optional(), // Operation-specific parameters
});

// =============================================================================
// VALIDATION MIDDLEWARE EXPORTS
// =============================================================================

// Create validation middleware for all schemas
export const validateKbArticleCreation = createValidationMiddleware(
  createKbArticleSchema,
);
export const validateKbArticleUpdate = createValidationMiddleware(
  updateKbArticleSchema,
);
export const validateKbArticlePublish = createValidationMiddleware(
  publishKbArticleSchema,
);
export const validateKbSearch = createValidationMiddleware(kbSearchSchema);
export const validateKbSuggestions =
  createValidationMiddleware(kbSuggestionsSchema);
export const validateKbPopular = createValidationMiddleware(kbPopularSchema);
export const validateKbFeedback = createValidationMiddleware(kbFeedbackSchema);
export const validateKbModerateFeedback = createValidationMiddleware(
  kbModerateFeedbackSchema,
);
export const validateKbSearchAnalytics = createValidationMiddleware(
  kbSearchAnalyticsSchema,
);
export const validateKbArticleView =
  createValidationMiddleware(kbArticleViewSchema);
export const validateKbBulkAnalytics = createValidationMiddleware(
  kbBulkAnalyticsSchema,
);
export const validateKbAnalytics =
  createValidationMiddleware(kbAnalyticsSchema);
export const validateKbCategoriesQuery = createValidationMiddleware(
  kbCategoriesQuerySchema,
);
export const validateKbPerformanceQuery = createValidationMiddleware(
  kbPerformanceQuerySchema,
);
export const validateKbBatchOperation = createValidationMiddleware(
  kbBatchOperationSchema,
);

// URL parameter validation for API routes
export const validateKbSlugParam = createValidationMiddleware(
  z.object({
    slug: kbSlugSchema,
  }),
);

export const validateKbIdParam = createValidationMiddleware(
  z.object({
    id: uuidSchema,
  }),
);

// =============================================================================
// TYPE EXPORTS FOR TYPESCRIPT
// =============================================================================

export type KbCategory = z.infer<typeof kbCategorySchema>;
export type KbDifficulty = z.infer<typeof kbDifficultySchema>;
export type KbStatus = z.infer<typeof kbStatusSchema>;
export type KbContentType = z.infer<typeof kbContentTypeSchema>;
export type KbAccessLevel = z.infer<typeof kbAccessLevelSchema>;
export type KbFeedbackType = z.infer<typeof kbFeedbackTypeSchema>;

export type CreateKbArticle = z.infer<typeof createKbArticleSchema>;
export type UpdateKbArticle = z.infer<typeof updateKbArticleSchema>;
export type KbSearchQuery = z.infer<typeof kbSearchSchema>;
export type KbFeedback = z.infer<typeof kbFeedbackSchema>;
export type KbSearchAnalytics = z.infer<typeof kbSearchAnalyticsSchema>;
export type KbArticleView = z.infer<typeof kbArticleViewSchema>;

// =============================================================================
// SECURITY VALIDATION HELPERS
// =============================================================================

// Rate limiting configurations for KB endpoints
export const KB_RATE_LIMITS = {
  search: { requests: 30, window: 60 }, // 30 searches per minute
  article_view: { requests: 60, window: 60 }, // 60 views per minute
  feedback: { requests: 10, window: 3600 }, // 10 feedback submissions per hour
  analytics: { requests: 100, window: 300 }, // 100 analytics events per 5 minutes
  article_creation: { requests: 5, window: 3600 }, // 5 article creations per hour
  bulk_operations: { requests: 3, window: 3600 }, // 3 bulk operations per hour
} as const;

// Subscription tier validation helper
export const validateUserAccessLevel = (
  userTier: string,
  requiredLevel: KbAccessLevel,
): boolean => {
  const tierHierarchy = {
    free: 0,
    starter: 1,
    professional: 2,
    scale: 3,
    enterprise: 4,
  };

  const accessHierarchy = {
    free: 0,
    starter: 1,
    professional: 2,
    scale: 3,
    enterprise: 4,
  };

  const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] ?? -1;
  const requiredAccessLevel = accessHierarchy[requiredLevel];

  return userLevel >= requiredAccessLevel;
};

// Wedding industry content validation
export const validateWeddingContent = (
  content: string,
): {
  isRelevant: boolean;
  confidence: number;
  suggestedCategory?: KbCategory;
} => {
  const weddingKeywords = {
    photography: ['photo', 'camera', 'shoot', 'portrait', 'album'],
    venues: ['venue', 'location', 'ceremony', 'reception', 'space'],
    catering: ['catering', 'food', 'menu', 'chef', 'cuisine'],
    planning: ['planning', 'timeline', 'coordination', 'schedule'],
    flowers: ['flower', 'bouquet', 'floral', 'arrangement', 'bloom'],
  };

  const contentLower = content.toLowerCase();
  let maxScore = 0;
  let suggestedCategory: KbCategory | undefined;

  for (const [category, keywords] of Object.entries(weddingKeywords)) {
    const score = keywords.reduce((acc, keyword) => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || [])
        .length;
      return acc + matches;
    }, 0);

    if (score > maxScore) {
      maxScore = score;
      suggestedCategory = category as KbCategory;
    }
  }

  const weddingGeneralKeywords = [
    'wedding',
    'bride',
    'groom',
    'marriage',
    'ceremony',
    'reception',
  ];
  const generalScore = weddingGeneralKeywords.reduce((acc, keyword) => {
    return acc + (contentLower.match(new RegExp(keyword, 'g')) || []).length;
  }, 0);

  const totalScore = maxScore + generalScore;
  const confidence = Math.min(totalScore / 10, 1); // Normalize to 0-1

  return {
    isRelevant: confidence > 0.3, // 30% confidence threshold
    confidence,
    suggestedCategory: confidence > 0.5 ? suggestedCategory : undefined,
  };
};

// =============================================================================
// SECURITY AUDIT HELPERS
// =============================================================================

// Content security scanner
export const scanContentSecurity = (
  content: string,
): {
  threats: string[];
  riskLevel: 'low' | 'medium' | 'high';
  cleaned: string;
} => {
  const threats: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Check for script injection
  if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(content)) {
    threats.push('Script tag detected');
    riskLevel = 'high';
  }

  // Check for iframe injection
  if (/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi.test(content)) {
    threats.push('Iframe tag detected');
    riskLevel = 'medium';
  }

  // Check for SQL patterns
  if (
    /(union|select|insert|update|delete|drop|create|alter|exec)/gi.test(content)
  ) {
    threats.push('SQL patterns detected');
    if (riskLevel === 'low') riskLevel = 'medium';
  }

  // Clean content (basic sanitization)
  let cleaned = content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  return { threats, riskLevel, cleaned };
};

/**
 * WEDDING INDUSTRY KNOWLEDGE BASE VALIDATION SUMMARY
 *
 * This validation system provides:
 * 1. Comprehensive input validation for all KB endpoints
 * 2. Wedding industry specific categorization and content validation
 * 3. Multi-tier access control validation
 * 4. Advanced security scanning and threat detection
 * 5. Performance optimized search parameter validation
 * 6. Analytics and feedback validation for business intelligence
 * 7. Content management workflow validation
 * 8. Rate limiting configuration for abuse prevention
 *
 * All schemas follow WedSync security standards:
 * - SQL injection prevention
 * - XSS attack prevention
 * - Input sanitization and transformation
 * - Type safety with TypeScript inference
 * - Business logic validation
 * - Performance optimization
 */
