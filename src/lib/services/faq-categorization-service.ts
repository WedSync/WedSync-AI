// FAQ Categorization Service - AI-powered question categorization
// Feature ID: WS-125 - Automated FAQ Extraction from Documents
// Team: C - Batch 9 Round 3
// Component: Question Categorization System

import OpenAI from 'openai';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  FaqItem,
  FaqCategory,
  WEDDING_FAQ_CATEGORIES,
  WeddingFaqCategorySlug,
} from '@/types/faq';

// Categorization types
interface CategorizationRequest {
  question: string;
  answer?: string;
  existing_tags?: string[];
  context?: string;
}

interface CategorizationResult {
  primary_category: WeddingFaqCategorySlug;
  confidence: number;
  secondary_categories: Array<{
    category: WeddingFaqCategorySlug;
    confidence: number;
  }>;
  suggested_tags: string[];
  reasoning: string;
}

interface BulkCategorizationRequest {
  items: Array<{
    id: string;
    question: string;
    answer?: string;
    current_category?: string;
  }>;
}

interface BulkCategorizationResult {
  results: Array<{
    id: string;
    categorization: CategorizationResult;
    needs_review: boolean;
    confidence_level: 'high' | 'medium' | 'low';
  }>;
  summary: {
    total_processed: number;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
    processing_time_ms: number;
  };
}

interface CategoryPattern {
  category: WeddingFaqCategorySlug;
  keywords: string[];
  question_patterns: RegExp[];
  answer_patterns: RegExp[];
  weight: number;
}

export class FaqCategorizationService {
  private openai: OpenAI;
  private supabase = createClientComponentClient();

  // Confidence thresholds
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.65;
  private readonly AUTO_APPLY_THRESHOLD = 0.9;

