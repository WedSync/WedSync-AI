// FAQ Knowledge Base Integration Service - Connect extraction with existing FAQ system
// Feature ID: WS-125 - Automated FAQ Extraction from Documents
// Team: C - Batch 9 Round 3
// Component: Knowledge Base Integration

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { faqService } from './faqService';
import {
  faqExtractionService,
  type ExtractedFAQ,
  type ReviewableExtraction,
} from './faq-extraction-service';
import {
  faqCategorizationService,
  type CategorizationResult,
} from './faq-categorization-service';
import {
  faqAnswerMatchingService,
  type DuplicateDetectionResult,
} from './faq-answer-matching-service';
import type {
  FaqItem,
  FaqCategory,
  CreateFaqItemRequest,
  CreateFaqCategoryRequest,
} from '@/types/faq';

// Knowledge Base Integration types
interface KnowledgeBaseSyncRequest {
  supplier_id: string;
  sync_options: {
    auto_approve_high_confidence: boolean;
    merge_duplicates: boolean;
    update_existing_answers: boolean;
    create_missing_categories: boolean;
    confidence_threshold: number;
  };
}

interface KnowledgeBaseSyncResult {
  faqs_created: number;
  faqs_updated: number;
  duplicates_merged: number;
  categories_created: number;
  errors: Array<{
    extraction_id: string;
    error: string;
    details: string;
  }>;
  processing_stats: {
    total_processed: number;
    success_rate: number;
    processing_time_ms: number;
  };
}

