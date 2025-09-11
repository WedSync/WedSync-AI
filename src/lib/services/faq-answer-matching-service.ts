// FAQ Answer Matching Service - Intelligent answer pairing and duplicate detection
// Feature ID: WS-125 - Automated FAQ Extraction from Documents
// Team: C - Batch 9 Round 3
// Component: Answer Matching Functionality

import OpenAI from 'openai';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Fuse from 'fuse.js';
import type { FaqItem } from '@/types/faq';

// Answer matching types
interface AnswerMatchingRequest {
  question: string;
  potential_answers?: string[];
  context?: string;
  existing_faqs?: FaqItem[];
}

interface AnswerMatch {
  answer: string;
  confidence: number;
  source: 'extracted' | 'existing_faq' | 'generated';
  source_id?: string;
  reasoning: string;
  improvements?: string[];
}

interface AnswerMatchingResult {
  best_match: AnswerMatch;
  alternative_answers: AnswerMatch[];
  duplicate_questions: Array<{
    faq_id: string;
    question: string;
    similarity: number;
    merge_recommendation: boolean;
  }>;
  answer_quality_score: number;
  suggestions: {
    completeness: string[];
    clarity: string[];
    wedding_specific: string[];
  };
}

interface DuplicateDetectionRequest {
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category?: string;
  }>;
  similarity_threshold?: number;
}

interface DuplicateDetectionResult {
  duplicate_groups: Array<{
    master_faq_id: string;
    duplicate_faq_ids: string[];
    similarity_scores: number[];
    merge_strategy: 'keep_master' | 'combine_answers' | 'manual_review';
    suggested_merged_answer?: string;
  }>;
  processing_stats: {
    total_faqs_analyzed: number;
    duplicate_groups_found: number;
    potential_merges: number;
    manual_review_needed: number;
  };
}

interface AnswerQualityAssessment {
  completeness_score: number; // 0-1
  clarity_score: number; // 0-1
  wedding_relevance_score: number; // 0-1
  helpfulness_score: number; // 0-1
  overall_quality: number; // 0-1
  improvement_suggestions: {
    missing_information: string[];
    clarity_issues: string[];
    wedding_context_gaps: string[];
    actionability_improvements: string[];
  };
}

export class FaqAnswerMatchingService {
  private openai: OpenAI;
  private supabase = createClientComponentClient();

  // Quality thresholds
  private readonly HIGH_QUALITY_THRESHOLD = 0.85;
  private readonly ACCEPTABLE_QUALITY_THRESHOLD = 0.65;
  private readonly DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

  // Wedding-specific quality indicators
  private readonly WEDDING_COMPLETENESS_INDICATORS = [
    'pricing',
    'timeline',
    'process',
    'included',
    'available',
    'contact',
    'booking',
    'deposit',
    'policy',
    'backup',
    'delivery',
  ];