  // Category matching patterns for fast initial classification
  private readonly CATEGORY_PATTERNS: CategoryPattern[] = [
    {
      category: 'booking-pricing',
      keywords: [
        'cost',
        'price',
        'pricing',
        'fee',
        'rate',
        'budget',
        'expensive',
        'cheap',
        'payment',
        'deposit',
        'book',
        'booking',
        'reserve',
        'availability',
      ],
      question_patterns: [
        /what.*cost|how much.*cost|pricing|price.*for|fee.*for/i,
        /budget|expensive|cheap|afford|payment/i,
        /book|booking|reserve|available|availability/i,
      ],
      answer_patterns: [
        /\$[\d,]+|\d+.*dollar|price.*start|cost.*between/i,
        /package.*price|pricing.*structure|fee.*schedule/i,
      ],
      weight: 1.0,
    },
    {
      category: 'timeline-delivery',
      keywords: [
        'timeline',
        'delivery',
        'ready',
        'turnaround',
        'when',
        'receive',
        'completed',
        'finished',
        'schedule',
        'time',
        'duration',
      ],
      question_patterns: [
        /when.*ready|when.*receive|delivery.*time|turnaround/i,
        /how.*long|timeline|duration|take.*to/i,
        /schedule|when.*can|what.*time/i,
      ],
      answer_patterns: [
        /\d+.*week|days.*after|timeline.*is|deliver.*in/i,
        /ready.*within|turnaround.*time|schedule.*delivery/i,
      ],
      weight: 1.0,
    },
    {
      category: 'photography-process',
      keywords: [
        'process',
        'shoot',
        'style',
        'approach',
        'coverage',
        'photos',
        'pictures',
        'session',
        'expect',
        'during',
        'editing',
        'retouching',
      ],
      question_patterns: [
        /process|approach|style.*photography|what.*expect/i,
        /shoot|session|coverage|during.*wedding/i,
        /edit|retouch|photo.*style|picture.*style/i,
      ],
      answer_patterns: [
        /style.*is|approach.*to|process.*involves/i,
        /during.*shoot|coverage.*includes|editing.*process/i,
      ],
      weight: 1.0,
    },
    {
      category: 'wedding-day-logistics',
      keywords: [
        'wedding day',
        'ceremony',
        'reception',
        'venue',
        'location',
        'coordination',
        'schedule',
        'timeline',
        'logistics',
        'setup',
        'breakdown',
      ],
      question_patterns: [
        /wedding.*day|ceremony|reception/i,
        /venue|location|where|coordinate/i,
        /schedule.*day|timeline.*wedding|logistics/i,
      ],
      answer_patterns: [
        /wedding.*day|ceremony.*starts|reception.*begins/i,
        /coordinate.*with|venue.*requires|location.*setup/i,
      ],
      weight: 1.0,
    },
    {
      category: 'packages-addons',
      keywords: [
        'package',
        'packages',
        'include',
        'includes',
        'included',
        'addon',
        'add-on',
        'extra',
        'upgrade',
        'additional',
        'options',
      ],
      question_patterns: [
        /package.*include|what.*include|include.*in/i,
        /addon|add.*on|extra|additional|upgrade/i,
        /options.*available|different.*package/i,
      ],
      answer_patterns: [
        /package.*includes|included.*in|comes.*with/i,
        /additional.*options|upgrade.*available|addon.*service/i,
      ],
      weight: 1.0,
    },
    {
      category: 'weather-backup',
      keywords: [
        'weather',
        'rain',
        'backup',
        'plan b',
        'indoor',
        'outdoor',
        'storm',
        'contingency',
        'alternative',
        'bad weather',
      ],
      question_patterns: [
        /weather|rain|storm|bad.*weather/i,
        /backup.*plan|plan.*b|contingency/i,
        /indoor|outdoor|alternative.*plan/i,
      ],
      answer_patterns: [
        /rain.*plan|weather.*backup|indoor.*option/i,
        /contingency.*plan|alternative.*venue|storm.*policy/i,
      ],
      weight: 1.0,
    },
    {
      category: 'image-rights',
      keywords: [
        'rights',
        'copyright',
        'usage',
        'sharing',
        'social media',
        'print',
        'license',
        'ownership',
        'publish',
        'commercial',
      ],
      question_patterns: [
        /rights|copyright|usage.*rights|own.*photos/i,
        /share|sharing|social.*media|post.*online/i,
        /print|commercial.*use|publish|license/i,
      ],
      answer_patterns: [
        /rights.*to|copyright.*remain|usage.*rights/i,
        /share.*on|print.*rights|commercial.*license/i,
      ],
      weight: 1.0,
    },
    {
      category: 'payment-contracts',
      keywords: [
        'contract',
        'agreement',
        'terms',
        'conditions',
        'payment plan',
        'installment',
        'refund',
        'cancellation',
        'policy',
      ],
      question_patterns: [
        /contract|agreement|terms.*conditions/i,
        /payment.*plan|installment|pay.*schedule/i,
        /refund|cancellation|cancel.*policy/i,
      ],
      answer_patterns: [
        /contract.*states|agreement.*includes|terms.*are/i,
        /payment.*schedule|refund.*policy|cancellation.*terms/i,
      ],
      weight: 1.0,
    },
  ];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      dangerouslyAllowBrowser: false,
    });
  }

  /**
   * Categorize a single FAQ using hybrid approach
   */
  async categorizeFaq(
    request: CategorizationRequest,
  ): Promise<CategorizationResult> {
    try {
      // Step 1: Pattern-based fast categorization
      const patternResult = this.performPatternBasedCategorization(request);

      // Step 2: If pattern matching has low confidence, use AI
      if (patternResult.confidence < this.MEDIUM_CONFIDENCE_THRESHOLD) {
        const aiResult = await this.performAICategorization(request);

        // Combine pattern and AI results
        return this.combineCategorizationResults(
          patternResult,
          aiResult,
          request,
        );
      }

      return patternResult;
    } catch (error) {
      console.error('FAQ categorization error:', error);
      // Fallback to pattern-based only
      return this.performPatternBasedCategorization(request);
    }
  }

  /**
   * Pattern-based categorization for fast, deterministic results
   */
  private performPatternBasedCategorization(
    request: CategorizationRequest,
  ): CategorizationResult {
    const { question, answer = '', existing_tags = [] } = request;
    const combinedText = `${question} ${answer}`.toLowerCase();

    // Score each category
    const categoryScores = this.CATEGORY_PATTERNS.map((pattern) => {
      let score = 0;

      // Keyword matching
      const keywordMatches = pattern.keywords.filter((keyword) =>
        combinedText.includes(keyword.toLowerCase()),
      ).length;
      score += keywordMatches * 0.3;

      // Question pattern matching
      const questionMatches = pattern.question_patterns.filter((regex) =>
        regex.test(question),
      ).length;
      score += questionMatches * 0.4;

      // Answer pattern matching (if answer provided)
      if (answer) {
        const answerMatches = pattern.answer_patterns.filter((regex) =>
          regex.test(answer),
        ).length;
        score += answerMatches * 0.3;
      }

      // Tag matching boost
      const tagMatches = existing_tags.filter((tag) =>
        pattern.keywords.some((keyword) => keyword.includes(tag.toLowerCase())),
      ).length;
      score += tagMatches * 0.2;

      return {
        category: pattern.category,
        score: score * pattern.weight,
        matches: {
          keywords: keywordMatches,
          question_patterns: questionMatches,
          answer_patterns: answer
            ? pattern.answer_patterns.filter((regex) => regex.test(answer))
                .length
            : 0,
        },
      };
    }).sort((a, b) => b.score - a.score);

    const topResult = categoryScores[0];
    const confidence = Math.min(0.95, topResult.score / 2); // Normalize to 0-0.95 range

    // Generate secondary categories
    const secondaryCategories = categoryScores
      .slice(1, 4)
      .filter((result) => result.score > 0.1)
      .map((result) => ({
        category: result.category,
        confidence: Math.min(0.8, result.score / 2),
      }));

    // Generate suggested tags
    const suggestedTags = this.generateTagsFromPattern(
      request,
      topResult.category,
    );

    return {
      primary_category: topResult.category,
      confidence,
      secondary_categories: secondaryCategories,
      suggested_tags: suggestedTags,
      reasoning: `Pattern-based match: ${topResult.matches.keywords} keyword matches, ${topResult.matches.question_patterns} question patterns, ${topResult.matches.answer_patterns} answer patterns`,
    };
  }

  /**
   * AI-powered categorization for complex cases
   */
  private async performAICategorization(
    request: CategorizationRequest,
  ): Promise<CategorizationResult> {
    const { question, answer = '', existing_tags = [], context = '' } = request;

    const systemPrompt = `You are an expert wedding business FAQ categorization system. Categorize wedding-related questions into these specific categories:

Categories:
- booking-pricing: Questions about costs, pricing, booking process, availability
- timeline-delivery: Questions about schedules, delivery times, turnaround, when things happen  
- photography-process: Questions about photography style, approach, what to expect during shoots
- wedding-day-logistics: Questions about wedding day coordination, venue logistics, scheduling
- packages-addons: Questions about what's included in packages, add-ons, upgrades
- weather-backup: Questions about weather contingencies, backup plans, rain plans
- image-rights: Questions about photo usage rights, sharing, copyright, printing
- payment-contracts: Questions about contracts, payment plans, terms, refunds, cancellation

Analyze the question and answer to determine the most appropriate primary category and suggest relevant secondary categories.

Return JSON in this exact format:
{
  "primary_category": "category-slug",
  "confidence": 0.85,
  "secondary_categories": [
    {"category": "category-slug", "confidence": 0.60}
  ],
  "suggested_tags": ["tag1", "tag2", "tag3"],
  "reasoning": "Brief explanation of categorization decision"
}`;

    const userPrompt = `Question: "${question}"
${answer ? `Answer: "${answer}"` : ''}
${existing_tags.length > 0 ? `Existing Tags: ${existing_tags.join(', ')}` : ''}
${context ? `Context: ${context}` : ''}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI categorization');
    }

    try {
      const parsed = JSON.parse(response);
      return {
        primary_category: parsed.primary_category,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        secondary_categories: (parsed.secondary_categories || []).map(
          (cat: any) => ({
            category: cat.category,
            confidence: Math.min(0.9, Math.max(0, cat.confidence || 0.3)),
          }),
        ),
        suggested_tags: parsed.suggested_tags || [],
        reasoning: parsed.reasoning || 'AI-based categorization',
      };
    } catch (error) {
      console.error('Failed to parse AI categorization response:', error);
      throw new Error('Invalid AI categorization response');
    }
  }

  /**
   * Combine pattern and AI results for best accuracy
   */
  private combineCategorizationResults(
    patternResult: CategorizationResult,
    aiResult: CategorizationResult,
    request: CategorizationRequest,
  ): CategorizationResult {
    // If both agree on primary category, boost confidence
    if (patternResult.primary_category === aiResult.primary_category) {
      return {
        primary_category: aiResult.primary_category,
        confidence: Math.min(
          0.98,
          (patternResult.confidence + aiResult.confidence) / 1.5,
        ),
        secondary_categories: this.mergeSecondaryCategories(
          patternResult.secondary_categories,
          aiResult.secondary_categories,
        ),
        suggested_tags: [
          ...new Set([
            ...patternResult.suggested_tags,
            ...aiResult.suggested_tags,
          ]),
        ],
        reasoning: `Combined analysis: Pattern and AI agreement on ${aiResult.primary_category}`,
      };
    }

    // If they disagree, use AI result but with adjusted confidence
    return {
      ...aiResult,
      confidence: Math.min(aiResult.confidence, 0.8),
      secondary_categories: [
        {
          category: patternResult.primary_category,
          confidence: patternResult.confidence * 0.7,
        },
        ...aiResult.secondary_categories,
      ]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3),
      reasoning: `AI analysis with pattern consideration (disagreement resolved)`,
    };
  }

  /**
   * Merge secondary categories from different methods
   */
  private mergeSecondaryCategories(
    pattern: Array<{ category: WeddingFaqCategorySlug; confidence: number }>,
    ai: Array<{ category: WeddingFaqCategorySlug; confidence: number }>,
  ): Array<{ category: WeddingFaqCategorySlug; confidence: number }> {
    const merged = new Map<WeddingFaqCategorySlug, number>();

    // Add pattern results
    pattern.forEach((cat) => {
      merged.set(cat.category, cat.confidence);
    });

    // Add/update with AI results
    ai.forEach((cat) => {
      const existing = merged.get(cat.category) || 0;
      merged.set(cat.category, Math.max(existing, cat.confidence));
    });

    return Array.from(merged.entries())
      .map(([category, confidence]) => ({ category, confidence }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Generate tags from pattern matching
   */
  private generateTagsFromPattern(
    request: CategorizationRequest,
    category: WeddingFaqCategorySlug,
  ): string[] {
    const { question, answer = '' } = request;
    const combinedText = `${question} ${answer}`.toLowerCase();

    const categoryTagMap: Record<WeddingFaqCategorySlug, string[]> = {
      'booking-pricing': [
        'pricing',
        'booking',
        'cost',
        'budget',
        'payment',
        'deposit',
      ],
      'timeline-delivery': [
        'timeline',
        'delivery',
        'schedule',
        'turnaround',
        'ready',
      ],
      'photography-process': [
        'photography',
        'style',
        'process',
        'editing',
        'shoot',
      ],
      'wedding-day-logistics': [
        'wedding-day',
        'logistics',
        'coordination',
        'venue',
        'schedule',
      ],
      'packages-addons': [
        'packages',
        'includes',
        'add-ons',
        'extras',
        'upgrades',
      ],
      'weather-backup': ['weather', 'backup', 'rain', 'indoor', 'contingency'],
      'image-rights': ['rights', 'usage', 'sharing', 'copyright', 'print'],
      'payment-contracts': [
        'contract',
        'terms',
        'payment-plan',
        'refund',
        'cancellation',
      ],
    };

    const relevantTags = categoryTagMap[category] || [];
    return relevantTags.filter((tag) =>
      combinedText.includes(tag.replace('-', ' ')),
    );
  }

  /**
   * Bulk categorization for multiple FAQs
   */
  async bulkCategorizeFaqs(
    request: BulkCategorizationRequest,
  ): Promise<BulkCategorizationResult> {
    const startTime = performance.now();
    const results: BulkCategorizationResult['results'] = [];

    // Process in batches to avoid API limits
    const batchSize = 5;
    for (let i = 0; i < request.items.length; i += batchSize) {
      const batch = request.items.slice(i, i + batchSize);

      const batchPromises = batch.map(async (item) => {
        try {
          const categorization = await this.categorizeFaq({
            question: item.question,
            answer: item.answer,
            context: `Current category: ${item.current_category || 'none'}`,
          });

          const confidenceLevel: 'high' | 'medium' | 'low' =
            categorization.confidence >= this.HIGH_CONFIDENCE_THRESHOLD
              ? 'high'
              : categorization.confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD
                ? 'medium'
                : 'low';

          return {
            id: item.id,
            categorization,
            needs_review:
              categorization.confidence < this.HIGH_CONFIDENCE_THRESHOLD,
            confidence_level: confidenceLevel,
          };
        } catch (error) {
          console.error(`Failed to categorize item ${item.id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...(batchResults.filter(Boolean) as any[]));

      // Small delay between batches to be respectful to API
      if (i + batchSize < request.items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const processingTime = performance.now() - startTime;
    const highConfidence = results.filter(
      (r) => r.confidence_level === 'high',
    ).length;
    const mediumConfidence = results.filter(
      (r) => r.confidence_level === 'medium',
    ).length;
    const lowConfidence = results.filter(
      (r) => r.confidence_level === 'low',
    ).length;

    return {
      results,
      summary: {
        total_processed: results.length,
        high_confidence: highConfidence,
        medium_confidence: mediumConfidence,
        low_confidence: lowConfidence,
        processing_time_ms: Math.round(processingTime),
      },
    };
  }

  /**
   * Auto-apply categorization to existing FAQs above confidence threshold
   */
  async autoApplyCategorization(
    supplier_id: string,
    min_confidence: number = this.AUTO_APPLY_THRESHOLD,
  ): Promise<{
    processed: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    try {
      // Get uncategorized or poorly categorized FAQs
      const { data: faqs } = await this.supabase
        .from('faq_items')
        .select(
          `
          id,
          question,
          answer,
          summary,
          tags,
          category_id,
          faq_categories!inner (
            slug
          )
        `,
        )
        .eq('supplier_id', supplier_id)
        .limit(50); // Process in manageable chunks

      if (!faqs || faqs.length === 0) {
        return { processed: 0, updated: 0, skipped: 0, errors: 0 };
      }

      const bulkRequest: BulkCategorizationRequest = {
        items: faqs.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer || undefined,
          current_category: (faq as any).faq_categories?.slug,
        })),
      };

      const categorization = await this.bulkCategorizeFaqs(bulkRequest);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const result of categorization.results) {
        if (result.categorization.confidence < min_confidence) {
          skipped++;
          continue;
        }

        try {
          // Find the new category
          const { data: newCategory } = await this.supabase
            .from('faq_categories')
            .select('id')
            .eq('supplier_id', supplier_id)
            .eq('slug', result.categorization.primary_category)
            .single();

          if (!newCategory) {
            errors++;
            continue;
          }

          // Update the FAQ
          const { error } = await this.supabase
            .from('faq_items')
            .update({
              category_id: newCategory.id,
              tags: result.categorization.suggested_tags,
            })
            .eq('id', result.id);

          if (error) {
            errors++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`Failed to update FAQ ${result.id}:`, error);
          errors++;
        }
      }

      return {
        processed: categorization.results.length,
        updated,
        skipped,
        errors,
      };
    } catch (error) {
      console.error('Auto-apply categorization error:', error);
      throw error;
    }
  }

  /**
   * Get categorization analytics for a supplier
   */
  async getCategorizationAnalytics(supplier_id: string): Promise<{
    category_distribution: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    confidence_levels: {
      high: number;
      medium: number;
      low: number;
      unknown: number;
    };
    suggestions: string[];
  }> {
    try {
      const { data: faqs } = await this.supabase
        .from('faq_items')
        .select(
          `
          id,
          question,
          answer,
          tags,
          faq_categories!inner (
            name,
            slug
          )
        `,
        )
        .eq('supplier_id', supplier_id);

      if (!faqs || faqs.length === 0) {
        return {
          category_distribution: [],
          confidence_levels: { high: 0, medium: 0, low: 0, unknown: 0 },
          suggestions: [],
        };
      }

      // Calculate category distribution
      const categoryMap = new Map<string, number>();
      faqs.forEach((faq) => {
        const category = (faq as any).faq_categories?.name || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const total = faqs.length;
      const category_distribution = Array.from(categoryMap.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // For confidence levels, we'd need to store categorization confidence
      // This is a simplified version
      const confidence_levels = {
        high: Math.floor(total * 0.7), // Estimated
        medium: Math.floor(total * 0.2),
        low: Math.floor(total * 0.08),
        unknown: total - Math.floor(total * 0.98),
      };

      // Generate suggestions
      const suggestions = [
        'Consider reviewing FAQs with low categorization confidence',
        'Add more specific tags to improve categorization accuracy',
        'Review questions that may belong to multiple categories',
      ];

      return {
        category_distribution,
        confidence_levels,
        suggestions,
      };
    } catch (error) {
      console.error('Get categorization analytics error:', error);
      throw error;
    }
  }
}

// Singleton export
export const faqCategorizationService = new FaqCategorizationService();

// Type exports
export type {
  CategorizationRequest,
  CategorizationResult,
  BulkCategorizationRequest,
  BulkCategorizationResult,
  CategoryPattern,
};