interface KnowledgeBaseEnrichmentRequest {
  supplier_id: string;
  target_gaps: Array<{
    category: string;
    missing_topics: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface KnowledgeBaseEnrichmentResult {
  suggested_faqs: Array<{
    question: string;
    suggested_answer: string;
    category: string;
    priority: number;
    reasoning: string;
  }>;
  coverage_improvement: number;
  estimated_impact: {
    reduced_support_queries: number;
    improved_client_satisfaction: number;
  };
}

interface KnowledgeBaseAnalytics {
  total_faqs: number;
  coverage_by_category: Array<{
    category: string;
    faq_count: number;
    coverage_score: number;
    top_gaps: string[];
  }>;
  quality_metrics: {
    avg_confidence: number;
    high_quality_percentage: number;
    needs_review_count: number;
  };
  usage_insights: {
    most_searched_topics: string[];
    low_performing_faqs: Array<{
      id: string;
      question: string;
      issues: string[];
    }>;
  };
  recommendations: Array<{
    type: 'create' | 'update' | 'merge' | 'remove';
    priority: 'high' | 'medium' | 'low';
    description: string;
    action_items: string[];
  }>;
}

export class FaqKnowledgeBaseIntegrationService {
  private supabase = createClientComponentClient();

  /**
   * Sync extracted FAQs with the existing knowledge base
   */
  async syncWithKnowledgeBase(
    request: KnowledgeBaseSyncRequest,
  ): Promise<KnowledgeBaseSyncResult> {
    const startTime = performance.now();
    const { supplier_id, sync_options } = request;

    const result: KnowledgeBaseSyncResult = {
      faqs_created: 0,
      faqs_updated: 0,
      duplicates_merged: 0,
      categories_created: 0,
      errors: [],
      processing_stats: {
        total_processed: 0,
        success_rate: 0,
        processing_time_ms: 0,
      },
    };

    try {
      // Get pending extractions
      const pendingExtractions =
        await faqExtractionService.getPendingReviews(supplier_id);
      result.processing_stats.total_processed = pendingExtractions.length;

      if (pendingExtractions.length === 0) {
        result.processing_stats.processing_time_ms =
          performance.now() - startTime;
        return result;
      }

      // Get existing FAQs for duplicate detection
      const existingFaqs = await this.getExistingFaqs(supplier_id);

      // Process each extraction
      for (const extraction of pendingExtractions) {
        try {
          // Skip if confidence is below threshold
          if (
            extraction.extracted_faq.confidence <
            sync_options.confidence_threshold
          ) {
            continue;
          }

          // Check for duplicates
          if (sync_options.merge_duplicates) {
            const duplicateCheck = await this.findDuplicates(
              extraction.extracted_faq,
              existingFaqs,
            );
            if (duplicateCheck.has_duplicates) {
              await this.mergeDuplicateFaq(
                extraction,
                duplicateCheck.duplicate_faq,
              );
              result.duplicates_merged++;
              continue;
            }
          }

          // Ensure category exists
          const category = await this.ensureCategoryExists(
            supplier_id,
            extraction.extracted_faq.category,
            sync_options.create_missing_categories,
          );

          if (!category) {
            result.errors.push({
              extraction_id: extraction.id,
              error: 'Category not found',
              details: `Category ${extraction.extracted_faq.category} does not exist`,
            });
            continue;
          }

          // Create or update FAQ
          if (sync_options.update_existing_answers) {
            const existingFaq = await this.findSimilarExistingFaq(
              extraction.extracted_faq,
              existingFaqs,
            );
            if (existingFaq) {
              await this.updateExistingFaq(
                existingFaq.id,
                extraction.extracted_faq,
              );
              result.faqs_updated++;
            } else {
              await this.createNewFaq(
                category.id,
                extraction.extracted_faq,
                supplier_id,
              );
              result.faqs_created++;
            }
          } else {
            await this.createNewFaq(
              category.id,
              extraction.extracted_faq,
              supplier_id,
            );
            result.faqs_created++;
          }

          // Auto-approve if requested
          if (sync_options.auto_approve_high_confidence) {
            await faqExtractionService.approveFaqExtraction(extraction.id);
          }
        } catch (error) {
          result.errors.push({
            extraction_id: extraction.id,
            error: 'Processing failed',
            details: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Calculate success rate
      const successful =
        result.faqs_created + result.faqs_updated + result.duplicates_merged;
      result.processing_stats.success_rate =
        successful / result.processing_stats.total_processed;
      result.processing_stats.processing_time_ms =
        performance.now() - startTime;

      return result;
    } catch (error) {
      console.error('Knowledge base sync error:', error);
      throw error;
    }
  }

  /**
   * Get existing FAQs for the supplier
   */
  private async getExistingFaqs(supplier_id: string): Promise<FaqItem[]> {
    const { data, error } = await this.supabase
      .from('faq_items')
      .select(
        `
        *,
        faq_categories (
          name,
          slug
        )
      `,
      )
      .eq('supplier_id', supplier_id)
      .eq('is_published', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Find duplicates of an extracted FAQ
   */
  private async findDuplicates(
    extractedFaq: ExtractedFAQ,
    existingFaqs: FaqItem[],
  ): Promise<{
    has_duplicates: boolean;
    duplicate_faq?: FaqItem;
    similarity_score?: number;
  }> {
    const duplicateResult = await faqAnswerMatchingService.detectDuplicateFaqs({
      faqs: [
        ...existingFaqs.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: (faq as any).faq_categories?.slug,
        })),
        {
          id: 'extracted',
          question: extractedFaq.question,
          answer: extractedFaq.answer,
          category: extractedFaq.category,
        },
      ],
      similarity_threshold: 0.8,
    });

    // Find if extracted FAQ has duplicates
    const extractedGroup = duplicateResult.duplicate_groups.find(
      (group) =>
        group.master_faq_id === 'extracted' ||
        group.duplicate_faq_ids.includes('extracted'),
    );

    if (extractedGroup) {
      const duplicateId =
        extractedGroup.master_faq_id === 'extracted'
          ? extractedGroup.duplicate_faq_ids[0]
          : extractedGroup.master_faq_id;

      const duplicateFaq = existingFaqs.find((faq) => faq.id === duplicateId);
      return {
        has_duplicates: true,
        duplicate_faq: duplicateFaq,
        similarity_score: Math.max(...extractedGroup.similarity_scores),
      };
    }

    return { has_duplicates: false };
  }

  /**
   * Merge extracted FAQ with existing duplicate
   */
  private async mergeDuplicateFaq(
    extraction: ReviewableExtraction,
    existingFaq: FaqItem,
  ): Promise<void> {
    // Use answer matching service to create merged answer
    const matchingResult = await faqAnswerMatchingService.matchAnswerToQuestion(
      {
        question: extraction.extracted_faq.question,
        potential_answers: [extraction.extracted_faq.answer],
        existing_faqs: [existingFaq],
      },
    );

    // Update existing FAQ with improved answer
    if (matchingResult.best_match.confidence > 0.8) {
      await faqService.updateFaqItem({
        id: existingFaq.id,
        answer: matchingResult.best_match.answer,
        tags: [
          ...new Set([...existingFaq.tags, ...extraction.extracted_faq.tags]),
        ],
      });
    }
  }

  /**
   * Ensure FAQ category exists
   */
  private async ensureCategoryExists(
    supplier_id: string,
    categorySlug: string,
    createIfMissing: boolean,
  ): Promise<FaqCategory | null> {
    // Try to find existing category
    const { data: existing } = await this.supabase
      .from('faq_categories')
      .select('*')
      .eq('supplier_id', supplier_id)
      .eq('slug', categorySlug)
      .single();

    if (existing) return existing;

    if (!createIfMissing) return null;

    // Create new category based on standard wedding categories
    const { WEDDING_FAQ_CATEGORIES } = await import('@/types/faq');
    const standardCategory = WEDDING_FAQ_CATEGORIES.find(
      (cat) => cat.slug === categorySlug,
    );

    if (!standardCategory) return null;

    const categoryRequest: CreateFaqCategoryRequest = {
      name: standardCategory.name,
      description: standardCategory.description,
      slug: standardCategory.slug,
      icon: standardCategory.icon,
      sort_order: 0,
    };

    return await faqService.createCategory(categoryRequest);
  }

  /**
   * Find similar existing FAQ
   */
  private async findSimilarExistingFaq(
    extractedFaq: ExtractedFAQ,
    existingFaqs: FaqItem[],
  ): Promise<FaqItem | null> {
    const matchingResult = await faqAnswerMatchingService.matchAnswerToQuestion(
      {
        question: extractedFaq.question,
        existing_faqs: existingFaqs,
      },
    );

    // Return existing FAQ if high similarity
    const duplicateMatch = matchingResult.duplicate_questions.find(
      (dup) => dup.similarity > 0.85,
    );
    if (duplicateMatch) {
      return (
        existingFaqs.find((faq) => faq.id === duplicateMatch.faq_id) || null
      );
    }

    return null;
  }

  /**
   * Create new FAQ from extraction
   */
  private async createNewFaq(
    category_id: string,
    extractedFaq: ExtractedFAQ,
    supplier_id: string,
  ): Promise<FaqItem | null> {
    const faqRequest: CreateFaqItemRequest = {
      category_id,
      question: extractedFaq.question,
      answer: extractedFaq.answer,
      summary: extractedFaq.summary,
      tags: extractedFaq.tags,
      is_featured: extractedFaq.confidence >= 0.9,
    };

    return await faqService.createFaqItem(faqRequest);
  }

  /**
   * Update existing FAQ with extracted information
   */
  private async updateExistingFaq(
    faq_id: string,
    extractedFaq: ExtractedFAQ,
  ): Promise<void> {
    await faqService.updateFaqItem({
      id: faq_id,
      answer: extractedFaq.answer,
      summary: extractedFaq.summary,
      tags: extractedFaq.tags,
    });
  }

  /**
   * Enrich knowledge base with AI-generated content
   */
  async enrichKnowledgeBase(
    request: KnowledgeBaseEnrichmentRequest,
  ): Promise<KnowledgeBaseEnrichmentResult> {
    // This would use AI to generate FAQs for identified gaps
    // Implementation would involve:
    // 1. Analyzing existing FAQ coverage
    // 2. Identifying common wedding industry questions not covered
    // 3. Generating high-quality answers for those questions
    // 4. Prioritizing based on likely impact

    return {
      suggested_faqs: [], // Would be populated with AI-generated suggestions
      coverage_improvement: 0,
      estimated_impact: {
        reduced_support_queries: 0,
        improved_client_satisfaction: 0,
      },
    };
  }

  /**
   * Get comprehensive knowledge base analytics
   */
  async getKnowledgeBaseAnalytics(
    supplier_id: string,
  ): Promise<KnowledgeBaseAnalytics> {
    try {
      // Get all FAQs with categories
      const { data: faqs } = await this.supabase
        .from('faq_items')
        .select(
          `
          *,
          faq_categories (
            name,
            slug
          )
        `,
        )
        .eq('supplier_id', supplier_id);

      if (!faqs) {
        throw new Error('Failed to fetch FAQs');
      }

      // Calculate category coverage
      const categoryMap = new Map<string, FaqItem[]>();
      faqs.forEach((faq) => {
        const category = (faq as any).faq_categories?.slug || 'uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(faq);
      });

      const coverage_by_category = Array.from(categoryMap.entries()).map(
        ([category, categoryFaqs]) => ({
          category,
          faq_count: categoryFaqs.length,
          coverage_score: Math.min(1, categoryFaqs.length / 10), // Assume 10 FAQs per category is good coverage
          top_gaps: [], // Would be populated with identified gaps
        }),
      );

      // Calculate quality metrics
      const totalConfidence = faqs.reduce(
        (sum, faq) => sum + faq.help_score / 10,
        0,
      ); // Convert help_score to confidence
      const avg_confidence = totalConfidence / faqs.length;
      const high_quality_count = faqs.filter(
        (faq) => faq.help_score >= 8,
      ).length;
      const needs_review_count = faqs.filter(
        (faq) => faq.help_score < 5,
      ).length;

      // Get usage insights (mock data - would come from analytics)
      const most_searched_topics = [
        'pricing',
        'timeline',
        'weather backup',
        'packages',
      ];
      const low_performing_faqs = faqs
        .filter((faq) => faq.help_score < 5)
        .slice(0, 5)
        .map((faq) => ({
          id: faq.id,
          question: faq.question,
          issues: ['Low helpfulness score', 'Needs clearer answer'],
        }));

      // Generate recommendations
      const recommendations = [
        {
          type: 'create' as const,
          priority: 'high' as const,
          description: 'Add more pricing-related FAQs',
          action_items: [
            'Create detailed pricing breakdown FAQ',
            'Add payment options FAQ',
          ],
        },
        {
          type: 'update' as const,
          priority: 'medium' as const,
          description: 'Improve low-performing FAQ answers',
          action_items: ['Rewrite confusing answers', 'Add specific examples'],
        },
      ];

      return {
        total_faqs: faqs.length,
        coverage_by_category,
        quality_metrics: {
          avg_confidence,
          high_quality_percentage: (high_quality_count / faqs.length) * 100,
          needs_review_count,
        },
        usage_insights: {
          most_searched_topics,
          low_performing_faqs,
        },
        recommendations,
      };
    } catch (error) {
      console.error('Knowledge base analytics error:', error);
      throw error;
    }
  }

  /**
   * Optimize existing knowledge base
   */
  async optimizeKnowledgeBase(supplier_id: string): Promise<{
    duplicates_merged: number;
    answers_improved: number;
    categories_optimized: number;
    low_quality_flagged: number;
  }> {
    try {
      const result = {
        duplicates_merged: 0,
        answers_improved: 0,
        categories_optimized: 0,
        low_quality_flagged: 0,
      };

      // Get all FAQs
      const existingFaqs = await this.getExistingFaqs(supplier_id);

      // Detect and merge duplicates
      const duplicateResult =
        await faqAnswerMatchingService.detectDuplicateFaqs({
          faqs: existingFaqs.map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            category: (faq as any).faq_categories?.slug,
          })),
        });

      // Process merge recommendations
      for (const group of duplicateResult.duplicate_groups) {
        if (
          group.merge_strategy === 'combine_answers' &&
          group.suggested_merged_answer
        ) {
          // Update master FAQ with merged answer
          await faqService.updateFaqItem({
            id: group.master_faq_id,
            answer: group.suggested_merged_answer,
          });

          // Mark duplicates as unpublished
          for (const duplicateId of group.duplicate_faq_ids) {
            await faqService.updateFaqItem({
              id: duplicateId,
              is_published: false,
            });
          }

          result.duplicates_merged++;
        }
      }

      // Flag low quality FAQs
      const lowQualityFaqs = existingFaqs.filter((faq) => faq.help_score < 5);
      result.low_quality_flagged = lowQualityFaqs.length;

      // Recategorize FAQs with low confidence
      const recategorizationResult =
        await faqCategorizationService.bulkCategorizeFaqs({
          items: existingFaqs.map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            current_category: (faq as any).faq_categories?.slug,
          })),
        });

      // Apply high-confidence recategorizations
      for (const categoryResult of recategorizationResult.results) {
        if (
          categoryResult.confidence_level === 'high' &&
          categoryResult.categorization.confidence > 0.9
        ) {
          // Update category if different
          const currentFaq = existingFaqs.find(
            (f) => f.id === categoryResult.id,
          );
          if (
            currentFaq &&
            (currentFaq as any).faq_categories?.slug !==
              categoryResult.categorization.primary_category
          ) {
            const newCategory = await this.ensureCategoryExists(
              supplier_id,
              categoryResult.categorization.primary_category,
              true,
            );
            if (newCategory) {
              await faqService.updateFaqItem({
                id: categoryResult.id,
                category_id: newCategory.id,
                tags: categoryResult.categorization.suggested_tags,
              });
              result.categories_optimized++;
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Knowledge base optimization error:', error);
      throw error;
    }
  }

  /**
   * Generate knowledge base health report
   */
  async generateHealthReport(supplier_id: string): Promise<{
    overall_health_score: number;
    coverage_score: number;
    quality_score: number;
    engagement_score: number;
    issues: Array<{
      severity: 'high' | 'medium' | 'low';
      category: string;
      description: string;
      recommendation: string;
    }>;
    improvement_plan: Array<{
      action: string;
      priority: number;
      estimated_impact: string;
      effort_level: 'low' | 'medium' | 'high';
    }>;
  }> {
    const analytics = await this.getKnowledgeBaseAnalytics(supplier_id);

    // Calculate health scores (0-100)
    const coverage_score =
      (analytics.coverage_by_category.reduce(
        (sum, cat) => sum + cat.coverage_score,
        0,
      ) /
        analytics.coverage_by_category.length) *
      100;
    const quality_score = analytics.quality_metrics.high_quality_percentage;
    const engagement_score = Math.max(
      0,
      100 -
        (analytics.usage_insights.low_performing_faqs.length /
          analytics.total_faqs) *
          100,
    );

    const overall_health_score =
      (coverage_score + quality_score + engagement_score) / 3;

    // Identify issues
    const issues = [
      ...(coverage_score < 70
        ? [
            {
              severity: 'high' as const,
              category: 'Coverage',
              description: 'Knowledge base has gaps in important categories',
              recommendation: 'Add FAQs for underrepresented topics',
            },
          ]
        : []),
      ...(quality_score < 60
        ? [
            {
              severity: 'high' as const,
              category: 'Quality',
              description: 'Many FAQs have low quality scores',
              recommendation: 'Review and improve poorly performing answers',
            },
          ]
        : []),
      ...(analytics.usage_insights.low_performing_faqs.length > 5
        ? [
            {
              severity: 'medium' as const,
              category: 'Performance',
              description: 'Several FAQs are underperforming',
              recommendation: 'Analyze and optimize low-engagement content',
            },
          ]
        : []),
    ];

    // Generate improvement plan
    const improvement_plan = [
      {
        action: 'Extract FAQs from recent client communications',
        priority: 1,
        estimated_impact: 'High - addresses current client questions',
        effort_level: 'medium' as const,
      },
      {
        action: 'Review and optimize low-performing FAQs',
        priority: 2,
        estimated_impact: 'Medium - improves user satisfaction',
        effort_level: 'low' as const,
      },
      {
        action: 'Create comprehensive pricing FAQ section',
        priority: 3,
        estimated_impact: 'High - reduces support queries',
        effort_level: 'medium' as const,
      },
    ];

    return {
      overall_health_score: Math.round(overall_health_score),
      coverage_score: Math.round(coverage_score),
      quality_score: Math.round(quality_score),
      engagement_score: Math.round(engagement_score),
      issues,
      improvement_plan,
    };
  }
}

// Singleton export
export const faqKnowledgeBaseIntegrationService =
  new FaqKnowledgeBaseIntegrationService();

// Type exports
export type {
  KnowledgeBaseSyncRequest,
  KnowledgeBaseSyncResult,
  KnowledgeBaseEnrichmentRequest,
  KnowledgeBaseEnrichmentResult,
  KnowledgeBaseAnalytics,
};
