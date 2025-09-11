// FAQ Extraction Service - AI-powered FAQ discovery from documents
// Feature ID: WS-125 - Automated FAQ Extraction from Documents
// Team: C - Batch 9 Round 3
// Dependencies: WS-121 (PDF Analysis)

import OpenAI from 'openai';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { faqService } from './faqService';
import type {
  FaqItem,
  CreateFaqItemRequest,
  FaqCategory,
  WEDDING_FAQ_CATEGORIES,
} from '@/types/faq';

// Configuration and types
interface ExtractedFAQ {
  question: string;
  answer: string;
  summary: string;
  category: string;
  confidence: number;
  tags: string[];
  source_document: string;
  source_page?: number;
  context?: string;
}

interface DocumentAnalysis {
  content: string;
  document_type:
    | 'contract'
    | 'vendor_info'
    | 'service_guide'
    | 'email_thread'
    | 'client_inquiry'
    | 'other';
  source_file: string;
  page_number?: number;
}

interface ExtractionResult {
  faqs: ExtractedFAQ[];
  categories_detected: string[];
  processing_stats: {
    total_questions_found: number;
    high_confidence_questions: number;
    processing_time_ms: number;
    accuracy_estimate: number;
  };
}

interface ReviewableExtraction {
  id: string;
  supplier_id: string;
  extracted_faq: ExtractedFAQ;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_editing';
  reviewer_notes?: string;
  created_at: string;
  reviewed_at?: string;
  auto_approved: boolean;
}

export class FaqExtractionService {
  private openai: OpenAI;
  private supabase = createClientComponentClient();

  // High confidence threshold for auto-approval
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;