  private readonly WEDDING_CLARITY_INDICATORS = [
    'specific',
    'detailed',
    'clear',
    'exactly',
    'typically',
    'usually',
    'depending',
    'varies',
    'approximately',
    'includes',
  ];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      dangerouslyAllowBrowser: false,
    });
  }

  /**
   * Find the best matching answer for a question
   */
  async matchAnswerToQuestion(
    request: AnswerMatchingRequest,
  ): Promise<AnswerMatchingResult> {
    try {
      const {
        question,
        potential_answers = [],
        existing_faqs = [],
        context = '',
      } = request;

      // Step 1: Find existing FAQ matches
      const existingMatches = await this.findExistingFaqMatches(
        question,
        existing_faqs,
      );

      // Step 2: Evaluate potential answers
      const answerMatches = await Promise.all(
        potential_answers.map((answer) =>
          this.evaluateAnswerMatch(question, answer, context),
        ),
      );

      // Step 3: Generate improved answer if needed
      const bestExisting =
        existingMatches.length > 0 ? existingMatches[0] : null;
      const bestPotential =
        answerMatches.length > 0
          ? answerMatches.sort((a, b) => b.confidence - a.confidence)[0]
          : null;

      let bestMatch: AnswerMatch;
      let alternativeAnswers: AnswerMatch[] = [];

      // Determine best answer source
      if (bestExisting && bestExisting.confidence > 0.8) {
        bestMatch = {
          answer: bestExisting.answer,
          confidence: bestExisting.confidence,
          source: 'existing_faq',
          source_id: bestExisting.source_id,
          reasoning: 'High-confidence match with existing FAQ',
          improvements: bestExisting.improvements,
        };
        if (bestPotential) alternativeAnswers.push(bestPotential);
      } else if (bestPotential && bestPotential.confidence > 0.7) {
        bestMatch = bestPotential;
        if (bestExisting) alternativeAnswers.push(bestExisting);
      } else {
        // Generate new answer
        bestMatch = await this.generateImprovedAnswer(
          question,
          [
            ...(bestExisting ? [bestExisting.answer] : []),
            ...(bestPotential ? [bestPotential.answer] : []),
          ],
          context,
        );
        if (bestExisting) alternativeAnswers.push(bestExisting);
        if (bestPotential) alternativeAnswers.push(bestPotential);
      }

      // Step 4: Assess answer quality
      const qualityScore = await this.assessAnswerQuality(
        question,
        bestMatch.answer,
      );

      // Step 5: Detect duplicate questions
      const duplicateQuestions = this.detectDuplicateQuestions(
        question,
        existing_faqs,
      );

      return {
        best_match: bestMatch,
        alternative_answers: alternativeAnswers.sort(
          (a, b) => b.confidence - a.confidence,
        ),
        duplicate_questions: duplicateQuestions,
        answer_quality_score: qualityScore.overall_quality,
        suggestions: {
          completeness:
            qualityScore.improvement_suggestions.missing_information,
          clarity: qualityScore.improvement_suggestions.clarity_issues,
          wedding_specific:
            qualityScore.improvement_suggestions.wedding_context_gaps,
        },
      };
    } catch (error) {
      console.error('Answer matching error:', error);
      throw error;
    }
  }

  /**
   * Find existing FAQ matches using semantic search
   */
  private async findExistingFaqMatches(
    question: string,
    existingFaqs: FaqItem[],
  ): Promise<
    Array<{
      answer: string;
      confidence: number;
      source_id: string;
      improvements?: string[];
    }>
  > {
    if (existingFaqs.length === 0) return [];

    // Use Fuse.js for fuzzy matching on questions
    const fuse = new Fuse(existingFaqs, {
      keys: ['question', 'summary', 'tags'],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    });

    const matches = fuse.search(question, { limit: 5 });

    return matches
      .filter((match) => match.score && match.score < 0.6) // Lower score = better match in Fuse.js
      .map((match) => ({
        answer: match.item.answer,
        confidence: 1 - (match.score || 1), // Convert to 0-1 confidence scale
        source_id: match.item.id,
        improvements: [], // Could analyze and suggest improvements
      }));
  }

  /**
   * Evaluate how well an answer matches a question
   */
  private async evaluateAnswerMatch(
    question: string,
    answer: string,
    context: string = '',
  ): Promise<AnswerMatch> {
    const systemPrompt = `You are an expert wedding business consultant evaluating FAQ answer quality.

Evaluate how well the provided answer addresses the given question in a wedding business context.

Consider:
1. Completeness - Does it fully answer the question?
2. Accuracy - Is the information correct and reliable?
3. Wedding relevance - Is it appropriate for wedding clients?
4. Actionability - Does it help clients make decisions or take next steps?
5. Clarity - Is it easy to understand?

Return JSON in this exact format:
{
  "confidence": 0.85,
  "reasoning": "Detailed explanation of why this answer matches the question",
  "improvements": ["specific suggestion 1", "specific suggestion 2"],
  "missing_elements": ["what key info is missing"]
}`;

    const userPrompt = `Question: "${question}"
Answer: "${answer}"
${context ? `Context: ${context}` : ''}

Evaluate this answer's quality and relevance to the question.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from OpenAI');

      const evaluation = JSON.parse(response);

      return {
        answer,
        confidence: Math.min(1, Math.max(0, evaluation.confidence || 0.5)),
        source: 'extracted',
        reasoning: evaluation.reasoning || 'AI evaluation completed',
        improvements: evaluation.improvements || [],
      };
    } catch (error) {
      console.error('Answer evaluation error:', error);
      // Fallback to basic pattern matching
      return this.fallbackAnswerEvaluation(question, answer);
    }
  }

  /**
   * Fallback answer evaluation using pattern matching
   */
  private fallbackAnswerEvaluation(
    question: string,
    answer: string,
  ): AnswerMatch {
    const questionWords = question.toLowerCase().split(/\s+/);
    const answerWords = answer.toLowerCase().split(/\s+/);

    // Calculate keyword overlap
    const overlap = questionWords.filter(
      (word) =>
        word.length > 3 &&
        answerWords.some((answerWord) => answerWord.includes(word)),
    ).length;

    const confidence = Math.min(
      0.8,
      overlap / Math.max(questionWords.length, 5) + 0.3,
    );

    return {
      answer,
      confidence,
      source: 'extracted',
      reasoning: `Fallback evaluation: ${overlap} keyword matches found`,
      improvements: answer.length < 50 ? ['Answer could be more detailed'] : [],
    };
  }

  /**
   * Generate improved answer using AI
   */
  private async generateImprovedAnswer(
    question: string,
    existingAnswers: string[],
    context: string,
  ): Promise<AnswerMatch> {
    const systemPrompt = `You are an expert wedding business consultant creating helpful FAQ answers.

Create a comprehensive, wedding-specific answer that:
1. Directly addresses the question
2. Provides specific, actionable information
3. Uses appropriate wedding industry terminology  
4. Includes relevant details (pricing ranges, timelines, processes)
5. Maintains a professional yet friendly tone
6. Anticipates follow-up questions

If existing answers are provided, improve upon them by making them more complete, clear, and wedding-specific.`;

    const userPrompt = `Question: "${question}"
${existingAnswers.length > 0 ? `Existing answers to improve upon:\n${existingAnswers.map((ans, i) => `${i + 1}. ${ans}`).join('\n\n')}` : ''}
${context ? `Additional context: ${context}` : ''}

Create an improved, comprehensive answer for this wedding business FAQ.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const generatedAnswer = completion.choices[0]?.message?.content;
      if (!generatedAnswer) throw new Error('No generated answer from OpenAI');

      return {
        answer: generatedAnswer.trim(),
        confidence: 0.85, // Generated answers get high confidence if they're created
        source: 'generated',
        reasoning:
          'AI-generated comprehensive answer based on question analysis',
        improvements: [],
      };
    } catch (error) {
      console.error('Answer generation error:', error);
      // Fallback to template-based answer
      return this.generateTemplateAnswer(question, existingAnswers);
    }
  }

  /**
   * Generate template-based answer as fallback
   */
  private generateTemplateAnswer(
    question: string,
    existingAnswers: string[],
  ): AnswerMatch {
    const questionLower = question.toLowerCase();
    let template = '';

    if (questionLower.includes('cost') || questionLower.includes('price')) {
      template =
        'Our pricing varies based on your specific needs and requirements. Please contact us for a personalized quote that takes into account your wedding date, location, and desired services. We offer flexible packages to fit different budgets.';
    } else if (
      questionLower.includes('timeline') ||
      questionLower.includes('when')
    ) {
      template =
        'The timeline depends on several factors including the scope of work and current booking schedule. Typically, we recommend booking in advance to ensure availability for your preferred date. Contact us to discuss your specific timeline needs.';
    } else if (
      questionLower.includes('include') ||
      questionLower.includes('package')
    ) {
      template =
        "Our packages are designed to provide comprehensive service for your wedding day. The specific inclusions vary by package level. We'd be happy to discuss what's included in each option and help you choose the best fit for your needs.";
    } else {
      template =
        "Thank you for your question. This is an important consideration for your wedding planning. We'd be happy to provide detailed information specific to your situation. Please contact us to discuss your needs in detail.";
    }

    return {
      answer: template,
      confidence: 0.4,
      source: 'generated',
      reasoning: 'Template-based fallback answer',
      improvements: [
        'Consider adding more specific details',
        'Include concrete examples or pricing ranges',
      ],
    };
  }

  /**
   * Assess the quality of an answer
   */
  private async assessAnswerQuality(
    question: string,
    answer: string,
  ): Promise<AnswerQualityAssessment> {
    // Pattern-based quality assessment for speed
    const completeness = this.assessCompleteness(answer);
    const clarity = this.assessClarity(answer);
    const weddingRelevance = this.assessWeddingRelevance(question, answer);
    const helpfulness = this.assessHelpfulness(answer);

    return {
      completeness_score: completeness.score,
      clarity_score: clarity.score,
      wedding_relevance_score: weddingRelevance.score,
      helpfulness_score: helpfulness.score,
      overall_quality:
        (completeness.score +
          clarity.score +
          weddingRelevance.score +
          helpfulness.score) /
        4,
      improvement_suggestions: {
        missing_information: completeness.suggestions,
        clarity_issues: clarity.suggestions,
        wedding_context_gaps: weddingRelevance.suggestions,
        actionability_improvements: helpfulness.suggestions,
      },
    };
  }

  /**
   * Assess answer completeness
   */
  private assessCompleteness(answer: string): {
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0.5; // Base score

    // Length check
    if (answer.length < 50) {
      suggestions.push('Answer could be more detailed and comprehensive');
    } else if (answer.length > 100) {
      score += 0.2;
    }

    // Check for key wedding elements
    const hasCompleteElements = this.WEDDING_COMPLETENESS_INDICATORS.filter(
      (indicator) => answer.toLowerCase().includes(indicator),
    ).length;

    score += Math.min(0.3, hasCompleteElements * 0.05);

    if (hasCompleteElements < 2) {
      suggestions.push(
        'Consider including more specific details about pricing, timeline, or process',
      );
    }

    return { score: Math.min(1, score), suggestions };
  }

  /**
   * Assess answer clarity
   */
  private assessClarity(answer: string): {
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0.6; // Base score

    // Check for clarity indicators
    const clarityWords = this.WEDDING_CLARITY_INDICATORS.filter((word) =>
      answer.toLowerCase().includes(word),
    ).length;

    score += Math.min(0.3, clarityWords * 0.05);

    // Check sentence structure
    const sentences = answer
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    if (sentences.length < 2) {
      suggestions.push(
        'Consider breaking down the answer into multiple sentences for better readability',
      );
    } else {
      score += 0.1;
    }

    // Check for jargon or complex terms without explanation
    const complexTerms = [
      'contract',
      'deposit',
      'deliverables',
      'post-processing',
    ];
    const hasUnexplainedJargon = complexTerms.some(
      (term) =>
        answer.toLowerCase().includes(term) &&
        !answer.toLowerCase().includes(`${term} is`) &&
        !answer.toLowerCase().includes(`${term} means`),
    );

    if (hasUnexplainedJargon) {
      suggestions.push(
        'Consider explaining technical terms for better client understanding',
      );
    }

    return { score: Math.min(1, score), suggestions };
  }

  /**
   * Assess wedding relevance
   */
  private assessWeddingRelevance(
    question: string,
    answer: string,
  ): { score: number; suggestions: string[] } {
    const suggestions: string[] = [];
    let score = 0.5;

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
    ];

    const weddingContext = weddingKeywords.filter((keyword) =>
      answer.toLowerCase().includes(keyword),
    ).length;

    score += Math.min(0.4, weddingContext * 0.1);

    if (weddingContext === 0) {
      suggestions.push(
        'Consider adding wedding-specific context to make the answer more relevant',
      );
    }

    // Check if answer addresses wedding-specific concerns
    const weddingConcerns = [
      'timeline',
      'budget',
      'coordination',
      'backup plan',
      'contract',
    ];
    const addressesConcerns = weddingConcerns.filter(
      (concern) =>
        question.toLowerCase().includes(concern) &&
        answer.toLowerCase().includes(concern),
    ).length;

    score += Math.min(0.1, addressesConcerns * 0.05);

    return { score: Math.min(1, score), suggestions };
  }

  /**
   * Assess answer helpfulness
   */
  private assessHelpfulness(answer: string): {
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0.5;

    // Check for actionable elements
    const actionWords = [
      'contact',
      'book',
      'schedule',
      'visit',
      'call',
      'email',
      'discuss',
    ];
    const hasActionable = actionWords.some((word) =>
      answer.toLowerCase().includes(word),
    );

    if (hasActionable) {
      score += 0.2;
    } else {
      suggestions.push('Consider adding a clear next step or call-to-action');
    }

    // Check for specific information (numbers, dates, etc.)
    const hasSpecifics =
      /\$\d+|\d+\s*(hours?|days?|weeks?|months?)|\d+\s*%/i.test(answer);
    if (hasSpecifics) {
      score += 0.2;
    } else {
      suggestions.push(
        'Consider including specific numbers, timeframes, or examples',
      );
    }

    // Check for anticipating follow-up questions
    const anticipatesQuestions =
      answer.toLowerCase().includes('also') ||
      answer.toLowerCase().includes('additionally') ||
      answer.toLowerCase().includes('furthermore');

    if (anticipatesQuestions) {
      score += 0.1;
    }

    return { score: Math.min(1, score), suggestions };
  }

  /**
   * Detect duplicate questions using fuzzy matching
   */
  private detectDuplicateQuestions(
    question: string,
    existingFaqs: FaqItem[],
  ): Array<{
    faq_id: string;
    question: string;
    similarity: number;
    merge_recommendation: boolean;
  }> {
    if (existingFaqs.length === 0) return [];

    const fuse = new Fuse(existingFaqs, {
      keys: ['question'],
      includeScore: true,
      threshold: 0.3, // More strict for duplicates
      ignoreLocation: true,
      minMatchCharLength: 5,
    });

    const matches = fuse.search(question, { limit: 10 });

    return matches
      .filter((match) => match.score && match.score < 0.5) // Potential duplicates
      .map((match) => {
        const similarity = 1 - (match.score || 1);
        return {
          faq_id: match.item.id,
          question: match.item.question,
          similarity,
          merge_recommendation:
            similarity > this.DUPLICATE_SIMILARITY_THRESHOLD,
        };
      })
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Bulk duplicate detection for existing FAQs
   */
  async detectDuplicateFaqs(
    request: DuplicateDetectionRequest,
  ): Promise<DuplicateDetectionResult> {
    const { faqs, similarity_threshold = this.DUPLICATE_SIMILARITY_THRESHOLD } =
      request;

    if (faqs.length < 2) {
      return {
        duplicate_groups: [],
        processing_stats: {
          total_faqs_analyzed: faqs.length,
          duplicate_groups_found: 0,
          potential_merges: 0,
          manual_review_needed: 0,
        },
      };
    }

    const duplicateGroups: DuplicateDetectionResult['duplicate_groups'] = [];
    const processed = new Set<string>();

    // Create Fuse instance for all FAQs
    const fuse = new Fuse(faqs, {
      keys: ['question'],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    });

    for (const faq of faqs) {
      if (processed.has(faq.id)) continue;

      // Find similar questions
      const matches = fuse.search(faq.question, { limit: 10 });
      const duplicates = matches.filter(
        (match) =>
          match.item.id !== faq.id &&
          !processed.has(match.item.id) &&
          match.score &&
          1 - match.score >= similarity_threshold,
      );

      if (duplicates.length > 0) {
        const duplicateIds = duplicates.map((match) => match.item.id);
        const similarities = duplicates.map((match) => 1 - (match.score || 1));

        // Determine merge strategy
        const avgSimilarity =
          similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        let mergeStrategy: 'keep_master' | 'combine_answers' | 'manual_review';

        if (avgSimilarity > 0.95) {
          mergeStrategy = 'keep_master';
        } else if (avgSimilarity > 0.85) {
          mergeStrategy = 'combine_answers';
        } else {
          mergeStrategy = 'manual_review';
        }

        duplicateGroups.push({
          master_faq_id: faq.id,
          duplicate_faq_ids: duplicateIds,
          similarity_scores: similarities,
          merge_strategy: mergeStrategy,
          suggested_merged_answer:
            mergeStrategy === 'combine_answers'
              ? await this.suggestMergedAnswer([
                  faq,
                  ...duplicates.map((d) => d.item),
                ])
              : undefined,
        });

        // Mark all as processed
        processed.add(faq.id);
        duplicateIds.forEach((id) => processed.add(id));
      }
    }

    const manualReviewCount = duplicateGroups.filter(
      (g) => g.merge_strategy === 'manual_review',
    ).length;

    return {
      duplicate_groups: duplicateGroups,
      processing_stats: {
        total_faqs_analyzed: faqs.length,
        duplicate_groups_found: duplicateGroups.length,
        potential_merges: duplicateGroups.filter(
          (g) => g.merge_strategy !== 'manual_review',
        ).length,
        manual_review_needed: manualReviewCount,
      },
    };
  }

  /**
   * Suggest merged answer for duplicate FAQs
   */
  private async suggestMergedAnswer(
    faqs: Array<{ question: string; answer: string }>,
  ): Promise<string> {
    if (faqs.length === 0) return '';
    if (faqs.length === 1) return faqs[0].answer;

    const systemPrompt = `You are an expert wedding business consultant merging duplicate FAQ answers.

Create a comprehensive answer that combines the best elements from multiple similar answers. The merged answer should:
1. Include all important information from the source answers
2. Remove redundancy and contradictions
3. Maintain clarity and wedding-specific context
4. Be more helpful than any individual answer

Return only the merged answer, no explanations.`;

    const userPrompt = `Question: "${faqs[0].question}"

Answers to merge:
${faqs.map((faq, i) => `${i + 1}. ${faq.answer}`).join('\n\n')}

Create a single, comprehensive merged answer:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content?.trim() || faqs[0].answer;
    } catch (error) {
      console.error('Merge answer error:', error);
      // Fallback: return the longest answer
      return faqs.sort((a, b) => b.answer.length - a.answer.length)[0].answer;
    }
  }
}

// Singleton export
export const faqAnswerMatchingService = new FaqAnswerMatchingService();

// Type exports
export type {
  AnswerMatchingRequest,
  AnswerMatch,
  AnswerMatchingResult,
  DuplicateDetectionRequest,
  DuplicateDetectionResult,
  AnswerQualityAssessment,
};