  // Common wedding FAQ patterns for improved accuracy
  private readonly WEDDING_QUESTION_PATTERNS = [
    /what.*cost|how much.*cost|pricing|price|fee|payment/i,
    /when.*available|availability|book|schedule/i,
    /what.*include|package.*include|what.*get/i,
    /how.*long|timeline|duration|how.*take/i,
    /what.*if.*rain|weather|backup.*plan|indoor/i,
    /can.*change|modify|edit|update|reschedule/i,
    /deposit|payment.*plan|when.*pay|refund/i,
    /what.*bring|what.*need|requirements/i,
    /how.*many.*photos|how.*many.*hours/i,
    /delivery.*time|when.*receive|turnaround/i,
  ];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      dangerouslyAllowBrowser: false, // This should run server-side
    });
  }

  /**
   * Main extraction method - analyzes documents and extracts FAQs
   */
  async extractFaqsFromDocument(
    analysis: DocumentAnalysis,
  ): Promise<ExtractionResult> {
    const startTime = performance.now();

    try {
      // Pre-process document content for better extraction
      const processedContent = await this.preprocessContent(
        analysis.content,
        analysis.document_type,
      );

      // Use OpenAI to extract potential FAQs
      const rawExtraction = await this.performOpenAIExtraction(
        processedContent,
        analysis,
      );

      // Apply wedding-specific filtering and validation
      const validatedFaqs = await this.validateAndCategorizeQuestions(
        rawExtraction,
        analysis,
      );

      // Calculate processing stats
      const processingTime = performance.now() - startTime;
      const highConfidenceCount = validatedFaqs.filter(
        (faq) => faq.confidence >= this.HIGH_CONFIDENCE_THRESHOLD,
      ).length;

      const result: ExtractionResult = {
        faqs: validatedFaqs,
        categories_detected: [
          ...new Set(validatedFaqs.map((faq) => faq.category)),
        ],
        processing_stats: {
          total_questions_found: validatedFaqs.length,
          high_confidence_questions: highConfidenceCount,
          processing_time_ms: Math.round(processingTime),
          accuracy_estimate: this.calculateAccuracyEstimate(validatedFaqs),
        },
      };

      return result;
    } catch (error) {
      console.error('FAQ extraction error:', error);
      throw new Error(`FAQ extraction failed: ${error}`);
    }
  }

  /**
   * Pre-process document content for better extraction
   */
  private async preprocessContent(
    content: string,
    documentType: string,
  ): Promise<string> {
    // Clean up common PDF extraction artifacts
    let processed = content
      .replace(/\f/g, '\n') // Form feed to newline
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*([A-Z])/g, '$1\n$2') // Split sentences
      .trim();

    // Remove common headers/footers based on document type
    if (documentType === 'contract') {
      processed = processed.replace(
        /page \d+ of \d+|copyright \d{4}|confidential|proprietary/gi,
        '',
      );
    }

    return processed;
  }

  /**
   * Use OpenAI to extract potential FAQ content
   */
  private async performOpenAIExtraction(
    content: string,
    analysis: DocumentAnalysis,
  ): Promise<ExtractedFAQ[]> {
    const systemPrompt = this.buildExtractionPrompt(analysis.document_type);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: this.formatContentForExtraction(content, analysis),
        },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(response);
      return this.normalizeOpenAIResponse(parsed, analysis);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from AI extraction');
    }
  }

  /**
   * Build extraction prompt based on document type
   */
  private buildExtractionPrompt(documentType: string): string {
    const basePrompt = `You are an expert wedding business FAQ extraction system. Extract potential frequently asked questions and their answers from wedding-related documents.

Focus on identifying:
1. Clear questions clients commonly ask
2. Complete, helpful answers
3. Wedding-specific content (pricing, services, timelines, logistics)
4. Information that would reduce support workload

CRITICAL: Only extract questions that:
- Are clearly formulated as questions or common client concerns
- Have complete answers available in the document
- Are relevant to wedding planning/services
- Would genuinely help future clients

Return JSON in this exact format:
{
  "faqs": [
    {
      "question": "Clear, client-facing question",
      "answer": "Complete answer from document",
      "summary": "1-2 sentence summary",
      "confidence": 0.85,
      "category": "booking-pricing|timeline-delivery|photography-process|wedding-day-logistics|packages-addons|weather-backup|image-rights|payment-contracts",
      "tags": ["tag1", "tag2"],
      "reasoning": "Why this is a good FAQ"
    }
  ]
}`;

    const typeSpecific = {
      contract:
        'Focus on terms, policies, payment schedules, cancellation rules, and service boundaries.',
      vendor_info:
        'Focus on services offered, availability, pricing structures, and process explanations.',
      service_guide:
        'Focus on what clients can expect, timelines, deliverables, and preparation requirements.',
      email_thread:
        'Focus on recurring questions clients ask and detailed responses provided.',
      client_inquiry:
        'Focus on common concerns, clarifications needed, and comprehensive responses.',
    };

    return `${basePrompt}\n\nFor ${documentType} documents: ${typeSpecific[documentType] || typeSpecific.vendor_info}`;
  }

  /**
   * Format content for optimal extraction
   */
  private formatContentForExtraction(
    content: string,
    analysis: DocumentAnalysis,
  ): string {
    return `Document Type: ${analysis.document_type}
Source: ${analysis.source_file}
${analysis.page_number ? `Page: ${analysis.page_number}` : ''}

Content:
${content.substring(0, 8000)}`;
  }

  /**
   * Normalize and validate OpenAI response
   */
  private normalizeOpenAIResponse(
    parsed: any,
    analysis: DocumentAnalysis,
  ): ExtractedFAQ[] {
    const faqs = parsed.faqs || [];

    return faqs
      .filter((faq: any) => this.isValidFaq(faq))
      .map((faq: any) => ({
        question: this.cleanText(faq.question),
        answer: this.cleanText(faq.answer),
        summary: this.cleanText(
          faq.summary || this.generateSummary(faq.answer),
        ),
        category: this.mapToStandardCategory(faq.category),
        confidence: Math.min(1, Math.max(0, faq.confidence || 0.5)),
        tags: this.extractTags(faq),
        source_document: analysis.source_file,
        source_page: analysis.page_number,
        context: faq.reasoning,
      }));
  }

  /**
   * Validate extracted FAQ quality
   */
  private isValidFaq(faq: any): boolean {
    return (
      faq.question &&
      faq.answer &&
      faq.question.length > 10 &&
      faq.answer.length > 20 &&
      faq.question.length < 500 &&
      faq.answer.length < 2000 &&
      this.isWeddingRelated(faq.question + ' ' + faq.answer)
    );
  }

  /**
   * Validate and categorize questions using wedding-specific logic
   */
  private async validateAndCategorizeQuestions(
    faqs: ExtractedFAQ[],
    analysis: DocumentAnalysis,
  ): Promise<ExtractedFAQ[]> {
    return faqs
      .filter((faq) => faq.confidence >= this.MIN_CONFIDENCE_THRESHOLD)
      .map((faq) => {
        // Boost confidence for wedding-specific patterns
        const patternBoost = this.calculatePatternBoost(faq.question);
        const adjustedConfidence = Math.min(1, faq.confidence + patternBoost);

        return {
          ...faq,
          confidence: adjustedConfidence,
          category: this.refineCategorization(
            faq.question,
            faq.answer,
            faq.category,
          ),
          tags: this.enhanceTags(faq.tags, faq.question, faq.answer),
        };
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate pattern-based confidence boost
   */
  private calculatePatternBoost(question: string): number {
    const matchedPatterns = this.WEDDING_QUESTION_PATTERNS.filter((pattern) =>
      pattern.test(question),
    ).length;

    return Math.min(0.2, matchedPatterns * 0.05);
  }

  /**
   * Check if content is wedding-related
   */
  private isWeddingRelated(text: string): boolean {
    const weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'ceremony',
      'reception',
      'venue',
      'photographer',
      'vendor',
      'marriage',
      'engagement',
      'album',
      'package',
      'booking',
      'contract',
      'deposit',
      'timeline',
      'delivery',
      'coverage',
      'portrait',
      'bridal',
    ];

    const lowercaseText = text.toLowerCase();
    return weddingKeywords.some((keyword) => lowercaseText.includes(keyword));
  }

  /**
   * Map extracted category to standard categories
   */
  private mapToStandardCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      booking: 'booking-pricing',
      pricing: 'booking-pricing',
      cost: 'booking-pricing',
      payment: 'payment-contracts',
      timeline: 'timeline-delivery',
      delivery: 'timeline-delivery',
      process: 'photography-process',
      photography: 'photography-process',
      'wedding-day': 'wedding-day-logistics',
      logistics: 'wedding-day-logistics',
      package: 'packages-addons',
      weather: 'weather-backup',
      rights: 'image-rights',
      contract: 'payment-contracts',
    };

    const normalizedCategory = category?.toLowerCase() || '';

    // Find best match
    for (const [key, value] of Object.entries(categoryMap)) {
      if (normalizedCategory.includes(key)) {
        return value;
      }
    }

    return 'booking-pricing'; // Default fallback
  }

  /**
   * Refine categorization based on question and answer content
   */
  private refineCategorization(
    question: string,
    answer: string,
    currentCategory: string,
  ): string {
    const combinedText = (question + ' ' + answer).toLowerCase();

    // More specific categorization based on content analysis
    if (
      /cost|price|fee|expensive|cheap|budget|payment|deposit|money/i.test(
        combinedText,
      )
    ) {
      return combinedText.includes('contract') || combinedText.includes('terms')
        ? 'payment-contracts'
        : 'booking-pricing';
    }

    if (
      /timeline|delivery|ready|turnaround|when.*receive|how.*long/i.test(
        combinedText,
      )
    ) {
      return 'timeline-delivery';
    }

    if (/process|expect|shoot|coverage|style|approach/i.test(combinedText)) {
      return 'photography-process';
    }

    if (
      /wedding.*day|ceremony|reception|coordination|schedule/i.test(
        combinedText,
      )
    ) {
      return 'wedding-day-logistics';
    }

    if (/package|include|add.*on|upgrade|extra/i.test(combinedText)) {
      return 'packages-addons';
    }

    if (/weather|rain|backup|plan.*b|indoor|outdoor/i.test(combinedText)) {
      return 'weather-backup';
    }

    if (
      /rights|copyright|usage|sharing|social.*media|print/i.test(combinedText)
    ) {
      return 'image-rights';
    }

    return currentCategory;
  }

  /**
   * Extract and enhance tags
   */
  private extractTags(faq: any): string[] {
    const baseTags = faq.tags || [];
    const autoTags = this.generateAutoTags(faq.question + ' ' + faq.answer);

    return [...new Set([...baseTags, ...autoTags])].slice(0, 8);
  }

  /**
   * Enhance tags with additional context
   */
  private enhanceTags(
    existingTags: string[],
    question: string,
    answer: string,
  ): string[] {
    const enhancedTags = this.generateAutoTags(question + ' ' + answer);
    return [...new Set([...existingTags, ...enhancedTags])].slice(0, 10);
  }

  /**
   * Auto-generate tags from content
   */
  private generateAutoTags(content: string): string[] {
    const tagPatterns = [
      { pattern: /pricing|cost|fee|price/i, tag: 'pricing' },
      { pattern: /timeline|schedule|delivery/i, tag: 'timeline' },
      { pattern: /package|include/i, tag: 'packages' },
      { pattern: /wedding.*day/i, tag: 'wedding-day' },
      { pattern: /weather|rain/i, tag: 'weather' },
      { pattern: /payment|deposit/i, tag: 'payment' },
      { pattern: /contract|terms/i, tag: 'contract' },
      { pattern: /photography|photos/i, tag: 'photography' },
      { pattern: /venue|location/i, tag: 'venue' },
    ];

    return tagPatterns
      .filter(({ pattern }) => pattern.test(content))
      .map(({ tag }) => tag);
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2');
  }

  /**
   * Generate summary from answer
   */
  private generateSummary(answer: string): string {
    // Simple extractive summary - get first sentence or two
    const sentences = answer
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    return (
      sentences.slice(0, 2).join('. ').trim() +
      (sentences.length > 2 ? '...' : '')
    );
  }

  /**
   * Calculate overall accuracy estimate
   */
  private calculateAccuracyEstimate(faqs: ExtractedFAQ[]): number {
    if (faqs.length === 0) return 0;

    const avgConfidence =
      faqs.reduce((sum, faq) => sum + faq.confidence, 0) / faqs.length;
    const weddingRelevanceBonus =
      (faqs.filter((faq) => this.isWeddingRelated(faq.question + faq.answer))
        .length /
        faqs.length) *
      0.1;

    return Math.min(1, avgConfidence + weddingRelevanceBonus);
  }

  /**
   * Store extracted FAQs for review
   */
  async storeForReview(
    extraction: ExtractionResult,
    supplier_id: string,
  ): Promise<ReviewableExtraction[]> {
    try {
      const reviewableExtractions: ReviewableExtraction[] = extraction.faqs.map(
        (faq) => ({
          id: crypto.randomUUID(),
          supplier_id,
          extracted_faq: faq,
          review_status:
            faq.confidence >= this.HIGH_CONFIDENCE_THRESHOLD
              ? 'approved'
              : 'pending',
          auto_approved: faq.confidence >= this.HIGH_CONFIDENCE_THRESHOLD,
          created_at: new Date().toISOString(),
        }),
      );

      // Store in database
      const { error } = await this.supabase
        .from('faq_extraction_reviews')
        .insert(reviewableExtractions);

      if (error) throw error;

      // Auto-approve high confidence FAQs
      const autoApproved = reviewableExtractions.filter(
        (item) => item.auto_approved,
      );
      if (autoApproved.length > 0) {
        await Promise.all(
          autoApproved.map((item) => this.approveFaqExtraction(item.id)),
        );
      }

      return reviewableExtractions;
    } catch (error) {
      console.error('Store for review error:', error);
      throw error;
    }
  }

  /**
   * Approve FAQ extraction and create actual FAQ item
   */
  async approveFaqExtraction(extractionId: string): Promise<FaqItem | null> {
    try {
      // Get the extraction record
      const { data: extraction } = await this.supabase
        .from('faq_extraction_reviews')
        .select('*')
        .eq('id', extractionId)
        .single();

      if (!extraction) return null;

      const faq = extraction.extracted_faq as ExtractedFAQ;

      // Find or create appropriate category
      const category = await this.findOrCreateCategory(
        extraction.supplier_id,
        faq.category,
      );
      if (!category) return null;

      // Create FAQ item
      const faqRequest: CreateFaqItemRequest = {
        category_id: category.id,
        question: faq.question,
        answer: faq.answer,
        summary: faq.summary,
        tags: faq.tags,
        is_featured: faq.confidence >= 0.9,
      };

      const createdFaq = await faqService.createFaqItem(faqRequest);

      if (createdFaq) {
        // Update extraction record
        await this.supabase
          .from('faq_extraction_reviews')
          .update({
            review_status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', extractionId);
      }

      return createdFaq;
    } catch (error) {
      console.error('Approve extraction error:', error);
      return null;
    }
  }

  /**
   * Find or create FAQ category
   */
  private async findOrCreateCategory(
    supplier_id: string,
    categorySlug: string,
  ): Promise<FaqCategory | null> {
    try {
      // Try to find existing category
      const { data: existing } = await this.supabase
        .from('faq_categories')
        .select('*')
        .eq('supplier_id', supplier_id)
        .eq('slug', categorySlug)
        .single();

      if (existing) return existing;

      // Create new category based on standard wedding categories
      const standardCategory = WEDDING_FAQ_CATEGORIES.find(
        (cat) => cat.slug === categorySlug,
      );
      if (!standardCategory) return null;

      return await faqService.createCategory({
        name: standardCategory.name,
        description: standardCategory.description,
        slug: standardCategory.slug,
        icon: standardCategory.icon,
      });
    } catch (error) {
      console.error('Find/create category error:', error);
      return null;
    }
  }

  /**
   * Get pending extractions for manual review
   */
  async getPendingReviews(
    supplier_id: string,
  ): Promise<ReviewableExtraction[]> {
    try {
      const { data } = await this.supabase
        .from('faq_extraction_reviews')
        .select('*')
        .eq('supplier_id', supplier_id)
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Get pending reviews error:', error);
      return [];
    }
  }

  /**
   * Batch process multiple documents
   */
  async batchExtractFaqs(analyses: DocumentAnalysis[]): Promise<{
    results: ExtractionResult[];
    summary: {
      total_documents: number;
      total_faqs_extracted: number;
      high_confidence_faqs: number;
      processing_time_ms: number;
    };
  }> {
    const startTime = performance.now();
    const results: ExtractionResult[] = [];

    for (const analysis of analyses) {
      try {
        const result = await this.extractFaqsFromDocument(analysis);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process ${analysis.source_file}:`, error);
        // Continue processing other documents
      }
    }

    const totalFaqs = results.reduce(
      (sum, result) => sum + result.faqs.length,
      0,
    );
    const highConfidenceFaqs = results.reduce(
      (sum, result) => sum + result.processing_stats.high_confidence_questions,
      0,
    );

    return {
      results,
      summary: {
        total_documents: analyses.length,
        total_faqs_extracted: totalFaqs,
        high_confidence_faqs: highConfidenceFaqs,
        processing_time_ms: Math.round(performance.now() - startTime),
      },
    };
  }
}

// Singleton export
export const faqExtractionService = new FaqExtractionService();

// Type exports for external use
export type {
  ExtractedFAQ,
  DocumentAnalysis,
  ExtractionResult,
  ReviewableExtraction,
};
